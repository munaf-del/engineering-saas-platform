import type { AiAssistantDraftAction } from '@eng/shared';
import type { AiAssistantPageContext, AiAssistantSuggestedField } from './assistant-page-context';

export const AI_ASSISTANT_MODES = ['assistant', 'agent'] as const;
export const AI_ASSISTANT_QUICK_ACTIONS = [
  'review_page',
  'explain_page',
  'find_missing_inputs',
  'suggest_next_steps',
  'suggest_fields',
] as const;

export type AiAssistantMode = (typeof AI_ASSISTANT_MODES)[number];
export type AiAssistantQuickAction = (typeof AI_ASSISTANT_QUICK_ACTIONS)[number];

export type AiAssistantStructuredResponse = {
  answer: string;
  visiblePageFacts: string[];
  toolFindings: string[];
  inferredLikelyIssues: string[];
  standardsReferenceNotes: string[];
  suggestedNextSteps: string[];
  suggestedFields: AiAssistantSuggestedField[];
  draftActions: AiAssistantDraftAction[];
  limitationNote: string | null;
};

export type AiAssistantApiMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type AiAssistantConversationMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  mode?: AiAssistantMode;
  quickAction?: AiAssistantQuickAction;
  structured?: AiAssistantStructuredResponse;
};

export type AiAssistantRespondRequest = {
  mode?: AiAssistantMode;
  messages: AiAssistantApiMessage[];
  pageContext: AiAssistantPageContext;
  projectId?: string;
  pileGroupId?: string;
  quickAction?: AiAssistantQuickAction;
};

export const AI_ASSISTANT_QUICK_ACTION_LABELS: Record<AiAssistantQuickAction, string> = {
  review_page: 'Review this page',
  explain_page: 'Explain this page',
  find_missing_inputs: 'What is missing?',
  suggest_next_steps: 'What should I do next?',
  suggest_fields: 'Suggest values for this page',
};
