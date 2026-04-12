import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateProjectCnvmpActivityDto,
  CreateProjectCnvmpMitigationMeasureDto,
  CreateProjectCnvmpMonitoringRowDto,
  CreateProjectCnvmpReceiverDto,
  CreateProjectCnvmpReferenceDto,
  CreateProjectCnvmpSelectedCriterionDto,
  CreateProjectCnvmpSelectedSourceDto,
  UpdateProjectCnvmpActivityDto,
  UpdateProjectCnvmpDto,
  UpdateProjectCnvmpMitigationMeasureDto,
  UpdateProjectCnvmpMonitoringRowDto,
  UpdateProjectCnvmpReceiverDto,
  UpdateProjectCnvmpReferenceDto,
  UpdateProjectCnvmpSelectedCriterionDto,
  UpdateProjectCnvmpSelectedSourceDto,
} from './dto/cnvmp.dto';

type ProjectAccess = {
  projectId: string;
  organisationId: string;
  userId: string;
  orgRole?: string;
};

type CriterionRowWithContext = Prisma.NoiseVibrationCriterionRowGetPayload<{
  include: typeof criterionRowInclude;
}>;

type ProjectCnvmpWithContext = Prisma.ProjectCnvmpGetPayload<{
  include: typeof projectCnvmpInclude;
}>;

@Injectable()
export class ProjectCnvmpService {
  constructor(private readonly prisma: PrismaService) {}

  async findForProject(access: ProjectAccess) {
    await this.assertProjectReadAccess(access);
    const cnvmp = await this.getOrCreateProjectCnvmp(access.projectId);
    return serializeProjectCnvmp(cnvmp);
  }

  async updateForProject(access: ProjectAccess, dto: UpdateProjectCnvmpDto) {
    await this.assertProjectWriteAccess(access);
    const cnvmp = await this.getOrCreateProjectCnvmp(access.projectId);

    await this.prisma.projectCnvmp.update({
      where: { id: cnvmp.id },
      data: buildProjectCnvmpUpdateData(dto),
    });

    return this.findExistingProjectCnvmp(cnvmp.id);
  }

  async createReference(access: ProjectAccess, dto: CreateProjectCnvmpReferenceDto) {
    await this.assertProjectWriteAccess(access);
    const cnvmp = await this.getOrCreateProjectCnvmp(access.projectId);
    await this.assertAiDocumentBelongsToProject(access, dto.aiDocumentId);

    await this.prisma.projectCnvmpReference.create({
      data: {
        projectCnvmpId: cnvmp.id,
        projectReferenceId: dto.projectReferenceId,
        aiDocumentId: dto.aiDocumentId,
        label: dto.label,
        note: dto.note,
        sortOrder:
          dto.sortOrder ??
          (await this.prisma.projectCnvmpReference.count({
            where: { projectCnvmpId: cnvmp.id },
          })),
      },
    });

    return this.findExistingProjectCnvmp(cnvmp.id);
  }

  async updateReference(access: ProjectAccess, id: string, dto: UpdateProjectCnvmpReferenceDto) {
    await this.assertProjectWriteAccess(access);
    const cnvmp = await this.getOrCreateProjectCnvmp(access.projectId);
    await this.assertReferenceExists(cnvmp.id, id);
    await this.assertAiDocumentBelongsToProject(access, dto.aiDocumentId);

    await this.prisma.projectCnvmpReference.update({
      where: { id },
      data: pickDefined(dto, [
        'projectReferenceId',
        'aiDocumentId',
        'label',
        'note',
        'sortOrder',
      ]) as Prisma.ProjectCnvmpReferenceUncheckedUpdateInput,
    });

    return this.findExistingProjectCnvmp(cnvmp.id);
  }

  async deleteReference(access: ProjectAccess, id: string) {
    await this.assertProjectWriteAccess(access);
    const cnvmp = await this.getOrCreateProjectCnvmp(access.projectId);
    await this.assertReferenceExists(cnvmp.id, id);
    await this.prisma.projectCnvmpReference.delete({ where: { id } });
    return this.findExistingProjectCnvmp(cnvmp.id);
  }

