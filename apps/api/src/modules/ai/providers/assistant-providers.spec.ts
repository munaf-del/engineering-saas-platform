const mockOpenAiParse = jest.fn();
const mockAnthropicParse = jest.fn();
const mockGeminiGenerateContent = jest.fn();
const mockDeepSeekFetch = jest.fn();
const mockOpenAI = jest.fn().mockImplementation(({ apiKey }: { apiKey: string }) => ({
  apiKey,
  responses: {
    parse: mockOpenAiParse,
  },
}));
const mockAnthropic = jest.fn().mockImplementation(({ apiKey }: { apiKey: string }) => ({
  apiKey,
  messages: {
    parse: mockAnthropicParse,
  },
}));
const mockGoogleGenerativeAI = jest
  .fn()
  .mockImplementation((apiKey: string) => ({
    apiKey,
    getGenerativeModel: jest.fn().mockImplementation(({ model, systemInstruction }) => ({
      model,
      systemInstruction,
      generateContent: mockGeminiGenerateContent,
    })),
  }));

jest.mock('@eng/shared', () => ({
  AI_ASSISTANT_PROVIDER_OPTIONS: ['openai', 'anthropic', 'gemini', 'deepseek'],
  buildAiAssistantProviderStatusMap: (
    overrides: Record<string, Record<string, unknown>> = {},
  ) => ({
    openai: {
      configuredForOrganisation: false,
      available: true,
      availabilitySource: 'environment',
      statusReason: 'environment_fallback',
      ...overrides.openai,
    },
    anthropic: {
      configuredForOrganisation: false,
      available: false,
      availabilitySource: 'unavailable',
      statusReason: 'not_configured',
      ...overrides.anthropic,
    },
    gemini: {
      configuredForOrganisation: false,
      available: false,
      availabilitySource: 'unavailable',
      statusReason: 'not_configured',
      ...overrides.gemini,
    },
    deepseek: {
      configuredForOrganisation: false,
      available: false,
      availabilitySource: 'unavailable',
      statusReason: 'not_configured',
      ...overrides.deepseek,
    },
  }),
  isAiAssistantModelSupportedByProvider: (model: string, provider: string) =>
    provider === 'openai'
      ? ['gpt-4.1-mini', 'gpt-4.1', 'gpt-5-mini', 'gpt-5.2'].includes(model)
      : provider === 'anthropic'
        ? ['claude-sonnet-4-0', 'claude-3-7-sonnet-latest'].includes(model)
        : provider === 'gemini'
          ? ['gemini-2.0-flash', 'gemini-2.0-pro'].includes(model)
          : ['deepseek-chat', 'deepseek-reasoner'].includes(model),
}));
jest.mock('openai', () => ({
  __esModule: true,
  default: mockOpenAI,
}));
jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: mockAnthropic,
}));
jest.mock('openai/helpers/zod', () => ({
  zodTextFormat: jest.fn(() => ({})),
}));
jest.mock('@anthropic-ai/sdk/helpers/zod', () => ({
  zodOutputFormat: jest.fn(() => ({})),
}));
jest.mock('@google/generative-ai', () => ({
  __esModule: true,
  GoogleGenerativeAI: mockGoogleGenerativeAI,
}));

import { ServiceUnavailableException } from '@nestjs/common';
import { type ConfigService } from '@nestjs/config';
import { AssistantProviderRegistry } from './assistant-provider.registry';
import { AnthropicAssistantProvider } from './anthropic-assistant.provider';
import { DeepSeekAssistantProvider } from './deepseek-assistant.provider';
import { GeminiAssistantProvider } from './gemini-assistant.provider';
import { OpenAiAssistantProvider } from './openai-assistant.provider';

const EXPECTED_RESPONSE = {
  answer: 'Use the visible page warnings first.',
  visiblePageFacts: ['The page shows two warnings.'],
  toolFindings: [],
  inferredLikelyIssues: ['Required pile inputs are still blank.'],
  standardsReferenceNotes: [],
  suggestedNextSteps: ['Fill in the missing pile inputs.'],
  suggestedFields: [],
  draftActions: [],
  limitationNote: null,
};

function createConfigService(
  overrides: Record<string, string | undefined> = {},
): ConfigService {
  return {
    get: jest.fn((key: string) => overrides[key]),
  } as unknown as ConfigService;
}

