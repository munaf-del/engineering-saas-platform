import { BadRequestException } from '@nestjs/common';
jest.mock('../projects/project-specifics.adapter', () => ({
  getProjectSpecificsFromProjectMetadata: jest.fn(() => null),
}));
import { ProjectWasteClassificationService } from './waste-classification.service';
import type { PrismaService } from '../../common/prisma/prisma.service';
import type { NswAssAutofillService } from './nsw-ass-autofill.service';

describe('ProjectWasteClassificationService', () => {
  let service: ProjectWasteClassificationService;
  let prisma: {
    project: { findFirst: jest.Mock };
    projectSpatialFeature: { findMany: jest.Mock };
    projectWasteClassificationReport: {
      create: jest.Mock;
      update: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
    };
  };
  let nswAssAutofillService: {
    autofillForProject: jest.Mock;
  };

  const access = {
    projectId: 'project-1',
    organisationId: 'org-1',
    userId: 'user-1',
    orgRole: 'admin',
  };

  beforeEach(() => {
    prisma = {
      project: {
        findFirst: jest.fn(),
      },
      projectSpatialFeature: {
        findMany: jest.fn(),
      },
      projectWasteClassificationReport: {
        create: jest.fn(),
        update: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    nswAssAutofillService = {
      autofillForProject: jest.fn(),
    };

    service = new ProjectWasteClassificationService(
      prisma as unknown as PrismaService,
      nswAssAutofillService as unknown as NswAssAutofillService,
    );
  });

  it('creates a report with prefilled scaffold rows', async () => {
    jest
      .spyOn(service as any, 'assertProjectWriteAccess')
      .mockResolvedValue({ id: access.projectId });
    prisma.projectWasteClassificationReport.create.mockResolvedValue(
      buildMockWasteClassificationReport(),
    );

    const result = await service.createReport(access, { title: 'Soil spoil classification' });

    expect(prisma.projectWasteClassificationReport.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          projectId: access.projectId,
          title: 'Soil spoil classification',
          references: expect.objectContaining({
            create: expect.arrayContaining([
              expect.objectContaining({
                title: 'NSW EPA Waste Classification Guidelines – Part 1: Classifying waste',
              }),
            ]),
          }),
          stepDecisions: expect.objectContaining({
            create: expect.arrayContaining([
              expect.objectContaining({
                stepCode: 'step_1_special_waste',
              }),
              expect.objectContaining({
                stepCode: 'step_5_chemical_assessment',
              }),
            ]),
          }),
          materialPathways: expect.objectContaining({
            create: expect.arrayContaining([
              expect.objectContaining({ pathwayCode: 'venm' }),
              expect.objectContaining({ pathwayCode: 'enm' }),
              expect.objectContaining({ pathwayCode: 'acid_sulfate_soils' }),
            ]),
          }),
        }),
      }),
    );
    expect(result.id).toBe('report-1');
  });

  it('updates report root fields and returns the refreshed report', async () => {
    jest
      .spyOn(service as any, 'assertProjectWriteAccess')
      .mockResolvedValue({ id: access.projectId });
    jest.spyOn(service as any, 'assertReportExists').mockResolvedValue({ id: 'report-1' });
    jest
      .spyOn(service as any, 'findExistingReport')
      .mockResolvedValue({ id: 'report-1', managementRecommendation: 'Updated summary' });

    const result = await service.updateReport(access, 'report-1', {
      managementRecommendation: 'Updated summary',
      finalWasteClass: 'general_solid_non_putrescible',
    });

    expect(prisma.projectWasteClassificationReport.update).toHaveBeenCalledWith({
      where: { id: 'report-1' },
      data: expect.objectContaining({
        managementRecommendation: 'Updated summary',
        finalWasteClass: 'general_solid_non_putrescible',
      }),
    });
    expect(result).toEqual({
      id: 'report-1',
      managementRecommendation: 'Updated summary',
    });
  });

  it('returns an ASS autofill result for the ASS material pathway', async () => {
    jest.spyOn(service as any, 'assertProjectWriteAccess').mockResolvedValue({
      id: access.projectId,
      name: 'Precinct 75',
      code: '00000000',
      metadata: {},
    });
    jest.spyOn(service as any, 'assertReportExists').mockResolvedValue({ id: 'report-1' });
    jest.spyOn(service as any, 'assertMaterialPathwayExists').mockResolvedValue({
      id: 'pathway-1',
      pathwayCode: 'acid_sulfate_soils',
    });
    prisma.projectSpatialFeature.findMany.mockResolvedValue([]);
    nswAssAutofillService.autofillForProject.mockResolvedValue({
      assClass: 'class_5',
      assClassSource: 'Auto-filled from NSW Planning Portal ASS layer using project coordinates.',
      projectLocationNote: 'Lookup point derived from project coordinates.',
      detectionMethod: 'project_coordinates',
      matchedPlanningPortalClass: 'Class 5',
    });

    const result = await service.autofillAssMaterialPathway(access, 'report-1', 'pathway-1');

    expect(nswAssAutofillService.autofillForProject).toHaveBeenCalled();
    expect(result.assClass).toBe('class_5');
    expect(result.matchedPlanningPortalClass).toBe('Class 5');
  });

  it('rejects ASS autofill on non-ASS pathways', async () => {
    jest
      .spyOn(service as any, 'assertProjectWriteAccess')
      .mockResolvedValue({ id: access.projectId });
    jest.spyOn(service as any, 'assertReportExists').mockResolvedValue({ id: 'report-1' });
    jest.spyOn(service as any, 'assertMaterialPathwayExists').mockResolvedValue({
      id: 'pathway-1',
      pathwayCode: 'venm',
    });

    await expect(
      service.autofillAssMaterialPathway(access, 'report-1', 'pathway-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('generates a draft recommendation without mutating authored values', async () => {
    jest
      .spyOn(service as any, 'assertProjectReadAccess')
      .mockResolvedValue({ id: access.projectId });
    jest.spyOn(service as any, 'assertReportExists').mockResolvedValue({ id: 'report-1' });
    prisma.projectWasteClassificationReport.findUnique.mockResolvedValue({
      id: 'report-1',
      finalWasteClass: 'hazardous_waste',
      managementRecommendation: 'Existing authored recommendation',
      materialPathways: [
        {
          pathwayCode: 'acid_sulfate_soils',
          isRelevant: true,
          outcomeStatus: 'requires_further_assessment',
          assClass: 'class_2',
          assOrderRelevant: true,
          assExemptionRelevant: false,
        },
      ],
    } as never);
    prisma.projectWasteClassificationReport.update.mockResolvedValue(
      buildMockWasteClassificationReport(),
    );

    const result = await service.generateDraftRecommendation(access, 'report-1', {
      finalWasteClass: 'hazardous_waste',
    });

    expect(result.authoredManagementRecommendationPresent).toBe(true);
    expect(result.summary).toContain('hazardous waste pathway');
    expect(prisma.projectWasteClassificationReport.update).not.toHaveBeenCalled();
  });
});

function buildMockWasteClassificationReport() {
  return {
    id: 'report-1',
    projectId: 'project-1',
    title: 'Waste Classification Report',
    revision: null,
    issueDate: null,
    documentStatus: 'draft',
    preparedBy: null,
    checkedBy: null,
    purpose: null,
    wasteStreamName: null,
    wasteSourceOrigin: null,
    wasteDescription: null,
    samplingDate: null,
    quantityEstimate: null,
    proposedReceivingFacilityNote: null,
    executiveSummary: null,
    finalWasteClass: 'not_yet_classified',
    finalClassificationReasoning: null,
    managementRecommendation: null,
    assumptionsLimitations: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    references: [],
    stepDecisions: [],
    labResults: [],
    recommendations: [],
    materialPathways: [],
    relatedPathways: [],
  };
}