  async createReceiver(access: ProjectAccess, dto: CreateProjectCnvmpReceiverDto) {
    await this.assertProjectWriteAccess(access);
    const cnvmp = await this.getOrCreateProjectCnvmp(access.projectId);

    await this.prisma.projectCnvmpReceiver.create({
      data: {
        projectCnvmpId: cnvmp.id,
        label: dto.label,
        receiverType: dto.receiverType,
        locationDescription: dto.locationDescription,
        distanceNote: dto.distanceNote,
        sensitivityNote: dto.sensitivityNote,
        usePeriodNote: dto.usePeriodNote,
        isHeritage: dto.isHeritage ?? false,
        isCritical: dto.isCritical ?? false,
        assessmentLocationBasis: dto.assessmentLocationBasis,
        sortOrder:
          dto.sortOrder ??
          (await this.prisma.projectCnvmpReceiver.count({
            where: { projectCnvmpId: cnvmp.id },
          })),
      },
    });

    return this.findExistingProjectCnvmp(cnvmp.id);
  }

  async updateReceiver(access: ProjectAccess, id: string, dto: UpdateProjectCnvmpReceiverDto) {
    await this.assertProjectWriteAccess(access);
    const cnvmp = await this.getOrCreateProjectCnvmp(access.projectId);
    await this.assertReceiverExists(cnvmp.id, id);

    await this.prisma.projectCnvmpReceiver.update({
      where: { id },
      data: pickDefined(dto, [
        'label',
        'receiverType',
        'locationDescription',
        'distanceNote',
        'sensitivityNote',
        'usePeriodNote',
        'isHeritage',
        'isCritical',
        'assessmentLocationBasis',
        'sortOrder',
      ]) as Prisma.ProjectCnvmpReceiverUncheckedUpdateInput,
    });

    return this.findExistingProjectCnvmp(cnvmp.id);
  }

  async deleteReceiver(access: ProjectAccess, id: string) {
    await this.assertProjectWriteAccess(access);
    const cnvmp = await this.getOrCreateProjectCnvmp(access.projectId);
    await this.assertReceiverExists(cnvmp.id, id);
    await this.prisma.projectCnvmpReceiver.delete({ where: { id } });
    return this.findExistingProjectCnvmp(cnvmp.id);
  }

  async createActivity(access: ProjectAccess, dto: CreateProjectCnvmpActivityDto) {
    await this.assertProjectWriteAccess(access);
    const cnvmp = await this.getOrCreateProjectCnvmp(access.projectId);

    await this.prisma.projectCnvmpActivity.create({
      data: {
        projectCnvmpId: cnvmp.id,
        label: dto.label,
        workType: dto.workType,
        description: dto.description,
        timingNote: dto.timingNote,
        isOutsideStandardHours: dto.isOutsideStandardHours ?? false,
        noiseRiskNote: dto.noiseRiskNote,
        vibrationRiskNote: dto.vibrationRiskNote,
        sortOrder:
          dto.sortOrder ??
          (await this.prisma.projectCnvmpActivity.count({
            where: { projectCnvmpId: cnvmp.id },
          })),
      },
    });

    return this.findExistingProjectCnvmp(cnvmp.id);
  }

  async updateActivity(access: ProjectAccess, id: string, dto: UpdateProjectCnvmpActivityDto) {
    await this.assertProjectWriteAccess(access);
    const cnvmp = await this.getOrCreateProjectCnvmp(access.projectId);
    await this.assertActivityExists(cnvmp.id, id);

    await this.prisma.projectCnvmpActivity.update({
      where: { id },
      data: pickDefined(dto, [
        'label',
        'workType',
        'description',
        'timingNote',
        'isOutsideStandardHours',
        'noiseRiskNote',
        'vibrationRiskNote',
        'sortOrder',
      ]) as Prisma.ProjectCnvmpActivityUncheckedUpdateInput,
    });

    return this.findExistingProjectCnvmp(cnvmp.id);
  }