describe('assistant providers', () => {
  const originalFetch = global.fetch;

  beforeAll(() => {
    global.fetch = mockDeepSeekFetch as unknown as typeof fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    mockOpenAI.mockClear();
    mockAnthropic.mockClear();
    mockGoogleGenerativeAI.mockClear();
    mockOpenAiParse.mockReset();
    mockAnthropicParse.mockReset();
    mockGeminiGenerateContent.mockReset();
    mockDeepSeekFetch.mockReset();
  });

  it('returns adapters from the provider registry', () => {
    const openai = new OpenAiAssistantProvider(createConfigService());
    const anthropic = new AnthropicAssistantProvider(createConfigService());
    const gemini = new GeminiAssistantProvider(createConfigService());
    const deepseek = new DeepSeekAssistantProvider(createConfigService());
    const registry = new AssistantProviderRegistry(openai, anthropic, gemini, deepseek);

    expect(registry.getProvider('openai')).toBe(openai);
    expect(registry.getProvider('anthropic')).toBe(anthropic);
    expect(registry.getProvider('gemini')).toBe(gemini);
    expect(registry.getProvider('deepseek')).toBe(deepseek);
  });

  it('rejects invalid provider/model combinations clearly', () => {
    const registry = new AssistantProviderRegistry(
      new OpenAiAssistantProvider(createConfigService()),
      new AnthropicAssistantProvider(createConfigService()),
      new GeminiAssistantProvider(createConfigService()),
      new DeepSeekAssistantProvider(createConfigService()),
    );

    expect(() => registry.getProvider('anthropic', 'gpt-4.1')).toThrow(
      'AI model "gpt-4.1" is not supported for assistant provider "anthropic"',
    );
    expect(() => registry.getProvider('gemini', 'gpt-4.1')).toThrow(
      'AI model "gpt-4.1" is not supported for assistant provider "gemini"',
    );
    expect(() => registry.getProvider('deepseek', 'gpt-4.1')).toThrow(
      'AI model "gpt-4.1" is not supported for assistant provider "deepseek"',
    );
    expect(registry.getProvider('openai', 'gpt-4.1-mini')).toBeInstanceOf(
      OpenAiAssistantProvider,
    );
  });

  it('reports provider availability from organisation credentials and environment fallback', () => {
    const openai = new OpenAiAssistantProvider(
      createConfigService({ OPENAI_API_KEY: 'env-openai-key-1234567890' }),
    );
    const anthropic = new AnthropicAssistantProvider(
      createConfigService({ ANTHROPIC_API_KEY: 'env-anthropic-key-1234567890' }),
    );
    const gemini = new GeminiAssistantProvider(createConfigService());
    const deepseek = new DeepSeekAssistantProvider(createConfigService());
    const registry = new AssistantProviderRegistry(openai, anthropic, gemini, deepseek);

    expect(registry.getProviderStatusMap()).toEqual({
      openai: {
        configuredForOrganisation: false,
        available: true,
        availabilitySource: 'environment',
        statusReason: 'environment_fallback',
      },
      anthropic: {
        configuredForOrganisation: false,
        available: true,
        availabilitySource: 'environment',
        statusReason: 'environment_fallback',
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
    });

    expect(
      registry.getProviderStatusMap({
        anthropic: {
          apiKey: 'sk-ant-org-credential-1234567890',
          hasStoredCredential: true,
        },
      }),
    ).toEqual({
      openai: {
        configuredForOrganisation: false,
        available: true,
        availabilitySource: 'environment',
        statusReason: 'environment_fallback',
      },
      anthropic: {
        configuredForOrganisation: true,
        available: true,
        availabilitySource: 'organisation',
        statusReason: 'organisation_credential',
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
    });
  });

  it('surfaces unusable stored credentials distinctly from normal environment fallback', () => {
    const openai = new OpenAiAssistantProvider(
      createConfigService({ OPENAI_API_KEY: 'env-openai-key-1234567890' }),
    );
    const registry = new AssistantProviderRegistry(
      openai,
      new AnthropicAssistantProvider(createConfigService()),
      new GeminiAssistantProvider(createConfigService()),
      new DeepSeekAssistantProvider(createConfigService()),
    );

    expect(
      registry.getProviderStatusMap({
        openai: {
          hasStoredCredential: true,
          credentialIssue: 'credential_decryption_failed',
        },
      }),
    ).toEqual({
      openai: {
        configuredForOrganisation: true,
        available: true,
        availabilitySource: 'environment',
        statusReason: 'credential_unusable',
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
    });
  });

  it('normalizes the OpenAI adapter response', async () => {
    const provider = new OpenAiAssistantProvider(createConfigService());
    const parse = jest.fn().mockResolvedValue({ output_parsed: EXPECTED_RESPONSE });
    (provider as unknown as { openAiClient: unknown }).openAiClient = {
      responses: {
        parse,
      },
    };

    await expect(
      provider.respondToAssistant({
        model: 'gpt-4.1',
        systemPrompt: 'system prompt',
        promptContext: 'prompt context',
        conversation: [{ role: 'user', content: 'hello' }],
        responseFormatName: 'assistant_response',
        responseFormatDescription: 'Structured assistant response',
        noPayloadErrorMessage: 'OpenAI returned no assistant payload',
      }),
    ).resolves.toEqual(EXPECTED_RESPONSE);

    expect(parse).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4.1',
      }),
    );
  });

  it('uses an organisation-scoped OpenAI API key override when provided', async () => {
    const provider = new OpenAiAssistantProvider(createConfigService());
    mockOpenAiParse.mockResolvedValue({ output_parsed: EXPECTED_RESPONSE });

    await expect(
      provider.respondToAssistant(
        {
          model: 'gpt-4.1',
          systemPrompt: 'system prompt',
          promptContext: 'prompt context',
          conversation: [{ role: 'user', content: 'hello' }],
          responseFormatName: 'assistant_response',
          responseFormatDescription: 'Structured assistant response',
          noPayloadErrorMessage: 'OpenAI returned no assistant payload',
        },
        {
          apiKey: 'org-openai-key-12345678901234567890',
          hasStoredCredential: true,
        },
      ),
    ).resolves.toEqual(EXPECTED_RESPONSE);

    expect(mockOpenAI).toHaveBeenCalledWith({
      apiKey: 'org-openai-key-12345678901234567890',
    });
  });

  it('normalizes the Anthropic adapter response', async () => {
    const provider = new AnthropicAssistantProvider(createConfigService());
    const parse = jest.fn().mockResolvedValue({
      parsed_output: EXPECTED_RESPONSE,
    });
    (provider as unknown as { anthropicClient: unknown }).anthropicClient = {
      messages: {
        parse,
      },
    };

    await expect(
      provider.respondToAssistant({
        model: 'claude-sonnet-4-0',
        systemPrompt: 'system prompt',
        promptContext: 'prompt context',
        conversation: [{ role: 'user', content: 'hello' }],
        responseFormatName: 'assistant_response',
        responseFormatDescription: 'Structured assistant response',
        noPayloadErrorMessage: 'Anthropic returned no assistant payload',
      }),
    ).resolves.toEqual(EXPECTED_RESPONSE);

    expect(parse).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-sonnet-4-0',
        output_config: expect.any(Object),
      }),
    );
  });

  it('throws a clear configuration error when Anthropic is selected without a key', async () => {
    const provider = new AnthropicAssistantProvider(createConfigService());

    await expect(
      provider.respondToAssistant({
        model: 'claude-sonnet-4-0',
        systemPrompt: 'system prompt',
        promptContext: 'prompt context',
        conversation: [],
        responseFormatName: 'assistant_response',
        responseFormatDescription: 'Structured assistant response',
        noPayloadErrorMessage: 'Anthropic returned no assistant payload',
      }),
    ).rejects.toThrow(new ServiceUnavailableException('ANTHROPIC_API_KEY is not configured'));
  });

  it('reports Gemini environment fallback and organisation credentials', () => {
    const registry = new AssistantProviderRegistry(
      new OpenAiAssistantProvider(
        createConfigService({ OPENAI_API_KEY: 'env-openai-key-1234567890' }),
      ),
      new AnthropicAssistantProvider(createConfigService()),
      new GeminiAssistantProvider(
        createConfigService({ GEMINI_API_KEY: 'env-gemini-key-1234567890' }),
      ),
      new DeepSeekAssistantProvider(createConfigService()),
    );

    expect(registry.getProviderStatusMap().gemini).toEqual({
      configuredForOrganisation: false,
      available: true,
      availabilitySource: 'environment',
      statusReason: 'environment_fallback',
    });

    expect(
      registry.getProviderStatusMap({
        gemini: {
          apiKey: 'org-gemini-key-12345678901234567890',
          hasStoredCredential: true,
        },
      }).gemini,
    ).toEqual({
      configuredForOrganisation: true,
      available: true,
      availabilitySource: 'organisation',
      statusReason: 'organisation_credential',
    });
  });

  it('normalizes the Gemini adapter response', async () => {
    const provider = new GeminiAssistantProvider(
      createConfigService({ GEMINI_API_KEY: 'env-gemini-key-1234567890' }),
    );
    mockGeminiGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify(EXPECTED_RESPONSE),
      },
    });

    await expect(
      provider.respondToAssistant({
        model: 'gemini-2.0-flash',
        systemPrompt: 'system prompt',
        promptContext: 'prompt context',
        conversation: [{ role: 'user', content: 'hello' }],
        responseFormatName: 'assistant_response',
        responseFormatDescription: 'Structured assistant response',
        noPayloadErrorMessage: 'Gemini returned no assistant payload',
      }),
    ).resolves.toEqual(EXPECTED_RESPONSE);

    expect(mockGoogleGenerativeAI).toHaveBeenCalledWith('env-gemini-key-1234567890');
    expect(mockGeminiGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        generationConfig: expect.objectContaining({
          responseMimeType: 'application/json',
        }),
      }),
    );
  });

  it('uses an organisation-scoped Gemini API key override when provided', async () => {
    const provider = new GeminiAssistantProvider(createConfigService());
    mockGeminiGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify(EXPECTED_RESPONSE),
      },
    });

    await expect(
      provider.respondToAssistant(
        {
          model: 'gemini-2.0-flash',
          systemPrompt: 'system prompt',
          promptContext: 'prompt context',
          conversation: [{ role: 'user', content: 'hello' }],
          responseFormatName: 'assistant_response',
          responseFormatDescription: 'Structured assistant response',
          noPayloadErrorMessage: 'Gemini returned no assistant payload',
        },
        {
          apiKey: 'org-gemini-key-12345678901234567890',
          hasStoredCredential: true,
        },
      ),
    ).resolves.toEqual(EXPECTED_RESPONSE);

    expect(mockGoogleGenerativeAI).toHaveBeenCalledWith(
      'org-gemini-key-12345678901234567890',
    );
  });

  it('verifies Gemini credentials with a lightweight test request', async () => {
    const provider = new GeminiAssistantProvider(createConfigService());
    mockGeminiGenerateContent.mockResolvedValue({
      response: {
        text: () => 'OK',
      },
    });

    await expect(
      provider.verifyCredential?.('org-gemini-key-12345678901234567890'),
    ).resolves.toBeUndefined();

    expect(mockGeminiGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        contents: expect.any(Array),
      }),
    );
  });

  it('throws a clear configuration error when Gemini is selected without a key', async () => {
    const provider = new GeminiAssistantProvider(createConfigService());

    await expect(
      provider.respondToAssistant({
        model: 'gemini-2.0-flash',
        systemPrompt: 'system prompt',
        promptContext: 'prompt context',
        conversation: [],
        responseFormatName: 'assistant_response',
        responseFormatDescription: 'Structured assistant response',
        noPayloadErrorMessage: 'Gemini returned no assistant payload',
      }),
    ).rejects.toThrow(new ServiceUnavailableException('GEMINI_API_KEY is not configured'));
  });

  it('reports DeepSeek environment fallback and organisation credentials', () => {
    const registry = new AssistantProviderRegistry(
      new OpenAiAssistantProvider(
        createConfigService({ OPENAI_API_KEY: 'env-openai-key-1234567890' }),
      ),
      new AnthropicAssistantProvider(createConfigService()),
      new GeminiAssistantProvider(createConfigService()),
      new DeepSeekAssistantProvider(
        createConfigService({ DEEPSEEK_API_KEY: 'env-deepseek-key-1234567890' }),
      ),
    );

    expect(registry.getProviderStatusMap().deepseek).toEqual({
      configuredForOrganisation: false,
      available: true,
      availabilitySource: 'environment',
      statusReason: 'environment_fallback',
    });

    expect(
      registry.getProviderStatusMap({
        deepseek: {
          apiKey: 'org-deepseek-key-12345678901234567890',
          hasStoredCredential: true,
        },
      }).deepseek,
    ).toEqual({
      configuredForOrganisation: true,
      available: true,
      availabilitySource: 'organisation',
      statusReason: 'organisation_credential',
    });
  });

  it('normalizes the DeepSeek adapter response', async () => {
    const provider = new DeepSeekAssistantProvider(
      createConfigService({ DEEPSEEK_API_KEY: 'env-deepseek-key-1234567890' }),
    );
    mockDeepSeekFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify(EXPECTED_RESPONSE),
              },
            },
          ],
        }),
      ),
    });

    await expect(
      provider.respondToAssistant({
        model: 'deepseek-chat',
        systemPrompt: 'system prompt',
        promptContext: 'prompt context',
        conversation: [{ role: 'user', content: 'hello' }],
        responseFormatName: 'assistant_response',
        responseFormatDescription: 'Structured assistant response',
        noPayloadErrorMessage: 'DeepSeek returned no assistant payload',
      }),
    ).resolves.toEqual(EXPECTED_RESPONSE);

    expect(mockDeepSeekFetch).toHaveBeenCalledWith(
      'https://api.deepseek.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer env-deepseek-key-1234567890',
        }),
      }),
    );
    expect(JSON.parse(String(mockDeepSeekFetch.mock.calls[0]?.[1]?.body))).toEqual(
      expect.objectContaining({
        model: 'deepseek-chat',
        response_format: { type: 'json_object' },
      }),
    );
  });

  it('uses an organisation-scoped DeepSeek API key override when provided', async () => {
    const provider = new DeepSeekAssistantProvider(createConfigService());
    mockDeepSeekFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify(EXPECTED_RESPONSE),
              },
            },
          ],
        }),
      ),
    });

    await expect(
      provider.respondToAssistant(
        {
          model: 'deepseek-chat',
          systemPrompt: 'system prompt',
          promptContext: 'prompt context',
          conversation: [{ role: 'user', content: 'hello' }],
          responseFormatName: 'assistant_response',
          responseFormatDescription: 'Structured assistant response',
          noPayloadErrorMessage: 'DeepSeek returned no assistant payload',
        },
        {
          apiKey: 'org-deepseek-key-12345678901234567890',
          hasStoredCredential: true,
        },
      ),
    ).resolves.toEqual(EXPECTED_RESPONSE);

    expect(mockDeepSeekFetch).toHaveBeenCalledWith(
      'https://api.deepseek.com/v1/chat/completions',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer org-deepseek-key-12345678901234567890',
        }),
      }),
    );
  });

  it('verifies DeepSeek credentials with a lightweight test request', async () => {
    const provider = new DeepSeekAssistantProvider(createConfigService());
    mockDeepSeekFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue(
        JSON.stringify({
          choices: [{ message: { content: 'ok' } }],
        }),
      ),
    });

    await expect(
      provider.verifyCredential?.('org-deepseek-key-12345678901234567890'),
    ).resolves.toBeUndefined();

    expect(JSON.parse(String(mockDeepSeekFetch.mock.calls[0]?.[1]?.body))).toEqual({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: 'test' }],
      max_tokens: 1,
    });
  });

  it('throws a clear configuration error when DeepSeek is selected without a key', async () => {
    const provider = new DeepSeekAssistantProvider(createConfigService());

    await expect(
      provider.respondToAssistant({
        model: 'deepseek-chat',
        systemPrompt: 'system prompt',
        promptContext: 'prompt context',
        conversation: [],
        responseFormatName: 'assistant_response',
        responseFormatDescription: 'Structured assistant response',
        noPayloadErrorMessage: 'DeepSeek returned no assistant payload',
      }),
    ).rejects.toThrow(new ServiceUnavailableException('DEEPSEEK_API_KEY is not configured'));
  });
});
