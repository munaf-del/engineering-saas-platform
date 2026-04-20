import { Prisma } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

jest.mock('@eng/shared', () => {
  const AI_MODEL_OPTIONS = ['gpt-4.1-mini', 'gpt-4.1', 'gpt-5-mini', 'gpt-5.2'] as const;
  const AI_ASSISTANT_PROVIDER_OPTIONS = ['openai', 'anthropic', 'gemini', 'deepseek'] as const;

  function isAiModelId(value: unknown): value is (typeof AI_MODEL_OPTIONS)[number] {
    return typeof value === 'string' && (AI_MODEL_OPTIONS as readonly string[]).includes(value);
  }

  function normalizeAiModelSelection(value: unknown, fallback: (typeof AI_MODEL_OPTIONS)[number]) {
    return isAiModelId(value) ? value : fallback;
  }

  function getDefaultAssistantModelForProvider(
    provider: 'openai' | 'anthropic' | 'gemini' | 'deepseek',
  ) {
    return provider === 'anthropic'
      ? 'claude-sonnet-4-0'
      : provider === 'gemini'
        ? 'gemini-2.0-flash'
        : provider === 'deepseek'
          ? 'deepseek-chat'
          : 'gpt-4.1';
  }

  function isAiAssistantModelSupportedByProvider(
    value: unknown,
    provider: 'openai' | 'anthropic' | 'gemini' | 'deepseek',
  ): value is string {
    return (
      typeof value === 'string' &&
      (provider === 'openai'
        ? ['gpt-4.1-mini', 'gpt-4.1', 'gpt-5-mini', 'gpt-5.2']
        : provider === 'anthropic'
          ? ['claude-sonnet-4-0', 'claude-3-7-sonnet-latest']
          : provider === 'gemini'
            ? ['gemini-2.0-flash', 'gemini-2.0-pro']
            : ['deepseek-chat', 'deepseek-reasoner']
      ).includes(value)
    );
  }

  function normalizeOrganisationAiSettings(value: unknown, fallback?: Record<string, unknown>) {
    const record =
      value && typeof value === 'object' && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {};
    const assistantProvider: 'openai' | 'anthropic' | 'gemini' | 'deepseek' =
      record.assistantProvider === 'anthropic' ||
      record.assistantProvider === 'openai' ||
      record.assistantProvider === 'gemini' ||
      record.assistantProvider === 'deepseek'
        ? record.assistantProvider
        : ((fallback?.assistantProvider as
            | 'openai'
            | 'anthropic'
            | 'gemini'
            | 'deepseek'
            | undefined) ?? 'openai');

    return {
      assistantProvider,
      assistantModel: isAiAssistantModelSupportedByProvider(
        record.assistantModel,
        assistantProvider,
      )
        ? record.assistantModel
        : getDefaultAssistantModelForProvider(assistantProvider),
      agentModel: normalizeAiModelSelection(
        record.agentModel,
        ((fallback?.agentModel as string | undefined) ??
          'gpt-4.1-mini') as (typeof AI_MODEL_OPTIONS)[number],
      ),
    };
  }

  function buildDefaultOrganisationAiSettings(fallback?: Record<string, unknown>) {
    return normalizeOrganisationAiSettings(fallback ?? {}, {
      assistantProvider: (fallback?.assistantProvider as string | undefined) ?? 'openai',
      assistantModel: (fallback?.assistantModel as string | undefined) ?? 'gpt-4.1',
      agentModel: (fallback?.agentModel as string | undefined) ?? 'gpt-4.1-mini',
    });
  }

  function buildOrganisationAiSettingsResponse(
    value: unknown,
    fallback?: Record<string, unknown>,
    providerStatus?: Record<string, Record<string, unknown>>,
  ) {
    function deriveCredentialSource(status: {
      configuredForOrganisation: boolean;
      available: boolean;
      availabilitySource: 'organisation' | 'environment' | 'unavailable';
      statusReason: string;
    }) {
      if (status.availabilitySource === 'environment' && status.available) {
        return 'environment';
      }

      if (
        status.availabilitySource === 'organisation' &&
        status.available &&
        status.statusReason === 'organisation_credential'
      ) {
        return 'manual_api_key';
      }

      if (status.configuredForOrganisation) {
        return 'manual_api_key';
      }

      return 'none';
    }

    function deriveConnectionState(status: {
      configuredForOrganisation: boolean;
      available: boolean;
      availabilitySource: 'organisation' | 'environment' | 'unavailable';
      statusReason: string;
      credentialSource?: string;
    }) {
      const credentialSource = status.credentialSource ?? deriveCredentialSource(status);

      if (credentialSource === 'connected_account') {
        return 'connected';
      }

      if (
        credentialSource === 'manual_api_key' &&
        status.configuredForOrganisation &&
        status.available &&
        status.availabilitySource === 'organisation' &&
        status.statusReason === 'organisation_credential'
      ) {
        return 'manual_key_configured';
      }

      if (status.availabilitySource === 'environment' && status.available) {
        return 'env_fallback_active';
      }

      return 'unavailable';
    }

    function decorateStatus(status: Record<string, unknown>) {
      const typedStatus = status as {
        configuredForOrganisation: boolean;
        available: boolean;
        availabilitySource: 'organisation' | 'environment' | 'unavailable';
        statusReason: string;
        credentialIssueReason?: string | null;
        credentialSource?: string;
        connectionState?: string;
      };

      return {
        ...typedStatus,
        credentialIssueReason: typedStatus.credentialIssueReason ?? null,
        credentialSource: typedStatus.credentialSource ?? deriveCredentialSource(typedStatus),
        connectionState: typedStatus.connectionState ?? deriveConnectionState(typedStatus),
      };
    }

    const settings = normalizeOrganisationAiSettings(value, fallback);
    return {
      ...settings,
      availableAssistantProviders: Object.entries(providerStatus ?? {})
        .filter(([, status]) => status.available)
        .map(([provider]) => provider),
      availableModels:
        settings.assistantProvider === 'anthropic'
          ? ['claude-sonnet-4-0', 'claude-3-7-sonnet-latest']
          : settings.assistantProvider === 'gemini'
            ? ['gemini-2.0-flash', 'gemini-2.0-pro']
            : settings.assistantProvider === 'deepseek'
              ? ['deepseek-chat', 'deepseek-reasoner']
              : [...AI_MODEL_OPTIONS],
      availableAgentModels: [...AI_MODEL_OPTIONS],
      assistantProviderStatus: Object.fromEntries(
        Object.entries(
          providerStatus ?? {
            openai: {
              configuredForOrganisation: false,
              available: true,
              availabilitySource: 'environment',
              statusReason: 'environment_fallback',
            },
            anthropic: {
              configuredForOrganisation: false,
              available: false,
              availabilitySource: 'unavailable',
              statusReason: 'not_configured',
            },
            gemini: {
              configuredForOrganisation: false,
              available: false,
              availabilitySource: 'unavailable',
              statusReason: 'not_configured',
            },
            deepseek: {
              configuredForOrganisation: false,
              available: false,
              availabilitySource: 'unavailable',
              statusReason: 'not_configured',
            },
          },
        ).map(([provider, status]) => [provider, decorateStatus(status)]),
      ),
      defaults: buildDefaultOrganisationAiSettings(fallback),
    };
  }

  function resolveAiAssistantCredentialSource(status: {
    configuredForOrganisation: boolean;
    available: boolean;
    availabilitySource: 'organisation' | 'environment' | 'unavailable';
    statusReason: string;
  }) {
    if (status.availabilitySource === 'environment' && status.available) {
      return 'environment';
    }

    if (
      status.availabilitySource === 'organisation' &&
      status.available &&
      status.statusReason === 'organisation_credential'
    ) {
      return 'manual_api_key';
    }

    if (status.configuredForOrganisation) {
      return 'manual_api_key';
    }

    return 'none';
  }

  function resolveAiAssistantConnectionState(status: {
    configuredForOrganisation: boolean;
    available: boolean;
    availabilitySource: 'organisation' | 'environment' | 'unavailable';
    statusReason: string;
    credentialSource: string;
  }) {
    if (status.credentialSource === 'connected_account') {
      return 'connected';
    }

    if (
      status.credentialSource === 'manual_api_key' &&
      status.configuredForOrganisation &&
      status.available &&
      status.availabilitySource === 'organisation' &&
      status.statusReason === 'organisation_credential'
    ) {
      return 'manual_key_configured';
    }

    if (status.availabilitySource === 'environment' && status.available) {
      return 'env_fallback_active';
    }

    return 'unavailable';
  }

  return {
    AI_ASSISTANT_PROVIDER_LABELS: {
      openai: 'OpenAI',
      anthropic: 'Claude (Anthropic)',
      gemini: 'Gemini',
      deepseek: 'DeepSeek',
    },
    AI_AGENT_PROVIDER: 'openai',
    buildDefaultOrganisationAiSettings,
    buildOrganisationAiSettingsResponse,
    getDefaultAssistantModelForProvider,
    isAiAssistantProvider: (value: unknown) =>
      value === 'openai' || value === 'anthropic' || value === 'gemini' || value === 'deepseek',
    isAiAssistantModelSupportedByProvider,
    normalizeAiModelSelection,
    normalizeOrganisationAiSettings,
    resolveAiAssistantConnectionState,
    resolveAiAssistantCredentialSource,
    AI_ASSISTANT_PROVIDER_OPTIONS,
  };
});

