import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AiAssistantProviderStatus } from '@eng/shared';
import { assistantResponseSchema } from '../assistant-response.schema';
import type {
  AssistantProviderAdapter,
  AssistantProviderCredentialInput,
  AssistantProviderRequest,
} from './assistant-provider.interface';

@Injectable()
export class AnthropicAssistantProvider implements AssistantProviderAdapter {
  readonly provider = 'anthropic' as const;

  private anthropicClient: Anthropic | null = null;

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
      noPayloadErrorMessage: noPayloadErrorMessage,
    }: AssistantProviderRequest,
    credential?: AssistantProviderCredentialInput,
  ) {
    const anthropic = this.getAnthropicClient(credential?.apiKey);
    const response = await anthropic.messages.parse({
      model,
      max_tokens: 4000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: promptContext,
        },
        ...conversation.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      ],
      output_config: {
        format: zodOutputFormat(assistantResponseSchema as never),
      },
    });

    if (!response.parsed_output) {
      throw new Error(noPayloadErrorMessage);
    }

    return response.parsed_output;
  }

  private getAnthropicClient(apiKeyOverride?: string | null) {
    const apiKey = apiKeyOverride?.trim();
    if (!apiKey) {
      if (this.anthropicClient) {
        return this.anthropicClient;
      }

      const environmentApiKey = this.getEnvironmentApiKey();
      if (!environmentApiKey) {
        throw new ServiceUnavailableException('ANTHROPIC_API_KEY is not configured');
      }

      this.anthropicClient = new Anthropic({ apiKey: environmentApiKey });
      return this.anthropicClient;
    }

    return new Anthropic({ apiKey });
  }

  private getEnvironmentApiKey() {
    return this.configService.get<string>('ANTHROPIC_API_KEY')?.trim() || null;
  }
}
