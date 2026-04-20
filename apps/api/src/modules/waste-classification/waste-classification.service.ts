import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import type {
  CreateProjectWasteClassificationChecklistItemDto,
  CreateProjectWasteClassificationLabResultDto,
  CreateProjectWasteClassificationMaterialPathwayDto,
  CreateProjectWasteClassificationRecommendationDto,
  CreateProjectWasteClassificationReferenceDto,
  CreateProjectWasteClassificationRelatedPathwayDto,
  CreateProjectWasteClassificationReportDto,
  CreateProjectWasteClassificationStepDecisionDto,
  GenerateProjectWasteClassificationDraftRecommendationDto,
  UpdateProjectWasteClassificationChecklistItemDto,
  UpdateProjectWasteClassificationLabResultDto,
  UpdateProjectWasteClassificationMaterialPathwayDto,
  UpdateProjectWasteClassificationRecommendationDto,
  UpdateProjectWasteClassificationReferenceDto,
  UpdateProjectWasteClassificationRelatedPathwayDto,
  UpdateProjectWasteClassificationReportDto,
  UpdateProjectWasteClassificationStepDecisionDto,
} from './dto/waste-classification.dto';
import {
  NswAssAutofillService,
  type WasteClassificationAssAutofillResult,
} from './nsw-ass-autofill.service';

type ProjectAccess = {
  projectId: string;
  organisationId: string;
  userId: string;
  orgRole?: string;
};

type WasteClassificationReportWithContext = Prisma.ProjectWasteClassificationReportGetPayload<{
  include: typeof wasteClassificationReportInclude;
}>;

type WasteClassificationReportSummary = Prisma.ProjectWasteClassificationReportGetPayload<{
  select: typeof wasteClassificationReportSummarySelect;
}>;

type DraftRecommendationMaterialPathway = Pick<
  Prisma.ProjectWasteClassificationMaterialPathwayUncheckedCreateInput,
  | 'pathwayCode'
  | 'isRelevant'
  | 'outcomeStatus'
  | 'assClass'
  | 'assOrderRelevant'
  | 'assExemptionRelevant'
>;

