export const AI_ASSISTANT_DRAFT_ACTION_TYPES = [
  'set_text',
  'set_textarea',
  'set_select',
  'set_checkbox',
] as const;

export const AI_ASSISTANT_DRAFT_ACTION_STATUSES = [
  'ready',
  'requires_manual_selection',
  'skipped_unresolved',
  'skipped_readonly',
  'skipped_existing_value',
] as const;

export type AiAssistantDraftActionType =
  (typeof AI_ASSISTANT_DRAFT_ACTION_TYPES)[number];

export type AiAssistantDraftActionStatus =
  (typeof AI_ASSISTANT_DRAFT_ACTION_STATUSES)[number];

export type AiAssistantDraftActionValue = string | boolean;

export interface AiAssistantDraftAction {
  fieldKey: string;
  actionType: AiAssistantDraftActionType;
  proposedValue: AiAssistantDraftActionValue;
  label?: string;
  currentValue?: AiAssistantDraftActionValue | null;
  reason?: string | null;
  status: AiAssistantDraftActionStatus;
  message?: string | null;
}
