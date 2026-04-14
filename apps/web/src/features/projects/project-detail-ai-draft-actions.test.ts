import { describe, expect, it } from 'vitest';
import type { MultiPileProjectSpecifics } from '@eng/shared';
import type { AiAssistantSuggestedField } from '@/features/ai/assistant-page-context';
import {
  appendProjectDetailDraftActionOperation,
  buildProjectDetailDraftActions,
  createProjectDetailDraftActionDismissOperation,
  formatProjectDetailDraftActionOperationSummary,
  resolveProjectDetailDraftActionCandidates,
  summarizeProjectDetailDraftActionOperation,
} from './project-detail-ai-draft-actions';
import { createProjectCurrentPageActionExecutor } from './project-current-page-action-executor';
import { createProjectSettingsCurrentPageActionExecutor } from './project-settings-current-page-action-executor';

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
      unsupported: true,
      selectable: false,
    });
    expect(action?.message).toBe(
      'This field is not supported for guided draft apply on this page.',
    );
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
      unsupported: true,
      selectable: false,
    });
    expect(action?.message).toBe(
      'This field is not supported for guided draft apply on this page.',
    );
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
      unsupported: false,
      selectable: false,
    });
    expect(action?.message).toContain('already has a value');
  });

  it('surfaces the archived project checkbox as a sensitive manual-selection draft action on the project page', () => {
    const actions = buildProjectDetailDraftActions({
      suggestions: [
        buildSuggestion({
          fieldPath: 'identity.archived',
          label: 'Archived project',
          suggestedValue: 'Yes',
          applyMode: 'fill-if-empty',
          rationale: 'The user explicitly asked to archive only the current page draft.',
        }),
      ],
      currentPageActionExecutor: createProjectCurrentPageActionExecutor({
        projectSpecifics: buildProjectSpecifics(),
        scope: 'project-page',
        onApply: () => undefined,
      }),
    });

    expect(actions).toHaveLength(1);
    const archivedAction = actions[0];
    if (!archivedAction) {
      throw new Error('Expected archived draft action');
    }

    expect(archivedAction).toMatchObject({
      fieldKey: 'identity.archived',
      actionType: 'set_checkbox',
      currentValue: false,
      proposedValue: true,
      status: 'requires_manual_selection',
      selectable: true,
      selectedByDefault: false,
      unsupported: false,
      message:
        'This would change only the Archived project checkbox in the current Project Details draft. Select it manually to confirm this sensitive draft-only change. Save remains manual.',
    });

    const [candidate] = resolveProjectDetailDraftActionCandidates(actions, [archivedAction.id]);
    expect(candidate).toMatchObject({
      overwriteMode: 'replace',
      draftAction: {
        fieldKey: 'identity.archived',
        actionType: 'set_checkbox',
      },
    });
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
      unsupported: false,
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
      unsupported: true,
      selectable: false,
    });
    expect(action?.message).toBe(
      'This field is not supported for guided draft apply on this page.',
    );
  });

  it('maps approved project settings scalar fields into draft actions', () => {
    const [action] = buildProjectDetailDraftActions({
      suggestions: [
        buildSuggestion({
          fieldPath: 'projectSettings.description',
          label: 'Project description',
          suggestedValue: 'New healthcare building delivery project.',
        }),
      ],
      currentPageActionExecutor: createProjectSettingsCurrentPageActionExecutor({
        draft: {
          name: 'Clinical Services Building',
          description: '',
          status: 'active',
          standardsProfileId: '',
        },
        onApply: () => undefined,
      }),
      scope: 'project-settings',
    });

    expect(action).toMatchObject({
      fieldKey: 'projectSettings.description',
      actionType: 'set_textarea',
      status: 'ready',
      unsupported: false,
      selectable: true,
    });
  });

  it('marks non-settings fields as unresolved in the project settings draft-action preview', () => {
    const [action] = buildProjectDetailDraftActions({
      suggestions: [
        buildSuggestion({
          fieldPath: 'identity.address',
          label: 'Project address',
          suggestedValue: '75-85 Mary Street, St Peters NSW 2044',
        }),
      ],
      currentPageActionExecutor: createProjectSettingsCurrentPageActionExecutor({
        draft: {
          name: 'Clinical Services Building',
          description: '',
          status: 'active',
          standardsProfileId: '',
        },
        onApply: () => undefined,
      }),
      scope: 'project-settings',
    });

    expect(action).toMatchObject({
      fieldKey: 'identity.address',
      status: 'skipped_unresolved',
      unsupported: true,
      selectable: false,
    });
    expect(action?.message).toBe(
      'This field is not supported for guided draft apply on this page.',
    );
  });

  it('keeps explicit out-of-allowlist draft actions visible but unsupported on supported pages', () => {
    const [action] = buildProjectDetailDraftActions({
      suggestions: [
        buildSuggestion({
          fieldPath: 'identity.address',
          label: 'Project address',
          suggestedValue: '75-85 Mary Street, St Peters NSW 2044',
        }),
      ],
      draftActions: [
        {
          fieldKey: 'identity.address',
          actionType: 'set_text',
          proposedValue: '75-85 Mary Street, St Peters NSW 2044',
          status: 'ready',
          label: 'Project address',
          reason: 'Grounded in the current page context.',
        },
      ],
      currentPageActionExecutor: createProjectSettingsCurrentPageActionExecutor({
        draft: {
          name: 'Clinical Services Building',
          description: '',
          status: 'active',
          standardsProfileId: '',
        },
        onApply: () => undefined,
      }),
      scope: 'project-settings',
    });

    expect(action).toMatchObject({
      fieldKey: 'identity.address',
      status: 'skipped_unresolved',
      unsupported: true,
      selectable: false,
    });
    expect(action?.message).toBe(
      'This field is not supported for guided draft apply on this page.',
    );
  });

  it('excludes unsupported preview rows from the applicable action set on supported pages', () => {
    const actions = buildProjectDetailDraftActions({
      suggestions: [
        buildSuggestion({
          fieldPath: 'projectSettings.description',
          label: 'Project description',
          suggestedValue: 'New healthcare building delivery project.',
        }),
        buildSuggestion({
          fieldPath: 'identity.address',
          label: 'Project address',
          suggestedValue: '75-85 Mary Street, St Peters NSW 2044',
        }),
      ],
      currentPageActionExecutor: createProjectSettingsCurrentPageActionExecutor({
        draft: {
          name: 'Clinical Services Building',
          description: '',
          status: 'active',
          standardsProfileId: '',
        },
        onApply: () => undefined,
      }),
      scope: 'project-settings',
    });

    const applicableActionIds = actions
      .filter((action) => action.status === 'ready')
      .map((action) => action.id);

    expect(actions.map((action) => [action.fieldKey, action.unsupported])).toEqual([
      ['projectSettings.description', false],
      ['identity.address', true],
    ]);
    expect(
      resolveProjectDetailDraftActionCandidates(actions, applicableActionIds).map(
        (candidate) => candidate.draftAction.fieldKey,
      ),
    ).toEqual(['projectSettings.description']);
  });

  it('groups execution results into compact audit summary counts', () => {
    const summary = summarizeProjectDetailDraftActionOperation({
      id: 'op-1',
      kind: 'apply_selected',
      occurredAt: Date.now(),
      summary: {
        applied: 2,
        skipped_existing_value: 1,
        skipped_unresolved: 1,
        skipped_readonly: 1,
        rejected_not_allowlisted: 1,
        failed_apply: 1,
      },
      results: [],
    });

    expect(summary).toEqual({
      applied: 2,
      skipped: 3,
      rejected: 1,
      failed: 1,
      dismissed: false,
    });
  });

  it('formats dismiss operations with the grouped audit summary line', () => {
    expect(
      formatProjectDetailDraftActionOperationSummary({
        id: 'op-2',
        kind: 'dismiss',
        occurredAt: Date.now(),
        summary: {
          applied: 0,
          skipped_existing_value: 0,
          skipped_unresolved: 0,
          skipped_readonly: 0,
          rejected_not_allowlisted: 0,
          failed_apply: 0,
        },
        results: [],
      }),
    ).toBe('Applied: 0 · Skipped: 0 · Rejected: 0 · Failed: 0 · Dismissed: yes');
  });

  it('resolves apply candidates from only the selected selectable draft actions', () => {
    const actions = buildProjectDetailDraftActions({
      suggestions: [
        buildSuggestion({
          fieldPath: 'identity.latitude',
          label: 'Project latitude',
          suggestedValue: '-33.91234',
        }),
        buildSuggestion({
          fieldPath: 'identity.address',
          label: 'Project address',
          suggestedValue: 'Replacement address',
          applyMode: 'replace',
        }),
        buildSuggestion({
          fieldPath: 'references[0].title',
          label: 'Reference title',
          suggestedValue: 'Out-of-scope reference',
        }),
      ],
      currentPageActionExecutor: createProjectCurrentPageActionExecutor({
        projectSpecifics: buildProjectSpecifics(),
        scope: 'project-page',
        onApply: () => undefined,
      }),
      scope: 'project-page',
    });

    const candidates = resolveProjectDetailDraftActionCandidates(
      actions,
      actions.map((action) => action.id),
    );

    expect(candidates.map((candidate) => candidate.draftAction.fieldKey)).toEqual([
      'identity.latitude',
      'identity.address',
    ]);
  });

  it('creates dismiss operations with empty execution results for session history', () => {
    const operation = createProjectDetailDraftActionDismissOperation(1_700_000_000_000);

    expect(operation).toMatchObject({
      kind: 'dismiss',
      occurredAt: 1_700_000_000_000,
      results: [],
      summary: {
        applied: 0,
        skipped_existing_value: 0,
        skipped_unresolved: 0,
        skipped_readonly: 0,
        rejected_not_allowlisted: 0,
        failed_apply: 0,
      },
    });
  });

  it('caps operation history to the five most recent entries', () => {
    const history = Array.from({ length: 5 }, (_, index) =>
      createProjectDetailDraftActionDismissOperation(1_700_000_000_000 + index),
    );
    const latestOperation = createProjectDetailDraftActionDismissOperation(1_700_000_000_999);

    const nextHistory = appendProjectDetailDraftActionOperation(history, latestOperation);

    expect(nextHistory).toHaveLength(5);
    expect(nextHistory[0]?.occurredAt).toBe(1_700_000_000_999);
    expect(nextHistory.at(-1)?.occurredAt).toBe(1_700_000_000_003);
  });
});