@Injectable()
export class ProjectWasteClassificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly nswAssAutofillService: NswAssAutofillService,
  ) {}

  async listForProject(access: ProjectAccess) {
    await this.assertProjectReadAccess(access);

    const reports = await this.prisma.projectWasteClassificationReport.findMany({
      where: { projectId: access.projectId },
      select: wasteClassificationReportSummarySelect,
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    });

    return reports.map(serializeWasteClassificationReportSummary);
  }

  async createReport(access: ProjectAccess, dto: CreateProjectWasteClassificationReportDto) {
    await this.assertProjectWriteAccess(access);

    const report = await this.prisma.projectWasteClassificationReport.create({
      data: {
        projectId: access.projectId,
        title: dto.title?.trim() || 'Waste Classification Report',
        documentStatus: 'draft',
        finalWasteClass: 'not_yet_classified',
        references: {
          create: PREFILLED_REFERENCES.map((reference, index) => ({
            ...reference,
            sortOrder: index,
          })),
        },
        stepDecisions: {
          create: WASTE_CLASSIFICATION_STEP_DEFINITIONS.map((step, index) => ({
            stepCode: step.stepCode,
            stepTitle: step.stepTitle,
            outcomeStatus: 'not_started',
            classificationReached: false,
            resultingWasteClass: null,
            decisionSummary: step.defaultDecisionSummary,
            detailedReasoning: step.defaultDetailedReasoning,
            isApplicable: true,
            sortOrder: index,
            checklistItems: {
              create: step.checklistItems.map((label, checklistIndex) => ({
                label,
                isChecked: false,
                sortOrder: checklistIndex,
              })),
            },
          })),
        },
        materialPathways: {
          create: WASTE_CLASSIFICATION_MATERIAL_PATHWAY_DEFINITIONS.map((pathway, index) => ({
            pathwayCode: pathway.pathwayCode,
            title: pathway.title,
            isRelevant: pathway.isRelevant,
            outcomeStatus: 'not_assessed',
            testingNote: null,
            supportingReasoning: pathway.defaultSupportingReasoning,
            linkedReferenceId: null,
            assClass: pathway.defaultAssClass,
            assClassSource: pathway.defaultAssClassSource,
            projectLocationNote: null,
            treatmentManagementNote: pathway.defaultTreatmentManagementNote,
            step5ChemicalAssessmentApplies: pathway.defaultStep5ChemicalAssessmentApplies,
            assOrderRelevant: pathway.defaultAssOrderRelevant,
            assExemptionRelevant: pathway.defaultAssExemptionRelevant,
            orderExemptionNote: pathway.defaultOrderExemptionNote,
            sortOrder: index,
            checklistItems: {
              create: pathway.checklistItems.map((label, checklistIndex) => ({
                label,
                isChecked: false,
                sortOrder: checklistIndex,
              })),
            },
          })),
        },
        relatedPathways: {
          create: WASTE_CLASSIFICATION_PATHWAYS.map((pathway, index) => ({
            ...pathway,
            sortOrder: index,
          })),
        },
      },
      include: wasteClassificationReportInclude,
    });

    return serializeWasteClassificationReport(report);
  }

  async findReport(access: ProjectAccess, reportId: string) {
    await this.assertProjectReadAccess(access);
    await this.assertReportExists(access.projectId, reportId);
    return this.findExistingReport(reportId);
  }

  async updateReport(
    access: ProjectAccess,
    reportId: string,
    dto: UpdateProjectWasteClassificationReportDto,
  ) {
    await this.assertProjectWriteAccess(access);
    await this.assertReportExists(access.projectId, reportId);

    await this.prisma.projectWasteClassificationReport.update({
      where: { id: reportId },
      data: buildReportUpdateData(dto),
    });

    return this.findExistingReport(reportId);
  }

  async deleteReport(access: ProjectAccess, reportId: string) {
    await this.assertProjectWriteAccess(access);
    await this.assertReportExists(access.projectId, reportId);
    await this.prisma.projectWasteClassificationReport.delete({ where: { id: reportId } });
    return { id: reportId, deleted: true };
  }

  async createReference(
    access: ProjectAccess,
    reportId: string,
    dto: CreateProjectWasteClassificationReferenceDto,
  ) {
    await this.assertProjectWriteAccess(access);
    await this.assertReportExists(access.projectId, reportId);
    const aiDocument = await this.findAiDocumentForProject(access, dto.aiDocumentId);

    await this.prisma.projectWasteClassificationReference.create({
      data: {
        reportId,
        referenceType: dto.referenceType ?? inferReferenceType(dto, aiDocument),
        title: resolveReferenceTitle(dto.title, aiDocument?.filename, dto.projectReferenceId),
        sourceUrl: dto.sourceUrl ?? null,
        projectReferenceId: dto.projectReferenceId ?? null,
        aiDocumentId: dto.aiDocumentId ?? null,
        note: dto.note ?? null,
        isPrefilled: dto.isPrefilled ?? false,
        isIncluded: dto.isIncluded ?? true,
        sortOrder:
          dto.sortOrder ??
          (await this.prisma.projectWasteClassificationReference.count({
            where: { reportId },
          })),
      },
    });

    return this.findExistingReport(reportId);
  }

  async updateReference(
    access: ProjectAccess,
    reportId: string,
    id: string,
    dto: UpdateProjectWasteClassificationReferenceDto,
  ) {
    await this.assertProjectWriteAccess(access);
    await this.assertReportExists(access.projectId, reportId);
    const existing = await this.assertReferenceExists(reportId, id);
    const aiDocument = await this.findAiDocumentForProject(access, dto.aiDocumentId);

    const data = pickDefined(dto, [
      'referenceType',
      'sourceUrl',
      'projectReferenceId',
      'aiDocumentId',
      'note',
      'isPrefilled',
      'isIncluded',
      'sortOrder',
    ]) as Prisma.ProjectWasteClassificationReferenceUncheckedUpdateInput;

    if (
      dto.title !== undefined ||
      dto.aiDocumentId !== undefined ||
      dto.projectReferenceId !== undefined
    ) {
      data.title = resolveReferenceTitle(
        dto.title ?? existing.title,
        aiDocument?.filename ?? existing.aiDocument?.filename ?? null,
        dto.projectReferenceId ?? existing.projectReferenceId ?? null,
      );
    }

    if (
      dto.referenceType === undefined &&
      (dto.aiDocumentId !== undefined || dto.projectReferenceId !== undefined)
    ) {
      data.referenceType = inferReferenceType(
        {
          ...dto,
          referenceType: undefined,
          projectReferenceId: dto.projectReferenceId ?? existing.projectReferenceId ?? undefined,
          aiDocumentId: dto.aiDocumentId ?? existing.aiDocumentId ?? undefined,
        },
        aiDocument ?? existing.aiDocument ?? null,
      );
    }

    await this.prisma.projectWasteClassificationReference.update({
      where: { id },
      data,
    });

    return this.findExistingReport(reportId);
  }

  async deleteReference(access: ProjectAccess, reportId: string, id: string) {
    await this.assertProjectWriteAccess(access);
    await this.assertReportExists(access.projectId, reportId);
    await this.assertReferenceExists(reportId, id);
    await this.prisma.projectWasteClassificationReference.delete({ where: { id } });
    return this.findExistingReport(reportId);
  }

  async createStepDecision(
    access: ProjectAccess,
    reportId: string,
    dto: CreateProjectWasteClassificationStepDecisionDto,
  ) {
    await this.assertProjectWriteAccess(access);
    await this.assertReportExists(access.projectId, reportId);

    try {
      await this.prisma.projectWasteClassificationStepDecision.create({
        data: {
          reportId,
          stepCode: dto.stepCode,
          stepTitle: dto.stepTitle?.trim() || stepTitleForCode(dto.stepCode),
          outcomeStatus: dto.outcomeStatus ?? 'not_started',
          classificationReached: dto.classificationReached ?? false,
          resultingWasteClass: dto.resultingWasteClass ?? null,
          decisionSummary: dto.decisionSummary ?? null,
          detailedReasoning: dto.detailedReasoning ?? null,
          isApplicable: dto.isApplicable ?? true,
          sortOrder:
            dto.sortOrder ??
            (await this.prisma.projectWasteClassificationStepDecision.count({
              where: { reportId },
            })),
        },
      });
    } catch (error) {
      throwFriendlyUniqueError(
        error,
        'This waste classification step is already present on the report',
      );
    }

    return this.findExistingReport(reportId);
  }

  async updateStepDecision(
    access: ProjectAccess,
    reportId: string,
    id: string,
    dto: UpdateProjectWasteClassificationStepDecisionDto,
  ) {
    await this.assertProjectWriteAccess(access);
    await this.assertReportExists(access.projectId, reportId);
    const existing = await this.assertStepDecisionExists(reportId, id);

    const data = pickDefined(dto, [
      'stepCode',
      'outcomeStatus',
      'classificationReached',
      'resultingWasteClass',
      'decisionSummary',
      'detailedReasoning',
      'isApplicable',
      'sortOrder',
    ]) as Prisma.ProjectWasteClassificationStepDecisionUncheckedUpdateInput;

    if (dto.stepTitle !== undefined || dto.stepCode !== undefined) {
      data.stepTitle = dto.stepTitle?.trim() || stepTitleForCode(dto.stepCode ?? existing.stepCode);
    }

    try {
      await this.prisma.projectWasteClassificationStepDecision.update({
        where: { id },
        data,
      });
    } catch (error) {
      throwFriendlyUniqueError(
        error,
        'This waste classification step is already present on the report',
      );
    }

    return this.findExistingReport(reportId);
  }

  async deleteStepDecision(access: ProjectAccess, reportId: string, id: string) {
    await this.assertProjectWriteAccess(access);
    await this.assertReportExists(access.projectId, reportId);
    await this.assertStepDecisionExists(reportId, id);
    await this.prisma.projectWasteClassificationStepDecision.delete({ where: { id } });
    return this.findExistingReport(reportId);
  }

  async createChecklistItem(
    access: ProjectAccess,
    reportId: string,
    stepDecisionId: string,
    dto: CreateProjectWasteClassificationChecklistItemDto,
  ) {
    await this.assertProjectWriteAccess(access);
    await this.assertReportExists(access.projectId, reportId);
    await this.assertStepDecisionExists(reportId, stepDecisionId);

    await this.prisma.projectWasteClassificationChecklistItem.create({
      data: {
        stepDecisionId,
        label: dto.label,
        isChecked: dto.isChecked ?? false,
        note: dto.note ?? null,
        sortOrder:
          dto.sortOrder ??
          (await this.prisma.projectWasteClassificationChecklistItem.count({
            where: { stepDecisionId },
          })),
      },
    });

    return this.findExistingReport(reportId);
  }

  async updateChecklistItem(
    access: ProjectAccess,
    reportId: string,
    stepDecisionId: string,
    id: string,
    dto: UpdateProjectWasteClassificationChecklistItemDto,
  ) {
    await this.assertProjectWriteAccess(access);
    await this.assertReportExists(access.projectId, reportId);
    await this.assertStepDecisionExists(reportId, stepDecisionId);
    await this.assertChecklistItemExists(stepDecisionId, id);

    await this.prisma.projectWasteClassificationChecklistItem.update({
      where: { id },
      data: pickDefined(dto, [
        'label',
        'isChecked',
        'note',
        'sortOrder',
      ]) as Prisma.ProjectWasteClassificationChecklistItemUncheckedUpdateInput,
    });

    return this.findExistingReport(reportId);
  }

  async deleteChecklistItem(
    access: ProjectAccess,
    reportId: string,
    stepDecisionId: string,
    id: string,
  ) {
    await this.assertProjectWriteAccess(access);
    await this.assertReportExists(access.projectId, reportId);
    await this.assertStepDecisionExists(reportId, stepDecisionId);
    await this.assertChecklistItemExists(stepDecisionId, id);
    await this.prisma.projectWasteClassificationChecklistItem.delete({ where: { id } });
    return this.findExistingReport(reportId);
  }

  async createLabResult(
    access: ProjectAccess,
    reportId: string,
    dto: CreateProjectWasteClassificationLabResultDto,
  ) {
    await this.assertProjectWriteAccess(access);
    await this.assertReportExists(access.projectId, reportId);

    await this.prisma.projectWasteClassificationLabResult.create({
      data: {
        reportId,
        contaminant: dto.contaminant,
        sampleId: dto.sampleId ?? null,
        analyticalMethod: dto.analyticalMethod ?? null,
        sccMgKg: dto.sccMgKg ?? null,
        tclpMgL: dto.tclpMgL ?? null,
        thresholdReferenceNote: dto.thresholdReferenceNote ?? null,
        resultInterpretation: dto.resultInterpretation ?? null,
        sortOrder:
          dto.sortOrder ??
          (await this.prisma.projectWasteClassificationLabResult.count({
            where: { reportId },
          })),
      },
    });

    return this.findExistingReport(reportId);
  }

  async updateLabResult(
    access: ProjectAccess,
    reportId: string,
    id: string,
    dto: UpdateProjectWasteClassificationLabResultDto,
  ) {
    await this.assertProjectWriteAccess(access);
    await this.assertReportExists(access.projectId, reportId);
    await this.assertLabResultExists(reportId, id);

    await this.prisma.projectWasteClassificationLabResult.update({
      where: { id },
      data: pickDefined(dto, [
        'contaminant',
        'sampleId',
        'analyticalMethod',
        'sccMgKg',
        'tclpMgL',
        'thresholdReferenceNote',
        'resultInterpretation',
        'sortOrder',
      ]) as Prisma.ProjectWasteClassificationLabResultUncheckedUpdateInput,
    });

    return this.findExistingReport(reportId);
  }

  async deleteLabResult(access: ProjectAccess, reportId: string, id: string) {
    await this.assertProjectWriteAccess(access);
    await this.assertReportExists(access.projectId, reportId);
    await this.assertLabResultExists(reportId, id);
    await this.prisma.projectWasteClassificationLabResult.delete({ where: { id } });
    return this.findExistingReport(reportId);
  }

  async createRecommendation(
    access: ProjectAccess,
    reportId: string,
    dto: CreateProjectWasteClassificationRecommendationDto,
  ) {
    await this.assertProjectWriteAccess(access);
    await this.assertReportExists(access.projectId, reportId);

    await this.prisma.projectWasteClassificationRecommendation.create({
      data: {
        reportId,
        category: dto.category,
        recommendation: dto.recommendation,
        priority: dto.priority ?? null,
        responsibility: dto.responsibility ?? null,
        timingNote: dto.timingNote ?? null,
        sortOrder:
          dto.sortOrder ??
          (await this.prisma.projectWasteClassificationRecommendation.count({
            where: { reportId },
          })),
      },
    });

    return this.findExistingReport(reportId);
  }

  async updateRecommendation(
    access: ProjectAccess,
    reportId: string,
    id: string,
    dto: UpdateProjectWasteClassificationRecommendationDto,
  ) {
    await this.assertProjectWriteAccess(access);
    await this.assertReportExists(access.projectId, reportId);
    await this.assertRecommendationExists(reportId, id);

    await this.prisma.projectWasteClassificationRecommendation.update({
      where: { id },
      data: pickDefined(dto, [
        'category',
        'recommendation',
        'priority',
        'responsibility',
        'timingNote',
        'sortOrder',
      ]) as Prisma.ProjectWasteClassificationRecommendationUncheckedUpdateInput,
    });

    return this.findExistingReport(reportId);
  }

  async deleteRecommendation(access: ProjectAccess, reportId: string, id: string) {
    await this.assertProjectWriteAccess(access);
    await this.assertReportExists(access.projectId, reportId);
    await this.assertRecommendationExists(reportId, id);
    await this.prisma.projectWasteClassificationRecommendation.delete({ where: { id } });
    return this.findExistingReport(reportId);
  }

  async createMaterialPathway(
    access: ProjectAccess,
    reportId: string,
    dto: CreateProjectWasteClassificationMaterialPathwayDto,
  ) {
    await this.assertProjectWriteAccess(access);
    await this.assertReportExists(access.projectId, reportId);
    await this.assertLinkedReferenceBelongsToReport(reportId, dto.linkedReferenceId);

    try {
      await this.prisma.projectWasteClassificationMaterialPathway.create({
        data: {
          reportId,
          pathwayCode: dto.pathwayCode,
          title: dto.title?.trim() || materialPathwayTitleForCode(dto.pathwayCode),
          isRelevant: dto.isRelevant ?? true,
          outcomeStatus: dto.outcomeStatus ?? 'not_assessed',
          testingNote: dto.testingNote ?? null,
          supportingReasoning: dto.supportingReasoning ?? null,
          linkedReferenceId: dto.linkedReferenceId ?? null,
          assClass: dto.assClass ?? null,
          assClassSource: dto.assClassSource ?? null,
          projectLocationNote: dto.projectLocationNote ?? null,
          treatmentManagementNote: dto.treatmentManagementNote ?? null,
          step5ChemicalAssessmentApplies: dto.step5ChemicalAssessmentApplies ?? null,
          assOrderRelevant: dto.assOrderRelevant ?? null,
          assExemptionRelevant: dto.assExemptionRelevant ?? null,
          orderExemptionNote: dto.orderExemptionNote ?? null,
          sortOrder:
            dto.sortOrder ??
            (await this.prisma.projectWasteClassificationMaterialPathway.count({
              where: { reportId },
            })),
          checklistItems: {
            create:
              dto.checklistItems?.map((item, index) => ({
                label: item.label?.trim() || `Checklist item ${index + 1}`,
                isChecked: item.isChecked ?? false,
                note: item.note ?? null,
                sortOrder: item.sortOrder ?? index,
              })) ?? [],
          },
        },
      });
    } catch (error) {
      throwFriendlyUniqueError(
        error,
        'This material / reuse pathway is already present on the report',
      );
    }

    return this.findExistingReport(reportId);
  }

  async updateMaterialPathway(
    access: ProjectAccess,
    reportId: string,
    id: string,
    dto: UpdateProjectWasteClassificationMaterialPathwayDto,
  ) {
    await this.assertProjectWriteAccess(access);
    await this.assertReportExists(access.projectId, reportId);
    const existing = await this.assertMaterialPathwayExists(reportId, id);
    await this.assertLinkedReferenceBelongsToReport(reportId, dto.linkedReferenceId);

    const data = pickDefined(dto, [
      'pathwayCode',
      'isRelevant',
      'outcomeStatus',
      'testingNote',
      'supportingReasoning',
      'linkedReferenceId',
      'assClass',
      'assClassSource',
      'projectLocationNote',
      'treatmentManagementNote',
      'step5ChemicalAssessmentApplies',
      'assOrderRelevant',
      'assExemptionRelevant',
      'orderExemptionNote',
      'sortOrder',
    ]) as Prisma.ProjectWasteClassificationMaterialPathwayUncheckedUpdateInput;

    if (dto.title !== undefined || dto.pathwayCode !== undefined) {
      data.title =
        dto.title?.trim() || materialPathwayTitleForCode(dto.pathwayCode ?? existing.pathwayCode);
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.projectWasteClassificationMaterialPathway.update({
          where: { id },
          data,
        });

        if (dto.checklistItems) {
          for (const [index, item] of dto.checklistItems.entries()) {
            if (item.id) {
              await this.assertMaterialPathwayChecklistItemExists(tx, id, item.id);
              await tx.projectWasteClassificationMaterialPathwayChecklistItem.update({
                where: { id: item.id },
                data: {
                  label: item.label ?? undefined,
                  isChecked: item.isChecked ?? false,
                  note: item.note ?? null,
                  sortOrder: item.sortOrder ?? index,
                },
              });
            } else {
              await tx.projectWasteClassificationMaterialPathwayChecklistItem.create({
                data: {
                  materialPathwayId: id,
                  label: item.label?.trim() || `Checklist item ${index + 1}`,
                  isChecked: item.isChecked ?? false,
                  note: item.note ?? null,
                  sortOrder: item.sortOrder ?? index,
                },
              });
            }
          }
        }
      });
    } catch (error) {
      throwFriendlyUniqueError(
        error,
        'This material / reuse pathway is already present on the report',
      );
    }

    return this.findExistingReport(reportId);
  }

  async autofillAssMaterialPathway(
    access: ProjectAccess,
    reportId: string,
    id: string,
  ): Promise<WasteClassificationAssAutofillResult> {
    const project = await this.assertProjectWriteAccess(access);
    await this.assertReportExists(access.projectId, reportId);
    const pathway = await this.assertMaterialPathwayExists(reportId, id);

    if (pathway.pathwayCode !== 'acid_sulfate_soils') {
      throw new BadRequestException(
        'ASS autofill is only available for the Acid Sulfate Soils material pathway',
      );
    }

    const spatialFeatures = await this.prisma.projectSpatialFeature.findMany({
      where: {
        projectId: access.projectId,
        featureType: {
          in: ['site_boundary', 'parcel_boundary'],
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: {
        featureType: true,
        label: true,
        geometryJson: true,
      },
    });

    return this.nswAssAutofillService.autofillForProject(
      {
        name: project.name,
        code: project.code,
        metadata: project.metadata as Prisma.JsonValue | null,
      },
      spatialFeatures,
    );
  }

  async generateDraftRecommendation(
    access: ProjectAccess,
    reportId: string,
    dto: GenerateProjectWasteClassificationDraftRecommendationDto,
  ) {
    await this.assertProjectReadAccess(access);
    await this.assertReportExists(access.projectId, reportId);

    const report = await this.prisma.projectWasteClassificationReport.findUnique({
      where: { id: reportId },
      include: {
        materialPathways: {
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        },
      },
    });

    if (!report) {
      throw new NotFoundException('Waste classification report not found');
    }

    return buildDraftRecommendationHelper(
      dto.finalWasteClass ?? report.finalWasteClass,
      report.materialPathways,
      report.managementRecommendation,
    );
  }

  async createRelatedPathway(
    access: ProjectAccess,
    reportId: string,
    dto: CreateProjectWasteClassificationRelatedPathwayDto,
  ) {
    await this.assertProjectWriteAccess(access);
    await this.assertReportExists(access.projectId, reportId);
    await this.assertLinkedReferenceBelongsToReport(reportId, dto.linkedReferenceId);

    try {
      await this.prisma.projectWasteClassificationRelatedPathway.create({
        data: {
          reportId,
          pathwayCode: dto.pathwayCode,
          title: dto.title?.trim() || pathwayTitleForCode(dto.pathwayCode),
          isRelevant: dto.isRelevant ?? false,
          summaryNote: dto.summaryNote ?? null,
          linkedReferenceId: dto.linkedReferenceId ?? null,
          resultingAction: dto.resultingAction ?? null,
          sortOrder:
            dto.sortOrder ??
            (await this.prisma.projectWasteClassificationRelatedPathway.count({
              where: { reportId },
            })),
        },
      });
    } catch (error) {
      throwFriendlyUniqueError(error, 'This related pathway is already present on the report');
    }

    return this.findExistingReport(reportId);
  }

  async updateRelatedPathway(
    access: ProjectAccess,
    reportId: string,
    id: string,
    dto: UpdateProjectWasteClassificationRelatedPathwayDto,
  ) {
    await this.assertProjectWriteAccess(access);
    await this.assertReportExists(access.projectId, reportId);
    const existing = await this.assertRelatedPathwayExists(reportId, id);
    await this.assertLinkedReferenceBelongsToReport(reportId, dto.linkedReferenceId);

    const data = pickDefined(dto, [
      'pathwayCode',
      'isRelevant',
      'summaryNote',
      'linkedReferenceId',
      'resultingAction',
      'sortOrder',
    ]) as Prisma.ProjectWasteClassificationRelatedPathwayUncheckedUpdateInput;

    if (dto.title !== undefined || dto.pathwayCode !== undefined) {
      data.title =
        dto.title?.trim() || pathwayTitleForCode(dto.pathwayCode ?? existing.pathwayCode);
    }

    try {
      await this.prisma.projectWasteClassificationRelatedPathway.update({
        where: { id },
        data,
      });
    } catch (error) {
      throwFriendlyUniqueError(error, 'This related pathway is already present on the report');
    }

    return this.findExistingReport(reportId);
  }

  async deleteRelatedPathway(access: ProjectAccess, reportId: string, id: string) {
    await this.assertProjectWriteAccess(access);
    await this.assertReportExists(access.projectId, reportId);
    await this.assertRelatedPathwayExists(reportId, id);
    await this.prisma.projectWasteClassificationRelatedPathway.delete({ where: { id } });
    return this.findExistingReport(reportId);
  }

  private async findExistingReport(reportId: string) {
    await this.ensureReportScaffold(reportId);

    const report = await this.prisma.projectWasteClassificationReport.findUnique({
      where: { id: reportId },
      include: wasteClassificationReportInclude,
    });

    if (!report) {
      throw new NotFoundException('Waste classification report not found');
    }

    return serializeWasteClassificationReport(report);
  }

  private async assertReportExists(projectId: string, reportId: string) {
    const report = await this.prisma.projectWasteClassificationReport.findFirst({
      where: { id: reportId, projectId },
      select: { id: true },
    });

    if (!report) {
      throw new NotFoundException('Waste classification report not found');
    }

    return report;
  }

  private async assertReferenceExists(reportId: string, id: string) {
    const reference = await this.prisma.projectWasteClassificationReference.findFirst({
      where: { id, reportId },
      include: {
        aiDocument: {
          select: {
            id: true,
            filename: true,
          },
        },
      },
    });

    if (!reference) {
      throw new NotFoundException('Waste classification reference not found');
    }

    return reference;
  }

  private async assertStepDecisionExists(reportId: string, id: string) {
    const step = await this.prisma.projectWasteClassificationStepDecision.findFirst({
      where: { id, reportId },
      select: { id: true, stepCode: true },
    });

    if (!step) {
      throw new NotFoundException('Waste classification step decision not found');
    }

    return step;
  }

  private async assertChecklistItemExists(stepDecisionId: string, id: string) {
    await this.assertChildExists(
      this.prisma.projectWasteClassificationChecklistItem.findFirst({
        where: { id, stepDecisionId },
        select: { id: true },
      }),
      'Waste classification checklist item not found',
    );
  }

  private async assertLabResultExists(reportId: string, id: string) {
    await this.assertChildExists(
      this.prisma.projectWasteClassificationLabResult.findFirst({
        where: { id, reportId },
        select: { id: true },
      }),
      'Waste classification lab result not found',
    );
  }

  private async assertRecommendationExists(reportId: string, id: string) {
    await this.assertChildExists(
      this.prisma.projectWasteClassificationRecommendation.findFirst({
        where: { id, reportId },
        select: { id: true },
      }),
      'Waste classification recommendation not found',
    );
  }

  private async assertMaterialPathwayExists(reportId: string, id: string) {
    const pathway = await this.prisma.projectWasteClassificationMaterialPathway.findFirst({
      where: { id, reportId },
      select: { id: true, pathwayCode: true },
    });

    if (!pathway) {
      throw new NotFoundException('Waste classification material / reuse pathway not found');
    }

    return pathway;
  }

  private async assertRelatedPathwayExists(reportId: string, id: string) {
    const pathway = await this.prisma.projectWasteClassificationRelatedPathway.findFirst({
      where: { id, reportId },
      select: { id: true, pathwayCode: true },
    });

    if (!pathway) {
      throw new NotFoundException('Waste classification related pathway not found');
    }

    return pathway;
  }

  private async assertLinkedReferenceBelongsToReport(
    reportId: string,
    linkedReferenceId?: string | null,
  ) {
    if (!linkedReferenceId) {
      return;
    }

    await this.assertChildExists(
      this.prisma.projectWasteClassificationReference.findFirst({
        where: { id: linkedReferenceId, reportId },
        select: { id: true },
      }),
      'Linked waste classification reference not found',
    );
  }

  private async assertMaterialPathwayChecklistItemExists(
    tx: Pick<PrismaService, 'projectWasteClassificationMaterialPathwayChecklistItem'>,
    materialPathwayId: string,
    id: string,
  ) {
    await this.assertChildExists(
      tx.projectWasteClassificationMaterialPathwayChecklistItem.findFirst({
        where: { id, materialPathwayId },
        select: { id: true },
      }),
      'Waste classification material pathway checklist item not found',
    );
  }

  private async findAiDocumentForProject(access: ProjectAccess, aiDocumentId?: string | null) {
    if (!aiDocumentId) {
      return null;
    }

    const document = await this.prisma.aiDocument.findFirst({
      where: {
        id: aiDocumentId,
        projectId: access.projectId,
        organisationId: access.organisationId,
      },
      select: {
        id: true,
        filename: true,
      },
    });

    if (!document) {
      throw new NotFoundException('AI document not found for this project');
    }

    return document;
  }

  private async ensureReportScaffold(reportId: string) {
    const report = await this.prisma.projectWasteClassificationReport.findUnique({
      where: { id: reportId },
      select: {
        id: true,
        references: {
          select: {
            id: true,
            title: true,
            sourceUrl: true,
            note: true,
            referenceType: true,
            isIncluded: true,
          },
        },
        materialPathways: {
          select: { pathwayCode: true },
        },
      },
    });

    if (!report) {
      return;
    }

    const existingReferenceTitles = new Set(report.references.map((reference) => reference.title));
    const existingReferenceUrls = new Set(
      report.references
        .map((reference) => reference.sourceUrl)
        .filter((reference): reference is string => Boolean(reference)),
    );
    const missingReferences = PREFILLED_REFERENCES.filter(
      (reference) =>
        !existingReferenceTitles.has(reference.title) &&
        !(reference.sourceUrl && existingReferenceUrls.has(reference.sourceUrl)),
    );
    const stalePrefilledReferences = report.references.reduce<
      Array<{
        existing: (typeof report.references)[number];
        expected: (typeof PREFILLED_REFERENCES)[number];
      }>
    >((entries, reference) => {
      const expected = PREFILLED_REFERENCES.find(
        (prefilled) => prefilled.title === reference.title,
      );
      if (!expected) {
        return entries;
      }

      if (
        reference.sourceUrl !== expected.sourceUrl ||
        reference.note !== expected.note ||
        reference.referenceType !== expected.referenceType ||
        reference.isIncluded !== expected.isIncluded
      ) {
        entries.push({ existing: reference, expected });
      }

      return entries;
    }, []);

    const existingMaterialPathwayCodes = new Set(
      report.materialPathways.map((pathway) => pathway.pathwayCode),
    );
    const missingMaterialPathways = WASTE_CLASSIFICATION_MATERIAL_PATHWAY_DEFINITIONS.filter(
      (pathway) => !existingMaterialPathwayCodes.has(pathway.pathwayCode),
    );

    if (
      missingReferences.length === 0 &&
      stalePrefilledReferences.length === 0 &&
      missingMaterialPathways.length === 0
    ) {
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      for (const reference of stalePrefilledReferences) {
        await tx.projectWasteClassificationReference.update({
          where: { id: reference.existing.id },
          data: {
            sourceUrl: reference.expected.sourceUrl,
            note: reference.expected.note,
            referenceType: reference.expected.referenceType,
            isIncluded: reference.expected.isIncluded,
          },
        });
      }

      if (missingReferences.length > 0) {
        const referenceOffset = await tx.projectWasteClassificationReference.count({
          where: { reportId },
        });

        await tx.projectWasteClassificationReference.createMany({
          data: missingReferences.map((reference, index) => ({
            reportId,
            referenceType: reference.referenceType,
            title: reference.title,
            sourceUrl: reference.sourceUrl,
            note: reference.note,
            isPrefilled: reference.isPrefilled,
            isIncluded: reference.isIncluded,
            sortOrder: referenceOffset + index,
          })),
        });
      }

      for (const [index, pathway] of missingMaterialPathways.entries()) {
        const materialPathway = await tx.projectWasteClassificationMaterialPathway.create({
          data: {
            reportId,
            pathwayCode: pathway.pathwayCode,
            title: pathway.title,
            isRelevant: pathway.isRelevant,
            outcomeStatus: 'not_assessed',
            testingNote: null,
            supportingReasoning: pathway.defaultSupportingReasoning,
            linkedReferenceId: null,
            assClass: pathway.defaultAssClass,
            assClassSource: pathway.defaultAssClassSource,
            projectLocationNote: null,
            treatmentManagementNote: pathway.defaultTreatmentManagementNote,
            step5ChemicalAssessmentApplies: pathway.defaultStep5ChemicalAssessmentApplies,
            assOrderRelevant: pathway.defaultAssOrderRelevant,
            assExemptionRelevant: pathway.defaultAssExemptionRelevant,
            orderExemptionNote: pathway.defaultOrderExemptionNote,
            sortOrder: report.materialPathways.length + index,
          },
        });

        if (pathway.checklistItems.length > 0) {
          await tx.projectWasteClassificationMaterialPathwayChecklistItem.createMany({
            data: pathway.checklistItems.map((label, checklistIndex) => ({
              materialPathwayId: materialPathway.id,
              label,
              isChecked: false,
              sortOrder: checklistIndex,
            })),
          });
        }
      }
    });
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

  private async assertChildExists<T>(value: Promise<T | null>, message: string) {
    if (!(await value)) {
      throw new NotFoundException(message);
    }
  }
}

const wasteClassificationReportInclude = {
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
  stepDecisions: {
    include: {
      checklistItems: {
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      },
    },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  },
  labResults: {
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  },
  recommendations: {
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  },
  materialPathways: {
    include: {
      checklistItems: {
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      },
      linkedReference: {
        select: {
          id: true,
          title: true,
          referenceType: true,
          sourceUrl: true,
          isIncluded: true,
        },
      },
    },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  },
  relatedPathways: {
    include: {
      linkedReference: {
        select: {
          id: true,
          title: true,
          referenceType: true,
          sourceUrl: true,
          isIncluded: true,
        },
      },
    },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  },
} satisfies Prisma.ProjectWasteClassificationReportInclude;

const wasteClassificationReportSummarySelect = {
  id: true,
  projectId: true,
  title: true,
  revision: true,
  issueDate: true,
  documentStatus: true,
  finalWasteClass: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      references: true,
      stepDecisions: true,
      labResults: true,
      recommendations: true,
    },
  },
} satisfies Prisma.ProjectWasteClassificationReportSelect;

