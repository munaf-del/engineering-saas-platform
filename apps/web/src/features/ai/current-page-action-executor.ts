import type {
  AiAssistantDraftAction,
  AiAssistantDraftActionStatus,
  AiAssistantDraftActionType,
  AiAssistantDraftActionValue,
} from '@eng/shared';

export const CURRENT_PAGE_ACTION_OVERWRITE_MODES = ['replace', 'fill-if-empty'] as const;
export const CURRENT_PAGE_ACTION_EXECUTION_RESULT_STATUSES = [
  'applied',
  'skipped_existing_value',
  'skipped_unresolved',
  'skipped_readonly',
  'rejected_not_allowlisted',
  'failed_apply',
] as const;

export type CurrentPageActionOverwriteMode = (typeof CURRENT_PAGE_ACTION_OVERWRITE_MODES)[number];

export type CurrentPageActionExecutionResultStatus =
  (typeof CURRENT_PAGE_ACTION_EXECUTION_RESULT_STATUSES)[number];

export type CurrentPageActionCandidate = {
  id: string;
  label?: string;
  draftAction: AiAssistantDraftAction;
  overwriteMode: CurrentPageActionOverwriteMode;
};

export type CurrentPageActionEvaluation = {
  fieldKey: string;
  actionType: AiAssistantDraftActionType;
  currentValue: AiAssistantDraftActionValue | null;
  proposedValue: AiAssistantDraftActionValue | null;
  status: AiAssistantDraftActionStatus;
  message: string | null;
  selectable: boolean;
  selectedByDefault: boolean;
  executionStatus: CurrentPageActionExecutionResultStatus | 'ready';
};

export type CurrentPageActionExecutionResult = {
  id: string;
  label?: string;
  fieldKey: string;
  actionType: AiAssistantDraftActionType;
  currentValue: AiAssistantDraftActionValue | null;
  proposedValue: AiAssistantDraftActionValue | null;
  status: CurrentPageActionExecutionResultStatus;
  message: string;
};

export type CurrentPageActionExecutionSummary = Record<
  CurrentPageActionExecutionResultStatus,
  number
>;

export type CurrentPageActionExecutionBatchResult = {
  results: CurrentPageActionExecutionResult[];
  summary: CurrentPageActionExecutionSummary;
  appliedCount: number;
};

export type CurrentPageActionExecutor = {
  getCurrentValue: (fieldKey: string) => AiAssistantDraftActionValue | null;
  evaluateDraftAction: (candidate: CurrentPageActionCandidate) => CurrentPageActionEvaluation;
  executeDraftActions: (
    candidates: CurrentPageActionCandidate[],
  ) => CurrentPageActionExecutionBatchResult;
};

export function createEmptyCurrentPageActionExecutionSummary(): CurrentPageActionExecutionSummary {
  return {
    applied: 0,
    skipped_existing_value: 0,
    skipped_unresolved: 0,
    skipped_readonly: 0,
    rejected_not_allowlisted: 0,
    failed_apply: 0,
  };
}

export function summarizeCurrentPageActionResults(
  results: CurrentPageActionExecutionResult[],
): CurrentPageActionExecutionSummary {
  const summary = createEmptyCurrentPageActionExecutionSummary();

  results.forEach((result) => {
    summary[result.status] += 1;
  });

  return summary;
}
