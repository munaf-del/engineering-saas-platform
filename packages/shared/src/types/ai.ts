export const AI_MODEL_OPTIONS = [
  'gpt-4.1-mini',
  'gpt-4.1',
  'gpt-5-mini',
  'gpt-5.2',
] as const;

export type AiModelId = (typeof AI_MODEL_OPTIONS)[number];
export const AI_ASSISTANT_PROVIDER_OPTIONS = [
  'openai',
  'anthropic',
  'gemini',
  'deepseek',
] as const;
export const ANTHROPIC_ASSISTANT_MODEL_OPTIONS = [
  'claude-sonnet-4-0',
  'claude-sonnet-4-6',
  'claude-3-7-sonnet-latest',
] as const;
export const GEMINI_ASSISTANT_MODEL_OPTIONS = [
  'gemini-2.0-flash',
  'gemini-2.0-pro',
] as const;
export const DEEPSEEK_ASSISTANT_MODEL_OPTIONS = [
  'deepseek-chat',
  'deepseek-reasoner',
] as const;
export const AI_ASSISTANT_MODEL_OPTIONS = [
  ...AI_MODEL_OPTIONS,
  ...ANTHROPIC_ASSISTANT_MODEL_OPTIONS,
  ...GEMINI_ASSISTANT_MODEL_OPTIONS,
  ...DEEPSEEK_ASSISTANT_MODEL_OPTIONS,
] as const;

export type AiAssistantProvider = (typeof AI_ASSISTANT_PROVIDER_OPTIONS)[number];
export type AiAssistantModelId = (typeof AI_ASSISTANT_MODEL_OPTIONS)[number];
export type AiRuntimeMode = 'assistant' | 'agent';
export const AI_ASSISTANT_PROVIDER_AVAILABILITY_SOURCES = [
  'organisation',
  'environment',
  'unavailable',
] as const;
export const AI_ASSISTANT_PROVIDER_STATUS_REASONS = [
  'organisation_credential',
  'environment_fallback',
  'credential_unusable',
  'not_configured',
] as const;
export const AI_ASSISTANT_PROVIDER_CREDENTIAL_ISSUE_REASONS = [
  'stored_credential_cannot_be_decrypted',
  'encryption_secret_unavailable',
] as const;
export const AI_ASSISTANT_CREDENTIAL_SOURCES = [
  'manual_api_key',
  'environment',
  'connected_account',
  'none',
] as const;
export const AI_ASSISTANT_CONNECTION_STATES = [
  'connected',
  'manual_key_configured',
  'env_fallback_active',
  'unavailable',
] as const;
export type AiAssistantProviderAvailabilitySource =
  (typeof AI_ASSISTANT_PROVIDER_AVAILABILITY_SOURCES)[number];
export type AiAssistantProviderStatusReason =
  (typeof AI_ASSISTANT_PROVIDER_STATUS_REASONS)[number];
export type AiAssistantProviderCredentialIssueReason =
  (typeof AI_ASSISTANT_PROVIDER_CREDENTIAL_ISSUE_REASONS)[number];
export type AssistantCredentialSource =
  (typeof AI_ASSISTANT_CREDENTIAL_SOURCES)[number];
export type AssistantConnectionState =
  (typeof AI_ASSISTANT_CONNECTION_STATES)[number];
export type AiAssistantRuntimeSettings = {
  assistantProvider: AiAssistantProvider;
  assistantModel: AiAssistantModelId;
};
export type AiAssistantProviderStatus = {
  configuredForOrganisation: boolean;
  available: boolean;
  availabilitySource: AiAssistantProviderAvailabilitySource;
  statusReason: AiAssistantProviderStatusReason;
  credentialIssueReason?: AiAssistantProviderCredentialIssueReason | null;
  credentialSource?: AssistantCredentialSource;
  connectionState?: AssistantConnectionState;
};
export type AiAssistantProviderStatusMap = Record<
  AiAssistantProvider,
  AiAssistantProviderStatus
>;
export type AiAssistantRuntimeSelection = {
  provider: AiAssistantProvider;
  model: AiAssistantModelId;
};
export type AiAgentRuntimeSelection = {
  provider: typeof AI_AGENT_PROVIDER;
  model: AiModelId;
};