const PREFILLED_REFERENCES = [
  {
    referenceType: 'epa_guideline' as const,
    title: 'NSW EPA Waste Classification Guidelines – Part 1: Classifying waste',
    sourceUrl:
      'https://www.epa.nsw.gov.au/-/media/epa/corporate-site/resources/wasteregulation/140796-classify-waste.pdf',
    note: null,
    isPrefilled: true,
    isIncluded: true,
  },
  {
    referenceType: 'epa_guideline' as const,
    title: 'NSW EPA Waste Classification Guidelines – Part 2: Immobilising waste',
    sourceUrl:
      'https://www.epa.nsw.gov.au/-/media/epa/corporate-site/resources/wasteregulation/140815-immobilisation-waste.pdf',
    note: null,
    isPrefilled: true,
    isIncluded: true,
  },
  {
    referenceType: 'epa_guideline' as const,
    title:
      'NSW EPA Waste Classification Guidelines – Part 3: Waste containing radioactive material',
    sourceUrl:
      'https://www.epa.nsw.gov.au/-/media/epa/corporate-site/resources/wasteregulation/140797-radioactive-waste.pdf',
    note: null,
    isPrefilled: true,
    isIncluded: true,
  },
  {
    referenceType: 'epa_guideline' as const,
    title: 'NSW EPA Waste Classification Guidelines – Part 4: Acid sulfate soils',
    sourceUrl: 'https://www.epa.nsw.gov.au/sites/default/files/140798-acid-sulfate-soils.pdf',
    note: null,
    isPrefilled: true,
    isIncluded: true,
  },
  {
    referenceType: 'epa_guideline' as const,
    title: 'Addendum to Part 1: Classifying waste',
    sourceUrl:
      'https://www.epa.nsw.gov.au/-/media/epa/corporate-site/resources/wasteregulation/addendum-1-to-the-waste-classification-guidelines.pdf',
    note: null,
    isPrefilled: true,
    isIncluded: true,
  },
  {
    referenceType: 'epa_guideline' as const,
    title: 'NSW EPA Classifying waste landing page',
    sourceUrl: 'https://www.epa.nsw.gov.au/Your-environment/Waste/classifying-waste',
    note: null,
    isPrefilled: true,
    isIncluded: true,
  },
  {
    referenceType: 'epa_guideline' as const,
    title: 'NSW EPA Waste classification guidelines landing page',
    sourceUrl:
      'https://www.epa.nsw.gov.au/Your-environment/Waste/classifying-waste/waste-classification-guidelines',
    note: null,
    isPrefilled: true,
    isIncluded: true,
  },
  {
    referenceType: 'epa_guideline' as const,
    title: 'NSW EPA Virgin Excavated Natural Material guidance page',
    sourceUrl:
      'https://www.epa.nsw.gov.au/your-environment/waste/classifying-waste/virgin-excavated-natural-material',
    note: null,
    isPrefilled: true,
    isIncluded: true,
  },
  {
    referenceType: 'epa_guideline' as const,
    title: 'NSW EPA The Excavated Natural Material Order 2014',
    sourceUrl:
      'https://www.epa.nsw.gov.au/sites/default/files/rro14-excavated-natural-material.pdf',
    note: null,
    isPrefilled: true,
    isIncluded: true,
  },
  {
    referenceType: 'epa_guideline' as const,
    title: 'NSW EPA The Excavated Natural Material Exemption 2014',
    sourceUrl:
      'https://www.epa.nsw.gov.au/sites/default/files/rre14-excavated-natural-material.pdf',
    note: null,
    isPrefilled: true,
    isIncluded: true,
  },
  {
    referenceType: 'other' as const,
    title: 'NSW Planning Portal Environmental Planning Instrument - Acid Sulfate Soils dataset',
    sourceUrl: 'https://www.planningportal.nsw.gov.au/opendata/dataset/epi-acid-sulfate-soils',
    note: 'Planning Portal source for ASS class mapping and class descriptions.',
    isPrefilled: true,
    isIncluded: true,
  },
  {
    referenceType: 'epa_guideline' as const,
    title: 'NSW EPA The acid sulfate soil (ASS) order 2025',
    sourceUrl:
      'https://www.epa.nsw.gov.au/sites/default/files/2025-12/the-acid-sulfate-soil-Order-2025.pdf',
    note: null,
    isPrefilled: true,
    isIncluded: true,
  },
  {
    referenceType: 'epa_guideline' as const,
    title: 'NSW EPA The acid sulfate soil (ASS) exemption 2025',
    sourceUrl:
      'https://www.epa.nsw.gov.au/sites/default/files/2025-12/the-acid-sulfate-soil-Exemption-2025.pdf',
    note: null,
    isPrefilled: true,
    isIncluded: true,
  },
];

