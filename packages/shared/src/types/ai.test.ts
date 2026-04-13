import { describe, expect, it } from 'vitest';
import {
  buildAiAssistantProviderStatusMap,
  buildDefaultOrganisationAiSettings,
  buildOrganisationAiSettingsResponse,
  getDefaultAssistantModelForProvider,
  normalizeOrganisationAiSettings,
  resolveAiAgentRuntimeSelection,
  resolveAiAssistantRuntimeSelection,
  resolveAiRuntimeSelectionForMode,
} from './ai.js';

describe('AI settings normalization', () => {
  it('defaults legacy settings to the OpenAI assistant provider', () => {
    expect(
      normalizeOrganisationAiSettings({
        assistantModel: 'gpt-5.2',
        agentModel: 'gpt-4.1-mini',
      }),
    ).toEqual({
      assistantProvider: 'openai',
      assistantModel: 'gpt-5.2',
      agentModel: 'gpt-4.1-mini',
    });
  });

  it('falls back to the provider default when the persisted assistant model is invalid', () => {
    expect(
      normalizeOrganisationAiSettings({
        assistantProvider: 'anthropic',
        assistantModel: 'gpt-4.1',
      }),
    ).toEqual({
      assistantProvider: 'anthropic',
      assistantModel: getDefaultAssistantModelForProvider('anthropic'),
      agentModel: 'gpt-4.1-mini',
    });
  });

  it('normalizes Gemini assistant settings with the provider-scoped default model', () => {
    expect(
      normalizeOrganisationAiSettings({
        assistantProvider: 'gemini',
        assistantModel: 'gpt-4.1',
      }),
    ).toEqual({
      assistantProvider: 'gemini',
      assistantModel: getDefaultAssistantModelForProvider('gemini'),
      agentModel: 'gpt-4.1-mini',
    });
  });

  it('normalizes DeepSeek assistant settings with the provider-scoped default model', () => {
    expect(
      normalizeOrganisationAiSettings({
        assistantProvider: 'deepseek',
        assistantModel: 'gpt-4.1',
      }),
    ).toEqual({
      assistantProvider: 'deepseek',
      assistantModel: getDefaultAssistantModelForProvider('deepseek'),
      agentModel: 'gpt-4.1-mini',
    });
  });

  it('falls back to OpenAI defaults when the persisted provider/model combination is invalid', () => {
    expect(
      normalizeOrganisationAiSettings({
        assistantProvider: 'not-a-provider',
        assistantModel: 'claude-sonnet-4-0',
      }),
    ).toEqual({
      assistantProvider: 'openai',
      assistantModel: 'gpt-4.1',
      agentModel: 'gpt-4.1-mini',
    });
  });

  it('returns provider-aware defaults in the response payload', () => {
    expect(buildOrganisationAiSettingsResponse(null).defaults).toEqual({
      assistantProvider: 'openai',
      assistantModel: 'gpt-4.1',
      agentModel: 'gpt-4.1-mini',
    });
  });

  it('returns provider status and available providers in the response payload', () => {
    const response = buildOrganisationAiSettingsResponse(
      null,
      undefined,
      buildAiAssistantProviderStatusMap({
        openai: {
          available: true,
          availabilitySource: 'environment',
        },
        anthropic: {
          available: false,
          availabilitySource: 'unavailable',
        },
        gemini: {
          available: true,
          availabilitySource: 'environment',
        },
        deepseek: {
          available: false,
          availabilitySource: 'unavailable',
        },
      }),
    );

    expect(response.availableAssistantProviders).toEqual(['openai', 'gemini']);
    expect(response.assistantProviderStatus).toEqual({
      openai: {
        configuredForOrganisation: false,
        available: true,
        availabilitySource: 'environment',
        statusReason: 'environment_fallback',
        credentialIssueReason: null,
        credentialSource: 'environment',
        connectionState: 'env_fallback_active',
      },
      anthropic: {
        configuredForOrganisation: false,
        available: false,
        availabilitySource: 'unavailable',
        statusReason: 'not_configured',
        credentialIssueReason: null,
        credentialSource: 'none',
        connectionState: 'unavailable',
      },
      gemini: {
        configuredForOrganisation: false,
        available: true,
        availabilitySource: 'environment',
        statusReason: 'environment_fallback',
        credentialIssueReason: null,
        credentialSource: 'environment',
        connectionState: 'env_fallback_active',
      },
      deepseek: {
        configuredForOrganisation: false,
        available: false,
        availabilitySource: 'unavailable',
        statusReason: 'not_configured',
        credentialIssueReason: null,
        credentialSource: 'none',
        connectionState: 'unavailable',
      },
    });
  });

  it('resolves agent mode to OpenAI even when assistant mode is set to Anthropic', () => {
    const settings = buildDefaultOrganisationAiSettings({
      assistantProvider: 'anthropic',
      assistantModel: 'claude-sonnet-4-0',
      agentModel: 'gpt-5-mini',
    });

    expect(resolveAiAssistantRuntimeSelection(settings)).toEqual({
      provider: 'anthropic',
      model: 'claude-sonnet-4-0',
    });
    expect(resolveAiAgentRuntimeSelection(settings)).toEqual({
      provider: 'openai',
      model: 'gpt-5-mini',
    });
  });

  it('falls back to the next available assistant provider when the saved provider is unavailable', () => {
    const settings = buildDefaultOrganisationAiSettings({
      assistantProvider: 'anthropic',
      assistantModel: 'claude-sonnet-4-0',
      agentModel: 'gpt-5-mini',
    });

    expect(
      resolveAiRuntimeSelectionForMode(
        'assistant',
        settings,
        buildAiAssistantProviderStatusMap({
          openai: {
            available: true,
            availabilitySource: 'environment',
          },
          anthropic: {
            available: false,
            availabilitySource: 'unavailable',
          },
        }),
      ),
    ).toEqual({
      provider: 'openai',
      model: 'gpt-4.1',
    });
  });

  it('marks stored but unusable credentials separately from normal environment fallback', () => {
    expect(
      buildAiAssistantProviderStatusMap({
        anthropic: {
          configuredForOrganisation: true,
          available: true,
          availabilitySource: 'environment',
        },
      }).anthropic,
    ).toEqual({
      configuredForOrganisation: true,
      available: true,
      availabilitySource: 'environment',
      statusReason: 'credential_unusable',
      credentialIssueReason: null,
      credentialSource: 'environment',
      connectionState: 'env_fallback_active',
    });
  });

  it('preserves a safe credential issue reason when one is supplied', () => {
    expect(
      buildAiAssistantProviderStatusMap({
        openai: {
          configuredForOrganisation: true,
          available: true,
          availabilitySource: 'environment',
          statusReason: 'credential_unusable',
          credentialIssueReason: 'stored_credential_cannot_be_decrypted',
        },
      }).openai,
    ).toEqual({
      configuredForOrganisation: true,
      available: true,
      availabilitySource: 'environment',
      statusReason: 'credential_unusable',
      credentialIssueReason: 'stored_credential_cannot_be_decrypted',
      credentialSource: 'environment',
      connectionState: 'env_fallback_active',
    });
  });

  it('derives manual-key source even when the stored credential is unusable without fallback', () => {
    expect(
      buildAiAssistantProviderStatusMap({
        deepseek: {
          configuredForOrganisation: true,
          available: false,
          availabilitySource: 'unavailable',
          statusReason: 'credential_unusable',
        },
      }).deepseek,
    ).toEqual({
      configuredForOrganisation: true,
      available: false,
      availabilitySource: 'unavailable',
      statusReason: 'credential_unusable',
      credentialIssueReason: null,
      credentialSource: 'manual_api_key',
      connectionState: 'unavailable',
    });
  });

  it('keeps the compatibility helper behavior intact for both modes', () => {
    const settings = buildDefaultOrganisationAiSettings({
      assistantProvider: 'openai',
      assistantModel: 'gpt-4.1-mini',
      agentModel: 'gpt-5-mini',
    });

    expect(resolveAiRuntimeSelectionForMode('assistant', settings)).toEqual(
      resolveAiAssistantRuntimeSelection(settings),
    );
    expect(resolveAiRuntimeSelectionForMode('agent', settings)).toEqual(
      resolveAiAgentRuntimeSelection(settings),
    );
  });
});