  async deleteActivity(access: ProjectAccess, id: string) {
    await this.assertProjectWriteAccess(access);
    const cnvmp = await this.getOrCreateProjectCnvmp(access.projectId);
    await this.assertActivityExists(cnvmp.id, id);
    await this.prisma.projectCnvmpActivity.delete({ where: { id } });
    return this.findExistingProjectCnvmp(cnvmp.id);
  }

  async createSelectedSource(access: ProjectAccess, dto: CreateProjectCnvmpSelectedSourceDto) {
    await this.assertProjectWriteAccess(access);
    const cnvmp = await this.getOrCreateProjectCnvmp(access.projectId);
    await this.assertStandardSourceExists(dto.standardSourceId);

    try {
      await this.prisma.projectCnvmpSelectedSource.create({
        data: {
          projectCnvmpId: cnvmp.id,
          standardSourceId: dto.standardSourceId,
          isGuidanceOnly: dto.isGuidanceOnly ?? true,
          isEnforceableOnThisProject: dto.isEnforceableOnThisProject ?? false,
          projectConditionReference: dto.projectConditionReference,
          selectionNote: dto.selectionNote,
          sortOrder:
            dto.sortOrder ??
            (await this.prisma.projectCnvmpSelectedSource.count({
              where: { projectCnvmpId: cnvmp.id },
            })),
        },
      });
    } catch (error) {
      throwFriendlyUniqueError(error, 'This standards source is already selected for this CNVMP');
    }

    return this.findExistingProjectCnvmp(cnvmp.id);
  }

  async updateSelectedSource(
    access: ProjectAccess,
    id: string,
    dto: UpdateProjectCnvmpSelectedSourceDto,
  ) {
    await this.assertProjectWriteAccess(access);
    const cnvmp = await this.getOrCreateProjectCnvmp(access.projectId);
    await this.assertSelectedSourceExists(cnvmp.id, id);

    await this.prisma.projectCnvmpSelectedSource.update({
      where: { id },
      data: pickDefined(dto, [
        'isGuidanceOnly',
        'isEnforceableOnThisProject',
        'projectConditionReference',
        'selectionNote',
        'sortOrder',
      ]) as Prisma.ProjectCnvmpSelectedSourceUncheckedUpdateInput,
    });

    return this.findExistingProjectCnvmp(cnvmp.id);
  }

  async deleteSelectedSource(access: ProjectAccess, id: string) {
    await this.assertProjectWriteAccess(access);
    const cnvmp = await this.getOrCreateProjectCnvmp(access.projectId);
    await this.assertSelectedSourceExists(cnvmp.id, id);
    await this.prisma.projectCnvmpSelectedSource.delete({ where: { id } });
    return this.findExistingProjectCnvmp(cnvmp.id);
  }

  async createSelectedCriterion(
    access: ProjectAccess,
    dto: CreateProjectCnvmpSelectedCriterionDto,
  ) {
    await this.assertProjectWriteAccess(access);
    const cnvmp = await this.getOrCreateProjectCnvmp(access.projectId);
    await this.assertCriterionRowExists(dto.criterionRowId);

    try {
      await this.prisma.projectCnvmpSelectedCriterion.create({
        data: {
          projectCnvmpId: cnvmp.id,
          criterionRowId: dto.criterionRowId,
          selectionPurpose: dto.selectionPurpose,
          isEnforceableOnThisProject: dto.isEnforceableOnThisProject ?? false,
          projectConditionReference: dto.projectConditionReference,
          selectionNote: dto.selectionNote,
          sortOrder:
            dto.sortOrder ??
            (await this.prisma.projectCnvmpSelectedCriterion.count({
              where: { projectCnvmpId: cnvmp.id },
            })),
        },
      });
    } catch (error) {
      throwFriendlyUniqueError(
        error,
        'This criterion row is already selected for this purpose in this CNVMP',
      );
    }

    return this.findExistingProjectCnvmp(cnvmp.id);
  }