const WASTE_CLASSIFICATION_STEP_DEFINITIONS = [
  {
    stepCode: 'step_1_special_waste' as const,
    stepTitle: 'Step 1: Is the waste special waste?',
    defaultDecisionSummary: null,
    defaultDetailedReasoning: null,
    checklistItems: [
      'Clinical and related waste',
      'Asbestos waste',
      'Waste tyres',
      'Gazetted special waste',
      'Special waste mixed with restricted solid or hazardous waste',
    ],
  },
  {
    stepCode: 'step_2_liquid_waste' as const,
    stepTitle: 'Step 2: Is the waste liquid waste?',
    defaultDecisionSummary: null,
    defaultDetailedReasoning: null,
    checklistItems: [
      'Angle of repose less than 5 degrees above horizontal',
      'Becomes free-flowing at or below 60°C or when transported',
      'Generally not capable of being picked up by a spade or shovel',
      'Gazetted liquid waste',
      'Liquid and solid fractions separated for further classification',
    ],
  },
  {
    stepCode: 'step_3_preclassified' as const,
    stepTitle: 'Step 3: Is the waste pre-classified?',
    defaultDecisionSummary:
      'Restricted solid waste is not generally pre-classified by default and usually arises through Step 5 assessment.',
    defaultDetailedReasoning: null,
    checklistItems: [
      'Pre-classified hazardous waste',
      'Pre-classified general solid waste (putrescible)',
      'Pre-classified general solid waste (non-putrescible)',
      'Other gazetted pre-classified waste',
      'Restricted solid waste requires Step 5 assessment',
    ],
  },
  {
    stepCode: 'step_4_hazardous_characteristics' as const,
    stepTitle: 'Step 4: Does the waste possess hazardous characteristics?',
    defaultDecisionSummary: null,
    defaultDetailedReasoning: null,
    checklistItems: [
      'Class 1 explosives',
      'Class 2 gases',
      'Division 4.1 flammable solids',
      'Division 4.2 spontaneously combustible substances',
      'Division 4.3 dangerous when wet',
      'Class 5 oxidising agents / organic peroxides',
      'Division 6.1 toxic substances',
      'Class 8 corrosive substances',
    ],
  },
  {
    stepCode: 'step_5_chemical_assessment' as const,
    stepTitle: 'Step 5: Determine classification using chemical assessment',
    defaultDecisionSummary:
      'If Step 5 is required but chemical assessment is not undertaken, the waste must be treated as hazardous.',
    defaultDetailedReasoning: null,
    checklistItems: [
      'Contaminants selected and justified',
      'Sampling rationale recorded',
      'Laboratory / analytical method note recorded',
      'SCC results entered',
      'TCLP results entered where required',
      'Threshold / rationale note recorded',
      'Justification for contaminants tested recorded',
      'Justification recorded if chemical assessment is not undertaken',
      'Lab report / sampling references linked',
      'Step 5 classification reasoning recorded',
    ],
  },
  {
    stepCode: 'step_6_putrescible' as const,
    stepTitle: 'Step 6: If general solid waste, determine putrescibility',
    defaultDecisionSummary:
      'If non-putrescible status is not established, classify the general solid waste as putrescible.',
    defaultDetailedReasoning: null,
    checklistItems: [
      'Does not readily decay / emit offensive odours / attract vermin',
      'Specific oxygen uptake criterion met',
      'Composting volatile solids reduction criterion met',
      '14-day composting temperature criterion met',
      'Otherwise classify as putrescible',
    ],
  },
];