export const DEFAULT_ASSISTANT_PROVIDER: AiAssistantProvider = 'openai';
export const DEFAULT_ASSISTANT_MODEL: AiAssistantModelId = 'gpt-4.1';
export const DEFAULT_ANTHROPIC_ASSISTANT_MODEL: AiAssistantModelId = 'claude-sonnet-4-0';
export const DEFAULT_GEMINI_ASSISTANT_MODEL: AiAssistantModelId = 'gemini-2.0-flash';
export const DEFAULT_DEEPSEEK_ASSISTANT_MODEL: AiAssistantModelId = 'deepseek-chat';
export const DEFAULT_AGENT_MODEL: AiModelId = 'gpt-4.1-mini';
export const AI_AGENT_PROVIDER: AiAssistantProvider = 'openai';

export const AI_ASSISTANT_PROVIDER_LABELS: Record<AiAssistantProvider, string> = {
  openai: 'OpenAI',
  anthropic: 'Claude (Anthropic)',
  gemini: 'Gemini',
  deepseek: 'DeepSeek',
};

export const AI_ASSISTANT_PROVIDER_CAPABILITIES = {
  openai: {
    label: AI_ASSISTANT_PROVIDER_LABELS.openai,
    models: AI_MODEL_OPTIONS,
    defaultModel: DEFAULT_ASSISTANT_MODEL,
  },
  anthropic: {
    label: AI_ASSISTANT_PROVIDER_LABELS.anthropic,
    models: ANTHROPIC_ASSISTANT_MODEL_OPTIONS,
    defaultModel: DEFAULT_ANTHROPIC_ASSISTANT_MODEL,
  },
  gemini: {
    label: AI_ASSISTANT_PROVIDER_LABELS.gemini,
    models: GEMINI_ASSISTANT_MODEL_OPTIONS,
    defaultModel: DEFAULT_GEMINI_ASSISTANT_MODEL,
  },
  deepseek: {
    label: AI_ASSISTANT_PROVIDER_LABELS.deepseek,
    models: DEEPSEEK_ASSISTANT_MODEL_OPTIONS,
    defaultModel: DEFAULT_DEEPSEEK_ASSISTANT_MODEL,
  },
} as const satisfies Record<
  AiAssistantProvider,
  {
    label: string;
    models: readonly AiAssistantModelId[];
    defaultModel: AiAssistantModelId;
  }
>;

export const AI_ASSISTANT_MODEL_OPTIONS_BY_PROVIDER: Record<
  AiAssistantProvider,
  readonly AiAssistantModelId[]
> = {
  openai: AI_ASSISTANT_PROVIDER_CAPABILITIES.openai.models,
  anthropic: AI_ASSISTANT_PROVIDER_CAPABILITIES.anthropic.models,
  gemini: AI_ASSISTANT_PROVIDER_CAPABILITIES.gemini.models,
  deepseek: AI_ASSISTANT_PROVIDER_CAPABILITIES.deepseek.models,
};

export interface OrganisationAiSettings {
  assistantProvider: AiAssistantProvider;
  assistantModel: AiAssistantModelId;
  agentModel: AiModelId;
}

export interface OrganisationAiSettingsResponse extends OrganisationAiSettings {
  availableAssistantProviders: AiAssistantProvider[];
  availableModels: AiAssistantModelId[];
  availableAgentModels: AiModelId[];
  assistantProviderStatus: AiAssistantProviderStatusMap;
  defaults: OrganisationAiSettings;
}

export function isAiModelId(value: unknown): value is AiModelId {
  return (
    typeof value === 'string' &&
    (AI_MODEL_OPTIONS as readonly string[]).includes(value)
  );
}

export function isAiAssistantProvider(value: unknown): value is AiAssistantProvider {
  return (
    typeof value === 'string' &&
    (AI_ASSISTANT_PROVIDER_OPTIONS as readonly string[]).includes(value)
  );
}

export function isAiAssistantModelId(value: unknown): value is AiAssistantModelId {
  return (
    typeof value === 'string' &&
    (AI_ASSISTANT_MODEL_OPTIONS as readonly string[]).includes(value)
  );
}

export function normalizeAiModelSelection(
  value: unknown,
  fallback: AiModelId,
): AiModelId {
  return isAiModelId(value) ? value : fallback;
}