  async updateSelectedCriterion(
    access: ProjectAccess,
    id: string,
    dto: UpdateProjectCnvmpSelectedCriterionDto,
  ) {
    await this.assertProjectWriteAccess(access);
    const cnvmp = await this.getOrCreateProjectCnvmp(access.projectId);
    await this.assertSelectedCriterionExists(cnvmp.id, id);

    try {
      await this.prisma.projectCnvmpSelectedCriterion.update({
        where: { id },
        data: pickDefined(dto, [
          'selectionPurpose',
          'isEnforceableOnThisProject',
          'projectConditionReference',
          'selectionNote',
          'sortOrder',
        ]) as Prisma.ProjectCnvmpSelectedCriterionUncheckedUpdateInput,
      });
    } catch (error) {
      throwFriendlyUniqueError(
        error,
        'This criterion row is already selected for this purpose in this CNVMP',
      );
    }

    return this.findExistingProjectCnvmp(cnvmp.id);
  }

  async deleteSelectedCriterion(access: ProjectAccess, id: string) {
    await this.assertProjectWriteAccess(access);
    const cnvmp = await this.getOrCreateProjectCnvmp(access.projectId);
    await this.assertSelectedCriterionExists(cnvmp.id, id);
    await this.prisma.projectCnvmpSelectedCriterion.delete({ where: { id } });
    return this.findExistingProjectCnvmp(cnvmp.id);
  }

  async createMitigationMeasure(
    access: ProjectAccess,
    dto: CreateProjectCnvmpMitigationMeasureDto,
  ) {
    await this.assertProjectWriteAccess(access);
    const cnvmp = await this.getOrCreateProjectCnvmp(access.projectId);

    await this.prisma.projectCnvmpMitigationMeasure.create({
      data: {
        projectCnvmpId: cnvmp.id,
        category: dto.category,
        measure: dto.measure,
        triggerNote: dto.triggerNote,
        responsibility: dto.responsibility,
        timingStage: dto.timingStage,
        note: dto.note,
        sortOrder:
          dto.sortOrder ??
          (await this.prisma.projectCnvmpMitigationMeasure.count({
            where: { projectCnvmpId: cnvmp.id },
          })),
      },
    });

    return this.findExistingProjectCnvmp(cnvmp.id);
  }

  async updateMitigationMeasure(
    access: ProjectAccess,
    id: string,
    dto: UpdateProjectCnvmpMitigationMeasureDto,
  ) {
    await this.assertProjectWriteAccess(access);
    const cnvmp = await this.getOrCreateProjectCnvmp(access.projectId);
    await this.assertMitigationMeasureExists(cnvmp.id, id);

    await this.prisma.projectCnvmpMitigationMeasure.update({
      where: { id },
      data: pickDefined(dto, [
        'category',
        'measure',
        'triggerNote',
        'responsibility',
        'timingStage',
        'note',
        'sortOrder',
      ]) as Prisma.ProjectCnvmpMitigationMeasureUncheckedUpdateInput,
    });

    return this.findExistingProjectCnvmp(cnvmp.id);
  }

  async deleteMitigationMeasure(access: ProjectAccess, id: string) {
    await this.assertProjectWriteAccess(access);
    const cnvmp = await this.getOrCreateProjectCnvmp(access.projectId);
    await this.assertMitigationMeasureExists(cnvmp.id, id);
    await this.prisma.projectCnvmpMitigationMeasure.delete({ where: { id } });
    return this.findExistingProjectCnvmp(cnvmp.id);
  }

  async createMonitoringRow(access: ProjectAccess, dto: CreateProjectCnvmpMonitoringRowDto) {
    await this.assertProjectWriteAccess(access);
    const cnvmp = await this.getOrCreateProjectCnvmp(access.projectId);

    await this.prisma.projectCnvmpMonitoringRow.create({
      data: {
        projectCnvmpId: cnvmp.id,
        parameter: dto.parameter,
        method: dto.method,
        location: dto.location,
        frequency: dto.frequency,
        triggerAction: dto.triggerAction,
        responsibility: dto.responsibility,
        reportingNote: dto.reportingNote,
        sortOrder:
          dto.sortOrder ??
          (await this.prisma.projectCnvmpMonitoringRow.count({
            where: { projectCnvmpId: cnvmp.id },
          })),
      },
    });

    return this.findExistingProjectCnvmp(cnvmp.id);
  }

