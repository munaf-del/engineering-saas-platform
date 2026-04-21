import type {
  GeoJsonPosition,
  ProjectSpatialFeature as SharedProjectSpatialFeature,
  ProjectSpatialFeatureFilters,
  ProjectSpatialFeatureProperties,
  ProjectSpatialGeometryJson,
  ProjectSpatialGeometryType,
} from '@eng/shared';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import type {
  CreateProjectSpatialFeatureDto,
  CreateProjectSpatialSheetDto,
  CreateProjectSpatialViewDto,
  ProjectSpatialFeatureFiltersDto,
  UpdateProjectSpatialFeatureDto,
  UpdateProjectSpatialSheetDto,
  UpdateProjectSpatialViewDto,
} from './dto/project-spatial.dto';
import {
  PROJECT_SPATIAL_BASEMAPS,
  SHEET_TEMPLATE_SOURCE_KINDS,
  TEMPLATE_PAGE_ORIENTATIONS,
  TEMPLATE_PAPER_SIZES,
} from './dto/project-spatial.dto';

type ProjectAccess = {
  projectId: string;
  organisationId: string;
  userId: string;
  orgRole?: string;
};

type ProjectSpatialFeatureWithContext = Prisma.ProjectSpatialFeatureGetPayload<{
  include: typeof projectSpatialFeatureInclude;
}>;
type ProjectSpatialViewRecord = Prisma.ProjectSpatialViewGetPayload<Record<string, never>>;
type ProjectSpatialSheetRecord = Prisma.ProjectSpatialSheetGetPayload<Record<string, never>>;

@Injectable()
export class ProjectSpatialService {
  constructor(private readonly prisma: PrismaService) {}