const WASTE_CLASSIFICATION_PATHWAYS = [
  {
    pathwayCode: 'part_2_immobilisation' as const,
    title: 'Part 2: Immobilisation of waste',
    isRelevant: false,
    summaryNote: null,
    resultingAction: null,
  },
  {
    pathwayCode: 'part_3_radioactive_material' as const,
    title: 'Part 3: Waste containing radioactive material',
    isRelevant: false,
    summaryNote: null,
    resultingAction: null,
  },
  {
    pathwayCode: 'part_4_acid_sulfate_soils' as const,
    title: 'Part 4: Acid sulfate soils',
    isRelevant: false,
    summaryNote:
      'If acid sulfate soils are relevant or treated, note that Step 5 chemical assessment still applies.',
    resultingAction: null,
  },
  {
    pathwayCode: 'addendum_part_1' as const,
    title: 'Addendum to Part 1',
    isRelevant: false,
    summaryNote: null,
    resultingAction: null,
  },
];

const WASTE_CLASSIFICATION_MATERIAL_PATHWAY_DEFINITIONS = [
  {
    pathwayCode: 'venm' as const,
    title: 'VENM',
    isRelevant: true,
    defaultSupportingReasoning:
      'Use this panel to record whether the material aligns with the NSW EPA Virgin Excavated Natural Material pathway and how that informs the authored report.',
    defaultAssClass: null,
    defaultAssClassSource: null,
    defaultTreatmentManagementNote: null,
    defaultStep5ChemicalAssessmentApplies: null,
    defaultAssOrderRelevant: null,
    defaultAssExemptionRelevant: null,
    defaultOrderExemptionNote: null,
    checklistItems: [
      'Material excavated or quarried from an area not contaminated with manufactured chemicals or process residues',
      'No industrial, commercial, mining, or agricultural contamination concern',
      'No sulfidic ores or soils',
      'No asbestos concern',
    ],
  },
  {
    pathwayCode: 'enm' as const,
    title: 'ENM',
    isRelevant: true,
    defaultSupportingReasoning:
      'Use this panel to record whether the material aligns with the NSW EPA Excavated Natural Material pathway and what further authored evidence is relied on.',
    defaultAssClass: null,
    defaultAssClassSource: null,
    defaultTreatmentManagementNote: null,
    defaultStep5ChemicalAssessmentApplies: null,
    defaultAssOrderRelevant: null,
    defaultAssExemptionRelevant: null,
    defaultOrderExemptionNote: null,
    checklistItems: [
      'Excavated from the ground',
      'At least 98% natural material by weight',
      'Does not meet the VENM definition',
      'Material has not been processed',
      'Material is not from a hotspot',
      'No asbestos',
      'No ASS / PASS / sulfidic ores',
    ],
  },
  {
    pathwayCode: 'acid_sulfate_soils' as const,
    title: 'Acid Sulfate Soils',
    isRelevant: false,
    defaultSupportingReasoning:
      'Use this panel to record the NSW Planning Portal ASS class, supporting source note, and how the ASS pathway affects the authored waste classification outcome.',
    defaultAssClass: 'not_mapped_unknown' as const,
    defaultAssClassSource:
      'Manual selection in this pass. Prepared hook for NSW Planning Portal ASS layer autofill next.',
    defaultTreatmentManagementNote: null,
    defaultStep5ChemicalAssessmentApplies: true,
    defaultAssOrderRelevant: false,
    defaultAssExemptionRelevant: false,
    defaultOrderExemptionNote:
      'If acid sulfate soils are treated or reused, record whether the ASS Order or Exemption pathway is relied on and how Step 5 chemical assessment is still addressed.',
    checklistItems: [
      'ASS relevance considered for the project or waste stream',
      'ASS Order / Exemption pathway considered',
      'Treatment or reuse pathway note recorded',
      'Step 5 chemical assessment note recorded',
    ],
  },
];

