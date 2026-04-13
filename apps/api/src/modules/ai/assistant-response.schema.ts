import { z } from 'zod/v4';

export const ASSISTANT_SUGGESTION_SOURCE_TYPES = [
  'report_derived',
  'page_context_inference',
  'internal_tool',
  'project_state',
  'standards_reference',
] as const;

export const ASSISTANT_SUGGESTION_APPLY_MODES = ['replace', 'fill-if-empty'] as const;
export const ASSISTANT_DRAFT_ACTION_TYPES = [
  'set_text',
  'set_textarea',
  'set_select',
  'set_checkbox',
] as const;
export const ASSISTANT_DRAFT_ACTION_STATUSES = [
  'ready',
  'requires_manual_selection',
  'skipped_unresolved',
  'skipped_readonly',
  'skipped_existing_value',
] as const;

export const assistantSuggestedFieldSchema = z
  .object({
    fieldPath: z.string().min(1).max(200),
    label: z.string().min(1).max(160),
    suggestedValue: z.string().min(1).max(500),
    sourceType: z.enum(ASSISTANT_SUGGESTION_SOURCE_TYPES),
    sourceSummary: z.string().min(1).max(300),
    rationale: z.string().min(1).max(500),
    confidence: z.number().min(0).max(1).nullable(),
    applyMode: z.enum(ASSISTANT_SUGGESTION_APPLY_MODES),
  })
  .strict();

export const assistantDraftActionSchema = z
  .object({
    fieldKey: z.string().min(1).max(200),
    actionType: z.enum(ASSISTANT_DRAFT_ACTION_TYPES),
    proposedValue: z.union([z.string().min(1).max(500), z.boolean()]),
    label: z.string().min(1).max(160).optional(),
    currentValue: z.union([z.string().max(500), z.boolean()]).nullable().optional(),
    reason: z.string().min(1).max(500).nullable().optional(),
    status: z.enum(ASSISTANT_DRAFT_ACTION_STATUSES),
    message: z.string().min(1).max(500).nullable().optional(),
  })
  .strict();

export const assistantResponseSchema = z
  .object({
    answer: z.string().min(1).max(5000),
    visiblePageFacts: z.array(z.string().min(1).max(400)).max(8),
    toolFindings: z.array(z.string().min(1).max(400)).max(8).default([]),
    inferredLikelyIssues: z.array(z.string().min(1).max(400)).max(8),
    standardsReferenceNotes: z.array(z.string().min(1).max(400)).max(8),
    suggestedNextSteps: z.array(z.string().min(1).max(300)).max(8),
    suggestedFields: z.array(assistantSuggestedFieldSchema).max(160).default([]),
    draftActions: z.array(assistantDraftActionSchema).max(160).default([]),
    limitationNote: z.string().min(1).max(500).nullable(),
  })
  .strict();

export type AssistantSuggestedField = z.infer<typeof assistantSuggestedFieldSchema>;
export type AssistantDraftAction = z.infer<typeof assistantDraftActionSchema>;
export type AssistantResponse = z.infer<typeof assistantResponseSchema>;
