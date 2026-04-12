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
  ProjectSpatialFeatureFiltersDto,
  UpdateProjectSpatialFeatureDto,
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