import type { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../../common/prisma/prisma.service';
import {
  mergeOrganisationMetadataWithAiSettings,
  setOrganisationAiProviderApiKey,
} from './organisation-ai-settings';
import { OrganisationAiAssistantCredentialStoreService } from './organisation-ai-assistant-credential-store.service';
import { OrganisationsService } from './organisations.service';

function createConfigService(overrides: Record<string, string | undefined> = {}): ConfigService {
  return {
    get: jest.fn((key: string) => overrides[key]),
  } as unknown as ConfigService;
}

function createAssistantProviderRegistry(options?: {
  openaiEnvironmentAvailable?: boolean;
  anthropicEnvironmentAvailable?: boolean;
  geminiEnvironmentAvailable?: boolean;
  deepseekEnvironmentAvailable?: boolean;
}) {
  const geminiVerifyCredential = jest.fn().mockResolvedValue(undefined);
  const deepseekVerifyCredential = jest.fn().mockResolvedValue(undefined);
  const openaiEnvironmentAvailable = options?.openaiEnvironmentAvailable ?? true;
  const anthropicEnvironmentAvailable = options?.anthropicEnvironmentAvailable ?? false;
  const geminiEnvironmentAvailable = options?.geminiEnvironmentAvailable ?? false;
  const deepseekEnvironmentAvailable = options?.deepseekEnvironmentAvailable ?? false;

  return {
    getProviderStatusMap: jest.fn(
      (
        credentials?: Record<
          string,
          {
            apiKey?: string | null;
            hasStoredCredential?: boolean;
            credentialIssue?: string | null;
          }
        >,
      ) => ({
        openai: credentials?.openai?.apiKey
          ? {
              configuredForOrganisation: true,
              available: true,
              availabilitySource: 'organisation',
              statusReason: 'organisation_credential',
              credentialIssueReason: null,
            }
          : {
              configuredForOrganisation: credentials?.openai?.hasStoredCredential ?? false,
              available: openaiEnvironmentAvailable,
              availabilitySource: openaiEnvironmentAvailable ? 'environment' : 'unavailable',
              statusReason:
                credentials?.openai?.hasStoredCredential && !credentials?.openai?.apiKey
                  ? 'credential_unusable'
                  : openaiEnvironmentAvailable
                    ? 'environment_fallback'
                    : 'not_configured',
              credentialIssueReason: null,
            },
        anthropic: credentials?.anthropic?.apiKey
          ? {
              configuredForOrganisation: true,
              available: true,
              availabilitySource: 'organisation',
              statusReason: 'organisation_credential',
              credentialIssueReason: null,
            }
          : {
              configuredForOrganisation: credentials?.anthropic?.hasStoredCredential ?? false,
              available: anthropicEnvironmentAvailable,
              availabilitySource: anthropicEnvironmentAvailable ? 'environment' : 'unavailable',
              statusReason:
                credentials?.anthropic?.hasStoredCredential && !credentials?.anthropic?.apiKey
                  ? 'credential_unusable'
                  : anthropicEnvironmentAvailable
                    ? 'environment_fallback'
                    : 'not_configured',
              credentialIssueReason: null,
            },
        gemini: credentials?.gemini?.apiKey
          ? {
              configuredForOrganisation: true,
              available: true,
              availabilitySource: 'organisation',
              statusReason: 'organisation_credential',
              credentialIssueReason: null,
            }
          : {
              configuredForOrganisation: credentials?.gemini?.hasStoredCredential ?? false,
              available: geminiEnvironmentAvailable,
              availabilitySource: geminiEnvironmentAvailable ? 'environment' : 'unavailable',
              statusReason:
                credentials?.gemini?.hasStoredCredential && !credentials?.gemini?.apiKey
                  ? 'credential_unusable'
                  : geminiEnvironmentAvailable
                    ? 'environment_fallback'
                    : 'not_configured',
              credentialIssueReason: null,
            },
        deepseek: credentials?.deepseek?.apiKey
          ? {
              configuredForOrganisation: true,
              available: true,
              availabilitySource: 'organisation',
              statusReason: 'organisation_credential',
              credentialIssueReason: null,
            }
          : {
              configuredForOrganisation: credentials?.deepseek?.hasStoredCredential ?? false,
              available: deepseekEnvironmentAvailable,
              availabilitySource: deepseekEnvironmentAvailable ? 'environment' : 'unavailable',
              statusReason:
                credentials?.deepseek?.hasStoredCredential && !credentials?.deepseek?.apiKey
                  ? 'credential_unusable'
                  : deepseekEnvironmentAvailable
                    ? 'environment_fallback'
                    : 'not_configured',
              credentialIssueReason: null,
            },
      }),
    ),
    getProvider: jest.fn((provider: string) => ({
      provider,
      verifyCredential:
        provider === 'gemini'
          ? geminiVerifyCredential
          : provider === 'deepseek'
            ? deepseekVerifyCredential
            : undefined,
    })),
    geminiVerifyCredential,
    deepseekVerifyCredential,
  };
}

function createService(
  prisma: PrismaService,
  configOverrides: Record<string, string | undefined>,
  registry = createAssistantProviderRegistry(),
) {
  const configService = createConfigService(configOverrides);
  return new OrganisationsService(
    prisma,
    configService,
    registry as never,
    new OrganisationAiAssistantCredentialStoreService(prisma, configService),
  );
}

function buildExpectedProviderStatus({
  configuredForOrganisation,
  available,
  availabilitySource,
  statusReason,
  credentialIssueReason = null,
}: {
  configuredForOrganisation: boolean;
  available: boolean;
  availabilitySource: 'organisation' | 'environment' | 'unavailable';
  statusReason:
    | 'organisation_credential'
    | 'environment_fallback'
    | 'credential_unusable'
    | 'not_configured';
  credentialIssueReason?: string | null;
}) {
  const credentialSource =
    availabilitySource === 'environment' && available
      ? 'environment'
      : configuredForOrganisation
        ? 'manual_api_key'
        : 'none';

  const connectionState =
    credentialSource === 'manual_api_key' &&
    configuredForOrganisation &&
    available &&
    availabilitySource === 'organisation' &&
    statusReason === 'organisation_credential'
      ? 'manual_key_configured'
      : availabilitySource === 'environment' && available
        ? 'env_fallback_active'
        : 'unavailable';

  return {
    configuredForOrganisation,
    available,
    availabilitySource,
    statusReason,
    credentialIssueReason,
    credentialSource,
    connectionState,
  };
}

function createMissingCredentialStoreTableError() {
  return Object.assign(Object.create(Prisma.PrismaClientKnownRequestError.prototype), {
    code: 'P2021',
    clientVersion: 'test',
    meta: {
      table: 'public.organisation_ai_assistant_provider_credentials',
    },
    message:
      'The table `public.organisation_ai_assistant_provider_credentials` does not exist in the current database.',
  }) as Prisma.PrismaClientKnownRequestError;
}

describe('OrganisationsService AI settings', () => {
  let service: OrganisationsService;
  let assistantProviderRegistry: ReturnType<typeof createAssistantProviderRegistry>;
  let organisationMetadata: Record<string, unknown> | null;
  let storedCredentialRows: Array<{
    organisationId: string;
    provider: string;
    encryptedSecret: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
  }>;
  let prisma: {
    organisationMember: { findUnique: jest.Mock };
    organisation: { findUnique: jest.Mock; update: jest.Mock };
    organisationAiAssistantProviderCredential: {
      findMany: jest.Mock;
      upsert: jest.Mock;
      deleteMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    organisationMetadata = null;
    storedCredentialRows = [];

    prisma = {
      organisationMember: {
        findUnique: jest.fn().mockResolvedValue({
          organisationId: 'org-1',
          userId: 'user-1',
          role: 'owner',
        }),
      },
      organisation: {
        findUnique: jest.fn().mockImplementation(({ select }) => {
          if (select?.metadata) {
            return Promise.resolve({
              id: 'org-1',
              metadata: organisationMetadata,
            });
          }

          return Promise.resolve({ id: 'org-1' });
        }),
        update: jest.fn().mockImplementation(({ data }) => {
          organisationMetadata = data.metadata as Record<string, unknown>;
          return Promise.resolve({ metadata: organisationMetadata });
        }),
      },
      organisationAiAssistantProviderCredential: {
        findMany: jest
          .fn()
          .mockImplementation(({ where }) =>
            Promise.resolve(
              storedCredentialRows
                .filter((row) => row.organisationId === where.organisationId)
                .map((row) => ({ ...row })),
            ),
          ),
        upsert: jest.fn().mockImplementation(({ where, create, update }) => {
          const key = where.organisationId_provider as {
            organisationId: string;
            provider: string;
          };
          const existingIndex = storedCredentialRows.findIndex(
            (row) => row.organisationId === key.organisationId && row.provider === key.provider,
          );
          const now = new Date('2026-04-13T00:00:00.000Z');

          if (existingIndex >= 0) {
            const existingRow = storedCredentialRows[existingIndex];
            storedCredentialRows[existingIndex] = {
              organisationId: existingRow!.organisationId,
              provider: existingRow!.provider,
              encryptedSecret: update.encryptedSecret as Record<string, unknown>,
              createdAt: existingRow!.createdAt,
              updatedAt: now,
            };

            return Promise.resolve({ ...storedCredentialRows[existingIndex] });
          }

          const nextRow = {
            organisationId: create.organisationId,
            provider: create.provider,
            encryptedSecret: create.encryptedSecret as Record<string, unknown>,
            createdAt: now,
            updatedAt: now,
          };
          storedCredentialRows.push(nextRow);
          return Promise.resolve({ ...nextRow });
        }),
        deleteMany: jest.fn().mockImplementation(({ where }) => {
          const beforeCount = storedCredentialRows.length;
          storedCredentialRows = storedCredentialRows.filter(
            (row) =>
              !(row.organisationId === where.organisationId && row.provider === where.provider),
          );

          return Promise.resolve({
            count: beforeCount - storedCredentialRows.length,
          });
        }),
      },
      $transaction: jest.fn().mockImplementation((callback) => callback(prisma)),
    };

    const configService = createConfigService({
      AI_OPENAI_MODEL: 'gpt-4.1',
      AI_OPENAI_AGENT_MODEL: 'gpt-4.1-mini',
      OPENAI_API_KEY: 'env-openai-key-1234567890',
      JWT_SECRET: 'test-jwt-secret',
    });
    assistantProviderRegistry = createAssistantProviderRegistry();
    service = new OrganisationsService(
      prisma as unknown as PrismaService,
      configService,
      assistantProviderRegistry as never,
      new OrganisationAiAssistantCredentialStoreService(
        prisma as unknown as PrismaService,
        configService,
      ),
    );
  });

  it('saves, updates, and removes organisation-scoped provider credentials without leaking secrets', async () => {
    const firstSave = await service.updateAiSettings('org-1', 'user-1', {
      openaiApiKey: 'org-openai-key-12345678901234567890',
    });

    expect(firstSave.assistantProviderStatus.openai).toEqual(
      buildExpectedProviderStatus({
        configuredForOrganisation: true,
        available: true,
        availabilitySource: 'organisation',
        statusReason: 'organisation_credential',
      }),
    );
    expect(JSON.stringify(firstSave)).not.toContain('org-openai-key-12345678901234567890');
    expect(JSON.stringify(organisationMetadata)).not.toContain('providerCredentials');
    expect(storedCredentialRows).toHaveLength(1);
    expect(JSON.stringify(storedCredentialRows)).not.toContain(
      'org-openai-key-12345678901234567890',
    );

    const secondSave = await service.updateAiSettings('org-1', 'user-1', {
      openaiApiKey: 'org-openai-key-09876543210987654321',
    });

    expect(secondSave.assistantProviderStatus.openai).toEqual(
      buildExpectedProviderStatus({
        configuredForOrganisation: true,
        available: true,
        availabilitySource: 'organisation',
        statusReason: 'organisation_credential',
      }),
    );
    expect(JSON.stringify(secondSave)).not.toContain('org-openai-key-09876543210987654321');
    expect(storedCredentialRows).toHaveLength(1);
    expect(JSON.stringify(storedCredentialRows)).not.toContain(
      'org-openai-key-09876543210987654321',
    );

    const removed = await service.updateAiSettings('org-1', 'user-1', {
      removeOpenaiApiKey: true,
    });

    expect(removed.assistantProviderStatus.openai).toEqual(
      buildExpectedProviderStatus({
        configuredForOrganisation: false,
        available: true,
        availabilitySource: 'environment',
        statusReason: 'environment_fallback',
      }),
    );
    expect(JSON.stringify(removed)).not.toContain('org-openai-key');
    expect(storedCredentialRows).toHaveLength(0);
  });

  it('reads legacy metadata credentials through the compatibility bridge until they are updated', async () => {
    const legacyCredentialRecords = setOrganisationAiProviderApiKey(
      {},
      'anthropic',
      'sk-ant-legacy-credential-1234567890',
      'test-jwt-secret',
    );
    organisationMetadata = mergeOrganisationMetadataWithAiSettings(
      organisationMetadata,
      {
        assistantProvider: 'openai',
        assistantModel: 'gpt-4.1',
        agentModel: 'gpt-4.1-mini',
      },
      legacyCredentialRecords,
    );

    const legacySettings = await service.getAiSettings('org-1', 'user-1');

    expect(legacySettings.assistantProviderStatus.anthropic).toEqual(
      buildExpectedProviderStatus({
        configuredForOrganisation: true,
        available: true,
        availabilitySource: 'organisation',
        statusReason: 'organisation_credential',
      }),
    );
    expect(storedCredentialRows).toHaveLength(0);

    await service.updateAiSettings('org-1', 'user-1', {
      anthropicApiKey: 'sk-ant-new-store-credential-0987654321',
    });

    expect(storedCredentialRows).toHaveLength(1);
    expect(storedCredentialRows[0]?.provider).toBe('anthropic');
    expect(JSON.stringify(storedCredentialRows)).not.toContain(
      'sk-ant-new-store-credential-0987654321',
    );
    expect(JSON.stringify(organisationMetadata)).not.toContain('providerCredentials');
  });

  it('returns provider configuration status without exposing stored credentials', async () => {
    await service.updateAiSettings('org-1', 'user-1', {
      anthropicApiKey: 'sk-ant-org-credential-1234567890',
      assistantProvider: 'anthropic',
      assistantModel: 'claude-sonnet-4-0',
    });

    const settings = await service.getAiSettings('org-1', 'user-1');

    expect(settings.assistantProvider).toBe('anthropic');
    expect(settings.availableAssistantProviders).toEqual(['openai', 'anthropic']);
    expect(settings.assistantProviderStatus).toEqual({
      openai: buildExpectedProviderStatus({
        configuredForOrganisation: false,
        available: true,
        availabilitySource: 'environment',
        statusReason: 'environment_fallback',
      }),
      anthropic: buildExpectedProviderStatus({
        configuredForOrganisation: true,
        available: true,
        availabilitySource: 'organisation',
        statusReason: 'organisation_credential',
      }),
      gemini: buildExpectedProviderStatus({
        configuredForOrganisation: false,
        available: false,
        availabilitySource: 'unavailable',
        statusReason: 'not_configured',
      }),
      deepseek: buildExpectedProviderStatus({
        configuredForOrganisation: false,
        available: false,
        availabilitySource: 'unavailable',
        statusReason: 'not_configured',
      }),
    });
    expect(JSON.stringify(settings)).not.toContain('sk-ant-org-credential-1234567890');

    const removed = await service.updateAiSettings('org-1', 'user-1', {
      removeAnthropicApiKey: true,
    });

    expect(removed.assistantProviderStatus.anthropic).toEqual(
      buildExpectedProviderStatus({
        configuredForOrganisation: false,
        available: false,
        availabilitySource: 'unavailable',
        statusReason: 'not_configured',
      }),
    );
  });

  it('saves, verifies, and removes Gemini credentials without leaking secrets', async () => {
    const geminiApiKey = 'AIzaSyGeminiOrgKey12345678901234567890';

    const saved = await service.updateAiSettings('org-1', 'user-1', {
      geminiApiKey,
      assistantProvider: 'gemini',
      assistantModel: 'gemini-2.0-flash',
    });

    expect(assistantProviderRegistry.getProvider).toHaveBeenCalledWith('gemini');
    expect(assistantProviderRegistry.geminiVerifyCredential).toHaveBeenCalledWith(geminiApiKey);
    expect(saved.assistantProviderStatus.gemini).toEqual(
      buildExpectedProviderStatus({
        configuredForOrganisation: true,
        available: true,
        availabilitySource: 'organisation',
        statusReason: 'organisation_credential',
      }),
    );
    expect(JSON.stringify(saved)).not.toContain(geminiApiKey);
    expect(storedCredentialRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          organisationId: 'org-1',
          provider: 'gemini',
        }),
      ]),
    );
    expect(JSON.stringify(storedCredentialRows)).not.toContain(geminiApiKey);

    const removed = await service.updateAiSettings('org-1', 'user-1', {
      removeGeminiApiKey: true,
    });

    expect(removed.assistantProviderStatus.gemini).toEqual(
      buildExpectedProviderStatus({
        configuredForOrganisation: false,
        available: false,
        availabilitySource: 'unavailable',
        statusReason: 'not_configured',
      }),
    );
  });

  it('reports Gemini environment fallback when GEMINI_API_KEY is available', async () => {
    const registry = createAssistantProviderRegistry({
      geminiEnvironmentAvailable: true,
    });
    const geminiFallbackService = createService(
      prisma as unknown as PrismaService,
      {
        AI_OPENAI_MODEL: 'gpt-4.1',
        AI_OPENAI_AGENT_MODEL: 'gpt-4.1-mini',
        OPENAI_API_KEY: 'env-openai-key-1234567890',
        GEMINI_API_KEY: 'env-gemini-key-1234567890',
        JWT_SECRET: 'test-jwt-secret',
      },
      registry,
    );

    const settings = await geminiFallbackService.getAiSettings('org-1', 'user-1');

    expect(settings.assistantProviderStatus.gemini).toEqual(
      buildExpectedProviderStatus({
        configuredForOrganisation: false,
        available: true,
        availabilitySource: 'environment',
        statusReason: 'environment_fallback',
      }),
    );
  });

  it('rejects Gemini credentials that fail verification before saving', async () => {
    assistantProviderRegistry.geminiVerifyCredential.mockRejectedValueOnce(
      new Error('invalid key'),
    );

    await expect(
      service.updateAiSettings('org-1', 'user-1', {
        geminiApiKey: 'AIzaSyGeminiInvalidKey123456789012345678',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(storedCredentialRows).toHaveLength(0);
  });

  it('saves, verifies, and removes DeepSeek credentials without leaking secrets', async () => {
    const deepseekApiKey = 'deepseek-org-key-12345678901234567890';

    const saved = await service.updateAiSettings('org-1', 'user-1', {
      deepseekApiKey,
      assistantProvider: 'deepseek',
      assistantModel: 'deepseek-chat',
    });

    expect(assistantProviderRegistry.getProvider).toHaveBeenCalledWith('deepseek');
    expect(assistantProviderRegistry.deepseekVerifyCredential).toHaveBeenCalledWith(deepseekApiKey);
    expect(saved.assistantProviderStatus.deepseek).toEqual(
      buildExpectedProviderStatus({
        configuredForOrganisation: true,
        available: true,
        availabilitySource: 'organisation',
        statusReason: 'organisation_credential',
      }),
    );
    expect(JSON.stringify(saved)).not.toContain(deepseekApiKey);
    expect(storedCredentialRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          organisationId: 'org-1',
          provider: 'deepseek',
        }),
      ]),
    );
    expect(JSON.stringify(storedCredentialRows)).not.toContain(deepseekApiKey);

    const removed = await service.updateAiSettings('org-1', 'user-1', {
      removeDeepseekApiKey: true,
    });

    expect(removed.assistantProviderStatus.deepseek).toEqual(
      buildExpectedProviderStatus({
        configuredForOrganisation: false,
        available: false,
        availabilitySource: 'unavailable',
        statusReason: 'not_configured',
      }),
    );
  });

  it('reports DeepSeek environment fallback when DEEPSEEK_API_KEY is available', async () => {
    const registry = createAssistantProviderRegistry({
      deepseekEnvironmentAvailable: true,
    });
    const deepseekFallbackService = createService(
      prisma as unknown as PrismaService,
      {
        AI_OPENAI_MODEL: 'gpt-4.1',
        AI_OPENAI_AGENT_MODEL: 'gpt-4.1-mini',
        OPENAI_API_KEY: 'env-openai-key-1234567890',
        DEEPSEEK_API_KEY: 'env-deepseek-key-1234567890',
        JWT_SECRET: 'test-jwt-secret',
      },
      registry,
    );

    const settings = await deepseekFallbackService.getAiSettings('org-1', 'user-1');

    expect(settings.assistantProviderStatus.deepseek).toEqual(
      buildExpectedProviderStatus({
        configuredForOrganisation: false,
        available: true,
        availabilitySource: 'environment',
        statusReason: 'environment_fallback',
      }),
    );
  });

  it('rejects DeepSeek credentials that fail verification before saving', async () => {
    assistantProviderRegistry.deepseekVerifyCredential.mockRejectedValueOnce(
      new Error('invalid key'),
    );

    await expect(
      service.updateAiSettings('org-1', 'user-1', {
        deepseekApiKey: 'deepseek-invalid-key-12345678901234567890',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(storedCredentialRows).toHaveLength(0);
  });

  it('rejects selecting an unavailable provider when no organisation or environment credential exists', async () => {
    await expect(
      service.updateAiSettings('org-1', 'user-1', {
        assistantProvider: 'anthropic',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('reports stored but unusable credentials without exposing secrets', async () => {
    await service.updateAiSettings('org-1', 'user-1', {
      openaiApiKey: 'org-openai-key-12345678901234567890',
    });

    const rotatedSecretService = createService(prisma as unknown as PrismaService, {
      AI_OPENAI_MODEL: 'gpt-4.1',
      AI_OPENAI_AGENT_MODEL: 'gpt-4.1-mini',
      OPENAI_API_KEY: 'env-openai-key-1234567890',
      JWT_SECRET: 'different-jwt-secret',
    });

    const settings = await rotatedSecretService.getAiSettings('org-1', 'user-1');

    expect(settings.assistantProviderStatus.openai).toEqual(
      buildExpectedProviderStatus({
        configuredForOrganisation: true,
        available: true,
        availabilitySource: 'environment',
        statusReason: 'credential_unusable',
        credentialIssueReason: 'stored_credential_cannot_be_decrypted',
      }),
    );
    expect(JSON.stringify(settings)).not.toContain('org-openai-key-12345678901234567890');
  });

  it('reports encryption-secret-unavailable separately from decrypt failure while keeping env fallback active', async () => {
    await service.updateAiSettings('org-1', 'user-1', {
      openaiApiKey: 'org-openai-key-12345678901234567890',
    });

    const missingSecretService = createService(prisma as unknown as PrismaService, {
      AI_OPENAI_MODEL: 'gpt-4.1',
      AI_OPENAI_AGENT_MODEL: 'gpt-4.1-mini',
      OPENAI_API_KEY: 'env-openai-key-1234567890',
    });

    const settings = await missingSecretService.getAiSettings('org-1', 'user-1');

    expect(settings.assistantProviderStatus.openai).toEqual(
      buildExpectedProviderStatus({
        configuredForOrganisation: true,
        available: true,
        availabilitySource: 'environment',
        statusReason: 'credential_unusable',
        credentialIssueReason: 'encryption_secret_unavailable',
      }),
    );
    expect(JSON.stringify(settings)).not.toContain('org-openai-key-12345678901234567890');
  });

  it('reports stored credential decrypt failure as unusable when no fallback exists', async () => {
    await service.updateAiSettings('org-1', 'user-1', {
      anthropicApiKey: 'sk-ant-org-credential-1234567890',
      assistantProvider: 'anthropic',
      assistantModel: 'claude-sonnet-4-0',
    });

    const rotatedSecretService = createService(prisma as unknown as PrismaService, {
      AI_OPENAI_MODEL: 'gpt-4.1',
      AI_OPENAI_AGENT_MODEL: 'gpt-4.1-mini',
      OPENAI_API_KEY: 'env-openai-key-1234567890',
      JWT_SECRET: 'different-jwt-secret',
    });

    const settings = await rotatedSecretService.getAiSettings('org-1', 'user-1');

    expect(settings.assistantProviderStatus.anthropic).toEqual(
      buildExpectedProviderStatus({
        configuredForOrganisation: true,
        available: false,
        availabilitySource: 'unavailable',
        statusReason: 'credential_unusable',
        credentialIssueReason: 'stored_credential_cannot_be_decrypted',
      }),
    );
    expect(JSON.stringify(settings)).not.toContain('sk-ant-org-credential-1234567890');
  });

  it('falls back cleanly when the dedicated credential table is missing', async () => {
    prisma.organisationAiAssistantProviderCredential.findMany.mockRejectedValue(
      createMissingCredentialStoreTableError(),
    );

    const settings = await service.getAiSettings('org-1', 'user-1');

    expect(settings.assistantProviderStatus.openai).toEqual(
      buildExpectedProviderStatus({
        configuredForOrganisation: false,
        available: true,
        availabilitySource: 'environment',
        statusReason: 'environment_fallback',
      }),
    );

    const updated = await service.updateAiSettings('org-1', 'user-1', {
      assistantModel: 'gpt-5-mini',
    });

    expect(updated.assistantModel).toBe('gpt-5-mini');
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(updated.assistantProviderStatus.openai).toEqual(
      buildExpectedProviderStatus({
        configuredForOrganisation: false,
        available: true,
        availabilitySource: 'environment',
        statusReason: 'environment_fallback',
      }),
    );
  });
});