export function normalizeAiAssistantProviderSelection(
  value: unknown,
  fallback: AiAssistantProvider = DEFAULT_ASSISTANT_PROVIDER,
): AiAssistantProvider {
  return isAiAssistantProvider(value) ? value : fallback;
}

export function getDefaultAssistantModelForProvider(
  provider: AiAssistantProvider,
): AiAssistantModelId {
  return AI_ASSISTANT_PROVIDER_CAPABILITIES[provider].defaultModel;
}

export function getAiAssistantModelsForProvider(
  provider: AiAssistantProvider,
): AiAssistantModelId[] {
  return [...AI_ASSISTANT_MODEL_OPTIONS_BY_PROVIDER[provider]];
}

export function getAiAssistantProviderCapability(
  provider: AiAssistantProvider,
) {
  return AI_ASSISTANT_PROVIDER_CAPABILITIES[provider];
}

export function buildAiAssistantProviderStatusMap(
  overrides?: Partial<Record<AiAssistantProvider, Partial<AiAssistantProviderStatus>>>,
): AiAssistantProviderStatusMap {
  return Object.fromEntries(
    AI_ASSISTANT_PROVIDER_OPTIONS.map((provider) => {
      const override = overrides?.[provider];
      const configuredForOrganisation = override?.configuredForOrganisation ?? false;
      const available = override?.available ?? true;
      const availabilitySource = normalizeAiAssistantProviderAvailabilitySource(
        override?.availabilitySource,
        available === false ? 'unavailable' : 'environment',
      );
      const statusReason = normalizeAiAssistantProviderStatusReason(
        override?.statusReason,
        resolveAiAssistantProviderStatusReason({
          configuredForOrganisation,
          available,
          availabilitySource,
        }),
      );
      const credentialSource = normalizeAiAssistantCredentialSource(
        override?.credentialSource,
        resolveAiAssistantCredentialSource({
          configuredForOrganisation,
          available,
          availabilitySource,
          statusReason,
        }),
      );

      return [
        provider,
        {
          configuredForOrganisation,
          available,
          availabilitySource,
          statusReason,
          credentialIssueReason: normalizeAiAssistantProviderCredentialIssueReason(
            override?.credentialIssueReason,
            null,
          ),
          credentialSource,
          connectionState: normalizeAiAssistantConnectionState(
            override?.connectionState,
            resolveAiAssistantConnectionState({
              configuredForOrganisation,
              available,
              availabilitySource,
              statusReason,
              credentialSource,
            }),
          ),
        } satisfies AiAssistantProviderStatus,
      ];
    }),
  ) as AiAssistantProviderStatusMap;
}

export function getAvailableAiAssistantProviders(
  providerStatus: AiAssistantProviderStatusMap,
): AiAssistantProvider[] {
  return AI_ASSISTANT_PROVIDER_OPTIONS.filter((provider) => providerStatus[provider].available);
}

export function isAiAssistantProviderAvailable(
  provider: AiAssistantProvider,
  providerStatus: AiAssistantProviderStatusMap,
) {
  return providerStatus[provider].available;
}

export function isAiAssistantModelSupportedByProvider(
  value: unknown,
  provider: AiAssistantProvider,
): value is AiAssistantModelId {
  return (
    typeof value === 'string' &&
    (AI_ASSISTANT_MODEL_OPTIONS_BY_PROVIDER[provider] as readonly string[]).includes(value)
  );
}

export function normalizeAiAssistantModelSelection(
  value: unknown,
  provider: AiAssistantProvider,
  fallback: AiAssistantModelId = getDefaultAssistantModelForProvider(provider),
): AiAssistantModelId {
  return isAiAssistantModelSupportedByProvider(value, provider) ? value : fallback;
}

export function normalizeOrganisationAiSettings(
  value: unknown,
  fallback?: Partial<OrganisationAiSettings>,
): OrganisationAiSettings {
  const record = objectValue(value);
  const defaults = buildDefaultOrganisationAiSettings(fallback);
  const assistantRuntime = normalizeAiAssistantRuntimeSelection(record, defaults);

  return {
    ...assistantRuntime,
    agentModel: normalizeAiModelSelection(record.agentModel, defaults.agentModel),
  };
}