function buildDraftRecommendationHelper(
  finalWasteClass: string | null | undefined,
  materialPathways: DraftRecommendationMaterialPathway[],
  authoredManagementRecommendation: string | null,
) {
  const wasteClass = finalWasteClass ?? 'not_yet_classified';
  const assPathway = materialPathways.find(
    (pathway) => pathway.pathwayCode === 'acid_sulfate_soils',
  );
  const venmPathway = materialPathways.find((pathway) => pathway.pathwayCode === 'venm');
  const enmPathway = materialPathways.find((pathway) => pathway.pathwayCode === 'enm');

  const recommendationByClass: Record<
    string,
    {
      summary: string;
      category: string;
      priority: string;
      responsibility: string;
      timingNote: string;
    }
  > = {
    special_waste: {
      summary:
        'Draft only: manage the waste as special waste with special handling controls, confirm any licensed facility requirements, and document any additional segregation or packaging controls before transport or disposal.',
      category: 'Special waste management',
      priority: 'High',
      responsibility: 'Environmental lead',
      timingNote: 'Before transport, stockpile movement, or disposal booking',
    },
    liquid_waste: {
      summary:
        'Draft only: confirm the liquid waste pathway, handling controls, receiving-facility acceptance, and transport requirements before disposal or reuse.',
      category: 'Liquid waste pathway',
      priority: 'High',
      responsibility: 'Environmental lead',
      timingNote: 'Before transport or receiving-facility nomination',
    },
    hazardous_waste: {
      summary:
        'Draft only: manage via a hazardous waste pathway with specialist handling, supporting assessment records, and receiving-facility confirmation before disposal.',
      category: 'Hazardous waste disposal',
      priority: 'High',
      responsibility: 'Environmental lead',
      timingNote: 'Before off-site movement or disposal',
    },
    restricted_solid_waste: {
      summary:
        'Draft only: confirm restricted solid waste evidence, nominated receiving facility acceptance, and the supporting Step 5 assessment record before disposal.',
      category: 'Restricted solid waste disposal',
      priority: 'High',
      responsibility: 'Environmental lead',
      timingNote: 'Before disposal classification is relied on commercially',
    },
    general_solid_non_putrescible: {
      summary:
        'Draft only: manage as general solid waste (non-putrescible) subject to receiving-facility acceptance and the retained assessment evidence for the adopted classification.',
      category: 'General solid waste (non-putrescible)',
      priority: 'Medium',
      responsibility: 'Project team',
      timingNote: 'Before disposal or beneficial reuse arrangements are finalised',
    },
    general_solid_putrescible: {
      summary:
        'Draft only: manage as general solid waste (putrescible) subject to receiving-facility acceptance, handling controls, and retained evidence for the adopted classification.',
      category: 'General solid waste (putrescible)',
      priority: 'Medium',
      responsibility: 'Project team',
      timingNote: 'Before disposal arrangements are finalised',
    },
    not_yet_classified: {
      summary:
        'Draft only: complete the Step 1–6 workflow, confirm any required Step 5 assessment, and defer any disposal direction until the final waste class is authored.',
      category: 'Classification still required',
      priority: 'Medium',
      responsibility: 'Report author',
      timingNote: 'Before issuing the report or relying on the waste class',
    },
  };

  const base = recommendationByClass[wasteClass] ??
    recommendationByClass.not_yet_classified ?? {
      summary:
        'Draft only: complete the Step 1–6 workflow before relying on a disposal pathway recommendation.',
      category: 'Classification still required',
      priority: 'Medium',
      responsibility: 'Report author',
      timingNote: 'Before issuing the report',
    };
  const considerations: string[] = [];

  if (assPathway?.isRelevant || assPathway?.assClass) {
    considerations.push(
      'If Acid Sulfate Soils are relevant, confirm any ASS Order / Exemption reliance separately and keep Step 5 chemical assessment reasoning aligned with the adopted waste class.',
    );
  }

  if (venmPathway?.outcomeStatus === 'qualifies') {
    considerations.push(
      'If VENM is being relied on, record the reuse pathway separately and note that any waste outcome is generally solid waste (non-putrescible) if it remains a waste.',
    );
  }

  if (enmPathway?.outcomeStatus === 'qualifies') {
    considerations.push(
      'If ENM is being relied on, confirm the order / exemption pathway and receiving-site acceptance separately from the final waste classification summary.',
    );
  }

  return {
    finalWasteClass: wasteClass,
    summary: [base.summary, ...considerations].join(' '),
    disclaimer:
      'This is a draft authoring helper only. It does not replace site-specific legal, transport, or receiving-facility review.',
    recommendationRow: {
      category: base.category,
      recommendation: [base.summary, ...considerations].join(' '),
      priority: base.priority,
      responsibility: base.responsibility,
      timingNote: base.timingNote,
    },
    authoredManagementRecommendationPresent: Boolean(authoredManagementRecommendation?.trim()),
  };
}