  async listFeatures(access: ProjectAccess, filters: ProjectSpatialFeatureFiltersDto) {
    await this.assertProjectReadAccess(access);

    const features = await this.prisma.projectSpatialFeature.findMany({
      where: buildProjectSpatialWhere(access.projectId, filters),
      include: projectSpatialFeatureInclude,
      orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }, { label: 'asc' }],
    });

    return features.map(serializeProjectSpatialFeature);
  }

  async createFeature(access: ProjectAccess, dto: CreateProjectSpatialFeatureDto) {
    await this.assertProjectWriteAccess(access);
    await this.assertAiDocumentBelongsToProject(access, dto.linkedAiDocumentId ?? null);

    const feature = await this.prisma.projectSpatialFeature.create({
      data: {
        projectId: access.projectId,
        featureType: dto.featureType,
        geometryType: dto.geometryType,
        label: dto.label.trim(),
        description: normalizeNullableString(dto.description),
        geometryJson: validateGeometry(dto.geometryJson, dto.geometryType) as Prisma.InputJsonValue,
        status: normalizeNullableString(dto.status),
        sourceType: dto.sourceType ?? null,
        sourceReference: normalizeNullableString(dto.sourceReference),
        linkedProjectReferenceId: normalizeNullableString(dto.linkedProjectReferenceId),
        linkedAiDocumentId: dto.linkedAiDocumentId ?? null,
        linkedDeliverableType: dto.linkedDeliverableType ?? null,
        linkedDeliverableId: normalizeNullableString(dto.linkedDeliverableId),
        propertiesJson: toNullableJsonInput(dto.propertiesJson),
        sortOrder:
          dto.sortOrder ??
          (await this.prisma.projectSpatialFeature.count({
            where: { projectId: access.projectId },
          })),
      },
      include: projectSpatialFeatureInclude,
    });

    return serializeProjectSpatialFeature(feature);
  }

  async findFeature(access: ProjectAccess, featureId: string) {
    await this.assertProjectReadAccess(access);
    return this.findExistingFeature(access.projectId, featureId);
  }

  async updateFeature(
    access: ProjectAccess,
    featureId: string,
    dto: UpdateProjectSpatialFeatureDto,
  ) {
    await this.assertProjectWriteAccess(access);
    const existing = await this.findExistingFeature(access.projectId, featureId);

    if (dto.linkedAiDocumentId !== undefined) {
      await this.assertAiDocumentBelongsToProject(access, dto.linkedAiDocumentId ?? null);
    }

    const nextGeometryType = dto.geometryType ?? existing.geometryType;
    const nextGeometryJson = dto.geometryJson ?? existing.geometryJson;
    const validatedGeometry = validateGeometry(nextGeometryJson, nextGeometryType);

    const feature = await this.prisma.projectSpatialFeature.update({
      where: { id: featureId },
      data: {
        ...(dto.featureType !== undefined && { featureType: dto.featureType }),
        ...(dto.geometryType !== undefined && { geometryType: dto.geometryType }),
        ...(dto.label !== undefined && { label: dto.label.trim() }),
        ...(dto.description !== undefined && {
          description: normalizeNullableString(dto.description),
        }),
        ...((dto.geometryJson !== undefined || dto.geometryType !== undefined) && {
          geometryJson: validatedGeometry as Prisma.InputJsonValue,
        }),
        ...(dto.status !== undefined && { status: normalizeNullableString(dto.status) }),
        ...(dto.sourceType !== undefined && { sourceType: dto.sourceType ?? null }),
        ...(dto.sourceReference !== undefined && {
          sourceReference: normalizeNullableString(dto.sourceReference),
        }),
        ...(dto.linkedProjectReferenceId !== undefined && {
          linkedProjectReferenceId: normalizeNullableString(dto.linkedProjectReferenceId),
        }),
        ...(dto.linkedAiDocumentId !== undefined && {
          linkedAiDocumentId: dto.linkedAiDocumentId ?? null,
        }),
        ...(dto.linkedDeliverableType !== undefined && {
          linkedDeliverableType: dto.linkedDeliverableType ?? null,
        }),
        ...(dto.linkedDeliverableId !== undefined && {
          linkedDeliverableId: normalizeNullableString(dto.linkedDeliverableId),
        }),
        ...(dto.propertiesJson !== undefined && {
          propertiesJson: toNullableJsonInput(dto.propertiesJson),
        }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
      include: projectSpatialFeatureInclude,
    });

    return serializeProjectSpatialFeature(feature);
  }

  async deleteFeature(access: ProjectAccess, featureId: string) {
    await this.assertProjectWriteAccess(access);
    await this.assertFeatureExists(access.projectId, featureId);
    await this.prisma.projectSpatialFeature.delete({ where: { id: featureId } });
    return { id: featureId, deleted: true };
  }

  async listViews(access: ProjectAccess) {
    await this.assertProjectReadAccess(access);

    const views = await this.prisma.projectSpatialView.findMany({
      where: { projectId: access.projectId },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }, { name: 'asc' }],
    });

    return views.map(serializeProjectSpatialView);
  }

  async createView(access: ProjectAccess, dto: CreateProjectSpatialViewDto) {
    await this.assertProjectWriteAccess(access);

    const view = await this.prisma.projectSpatialView.create({
      data: buildProjectSpatialViewCreateData(access, dto),
    });

    return serializeProjectSpatialView(view);
  }

  async updateView(access: ProjectAccess, viewId: string, dto: UpdateProjectSpatialViewDto) {
    await this.assertProjectWriteAccess(access);
    await this.assertViewExists(access.projectId, viewId);

    const view = await this.prisma.projectSpatialView.update({
      where: { id: viewId },
      data: buildProjectSpatialViewUpdateData(dto),
    });

    return serializeProjectSpatialView(view);
  }

  async deleteView(access: ProjectAccess, viewId: string) {
    await this.assertProjectWriteAccess(access);
    await this.assertViewExists(access.projectId, viewId);
    await this.prisma.projectSpatialView.delete({ where: { id: viewId } });
    return { id: viewId, deleted: true };
  }

  async listSheets(access: ProjectAccess) {
    await this.assertProjectReadAccess(access);

    const sheets = await this.prisma.projectSpatialSheet.findMany({
      where: {
        projectId: access.projectId,
        rootSheetTemplate: {
          is: {
            archivedAt: null,
          },
        },
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }, { name: 'asc' }],
    });

    return sheets.map(serializeProjectSpatialSheet);
  }

  async createSheet(access: ProjectAccess, dto: CreateProjectSpatialSheetDto) {
    await this.assertProjectWriteAccess(access);
    const data = await this.resolveProjectSpatialSheetWriteData(access, dto);

    const sheet = await this.prisma.projectSpatialSheet.create({
      data: {
        ...data,
        createdBy: access.userId,
        projectId: access.projectId,
      },
    });

    return serializeProjectSpatialSheet(sheet);
  }

  async updateSheet(access: ProjectAccess, sheetId: string, dto: UpdateProjectSpatialSheetDto) {
    await this.assertProjectWriteAccess(access);
    const existing = await this.findExistingSheet(access.projectId, sheetId);
    const data = await this.resolveProjectSpatialSheetWriteData(access, dto, existing);

    const sheet = await this.prisma.projectSpatialSheet.update({
      where: { id: sheetId },
      data,
    });

    return serializeProjectSpatialSheet(sheet);
  }

  async deleteSheet(access: ProjectAccess, sheetId: string) {
    await this.assertProjectWriteAccess(access);
    await this.assertSheetExists(access.projectId, sheetId);
    await this.prisma.projectSpatialSheet.delete({ where: { id: sheetId } });
    return { id: sheetId, deleted: true };
  }

  private async findExistingFeature(projectId: string, featureId: string) {
    const feature = await this.prisma.projectSpatialFeature.findFirst({
      where: { id: featureId, projectId },
      include: projectSpatialFeatureInclude,
    });

    if (!feature) {
      throw new NotFoundException('Project spatial feature not found');
    }

    return serializeProjectSpatialFeature(feature);
  }

  private async assertFeatureExists(projectId: string, featureId: string) {
    const feature = await this.prisma.projectSpatialFeature.findFirst({
      where: { id: featureId, projectId },
      select: { id: true },
    });

    if (!feature) {
      throw new NotFoundException('Project spatial feature not found');
    }
  }

  private async findExistingView(projectId: string, viewId: string) {
    const view = await this.prisma.projectSpatialView.findFirst({
      where: { id: viewId, projectId },
    });

    if (!view) {
      throw new NotFoundException('Project Spatial View not found');
    }

    return view;
  }

  private async assertViewExists(projectId: string, viewId: string) {
    const view = await this.prisma.projectSpatialView.findFirst({
      where: { id: viewId, projectId },
      select: { id: true },
    });

    if (!view) {
      throw new NotFoundException('Project Spatial View not found');
    }
  }

  private async findExistingSheet(projectId: string, sheetId: string) {
    const sheet = await this.prisma.projectSpatialSheet.findFirst({
      where: { id: sheetId, projectId },
    });

    if (!sheet) {
      throw new NotFoundException('Project Spatial Sheet not found');
    }

    return sheet;
  }

  private async assertSheetExists(projectId: string, sheetId: string) {
    const sheet = await this.prisma.projectSpatialSheet.findFirst({
      where: { id: sheetId, projectId },
      select: { id: true },
    });

    if (!sheet) {
      throw new NotFoundException('Project Spatial Sheet not found');
    }
  }

  private async resolveProjectSpatialSheetWriteData(
    access: ProjectAccess,
    dto: CreateProjectSpatialSheetDto | UpdateProjectSpatialSheetDto,
    existing?: ProjectSpatialSheetRecord,
  ) {
    const templateSourceKind = (dto.templateSourceKind ??
      existing?.templateSourceKind ??
      'root_sheet_template') as (typeof SHEET_TEMPLATE_SOURCE_KINDS)[number];
    if (templateSourceKind !== 'root_sheet_template') {
      throw new BadRequestException(
        'Project Spatial Sheets must use a Root Sheet Template from /templates',
      );
    }
    const templateReferenceId =
      normalizeNullableString(dto.templateReferenceId) ?? existing?.templateReferenceId ?? null;
    const paperSize = resolveTemplatePaperSize(dto.paperSize ?? existing?.paperSize);
    const orientation = resolveTemplateOrientation(dto.orientation ?? existing?.orientation);

    let rootSheetTemplateId =
      dto.rootSheetTemplateId !== undefined
        ? dto.rootSheetTemplateId
        : (existing?.rootSheetTemplateId ?? null);
    let rootSheetTemplateVersionId =
      dto.rootSheetTemplateVersionId !== undefined
        ? dto.rootSheetTemplateVersionId
        : (existing?.rootSheetTemplateVersionId ?? null);
    let templateSnapshotJson =
      dto.templateSnapshotJson !== undefined
        ? normalizeJsonObject(dto.templateSnapshotJson)
        : normalizeJsonObject(existing?.templateSnapshotJson);

    const resolvedTemplate = await this.resolveRootSheetTemplateSelection(access, {
      rootSheetTemplateId,
      rootSheetTemplateVersionId,
    });

    rootSheetTemplateId = resolvedTemplate.template.id;
    rootSheetTemplateVersionId = resolvedTemplate.version.id;
    templateSnapshotJson =
      templateSnapshotJson ?? (resolvedTemplate.version.definitionJson as Record<string, unknown>);
    assertSpatialRootSheetTemplateCompatibility(templateSnapshotJson);

    const assignedViewId =
      dto.assignedViewId !== undefined ? dto.assignedViewId : (existing?.assignedViewId ?? null);
    const assignedView =
      assignedViewId !== null
        ? await this.findExistingView(access.projectId, assignedViewId)
        : null;
    const assignedViewSnapshotJson =
      dto.assignedViewSnapshotJson !== undefined
        ? normalizeJsonObject(dto.assignedViewSnapshotJson)
        : normalizeJsonObject(existing?.assignedViewSnapshotJson);
    const bindingSnapshotJson =
      dto.bindingSnapshotJson !== undefined
        ? normalizeJsonObject(dto.bindingSnapshotJson)
        : normalizeJsonObject(existing?.bindingSnapshotJson);
    const name = dto.name !== undefined ? dto.name.trim() : (existing?.name?.trim() ?? '');

    if (!name) {
      throw new BadRequestException('Project Spatial Sheet name is required');
    }

    return {
      name,
      assignedViewId,
      assignedViewSnapshotJson: assignedView
        ? (serializeProjectSpatialViewSnapshot(assignedView) as Prisma.InputJsonValue)
        : assignedViewSnapshotJson
          ? (assignedViewSnapshotJson as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      bindingSnapshotJson:
        bindingSnapshotJson === undefined
          ? undefined
          : bindingSnapshotJson === null
            ? Prisma.JsonNull
            : (bindingSnapshotJson as Prisma.InputJsonValue),
      orientation,
      paperSize,
      rootSheetTemplateId,
      rootSheetTemplateVersionId,
      templateReferenceId,
      templateSnapshotJson:
        templateSnapshotJson === undefined
          ? undefined
          : templateSnapshotJson === null
            ? Prisma.JsonNull
            : (templateSnapshotJson as Prisma.InputJsonValue),
      templateSourceKind,
    } satisfies Prisma.ProjectSpatialSheetUncheckedUpdateInput;
  }

  private async resolveRootSheetTemplateSelection(
    access: ProjectAccess,
    args: {
      rootSheetTemplateId: string | null | undefined;
      rootSheetTemplateVersionId: string | null | undefined;
    },
  ) {
    if (!args.rootSheetTemplateId) {
      throw new BadRequestException('Root Sheet Template selection requires rootSheetTemplateId');
    }

    const template = await this.prisma.rootSheetTemplate.findFirst({
      where: {
        id: args.rootSheetTemplateId,
        archivedAt: null,
        OR: [
          { scopeType: 'global' },
          { scopeType: 'org', scopeId: access.organisationId },
          { scopeType: 'project', scopeId: access.projectId },
        ],
      },
      include: {
        currentVersion: true,
      },
    });

    if (!template) {
      throw new NotFoundException('Root Sheet Template not found');
    }

    const versionId = args.rootSheetTemplateVersionId ?? template.currentVersionId;
    if (!versionId) {
      throw new BadRequestException('Root Sheet Template has no current version');
    }

    const version = await this.prisma.rootSheetTemplateVersion.findFirst({
      where: {
        id: versionId,
        rootSheetTemplateId: template.id,
      },
    });

    if (!version) {
      throw new NotFoundException('Root Sheet Template Version not found');
    }

    return { template, version };
  }

  private async assertProjectReadAccess(access: ProjectAccess) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: access.projectId,
        organisationId: access.organisationId,
      },
      include: {
        members: {
          select: {
            userId: true,
            role: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (access.orgRole === 'owner' || access.orgRole === 'admin') {
      return project;
    }

    const membership = project.members.find((member) => member.userId === access.userId);
    if (!membership) {
      throw new ForbiddenException('Not a member of this project');
    }

    return project;
  }

  private async assertProjectWriteAccess(access: ProjectAccess) {
    const project = await this.assertProjectReadAccess(access);

    if (access.orgRole === 'owner' || access.orgRole === 'admin') {
      return project;
    }

    const membership = project.members.find((member) => member.userId === access.userId);
    if (!membership || membership.role === 'viewer') {
      throw new ForbiddenException('Project write access denied');
    }

    return project;
  }

  private async assertAiDocumentBelongsToProject(
    access: ProjectAccess,
    aiDocumentId: string | null,
  ) {
    if (!aiDocumentId) {
      return;
    }

    const document = await this.prisma.aiDocument.findFirst({
      where: {
        id: aiDocumentId,
        projectId: access.projectId,
        organisationId: access.organisationId,
      },
      select: { id: true },
    });

    if (!document) {
      throw new NotFoundException('AI document not found for this project');
    }
  }
}

const projectSpatialFeatureInclude = {
  linkedAiDocument: {
    select: {
      id: true,
      filename: true,
      documentFamily: true,
      reportType: true,
      ownerWorkspace: true,
      status: true,
      createdAt: true,
    },
  },
} satisfies Prisma.ProjectSpatialFeatureInclude;

function buildProjectSpatialWhere(projectId: string, filters: ProjectSpatialFeatureFilters) {
  const where: Prisma.ProjectSpatialFeatureWhereInput = {
    projectId,
  };

  if (filters.featureType) {
    where.featureType = filters.featureType;
  }

  if (filters.geometryType) {
    where.geometryType = filters.geometryType;
  }

  if (filters.linkedDeliverableType) {
    where.linkedDeliverableType = filters.linkedDeliverableType;
  }

  if (filters.q?.trim()) {
    const q = filters.q.trim();
    where.OR = [
      { label: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
    ];
  }

  return where;
}

function serializeProjectSpatialFeature(
  feature: ProjectSpatialFeatureWithContext,
): SharedProjectSpatialFeature {
  return {
    id: feature.id,
    projectId: feature.projectId,
    featureType: feature.featureType,
    geometryType: feature.geometryType,
    label: feature.label,
    description: feature.description ?? null,
    geometryJson: feature.geometryJson as ProjectSpatialGeometryJson,
    status: feature.status ?? null,
    sourceType: feature.sourceType ?? null,
    sourceReference: feature.sourceReference ?? null,
    linkedProjectReferenceId: feature.linkedProjectReferenceId ?? null,
    linkedAiDocumentId: feature.linkedAiDocumentId ?? null,
    linkedDeliverableType: feature.linkedDeliverableType ?? null,
    linkedDeliverableId: feature.linkedDeliverableId ?? null,
    propertiesJson: (feature.propertiesJson as ProjectSpatialFeatureProperties | null) ?? null,
    sortOrder: feature.sortOrder,
    createdAt: feature.createdAt.toISOString(),
    updatedAt: feature.updatedAt.toISOString(),
    linkedAiDocument: feature.linkedAiDocument
      ? {
          ...feature.linkedAiDocument,
          createdAt: feature.linkedAiDocument.createdAt.toISOString(),
        }
      : null,
  };
}

function serializeProjectSpatialView(view: ProjectSpatialViewRecord) {
  return {
    annotationsJson: (view.annotationsJson as Record<string, unknown> | null) ?? null,
    basemap: view.basemap,
    capturedAt: view.capturedAt.toISOString(),
    createdAt: view.createdAt.toISOString(),
    createdBy: view.createdBy ?? null,
    description: view.description ?? null,
    filtersJson: (view.filtersJson as Record<string, unknown> | null) ?? null,
    id: view.id,
    labelsOrStyleJson: (view.labelsOrStyleJson as Record<string, unknown> | null) ?? null,
    name: view.name,
    projectId: view.projectId,
    updatedAt: view.updatedAt.toISOString(),
    viewStateJson: view.viewStateJson as Record<string, unknown>,
    visibleLayersJson: view.visibleLayersJson as Record<string, unknown>,
  };
}

function serializeProjectSpatialSheet(sheet: ProjectSpatialSheetRecord) {
  return {
    assignedViewId: sheet.assignedViewId ?? null,
    assignedViewSnapshotJson:
      (sheet.assignedViewSnapshotJson as Record<string, unknown> | null) ?? null,
    bindingSnapshotJson: (sheet.bindingSnapshotJson as Record<string, unknown> | null) ?? null,
    createdAt: sheet.createdAt.toISOString(),
    createdBy: sheet.createdBy ?? null,
    id: sheet.id,
    name: sheet.name,
    orientation: sheet.orientation,
    paperSize: sheet.paperSize,
    projectId: sheet.projectId,
    rootSheetTemplateId: sheet.rootSheetTemplateId ?? null,
    rootSheetTemplateVersionId: sheet.rootSheetTemplateVersionId ?? null,
    templateReferenceId: sheet.templateReferenceId ?? null,
    templateSnapshotJson: (sheet.templateSnapshotJson as Record<string, unknown> | null) ?? null,
    templateSourceKind: sheet.templateSourceKind,
    updatedAt: sheet.updatedAt.toISOString(),
  };
}

function normalizeNullableString(value: string | null | undefined) {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : null;
}

function toNullableJsonInput(value: Record<string, unknown> | null | undefined) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return Prisma.JsonNull;
  }

  return value as Prisma.InputJsonValue;
}