export function buildOrganisationAiSettingsResponse(
  value: unknown,
  fallback?: Partial<OrganisationAiSettings>,
  providerStatus?: Partial<Record<AiAssistantProvider, Partial<AiAssistantProviderStatus>>>,
): OrganisationAiSettingsResponse {
  const settings = normalizeOrganisationAiSettings(value, fallback);
  const defaults = buildDefaultOrganisationAiSettings(fallback);
  const assistantProviderStatus = buildAiAssistantProviderStatusMap(providerStatus);

  return {
    ...settings,
    availableAssistantProviders: getAvailableAiAssistantProviders(assistantProviderStatus),
    availableModels: getAiAssistantModelsForProvider(settings.assistantProvider),
    availableAgentModels: [...AI_MODEL_OPTIONS],
    assistantProviderStatus,
    defaults,
  };
}

export function buildDefaultOrganisationAiSettings(
  fallback?: Partial<OrganisationAiSettings>,
): OrganisationAiSettings {
  const assistantProvider = normalizeAiAssistantProviderSelection(
    fallback?.assistantProvider,
    DEFAULT_ASSISTANT_PROVIDER,
  );

  return {
    assistantProvider,
    assistantModel: normalizeAiAssistantModelSelection(
      fallback?.assistantModel,
      assistantProvider,
      getDefaultAssistantModelForProvider(assistantProvider),
    ),
    agentModel: normalizeAiModelSelection(fallback?.agentModel, DEFAULT_AGENT_MODEL),
  };
}

export function normalizeAiAssistantRuntimeSelection(
  value: unknown,
  fallback?: Partial<AiAssistantRuntimeSettings>,
): AiAssistantRuntimeSettings {
  const record = objectValue(value);
  const fallbackProvider = normalizeAiAssistantProviderSelection(
    fallback?.assistantProvider,
    DEFAULT_ASSISTANT_PROVIDER,
  );
  const fallbackModel = normalizeAiAssistantModelSelection(
    fallback?.assistantModel,
    fallbackProvider,
    getDefaultAssistantModelForProvider(fallbackProvider),
  );
  const assistantProvider = normalizeAiAssistantProviderSelection(
    record.assistantProvider,
    fallbackProvider,
  );

  return {
    assistantProvider,
    assistantModel: normalizeAiAssistantModelSelection(
      record.assistantModel,
      assistantProvider,
      assistantProvider === fallbackProvider
        ? fallbackModel
        : getDefaultAssistantModelForProvider(assistantProvider),
    ),
  };
}

export function resolveAiAssistantRuntimeSelection(
  settings: OrganisationAiSettings,
  providerStatus?: AiAssistantProviderStatusMap,
): AiAssistantRuntimeSelection {
  const normalizedSettings = normalizeOrganisationAiSettings(settings);
  const assistantProviderStatus = providerStatus ?? buildAiAssistantProviderStatusMap();
  if (isAiAssistantProviderAvailable(normalizedSettings.assistantProvider, assistantProviderStatus)) {
    return {
      provider: normalizedSettings.assistantProvider,
      model: normalizedSettings.assistantModel,
    };
  }

  const fallbackProvider = getAvailableAiAssistantProviders(assistantProviderStatus).find(
    (provider) => provider !== normalizedSettings.assistantProvider,
  );

  if (fallbackProvider) {
    return {
      provider: fallbackProvider,
      model: getDefaultAssistantModelForProvider(fallbackProvider),
    };
  }

  return {
    provider: normalizedSettings.assistantProvider,
    model: normalizedSettings.assistantModel,
  };
}

export function resolveAiAgentRuntimeSelection(
  settings: OrganisationAiSettings,
): AiAgentRuntimeSelection {
  const normalizedSettings = normalizeOrganisationAiSettings(settings);

  return {
    provider: AI_AGENT_PROVIDER,
    model: normalizedSettings.agentModel,
  };
}

export function resolveAiRuntimeSelectionForMode(
  mode: AiRuntimeMode,
  settings: OrganisationAiSettings,
  providerStatus?: AiAssistantProviderStatusMap,
) {
  if (mode === 'agent') {
    return resolveAiAgentRuntimeSelection(settings);
  }

  return resolveAiAssistantRuntimeSelection(settings, providerStatus);
}