function buildReportUpdateData(dto: UpdateProjectWasteClassificationReportDto) {
  const data = pickDefined(dto, [
    'title',
    'revision',
    'documentStatus',
    'preparedBy',
    'checkedBy',
    'purpose',
    'wasteStreamName',
    'wasteSourceOrigin',
    'wasteDescription',
    'quantityEstimate',
    'proposedReceivingFacilityNote',
    'executiveSummary',
    'finalWasteClass',
    'finalClassificationReasoning',
    'managementRecommendation',
    'assumptionsLimitations',
  ]) as Prisma.ProjectWasteClassificationReportUncheckedUpdateInput;

  assignDateField(data, 'issueDate', dto.issueDate);
  assignDateField(data, 'samplingDate', dto.samplingDate);

  return data;
}

function serializeWasteClassificationReport(report: WasteClassificationReportWithContext) {
  return {
    ...report,
    issueDate: serializeDate(report.issueDate),
    samplingDate: serializeDate(report.samplingDate),
    labResults: report.labResults.map((row) => ({
      ...row,
      sccMgKg: serializeDecimal(row.sccMgKg),
      tclpMgL: serializeDecimal(row.tclpMgL),
    })),
  };
}

function serializeWasteClassificationReportSummary(report: WasteClassificationReportSummary) {
  return {
    ...report,
    issueDate: serializeDate(report.issueDate),
  };
}