function buildProjectSpatialViewCreateData(
  access: ProjectAccess,
  dto: CreateProjectSpatialViewDto,
): Prisma.ProjectSpatialViewUncheckedCreateInput {
  return {
    annotationsJson: toNullableJsonInput(normalizeJsonObject(dto.annotationsJson)),
    basemap: resolveProjectSpatialBasemap(dto.basemap),
    capturedAt: resolveOptionalDate(dto.capturedAt) ?? new Date(),
    createdBy: access.userId,
    description: normalizeNullableString(dto.description),
    filtersJson: toNullableJsonInput(normalizeJsonObject(dto.filtersJson)),
    labelsOrStyleJson: toNullableJsonInput(normalizeJsonObject(dto.labelsOrStyleJson)),
    name: dto.name.trim(),
    projectId: access.projectId,
    viewStateJson: validateProjectSpatialViewState(dto.viewStateJson) as Prisma.InputJsonValue,
    visibleLayersJson: validateProjectSpatialVisibleLayers(
      dto.visibleLayersJson,
    ) as Prisma.InputJsonValue,
  };
}

function buildProjectSpatialViewUpdateData(dto: UpdateProjectSpatialViewDto) {
  const capturedAt = dto.capturedAt !== undefined ? resolveOptionalDate(dto.capturedAt) : undefined;

  return {
    ...(dto.annotationsJson !== undefined && {
      annotationsJson: toNullableJsonInput(normalizeJsonObject(dto.annotationsJson)),
    }),
    ...(dto.basemap !== undefined && { basemap: resolveProjectSpatialBasemap(dto.basemap) }),
    ...(capturedAt ? { capturedAt } : {}),
    ...(dto.description !== undefined && { description: normalizeNullableString(dto.description) }),
    ...(dto.filtersJson !== undefined && {
      filtersJson: toNullableJsonInput(normalizeJsonObject(dto.filtersJson)),
    }),
    ...(dto.labelsOrStyleJson !== undefined && {
      labelsOrStyleJson: toNullableJsonInput(normalizeJsonObject(dto.labelsOrStyleJson)),
    }),
    ...(dto.name !== undefined && { name: dto.name.trim() }),
    ...(dto.viewStateJson !== undefined && {
      viewStateJson: validateProjectSpatialViewState(dto.viewStateJson) as Prisma.InputJsonValue,
    }),
    ...(dto.visibleLayersJson !== undefined && {
      visibleLayersJson: validateProjectSpatialVisibleLayers(
        dto.visibleLayersJson,
      ) as Prisma.InputJsonValue,
    }),
  } satisfies Prisma.ProjectSpatialViewUncheckedUpdateInput;
}