function objectValue(raw: unknown) {
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
}

function normalizeAiAssistantProviderAvailabilitySource(
  value: unknown,
  fallback: AiAssistantProviderAvailabilitySource,
): AiAssistantProviderAvailabilitySource {
  return typeof value === 'string' &&
    (AI_ASSISTANT_PROVIDER_AVAILABILITY_SOURCES as readonly string[]).includes(value)
    ? (value as AiAssistantProviderAvailabilitySource)
    : fallback;
}

function normalizeAiAssistantProviderStatusReason(
  value: unknown,
  fallback: AiAssistantProviderStatusReason,
): AiAssistantProviderStatusReason {
  return typeof value === 'string' &&
    (AI_ASSISTANT_PROVIDER_STATUS_REASONS as readonly string[]).includes(value)
    ? (value as AiAssistantProviderStatusReason)
    : fallback;
}

function normalizeAiAssistantProviderCredentialIssueReason(
  value: unknown,
  fallback: AiAssistantProviderCredentialIssueReason | null,
): AiAssistantProviderCredentialIssueReason | null {
  return typeof value === 'string' &&
    (AI_ASSISTANT_PROVIDER_CREDENTIAL_ISSUE_REASONS as readonly string[]).includes(value)
    ? (value as AiAssistantProviderCredentialIssueReason)
    : fallback;
}

function normalizeAiAssistantCredentialSource(
  value: unknown,
  fallback: AssistantCredentialSource,
): AssistantCredentialSource {
  return typeof value === 'string' &&
    (AI_ASSISTANT_CREDENTIAL_SOURCES as readonly string[]).includes(value)
    ? (value as AssistantCredentialSource)
    : fallback;
}

function normalizeAiAssistantConnectionState(
  value: unknown,
  fallback: AssistantConnectionState,
): AssistantConnectionState {
  return typeof value === 'string' &&
    (AI_ASSISTANT_CONNECTION_STATES as readonly string[]).includes(value)
    ? (value as AssistantConnectionState)
    : fallback;
}

function resolveAiAssistantProviderStatusReason({
  configuredForOrganisation,
  available,
  availabilitySource,
}: {
  configuredForOrganisation: boolean;
  available: boolean;
  availabilitySource: AiAssistantProviderAvailabilitySource;
}): AiAssistantProviderStatusReason {
  if (configuredForOrganisation && availabilitySource === 'organisation' && available) {
    return 'organisation_credential';
  }

  if (configuredForOrganisation && availabilitySource !== 'organisation') {
    return 'credential_unusable';
  }

  if (available && availabilitySource === 'environment') {
    return 'environment_fallback';
  }

  return 'not_configured';
}

export function resolveAiAssistantCredentialSource({
  configuredForOrganisation,
  available,
  availabilitySource,
  statusReason,
}: {
  configuredForOrganisation: boolean;
  available: boolean;
  availabilitySource: AiAssistantProviderAvailabilitySource;
  statusReason: AiAssistantProviderStatusReason;
}): AssistantCredentialSource {
  if (availabilitySource === 'environment' && available) {
    return 'environment';
  }

  if (
    availabilitySource === 'organisation' &&
    available &&
    statusReason === 'organisation_credential'
  ) {
    return 'manual_api_key';
  }

  if (configuredForOrganisation) {
    return 'manual_api_key';
  }

  return 'none';
}

export function resolveAiAssistantConnectionState({
  configuredForOrganisation,
  available,
  availabilitySource,
  statusReason,
  credentialSource,
}: {
  configuredForOrganisation: boolean;
  available: boolean;
  availabilitySource: AiAssistantProviderAvailabilitySource;
  statusReason: AiAssistantProviderStatusReason;
  credentialSource: AssistantCredentialSource;
}): AssistantConnectionState {
  if (credentialSource === 'connected_account') {
    return 'connected';
  }

  if (
    credentialSource === 'manual_api_key' &&
    configuredForOrganisation &&
    available &&
    availabilitySource === 'organisation' &&
    statusReason === 'organisation_credential'
  ) {
    return 'manual_key_configured';
  }

  if (availabilitySource === 'environment' && available) {
    return 'env_fallback_active';
  }

  return 'unavailable';
}
