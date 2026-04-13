import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PileGroupsModule } from '../pile-groups/pile-groups.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiAgentOrchestrationService } from './agent/ai-agent-orchestration.service';
import { AiDocumentStorageService } from './documents/ai-document-storage.service';
import { AssistantProviderRegistry } from './providers/assistant-provider.registry';
import { OpenAiAssistantProvider } from './providers/openai-assistant.provider';
import { AnthropicAssistantProvider } from './providers/anthropic-assistant.provider';
import { GeminiAssistantProvider } from './providers/gemini-assistant.provider';
import { DeepSeekAssistantProvider } from './providers/deepseek-assistant.provider';
import { OrganisationAiAssistantCredentialStoreService } from '../organisations/organisation-ai-assistant-credential-store.service';

@Module({
  imports: [ConfigModule, PileGroupsModule],
  controllers: [AiController],
  providers: [
    AiService,
    AiAgentOrchestrationService,
    AiDocumentStorageService,
    AssistantProviderRegistry,
    OpenAiAssistantProvider,
    AnthropicAssistantProvider,
    GeminiAssistantProvider,
    DeepSeekAssistantProvider,
    OrganisationAiAssistantCredentialStoreService,
  ],
  exports: [AssistantProviderRegistry],
})
export class AiModule {}
