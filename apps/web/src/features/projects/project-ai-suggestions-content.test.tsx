import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { MultiPileProjectSpecifics } from '@eng/shared';
import { describe, expect, it, vi } from 'vitest';
import type { AiAssistantStructuredResponse } from '@/features/ai/assistant-types';
import { ProjectAiSuggestionsContent } from './project-ai-suggestions-content';
import { createProjectCurrentPageActionExecutor } from './project-current-page-action-executor';
import { createProjectSettingsCurrentPageActionExecutor } from './project-settings-current-page-action-executor';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: () => undefined,
  }),
}));

function buildProjectSpecifics(): MultiPileProjectSpecifics {
  return {
    identity: {
      projectNumber: '221715.00',
      projectName: 'Clinical Services Building, Albury Hospital',
      client: 'Health Infrastructure',
      status: 'In Progress',
      address: 'Existing address',
      latitude: '',
      longitude: '',
      mapAddress: '',
      notes: '',
      archived: false,
      projectLogo: '',
      mapSource: 'auto',
    },
    reportMeta: {
      reportTitle: '',
      reportRevision: '',
      issueDate: '',
      preparedBy: '',
      checkedBy: '',
      purpose: '',
    },
    references: [],
    structuralDefaults: {
      concreteClasses: [],
      reinforcementGrades: [],
      tendonGrades: [],
      coverDurabilityClasses: [],
    },
    geotechnicalMaterials: {
      activeReferenceId: '',
      templateState: 'empty',
      materials: [],
    },
    geotechnicalBasis: {
      groundwaterDesignNotes: '',
      cfaUpliftMode: 'manual-entry',
      cfaUpliftFactor: 1,
      defaultSocketAssumptions: '',
      foundingNotes: '',
      commentary: '',
      arrAssessment: {
        irrValues: [],
        testType: 'NONE',
        testPilePercentage: 0,
        weightTotal: 0,
        weightedScore: 0,
        arrValue: 0,
        arrBand: 'Not assessed',
        phiTf: null,
        testBenefitK: 1,
        phiGbLow: 0,
        phiGbHigh: 0,
        phiGLow: 0,
        phiGHigh: 0,
      },
    },
  };
}

describe('Project AI suggestions content', () => {
  it('keeps unsupported candidates visible in the supported-page draft-action preview', () => {
    const response: AiAssistantStructuredResponse = {
      answer: '',
      visiblePageFacts: [],
      toolFindings: [],
      inferredLikelyIssues: [],
      standardsReferenceNotes: [],
      suggestedNextSteps: [],
      suggestedFields: [
        {
          fieldPath: 'projectSettings.description',
          label: 'Project description',
          suggestedValue: 'New healthcare building delivery project.',
          sourceType: 'report_derived',
          sourceSummary: 'Grounded report',
          rationale: 'Grounded in the current page context.',
          confidence: 0.9,
          applyMode: 'fill-if-empty',
        },
        {
          fieldPath: 'identity.address',
          label: 'Project address',
          suggestedValue: '75-85 Mary Street, St Peters NSW 2044',
          sourceType: 'report_derived',
          sourceSummary: 'Grounded report',
          rationale: 'Grounded in the current page context.',
          confidence: 0.9,
          applyMode: 'fill-if-empty',
        },
      ],
      draftActions: [],
      limitationNote: null,
    };

    const markup = renderToStaticMarkup(
      <ProjectAiSuggestionsContent
        response={response}
        suggestionAdapter={null}
        currentPageActionExecutor={createProjectSettingsCurrentPageActionExecutor({
          draft: {
            name: 'Clinical Services Building',
            description: '',
            status: 'active',
            standardsProfileId: '',
          },
          onApply: () => undefined,
        })}
        draftActionAdapter={{
          kind: 'project',
          scope: 'project-settings',
          projectSpecifics: buildProjectSpecifics(),
          aiReportsHref: null,
        }}
        presentation="card"
      />,
    );

    expect(markup).toContain('Project description');
    expect(markup).toContain('Project address');
    expect(markup).toContain('Unsupported');
    expect(markup).toContain('This field is not supported for guided draft apply on this page.');
  });

  it('adds archived-specific confirmation wording in the assistant action bar', () => {
    const response: AiAssistantStructuredResponse = {
      answer: '',
      visiblePageFacts: [],
      toolFindings: [],
      inferredLikelyIssues: [],
      standardsReferenceNotes: [],
      suggestedNextSteps: [],
      suggestedFields: [
        {
          fieldPath: 'identity.archived',
          label: 'Archived project',
          suggestedValue: 'Yes',
          sourceType: 'page_context_inference',
          sourceSummary: 'Current page request',
          rationale: 'The user explicitly asked to archive only the current page draft.',
          confidence: 0.94,
          applyMode: 'fill-if-empty',
        },
      ],
      draftActions: [],
      limitationNote: null,
    };

    const markup = renderToStaticMarkup(
      <ProjectAiSuggestionsContent
        response={response}
        suggestionAdapter={null}
        currentPageActionExecutor={createProjectCurrentPageActionExecutor({
          projectSpecifics: buildProjectSpecifics(),
          scope: 'project-page',
          onApply: () => undefined,
        })}
        draftActionAdapter={{
          kind: 'project',
          scope: 'project-page',
          projectSpecifics: buildProjectSpecifics(),
          aiReportsHref: null,
        }}
        presentation="assistant"
      />,
    );

    expect(markup).toContain('Assistant Actions');
    expect(markup).toContain(
      'Archived project is sensitive. Confirming it here only stages the Archived project checkbox on this page, does not archive anything on other pages, and still requires Save Project Details afterward.',
    );
  });
});