function validateProjectSpatialViewState(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException('viewStateJson must be an object');
  }

  const record = value as Record<string, unknown>;
  const center = Array.isArray(record.centerLonLat) ? record.centerLonLat : [];
  const longitude = Number(center[0]);
  const latitude = Number(center[1]);
  const rotation = Number(record.rotation);
  const zoomValue = record.zoom;
  const zoom =
    zoomValue === undefined || zoomValue === null || zoomValue === ''
      ? undefined
      : Number(zoomValue);

  if (
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180 ||
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    !Number.isFinite(rotation) ||
    (zoom !== undefined && !Number.isFinite(zoom))
  ) {
    throw new BadRequestException(
      'viewStateJson must include a valid centerLonLat, rotation, and optional zoom',
    );
  }

  return {
    centerLonLat: [longitude, latitude],
    rotation,
    ...(zoom !== undefined ? { zoom } : {}),
  };
}

function validateProjectSpatialVisibleLayers(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException('visibleLayersJson must be an object');
  }

  return value as Record<string, unknown>;
}

function normalizeJsonObject(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException('JSON payloads in this request must be objects');
  }

  return value as Record<string, unknown>;
}

function resolveOptionalDate(value: string | null | undefined) {
  const normalized = normalizeNullableString(value);
  if (!normalized) {
    return null;
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException('Invalid date value');
  }

  return parsed;
}