  async updateMonitoringRow(
    access: ProjectAccess,
    id: string,
    dto: UpdateProjectCnvmpMonitoringRowDto,
  ) {
    await this.assertProjectWriteAccess(access);
    const cnvmp = await this.getOrCreateProjectCnvmp(access.projectId);
    await this.assertMonitoringRowExists(cnvmp.id, id);

    await this.prisma.projectCnvmpMonitoringRow.update({
      where: { id },
      data: pickDefined(dto, [
        'parameter',
        'method',
        'location',
        'frequency',
        'triggerAction',
        'responsibility',
        'reportingNote',
        'sortOrder',
      ]) as Prisma.ProjectCnvmpMonitoringRowUncheckedUpdateInput,
    });

    return this.findExistingProjectCnvmp(cnvmp.id);
  }

  async deleteMonitoringRow(access: ProjectAccess, id: string) {
    await this.assertProjectWriteAccess(access);
    const cnvmp = await this.getOrCreateProjectCnvmp(access.projectId);
    await this.assertMonitoringRowExists(cnvmp.id, id);
    await this.prisma.projectCnvmpMonitoringRow.delete({ where: { id } });
    return this.findExistingProjectCnvmp(cnvmp.id);
  }

  private async getOrCreateProjectCnvmp(projectId: string): Promise<ProjectCnvmpWithContext> {
    const existing = await this.prisma.projectCnvmp.findUnique({
      where: { projectId },
      include: projectCnvmpInclude,
    });
    if (existing) {
      return existing;
    }

    try {
      return await this.prisma.projectCnvmp.create({
        data: {
          projectId,
          title: 'Construction Noise and Vibration Management Plan',
          documentStatus: 'draft',
          mitigationRows: {
            create: [
              {
                category: 'Planning',
                measure:
                  'Review construction methodology and sequence before noisy or vibration-intensive works begin.',
                triggerNote: 'Before high-risk works',
                responsibility: 'Construction team',
                timingStage: 'Pre-construction',
                sortOrder: 0,
              },
              {
                category: 'Plant and equipment',
                measure:
                  'Maintain plant, use fitted noise controls, and avoid unnecessary idling where practicable.',
                triggerNote: 'During construction',
                responsibility: 'Site supervisor',
                timingStage: 'Construction',
                sortOrder: 1,
              },
            ],
          },
        },
        include: projectCnvmpInclude,
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        const createdByConcurrentRequest = await this.prisma.projectCnvmp.findUnique({
          where: { projectId },
          include: projectCnvmpInclude,
        });
        if (createdByConcurrentRequest) {
          return createdByConcurrentRequest;
        }
      }
      throw error;
    }
  }

  private async findExistingProjectCnvmp(id: string) {
    const cnvmp = await this.prisma.projectCnvmp.findUnique({
      where: { id },
      include: projectCnvmpInclude,
    });
    if (!cnvmp) {
      throw new NotFoundException('Project CNVMP not found');
    }
    return serializeProjectCnvmp(cnvmp);
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

  private async assertAiDocumentBelongsToProject(access: ProjectAccess, aiDocumentId?: string | null) {
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

  private async assertStandardSourceExists(standardSourceId: string) {
    const source = await this.prisma.noiseVibrationStandardSource.findUnique({
      where: { id: standardSourceId },
      select: { id: true },
    });
    if (!source) {
      throw new NotFoundException('Noise/vibration standards source not found');
    }
  }

  private async assertCriterionRowExists(criterionRowId: string) {
    const criterion = await this.prisma.noiseVibrationCriterionRow.findUnique({
      where: { id: criterionRowId },
      select: { id: true },
    });
    if (!criterion) {
      throw new NotFoundException('Noise/vibration criterion row not found');
    }
  }

  private async assertReferenceExists(projectCnvmpId: string, id: string) {
    await this.assertChildExists(
      this.prisma.projectCnvmpReference.findFirst({
        where: { id, projectCnvmpId },
        select: { id: true },
      }),
      'CNVMP reference not found',
    );
  }

  private async assertReceiverExists(projectCnvmpId: string, id: string) {
    await this.assertChildExists(
      this.prisma.projectCnvmpReceiver.findFirst({
        where: { id, projectCnvmpId },
        select: { id: true },
      }),
      'CNVMP receiver not found',
    );
  }

  private async assertActivityExists(projectCnvmpId: string, id: string) {
    await this.assertChildExists(
      this.prisma.projectCnvmpActivity.findFirst({
        where: { id, projectCnvmpId },
        select: { id: true },
      }),
      'CNVMP activity not found',
    );
  }

  private async assertSelectedSourceExists(projectCnvmpId: string, id: string) {
    await this.assertChildExists(
      this.prisma.projectCnvmpSelectedSource.findFirst({
        where: { id, projectCnvmpId },
        select: { id: true },
      }),
      'CNVMP selected source not found',
    );
  }

  private async assertSelectedCriterionExists(projectCnvmpId: string, id: string) {
    await this.assertChildExists(
      this.prisma.projectCnvmpSelectedCriterion.findFirst({
        where: { id, projectCnvmpId },
        select: { id: true },
      }),
      'CNVMP selected criterion not found',
    );
  }

  private async assertMitigationMeasureExists(projectCnvmpId: string, id: string) {
    await this.assertChildExists(
      this.prisma.projectCnvmpMitigationMeasure.findFirst({
        where: { id, projectCnvmpId },
        select: { id: true },
      }),
      'CNVMP mitigation measure not found',
    );
  }

  private async assertMonitoringRowExists(projectCnvmpId: string, id: string) {
    await this.assertChildExists(
      this.prisma.projectCnvmpMonitoringRow.findFirst({
        where: { id, projectCnvmpId },
        select: { id: true },
      }),
      'CNVMP monitoring row not found',
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

const projectCnvmpInclude = {
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
  receivers: {
    orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
  },
  activities: {
    orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
  },
  selectedSources: {
    include: { standardSource: true },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  },
  selectedCriteria: {
    include: {
      criterionRow: {
        include: criterionRowInclude,
      },
    },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  },
  mitigationRows: {
    orderBy: [{ sortOrder: 'asc' }, { category: 'asc' }],
  },
  monitoringRows: {
    orderBy: [{ sortOrder: 'asc' }, { parameter: 'asc' }],
  },
} satisfies Prisma.ProjectCnvmpInclude;

function buildProjectCnvmpUpdateData(dto: UpdateProjectCnvmpDto) {
  const data = pickDefined(dto, [
    'title',
    'revision',
    'preparedBy',
    'checkedBy',
    'purpose',
    'documentStatus',
    'client',
    'projectName',
    'projectAddress',
    'projectDescription',
    'scopeOfWorks',
    'constructionActivitiesNote',
    'standardHoursNote',
    'outOfHoursNote',
    'sensitiveReceiversNote',
    'communityCommunicationNote',
    'contactDetailsNote',
    'complaintsHandlingNote',
    'respiteCommunicationNote',
    'assumptionsLimitations',
  ]) as Prisma.ProjectCnvmpUncheckedUpdateInput;

  if (dto.issueDate !== undefined) {
    data.issueDate = dto.issueDate ? new Date(dto.issueDate) : null;
  }

  return data;
}

function serializeProjectCnvmp(cnvmp: ProjectCnvmpWithContext) {
  return {
    ...cnvmp,
    issueDate: cnvmp.issueDate?.toISOString() ?? null,
    selectedCriteria: cnvmp.selectedCriteria.map((selection) => ({
      ...selection,
      criterionRow: serializeCriterionRow(selection.criterionRow),
    })),
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

function pickDefined<T extends object, K extends keyof T>(
  value: T,
  keys: K[],
): Partial<Pick<T, K>> {
  return keys.reduce((result, key) => {
    if (value[key] !== undefined) {
      result[key] = value[key];
    }
    return result;
  }, {} as Partial<Pick<T, K>>);
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
