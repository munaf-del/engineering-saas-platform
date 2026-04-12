import { describe, expect, it } from 'vitest';
import {
  applyAssAutofillResultToPathway,
  applyWasteClassificationDraftSuggestion,
  buildWasteClassificationDraftSuggestions,
} from './waste-classification-draft-helpers';
import type {
  ProjectWasteClassificationMaterialPathway,
  ProjectWasteClassificationReport,
  ProjectWasteClassificationReportRootInput,
} from './waste-classification-types';

describe('waste-classification draft helpers', () => {
  it('applies a draft suggestion into the editable report draft', () => {
    const draft: ProjectWasteClassificationReportRootInput = {
      wasteDescription: '',
      finalClassificationReasoning: 'Existing authored reasoning.',
    };

    const next = applyWasteClassificationDraftSuggestion(draft, {
      id: 'suggestion-1',
      field: 'finalClassificationReasoning',
      label: 'Final classification reasoning',
      suggestedValue: 'Add Step 5 threshold comparison note.',
      sourceType: 'lab_result',
      sourceLabel: 'Lab / chemical assessment table',
      rationale: 'Derived from current lab rows.',
    });

    expect(next.finalClassificationReasoning).toContain('Existing authored reasoning.');
    expect(next.finalClassificationReasoning).toContain('Add Step 5 threshold comparison note.');
  });

  it('applies an ASS autofill result without discarding manual notes', () => {
    const pathway: ProjectWasteClassificationMaterialPathway = {
      id: 'path-1',
      reportId: 'report-1',
      pathwayCode: 'acid_sulfate_soils',
      title: 'Acid Sulfate Soils',
      isRelevant: true,
      outcomeStatus: 'requires_further_assessment',
      testingNote: null,
      supportingReasoning: null,
      linkedReferenceId: null,
      assClass: 'not_mapped_unknown',
      assClassSource: null,
      projectLocationNote: 'Manual site context note.',
      treatmentManagementNote: null,
      step5ChemicalAssessmentApplies: true,
      assOrderRelevant: false,
      assExemptionRelevant: false,
      orderExemptionNote: null,
      sortOrder: 0,
      checklistItems: [],
      linkedReference: null,
    };

    const next = applyAssAutofillResultToPathway(pathway, {
      assClass: 'class_5',
      assClassSource: 'Auto-filled from NSW Planning Portal ASS layer.',
      projectLocationNote: 'Lookup point derived from project coordinates.',
      detectionMethod: 'project_coordinates',
      matchedPlanningPortalClass: 'Class 5',
    });

    expect(next.assClass).toBe('class_5');
    expect(next.assClassSource).toContain('NSW Planning Portal');
    expect(next.projectLocationNote).toContain('Manual site context note.');
    expect(next.projectLocationNote).toContain('Autofill note');
  });

  it('builds useful draft suggestions from linked AI reports and lab rows', () => {
    const report = buildReportFixture();

    const suggestions = buildWasteClassificationDraftSuggestions({
      report,
      projectReferences: [],
      aiDocuments: [
        {
          id: 'ai-1',
          projectId: 'project-1',
          pileGroupId: null,
          kind: 'engineering_report',
          documentFamily: 'environmental',
          reportType: 'contamination_assessment',
          ownerWorkspace: 'environmental',
          filename: 'Site contamination assessment.pdf',
          mimeType: 'application/pdf',
          storagePath: '/tmp/site-contamination-assessment.pdf',
          openaiFileId: null,
          openaiVectorStoreId: null,
          status: 'extracted',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          extractionRuns: [
            {
              id: 'run-1',
              documentId: 'ai-1',
              model: 'gpt-5.4',
              status: 'completed',
              requestJson: {},
              resultJson: {
                documentFamily: { value: 'GEOTECHNICAL_REPORT', citations: [] },
                reportTitle: { value: 'Site contamination assessment', citations: [] },
                projectSummary: { value: 'Excavation spoil from former industrial land.', citations: [] },
                reportSections: {
                  fillMaterials: [{ value: 'Excavated fill and site-derived spoil', citations: [] }],
                },
                structuralDefaults: {
                  concreteMentions: [],
                  coverDurabilityMentions: [],
                  reinforcementMentions: [],
                },
                geotechnicalBasis: {
                  foundingNotes: [],
                  groundwaterNotes: [],
                  groundwaterDesignAssumptions: [],
                  hydrostaticAssumptions: [],
                  materialMentions: [{ value: 'Excavated fill', citations: [] }],
                  rockStrataDesignParameters: [],
                  pileRecommendations: [],
                  footingRecommendations: [],
                  raftRecommendations: [],
                  shoringRecommendations: [],
                  aggressivityDurabilityNotes: [],
                  furtherInvestigationNotes: [],
                },
                loadMentions: {
                  loadCases: [],
                  combinations: [],
                },
                citations: [],
              },
              createdAt: new Date().toISOString(),
            },
          ],
        },
      ],
    });

    expect(suggestions.some((suggestion) => suggestion.field === 'wasteDescription')).toBe(true);
    expect(
      suggestions.some((suggestion) => suggestion.field === 'finalClassificationReasoning'),
    ).toBe(true);
  });
});

function buildReportFixture(): ProjectWasteClassificationReport {
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    references: [
      {
        id: 'reference-1',
        reportId: 'report-1',
        referenceType: 'ai_report',
        title: 'Linked contamination assessment',
        sourceUrl: null,
        projectReferenceId: null,
        aiDocumentId: 'ai-1',
        note: null,
        isPrefilled: false,
        isIncluded: true,
        sortOrder: 0,
        aiDocument: null,
      },
    ],
    stepDecisions: [],
    labResults: [
      {
        id: 'lab-1',
        reportId: 'report-1',
        contaminant: 'Lead',
        sampleId: 'S1',
        analyticalMethod: null,
        sccMgKg: null,
        tclpMgL: null,
        thresholdReferenceNote: null,
        resultInterpretation: null,
        sortOrder: 0,
      },
    ],
    recommendations: [],
    materialPathways: [],
    relatedPathways: [],
  };
}
