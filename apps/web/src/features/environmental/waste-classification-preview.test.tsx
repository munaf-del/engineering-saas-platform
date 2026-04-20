import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WasteClassificationPreview } from './waste-classification-preview';
import type { ProjectWasteClassificationReport } from './waste-classification-types';

const mockUseWasteClassificationReport = vi.fn();

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/hooks/use-waste-classification', () => ({
  useWasteClassificationReport: (...args: unknown[]) => mockUseWasteClassificationReport(...args),
}));

vi.mock('@/features/projects/project-specifics-adapter', () => ({
  extractProjectSpecifics: () => ({
    identity: {
      projectNumber: '00000000',
      projectName: 'PRECINCT 75',
      client: 'Test Client',
      address: '75-85 Mary Street, St Peters',
    },
  }),
}));

vi.mock('@/components/page-header', () => ({
  PageHeader: ({
    title,
    description,
    badges,
    actions,
  }: {
    title: React.ReactNode;
    description?: React.ReactNode;
    badges?: React.ReactNode;
    actions?: React.ReactNode;
  }) => (
    <header>
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
      {badges}
      {actions}
    </header>
  ),
}));

vi.mock('@/components/loading', () => ({
  PageLoading: () => <div>Loading…</div>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

describe('WasteClassificationPreview', () => {
  beforeEach(() => {
    mockUseWasteClassificationReport.mockReset();
  });

  it('renders saved material pathways, lab rows, related pathways, and authored outcomes', () => {
    mockUseWasteClassificationReport.mockReturnValue({
      isLoading: false,
      data: buildReportFixture(),
    });

    const markup = renderToStaticMarkup(
      <WasteClassificationPreview
        projectId="project-1"
        reportId="report-1"
        project={
          {
            id: 'project-1',
            code: '00000000',
            name: 'PRECINCT 75',
          } as never
        }
      />,
    );

    expect(markup).toContain('Material / Reuse Pathways');
    expect(markup).toContain('Acid Sulfate Soils');
    expect(markup).toContain('Auto-filled from NSW Planning Portal ASS layer');
    expect(markup).toContain('Lab / Chemical Assessment');
    expect(markup).toContain('Lead');
    expect(markup).toContain('Threshold / reference note');
    expect(markup).toContain('Related Parts / Special Pathways');
    expect(markup).toContain('Part 2: Immobilisation of waste');
    expect(markup).toContain('Confirm immobilisation approval pathway.');
    expect(markup).toContain('Final Classification Summary');
    expect(markup).toContain('General solid waste (non-putrescible)');
  });
});

function buildReportFixture(): ProjectWasteClassificationReport {
  return {
    id: 'report-1',
    projectId: 'project-1',
    title: 'Waste Classification Report',
    revision: 'A',
    issueDate: '2026-04-12',
    documentStatus: 'draft',
    preparedBy: 'Engineer',
    checkedBy: 'Reviewer',
    purpose: 'Classify excavated spoil.',
    wasteStreamName: 'Excavated spoil',
    wasteSourceOrigin: 'Former industrial site',
    wasteDescription: 'Excavated fill and site-derived spoil.',
    samplingDate: '2026-04-11',
    quantityEstimate: '120 m3',
    proposedReceivingFacilityNote: 'Subject to facility confirmation.',
    executiveSummary: 'Authored summary.',
    finalWasteClass: 'general_solid_non_putrescible',
    finalClassificationReasoning: 'Step 3 pre-classified non-putrescible waste.',
    managementRecommendation: 'Dispose subject to facility acceptance.',
    assumptionsLimitations: 'Based on current site information.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    references: [
      {
        id: 'ref-1',
        reportId: 'report-1',
        referenceType: 'epa_guideline',
        title: 'NSW EPA Waste Classification Guidelines – Part 1: Classifying waste',
        sourceUrl: 'https://example.com/part-1',
        projectReferenceId: null,
        aiDocumentId: null,
        note: null,
        isPrefilled: true,
        isIncluded: true,
        sortOrder: 0,
        aiDocument: null,
      },
    ],
    stepDecisions: [
      {
        id: 'step-3',
        reportId: 'report-1',
        stepCode: 'step_3_preclassified',
        stepTitle: 'Step 3 - Pre-classified waste',
        outcomeStatus: 'complete',
        classificationReached: true,
        resultingWasteClass: 'general_solid_non_putrescible',
        decisionSummary: 'Pre-classified outcome recorded.',
        detailedReasoning: 'The material is treated as pre-classified non-putrescible waste.',
        isApplicable: true,
        sortOrder: 2,
        checklistItems: [
          {
            id: 'check-1',
            stepDecisionId: 'step-3',
            label: 'Pre-classified general solid waste (non-putrescible)',
            isChecked: true,
            note: 'Recorded in authored assessment.',
            sortOrder: 0,
          },
        ],
      },
    ],
    labResults: [
      {
        id: 'lab-1',
        reportId: 'report-1',
        contaminant: 'Lead',
        sampleId: 'S1',
        analyticalMethod: 'AS 4439.3',
        sccMgKg: '35',
        tclpMgL: '0.02',
        thresholdReferenceNote: 'Compared against cited NSW EPA threshold note.',
        resultInterpretation: 'Below adopted threshold reference.',
        sortOrder: 0,
      },
    ],
    recommendations: [
      {
        id: 'rec-1',
        reportId: 'report-1',
        category: 'Disposal',
        recommendation: 'Confirm receiving-facility acceptance before disposal.',
        priority: 'High',
        responsibility: 'Project team',
        timingNote: 'Before transport',
        sortOrder: 0,
      },
    ],
    materialPathways: [
      {
        id: 'path-1',
        reportId: 'report-1',
        pathwayCode: 'acid_sulfate_soils',
        title: 'Acid Sulfate Soils',
        isRelevant: true,
        outcomeStatus: 'requires_further_assessment',
        testingNote: null,
        supportingReasoning: 'ASS screening remains relevant to the excavation area.',
        linkedReferenceId: null,
        assClass: 'class_2',
        assClassSource:
          'Auto-filled from NSW Planning Portal ASS layer using project address geocode.',
        projectLocationNote: 'Lookup point derived from project address geocode.',
        treatmentManagementNote: 'Keep treatment notes aligned with Step 5.',
        step5ChemicalAssessmentApplies: true,
        assOrderRelevant: true,
        assExemptionRelevant: false,
        orderExemptionNote: 'Review ASS Order before reuse.',
        sortOrder: 2,
        checklistItems: [
          {
            id: 'path-check-1',
            materialPathwayId: 'path-1',
            label: 'ASS relevance confirmed',
            isChecked: true,
            note: 'Mapped near excavation footprint.',
            sortOrder: 0,
          },
        ],
        linkedReference: null,
      },
    ],
    relatedPathways: [
      {
        id: 'related-1',
        reportId: 'report-1',
        pathwayCode: 'part_2_immobilisation',
        title: 'Part 2: Immobilisation of waste',
        isRelevant: true,
        summaryNote: 'Immobilisation considered for contingency only.',
        linkedReferenceId: 'ref-1',
        resultingAction: 'Confirm immobilisation approval pathway.',
        sortOrder: 0,
        linkedReference: {
          id: 'ref-1',
          title: 'NSW EPA Waste Classification Guidelines – Part 1: Classifying waste',
          referenceType: 'epa_guideline',
          sourceUrl: 'https://example.com/part-1',
          isIncluded: true,
        },
      },
    ],
  };
}
