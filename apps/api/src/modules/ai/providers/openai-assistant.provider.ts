import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import type { AiAssistantProviderStatus } from '@eng/shared';
import { assistantResponseSchema } from '../assistant-response.schema';
import type {
  AssistantProviderAdapter,
  AssistantProviderCredentialInput,
  AssistantProviderRequest,
} from './assistant-provider.interface';

@Injectable()
export class OpenAiAssistantProvider implements AssistantProviderAdapter {
  readonly provider = 'openai' as const;

  private openAiClient: OpenAI | null = null;

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

  async respondToAssistant(
    {
      model,
      systemPrompt,
      promptContext,
      conversation,
      responseFormatName,
      responseFormatDescription,
      noPayloadErrorMessage,
    }: AssistantProviderRequest,
    credential?: AssistantProviderCredentialInput,
  ) {
    const openai = this.getOpenAiClient(credential?.apiKey);
    const response = await openai.responses.parse({
      model,
      input: [
        {
          role: 'system',
          content: systemPrompt,
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
      text: {
        format: zodTextFormat(assistantResponseSchema, responseFormatName, {
          description: responseFormatDescription,
        }),
        verbosity: 'medium',
      },
    });

    const parsed = response.output_parsed;
    if (!parsed) {
      throw new Error(noPayloadErrorMessage);
    }

    return parsed;
  }

  private getOpenAiClient(apiKeyOverride?: string | null) {
    const apiKey = apiKeyOverride?.trim();
    if (!apiKey) {
      if (this.openAiClient) {
        return this.openAiClient;
      }

      const environmentApiKey = this.getEnvironmentApiKey();
      if (!environmentApiKey) {
        throw new ServiceUnavailableException('OPENAI_API_KEY is not configured');
      }

      this.openAiClient = new OpenAI({ apiKey: environmentApiKey });
      return this.openAiClient;
    }

    return new OpenAI({ apiKey });
  }

  private getEnvironmentApiKey() {
    return this.configService.get<string>('OPENAI_API_KEY')?.trim() || null;
  }
}
