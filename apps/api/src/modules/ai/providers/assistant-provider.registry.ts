import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  AI_ASSISTANT_PROVIDER_OPTIONS,
  buildAiAssistantProviderStatusMap,
  isAiAssistantModelSupportedByProvider,
  type AiAssistantProviderStatusMap,
  type AiAssistantModelId,
  type AiAssistantProvider,
} from '@eng/shared';
import type {
  AssistantProviderAdapter,
  AssistantProviderCredentialState,
} from './assistant-provider.interface';
import { AnthropicAssistantProvider } from './anthropic-assistant.provider';
import { DeepSeekAssistantProvider } from './deepseek-assistant.provider';
import { GeminiAssistantProvider } from './gemini-assistant.provider';
import { OpenAiAssistantProvider } from './openai-assistant.provider';

@Injectable()
export class AssistantProviderRegistry {
  private readonly providers: Record<AiAssistantProvider, AssistantProviderAdapter>;

  constructor(
    openAiAssistantProvider: OpenAiAssistantProvider,
    anthropicAssistantProvider: AnthropicAssistantProvider,
    geminiAssistantProvider: GeminiAssistantProvider,
    deepSeekAssistantProvider: DeepSeekAssistantProvider,
  ) {
    this.providers = {
      openai: openAiAssistantProvider,
      anthropic: anthropicAssistantProvider,
      gemini: geminiAssistantProvider,
      deepseek: deepSeekAssistantProvider,
    };
  }

  getProvider(
    provider: AiAssistantProvider,
    model?: AiAssistantModelId,
  ): AssistantProviderAdapter {
    const adapter = this.providers[provider];
    if (!adapter) {
      throw new ServiceUnavailableException(
        `Assistant provider "${provider}" is not registered`,
      );
    }

    if (model && !isAiAssistantModelSupportedByProvider(model, provider)) {
      throw new BadRequestException(
        `AI model "${model}" is not supported for assistant provider "${provider}"`,
      );
    }

    return adapter;
  }

  getProviderStatus(
    provider: AiAssistantProvider,
    credentials?: AssistantProviderCredentialState,
  ) {
    return this.getProvider(provider).getProviderStatus(credentials?.[provider]);
  }

  getProviderStatusMap(
    credentials?: AssistantProviderCredentialState,
  ): AiAssistantProviderStatusMap {
    return buildAiAssistantProviderStatusMap(
      Object.fromEntries(
        AI_ASSISTANT_PROVIDER_OPTIONS.map((provider) => [
          provider,
          this.getProviderStatus(provider, credentials),
        ]),
      ) as AiAssistantProviderStatusMap,
    );
  }
}
