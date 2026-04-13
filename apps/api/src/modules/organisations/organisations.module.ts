import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { OrganisationsController } from './organisations.controller';
import { OrganisationAiAssistantCredentialStoreService } from './organisation-ai-assistant-credential-store.service';
import { OrganisationsService } from './organisations.service';

@Module({
  imports: [AiModule],
  controllers: [OrganisationsController],
  providers: [OrganisationsService, OrganisationAiAssistantCredentialStoreService],
  exports: [OrganisationsService],
})
export class OrganisationsModule {}
