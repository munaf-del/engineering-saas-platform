import { describe, expect, it } from 'vitest';
import type { MultiPileProjectSpecifics } from '@eng/shared';
import type { AiAssistantSuggestedField } from '@/features/ai/assistant-page-context';
import { buildProjectDetailDraftActions } from './project-detail-ai-draft-actions';
import { createProjectCurrentPageActionExecutor } from './project-current-page-action-executor';

function buildProjectSpecifics(): MultiPileProjectSpecifics {
  return {
    identity: {
      projectNumber: '221715.00',
      projectName: 'Clinical Services Building, Albury Hospital',
      client: 'Health Infrastructure',
      status: 'In Progress',
      address: 'Albury Hospital, 201 Borella Rd, Albury NSW',
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
      activeReferenceId: 'geo-ref-1',
      templateState: 'manual',
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

function buildSuggestion(
  overrides: Partial<AiAssistantSuggestedField> &
    Pick<AiAssistantSuggestedField, 'fieldPath' | 'label' | 'suggestedValue'>,
): AiAssistantSuggestedField {
  return {
    fieldPath: overrides.fieldPath,
    label: overrides.label,
    suggestedValue: overrides.suggestedValue,
    sourceType: overrides.sourceType ?? 'report_derived',
    sourceSummary: overrides.sourceSummary ?? 'Grounded report',
    rationale: overrides.rationale ?? 'Grounded in the current page context.',
    confidence: overrides.confidence ?? 0.9,
    applyMode: overrides.applyMode ?? 'fill-if-empty',
  };
}

describe('project detail AI draft actions', () => {
  it('marks unresolved fields clearly when no current-page allowlist entry exists', () => {
    const [action] = buildProjectDetailDraftActions({
      suggestions: [
        buildSuggestion({
          fieldPath: 'references[0].title',
          label: 'Reference title',
          suggestedValue: 'Report reference',
        }),
      ],
      currentPageActionExecutor: createProjectCurrentPageActionExecutor({
        projectSpecifics: buildProjectSpecifics(),
        scope: 'project-page',
        onApply: () => undefined,
      }),
    });

    expect(action).toMatchObject({
      fieldKey: 'references[0].title',
      status: 'skipped_unresolved',
      selectable: false,
    });
    expect(action?.message).toContain('outside the current Project Details allowlist');
  });

  it('marks foundations-owned fields as unresolved on the project page preview', () => {
    const [action] = buildProjectDetailDraftActions({
      suggestions: [
        buildSuggestion({
          fieldPath: 'geotechnicalBasis.foundingNotes',
          label: 'Founding notes',
          suggestedValue: 'Found within weathered schist.',
        }),
      ],
      currentPageActionExecutor: createProjectCurrentPageActionExecutor({
        projectSpecifics: buildProjectSpecifics(),
        scope: 'project-page',
        onApply: () => undefined,
      }),
    });

    expect(action).toMatchObject({
      fieldKey: 'geotechnicalBasis.foundingNotes',
      status: 'skipped_unresolved',
      selectable: false,
    });
    expect(action?.message).toContain('outside the current Project Details allowlist');
  });

  it('marks already-filled fields as skipped by default for fill-if-empty actions', () => {
    const projectSpecifics = buildProjectSpecifics();
    projectSpecifics.identity.address = 'Existing project address';

    const [action] = buildProjectDetailDraftActions({
      suggestions: [
        buildSuggestion({
          fieldPath: 'identity.address',
          label: 'Project address',
          suggestedValue: 'Replacement address',
          applyMode: 'fill-if-empty',
        }),
      ],
      currentPageActionExecutor: createProjectCurrentPageActionExecutor({
        projectSpecifics,
        scope: 'project-page',
        onApply: () => undefined,
      }),
    });

    expect(action).toMatchObject({
      fieldKey: 'identity.address',
      status: 'skipped_existing_value',
      selectable: false,
    });
    expect(action?.message).toContain('already has a value');
  });

  it('maps approved foundations scalar fields into draft actions', () => {
    const [action] = buildProjectDetailDraftActions({
      suggestions: [
        buildSuggestion({
          fieldPath: 'geotechnicalBasis.cfaUpliftMode',
          label: 'Project geotechnical default CFA uplift logic',
          suggestedValue: 'ratio-to-compression',
          applyMode: 'replace',
        }),
      ],
      currentPageActionExecutor: createProjectCurrentPageActionExecutor({
        projectSpecifics: buildProjectSpecifics(),
        scope: 'project-foundations',
        onApply: () => undefined,
      }),
      scope: 'project-foundations',
    });

    expect(action).toMatchObject({
      fieldKey: 'geotechnicalBasis.cfaUpliftMode',
      actionType: 'set_select',
      status: 'requires_manual_selection',
      selectable: true,
    });
  });

  it('marks non-foundations page fields as unresolved in the foundations draft-action preview', () => {
    const [action] = buildProjectDetailDraftActions({
      suggestions: [
        buildSuggestion({
          fieldPath: 'references[0].title',
          label: 'Reference title',
          suggestedValue: 'Out-of-scope reference title',
        }),
      ],
      currentPageActionExecutor: createProjectCurrentPageActionExecutor({
        projectSpecifics: buildProjectSpecifics(),
        scope: 'project-foundations',
        onApply: () => undefined,
      }),
      scope: 'project-foundations',
    });

    expect(action).toMatchObject({
      fieldKey: 'references[0].title',
      status: 'skipped_unresolved',
      selectable: false,
    });
    expect(action?.message).toContain('foundation / global GEO controls allowlist');
  });
});
