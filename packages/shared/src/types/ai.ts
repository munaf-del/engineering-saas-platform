export const AI_MODEL_OPTIONS = [
  'gpt-4.1-mini',
  'gpt-4.1',
  'gpt-5-mini',
  'gpt-5.2',
] as const;

export type AiModelId = (typeof AI_MODEL_OPTIONS)[number];

export const DEFAULT_ASSISTANT_MODEL: AiModelId = 'gpt-4.1';
export const DEFAULT_AGENT_MODEL: AiModelId = 'gpt-4.1-mini';

export interface OrganisationAiSettings {
  assistantModel: AiModelId;
  agentModel: AiModelId;
}

export interface OrganisationAiSettingsResponse extends OrganisationAiSettings {
  availableModels: AiModelId[];
  defaults: OrganisationAiSettings;
}

export function isAiModelId(value: unknown): value is AiModelId {
  return (
    typeof value === 'string' &&
    (AI_MODEL_OPTIONS as readonly string[]).includes(value)
  );
}

export function normalizeAiModelSelection(
  value: unknown,
  fallback: AiModelId,
): AiModelId {
  return isAiModelId(value) ? value : fallback;
}

export function normalizeOrganisationAiSettings(
  value: unknown,
): OrganisationAiSettings {
  const record =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  return {
    assistantModel: normalizeAiModelSelection(
      record.assistantModel,
      DEFAULT_ASSISTANT_MODEL,
    ),
    agentModel: normalizeAiModelSelection(record.agentModel, DEFAULT_AGENT_MODEL),
  };
}

export function buildOrganisationAiSettingsResponse(
  value: unknown,
): OrganisationAiSettingsResponse {
  const settings = normalizeOrganisationAiSettings(value);

  return {
    ...settings,
    availableModels: [...AI_MODEL_OPTIONS],
    defaults: {
      assistantModel: DEFAULT_ASSISTANT_MODEL,
      agentModel: DEFAULT_AGENT_MODEL,
    },
  };
}
