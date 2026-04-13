import { describe, expect, it } from 'vitest';
import type {
  AiAssistantSuggestedField,
  AiAssistantSuggestionApplyAdapter,
} from '@/features/ai/assistant-page-context';
import { buildProjectDetailDraftActions } from './project-detail-ai-draft-actions';

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

function buildSuggestionAdapter({
  currentValues = {},
  blockedFields = [],
}: {
  currentValues?: Record<string, string | null>;
  blockedFields?: string[];
}): AiAssistantSuggestionApplyAdapter {
  return {
    getCurrentValue: (fieldPath) => currentValues[fieldPath] ?? null,
    canApplyField: (fieldPath) => !blockedFields.includes(fieldPath),
    applySuggestions: () => ({ appliedCount: 0, skippedCount: 0 }),
  };
}

describe('project detail AI draft actions', () => {
  it('marks unresolved fields clearly when no Project Details field mapping exists', () => {
    const [action] = buildProjectDetailDraftActions({
      suggestions: [
        buildSuggestion({
          fieldPath: 'references[0].title',
          label: 'Reference title',
          suggestedValue: 'Report reference',
        }),
      ],
      suggestionAdapter: buildSuggestionAdapter({}),
    });

    expect(action).toMatchObject({
      fieldKey: 'references[0].title',
      status: 'skipped_unresolved',
      selectable: false,
    });
    expect(action?.message).toContain('not wired');
  });

  it('marks mapped fields as unresolved when current-page apply is not allowed', () => {
    const [action] = buildProjectDetailDraftActions({
      suggestions: [
        buildSuggestion({
          fieldPath: 'identity.address',
          label: 'Project address',
          suggestedValue: '75-85 Mary Street, St Peters',
        }),
      ],
      suggestionAdapter: buildSuggestionAdapter({
        blockedFields: ['identity.address'],
      }),
    });

    expect(action).toMatchObject({
      fieldKey: 'identity.address',
      status: 'skipped_unresolved',
      selectable: false,
    });
    expect(action?.message).toContain('outside the current Project Details integration scope');
  });

  it('marks already-filled fields as skipped by default for fill-if-empty actions', () => {
    const [action] = buildProjectDetailDraftActions({
      suggestions: [
        buildSuggestion({
          fieldPath: 'identity.address',
          label: 'Project address',
          suggestedValue: 'Replacement address',
          applyMode: 'fill-if-empty',
        }),
      ],
      suggestionAdapter: buildSuggestionAdapter({
        currentValues: {
          'identity.address': 'Existing project address',
        },
      }),
    });

    expect(action).toMatchObject({
      fieldKey: 'identity.address',
      status: 'skipped_existing_value',
      selectable: false,
    });
    expect(action?.message).toContain('already has a value');
  });
});