function resolveProjectSpatialBasemap(value: string): (typeof PROJECT_SPATIAL_BASEMAPS)[number] {
  if ((PROJECT_SPATIAL_BASEMAPS as readonly string[]).includes(value)) {
    return value as (typeof PROJECT_SPATIAL_BASEMAPS)[number];
  }

  throw new BadRequestException('Invalid Project Spatial View basemap');
}

function resolveTemplatePaperSize(value: string | null | undefined) {
  if ((TEMPLATE_PAPER_SIZES as readonly string[]).includes(value ?? '')) {
    return value as (typeof TEMPLATE_PAPER_SIZES)[number];
  }

  throw new BadRequestException('Invalid Project Spatial Sheet paper size');
}

function resolveTemplateOrientation(value: string | null | undefined) {
  if ((TEMPLATE_PAGE_ORIENTATIONS as readonly string[]).includes(value ?? '')) {
    return value as (typeof TEMPLATE_PAGE_ORIENTATIONS)[number];
  }

  throw new BadRequestException('Invalid Project Spatial Sheet orientation');
}

function serializeProjectSpatialViewSnapshot(view: ProjectSpatialViewRecord) {
  return {
    annotationsJson: (view.annotationsJson as Record<string, unknown> | null) ?? null,
    basemap: view.basemap,
    capturedAt: view.capturedAt.toISOString(),
    description: view.description ?? null,
    filtersJson: (view.filtersJson as Record<string, unknown> | null) ?? null,
    labelsOrStyleJson: (view.labelsOrStyleJson as Record<string, unknown> | null) ?? null,
    name: view.name,
    viewStateJson: view.viewStateJson as Record<string, unknown>,
    visibleLayersJson: view.visibleLayersJson as Record<string, unknown>,
  };
}

