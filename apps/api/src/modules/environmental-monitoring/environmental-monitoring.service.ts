import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PROJECT_SPATIAL_FEATURE_TYPES } from '@eng/shared';
import { MonitoringImportJobType, Prisma, type SheetTemplateSourceKind } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { getProjectSpecificsFromProjectMetadata } from '../projects/project-specifics.adapter';
import { NOISE_VIBRATION_RECEIVER_TYPES } from '../standards/noise-vibration/dto/noise-vibration-criteria-query.dto';
import {
  buildOmnidotsImportedVibrationResultDrafts,
  buildOmnidotsLatestDatasetSummary,
  type OmnidotsLatestDatasetSummary,
} from './environmental-monitoring-omnidots.helpers';
import { OmnidotsService } from '../omnidots/omnidots.service';
import type {
  CreateOmnidotsProviderConnectionDto,
  UpdateOmnidotsProviderConnectionDto,
} from '../omnidots/dto/omnidots-connection.dto';
import {
  type CreateProjectEnvironmentalMonitoringAnnexureDto,
  type CreateProjectEnvironmentalMonitoringLocationDto,
  type CreateProjectEnvironmentalMonitoringObservationDto,
  type CreateProjectEnvironmentalMonitoringReportPackageIssueDto,
  type CreateProjectEnvironmentalMonitoringRecommendationDto,
  type CreateProjectEnvironmentalMonitoringReferenceDto,
  type CreateProjectEnvironmentalMonitoringReportDto,
  type CreateProjectEnvironmentalMonitoringSelectedCriterionDto,
  type CreateProjectEnvironmentalNoiseResultRowDto,
  type CreateProjectEnvironmentalVibrationResultRowDto,
  type ImportProjectEnvironmentalMonitoringLocationsFromViewDto,
  type ReorderProjectEnvironmentalMonitoringAnnexuresDto,
  type UpdateProjectEnvironmentalMonitoringAnnexureDto,
  type UpdateProjectEnvironmentalMonitoringLocationDto,
  type UpdateProjectEnvironmentalMonitoringObservationDto,
  type UpdateProjectEnvironmentalMonitoringRecommendationDto,
  type UpdateProjectEnvironmentalMonitoringReferenceDto,
  type UpdateProjectEnvironmentalMonitoringReportDto,
  type UpdateProjectEnvironmentalMonitoringSelectedCriterionDto,
  type UpdateProjectEnvironmentalNoiseResultRowDto,
  type UpdateProjectEnvironmentalVibrationResultRowDto,
} from './dto/environmental-monitoring.dto';
import {
  type CreateProjectEnvironmentalMonitoringVibrationResultsFromOmnidotsDatasetDto,
  type ProjectEnvironmentalMonitoringOmnidotsBuildDatasetDto,
  type ProjectEnvironmentalMonitoringOmnidotsImportDto,
} from './dto/environmental-monitoring-omnidots.dto';

type ProjectAccess = {
  projectId: string;
  organisationId: string;
  userId: string;
  orgRole?: string;
};

type CriterionRowWithContext = Prisma.NoiseVibrationCriterionRowGetPayload<{
  include: typeof criterionRowInclude;
}>;

type EnvironmentalMonitoringReportWithContext =
  Prisma.ProjectEnvironmentalMonitoringReportGetPayload<{
    include: typeof environmentalMonitoringReportInclude;
  }>;

type EnvironmentalMonitoringReportSummary = Prisma.ProjectEnvironmentalMonitoringReportGetPayload<{
  select: typeof environmentalMonitoringReportSummarySelect;
}>;
type EnvironmentalMonitoringReportPackageIssueRecord =
  Prisma.ProjectEnvironmentalMonitoringReportPackageIssueGetPayload<Record<string, never>>;
type ProjectSpatialFeatureRecord = Prisma.ProjectSpatialFeatureGetPayload<Record<string, never>>;
type ProjectSpatialViewRecord = Prisma.ProjectSpatialViewGetPayload<Record<string, never>>;

type MonitoringReportType = 'noise_monitoring' | 'vibration_monitoring';
type MonitoringAnnexureType = CreateProjectEnvironmentalMonitoringAnnexureDto['annexureType'];
type MonitoringSpatialAnnexureBasemap = 'osm' | 'nsw_aerial_imagery' | 'nsw_topographic';
const MONITORING_LOCATION_IMPORT_FEATURE_TYPES = [
  'noise_monitor',
  'vibration_monitor',
  'receiver',
  'reference_point',
] as const satisfies Array<(typeof PROJECT_SPATIAL_FEATURE_TYPES)[number]>;
type MonitoringRootSheetTemplateSnapshot = {
  id: string;
  label: string;
  templateDocument: Record<string, unknown>;
  versionId: string;
};
type MonitoringPackageProjectIdentitySnapshot = {
  address: string;
  client: string;
  projectName: string;
  projectNumber: string;
};
type MonitoringPackageAnnexureRegisterEntry = {
  annexureCode: string;
  id: string;
  sourceKind: SheetTemplateSourceKind;
  sourceLabel: string | null;
  templateLabel: string | null;
  title: string;
};
type MonitoringReportPackageSnapshot = {
  annexureRegister: MonitoringPackageAnnexureRegisterEntry[];
  checkedBy: string | null;
  approvedBy: string | null;
  documentStatus: string | null;
  issueDate: string | null;
  issueLabel: string;
  preparedBy: string | null;
  projectIdentity: MonitoringPackageProjectIdentitySnapshot;
  reportTitle: string;
  reportTypeLabel: string;
  revision: string | null;
};
type MonitoringSpatialAnnexureBinding = {
  activeBasemap: MonitoringSpatialAnnexureBasemap;
  rootSheetTemplateSnapshot?: MonitoringRootSheetTemplateSnapshot | null;
  showGeologyOverlay: boolean;
  visibleFeatureTypes: Array<(typeof PROJECT_SPATIAL_FEATURE_TYPES)[number]>;
  viewState: {
    centerLonLat: [number, number];
    rotation: number;
    zoom?: number;
  };
};
type MonitoringAnnexureOrderClient = Pick<PrismaService, 'projectEnvironmentalMonitoringAnnexure'>;

@Injectable()
export class ProjectEnvironmentalMonitoringService {
  private readonly logger = new Logger(ProjectEnvironmentalMonitoringService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly omnidotsService: OmnidotsService,
  ) {}

  async listForProject(access: ProjectAccess) {
    await this.assertProjectReadAccess(access);
    let reports: EnvironmentalMonitoringReportSummary[];
    try {
      reports = await this.prisma.projectEnvironmentalMonitoringReport.findMany({
        where: { projectId: access.projectId },
        select: environmentalMonitoringReportSummarySelect,
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      });
    } catch (error) {
      this.handleMonitoringPersistenceError(error, 'list reports', access.projectId);
    }

    return reports.map(serializeMonitoringReportSummary);
  }

  async createReport(access: ProjectAccess, dto: CreateProjectEnvironmentalMonitoringReportDto) {
    const project = await this.assertProjectWriteAccess(access);
    const seeded = resolveMonitoringReportSeed(project);

    let report: EnvironmentalMonitoringReportWithContext;
    try {
      report = await this.prisma.projectEnvironmentalMonitoringReport.create({
        data: {
          projectId: access.projectId,
          reportType: dto.reportType,
          title: dto.title?.trim() || defaultReportTitle(dto.reportType),
          revision: seeded.revision,
          issueDate: seeded.issueDate,
          documentStatus: 'draft',
          preparedBy: seeded.preparedBy,
          checkedBy: seeded.checkedBy,
          purpose: seeded.purpose,
        },
        include: environmentalMonitoringReportInclude,
      });
    } catch (error) {
      this.handleMonitoringPersistenceError(error, 'create report', access.projectId);
    }

    return serializeMonitoringReport(report);
  }

  async duplicateReport(access: ProjectAccess, reportId: string) {
    await this.assertProjectWriteAccess(access);
    const sourceReport = await this.findExistingMonitoringReportRecord(access.projectId, reportId);
    if (!sourceReport) {
      throw new NotFoundException('Environmental monitoring report not found');
    }

    let duplicatedReportId: string;
    try {
      duplicatedReportId = await this.prisma.$transaction(async (tx) => {
        const sourceTitle =
          normalizeOptionalString(sourceReport.title) ??
          defaultReportTitle(sourceReport.reportType);
        const duplicatedReport = await tx.projectEnvironmentalMonitoringReport.create({
          data: {
            assumptionsLimitations: sourceReport.assumptionsLimitations,
            checkedBy: sourceReport.checkedBy,
            conclusion: sourceReport.conclusion,
            documentStatus: 'draft',
            executiveSummary: sourceReport.executiveSummary,
            generalObservations: sourceReport.generalObservations,
            issueDate: sourceReport.issueDate,
            monitoringDate: sourceReport.monitoringDate,
            monitoringWindowEnd: sourceReport.monitoringWindowEnd,
            monitoringWindowStart: sourceReport.monitoringWindowStart,
            preparedBy: sourceReport.preparedBy,
            projectId: access.projectId,
            purpose: sourceReport.purpose,
            recommendationsSummary: sourceReport.recommendationsSummary,
            reportType: sourceReport.reportType,
            revision: sourceReport.revision,
            siteActivitySummary: sourceReport.siteActivitySummary,
            title: buildDuplicatedMonitoringReportTitle(sourceTitle),
            weatherConditions: sourceReport.weatherConditions,
          },
          select: { id: true },
        });

        for (const annexure of sourceReport.annexures) {
          await tx.projectEnvironmentalMonitoringAnnexure.create({
            data: {
              annexureType: annexure.annexureType,
              bindingJson: cloneNullableJsonInput(annexure.bindingJson),
              monitoringReportId: duplicatedReport.id,
              rootSheetTemplateId: annexure.rootSheetTemplateId,
              rootSheetTemplateVersionId: annexure.rootSheetTemplateVersionId,
              sortOrder: annexure.sortOrder,
              sourceLabel: annexure.sourceLabel,
              templateReferenceId: annexure.templateReferenceId,
              templateSnapshotJson: cloneNullableJsonInput(annexure.templateSnapshotJson),
              templateSourceKind: annexure.templateSourceKind,
              title: annexure.title,
            },
          });
        }

        for (const reference of sourceReport.references) {
          await tx.projectEnvironmentalMonitoringReference.create({
            data: {
              aiDocumentId: reference.aiDocumentId,
              label: reference.label,
              monitoringReportId: duplicatedReport.id,
              note: reference.note,
              projectReferenceId: reference.projectReferenceId,
              sortOrder: reference.sortOrder,
            },
          });
        }

        const locationIdMap = new Map<string, string>();
        for (const location of sourceReport.locations) {
          const duplicatedLocation = await tx.projectEnvironmentalMonitoringLocation.create({
            data: {
              assessmentLocationBasis: location.assessmentLocationBasis,
              chainageNote: location.chainageNote,
              coordinatesNote: location.coordinatesNote,
              distanceNote: location.distanceNote,
              label: location.label,
              locationDescription: location.locationDescription,
              monitoringReportId: duplicatedReport.id,
              receiverType: location.receiverType,
              sortOrder: location.sortOrder,
              sourceSpatialFeatureId: location.sourceSpatialFeatureId,
              sourceSpatialFeatureLabel: location.sourceSpatialFeatureLabel,
              sourceSpatialFeatureType: location.sourceSpatialFeatureType,
              sourceSpatialViewId: location.sourceSpatialViewId,
              sourceSpatialViewLabel: location.sourceSpatialViewLabel,
            },
            select: { id: true },
          });
          locationIdMap.set(location.id, duplicatedLocation.id);
        }

        const selectedCriterionIdMap = new Map<string, string>();
        for (const selectedCriterion of sourceReport.selectedCriteria) {
          const duplicatedCriterion =
            await tx.projectEnvironmentalMonitoringSelectedCriterion.create({
              data: {
                applicabilityStatus: selectedCriterion.applicabilityStatus,
                criterionRowId: selectedCriterion.criterionRowId,
                isEnforceableOnThisProject: selectedCriterion.isEnforceableOnThisProject,
                monitoringReportId: duplicatedReport.id,
                projectConditionReference: selectedCriterion.projectConditionReference,
                selectionNote: selectedCriterion.selectionNote,
                selectionPurpose: selectedCriterion.selectionPurpose,
                sortOrder: selectedCriterion.sortOrder,
              },
              select: { id: true },
            });
          selectedCriterionIdMap.set(selectedCriterion.id, duplicatedCriterion.id);
        }

        const noiseResultIdMap = new Map<string, string>();
        for (const noiseResult of sourceReport.noiseResults) {
          const duplicatedNoiseResult = await tx.projectEnvironmentalNoiseResultRow.create({
            data: {
              activityLabel: noiseResult.activityLabel,
              backgroundNote: noiseResult.backgroundNote,
              complianceStatus: noiseResult.complianceStatus,
              criterionRowId: noiseResult.criterionRowId,
              descriptorMetric: noiseResult.descriptorMetric,
              instrumentNote: noiseResult.instrumentNote,
              laeq15min: noiseResult.laeq15min,
              laf1_1min: noiseResult.laf1_1min,
              lamax: noiseResult.lamax,
              locationId:
                noiseResult.locationId === null
                  ? null
                  : (locationIdMap.get(noiseResult.locationId) ?? null),
              measuredUnit: noiseResult.measuredUnit,
              measuredValue: noiseResult.measuredValue,
              measurementPeriodNote: noiseResult.measurementPeriodNote,
              monitoringReportId: duplicatedReport.id,
              observedAt: noiseResult.observedAt,
              resultNote: noiseResult.resultNote,
              selectedCriterionId:
                noiseResult.selectedCriterionId === null
                  ? null
                  : (selectedCriterionIdMap.get(noiseResult.selectedCriterionId) ?? null),
              sortOrder: noiseResult.sortOrder,
            },
            select: { id: true },
          });
          noiseResultIdMap.set(noiseResult.id, duplicatedNoiseResult.id);
        }

        for (const vibrationResult of sourceReport.vibrationResults) {
          await tx.projectEnvironmentalVibrationResultRow.create({
            data: {
              activityLabel: vibrationResult.activityLabel,
              axisNote: vibrationResult.axisNote,
              complianceStatus: vibrationResult.complianceStatus,
              criterionRowId: vibrationResult.criterionRowId,
              dominantFrequencyHz: vibrationResult.dominantFrequencyHz,
              instrumentNote: vibrationResult.instrumentNote,
              linPeakValue: vibrationResult.linPeakValue,
              locationId:
                vibrationResult.locationId === null
                  ? null
                  : (locationIdMap.get(vibrationResult.locationId) ?? null),
              metricType: vibrationResult.metricType,
              monitoringReportId: duplicatedReport.id,
              observedAt: vibrationResult.observedAt,
              ppvValue: vibrationResult.ppvValue,
              resultNote: vibrationResult.resultNote,
              sortOrder: vibrationResult.sortOrder,
              vdvValue: vibrationResult.vdvValue,
            },
          });
        }

        const observationIdMap = new Map<string, string>();
        for (const observation of sourceReport.observations) {
          const duplicatedObservation = await tx.projectEnvironmentalMonitoringObservation.create({
            data: {
              category: observation.category,
              followUpRequired: observation.followUpRequired,
              implicationNote: observation.implicationNote,
              implicationSeverity: observation.implicationSeverity,
              locationId:
                observation.locationId === null
                  ? null
                  : (locationIdMap.get(observation.locationId) ?? null),
              monitoringReportId: duplicatedReport.id,
              noiseResultId:
                observation.noiseResultId === null
                  ? null
                  : (noiseResultIdMap.get(observation.noiseResultId) ?? null),
              observation: observation.observation,
              sortOrder: observation.sortOrder,
            },
            select: { id: true },
          });
          observationIdMap.set(observation.id, duplicatedObservation.id);
        }

        for (const recommendation of sourceReport.recommendations) {
          await tx.projectEnvironmentalMonitoringRecommendation.create({
            data: {
              category: recommendation.category,
              dueDate: recommendation.dueDate,
              monitoringReportId: duplicatedReport.id,
              noiseResultId:
                recommendation.noiseResultId === null
                  ? null
                  : (noiseResultIdMap.get(recommendation.noiseResultId) ?? null),
              observationId:
                recommendation.observationId === null
                  ? null
                  : (observationIdMap.get(recommendation.observationId) ?? null),
              priority: recommendation.priority,
              recommendation: recommendation.recommendation,
              responsibility: recommendation.responsibility,
              sortOrder: recommendation.sortOrder,
              status: recommendation.status,
              timingNote: recommendation.timingNote,
            },
          });
        }

        return duplicatedReport.id;
      });
    } catch (error) {
      this.handleMonitoringPersistenceError(error, 'duplicate report', access.projectId);
    }

    return this.findExistingMonitoringReport(duplicatedReportId);
  }

