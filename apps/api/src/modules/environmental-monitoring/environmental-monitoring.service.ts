import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import type {
  CreateProjectEnvironmentalMonitoringLocationDto,
  CreateProjectEnvironmentalMonitoringObservationDto,
  CreateProjectEnvironmentalMonitoringRecommendationDto,
  CreateProjectEnvironmentalMonitoringReferenceDto,
  CreateProjectEnvironmentalMonitoringReportDto,
  CreateProjectEnvironmentalMonitoringSelectedCriterionDto,
  CreateProjectEnvironmentalNoiseResultRowDto,
  CreateProjectEnvironmentalVibrationResultRowDto,
  UpdateProjectEnvironmentalMonitoringLocationDto,
  UpdateProjectEnvironmentalMonitoringObservationDto,
  UpdateProjectEnvironmentalMonitoringRecommendationDto,
  UpdateProjectEnvironmentalMonitoringReferenceDto,
  UpdateProjectEnvironmentalMonitoringReportDto,
  UpdateProjectEnvironmentalMonitoringSelectedCriterionDto,
  UpdateProjectEnvironmentalNoiseResultRowDto,
  UpdateProjectEnvironmentalVibrationResultRowDto,
} from './dto/environmental-monitoring.dto';

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

type MonitoringReportType = 'noise_monitoring' | 'vibration_monitoring';

@Injectable()
export class ProjectEnvironmentalMonitoringService {
  constructor(private readonly prisma: PrismaService) {}

  async listForProject(access: ProjectAccess) {
    await this.assertProjectReadAccess(access);
    const reports = await this.prisma.projectEnvironmentalMonitoringReport.findMany({
      where: { projectId: access.projectId },
      select: environmentalMonitoringReportSummarySelect,
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    });

    return reports.map(serializeMonitoringReportSummary);
  }

