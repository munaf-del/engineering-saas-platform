import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AiAssistantProviderStatus } from '@eng/shared';
import { assistantResponseSchema } from '../assistant-response.schema';
import type {
  AssistantProviderAdapter,
  AssistantProviderCredentialInput,
  AssistantProviderRequest,
} from './assistant-provider.interface';

const DEEPSEEK_API_BASE_URL = 'https://api.deepseek.com';
const DEEPSEEK_CHAT_COMPLETIONS_PATH = '/v1/chat/completions';
const DEEPSEEK_CREDENTIAL_TEST_MODEL = 'deepseek-chat';
const DEEPSEEK_RESPONSE_FORMAT_EXAMPLE =
  '{"answer":"","visiblePageFacts":[],"toolFindings":[],"inferredLikelyIssues":[],"standardsReferenceNotes":[],"suggestedNextSteps":[],"suggestedFields":[],"draftActions":[],"limitationNote":null}';

type DeepSeekChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
  };
};

@Injectable()
export class DeepSeekAssistantProvider implements AssistantProviderAdapter {
  readonly provider = 'deepseek' as const;

  constructor(private readonly configService: ConfigService) {}

  getProviderStatus(options: AssistantProviderCredentialInput = {}): AiAssistantProviderStatus {
    const apiKey = options.apiKey?.trim();
    const environmentApiKey = this.getEnvironmentApiKey();
    const hasStoredCredential = options.hasStoredCredential ?? false;

    if (apiKey) {
      return {
        configuredForOrganisation: true,
        available: true,
        availabilitySource: 'organisation',
        statusReason: 'organisation_credential',
      };
    }

    return {
      configuredForOrganisation: hasStoredCredential,
      available: Boolean(environmentApiKey),
      availabilitySource: environmentApiKey ? 'environment' : 'unavailable',
      statusReason:
        hasStoredCredential && !apiKey
          ? 'credential_unusable'
          : environmentApiKey
            ? 'environment_fallback'
            : 'not_configured',
    };
  }

  async verifyCredential(apiKey: string) {
    await this.createChatCompletion(apiKey, {
      model: DEEPSEEK_CREDENTIAL_TEST_MODEL,
      messages: [{ role: 'user', content: 'test' }],
      max_tokens: 1,
    });
  }

  async respondToAssistant(
    {
      model,
      systemPrompt,
      promptContext,
      conversation,
      responseFormatDescription,
      noPayloadErrorMessage,
    }: AssistantProviderRequest,
    credential?: AssistantProviderCredentialInput,
  ) {
    const response = await this.createChatCompletion(
      this.resolveApiKey(credential?.apiKey),
      {
        model,
        messages: [
          {
            role: 'system',
            content: buildDeepSeekSystemPrompt(systemPrompt, responseFormatDescription),
          },
          {
            role: 'user',
            content: promptContext,
          },
          ...conversation.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        ],
        response_format: {
          type: 'json_object',
        },
        max_tokens: 4096,
      },
    );

    const content = response.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new Error(noPayloadErrorMessage);
    }

    return assistantResponseSchema.parse(JSON.parse(extractJsonText(content)));
  }

  private async createChatCompletion(
    apiKey: string,
    body: Record<string, unknown>,
  ): Promise<DeepSeekChatCompletionResponse> {
    const response = await fetch(`${DEEPSEEK_API_BASE_URL}${DEEPSEEK_CHAT_COMPLETIONS_PATH}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const responseText = await response.text();
    const payload = parseDeepSeekResponse(responseText);

    if (!response.ok) {
      throw new Error(
        payload?.error?.message ||
          `DeepSeek request failed with status ${response.status}`,
      );
    }

    return payload ?? {};
  }

  private resolveApiKey(apiKeyOverride?: string | null) {
    const apiKey = apiKeyOverride?.trim();
    if (apiKey) {
      return apiKey;
    }

    const environmentApiKey = this.getEnvironmentApiKey();
    if (!environmentApiKey) {
      throw new ServiceUnavailableException('DEEPSEEK_API_KEY is not configured');
    }

    return environmentApiKey;
  }

  private getEnvironmentApiKey() {
    return this.configService.get<string>('DEEPSEEK_API_KEY')?.trim() || null;
  }
}

function buildDeepSeekSystemPrompt(
  systemPrompt: string,
  responseFormatDescription: string,
) {
  return [
    systemPrompt,
    '',
    'Return valid JSON only.',
    responseFormatDescription,
    'Use this exact JSON object shape:',
    DEEPSEEK_RESPONSE_FORMAT_EXAMPLE,
  ].join('\n');
}

function extractJsonText(value: string) {
  const trimmed = value.trim();
  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  return trimmed;
}

function parseDeepSeekResponse(value: string): DeepSeekChatCompletionResponse | null {
  if (!value.trim()) {
    return null;
  }

  return JSON.parse(value) as DeepSeekChatCompletionResponse;
}