function assertSpatialRootSheetTemplateCompatibility(
  templateSnapshotJson: Record<string, unknown> | null,
) {
  const objects = Array.isArray(templateSnapshotJson?.objects)
    ? (templateSnapshotJson?.objects as Array<Record<string, unknown>>)
    : [];

  if (!objects.some((object) => object?.type === 'mapFrame')) {
    throw new BadRequestException(
      'Selected Root Sheet Template must include a mapFrame block for spatial use',
    );
  }
}

function validateGeometry(
  geometry: unknown,
  geometryType: ProjectSpatialGeometryType,
): ProjectSpatialGeometryJson {
  if (!geometry || typeof geometry !== 'object' || Array.isArray(geometry)) {
    throw new BadRequestException('geometryJson must be a GeoJSON geometry object');
  }

  const candidate = geometry as Record<string, unknown>;
  const type = candidate.type;

  if (typeof type !== 'string') {
    throw new BadRequestException('geometryJson.type is required');
  }

  if (geometryType === 'point' && type !== 'Point') {
    throw new BadRequestException('geometryJson.type must be Point for point features');
  }

  if (geometryType === 'line_string' && type !== 'LineString') {
    throw new BadRequestException('geometryJson.type must be LineString for line features');
  }

  if (geometryType === 'polygon' && type !== 'Polygon') {
    throw new BadRequestException('geometryJson.type must be Polygon for polygon features');
  }

  if (type === 'Point') {
    return {
      type,
      coordinates: validatePosition(candidate.coordinates, 'geometryJson.coordinates'),
    };
  }

  if (type === 'LineString') {
    const coordinates = candidate.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length < 2) {
      throw new BadRequestException('LineString geometry must contain at least 2 positions');
    }

    return {
      type,
      coordinates: coordinates.map((position, index) =>
        validatePosition(position, `geometryJson.coordinates[${index}]`),
      ),
    };
  }

  if (type === 'Polygon') {
    const rings = candidate.coordinates;
    if (!Array.isArray(rings) || rings.length === 0) {
      throw new BadRequestException('Polygon geometry must contain at least 1 linear ring');
    }

    return {
      type,
      coordinates: rings.map((ring, ringIndex) => validateRing(ring, ringIndex)),
    };
  }

  throw new BadRequestException('Unsupported geometryJson.type');
}

