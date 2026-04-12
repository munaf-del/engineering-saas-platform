import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PileGroupsModule } from '../pile-groups/pile-groups.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiAgentOrchestrationService } from './agent/ai-agent-orchestration.service';
import { AiDocumentStorageService } from './documents/ai-document-storage.service';

@Module({
  imports: [ConfigModule, PileGroupsModule],
  controllers: [AiController],
  providers: [AiService, AiAgentOrchestrationService, AiDocumentStorageService],
})
export class AiModule {}
