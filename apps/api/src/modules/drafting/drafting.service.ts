import { randomUUID } from 'crypto';
import {
  DraftingDrawing,
  DraftingDrawingTransmittal,
  DraftingDrawingSummary,
  DraftingModel,
  DraftingModelSchema,
  FoundationPileTypeSource,
  FoundationPlacedPileSource,
  GeotechBoreholeSource,
  MonitoringPointSource,
  OmnidotsMeasuringPointSource,
  ProjectEngineeringSourceRegistry,
  SpatialFeatureSource,
  SpatialServiceSource,
  DraftingProjectTransmittal,
  DraftingProjectTransmittalInput,
  DraftingProjectTransmittalItem,
  DraftingProjectTransmittalPayload,
  DraftingProjectTransmittalPayloadSchema,
  DraftingProjectTransmittalStatus,
  DraftingTransmittalEvidenceSource,
  DraftingRevision,
  MultiPileJoint,
  MultiPilePileTypeDefinition,
  createEmptyDraftingModel,
} from '@eng/shared';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DocumentsService } from '../documents/documents.service';
import type { CreateDraftingDrawingDto } from './dto/create-drafting-drawing.dto';
import type {
  AttachDraftingTransmittalEvidenceDto,
  UploadDraftingTransmittalEvidenceDto,
} from './dto/transmittal-evidence.dto';
import type { UpdateDraftingDrawingDto } from './dto/update-drafting-drawing.dto';

type ProjectAccess = {
  projectId: string;
  organisationId: string;
  userId: string;
  orgRole?: string;
};

type DraftingDrawingRecord = Prisma.DraftingDrawingGetPayload<{
  include: {
    revisions: {
      orderBy: {
        revisionNumber: 'desc';
      };
    };
  };
}>;

type ProjectDraftingTransmittalRecord = Prisma.ProjectDraftingTransmittalGetPayload<object>;