function validateRing(ring: unknown, ringIndex: number) {
  if (!Array.isArray(ring) || ring.length < 4) {
    throw new BadRequestException(
      `geometryJson.coordinates[${ringIndex}] must contain at least 4 positions`,
    );
  }

  const positions = ring.map((position, index) =>
    validatePosition(position, `geometryJson.coordinates[${ringIndex}][${index}]`),
  );
  const first = positions[0];
  const last = positions[positions.length - 1];

  if (!first || !last || first[0] !== last[0] || first[1] !== last[1]) {
    throw new BadRequestException(
      `geometryJson.coordinates[${ringIndex}] must be a closed linear ring`,
    );
  }

  return positions;
}

function validatePosition(position: unknown, path: string): GeoJsonPosition {
  if (!Array.isArray(position) || position.length < 2) {
    throw new BadRequestException(`${path} must contain longitude and latitude`);
  }

  const longitude = Number(position[0]);
  const latitude = Number(position[1]);

  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new BadRequestException(`${path}[0] must be a longitude between -180 and 180`);
  }

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new BadRequestException(`${path}[1] must be a latitude between -90 and 90`);
  }

  if (position.length >= 3) {
    const elevation = Number(position[2]);
    if (!Number.isFinite(elevation)) {
      throw new BadRequestException(`${path}[2] must be numeric when provided`);
    }
    return [longitude, latitude, elevation];
  }

  return [longitude, latitude];
}