  async findReport(access: ProjectAccess, reportId: string) {
    await this.assertProjectReadAccess(access);
    await this.assertMonitoringReportExists(access.projectId, reportId);
    return this.findExistingMonitoringReport(reportId);
  }

  async updateReport(
    access: ProjectAccess,
    reportId: string,
    dto: UpdateProjectEnvironmentalMonitoringReportDto,
  ) {
    await this.assertProjectWriteAccess(access);
    await this.assertMonitoringReportExists(access.projectId, reportId);

    await this.prisma.projectEnvironmentalMonitoringReport.update({
      where: { id: reportId },
      data: buildMonitoringReportUpdateData(dto),
    });

    return this.findExistingMonitoringReport(reportId);
  }

  async deleteReport(access: ProjectAccess, reportId: string) {
    await this.assertProjectWriteAccess(access);
    await this.assertMonitoringReportExists(access.projectId, reportId);
    await this.prisma.projectEnvironmentalMonitoringReport.delete({ where: { id: reportId } });
    return { id: reportId, deleted: true };
  }

  async createPackageIssue(
    access: ProjectAccess,
    reportId: string,
    dto: CreateProjectEnvironmentalMonitoringReportPackageIssueDto,
  ) {
    const project = await this.assertProjectWriteAccess(access);
    const reportRecord = await this.findExistingMonitoringReportRecord(access.projectId, reportId);
    if (!reportRecord) {
      throw new NotFoundException('Environmental monitoring report not found');
    }
    const reportSnapshot = freezeJsonRecord(serializeMonitoringReportSnapshot(reportRecord));
    const existingIssueCount =
      await this.prisma.projectEnvironmentalMonitoringReportPackageIssue.count({
        where: { monitoringReportId: reportId },
      });
    const issueLabel =
      normalizeOptionalString(dto.issueLabel) ??
      normalizeOptionalString(dto.revision) ??
      normalizeOptionalString(reportRecord.revision) ??
      `Issue ${existingIssueCount + 1}`;
    const revision =
      normalizeOptionalString(dto.revision) ?? normalizeOptionalString(reportRecord.revision);
    const documentStatus =
      normalizeOptionalString(dto.documentStatus) ??
      normalizeOptionalString(reportRecord.documentStatus);
    const issueDate = parseOptionalDate(dto.issueDate) ?? reportRecord.issueDate ?? new Date();
    const preparedBy =
      normalizeOptionalString(dto.preparedBy) ?? normalizeOptionalString(reportRecord.preparedBy);
    const checkedBy =
      normalizeOptionalString(dto.checkedBy) ?? normalizeOptionalString(reportRecord.checkedBy);
    const approvedBy = normalizeOptionalString(dto.approvedBy);
    const packageSnapshot = freezeJsonRecord(
      buildMonitoringReportPackageSnapshot({
        approvedBy,
        checkedBy,
        documentStatus,
        issueDate,
        issueLabel,
        preparedBy,
        project,
        report: reportSnapshot,
        revision,
      }),
    );

    let packageIssue: EnvironmentalMonitoringReportPackageIssueRecord;
    try {
      packageIssue = await this.prisma.projectEnvironmentalMonitoringReportPackageIssue.create({
        data: {
          monitoringReportId: reportId,
          issueLabel,
          revision,
          documentStatus,
          issueDate,
          preparedBy,
          checkedBy,
          approvedBy,
          createdBy: access.userId,
          reportSnapshotJson: reportSnapshot as Prisma.InputJsonValue,
          packageSnapshotJson: packageSnapshot as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      throwFriendlyUniqueError(
        error,
        'A Report Package Issue with this label already exists for the report.',
      );
    }

    return serializeMonitoringReportPackageIssue(packageIssue);
  }

  async findPackageIssue(access: ProjectAccess, reportId: string, issueId: string) {
    await this.assertProjectReadAccess(access);
    await this.assertMonitoringReportExists(access.projectId, reportId);

    const packageIssue =
      await this.prisma.projectEnvironmentalMonitoringReportPackageIssue.findFirst({
        where: {
          id: issueId,
          monitoringReportId: reportId,
        },
      });

    if (!packageIssue) {
      throw new NotFoundException('Report Package Issue not found');
    }

    return serializeMonitoringReportPackageIssue(packageIssue);
  }

  async createAnnexure(
    access: ProjectAccess,
    reportId: string,
    dto: CreateProjectEnvironmentalMonitoringAnnexureDto,
  ) {
    await this.assertProjectWriteAccess(access);
    await this.assertMonitoringReportExists(access.projectId, reportId);

    const nextSortOrder =
      (
        await this.prisma.projectEnvironmentalMonitoringAnnexure.aggregate({
          where: { monitoringReportId: reportId },
          _max: { sortOrder: true },
        })
      )._max.sortOrder ?? -1;

    try {
      await this.prisma.projectEnvironmentalMonitoringAnnexure.create({
        data: await this.buildMonitoringAnnexureCreateData(
          access,
          reportId,
          dto,
          nextSortOrder + 1,
        ),
      });
    } catch (error) {
      throwFriendlyUniqueError(
        error,
        'Annexure ordering changed while saving. Refresh and try again.',
      );
    }

    return this.findExistingMonitoringReport(reportId);
  }

  async reorderAnnexures(
    access: ProjectAccess,
    reportId: string,
    dto: ReorderProjectEnvironmentalMonitoringAnnexuresDto,
  ) {
    await this.assertProjectWriteAccess(access);
    await this.assertMonitoringReportExists(access.projectId, reportId);

    const existingAnnexures = await this.prisma.projectEnvironmentalMonitoringAnnexure.findMany({
      where: { monitoringReportId: reportId },
      select: { id: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    const existingIds = existingAnnexures.map((annexure) => annexure.id);
    const nextIds = dto.orderedIds;

    if (existingIds.length !== nextIds.length || existingIds.some((id) => !nextIds.includes(id))) {
      throw new ConflictException(
        'Annexure reorder payload does not match the current report annexures',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await this.persistAnnexureOrder(tx, nextIds);
    });

    return this.findExistingMonitoringReport(reportId);
  }

  async updateAnnexure(
    access: ProjectAccess,
    reportId: string,
    id: string,
    dto: UpdateProjectEnvironmentalMonitoringAnnexureDto,
  ) {
    await this.assertProjectWriteAccess(access);
    await this.assertMonitoringReportExists(access.projectId, reportId);
    const existingAnnexure = await this.assertAnnexureExists(reportId, id);

    await this.prisma.projectEnvironmentalMonitoringAnnexure.update({
      where: { id },
      data: await this.buildMonitoringAnnexureUpdateData(access, dto, existingAnnexure),
    });

    return this.findExistingMonitoringReport(reportId);
  }

  async deleteAnnexure(access: ProjectAccess, reportId: string, id: string) {
    await this.assertProjectWriteAccess(access);
    await this.assertMonitoringReportExists(access.projectId, reportId);
    await this.assertAnnexureExists(reportId, id);
    await this.prisma.$transaction(async (tx) => {
      await tx.projectEnvironmentalMonitoringAnnexure.delete({ where: { id } });
      await this.normalizeAnnexureSortOrder(tx, reportId);
    });
    return this.findExistingMonitoringReport(reportId);
  }

  private async buildMonitoringAnnexureCreateData(
    access: ProjectAccess,
    reportId: string,
    dto: CreateProjectEnvironmentalMonitoringAnnexureDto,
    sortOrder: number,
  ): Promise<Prisma.ProjectEnvironmentalMonitoringAnnexureUncheckedCreateInput> {
    const annexureType = dto.annexureType;
    const templateFields = await this.resolveMonitoringAnnexureTemplateFields(access, dto, null);

    return {
      annexureType,
      bindingJson: normalizeMonitoringAnnexureBindingJson(annexureType, dto.bindingJson),
      monitoringReportId: reportId,
      sortOrder,
      sourceLabel: normalizeOptionalString(dto.sourceLabel),
      title: resolveMonitoringAnnexureTitle(dto.title, annexureType),
      ...templateFields,
    };
  }

  private async buildMonitoringAnnexureUpdateData(
    access: ProjectAccess,
    dto: UpdateProjectEnvironmentalMonitoringAnnexureDto,
    currentAnnexure: {
      annexureType: MonitoringAnnexureType;
      rootSheetTemplateId: string | null;
      rootSheetTemplateVersionId: string | null;
      templateReferenceId: string | null;
      templateSnapshotJson: Prisma.JsonValue | null;
      templateSourceKind: SheetTemplateSourceKind;
    },
  ): Promise<Prisma.ProjectEnvironmentalMonitoringAnnexureUncheckedUpdateInput> {
    const annexureType = dto.annexureType ?? currentAnnexure.annexureType;
    const data = pickDefined(dto, [
      'annexureType',
    ]) as Prisma.ProjectEnvironmentalMonitoringAnnexureUncheckedUpdateInput;
    const templateFields = await this.resolveMonitoringAnnexureTemplateFields(
      access,
      dto,
      currentAnnexure,
    );

    if (dto.title !== undefined) {
      data.title = resolveMonitoringAnnexureTitle(dto.title, annexureType);
    }

    if (dto.sourceLabel !== undefined) {
      data.sourceLabel = normalizeOptionalString(dto.sourceLabel);
    }

    if (dto.bindingJson !== undefined) {
      data.bindingJson = normalizeMonitoringAnnexureBindingJson(annexureType, dto.bindingJson);
    }

    return {
      ...data,
      ...templateFields,
    };
  }

  private async resolveMonitoringAnnexureTemplateFields(
    access: ProjectAccess,
    dto:
      | CreateProjectEnvironmentalMonitoringAnnexureDto
      | UpdateProjectEnvironmentalMonitoringAnnexureDto,
    current: {
      rootSheetTemplateId: string | null;
      rootSheetTemplateVersionId: string | null;
      templateReferenceId: string | null;
      templateSnapshotJson: Prisma.JsonValue | null;
      templateSourceKind: SheetTemplateSourceKind;
    } | null,
  ): Promise<
    Pick<
      Prisma.ProjectEnvironmentalMonitoringAnnexureUncheckedCreateInput,
      | 'rootSheetTemplateId'
      | 'rootSheetTemplateVersionId'
      | 'templateReferenceId'
      | 'templateSnapshotJson'
      | 'templateSourceKind'
    >
  > {
    const templateSourceKind = (dto.templateSourceKind ??
      current?.templateSourceKind ??
      (dto.rootSheetTemplateId || dto.rootSheetTemplateVersionId
        ? 'root_sheet_template'
        : 'root_sheet_template')) as SheetTemplateSourceKind;
    const templateReferenceId =
      normalizeOptionalString(dto.templateReferenceId) ?? current?.templateReferenceId ?? null;
    let rootSheetTemplateId =
      dto.rootSheetTemplateId !== undefined
        ? dto.rootSheetTemplateId
        : (current?.rootSheetTemplateId ?? null);
    let rootSheetTemplateVersionId =
      dto.rootSheetTemplateVersionId !== undefined
        ? dto.rootSheetTemplateVersionId
        : (current?.rootSheetTemplateVersionId ?? null);
    let templateSnapshotJson =
      dto.templateSnapshotJson !== undefined
        ? normalizeMonitoringAnnexureTemplateSnapshotJson(dto.templateSnapshotJson)
        : normalizeMonitoringAnnexureTemplateSnapshotJson(current?.templateSnapshotJson);

    if (templateSourceKind === 'root_sheet_template') {
      const resolved = await this.resolveAccessibleRootSheetTemplateVersion(access, {
        rootSheetTemplateId,
        rootSheetTemplateVersionId,
      });

      rootSheetTemplateId = resolved.template.id;
      rootSheetTemplateVersionId = resolved.version.id;
      templateSnapshotJson =
        templateSnapshotJson ??
        normalizeMonitoringAnnexureTemplateSnapshotJson(
          resolved.version.definitionJson as Record<string, unknown>,
        );
      assertMonitoringSpatialTemplateCompatibility(templateSnapshotJson);
    } else {
      rootSheetTemplateId = null;
      rootSheetTemplateVersionId = null;
    }

    return {
      rootSheetTemplateId,
      rootSheetTemplateVersionId,
      templateReferenceId:
        templateReferenceId ??
        defaultMonitoringAnnexureTemplateReferenceId(dto.annexureType ?? 'spatial_sheet'),
      templateSnapshotJson:
        templateSnapshotJson === undefined
          ? undefined
          : templateSnapshotJson === null
            ? Prisma.JsonNull
            : (templateSnapshotJson as Prisma.InputJsonValue),
      templateSourceKind,
    };
  }

  private async resolveAccessibleRootSheetTemplateVersion(
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
      include: { currentVersion: true },
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

  async createReference(
    access: ProjectAccess,
    reportId: string,
    dto: CreateProjectEnvironmentalMonitoringReferenceDto,
  ) {
    await this.assertProjectWriteAccess(access);
    await this.assertMonitoringReportExists(access.projectId, reportId);
    await this.assertAiDocumentBelongsToProject(access, dto.aiDocumentId);

    await this.prisma.projectEnvironmentalMonitoringReference.create({
      data: {
        monitoringReportId: reportId,
        projectReferenceId: dto.projectReferenceId,
        aiDocumentId: dto.aiDocumentId,
        label: dto.label,
        note: dto.note,
        sortOrder:
          dto.sortOrder ??
          (await this.prisma.projectEnvironmentalMonitoringReference.count({
            where: { monitoringReportId: reportId },
          })),
      },
    });

    return this.findExistingMonitoringReport(reportId);
  }

  async updateReference(
    access: ProjectAccess,
    reportId: string,
    id: string,
    dto: UpdateProjectEnvironmentalMonitoringReferenceDto,
  ) {
    await this.assertProjectWriteAccess(access);
    await this.assertMonitoringReportExists(access.projectId, reportId);
    await this.assertReferenceExists(reportId, id);
    await this.assertAiDocumentBelongsToProject(access, dto.aiDocumentId);

    await this.prisma.projectEnvironmentalMonitoringReference.update({
      where: { id },
      data: pickDefined(dto, [
        'projectReferenceId',
        'aiDocumentId',
        'label',
        'note',
        'sortOrder',
      ]) as Prisma.ProjectEnvironmentalMonitoringReferenceUncheckedUpdateInput,
    });

    return this.findExistingMonitoringReport(reportId);
  }

  async deleteReference(access: ProjectAccess, reportId: string, id: string) {
    await this.assertProjectWriteAccess(access);
    await this.assertMonitoringReportExists(access.projectId, reportId);
    await this.assertReferenceExists(reportId, id);
    await this.prisma.projectEnvironmentalMonitoringReference.delete({ where: { id } });
    return this.findExistingMonitoringReport(reportId);
  }

  async createLocation(
    access: ProjectAccess,
    reportId: string,
    dto: CreateProjectEnvironmentalMonitoringLocationDto,
  ) {
    await this.assertProjectWriteAccess(access);
    await this.assertMonitoringReportExists(access.projectId, reportId);

    await this.prisma.projectEnvironmentalMonitoringLocation.create({
      data: {
        monitoringReportId: reportId,
        label: dto.label,
        receiverType: dto.receiverType ?? null,
        sourceSpatialViewId: dto.sourceSpatialViewId ?? null,
        sourceSpatialViewLabel: dto.sourceSpatialViewLabel ?? null,
        sourceSpatialFeatureId: dto.sourceSpatialFeatureId ?? null,
        sourceSpatialFeatureLabel: dto.sourceSpatialFeatureLabel ?? null,
        sourceSpatialFeatureType:
          (dto.sourceSpatialFeatureType as Prisma.ProjectEnvironmentalMonitoringLocationUncheckedCreateInput['sourceSpatialFeatureType']) ??
          null,
        locationDescription: dto.locationDescription,
        distanceNote: dto.distanceNote,
        chainageNote: dto.chainageNote,
        coordinatesNote: dto.coordinatesNote,
        assessmentLocationBasis: dto.assessmentLocationBasis,
        sortOrder:
          dto.sortOrder ??
          (await this.prisma.projectEnvironmentalMonitoringLocation.count({
            where: { monitoringReportId: reportId },
          })),
      },
    });

    return this.findExistingMonitoringReport(reportId);
  }

  async updateLocation(
    access: ProjectAccess,
    reportId: string,
    id: string,
    dto: UpdateProjectEnvironmentalMonitoringLocationDto,
  ) {
    await this.assertProjectWriteAccess(access);
    await this.assertMonitoringReportExists(access.projectId, reportId);
    await this.assertLocationExists(reportId, id);

    await this.prisma.projectEnvironmentalMonitoringLocation.update({
      where: { id },
      data: pickDefined(dto, [
        'label',
        'receiverType',
        'sourceSpatialViewId',
        'sourceSpatialViewLabel',
        'sourceSpatialFeatureId',
        'sourceSpatialFeatureLabel',
        'sourceSpatialFeatureType',
        'locationDescription',
        'distanceNote',
        'chainageNote',
        'coordinatesNote',
        'assessmentLocationBasis',
        'sortOrder',
      ]) as Prisma.ProjectEnvironmentalMonitoringLocationUncheckedUpdateInput,
    });

    return this.findExistingMonitoringReport(reportId);
  }

  async deleteLocation(access: ProjectAccess, reportId: string, id: string) {
    await this.assertProjectWriteAccess(access);
    await this.assertMonitoringReportExists(access.projectId, reportId);
    await this.assertLocationExists(reportId, id);
    await this.prisma.projectEnvironmentalMonitoringLocation.delete({ where: { id } });
    return this.findExistingMonitoringReport(reportId);
  }

  async importLocationsFromView(
    access: ProjectAccess,
    reportId: string,
    dto: ImportProjectEnvironmentalMonitoringLocationsFromViewDto,
  ) {
    await this.assertProjectWriteAccess(access);
    await this.assertMonitoringReportExists(access.projectId, reportId);

    const view = await this.prisma.projectSpatialView.findFirst({
      where: {
        id: dto.projectSpatialViewId,
        projectId: access.projectId,
      },
    });
    if (!view) {
      throw new NotFoundException('Project Spatial View not found');
    }

    const visibleFeatureTypes = resolveMonitoringLocationImportFeatureTypes(view);
    const features = await this.prisma.projectSpatialFeature.findMany({
      where: {
        projectId: access.projectId,
        featureType: {
          in: visibleFeatureTypes,
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }, { label: 'asc' }],
    });
    const existingLocations = await this.prisma.projectEnvironmentalMonitoringLocation.findMany({
      where: { monitoringReportId: reportId },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });
    const existingBySourceFeatureId = new Map(
      existingLocations
        .filter((location) => Boolean(location.sourceSpatialFeatureId))
        .map((location) => [location.sourceSpatialFeatureId as string, location]),
    );
    const mode = dto.mode ?? 'new_only';
    let nextSortOrder =
      existingLocations.reduce(
        (maxSortOrder, location) => Math.max(maxSortOrder, location.sortOrder),
        -1,
      ) + 1;

    await this.prisma.$transaction(async (tx) => {
      for (const feature of features) {
        const importedLocation = buildMonitoringLocationImportRow(view, feature);
        const existingLocation = existingBySourceFeatureId.get(feature.id) ?? null;

        if (!existingLocation) {
          await tx.projectEnvironmentalMonitoringLocation.create({
            data: {
              monitoringReportId: reportId,
              sortOrder: nextSortOrder,
              ...importedLocation,
            },
          });
          nextSortOrder += 1;
          continue;
        }

        if (mode !== 'refresh_imported') {
          continue;
        }

        await tx.projectEnvironmentalMonitoringLocation.update({
          where: { id: existingLocation.id },
          data: mergeMonitoringLocationImportRow(existingLocation, importedLocation),
        });
      }
    });

    return this.findExistingMonitoringReport(reportId);
  }

  async createSelectedCriterion(
    access: ProjectAccess,
    reportId: string,
    dto: CreateProjectEnvironmentalMonitoringSelectedCriterionDto,
  ) {
    await this.assertProjectWriteAccess(access);
    await this.assertMonitoringReportExists(access.projectId, reportId);
    const criterionRow = await this.findCriterionRow(dto.criterionRowId);
    if (!criterionRow) {
      throw new NotFoundException('Noise/vibration criterion row not found');
    }

    try {
      await this.prisma.projectEnvironmentalMonitoringSelectedCriterion.create({
        data: {
          monitoringReportId: reportId,
          criterionRowId: dto.criterionRowId,
          selectionPurpose: dto.selectionPurpose,
          applicabilityStatus:
            dto.applicabilityStatus ??
            defaultMonitoringCriterionApplicabilityStatus(
              criterionRow.criterionGroup.standardSource,
            ),
          isEnforceableOnThisProject: dto.isEnforceableOnThisProject ?? false,
          projectConditionReference: dto.projectConditionReference,
          selectionNote: dto.selectionNote,
          sortOrder:
            dto.sortOrder ??
            (await this.prisma.projectEnvironmentalMonitoringSelectedCriterion.count({
              where: { monitoringReportId: reportId },
            })),
        },
      });
    } catch (error) {
      throwFriendlyUniqueError(
        error,
        'This criterion row is already selected for this purpose in this monitoring report',
      );
    }

    return this.findExistingMonitoringReport(reportId);
  }

  async updateSelectedCriterion(
    access: ProjectAccess,
    reportId: string,
    id: string,
    dto: UpdateProjectEnvironmentalMonitoringSelectedCriterionDto,
  ) {
    await this.assertProjectWriteAccess(access);
    await this.assertMonitoringReportExists(access.projectId, reportId);
    await this.assertSelectedCriterionExists(reportId, id);

    try {
      await this.prisma.projectEnvironmentalMonitoringSelectedCriterion.update({
        where: { id },
        data: pickDefined(dto, [
          'selectionPurpose',
          'applicabilityStatus',
          'isEnforceableOnThisProject',
          'projectConditionReference',
          'selectionNote',
          'sortOrder',
        ]) as Prisma.ProjectEnvironmentalMonitoringSelectedCriterionUncheckedUpdateInput,
      });
    } catch (error) {
      throwFriendlyUniqueError(
        error,
        'This criterion row is already selected for this purpose in this monitoring report',
      );
    }

    return this.findExistingMonitoringReport(reportId);
  }

  async deleteSelectedCriterion(access: ProjectAccess, reportId: string, id: string) {
    await this.assertProjectWriteAccess(access);
    await this.assertMonitoringReportExists(access.projectId, reportId);
    await this.assertSelectedCriterionExists(reportId, id);
    await this.prisma.projectEnvironmentalMonitoringSelectedCriterion.delete({ where: { id } });
    return this.findExistingMonitoringReport(reportId);
  }

  async createNoiseResult(
    access: ProjectAccess,
    reportId: string,
    dto: CreateProjectEnvironmentalNoiseResultRowDto,
  ) {
    await this.assertProjectWriteAccess(access);
    await this.assertMonitoringReportType(access.projectId, reportId, 'noise_monitoring');
    await this.assertLocationBelongsToReport(reportId, dto.locationId);
    const selectedCriterion = await this.findSelectedCriterionLink(
      reportId,
      dto.selectedCriterionId,
    );
    await this.assertCriterionRowExists(
      dto.criterionRowId ?? selectedCriterion?.criterionRowId ?? null,
    );

    await this.prisma.projectEnvironmentalNoiseResultRow.create({
      data: buildNoiseResultCreateData(
        reportId,
        dto,
        selectedCriterion,
        dto.sortOrder ??
          (await this.prisma.projectEnvironmentalNoiseResultRow.count({
            where: { monitoringReportId: reportId },
          })),
      ),
    });

    return this.findExistingMonitoringReport(reportId);
  }

  async updateNoiseResult(
    access: ProjectAccess,
    reportId: string,
    id: string,
    dto: UpdateProjectEnvironmentalNoiseResultRowDto,
  ) {
    await this.assertProjectWriteAccess(access);
    await this.assertMonitoringReportType(access.projectId, reportId, 'noise_monitoring');
    const existingRow = await this.findNoiseResultRow(reportId, id);
    await this.assertLocationBelongsToReport(reportId, dto.locationId);
    const selectedCriterion = await this.findSelectedCriterionLink(
      reportId,
      dto.selectedCriterionId !== undefined
        ? dto.selectedCriterionId
        : existingRow.selectedCriterionId,
    );
    await this.assertCriterionRowExists(
      dto.criterionRowId ?? selectedCriterion?.criterionRowId ?? existingRow.criterionRowId,
    );

    await this.prisma.projectEnvironmentalNoiseResultRow.update({
      where: { id },
      data: buildNoiseResultUpdateData(dto, selectedCriterion, existingRow),
    });

    return this.findExistingMonitoringReport(reportId);
  }

  async deleteNoiseResult(access: ProjectAccess, reportId: string, id: string) {
    await this.assertProjectWriteAccess(access);
    await this.assertMonitoringReportType(access.projectId, reportId, 'noise_monitoring');
    await this.assertNoiseResultExists(reportId, id);
    await this.prisma.projectEnvironmentalNoiseResultRow.delete({ where: { id } });
    return this.findExistingMonitoringReport(reportId);
  }

  async createVibrationResult(
    access: ProjectAccess,
    reportId: string,
    dto: CreateProjectEnvironmentalVibrationResultRowDto,
  ) {
    await this.assertProjectWriteAccess(access);
    await this.assertMonitoringReportType(access.projectId, reportId, 'vibration_monitoring');
    await this.assertLocationBelongsToReport(reportId, dto.locationId);
    await this.assertCriterionRowExists(dto.criterionRowId);

    await this.prisma.projectEnvironmentalVibrationResultRow.create({
      data: buildVibrationResultCreateData(
        reportId,
        dto,
        dto.sortOrder ??
          (await this.prisma.projectEnvironmentalVibrationResultRow.count({
            where: { monitoringReportId: reportId },
          })),
      ),
    });

    return this.findExistingMonitoringReport(reportId);
  }

  async updateVibrationResult(
    access: ProjectAccess,
    reportId: string,
    id: string,
    dto: UpdateProjectEnvironmentalVibrationResultRowDto,
  ) {
    await this.assertProjectWriteAccess(access);
    await this.assertMonitoringReportType(access.projectId, reportId, 'vibration_monitoring');
    await this.assertVibrationResultExists(reportId, id);
    await this.assertLocationBelongsToReport(reportId, dto.locationId);
    await this.assertCriterionRowExists(dto.criterionRowId);

    await this.prisma.projectEnvironmentalVibrationResultRow.update({
      where: { id },
      data: buildVibrationResultUpdateData(dto),
    });

    return this.findExistingMonitoringReport(reportId);
  }

  async deleteVibrationResult(access: ProjectAccess, reportId: string, id: string) {
    await this.assertProjectWriteAccess(access);
    await this.assertMonitoringReportType(access.projectId, reportId, 'vibration_monitoring');
    await this.assertVibrationResultExists(reportId, id);
    await this.prisma.projectEnvironmentalVibrationResultRow.delete({ where: { id } });
    return this.findExistingMonitoringReport(reportId);
  }

  async listOmnidotsConnections(access: ProjectAccess, reportId: string) {
    await this.assertProjectReadAccess(access);
    await this.assertMonitoringReportType(access.projectId, reportId, 'vibration_monitoring');

    return this.omnidotsService.listConnections(access.organisationId, access.userId);
  }

  async createOmnidotsConnection(
    access: ProjectAccess,
    reportId: string,
    dto: CreateOmnidotsProviderConnectionDto,
  ) {
    await this.assertProjectWriteAccess(access);
    await this.assertMonitoringReportType(access.projectId, reportId, 'vibration_monitoring');

    return this.omnidotsService.createConnection(access.organisationId, access.userId, dto);
  }

  async updateOmnidotsConnection(
    access: ProjectAccess,
    reportId: string,
    connectionId: string,
    dto: UpdateOmnidotsProviderConnectionDto,
  ) {
    await this.assertProjectWriteAccess(access);
    await this.assertMonitoringReportType(access.projectId, reportId, 'vibration_monitoring');

    return this.omnidotsService.updateConnection(
      access.organisationId,
      connectionId,
      access.userId,
      dto,
    );
  }

  async validateOmnidotsConnection(access: ProjectAccess, reportId: string, connectionId: string) {
    await this.assertProjectWriteAccess(access);
    await this.assertMonitoringReportType(access.projectId, reportId, 'vibration_monitoring');

    return this.omnidotsService.validateStoredConnection(
      access.organisationId,
      connectionId,
      access.userId,
    );
  }

  async syncOmnidotsMeasuringPoints(access: ProjectAccess, reportId: string, connectionId: string) {
    await this.assertProjectWriteAccess(access);
    await this.assertMonitoringReportType(access.projectId, reportId, 'vibration_monitoring');

    return this.omnidotsService.syncMeasuringPoints(
      access.organisationId,
      connectionId,
      access.userId,
    );
  }

  async listOmnidotsMeasuringPoints(access: ProjectAccess, reportId: string, connectionId: string) {
    await this.assertProjectReadAccess(access);
    await this.assertMonitoringReportType(access.projectId, reportId, 'vibration_monitoring');

    const [measuringPoints, latestImportJob, latestDataset] = await Promise.all([
      this.omnidotsService.listMeasuringPoints(access.organisationId, connectionId, access.userId),
      this.findLatestOmnidotsImportJobSummary(connectionId),
      this.findLatestOmnidotsDatasetSummary(reportId, connectionId),
    ]);

    return {
      measuringPoints,
      latestImportJob,
      latestDataset,
    };
  }

  async importOmnidotsData(
    access: ProjectAccess,
    reportId: string,
    dto: ProjectEnvironmentalMonitoringOmnidotsImportDto,
  ) {
    await this.assertProjectWriteAccess(access);
    await this.assertMonitoringReportType(access.projectId, reportId, 'vibration_monitoring');
    await this.assertOmnidotsConnectionBelongsToOrganisation(
      access.organisationId,
      dto.connectionId,
    );
    await this.assertOmnidotsMeasuringPointBelongsToConnection(
      dto.connectionId,
      dto.measuringPointId,
    );

    const dateFrom = new Date(dto.dateFrom);
    const dateTo = new Date(dto.dateTo);

    if (Number.isNaN(dateFrom.getTime()) || Number.isNaN(dateTo.getTime())) {
      throw new BadRequestException('A valid import date range is required');
    }

    const selectedMetricKeys = Array.from(new Set(dto.selectedMetricKeys));
    const metricResults = [];

    for (const metricKey of selectedMetricKeys) {
      if (metricKey === 'vtop') {
        metricResults.push(
          await this.omnidotsService.importPeakRecords({
            connectionId: dto.connectionId,
            localMeasuringPointId: dto.measuringPointId,
            dateFrom,
            dateTo,
          }),
        );
        continue;
      }

      if (metricKey === 'vdv') {
        metricResults.push(
          await this.omnidotsService.importVdvRecords({
            connectionId: dto.connectionId,
            localMeasuringPointId: dto.measuringPointId,
            dateFrom,
            dateTo,
          }),
        );
        continue;
      }

      metricResults.push(
        await this.omnidotsService.importVeffRecords({
          connectionId: dto.connectionId,
          localMeasuringPointId: dto.measuringPointId,
          dateFrom,
          dateTo,
        }),
      );
    }

    const latestImportJob = await this.findLatestOmnidotsImportJobSummary(dto.connectionId);

    return {
      importSummary: {
        connectionId: dto.connectionId,
        measuringPointId: dto.measuringPointId,
        selectedMetricKeys,
        dateFrom: dateFrom.toISOString(),
        dateTo: dateTo.toISOString(),
        samplesImported: metricResults.reduce(
          (total, result) => total + (result.processedCount ?? 0),
          0,
        ),
        samplesCreated: metricResults.reduce((total, result) => total + result.createdCount, 0),
        samplesUpdated: metricResults.reduce((total, result) => total + result.updatedCount, 0),
        lastImportJobStatus: latestImportJob?.status ?? null,
        metricResults,
      },
    };
  }

  async buildOmnidotsDataset(
    access: ProjectAccess,
    reportId: string,
    dto: ProjectEnvironmentalMonitoringOmnidotsBuildDatasetDto,
  ) {
    await this.assertProjectWriteAccess(access);
    await this.assertMonitoringReportType(access.projectId, reportId, 'vibration_monitoring');
    await this.assertOmnidotsConnectionBelongsToOrganisation(
      access.organisationId,
      dto.connectionId,
    );
    await this.assertOmnidotsMeasuringPointBelongsToConnection(
      dto.connectionId,
      dto.measuringPointId,
    );

    const buildResult = await this.omnidotsService.buildReportDatasetSnapshot({
      monitoringReportId: reportId,
      connectionId: dto.connectionId,
      measuringPointId: dto.measuringPointId,
      dateFrom: new Date(dto.dateFrom),
      dateTo: new Date(dto.dateTo),
      selectedMetricKeys: dto.selectedMetricKeys,
    });

    const latestDataset = await this.findLatestOmnidotsDatasetSummary(
      reportId,
      dto.connectionId,
      buildResult.dataset.id,
    );

    return {
      created: buildResult.created,
      latestDataset,
      latestImportJob: await this.findLatestOmnidotsImportJobSummary(dto.connectionId),
    };
  }

  async createVibrationResultsFromOmnidotsDataset(
    access: ProjectAccess,
    reportId: string,
    dto: CreateProjectEnvironmentalMonitoringVibrationResultsFromOmnidotsDatasetDto,
  ) {
    await this.assertProjectWriteAccess(access);
    await this.assertMonitoringReportType(access.projectId, reportId, 'vibration_monitoring');

    const dataset = await this.prisma.projectEnvironmentalMonitoringDataset.findFirst({
      where: {
        id: dto.datasetId,
        monitoringReportId: reportId,
        sourceType: 'omnidots_api',
      },
      select: {
        id: true,
        connectionId: true,
        datasetHash: true,
        dateFrom: true,
        dateTo: true,
        createdAt: true,
        updatedAt: true,
        snapshotJson: true,
      },
    });

    if (!dataset) {
      throw new NotFoundException('Omnidots dataset snapshot not found for this report');
    }

    const importJobsByMetric = await this.findOmnidotsImportJobReferenceMap(
      dataset.connectionId,
      [],
    );
    const latestDataset = buildOmnidotsLatestDatasetSummary({
      datasetId: dataset.id,
      datasetHash: dataset.datasetHash,
      dateFrom: dataset.dateFrom,
      dateTo: dataset.dateTo,
      createdAt: dataset.createdAt,
      updatedAt: dataset.updatedAt,
      snapshotJson: dataset.snapshotJson,
      importJobsByMetric,
    });

    if (!latestDataset) {
      throw new BadRequestException('Omnidots dataset snapshot could not be parsed');
    }

    const report = await this.findExistingMonitoringReport(reportId);
    if (!report) {
      throw new NotFoundException('Environmental monitoring report not found');
    }

    const { drafts, skipped } = buildOmnidotsImportedVibrationResultDrafts({
      datasetId: dataset.id,
      previewRows: latestDataset.previewRows,
      existingResultNotes: report.vibrationResults
        .map((row) => row.resultNote)
        .filter((note): note is string => !!note),
    });

    await this.prisma.$transaction(async (tx) => {
      let nextSortOrder = await tx.projectEnvironmentalVibrationResultRow.count({
        where: { monitoringReportId: reportId },
      });

      for (const draft of drafts) {
        await tx.projectEnvironmentalVibrationResultRow.create({
          data: {
            monitoringReportId: reportId,
            locationId: null,
            observedAt: draft.observedAt ? new Date(draft.observedAt) : null,
            activityLabel: draft.activityLabel,
            instrumentNote: draft.instrumentNote,
            metricType: draft.metricType,
            ppvValue: draft.ppvValue,
            vdvValue: draft.vdvValue,
            linPeakValue: null,
            dominantFrequencyHz: draft.dominantFrequencyHz,
            axisNote: draft.axisNote,
            criterionRowId: null,
            complianceStatus: draft.complianceStatus,
            resultNote: draft.resultNote,
            sortOrder: nextSortOrder++,
          },
        });
      }
    });

    return {
      createdCount: drafts.length,
      skippedCount: skipped.length,
      skipped,
      report: await this.findExistingMonitoringReport(reportId),
    };
  }

  async createObservation(
    access: ProjectAccess,
    reportId: string,
    dto: CreateProjectEnvironmentalMonitoringObservationDto,
  ) {
    await this.assertProjectWriteAccess(access);
    await this.assertMonitoringReportExists(access.projectId, reportId);
    await this.assertLocationBelongsToReport(reportId, dto.locationId);
    await this.assertNoiseResultBelongsToReport(reportId, dto.noiseResultId);

    await this.prisma.projectEnvironmentalMonitoringObservation.create({
      data: {
        monitoringReportId: reportId,
        category: dto.category,
        locationId: dto.locationId ?? null,
        noiseResultId: dto.noiseResultId ?? null,
        observation: dto.observation,
        implicationNote: dto.implicationNote,
        implicationSeverity: dto.implicationSeverity ?? null,
        followUpRequired: dto.followUpRequired ?? false,
        sortOrder:
          dto.sortOrder ??
          (await this.prisma.projectEnvironmentalMonitoringObservation.count({
            where: { monitoringReportId: reportId },
          })),
      },
    });

    return this.findExistingMonitoringReport(reportId);
  }

  async updateObservation(
    access: ProjectAccess,
    reportId: string,
    id: string,
    dto: UpdateProjectEnvironmentalMonitoringObservationDto,
  ) {
    await this.assertProjectWriteAccess(access);
    await this.assertMonitoringReportExists(access.projectId, reportId);
    await this.assertObservationExists(reportId, id);
    await this.assertLocationBelongsToReport(reportId, dto.locationId);
    await this.assertNoiseResultBelongsToReport(reportId, dto.noiseResultId);

    await this.prisma.projectEnvironmentalMonitoringObservation.update({
      where: { id },
      data: pickDefined(dto, [
        'category',
        'locationId',
        'noiseResultId',
        'observation',
        'implicationNote',
        'implicationSeverity',
        'followUpRequired',
        'sortOrder',
      ]) as Prisma.ProjectEnvironmentalMonitoringObservationUncheckedUpdateInput,
    });

    return this.findExistingMonitoringReport(reportId);
  }

  async deleteObservation(access: ProjectAccess, reportId: string, id: string) {
    await this.assertProjectWriteAccess(access);
    await this.assertMonitoringReportExists(access.projectId, reportId);
    await this.assertObservationExists(reportId, id);
    await this.prisma.projectEnvironmentalMonitoringObservation.delete({ where: { id } });
    return this.findExistingMonitoringReport(reportId);
  }

  async createRecommendation(
    access: ProjectAccess,
    reportId: string,
    dto: CreateProjectEnvironmentalMonitoringRecommendationDto,
  ) {
    await this.assertProjectWriteAccess(access);
    await this.assertMonitoringReportExists(access.projectId, reportId);
    await this.assertObservationBelongsToReport(reportId, dto.observationId);
    await this.assertNoiseResultBelongsToReport(reportId, dto.noiseResultId);

    await this.prisma.projectEnvironmentalMonitoringRecommendation.create({
      data: {
        monitoringReportId: reportId,
        category: dto.category,
        observationId: dto.observationId ?? null,
        noiseResultId: dto.noiseResultId ?? null,
        recommendation: dto.recommendation,
        priority: dto.priority,
        responsibility: dto.responsibility,
        timingNote: dto.timingNote,
        dueDate: parseOptionalDate(dto.dueDate),
        status: dto.status ?? null,
        sortOrder:
          dto.sortOrder ??
          (await this.prisma.projectEnvironmentalMonitoringRecommendation.count({
            where: { monitoringReportId: reportId },
          })),
      },
    });

    return this.findExistingMonitoringReport(reportId);
  }

  async updateRecommendation(
    access: ProjectAccess,
    reportId: string,
    id: string,
    dto: UpdateProjectEnvironmentalMonitoringRecommendationDto,
  ) {
    await this.assertProjectWriteAccess(access);
    await this.assertMonitoringReportExists(access.projectId, reportId);
    await this.assertRecommendationExists(reportId, id);
    await this.assertObservationBelongsToReport(reportId, dto.observationId);
    await this.assertNoiseResultBelongsToReport(reportId, dto.noiseResultId);

    const data = pickDefined(dto, [
      'category',
      'observationId',
      'noiseResultId',
      'recommendation',
      'priority',
      'responsibility',
      'timingNote',
      'status',
      'sortOrder',
    ]) as Prisma.ProjectEnvironmentalMonitoringRecommendationUncheckedUpdateInput;
    assignDateField(data, 'dueDate', dto.dueDate);

    await this.prisma.projectEnvironmentalMonitoringRecommendation.update({
      where: { id },
      data,
    });

    return this.findExistingMonitoringReport(reportId);
  }

  async deleteRecommendation(access: ProjectAccess, reportId: string, id: string) {
    await this.assertProjectWriteAccess(access);
    await this.assertMonitoringReportExists(access.projectId, reportId);
    await this.assertRecommendationExists(reportId, id);
    await this.prisma.projectEnvironmentalMonitoringRecommendation.delete({ where: { id } });
    return this.findExistingMonitoringReport(reportId);
  }

  private async findExistingMonitoringReport(reportId: string) {
    const report = await this.findExistingMonitoringReportRecord(undefined, reportId);
    if (!report) {
      throw new NotFoundException('Environmental monitoring report not found');
    }
    return serializeMonitoringReport(report);
  }

  private async findExistingMonitoringReportRecord(
    projectId: string | undefined,
    reportId: string,
  ) {
    return this.prisma.projectEnvironmentalMonitoringReport.findFirst({
      where: {
        id: reportId,
        ...(projectId ? { projectId } : {}),
      },
      include: environmentalMonitoringReportInclude,
    });
  }

  private async assertMonitoringReportExists(projectId: string, reportId: string) {
    const report = await this.prisma.projectEnvironmentalMonitoringReport.findFirst({
      where: { id: reportId, projectId },
      select: { id: true, reportType: true },
    });

    if (!report) {
      throw new NotFoundException('Environmental monitoring report not found');
    }

    return report;
  }

  private async assertMonitoringReportType(
    projectId: string,
    reportId: string,
    expectedType: MonitoringReportType,
  ) {
    const report = await this.assertMonitoringReportExists(projectId, reportId);
    if (report.reportType !== expectedType) {
      throw new ConflictException(
        expectedType === 'noise_monitoring'
          ? 'Noise results can only be managed on a noise monitoring report'
          : 'Vibration results can only be managed on a vibration monitoring report',
      );
    }
    return report;
  }

  private async assertProjectReadAccess(access: ProjectAccess) {
    const project = await this.prisma.project.findFirst({
      where: { id: access.projectId, organisationId: access.organisationId },
      include: { members: true },
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
    if (!membership || !['lead', 'engineer'].includes(membership.role)) {
      throw new ForbiddenException('Insufficient project role');
    }
    return project;
  }

  private async assertOmnidotsConnectionBelongsToOrganisation(
    organisationId: string,
    connectionId: string,
  ) {
    const connection = await this.prisma.omnidotsProviderConnection.findFirst({
      where: {
        id: connectionId,
        organisationId,
      },
      select: {
        id: true,
      },
    });

    if (!connection) {
      throw new NotFoundException('Omnidots connection not found');
    }

    return connection;
  }

  private async assertOmnidotsMeasuringPointBelongsToConnection(
    connectionId: string,
    measuringPointId: string,
  ) {
    const measuringPoint = await this.prisma.omnidotsMeasuringPoint.findFirst({
      where: {
        id: measuringPointId,
        connectionId,
      },
      select: {
        id: true,
      },
    });

    if (!measuringPoint) {
      throw new NotFoundException('Omnidots measuring point not found');
    }

    return measuringPoint;
  }

  private async findLatestOmnidotsImportJobSummary(connectionId: string) {
    const job = await this.prisma.monitoringImportJob.findFirst({
      where: { connectionId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        jobType: true,
        status: true,
        errorMessage: true,
        createdAt: true,
        completedAt: true,
      },
    });

    if (!job) {
      return null;
    }

    return {
      id: job.id,
      jobType: job.jobType,
      status: job.status,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt.toISOString(),
      completedAt: job.completedAt?.toISOString() ?? null,
    };
  }

  private async findLatestOmnidotsDatasetSummary(
    reportId: string,
    connectionId: string,
    preferredDatasetId?: string,
  ): Promise<OmnidotsLatestDatasetSummary | null> {
    const dataset = preferredDatasetId
      ? await this.prisma.projectEnvironmentalMonitoringDataset.findFirst({
          where: {
            id: preferredDatasetId,
            monitoringReportId: reportId,
            connectionId,
            sourceType: 'omnidots_api',
          },
          select: {
            id: true,
            connectionId: true,
            datasetHash: true,
            dateFrom: true,
            dateTo: true,
            createdAt: true,
            updatedAt: true,
            snapshotJson: true,
          },
        })
      : await this.prisma.projectEnvironmentalMonitoringDataset.findFirst({
          where: {
            monitoringReportId: reportId,
            connectionId,
            sourceType: 'omnidots_api',
          },
          orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
          select: {
            id: true,
            connectionId: true,
            datasetHash: true,
            dateFrom: true,
            dateTo: true,
            createdAt: true,
            updatedAt: true,
            snapshotJson: true,
          },
        });

    if (!dataset) {
      return null;
    }

    const snapshotRecord =
      dataset.snapshotJson &&
      typeof dataset.snapshotJson === 'object' &&
      !Array.isArray(dataset.snapshotJson)
        ? (dataset.snapshotJson as Record<string, unknown>)
        : null;
    const selectedMetricKeys = Array.isArray(snapshotRecord?.selectedMetricKeys)
      ? snapshotRecord.selectedMetricKeys.filter(
          (metricKey): metricKey is string => typeof metricKey === 'string',
        )
      : [];
    const importJobsByMetric = await this.findOmnidotsImportJobReferenceMap(
      connectionId,
      selectedMetricKeys,
    );

    return buildOmnidotsLatestDatasetSummary({
      datasetId: dataset.id,
      datasetHash: dataset.datasetHash,
      dateFrom: dataset.dateFrom,
      dateTo: dataset.dateTo,
      createdAt: dataset.createdAt,
      updatedAt: dataset.updatedAt,
      snapshotJson: dataset.snapshotJson,
      importJobsByMetric,
    });
  }

  private async findOmnidotsImportJobReferenceMap(
    connectionId: string | null,
    metricKeys: string[],
  ) {
    const references = new Map<
      string,
      {
        metricKey: string;
        id: string;
        status: string;
        completedAt: string | null;
      }
    >();

    if (!connectionId || metricKeys.length === 0) {
      return references;
    }

    await Promise.all(
      metricKeys.map(async (metricKey) => {
        const jobType = metricKeyToImportJobType(metricKey);
        if (!jobType) {
          return;
        }

        const job = await this.prisma.monitoringImportJob.findFirst({
          where: {
            connectionId,
            jobType,
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          select: {
            id: true,
            status: true,
            completedAt: true,
          },
        });

        if (!job) {
          return;
        }

        references.set(metricKey, {
          metricKey,
          id: job.id,
          status: job.status,
          completedAt: job.completedAt?.toISOString() ?? null,
        });
      }),
    );

    return references;
  }

  private async assertAiDocumentBelongsToProject(
    access: ProjectAccess,
    aiDocumentId?: string | null,
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

  private async assertCriterionRowExists(criterionRowId?: string | null) {
    if (!criterionRowId) {
      return;
    }

    if (!(await this.findCriterionRow(criterionRowId))) {
      throw new NotFoundException('Noise/vibration criterion row not found');
    }
  }

  private async findCriterionRow(criterionRowId?: string | null) {
    if (!criterionRowId) {
      return null;
    }

    return this.prisma.noiseVibrationCriterionRow.findUnique({
      where: { id: criterionRowId },
      include: criterionRowInclude,
    });
  }

  private async findSelectedCriterionLink(reportId: string, selectedCriterionId?: string | null) {
    if (!selectedCriterionId) {
      return null;
    }

    const selectedCriterion =
      await this.prisma.projectEnvironmentalMonitoringSelectedCriterion.findFirst({
        where: {
          id: selectedCriterionId,
          monitoringReportId: reportId,
        },
        include: {
          criterionRow: {
            include: criterionRowInclude,
          },
        },
      });

    if (!selectedCriterion) {
      throw new NotFoundException('Selected criterion not found on this monitoring report');
    }

    return selectedCriterion;
  }

  private async assertLocationBelongsToReport(reportId: string, locationId?: string | null) {
    if (!locationId) {
      return;
    }

    await this.assertChildExists(
      this.prisma.projectEnvironmentalMonitoringLocation.findFirst({
        where: { id: locationId, monitoringReportId: reportId },
        select: { id: true },
      }),
      'Monitoring location not found',
    );
  }

  private async assertNoiseResultBelongsToReport(reportId: string, noiseResultId?: string | null) {
    if (!noiseResultId) {
      return;
    }

    await this.assertChildExists(
      this.prisma.projectEnvironmentalNoiseResultRow.findFirst({
        where: { id: noiseResultId, monitoringReportId: reportId },
        select: { id: true },
      }),
      'Noise result row not found',
    );
  }

  private async assertObservationBelongsToReport(reportId: string, observationId?: string | null) {
    if (!observationId) {
      return;
    }

    await this.assertChildExists(
      this.prisma.projectEnvironmentalMonitoringObservation.findFirst({
        where: { id: observationId, monitoringReportId: reportId },
        select: { id: true },
      }),
      'Monitoring observation not found',
    );
  }

  private async assertReferenceExists(reportId: string, id: string) {
    await this.assertChildExists(
      this.prisma.projectEnvironmentalMonitoringReference.findFirst({
        where: { id, monitoringReportId: reportId },
        select: { id: true },
      }),
      'Monitoring reference not found',
    );
  }

  private async assertAnnexureExists(reportId: string, id: string) {
    const annexure = await this.prisma.projectEnvironmentalMonitoringAnnexure.findFirst({
      where: { id, monitoringReportId: reportId },
      select: {
        id: true,
        annexureType: true,
        rootSheetTemplateId: true,
        rootSheetTemplateVersionId: true,
        templateReferenceId: true,
        templateSnapshotJson: true,
        templateSourceKind: true,
      },
    });

    if (!annexure) {
      throw new NotFoundException('Monitoring annexure not found');
    }

    return annexure;
  }

  private async persistAnnexureOrder(tx: MonitoringAnnexureOrderClient, orderedIds: string[]) {
    for (const [index, id] of orderedIds.entries()) {
      await tx.projectEnvironmentalMonitoringAnnexure.update({
        where: { id },
        data: { sortOrder: -(index + 1) },
      });
    }

    for (const [index, id] of orderedIds.entries()) {
      await tx.projectEnvironmentalMonitoringAnnexure.update({
        where: { id },
        data: { sortOrder: index },
      });
    }
  }

  private async normalizeAnnexureSortOrder(tx: MonitoringAnnexureOrderClient, reportId: string) {
    const orderedIds = (
      await tx.projectEnvironmentalMonitoringAnnexure.findMany({
        where: { monitoringReportId: reportId },
        select: { id: true },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      })
    ).map((annexure) => annexure.id);

    await this.persistAnnexureOrder(tx, orderedIds);
  }

  private async assertLocationExists(reportId: string, id: string) {
    await this.assertChildExists(
      this.prisma.projectEnvironmentalMonitoringLocation.findFirst({
        where: { id, monitoringReportId: reportId },
        select: { id: true },
      }),
      'Monitoring location not found',
    );
  }

  private async assertSelectedCriterionExists(reportId: string, id: string) {
    await this.assertChildExists(
      this.prisma.projectEnvironmentalMonitoringSelectedCriterion.findFirst({
        where: { id, monitoringReportId: reportId },
        select: { id: true },
      }),
      'Selected criterion not found',
    );
  }

  private handleMonitoringPersistenceError(
    error: unknown,
    operation: string,
    projectId: string,
  ): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      const schemaMismatch =
        error.code === 'P2021' || error.code === 'P2022'
          ? ' This usually indicates the local database schema is behind the Prisma client.'
          : '';
      this.logger.error(
        `Failed to ${operation} for project ${projectId}. Prisma ${error.code}.${schemaMismatch}`,
        error.stack,
      );
    } else if (error instanceof Error) {
      this.logger.error(`Failed to ${operation} for project ${projectId}.`, error.stack);
    } else {
      this.logger.error(`Failed to ${operation} for project ${projectId}.`, String(error));
    }

    throw new InternalServerErrorException(
      'Environmental monitoring reports are temporarily unavailable',
    );
  }

  private async assertNoiseResultExists(reportId: string, id: string) {
    await this.assertChildExists(
      this.prisma.projectEnvironmentalNoiseResultRow.findFirst({
        where: { id, monitoringReportId: reportId },
        select: { id: true },
      }),
      'Noise result row not found',
    );
  }

  private async findNoiseResultRow(reportId: string, id: string) {
    const row = await this.prisma.projectEnvironmentalNoiseResultRow.findFirst({
      where: { id, monitoringReportId: reportId },
      select: {
        id: true,
        criterionRowId: true,
        selectedCriterionId: true,
      },
    });

    if (!row) {
      throw new NotFoundException('Noise result row not found');
    }

    return row;
  }

  private async assertVibrationResultExists(reportId: string, id: string) {
    await this.assertChildExists(
      this.prisma.projectEnvironmentalVibrationResultRow.findFirst({
        where: { id, monitoringReportId: reportId },
        select: { id: true },
      }),
      'Vibration result row not found',
    );
  }

  private async assertObservationExists(reportId: string, id: string) {
    await this.assertChildExists(
      this.prisma.projectEnvironmentalMonitoringObservation.findFirst({
        where: { id, monitoringReportId: reportId },
        select: { id: true },
      }),
      'Monitoring observation not found',
    );
  }

  private async assertRecommendationExists(reportId: string, id: string) {
    await this.assertChildExists(
      this.prisma.projectEnvironmentalMonitoringRecommendation.findFirst({
        where: { id, monitoringReportId: reportId },
        select: { id: true },
      }),
      'Monitoring recommendation not found',
    );
  }

  private async assertChildExists<T>(value: Promise<T | null>, message: string) {
    if (!(await value)) {
      throw new NotFoundException(message);
    }
  }
}

const criterionRowInclude = {
  workTypes: true,
  criterionGroup: {
    include: {
      standardSource: true,
    },
  },
} satisfies Prisma.NoiseVibrationCriterionRowInclude;

const environmentalMonitoringReportInclude = {
  packageIssues: {
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  },
  annexures: {
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  },
  references: {
    include: {
      aiDocument: {
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
    },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  },
  locations: {
    orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
  },
  selectedCriteria: {
    include: {
      criterionRow: {
        include: criterionRowInclude,
      },
    },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  },
  noiseResults: {
    include: {
      location: {
        select: {
          id: true,
          label: true,
        },
      },
      criterionRow: {
        include: criterionRowInclude,
      },
    },
    orderBy: [{ sortOrder: 'asc' }, { observedAt: 'asc' }],
  },
  vibrationResults: {
    include: {
      location: {
        select: {
          id: true,
          label: true,
        },
      },
      criterionRow: {
        include: criterionRowInclude,
      },
    },
    orderBy: [{ sortOrder: 'asc' }, { observedAt: 'asc' }],
  },
  observations: {
    orderBy: [{ sortOrder: 'asc' }, { category: 'asc' }],
  },
  recommendations: {
    orderBy: [{ sortOrder: 'asc' }, { category: 'asc' }],
  },
} satisfies Prisma.ProjectEnvironmentalMonitoringReportInclude;

const environmentalMonitoringReportSummarySelect = {
  id: true,
  projectId: true,
  reportType: true,
  title: true,
  revision: true,
  issueDate: true,
  documentStatus: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      annexures: true,
      locations: true,
      selectedCriteria: true,
      noiseResults: true,
      vibrationResults: true,
      recommendations: true,
    },
  },
} satisfies Prisma.ProjectEnvironmentalMonitoringReportSelect;

function buildMonitoringReportUpdateData(dto: UpdateProjectEnvironmentalMonitoringReportDto) {
  const data = pickDefined(dto, [
    'title',
    'revision',
    'documentStatus',
    'preparedBy',
    'checkedBy',
    'purpose',
    'weatherConditions',
    'siteActivitySummary',
    'executiveSummary',
    'generalObservations',
    'conclusion',
    'recommendationsSummary',
    'assumptionsLimitations',
  ]) as Prisma.ProjectEnvironmentalMonitoringReportUncheckedUpdateInput;

  assignDateField(data, 'issueDate', dto.issueDate);
  assignDateField(data, 'monitoringDate', dto.monitoringDate);
  assignDateField(data, 'monitoringWindowStart', dto.monitoringWindowStart);
  assignDateField(data, 'monitoringWindowEnd', dto.monitoringWindowEnd);

  return data;
}

function resolveMonitoringLocationImportFeatureTypes(view: ProjectSpatialViewRecord) {
  const record =
    view.visibleLayersJson &&
    typeof view.visibleLayersJson === 'object' &&
    !Array.isArray(view.visibleLayersJson)
      ? (view.visibleLayersJson as Record<string, unknown>)
      : {};
  const rawFeatureTypes = Array.isArray(record.featureTypes)
    ? record.featureTypes
    : Array.isArray(record.visibleFeatureTypes)
      ? record.visibleFeatureTypes
      : [];
  const visibleFeatureTypes = rawFeatureTypes.filter(
    (featureType): featureType is (typeof MONITORING_LOCATION_IMPORT_FEATURE_TYPES)[number] =>
      MONITORING_LOCATION_IMPORT_FEATURE_TYPES.includes(
        featureType as (typeof MONITORING_LOCATION_IMPORT_FEATURE_TYPES)[number],
      ),
  );

  return visibleFeatureTypes.length > 0
    ? visibleFeatureTypes
    : [...MONITORING_LOCATION_IMPORT_FEATURE_TYPES];
}

function buildMonitoringLocationImportRow(
  view: Pick<ProjectSpatialViewRecord, 'id' | 'name'>,
  feature: Pick<
    ProjectSpatialFeatureRecord,
    'featureType' | 'geometryJson' | 'id' | 'label' | 'description' | 'propertiesJson'
  >,
): Omit<
  Prisma.ProjectEnvironmentalMonitoringLocationUncheckedCreateInput,
  'monitoringReportId' | 'sortOrder'
> {
  const properties = normalizeJsonRecord(feature.propertiesJson);
  const importedLabel = normalizeOptionalString(feature.label) ?? 'Imported monitoring location';

  return {
    label: importedLabel,
    receiverType: parseMonitoringLocationReceiverType(properties),
    sourceSpatialViewId: view.id,
    sourceSpatialViewLabel: normalizeOptionalString(view.name),
    sourceSpatialFeatureId: feature.id,
    sourceSpatialFeatureLabel: importedLabel,
    sourceSpatialFeatureType: feature.featureType,
    locationDescription:
      normalizeOptionalString(feature.description) ??
      `${formatMonitoringFeatureTypeLabel(feature.featureType)} imported from Project Spatial View ${normalizeOptionalString(view.name) ?? 'snapshot'}.`,
    distanceNote: parseImportedLocationText(properties, [
      'distanceNote',
      'distance',
      'offsetNote',
      'offset',
    ]),
    chainageNote: parseImportedLocationText(properties, [
      'chainageNote',
      'chainage',
      'kp',
      'chainageM',
    ]),
    coordinatesNote: formatMonitoringFeatureCoordinates(feature.geometryJson),
    assessmentLocationBasis: feature.featureType === 'receiver' ? 'external' : null,
  };
}

function mergeMonitoringLocationImportRow(
  existingLocation: Prisma.ProjectEnvironmentalMonitoringLocationGetPayload<Record<string, never>>,
  importedLocation: Omit<
    Prisma.ProjectEnvironmentalMonitoringLocationUncheckedCreateInput,
    'monitoringReportId' | 'sortOrder'
  >,
): Prisma.ProjectEnvironmentalMonitoringLocationUncheckedUpdateInput {
  return {
    label: shouldRefreshImportedLocationLabel(existingLocation)
      ? importedLocation.label
      : existingLocation.label,
    receiverType: existingLocation.receiverType ?? importedLocation.receiverType,
    sourceSpatialViewId: importedLocation.sourceSpatialViewId,
    sourceSpatialViewLabel: importedLocation.sourceSpatialViewLabel,
    sourceSpatialFeatureId: importedLocation.sourceSpatialFeatureId,
    sourceSpatialFeatureLabel: importedLocation.sourceSpatialFeatureLabel,
    sourceSpatialFeatureType: importedLocation.sourceSpatialFeatureType,
    locationDescription:
      normalizeOptionalString(existingLocation.locationDescription) ??
      importedLocation.locationDescription,
    distanceNote:
      normalizeOptionalString(existingLocation.distanceNote) ?? importedLocation.distanceNote,
    chainageNote:
      normalizeOptionalString(existingLocation.chainageNote) ?? importedLocation.chainageNote,
    coordinatesNote:
      normalizeOptionalString(existingLocation.coordinatesNote) ?? importedLocation.coordinatesNote,
    assessmentLocationBasis:
      existingLocation.assessmentLocationBasis ?? importedLocation.assessmentLocationBasis,
  };
}

function shouldRefreshImportedLocationLabel(
  location: Pick<
    Prisma.ProjectEnvironmentalMonitoringLocationGetPayload<Record<string, never>>,
    'label' | 'sourceSpatialFeatureLabel'
  >,
) {
  const currentLabel = normalizeOptionalString(location.label);
  const importedLabel = normalizeOptionalString(location.sourceSpatialFeatureLabel);
  return !currentLabel || (importedLabel !== null && currentLabel === importedLabel);
}

function parseMonitoringLocationReceiverType(properties: Record<string, unknown>) {
  const receiverType =
    typeof properties.receiverType === 'string' &&
    NOISE_VIBRATION_RECEIVER_TYPES.includes(
      properties.receiverType as (typeof NOISE_VIBRATION_RECEIVER_TYPES)[number],
    )
      ? (properties.receiverType as (typeof NOISE_VIBRATION_RECEIVER_TYPES)[number])
      : null;

  if (receiverType) {
    return receiverType;
  }

  return null;
}

function parseImportedLocationText(properties: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = properties[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function formatMonitoringFeatureCoordinates(value: unknown) {
  const point = representativePointForGeometry(value);
  if (!point) {
    return null;
  }

  return `Lat ${point[1].toFixed(6)}, Lon ${point[0].toFixed(6)}`;
}

function representativePointForGeometry(value: unknown): [number, number] | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (record.type === 'Point' && Array.isArray(record.coordinates)) {
    return toLongitudeLatitude(record.coordinates);
  }

  if (record.type === 'LineString' && Array.isArray(record.coordinates)) {
    const firstPoint = Array.isArray(record.coordinates[0]) ? record.coordinates[0] : null;
    return toLongitudeLatitude(firstPoint);
  }

  if (record.type === 'Polygon' && Array.isArray(record.coordinates)) {
    const outerRing = Array.isArray(record.coordinates[0]) ? record.coordinates[0] : [];
    const firstPoint = Array.isArray(outerRing[0]) ? outerRing[0] : null;
    return toLongitudeLatitude(firstPoint);
  }

  return null;
}

function toLongitudeLatitude(value: unknown): [number, number] | null {
  if (!Array.isArray(value) || value.length < 2) {
    return null;
  }

  const longitude = Number(value[0]);
  const latitude = Number(value[1]);
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return null;
  }

  return [longitude, latitude];
}

function formatMonitoringFeatureTypeLabel(value: (typeof PROJECT_SPATIAL_FEATURE_TYPES)[number]) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function defaultMonitoringCriterionApplicabilityStatus(
  source: Pick<
    CriterionRowWithContext['criterionGroup']['standardSource'],
    'instrumentType' | 'legalStatus'
  >,
) {
  if (source.instrumentType === 'guidance_only' || source.legalStatus === 'guidance_only') {
    return 'reference_only' as const;
  }

  return 'applicable' as const;
}

function inferNoiseDescriptorMetric(
  dto: Pick<
    CreateProjectEnvironmentalNoiseResultRowDto,
    'descriptorMetric' | 'laeq15min' | 'lamax' | 'laf1_1min'
  >,
  criterionRow: CriterionRowWithContext | null,
) {
  const explicitMetric = normalizeOptionalString(dto.descriptorMetric);
  if (explicitMetric) {
    return explicitMetric;
  }

  if (normalizeOptionalString(dto.laeq15min)) {
    return 'laeq_15min';
  }
  if (normalizeOptionalString(dto.lamax)) {
    return 'lamax';
  }
  if (normalizeOptionalString(dto.laf1_1min)) {
    return 'laf1_1min';
  }

  return criterionRow ? inferCriterionMetricLabel(criterionRow) : null;
}

function inferNoiseMeasuredValue(
  dto: Pick<
    CreateProjectEnvironmentalNoiseResultRowDto,
    'descriptorMetric' | 'measuredValue' | 'laeq15min' | 'lamax' | 'laf1_1min'
  >,
  descriptorMetric: string | null,
) {
  const explicitValue = normalizeOptionalString(dto.measuredValue);
  if (explicitValue) {
    return explicitValue;
  }

  switch (descriptorMetric) {
    case 'laeq_15min':
      return normalizeOptionalString(dto.laeq15min);
    case 'lamax':
      return normalizeOptionalString(dto.lamax);
    case 'laf1_1min':
      return normalizeOptionalString(dto.laf1_1min);
    default:
      return null;
  }
}

function inferNoiseMeasuredUnit(
  dto: Pick<CreateProjectEnvironmentalNoiseResultRowDto, 'measuredUnit'>,
  descriptorMetric: string | null,
) {
  const explicitUnit = normalizeOptionalString(dto.measuredUnit);
  if (explicitUnit) {
    return explicitUnit;
  }

  return descriptorMetric ? 'dB' : null;
}

function inferCriterionMetricLabel(row: Pick<CriterionRowWithContext, 'criterionGroup'>) {
  return row.criterionGroup.metric === 'none' ? null : row.criterionGroup.metric;
}

function buildNoiseResultCreateData(
  reportId: string,
  dto: CreateProjectEnvironmentalNoiseResultRowDto,
  selectedCriterion: Prisma.ProjectEnvironmentalMonitoringSelectedCriterionGetPayload<{
    include: {
      criterionRow: {
        include: typeof criterionRowInclude;
      };
    };
  }> | null,
  sortOrder: number,
): Prisma.ProjectEnvironmentalNoiseResultRowUncheckedCreateInput {
  const resolvedCriterionRowId = selectedCriterion?.criterionRowId ?? dto.criterionRowId ?? null;
  const descriptorMetric =
    normalizeOptionalString(dto.descriptorMetric) ??
    inferNoiseDescriptorMetric(dto, selectedCriterion?.criterionRow ?? null);
  const measuredValue =
    normalizeOptionalString(dto.measuredValue) ?? inferNoiseMeasuredValue(dto, descriptorMetric);
  const measuredUnit =
    normalizeOptionalString(dto.measuredUnit) ??
    selectedCriterion?.criterionRow.unit ??
    inferNoiseMeasuredUnit(dto, descriptorMetric);

  return {
    monitoringReportId: reportId,
    locationId: dto.locationId ?? null,
    observedAt: dto.observedAt ? new Date(dto.observedAt) : null,
    activityLabel: dto.activityLabel,
    instrumentNote: dto.instrumentNote ?? null,
    measurementPeriodNote: dto.measurementPeriodNote ?? null,
    descriptorMetric,
    measuredValue,
    measuredUnit,
    laeq15min: dto.laeq15min ?? null,
    lamax: dto.lamax ?? null,
    laf1_1min: dto.laf1_1min ?? null,
    backgroundNote: dto.backgroundNote ?? null,
    selectedCriterionId: selectedCriterion?.id ?? dto.selectedCriterionId ?? null,
    criterionRowId: resolvedCriterionRowId,
    complianceStatus: dto.complianceStatus ?? 'not_assessed',
    resultNote: dto.resultNote ?? null,
    sortOrder,
  };
}

function buildNoiseResultUpdateData(
  dto: UpdateProjectEnvironmentalNoiseResultRowDto,
  selectedCriterion: Prisma.ProjectEnvironmentalMonitoringSelectedCriterionGetPayload<{
    include: {
      criterionRow: {
        include: typeof criterionRowInclude;
      };
    };
  }> | null,
  current: {
    criterionRowId: string | null;
    selectedCriterionId: string | null;
  },
) {
  const data = pickDefined(dto, [
    'locationId',
    'activityLabel',
    'instrumentNote',
    'measurementPeriodNote',
    'descriptorMetric',
    'measuredValue',
    'measuredUnit',
    'laeq15min',
    'lamax',
    'laf1_1min',
    'backgroundNote',
    'complianceStatus',
    'resultNote',
    'sortOrder',
  ]) as Prisma.ProjectEnvironmentalNoiseResultRowUncheckedUpdateInput;
  const resolvedCriterionRowId =
    dto.criterionRowId ?? selectedCriterion?.criterionRowId ?? current.criterionRowId;
  const resolvedSelectedCriterionId =
    dto.selectedCriterionId !== undefined
      ? (dto.selectedCriterionId ?? null)
      : (selectedCriterion?.id ?? current.selectedCriterionId);

  data.criterionRowId = resolvedCriterionRowId;
  data.selectedCriterionId = resolvedSelectedCriterionId;

  if (
    dto.descriptorMetric !== undefined ||
    dto.measuredValue !== undefined ||
    dto.measuredUnit !== undefined
  ) {
    data.descriptorMetric =
      dto.descriptorMetric !== undefined
        ? normalizeOptionalString(dto.descriptorMetric)
        : undefined;
    data.measuredValue =
      dto.measuredValue !== undefined ? normalizeOptionalString(dto.measuredValue) : undefined;
    data.measuredUnit =
      dto.measuredUnit !== undefined ? normalizeOptionalString(dto.measuredUnit) : undefined;
  } else if (selectedCriterion) {
    data.descriptorMetric = inferCriterionMetricLabel(selectedCriterion.criterionRow);
    if (!current.selectedCriterionId || current.selectedCriterionId !== selectedCriterion.id) {
      data.measuredUnit = selectedCriterion.criterionRow.unit ?? undefined;
    }
  }

  assignDateField(data, 'observedAt', dto.observedAt);

  return data;
}

function buildVibrationResultCreateData(
  reportId: string,
  dto: CreateProjectEnvironmentalVibrationResultRowDto,
  sortOrder: number,
): Prisma.ProjectEnvironmentalVibrationResultRowUncheckedCreateInput {
  return {
    monitoringReportId: reportId,
    locationId: dto.locationId ?? null,
    observedAt: dto.observedAt ? new Date(dto.observedAt) : null,
    activityLabel: dto.activityLabel,
    instrumentNote: dto.instrumentNote ?? null,
    metricType: dto.metricType,
    ppvValue: dto.ppvValue ?? null,
    vdvValue: dto.vdvValue ?? null,
    linPeakValue: dto.linPeakValue ?? null,
    dominantFrequencyHz: dto.dominantFrequencyHz ?? null,
    axisNote: dto.axisNote ?? null,
    criterionRowId: dto.criterionRowId ?? null,
    complianceStatus: dto.complianceStatus ?? 'not_assessed',
    resultNote: dto.resultNote ?? null,
    sortOrder,
  };
}

function buildVibrationResultUpdateData(dto: UpdateProjectEnvironmentalVibrationResultRowDto) {
  const data = pickDefined(dto, [
    'locationId',
    'activityLabel',
    'instrumentNote',
    'metricType',
    'ppvValue',
    'vdvValue',
    'linPeakValue',
    'dominantFrequencyHz',
    'axisNote',
    'criterionRowId',
    'complianceStatus',
    'resultNote',
    'sortOrder',
  ]) as Prisma.ProjectEnvironmentalVibrationResultRowUncheckedUpdateInput;

  assignDateField(data, 'observedAt', dto.observedAt);

  return data;
}

function metricKeyToImportJobType(metricKey: string) {
  switch (metricKey) {
    case 'vtop':
      return MonitoringImportJobType.import_peak_records;
    case 'vdv':
      return MonitoringImportJobType.import_vdv_records;
    case 'veff_max':
      return MonitoringImportJobType.import_veff_records;
    default:
      return null;
  }
}

function assignDateField<T extends Record<string, unknown>>(
  data: T,
  key: keyof T,
  value: string | null | undefined,
) {
  if (value !== undefined) {
    (data as Record<string, Date | null>)[key as string] = value ? new Date(value) : null;
  }
}

function serializeMonitoringReport(report: EnvironmentalMonitoringReportWithContext) {
  const snapshot = serializeMonitoringReportSnapshot(report);

  return {
    ...snapshot,
    packageIssues: report.packageIssues.map((packageIssue) =>
      serializeMonitoringReportPackageIssueSummary(packageIssue),
    ),
  };
}

function serializeMonitoringReportSnapshot(report: EnvironmentalMonitoringReportWithContext) {
  return {
    ...report,
    issueDate: serializeDate(report.issueDate),
    monitoringDate: serializeDate(report.monitoringDate),
    monitoringWindowStart: serializeDate(report.monitoringWindowStart),
    monitoringWindowEnd: serializeDate(report.monitoringWindowEnd),
    packageIssues: undefined,
    annexures: report.annexures.map((annexure) => serializeMonitoringAnnexure(annexure)),
    selectedCriteria: report.selectedCriteria.map((selection) => ({
      ...selection,
      criterionRow: serializeCriterionRow(selection.criterionRow),
    })),
    noiseResults: report.noiseResults.map((row) => ({
      ...row,
      observedAt: serializeDate(row.observedAt),
      measuredValue: serializeDecimal(row.measuredValue),
      laeq15min: serializeDecimal(row.laeq15min),
      lamax: serializeDecimal(row.lamax),
      laf1_1min: serializeDecimal(row.laf1_1min),
      criterionRow: row.criterionRow ? serializeCriterionRow(row.criterionRow) : null,
    })),
    vibrationResults: report.vibrationResults.map((row) => ({
      ...row,
      observedAt: serializeDate(row.observedAt),
      ppvValue: serializeDecimal(row.ppvValue),
      vdvValue: serializeDecimal(row.vdvValue),
      linPeakValue: serializeDecimal(row.linPeakValue),
      dominantFrequencyHz: serializeDecimal(row.dominantFrequencyHz),
      criterionRow: row.criterionRow ? serializeCriterionRow(row.criterionRow) : null,
    })),
    recommendations: report.recommendations.map((row) => ({
      ...row,
      dueDate: serializeDate(row.dueDate),
    })),
  };
}

function serializeMonitoringReportSummary(report: EnvironmentalMonitoringReportSummary) {
  return {
    ...report,
    issueDate: serializeDate(report.issueDate),
  };
}

function serializeMonitoringReportPackageIssueSummary(
  issue: EnvironmentalMonitoringReportPackageIssueRecord,
) {
  return {
    id: issue.id,
    monitoringReportId: issue.monitoringReportId,
    issueLabel: issue.issueLabel,
    revision: issue.revision,
    documentStatus: issue.documentStatus,
    issueDate: serializeDate(issue.issueDate),
    preparedBy: issue.preparedBy,
    checkedBy: issue.checkedBy,
    approvedBy: issue.approvedBy,
    createdAt: serializeDate(issue.createdAt),
    createdBy: issue.createdBy,
  };
}

function serializeMonitoringReportPackageIssue(
  issue: EnvironmentalMonitoringReportPackageIssueRecord,
) {
  return {
    ...serializeMonitoringReportPackageIssueSummary(issue),
    reportSnapshotJson: normalizeJsonRecord(issue.reportSnapshotJson),
    packageSnapshotJson: normalizeJsonRecord(issue.packageSnapshotJson),
  };
}

function buildMonitoringReportPackageSnapshot(args: {
  approvedBy: string | null;
  checkedBy: string | null;
  documentStatus: string | null;
  issueDate: Date | null;
  issueLabel: string;
  preparedBy: string | null;
  project: {
    code: string | null;
    metadata: Prisma.JsonValue;
    name: string;
  };
  report: ReturnType<typeof serializeMonitoringReportSnapshot>;
  revision: string | null;
}): MonitoringReportPackageSnapshot {
  const {
    approvedBy,
    checkedBy,
    documentStatus,
    issueDate,
    issueLabel,
    preparedBy,
    project,
    report,
    revision,
  } = args;

  return {
    annexureRegister: report.annexures.map((annexure, index) => ({
      annexureCode: annexureCodeFromIndex(index),
      id: annexure.id,
      sourceKind: annexure.templateSourceKind,
      sourceLabel: annexure.sourceLabel ?? null,
      templateLabel:
        annexure.bindingJson?.rootSheetTemplateSnapshot?.label ??
        parseMonitoringRootSheetTemplateLabel(annexure.templateSnapshotJson) ??
        resolveBuiltInSheetTemplateReferenceLabel(annexure.templateReferenceId) ??
        null,
      title: annexure.title,
    })),
    approvedBy,
    checkedBy,
    documentStatus,
    issueDate: serializeDate(issueDate),
    issueLabel,
    preparedBy,
    projectIdentity: resolveMonitoringPackageProjectIdentity(project),
    reportTitle: displayMonitoringReportTitleSnapshot(report),
    reportTypeLabel: labelForMonitoringReportType(report.reportType),
    revision,
  };
}

function resolveMonitoringReportSeed(project: {
  code: string | null;
  metadata: Prisma.JsonValue;
  name: string;
}) {
  const projectSpecifics = getProjectSpecificsFromProjectMetadata(project.metadata, {
    projectName: project.name,
    projectNumber: project.code ?? undefined,
  });
  const reportMeta = projectSpecifics?.reportMeta;

  return {
    revision: normalizeOptionalString(reportMeta?.reportRevision),
    issueDate: parseOptionalDate(reportMeta?.issueDate),
    preparedBy: normalizeOptionalString(reportMeta?.preparedBy),
    checkedBy: normalizeOptionalString(reportMeta?.checkedBy),
    purpose: normalizeOptionalString(reportMeta?.purpose),
  };
}

function resolveMonitoringPackageProjectIdentity(project: {
  code: string | null;
  metadata: Prisma.JsonValue;
  name: string;
}): MonitoringPackageProjectIdentitySnapshot {
  const projectSpecifics = getProjectSpecificsFromProjectMetadata(project.metadata, {
    projectName: project.name,
    projectNumber: project.code ?? undefined,
  });
  const identity = projectSpecifics?.identity;

  return {
    projectNumber: normalizeOptionalString(identity?.projectNumber) ?? project.code ?? 'Not set',
    projectName:
      normalizeOptionalString(identity?.projectName) ?? project.name ?? 'Untitled Project',
    client: normalizeOptionalString(identity?.client) ?? 'Not set',
    address: normalizeOptionalString(identity?.address) ?? 'Not set',
  };
}

function displayMonitoringReportTitleSnapshot(
  report: ReturnType<typeof serializeMonitoringReportSnapshot>,
) {
  return normalizeOptionalString(report.title) ?? labelForMonitoringReportType(report.reportType);
}

function labelForMonitoringReportType(reportType: MonitoringReportType) {
  return reportType === 'noise_monitoring'
    ? 'Noise Monitoring Report'
    : 'Vibration Monitoring Report';
}

function defaultMonitoringAnnexureTitle(annexureType: MonitoringAnnexureType) {
  switch (annexureType) {
    case 'spatial_sheet':
      return 'Monitoring Location Plan';
  }
}

function defaultMonitoringAnnexureTemplateReferenceId(
  annexureType: MonitoringAnnexureType,
): string {
  switch (annexureType) {
    case 'spatial_sheet':
      // Monitoring Report Annexures should normally use a generic Root Sheet Template.
      // If an older compatibility fallback is required, prefer the generic A3 landscape map paper.
      return 'builtin-spatial-annexure-a3-landscape';
  }
}

function resolveMonitoringAnnexureTitle(
  value: string | null | undefined,
  annexureType: MonitoringAnnexureType,
) {
  return normalizeOptionalString(value) ?? defaultMonitoringAnnexureTitle(annexureType);
}

function resolveBuiltInSheetTemplateReferenceLabel(value: string | null | undefined) {
  switch (value) {
    case 'builtin-spatial-annexure-a3-landscape':
      return 'A3 Landscape Map Sheet';
    case 'builtin-spatial-annexure-a4-landscape':
      return 'A4 Landscape Map Sheet';
    default:
      return normalizeOptionalString(value);
  }
}

function normalizeOptionalString(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function parseOptionalDate(value: string | null | undefined) {
  if (!value?.trim()) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeMonitoringAnnexureBindingJson(
  annexureType: MonitoringAnnexureType,
  value: Record<string, unknown> | null | undefined,
) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return Prisma.JsonNull;
  }

  switch (annexureType) {
    case 'spatial_sheet': {
      const binding = parseMonitoringSpatialAnnexureBinding(value);
      if (!binding) {
        throw new BadRequestException(
          'bindingJson must be a spatial view snapshot with basemap, visible layers, geology toggle, view state, and an optional Root Sheet Template snapshot',
        );
      }

      return binding as Prisma.InputJsonValue;
    }
  }
}

function normalizeMonitoringAnnexureTemplateSnapshotJson(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException('templateSnapshotJson must be an object when provided');
  }

  return value as Record<string, unknown>;
}

function assertMonitoringSpatialTemplateCompatibility(
  templateSnapshotJson: Record<string, unknown> | null | undefined,
) {
  const objects = Array.isArray(templateSnapshotJson?.objects)
    ? (templateSnapshotJson.objects as Array<Record<string, unknown>>)
    : [];

  if (!objects.some((object) => object?.type === 'mapFrame')) {
    throw new BadRequestException(
      'Selected Root Sheet Template must include a mapFrame block for spatial Report Annexures',
    );
  }
}

function serializeMonitoringAnnexure(
  annexure: EnvironmentalMonitoringReportWithContext['annexures'][number],
) {
  return {
    ...annexure,
    // Annexures render from the persisted imported snapshot, not from any browser-local saved-view id.
    bindingJson: parseMonitoringSpatialAnnexureBinding(annexure.bindingJson),
  };
}

function parseMonitoringSpatialAnnexureBinding(
  value: unknown,
): MonitoringSpatialAnnexureBinding | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const activeBasemap = parseMonitoringSpatialAnnexureBasemap(record.activeBasemap);
  const viewState = parseMonitoringSpatialAnnexureViewState(record.viewState);

  if (!activeBasemap || typeof record.showGeologyOverlay !== 'boolean' || !viewState) {
    return null;
  }

  return {
    activeBasemap,
    rootSheetTemplateSnapshot: parseMonitoringRootSheetTemplateSnapshot(
      record.rootSheetTemplateSnapshot,
    ),
    showGeologyOverlay: record.showGeologyOverlay,
    visibleFeatureTypes: parseMonitoringSpatialFeatureTypes(record.visibleFeatureTypes),
    viewState,
  };
}

function parseMonitoringSpatialFeatureTypes(
  value: unknown,
): Array<(typeof PROJECT_SPATIAL_FEATURE_TYPES)[number]> {
  const rawFeatureTypes = Array.isArray(value) ? value : PROJECT_SPATIAL_FEATURE_TYPES;
  const visibleFeatureTypes = rawFeatureTypes.filter(
    (featureType): featureType is (typeof PROJECT_SPATIAL_FEATURE_TYPES)[number] =>
      PROJECT_SPATIAL_FEATURE_TYPES.includes(
        featureType as (typeof PROJECT_SPATIAL_FEATURE_TYPES)[number],
      ),
  );

  return visibleFeatureTypes.length > 0 ? visibleFeatureTypes : [...PROJECT_SPATIAL_FEATURE_TYPES];
}

function parseMonitoringSpatialAnnexureBasemap(
  value: unknown,
): MonitoringSpatialAnnexureBasemap | null {
  return value === 'osm' || value === 'nsw_aerial_imagery' || value === 'nsw_topographic'
    ? value
    : null;
}

function parseMonitoringSpatialAnnexureViewState(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const center = Array.isArray(record.centerLonLat) ? record.centerLonLat : [];
  const longitude = Number(center[0]);
  const latitude = Number(center[1]);
  const rotation = Number(record.rotation);
  const zoomRaw = record.zoom;
  const zoom =
    zoomRaw === undefined || zoomRaw === null || zoomRaw === '' ? undefined : Number(zoomRaw);

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
    return null;
  }

  return {
    centerLonLat: [longitude, latitude] as [number, number],
    rotation,
    zoom,
  };
}

function parseMonitoringRootSheetTemplateSnapshot(
  value: unknown,
): MonitoringRootSheetTemplateSnapshot | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (
    typeof record.id !== 'string' ||
    !record.id.trim() ||
    typeof record.label !== 'string' ||
    !record.label.trim() ||
    typeof record.versionId !== 'string' ||
    !record.versionId.trim() ||
    !record.templateDocument ||
    typeof record.templateDocument !== 'object' ||
    Array.isArray(record.templateDocument)
  ) {
    return null;
  }

  return {
    id: record.id.trim(),
    label: record.label.trim(),
    templateDocument: record.templateDocument as Record<string, unknown>,
    versionId: record.versionId.trim(),
  };
}

function parseMonitoringRootSheetTemplateLabel(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  return typeof record.label === 'string' && record.label.trim() ? record.label.trim() : null;
}

function serializeCriterionRow(row: CriterionRowWithContext) {
  const { criterionGroup, workTypes, ...criterionRow } = row;
  const { standardSource, ...group } = criterionGroup;

  return {
    ...criterionRow,
    relativeOffset: serializeDecimal(criterionRow.relativeOffset),
    criterionValue: serializeDecimal(criterionRow.criterionValue),
    preferredValue: serializeDecimal(criterionRow.preferredValue),
    maximumValue: serializeDecimal(criterionRow.maximumValue),
    alertValue: serializeDecimal(criterionRow.alertValue),
    stopWorkValue: serializeDecimal(criterionRow.stopWorkValue),
    absoluteMaxValue: serializeDecimal(criterionRow.absoluteMaxValue),
    valueMin: serializeDecimal(criterionRow.valueMin),
    valueMax: serializeDecimal(criterionRow.valueMax),
    frequencyMinHz: serializeDecimal(criterionRow.frequencyMinHz),
    frequencyMaxHz: serializeDecimal(criterionRow.frequencyMaxHz),
    exceedanceAllowancePercent: serializeDecimal(criterionRow.exceedanceAllowancePercent),
    workTypes: workTypes.map((workType) => workType.workType),
    group,
    source: standardSource,
  };
}

function serializeDecimal(value: Prisma.Decimal | null) {
  return value === null ? null : value.toString();
}

function serializeDate(value: Date | null) {
  return value?.toISOString() ?? null;
}

function normalizeJsonRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function freezeJsonRecord<T extends Record<string, unknown>>(value: T) {
  return JSON.parse(JSON.stringify(value)) as T;
}

function cloneNullableJsonInput(value: Prisma.JsonValue | null) {
  if (value === null) {
    return Prisma.JsonNull;
  }

  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function annexureCodeFromIndex(index: number) {
  let value = index;
  let label = '';

  do {
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26) - 1;
  } while (value >= 0);

  return label;
}

function pickDefined<T extends object, K extends keyof T>(
  value: T,
  keys: K[],
): Partial<Pick<T, K>> {
  return keys.reduce(
    (result, key) => {
      if (value[key] !== undefined) {
        result[key] = value[key];
      }
      return result;
    },
    {} as Partial<Pick<T, K>>,
  );
}

function defaultReportTitle(reportType: MonitoringReportType) {
  return reportType === 'noise_monitoring'
    ? 'Noise Monitoring Report'
    : 'Vibration Monitoring Report';
}

function buildDuplicatedMonitoringReportTitle(value: string) {
  const suffix = ' Copy';
  const normalized = value.trim() || 'Monitoring Report';
  const base = normalized.slice(0, Math.max(1, 300 - suffix.length)).trimEnd();

  return `${base || 'Monitoring Report'}${suffix}`;
}

function throwFriendlyUniqueError(error: unknown, message: string): never {
  if (isUniqueConstraintError(error)) {
    throw new ConflictException(message);
  }
  throw error;
}

function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}