@Injectable()
export class DraftingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documentsService: DocumentsService,
  ) {}

  async listDrawings(access: ProjectAccess): Promise<DraftingDrawingSummary[]> {
    await this.assertProjectReadAccess(access);

    const drawings = await this.prisma.draftingDrawing.findMany({
      where: { projectId: access.projectId },
      include: {
        revisions: {
          orderBy: { revisionNumber: 'desc' },
        },
      },
      orderBy: [{ updatedAt: 'desc' }, { title: 'asc' }],
    });

    return drawings.map(serializeDraftingDrawingSummary);
  }

  async listProjectTransmittals(access: ProjectAccess): Promise<DraftingProjectTransmittal[]> {
    await this.assertProjectReadAccess(access);

    const transmittals = await this.prisma.projectDraftingTransmittal.findMany({
      where: {
        organisationId: access.organisationId,
        projectId: access.projectId,
      },
      orderBy: [{ updatedAt: 'desc' }, { transmittalNumber: 'asc' }],
    });

    return transmittals.map(serializeProjectDraftingTransmittal);
  }

  async createProjectTransmittal(
    access: ProjectAccess,
    dto: DraftingProjectTransmittalInput,
  ): Promise<DraftingProjectTransmittal> {
    await this.assertProjectWriteAccess(access);
    const payload = await this.buildProjectTransmittalPayload(access, dto);
    const record = await this.prisma.projectDraftingTransmittal.create({
      data: {
        organisationId: access.organisationId,
        projectId: access.projectId,
        transmittalNumber: dto.transmittalNumber.trim(),
        status: payload.status,
        payloadJson: payload as Prisma.InputJsonValue,
        createdById: access.userId,
      },
    });

    return serializeProjectDraftingTransmittal(record);
  }

  async findProjectTransmittal(
    access: ProjectAccess,
    transmittalId: string,
  ): Promise<DraftingProjectTransmittal> {
    await this.assertProjectReadAccess(access);
    const record = await this.findProjectTransmittalRecord(access, transmittalId);
    return serializeProjectDraftingTransmittal(record);
  }

  async updateProjectTransmittal(
    access: ProjectAccess,
    transmittalId: string,
    dto: DraftingProjectTransmittalInput,
  ): Promise<DraftingProjectTransmittal> {
    await this.assertProjectWriteAccess(access);
    const existing = await this.findProjectTransmittalRecord(access, transmittalId);
    if (existing.status !== 'draft') {
      throw new BadRequestException('Issued project transmittals are locked');
    }

    const payload = await this.buildProjectTransmittalPayload(access, dto);
    const record = await this.prisma.projectDraftingTransmittal.update({
      where: { id: existing.id },
      data: {
        transmittalNumber: dto.transmittalNumber.trim(),
        status: payload.status,
        payloadJson: payload as Prisma.InputJsonValue,
      },
    });

    return serializeProjectDraftingTransmittal(record);
  }

  async createDrawing(
    access: ProjectAccess,
    dto: CreateDraftingDrawingDto,
  ): Promise<DraftingDrawing> {
    await this.assertProjectWriteAccess(access);

    const drawingId = randomUUID();
    const kind = dto.kind ?? 'sketch';
    if (kind === 'model') {
      await this.prisma.draftingDrawing.updateMany({
        where: {
          projectId: access.projectId,
          kind: 'model',
          status: { not: 'archived' },
        },
        data: {
          kind: 'sketch',
          updatedById: access.userId,
        },
      });
    }

    const drawing = await this.prisma.draftingDrawing.create({
      data: {
        id: drawingId,
        projectId: access.projectId,
        title: kind === 'model' ? 'Project Model' : dto.title.trim(),
        kind,
        modelVersion: 1,
        modelJson: createEmptyDraftingModel(drawingId) as Prisma.InputJsonValue,
        createdById: access.userId,
        updatedById: access.userId,
      },
      include: {
        revisions: {
          orderBy: { revisionNumber: 'desc' },
        },
      },
    });

    return serializeDraftingDrawing(drawing);
  }

  async findDrawing(access: ProjectAccess, drawingId: string): Promise<DraftingDrawing> {
    await this.assertProjectReadAccess(access);

    const drawing = await this.findDrawingRecord(access.projectId, drawingId);
    return serializeDraftingDrawing(drawing);
  }

  async buildSourceRegistry(
    access: ProjectAccess,
    drawingId?: string,
  ): Promise<ProjectEngineeringSourceRegistry> {
    await this.assertProjectReadAccess(access);

    const [
      pileGroups,
      capacityProfiles,
      designChecks,
      spatialFeatures,
      monitoringLocations,
      environmentalDatasets,
      drawing,
    ] = await Promise.all([
      this.prisma.pileGroup.findMany({
        where: { projectId: access.projectId },
        include: {
          piles: true,
          layoutPoints: true,
          designChecks: true,
        },
        orderBy: [{ updatedAt: 'desc' }, { name: 'asc' }],
      }),
      this.prisma.pileCapacityProfile.findMany({
        where: { projectId: access.projectId },
        orderBy: [{ updatedAt: 'desc' }],
      }),
      this.prisma.pileDesignCheck.findMany({
        where: {
          OR: [
            { pileGroup: { projectId: access.projectId } },
            { calculationRun: { projectId: access.projectId } },
          ],
        },
        orderBy: [{ createdAt: 'desc' }],
      }),
      this.prisma.projectSpatialFeature.findMany({
        where: { projectId: access.projectId },
        orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }, { label: 'asc' }],
      }),
      this.prisma.projectEnvironmentalMonitoringLocation.findMany({
        where: { monitoringReport: { projectId: access.projectId } },
        include: {
          monitoringReport: {
            select: { id: true, reportType: true, title: true },
          },
        },
        orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
      }),
      this.prisma.projectEnvironmentalMonitoringDataset.findMany({
        where: { monitoringReport: { projectId: access.projectId } },
        include: {
          measuringPoint: true,
          connection: {
            select: {
              id: true,
              displayName: true,
              status: true,
              lastSyncAt: true,
            },
          },
          monitoringReport: {
            select: { id: true, reportType: true, title: true },
          },
        },
        orderBy: [{ updatedAt: 'desc' }],
      }),
      this.findRegistryDrawing(access.projectId, drawingId),
    ]);

    const model = drawing ? parseRegistryDraftingModel(drawing.modelJson) : null;
    const usageCounts = buildDraftingSourceUsage(model);
    const warnings: string[] = [];
    const foundationPileTypes: FoundationPileTypeSource[] = [];
    const foundationPlacedPiles: FoundationPlacedPileSource[] = [];
    const foundationPileGroups = pileGroups.map((group) => ({
      sourceType: 'foundation_pile_group',
      sourceId: group.id,
      sourceLabel: group.name,
      sourceCode: group.name,
      originModule: 'foundations' as const,
      status: 'current' as const,
      completeness: 'unknown' as const,
      sourcePath: 'pile_groups',
      sourceVersion: group.updatedAt.toISOString(),
      snapshot: {
        pileGroupId: group.id,
        name: group.name,
        description: group.description,
      },
      warnings: [],
    }));

    for (const group of pileGroups) {
      const multiPile = getMultiPileStateFromMetadata(group.metadata);
      multiPile.pileTypes.forEach((pileType, index) => {
        const sourceId = `${group.id}:type:${pileType.id}`;
        const completeness = getRegistryPileTypeCompleteness(pileType);
        foundationPileTypes.push({
          sourceType: 'foundation_pile_type',
          sourceId,
          sourceLabel: pileType.displayName || pileType.id,
          sourceCode: pileType.id,
          originModule: 'foundations',
          status: completeness.status === 'complete' ? 'current' : 'incomplete',
          completeness: completeness.status,
          sourcePath: `pile_groups.metadata.multiPile.pileTypes[${index}]`,
          sourceVersion: group.updatedAt.toISOString(),
          usedByDraftingObjectCount: usageCounts.get(sourceId)?.count ?? 0,
          alreadyRepresentedInDrafting: Boolean(usageCounts.get(sourceId)?.count),
          existingDraftingObjectId: usageCounts.get(sourceId)?.firstObjectId,
          engineering: {
            code: pileType.id,
            name: pileType.displayName,
            pileSystem: stringOrUndefined(pileType.pileSystem),
            diameterMm: pileTypeDiameterMm(pileType),
            concreteGrade: stringOrUndefined(pileType.concreteGrade),
            socketLengthM: numberOrUndefined(pileType.socketLengthM),
            socketLengthMm: numberOrUndefined(pileType.socketLengthMm),
            foundingStratum: stringOrUndefined(pileType.foundingStratum),
            foundingNote: stringOrUndefined(pileType.foundingNote),
            designCompressionKn: numberOrUndefined(pileType.designCompressionKn),
            designTensionKn: numberOrUndefined(pileType.designTensionKn),
            designLateralKn: numberOrUndefined(pileType.designLateralKn),
            status: stringOrUndefined(pileType.status),
            notes: stringOrUndefined(pileType.notes),
          },
          snapshot: {
            pileGroupId: group.id,
            pileGroupName: group.name,
            pileTypeDefinition: pileType,
            sourcePath: `pile_groups.metadata.multiPile.pileTypes[${index}]`,
            originModule: 'foundations',
          },
          warnings: completeness.missing.map((field) => `Missing ${field}`),
        });
      });

      const pileTypesById = new Map(multiPile.pileTypes.map((pileType) => [pileType.id, pileType]));
      for (const pile of group.piles) {
        const layoutPoint = group.layoutPoints.find((point) => point.pileId === pile.id);
        const sourceId = pile.id;
        const coordinates = layoutPoint
          ? { x: layoutPoint.x, y: layoutPoint.y, z: layoutPoint.z }
          : undefined;
        foundationPlacedPiles.push({
          sourceType: 'foundation_pile',
          sourceId,
          sourceLabel: layoutPoint?.label || pile.name,
          sourceCode: layoutPoint?.label || pile.name,
          originModule: 'foundations',
          status: 'current',
          completeness: pile.diameter ? 'partial' : 'unknown',
          coordinates,
          sourcePath: 'piles',
          sourceVersion: pile.updatedAt.toISOString(),
          usedByDraftingObjectCount: usageCounts.get(sourceId)?.count ?? 0,
          alreadyRepresentedInDrafting: Boolean(usageCounts.get(sourceId)?.count),
          existingDraftingObjectId: usageCounts.get(sourceId)?.firstObjectId,
          engineering: {
            pileTypeCode: String(pile.pileType),
            diameterMm: metresToMm(pile.diameter),
          },
          snapshot: {
            pileGroupId: group.id,
            pileGroupName: group.name,
            pile,
            layoutPoint,
            sourcePath: 'piles',
            originModule: 'foundations',
          },
          warnings: layoutPoint ? [] : ['No pile layout coordinates found.'],
        });
      }

      multiPile.joints.forEach((joint, index) => {
        const sourceId = `${group.id}:joint:${joint.id}`;
        const pileType = pileTypesById.get(joint.pileTypeId);
        foundationPlacedPiles.push({
          sourceType: 'foundation_pile',
          sourceId,
          sourceLabel: joint.displayName || joint.jointDisplayName || joint.id,
          sourceCode: joint.id,
          originModule: 'foundations',
          status: 'current',
          completeness: pileType ? getRegistryPileTypeCompleteness(pileType).status : 'partial',
          coordinates: { x: joint.x, y: joint.y, z: joint.z },
          sourcePath: `pile_groups.metadata.multiPile.joints[${index}]`,
          sourceVersion: group.updatedAt.toISOString(),
          usedByDraftingObjectCount: usageCounts.get(sourceId)?.count ?? 0,
          alreadyRepresentedInDrafting: Boolean(usageCounts.get(sourceId)?.count),
          existingDraftingObjectId: usageCounts.get(sourceId)?.firstObjectId,
          engineering: {
            pileTypeCode: pileType?.id ?? joint.pileTypeId,
            pileTypeName: pileType?.displayName,
            pileSystem: stringOrUndefined(pileType?.pileSystem),
            diameterMm: pileType ? pileTypeDiameterMm(pileType) : undefined,
            concreteGrade: stringOrUndefined(pileType?.concreteGrade),
            socketLengthM: numberOrUndefined(pileType?.socketLengthM),
            foundingStratum: stringOrUndefined(pileType?.foundingStratum),
            foundingNote: stringOrUndefined(pileType?.foundingNote),
            designCompressionKn: numberOrUndefined(pileType?.designCompressionKn),
            designTensionKn: numberOrUndefined(pileType?.designTensionKn),
            designLateralKn: numberOrUndefined(pileType?.designLateralKn),
          },
          snapshot: {
            pileGroupId: group.id,
            pileGroupName: group.name,
            joint,
            pileTypeDefinition: pileType,
            sourcePath: `pile_groups.metadata.multiPile.joints[${index}]`,
            originModule: 'foundations',
          },
          warnings: pileType
            ? []
            : [`Pile type ${joint.pileTypeId} not found for joint ${joint.id}.`],
        });
      });
    }

    const boreholes: GeotechBoreholeSource[] = [];
    const monitoringPoints: MonitoringPointSource[] = [];
    const referencePoints: SpatialFeatureSource[] = [];
    const boundaries: SpatialFeatureSource[] = [];
    const genericFeatures: SpatialFeatureSource[] = [];

    for (const feature of spatialFeatures) {
      const base = buildSpatialRegistrySource(feature, usageCounts);
      if (feature.featureType === 'borehole') {
        boreholes.push({
          ...base,
          sourceType: 'geotech_borehole',
          originModule: 'spatial',
          engineering: {
            boreholeId:
              stringOrUndefined(objectValue(feature.propertiesJson).boreholeId) ?? feature.label,
            boreholeType: stringOrUndefined(feature.sourceType) ?? feature.featureType,
            groundLevelRl: numberOrUndefined(objectValue(feature.propertiesJson).rlM),
            terminationDepthM: numberOrUndefined(objectValue(feature.propertiesJson).depthM),
          },
        });
        continue;
      }

      if (isMonitoringSpatialFeature(feature.featureType)) {
        monitoringPoints.push({
          ...base,
          sourceType: 'spatial_feature',
          originModule: 'spatial',
          engineering: {
            monitoringType:
              feature.featureType === 'noise_monitor'
                ? 'noise'
                : feature.featureType === 'vibration_monitor'
                  ? 'vibration'
                  : 'survey',
            monitorId:
              stringOrUndefined(objectValue(feature.propertiesJson).monitorId) ??
              stringOrUndefined(objectValue(feature.propertiesJson).wellId) ??
              feature.label,
          },
        });
        continue;
      }

      if (feature.featureType === 'reference_point') {
        referencePoints.push({ ...base, category: 'reference_point' });
      } else if (
        feature.featureType === 'site_boundary' ||
        feature.featureType === 'parcel_boundary'
      ) {
        boundaries.push({ ...base, category: 'boundary' });
      } else {
        genericFeatures.push(base);
      }
    }

    for (const location of monitoringLocations) {
      const sourceId = location.sourceSpatialFeatureId
        ? `environmental-location:${location.id}:feature:${location.sourceSpatialFeatureId}`
        : `environmental-location:${location.id}`;
      monitoringPoints.push({
        sourceType: 'monitoring_point',
        sourceId,
        sourceLabel: location.label,
        sourceCode: location.sourceSpatialFeatureLabel ?? location.label,
        originModule: 'environmental',
        status: 'current',
        completeness: location.coordinatesNote ? 'partial' : 'unknown',
        sourcePath: 'project_environmental_monitoring_locations',
        usedByDraftingObjectCount: usageCounts.get(sourceId)?.count ?? 0,
        alreadyRepresentedInDrafting: Boolean(usageCounts.get(sourceId)?.count),
        existingDraftingObjectId: usageCounts.get(sourceId)?.firstObjectId,
        engineering: {
          monitoringType: location.receiverType ?? location.monitoringReport.reportType,
          monitorId: location.sourceSpatialFeatureLabel ?? location.label,
          location: location.locationDescription ?? undefined,
        },
        snapshot: {
          locationId: location.id,
          reportId: location.monitoringReport.id,
          reportTitle: location.monitoringReport.title,
          sourceSpatialFeatureId: location.sourceSpatialFeatureId,
          sourceSpatialFeatureLabel: location.sourceSpatialFeatureLabel,
          coordinatesNote: location.coordinatesNote,
          sourcePath: 'project_environmental_monitoring_locations',
          originModule: 'environmental',
        },
        warnings: location.coordinatesNote
          ? []
          : ['No numeric coordinates stored for this monitoring location.'],
      });
    }

    const omnidotsMeasuringPoints = environmentalDatasets.flatMap((dataset) => {
      if (!dataset.measuringPoint) {
        return [] as OmnidotsMeasuringPointSource[];
      }
      const point = dataset.measuringPoint;
      const sourceId = point.id;
      const coordinates =
        point.userLatitude !== null && point.userLongitude !== null
          ? { x: point.userLongitude, y: point.userLatitude }
          : point.sensorLatitude !== null && point.sensorLongitude !== null
            ? { x: point.sensorLongitude, y: point.sensorLatitude }
            : undefined;
      return [
        {
          sourceType: 'omnidots_measuring_point' as const,
          sourceId,
          sourceLabel: point.name,
          sourceCode: point.externalMeasuringPointId,
          originModule: 'omnidots' as const,
          status: point.active ? ('current' as const) : ('incomplete' as const),
          completeness: coordinates ? ('partial' as const) : ('unknown' as const),
          coordinates,
          sourcePath: 'omnidots_measuring_points',
          sourceVersion: point.updatedAt.toISOString(),
          usedByDraftingObjectCount: usageCounts.get(sourceId)?.count ?? 0,
          alreadyRepresentedInDrafting: Boolean(usageCounts.get(sourceId)?.count),
          existingDraftingObjectId: usageCounts.get(sourceId)?.firstObjectId,
          engineering: {
            externalMeasuringPointId: point.externalMeasuringPointId,
            measuringType: point.measuringType ?? undefined,
            category: point.category ?? undefined,
            timezone: point.timezone ?? undefined,
            active: point.active,
          },
          snapshot: {
            measuringPointId: point.id,
            externalMeasuringPointId: point.externalMeasuringPointId,
            name: point.name,
            connectionId: dataset.connection?.id,
            connectionName: dataset.connection?.displayName,
            reportId: dataset.monitoringReport.id,
            reportTitle: dataset.monitoringReport.title,
            sourcePath: 'omnidots_measuring_points',
            originModule: 'omnidots',
          },
          warnings: coordinates ? [] : ['No Omnidots measuring point coordinates stored.'],
        },
      ];
    });

    const services: SpatialServiceSource[] = [];
    warnings.push('No explicit service/utility source types found.');

    return {
      projectId: access.projectId,
      generatedAt: new Date().toISOString(),
      sources: {
        foundation: {
          pileTypes: foundationPileTypes,
          placedPiles: foundationPlacedPiles,
          pileGroups: foundationPileGroups,
          capacityProfiles: capacityProfiles.map((profile) => ({
            sourceType: 'pile_capacity_profile',
            sourceId: profile.id,
            sourceLabel: profile.method,
            sourceCode: profile.method,
            originModule: 'foundations' as const,
            status: 'current' as const,
            completeness: 'unknown' as const,
            sourcePath: 'pile_capacity_profiles',
            sourceVersion: profile.updatedAt.toISOString(),
            snapshot: {
              method: profile.method,
              standardRef: profile.standardRef,
              pileId: profile.pileId,
              sourcePath: 'pile_capacity_profiles',
              originModule: 'foundations',
            },
            warnings: [],
          })),
          designChecks: designChecks.map((check) => ({
            sourceType: 'pile_design_check',
            sourceId: check.id,
            sourceLabel: `${check.checkType} ${check.status}`,
            sourceCode: check.checkType,
            originModule: 'foundations' as const,
            status: 'current' as const,
            completeness: 'unknown' as const,
            sourcePath: 'pile_design_checks',
            snapshot: {
              checkType: check.checkType,
              limitState: check.limitState,
              demandValue: check.demandValue,
              capacityValue: check.capacityValue,
              utilisationRatio: check.utilisationRatio,
              status: check.status,
              pileId: check.pileId,
              pileGroupId: check.pileGroupId,
              sourcePath: 'pile_design_checks',
              originModule: 'foundations',
            },
            warnings: [],
          })),
        },
        geotech: {
          boreholes,
          strata: [],
        },
        monitoring: {
          monitoringPoints,
          omnidotsMeasuringPoints: dedupeBySourceId(omnidotsMeasuringPoints),
        },
        spatial: {
          referencePoints,
          boundaries,
          features: genericFeatures,
          services,
        },
      },
      warnings,
    };
  }

  async updateDrawing(
    access: ProjectAccess,
    drawingId: string,
    dto: UpdateDraftingDrawingDto,
  ): Promise<DraftingDrawing> {
    await this.assertProjectWriteAccess(access);
    const existing = await this.findDrawingRecord(access.projectId, drawingId);
    if (existing.kind === 'model' && dto.status === 'archived') {
      throw new BadRequestException('The active project model canvas cannot be archived');
    }
    if (existing.kind === 'model' && dto.kind === 'sketch') {
      throw new BadRequestException('A project must keep one active project model canvas');
    }
    if (dto.kind === 'model') {
      await this.prisma.draftingDrawing.updateMany({
        where: {
          projectId: access.projectId,
          id: { not: drawingId },
          kind: 'model',
          status: { not: 'archived' },
        },
        data: {
          kind: 'sketch',
          updatedById: access.userId,
        },
      });
    }

    const drawing = await this.prisma.draftingDrawing.update({
      where: { id: drawingId },
      data: {
        ...(dto.title !== undefined && { title: dto.title.trim() }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.kind !== undefined && { kind: dto.kind }),
        updatedById: access.userId,
      },
      include: {
        revisions: {
          orderBy: { revisionNumber: 'desc' },
        },
      },
    });

    return serializeDraftingDrawing(drawing);
  }

  async saveModel(
    access: ProjectAccess,
    drawingId: string,
    rawModel: Record<string, unknown>,
  ): Promise<DraftingDrawing> {
    await this.assertProjectWriteAccess(access);
    const existing = await this.findDrawingRecord(access.projectId, drawingId);
    const parsedModel = parseIncomingDraftingModel(rawModel, drawingId);
    await this.assertTransmittalEvidenceReferences(access, parsedModel);

    const drawing = await this.prisma.draftingDrawing.update({
      where: { id: drawingId },
      data: {
        modelVersion: parsedModel.version,
        modelJson: parsedModel as Prisma.InputJsonValue,
        updatedById: access.userId,
      },
      include: {
        revisions: {
          orderBy: { revisionNumber: 'desc' },
        },
      },
    });

    if (existing.status === 'archived') {
      await this.prisma.draftingDrawing.update({
        where: { id: drawingId },
        data: {
          status: 'draft',
          updatedById: access.userId,
        },
      });

      return this.findDrawing(access, drawingId);
    }

    return serializeDraftingDrawing(drawing);
  }

  async uploadTransmittalEvidence(
    access: ProjectAccess,
    drawingId: string,
    transmittalId: string,
    dto: UploadDraftingTransmittalEvidenceDto,
    file?: Express.Multer.File,
  ): Promise<DraftingDrawing> {
    await this.assertProjectWriteAccess(access);
    if (!file) {
      throw new BadRequestException('PDF evidence file is required');
    }
    assertPdfUpload(file);

    await this.assertTransmittalCanAcceptEvidence(access.projectId, drawingId, transmittalId);

    const document = await this.documentsService.create(
      {
        organisationId: access.organisationId,
        userId: access.userId,
        orgRole: access.orgRole,
      },
      {
        ...(isUuid(transmittalId) && { entityId: transmittalId }),
        entityType: 'drafting_transmittal_pdf_evidence',
        name: dto.name?.trim() || file.originalname.replace(/\.pdf$/i, ''),
        projectId: access.projectId,
      },
      file,
    );

    return this.attachTransmittalEvidence(access, drawingId, transmittalId, {
      artifactSource: 'manual_upload',
      documentId: document.id,
      notes: dto.notes,
    });
  }

  async attachTransmittalEvidence(
    access: ProjectAccess,
    drawingId: string,
    transmittalId: string,
    dto: AttachDraftingTransmittalEvidenceDto,
  ): Promise<DraftingDrawing> {
    await this.assertProjectWriteAccess(access);
    const record = await this.findDrawingRecord(access.projectId, drawingId);
    const model = parseStoredDraftingModel(record.modelJson, drawingId);
    const document = await this.findProjectPdfEvidenceDocument(access, dto.documentId);
    const nextModel = attachEvidenceToModel({
      attachedAt: new Date().toISOString(),
      attachedBy: access.userId,
      artifactSource: dto.artifactSource ?? 'browser_print_pdf',
      document,
      model,
      notes: dto.notes,
      transmittalId,
    });

    return this.persistModel(access, drawingId, nextModel);
  }

  async removeTransmittalEvidence(
    access: ProjectAccess,
    drawingId: string,
    transmittalId: string,
    notes?: string,
  ): Promise<DraftingDrawing> {
    await this.assertProjectWriteAccess(access);
    const record = await this.findDrawingRecord(access.projectId, drawingId);
    const model = parseStoredDraftingModel(record.modelJson, drawingId);
    const nextModel = removeEvidenceFromModel({
      model,
      notes,
      removedAt: new Date().toISOString(),
      removedBy: access.userId,
      transmittalId,
    });

    return this.persistModel(access, drawingId, nextModel);
  }

  private async findDrawingRecord(projectId: string, drawingId: string) {
    const drawing = await this.prisma.draftingDrawing.findFirst({
      where: {
        id: drawingId,
        projectId,
      },
      include: {
        revisions: {
          orderBy: { revisionNumber: 'desc' },
        },
      },
    });

    if (!drawing) {
      throw new NotFoundException('Drafting drawing not found');
    }

    return drawing;
  }

  private async findRegistryDrawing(projectId: string, drawingId?: string) {
    if (drawingId) {
      return this.prisma.draftingDrawing.findFirst({
        where: { id: drawingId, projectId },
      });
    }

    return this.prisma.draftingDrawing.findFirst({
      where: {
        projectId,
        kind: 'model',
        status: { not: 'archived' },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  private async findProjectTransmittalRecord(access: ProjectAccess, transmittalId: string) {
    const record = await this.prisma.projectDraftingTransmittal.findFirst({
      where: {
        id: transmittalId,
        organisationId: access.organisationId,
        projectId: access.projectId,
      },
    });

    if (!record) {
      throw new NotFoundException('Project drafting transmittal not found');
    }

    return record;
  }

  private async buildProjectTransmittalPayload(
    access: ProjectAccess,
    dto: DraftingProjectTransmittalInput,
  ): Promise<DraftingProjectTransmittalPayload> {
    const selectedRefs = uniqueProjectTransmittalRefs(dto.includedItems ?? []);
    if (selectedRefs.length === 0) {
      throw new BadRequestException(
        'A project transmittal requires at least one issued sheet snapshot',
      );
    }

    const drawings = await this.prisma.draftingDrawing.findMany({
      where: {
        id: { in: Array.from(new Set(selectedRefs.map((ref) => ref.drawingId))) },
        projectId: access.projectId,
      },
      orderBy: [{ title: 'asc' }],
    });
    const drawingsById = new Map(drawings.map((drawing) => [drawing.id, drawing]));
    const includedItems: DraftingProjectTransmittalItem[] = [];
    const warningSummary: string[] = [];

    for (const ref of selectedRefs) {
      const drawing = drawingsById.get(ref.drawingId);
      if (!drawing) {
        throw new BadRequestException('Selected drawing is outside this project');
      }
      const model = parseStoredDraftingModel(drawing.modelJson, drawing.id);
      const issue = model.drawingSheetIssues.find(
        (candidate) => candidate.id === ref.drawingSheetIssueId,
      );
      if (!issue || issue.status === 'draft' || issue.lockedDrawingSheets.length === 0) {
        throw new BadRequestException(
          'Project transmittals can only include issued frozen drawing sheet snapshots',
        );
      }
      const sheet = issue.lockedDrawingSheets.find((candidate) => candidate.id === ref.sheetId);
      if (!sheet) {
        throw new BadRequestException('Selected sheet is missing from the frozen issue snapshot');
      }
      const drawingNumber = issue.lockedTitleBlock.drawingNumber ?? model.titleBlock?.drawingNumber;
      includedItems.push({
        drawingId: drawing.id,
        drawingName: drawing.title,
        drawingNumber,
        drawingSheetIssueId: issue.id,
        issueDate: issue.issueDate,
        issueNumber: issue.issueNumber,
        revision: issue.revision,
        sheetId: sheet.id,
        sheetNumber: sheet.sheetNumber,
        sheetTitle: sheet.title || sheet.name,
        snapshotLabel: `${issue.issueNumber} Rev ${issue.revision} - ${sheet.sheetNumber} ${sheet.title || sheet.name}`,
        status: issue.status,
      });
      if (!sheet.templateSnapshot) {
        warningSummary.push(
          `${drawing.title} ${sheet.sheetNumber} has no template snapshot metadata.`,
        );
      }
      if (issue.lockedObjects.some((object) => !object.renderedState)) {
        warningSummary.push(
          `${drawing.title} ${issue.issueNumber} includes legacy object snapshots.`,
        );
      }
    }

    const status = dto.status ?? 'draft';
    const payload: DraftingProjectTransmittalPayload = {
      cc: normalizePartyList(dto.cc),
      includedItems,
      ...(status === 'issued' && { issuedAt: dto.issuedAt ?? new Date().toISOString() }),
      issuedBy: dto.issuedBy?.trim() || undefined,
      issuedTo: normalizePartyList(dto.issuedTo),
      notes: dto.notes?.trim() || undefined,
      provenanceSummary: {
        drawingCount: new Set(includedItems.map((item) => item.drawingId)).size,
        frozenIssueCount: new Set(
          includedItems.map((item) => `${item.drawingId}:${item.drawingSheetIssueId}`),
        ).size,
        sheetCount: includedItems.length,
        source: 'drafting_drawing_sheet_issue_snapshots',
      },
      purpose: dto.purpose.trim(),
      status,
      title: dto.title.trim(),
      warningSummary: Array.from(new Set(warningSummary)),
    };

    if (payload.status !== 'draft') {
      payload.manifestSignature = buildProjectTransmittalManifestSignature({
        ...payload,
        manifestSignature: undefined,
      });
    }

    const result = DraftingProjectTransmittalPayloadSchema.safeParse(payload);
    if (!result.success) {
      throw new BadRequestException('Project transmittal payload is invalid');
    }

    return result.data;
  }

  private async persistModel(
    access: ProjectAccess,
    drawingId: string,
    model: DraftingModel,
  ): Promise<DraftingDrawing> {
    await this.assertTransmittalEvidenceReferences(access, model);

    const drawing = await this.prisma.draftingDrawing.update({
      where: { id: drawingId },
      data: {
        modelVersion: model.version,
        modelJson: model as Prisma.InputJsonValue,
        updatedById: access.userId,
      },
      include: {
        revisions: {
          orderBy: { revisionNumber: 'desc' },
        },
      },
    });

    return serializeDraftingDrawing(drawing);
  }

  private async assertTransmittalCanAcceptEvidence(
    projectId: string,
    drawingId: string,
    transmittalId: string,
  ) {
    const record = await this.findDrawingRecord(projectId, drawingId);
    const model = parseStoredDraftingModel(record.modelJson, drawingId);
    const transmittal = findTransmittal(model, transmittalId);
    assertCanAttachEvidence(transmittal);
  }

  private async findProjectPdfEvidenceDocument(access: ProjectAccess, documentId: string) {
    const document = await this.documentsService.findById(documentId, {
      organisationId: access.organisationId,
      userId: access.userId,
      orgRole: access.orgRole,
    });

    if (document.organisationId !== access.organisationId) {
      throw new ForbiddenException('Transmittal evidence document is outside this organisation');
    }
    if (document.projectId !== access.projectId) {
      throw new BadRequestException(
        'Transmittal evidence must be a PDF document scoped to the same project',
      );
    }
    if (document.mimeType !== 'application/pdf') {
      throw new BadRequestException('Transmittal evidence must be an application/pdf document');
    }

    return document;
  }

  private async assertTransmittalEvidenceReferences(access: ProjectAccess, model: DraftingModel) {
    for (const transmittal of model.drawingTransmittals ?? []) {
      const hasCurrentEvidence = Boolean(
        transmittal.artifactDocumentId ||
        transmittal.artifactFileName ||
        transmittal.artifactMimeType ||
        transmittal.artifactSizeBytes ||
        transmittal.artifactAttachedAt ||
        transmittal.artifactUploadedAt,
      );
      if (transmittal.status === 'draft' && hasCurrentEvidence) {
        throw new BadRequestException('Draft transmittals cannot have PDF evidence attached');
      }
      if (transmittal.artifactMimeType && transmittal.artifactMimeType !== 'application/pdf') {
        throw new BadRequestException('Transmittal evidence must be application/pdf');
      }
      if (
        transmittal.artifactFileName &&
        !transmittal.artifactFileName.toLowerCase().endsWith('.pdf')
      ) {
        throw new BadRequestException('Transmittal evidence file name must end with .pdf');
      }
      if (transmittal.artifactDocumentId) {
        await this.findProjectPdfEvidenceDocument(access, transmittal.artifactDocumentId);
      }
      for (const event of transmittal.evidenceEvents ?? []) {
        if (event.artifactDocumentId) {
          await this.findProjectPdfEvidenceDocument(access, event.artifactDocumentId);
        }
      }
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
}

type RegistryUsage = {
  count: number;
  firstObjectId?: string;
};

type RegistryMultiPileState = {
  pileTypes: MultiPilePileTypeDefinition[];
  joints: MultiPileJoint[];
};

function parseRegistryDraftingModel(rawModel: unknown): DraftingModel | null {
  const parsed = DraftingModelSchema.safeParse(rawModel);
  return parsed.success ? parsed.data : null;
}

function buildDraftingSourceUsage(model: DraftingModel | null) {
  const usage = new Map<string, RegistryUsage>();
  for (const object of model?.objects ?? []) {
    const sourceId = object.sourceRef?.sourceId;
    if (!sourceId) {
      continue;
    }
    const current = usage.get(sourceId) ?? { count: 0 };
    usage.set(sourceId, {
      count: current.count + 1,
      firstObjectId: current.firstObjectId ?? object.id,
    });
  }
  return usage;
}

function getMultiPileStateFromMetadata(metadata: unknown): RegistryMultiPileState {
  const multiPile = objectValue(metadata).multiPile;
  const state = objectValue(multiPile);
  return {
    pileTypes: arrayValue(state.pileTypes) as MultiPilePileTypeDefinition[],
    joints: arrayValue(state.joints) as MultiPileJoint[],
  };
}

function getRegistryPileTypeCompleteness(pileType: MultiPilePileTypeDefinition) {
  const missing: string[] = [];
  const hasDiameter = Boolean(pileTypeDiameterMm(pileType));
  const hasConcrete = Boolean(stringOrUndefined(pileType.concreteGrade));
  const hasFounding =
    numberOrUndefined(pileType.socketLengthM) !== undefined ||
    numberOrUndefined(pileType.socketLengthMm) !== undefined ||
    Boolean(stringOrUndefined(pileType.foundingStratum)) ||
    Boolean(stringOrUndefined(pileType.foundingNote));

  if (!hasDiameter) {
    missing.push('diameter');
  }
  if (!hasConcrete) {
    missing.push('concrete');
  }
  if (!hasFounding) {
    missing.push('socket/founding');
  }

  return {
    status:
      missing.length === 0
        ? ('complete' as const)
        : !hasDiameter
          ? ('missing_key_fields' as const)
          : !hasConcrete && !hasFounding
            ? ('diameter_only' as const)
            : ('partial' as const),
    missing,
  };
}

function buildSpatialRegistrySource(
  feature: {
    id: string;
    projectId: string;
    label: string;
    featureType: string;
    geometryType: string;
    geometryJson: unknown;
    propertiesJson: unknown;
    status: string | null;
    sourceType: string | null;
    sourceReference: string | null;
    linkedProjectReferenceId: string | null;
    linkedAiDocumentId: string | null;
    linkedDeliverableType: string | null;
    linkedDeliverableId: string | null;
    description: string | null;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
  },
  usageCounts: Map<string, RegistryUsage>,
): SpatialFeatureSource {
  const sourceId = feature.id;
  const coordinates = pointFromSpatialGeometry(feature.geometryJson);
  const usage = usageCounts.get(sourceId);
  return {
    sourceType: 'spatial_feature',
    sourceId,
    sourceLabel: feature.label,
    sourceCode: feature.label,
    originModule: 'spatial',
    status: feature.status ? 'current' : 'stale_possible',
    completeness: coordinates ? 'partial' : 'unknown',
    ...(coordinates ? { coordinates } : {}),
    sourcePath: 'project_spatial_features',
    sourceVersion: feature.updatedAt.toISOString(),
    usedByDraftingObjectCount: usage?.count ?? 0,
    alreadyRepresentedInDrafting: Boolean(usage?.count),
    existingDraftingObjectId: usage?.firstObjectId,
    category: 'generic',
    engineering: {
      featureType: feature.featureType,
      geometryType: feature.geometryType,
      sourceType: feature.sourceType ?? undefined,
      sourceReference: feature.sourceReference ?? undefined,
    },
    snapshot: {
      feature: {
        id: feature.id,
        projectId: feature.projectId,
        label: feature.label,
        featureType: feature.featureType,
        geometryType: feature.geometryType,
        geometryJson: feature.geometryJson,
        propertiesJson: feature.propertiesJson,
        status: feature.status,
        sourceType: feature.sourceType,
        sourceReference: feature.sourceReference,
        linkedProjectReferenceId: feature.linkedProjectReferenceId,
        linkedAiDocumentId: feature.linkedAiDocumentId,
        linkedDeliverableType: feature.linkedDeliverableType,
        linkedDeliverableId: feature.linkedDeliverableId,
        description: feature.description,
        sortOrder: feature.sortOrder,
        createdAt: feature.createdAt.toISOString(),
        updatedAt: feature.updatedAt.toISOString(),
      },
      sourcePath: 'project_spatial_features',
      originModule: 'spatial',
    },
    warnings: coordinates ? [] : ['No numeric point coordinate available for this feature.'],
  };
}

function isMonitoringSpatialFeature(featureType: string) {
  return (
    featureType === 'monitoring_well' ||
    featureType === 'vibration_monitor' ||
    featureType === 'noise_monitor'
  );
}

function pointFromSpatialGeometry(geometry: unknown) {
  const value = objectValue(geometry);
  if (value.type !== 'Point') {
    return undefined;
  }
  const coordinates = Array.isArray(value.coordinates) ? value.coordinates : [];
  const x = numberOrUndefined(coordinates[0]);
  const y = numberOrUndefined(coordinates[1]);
  const z = numberOrUndefined(coordinates[2]);
  if (x === undefined || y === undefined) {
    return undefined;
  }
  return z === undefined ? { x, y } : { x, y, z };
}

function pileTypeDiameterMm(pileType: MultiPilePileTypeDefinition | undefined) {
  return (
    numberOrUndefined(pileType?.nominalDiameterMm) ??
    numberOrUndefined(pileType?.Dmm) ??
    numberOrUndefined(pileType?.customMm)
  );
}

function metresToMm(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(value * 1000) : undefined;
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringOrUndefined(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function numberOrUndefined(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function dedupeBySourceId<T extends { sourceId: string }>(sources: T[]) {
  const seen = new Set<string>();
  return sources.filter((source) => {
    if (seen.has(source.sourceId)) {
      return false;
    }
    seen.add(source.sourceId);
    return true;
  });
}

function parseIncomingDraftingModel(
  rawModel: Record<string, unknown>,
  drawingId: string,
): DraftingModel {
  const result = DraftingModelSchema.safeParse({
    ...rawModel,
    drawingId,
  });

  if (!result.success) {
    throw new BadRequestException('Drafting model payload is invalid');
  }

  return result.data;
}

function parseStoredDraftingModel(rawModel: Prisma.JsonValue, drawingId: string): DraftingModel {
  const result = DraftingModelSchema.safeParse(rawModel);

  if (!result.success) {
    throw new InternalServerErrorException(
      `Stored drafting model is invalid for drawing ${drawingId}`,
    );
  }

  return result.data;
}

function serializeDraftingDrawing(record: DraftingDrawingRecord): DraftingDrawing {
  return {
    ...serializeDraftingDrawingSummary(record),
    model: parseStoredDraftingModel(record.modelJson, record.id),
    revisions: record.revisions.map(serializeDraftingRevision),
  };
}

function serializeDraftingDrawingSummary(record: DraftingDrawingRecord): DraftingDrawingSummary {
  const kind = record.kind ?? 'sketch';

  return {
    id: record.id,
    projectId: record.projectId,
    title: record.title,
    kind,
    isProjectModel: kind === 'model' && record.status !== 'archived',
    isSketch: kind === 'sketch',
    status: record.status,
    currentRevision: record.currentRevision,
    modelVersion: record.modelVersion,
    objectCount: countDraftingObjects(record.modelJson),
    createdById: record.createdById ?? null,
    updatedById: record.updatedById ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function serializeDraftingRevision(
  record: DraftingDrawingRecord['revisions'][number],
): DraftingRevision {
  return {
    id: record.id,
    drawingId: record.drawingId,
    projectId: record.projectId,
    revisionNumber: record.revisionNumber,
    title: record.title,
    notes: record.notes ?? null,
    modelJsonSnapshot: parseStoredDraftingModel(record.modelJsonSnapshot, record.drawingId),
    createdById: record.createdById ?? null,
    createdAt: record.createdAt.toISOString(),
  };
}

function serializeProjectDraftingTransmittal(
  record: ProjectDraftingTransmittalRecord,
): DraftingProjectTransmittal {
  const payloadResult = DraftingProjectTransmittalPayloadSchema.safeParse(record.payloadJson);
  if (!payloadResult.success) {
    throw new InternalServerErrorException(
      `Stored project drafting transmittal is invalid for transmittal ${record.id}`,
    );
  }

  return {
    id: record.id,
    projectId: record.projectId,
    organisationId: record.organisationId,
    transmittalNumber: record.transmittalNumber,
    status: record.status as DraftingProjectTransmittalStatus,
    payload: payloadResult.data,
    createdById: record.createdById ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function countDraftingObjects(rawModel: Prisma.JsonValue) {
  if (!rawModel || typeof rawModel !== 'object' || Array.isArray(rawModel)) {
    return 0;
  }

  const objects = (rawModel as Record<string, unknown>).objects;
  return Array.isArray(objects) ? objects.length : 0;
}

type EvidenceDocument = {
  id: string;
  organisationId: string;
  projectId: string | null;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;
  uploadedBy: string;
};

function assertPdfUpload(file: Express.Multer.File) {
  if (file.mimetype !== 'application/pdf') {
    throw new BadRequestException('Drafting transmittal evidence uploads must use application/pdf');
  }
  if (!file.originalname.toLowerCase().endsWith('.pdf')) {
    throw new BadRequestException('Drafting transmittal evidence uploads must use a .pdf file');
  }
  if (!file.buffer?.subarray(0, 5).equals(Buffer.from('%PDF-'))) {
    throw new BadRequestException('Drafting transmittal evidence upload is not a PDF file');
  }
}

function findTransmittal(model: DraftingModel, transmittalId: string) {
  const transmittal = model.drawingTransmittals.find((candidate) => candidate.id === transmittalId);
  if (!transmittal) {
    throw new NotFoundException('Drafting transmittal not found');
  }
  return transmittal;
}

function assertCanAttachEvidence(transmittal: DraftingDrawingTransmittal) {
  if (transmittal.status === 'draft') {
    throw new BadRequestException('Draft transmittals cannot have PDF evidence attached');
  }
  if (transmittal.status === 'archived') {
    throw new BadRequestException('Archived transmittals cannot have PDF evidence attached');
  }
}

function attachEvidenceToModel(args: {
  attachedAt: string;
  attachedBy: string;
  artifactSource: DraftingTransmittalEvidenceSource;
  document: EvidenceDocument;
  model: DraftingModel;
  notes?: string;
  transmittalId: string;
}): DraftingModel {
  const transmittal = findTransmittal(args.model, args.transmittalId);
  assertCanAttachEvidence(transmittal);

  const nextVersion = (transmittal.artifactVersion ?? 0) + 1;
  const action = transmittal.artifactDocumentId ? 'replaced' : 'attached';
  const event = {
    id: `evidence-${transmittal.id}-${compactTimestamp(args.attachedAt)}-${nextVersion}`,
    action,
    at: args.attachedAt,
    by: args.attachedBy,
    artifactDocumentId: args.document.id,
    artifactFileName: args.document.fileName,
    artifactNotes: args.notes?.trim() || undefined,
    artifactSource: args.artifactSource,
  } satisfies NonNullable<DraftingDrawingTransmittal['evidenceEvents']>[number];

  const nextTransmittal: DraftingDrawingTransmittal = {
    ...transmittal,
    artifactAttachedAt: args.attachedAt,
    artifactAttachedBy: args.attachedBy,
    artifactAddedAt: args.attachedAt,
    artifactAddedBy: args.attachedBy,
    artifactDocumentId: args.document.id,
    artifactFileName: args.document.fileName,
    artifactMimeType: args.document.mimeType,
    artifactNotes: args.notes?.trim() || undefined,
    artifactSizeBytes: args.document.sizeBytes,
    artifactSource: args.artifactSource,
    artifactStatus: action,
    artifactUploadedAt: args.document.createdAt.toISOString(),
    artifactUploadedBy: args.document.uploadedBy,
    artifactVersion: nextVersion,
    evidenceEvents: [...(transmittal.evidenceEvents ?? []), event],
    updatedAt: args.attachedAt,
  };

  return replaceTransmittal(args.model, {
    ...nextTransmittal,
    evidenceSignature: buildEvidenceSignature(nextTransmittal),
  });
}

function removeEvidenceFromModel(args: {
  model: DraftingModel;
  notes?: string;
  removedAt: string;
  removedBy: string;
  transmittalId: string;
}): DraftingModel {
  const transmittal = findTransmittal(args.model, args.transmittalId);
  assertCanAttachEvidence(transmittal);
  if (!transmittal.artifactDocumentId && !transmittal.artifactFileName) {
    return args.model;
  }

  const nextVersion = (transmittal.artifactVersion ?? 0) + 1;
  const event = {
    id: `evidence-${transmittal.id}-${compactTimestamp(args.removedAt)}-${nextVersion}`,
    action: 'removed',
    at: args.removedAt,
    by: args.removedBy,
    artifactDocumentId: transmittal.artifactDocumentId,
    artifactFileName: transmittal.artifactFileName,
    artifactNotes: args.notes?.trim() || transmittal.artifactNotes,
    artifactSource: transmittal.artifactSource ?? 'browser_print_pdf',
  } satisfies NonNullable<DraftingDrawingTransmittal['evidenceEvents']>[number];

  const nextTransmittal: DraftingDrawingTransmittal = {
    ...transmittal,
    artifactAttachedAt: undefined,
    artifactAttachedBy: undefined,
    artifactAddedAt: undefined,
    artifactAddedBy: undefined,
    artifactDocumentId: undefined,
    artifactFileName: undefined,
    artifactMimeType: undefined,
    artifactNotes: args.notes?.trim() || transmittal.artifactNotes,
    artifactSizeBytes: undefined,
    artifactSource: transmittal.artifactSource ?? 'browser_print_pdf',
    artifactStatus: 'removed',
    artifactUploadedAt: undefined,
    artifactUploadedBy: undefined,
    artifactVersion: nextVersion,
    evidenceEvents: [...(transmittal.evidenceEvents ?? []), event],
    updatedAt: args.removedAt,
  };

  return replaceTransmittal(args.model, {
    ...nextTransmittal,
    evidenceSignature: buildEvidenceSignature(nextTransmittal),
  });
}

function replaceTransmittal(
  model: DraftingModel,
  transmittal: DraftingDrawingTransmittal,
): DraftingModel {
  return {
    ...model,
    drawingTransmittals: model.drawingTransmittals.map((candidate) =>
      candidate.id === transmittal.id ? transmittal : candidate,
    ),
  };
}

function buildEvidenceSignature(transmittal: DraftingDrawingTransmittal) {
  return `ev-${fnv1a32(
    stableStringify(
      sanitizeMetadata({
        artifactAttachedAt: transmittal.artifactAttachedAt,
        artifactDocumentId: transmittal.artifactDocumentId,
        artifactFileName: transmittal.artifactFileName,
        artifactMimeType: transmittal.artifactMimeType,
        artifactSizeBytes: transmittal.artifactSizeBytes,
        artifactStatus: transmittal.artifactStatus,
        artifactVersion: transmittal.artifactVersion,
        evidenceEvents: transmittal.evidenceEvents ?? [],
      }),
    ),
  )
    .toString(16)
    .padStart(8, '0')}`;
}

function fnv1a32(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  return `{${Object.entries(value as Record<string, unknown>)
    .filter(([, entryValue]) => entryValue !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`)
    .join(',')}}`;
}

function sanitizeMetadata(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeMetadata);
  }
  if (!value || typeof value !== 'object') {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key, entryValue]) => {
        if (entryValue === undefined) {
          return false;
        }
        return !/(token|password|secret|binary|image|thumbnail|session)/i.test(key);
      })
      .map(([key, entryValue]) => [key, sanitizeMetadata(entryValue)]),
  );
}

function buildProjectTransmittalManifestSignature(payload: DraftingProjectTransmittalPayload) {
  return `sig-${fnv1a32(stableStringify(sanitizeMetadata(payload)))
    .toString(16)
    .padStart(8, '0')}`;
}

function normalizePartyList(values: string[] | undefined) {
  return Array.from(
    new Set(
      (values ?? [])
        .flatMap((value) => value.split(/[,\n]/g))
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
}

function uniqueProjectTransmittalRefs(
  refs: DraftingProjectTransmittalInput['includedItems'],
): DraftingProjectTransmittalInput['includedItems'] {
  const seen = new Set<string>();
  return refs.filter((ref) => {
    const key = `${ref.drawingId}:${ref.drawingSheetIssueId}:${ref.sheetId}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function compactTimestamp(value: string) {
  return value.replace(/[^0-9A-Z]/gi, '');
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