function resolveReferenceTitle(
  title: string | null | undefined,
  aiDocumentFilename?: string | null,
  projectReferenceId?: string | null,
) {
  const trimmed = title?.trim();
  if (trimmed) {
    return trimmed;
  }
  if (aiDocumentFilename?.trim()) {
    return aiDocumentFilename.trim();
  }
  if (projectReferenceId?.trim()) {
    return projectReferenceId.trim();
  }
  return 'Waste classification reference';
}

function inferReferenceType(
  dto: Pick<
    CreateProjectWasteClassificationReferenceDto,
    'referenceType' | 'projectReferenceId' | 'aiDocumentId'
  >,
  aiDocument?: { id: string } | null,
) {
  if (dto.referenceType) {
    return dto.referenceType;
  }
  if (dto.projectReferenceId) {
    return 'project_reference';
  }
  if (dto.aiDocumentId || aiDocument?.id) {
    return 'ai_report';
  }
  return 'other';
}

function stepTitleForCode(code: string) {
  return (
    WASTE_CLASSIFICATION_STEP_DEFINITIONS.find((entry) => entry.stepCode === code)?.stepTitle ??
    code.replace(/_/g, ' ')
  );
}

function pathwayTitleForCode(code: string) {
  return (
    WASTE_CLASSIFICATION_PATHWAYS.find((entry) => entry.pathwayCode === code)?.title ??
    code.replace(/_/g, ' ')
  );
}

function materialPathwayTitleForCode(code: string) {
  return (
    WASTE_CLASSIFICATION_MATERIAL_PATHWAY_DEFINITIONS.find((entry) => entry.pathwayCode === code)
      ?.title ?? code.replace(/_/g, ' ')
  );
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

function throwFriendlyUniqueError(error: unknown, message: string): never {
  if (isUniqueConstraintError(error)) {
    throw new ConflictException(message);
  }
  throw error;
}

function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}