  async createReport(access: ProjectAccess, dto: CreateProjectEnvironmentalMonitoringReportDto) {
    await this.assertProjectWriteAccess(access);

    const report = await this.prisma.projectEnvironmentalMonitoringReport.create({
      data: {
        projectId: access.projectId,
        reportType: dto.reportType,
        title: dto.title?.trim() || defaultReportTitle(dto.reportType),
        documentStatus: 'draft',
      },
      include: environmentalMonitoringReportInclude,
    });

    return serializeMonitoringReport(report);
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
        receiverType: dto.receiverType,
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

  async createSelectedCriterion(
    access: ProjectAccess,
    reportId: string,
    dto: CreateProjectEnvironmentalMonitoringSelectedCriterionDto,
  ) {
    await this.assertProjectWriteAccess(access);
    await this.assertMonitoringReportExists(access.projectId, reportId);
    await this.assertCriterionRowExists(dto.criterionRowId);

    try {
      await this.prisma.projectEnvironmentalMonitoringSelectedCriterion.create({
        data: {
          monitoringReportId: reportId,
          criterionRowId: dto.criterionRowId,
          selectionPurpose: dto.selectionPurpose,
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
    await this.assertCriterionRowExists(dto.criterionRowId);

    await this.prisma.projectEnvironmentalNoiseResultRow.create({
      data: buildNoiseResultCreateData(
        reportId,
        dto,
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
    await this.assertNoiseResultExists(reportId, id);
    await this.assertLocationBelongsToReport(reportId, dto.locationId);
    await this.assertCriterionRowExists(dto.criterionRowId);

    await this.prisma.projectEnvironmentalNoiseResultRow.update({
      where: { id },
      data: buildNoiseResultUpdateData(dto),
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

  async createObservation(
    access: ProjectAccess,
    reportId: string,
    dto: CreateProjectEnvironmentalMonitoringObservationDto,
  ) {
    await this.assertProjectWriteAccess(access);
    await this.assertMonitoringReportExists(access.projectId, reportId);

    await this.prisma.projectEnvironmentalMonitoringObservation.create({
      data: {
        monitoringReportId: reportId,
        category: dto.category,
        observation: dto.observation,
        implicationNote: dto.implicationNote,
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

    await this.prisma.projectEnvironmentalMonitoringObservation.update({
      where: { id },
      data: pickDefined(dto, [
        'category',
        'observation',
        'implicationNote',
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

    await this.prisma.projectEnvironmentalMonitoringRecommendation.create({
      data: {
        monitoringReportId: reportId,
        category: dto.category,
        recommendation: dto.recommendation,
        priority: dto.priority,
        responsibility: dto.responsibility,
        timingNote: dto.timingNote,
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

    await this.prisma.projectEnvironmentalMonitoringRecommendation.update({
      where: { id },
      data: pickDefined(dto, [
        'category',
        'recommendation',
        'priority',
        'responsibility',
        'timingNote',
        'sortOrder',
      ]) as Prisma.ProjectEnvironmentalMonitoringRecommendationUncheckedUpdateInput,
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
    const report = await this.prisma.projectEnvironmentalMonitoringReport.findUnique({
      where: { id: reportId },
      include: environmentalMonitoringReportInclude,
    });
    if (!report) {
      throw new NotFoundException('Environmental monitoring report not found');
    }
    return serializeMonitoringReport(report);
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

    const criterion = await this.prisma.noiseVibrationCriterionRow.findUnique({
      where: { id: criterionRowId },
      select: { id: true },
    });
    if (!criterion) {
      throw new NotFoundException('Noise/vibration criterion row not found');
    }
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

  private async assertReferenceExists(reportId: string, id: string) {
    await this.assertChildExists(
      this.prisma.projectEnvironmentalMonitoringReference.findFirst({
        where: { id, monitoringReportId: reportId },
        select: { id: true },
      }),
      'Monitoring reference not found',
    );
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

  private async assertNoiseResultExists(reportId: string, id: string) {
    await this.assertChildExists(
      this.prisma.projectEnvironmentalNoiseResultRow.findFirst({
        where: { id, monitoringReportId: reportId },
        select: { id: true },
      }),
      'Noise result row not found',
    );
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

function buildNoiseResultCreateData(
  reportId: string,
  dto: CreateProjectEnvironmentalNoiseResultRowDto,
  sortOrder: number,
): Prisma.ProjectEnvironmentalNoiseResultRowUncheckedCreateInput {
  return {
    monitoringReportId: reportId,
    locationId: dto.locationId ?? null,
    observedAt: dto.observedAt ? new Date(dto.observedAt) : null,
    activityLabel: dto.activityLabel,
    instrumentNote: dto.instrumentNote ?? null,
    measurementPeriodNote: dto.measurementPeriodNote ?? null,
    laeq15min: dto.laeq15min ?? null,
    lamax: dto.lamax ?? null,
    laf1_1min: dto.laf1_1min ?? null,
    backgroundNote: dto.backgroundNote ?? null,
    criterionRowId: dto.criterionRowId ?? null,
    complianceStatus: dto.complianceStatus ?? 'not_assessed',
    resultNote: dto.resultNote ?? null,
    sortOrder,
  };
}

function buildNoiseResultUpdateData(dto: UpdateProjectEnvironmentalNoiseResultRowDto) {
  const data = pickDefined(dto, [
    'locationId',
    'activityLabel',
    'instrumentNote',
    'measurementPeriodNote',
    'laeq15min',
    'lamax',
    'laf1_1min',
    'backgroundNote',
    'criterionRowId',
    'complianceStatus',
    'resultNote',
    'sortOrder',
  ]) as Prisma.ProjectEnvironmentalNoiseResultRowUncheckedUpdateInput;

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
  return {
    ...report,
    issueDate: serializeDate(report.issueDate),
    monitoringDate: serializeDate(report.monitoringDate),
    monitoringWindowStart: serializeDate(report.monitoringWindowStart),
    monitoringWindowEnd: serializeDate(report.monitoringWindowEnd),
    selectedCriteria: report.selectedCriteria.map((selection) => ({
      ...selection,
      criterionRow: serializeCriterionRow(selection.criterionRow),
    })),
    noiseResults: report.noiseResults.map((row) => ({
      ...row,
      observedAt: serializeDate(row.observedAt),
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
  };
}

function serializeMonitoringReportSummary(report: EnvironmentalMonitoringReportSummary) {
  return {
    ...report,
    issueDate: serializeDate(report.issueDate),
  };
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

function throwFriendlyUniqueError(error: unknown, message: string): never {
  if (isUniqueConstraintError(error)) {
    throw new ConflictException(message);
  }
  throw error;
}

function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}
