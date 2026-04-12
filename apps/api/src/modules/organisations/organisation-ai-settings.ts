import { Prisma } from '@prisma/client';
import {
  normalizeAiModelSelection,
  AI_MODEL_OPTIONS,
  DEFAULT_ASSISTANT_MODEL,
  DEFAULT_AGENT_MODEL,
  type OrganisationAiSettings,
  type OrganisationAiSettingsResponse,
} from '@eng/shared';

export function getOrganisationAiSettingsFromMetadata(
  metadata: unknown,
  fallback?: Partial<OrganisationAiSettings>,
): OrganisationAiSettings {
  const base = objectValue(metadata);
  const rawAiSettings = objectValue(base.aiSettings);

  return {
    assistantModel: normalizeAiModelSelection(
      rawAiSettings.assistantModel,
      fallback?.assistantModel ?? DEFAULT_ASSISTANT_MODEL,
    ),
    agentModel: normalizeAiModelSelection(
      rawAiSettings.agentModel,
      fallback?.agentModel ?? DEFAULT_AGENT_MODEL,
    ),
  };
}

export function buildOrganisationAiSettingsPayload(
  metadata: unknown,
  fallback?: Partial<OrganisationAiSettings>,
): OrganisationAiSettingsResponse {
  const settings = getOrganisationAiSettingsFromMetadata(metadata, fallback);

  return {
    ...settings,
    availableModels: [...AI_MODEL_OPTIONS],
    defaults: {
      assistantModel: fallback?.assistantModel ?? DEFAULT_ASSISTANT_MODEL,
      agentModel: fallback?.agentModel ?? DEFAULT_AGENT_MODEL,
    },
  };
}

export function mergeOrganisationMetadataWithAiSettings(
  metadata: unknown,
  aiSettings: OrganisationAiSettings,
): Record<string, unknown> {
  const base = objectValue(metadata);
  return {
    ...base,
    aiSettings,
  };
}

export function isMissingOrganisationMetadataColumnError(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }

  if (error.code !== 'P2022') {
    return false;
  }

  const column =
    error.meta && typeof error.meta === 'object' && typeof error.meta['column'] === 'string'
      ? error.meta['column']
      : '';

  return column.includes('metadata') || error.message.toLowerCase().includes('metadata');
}

function objectValue(raw: unknown) {
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
}
