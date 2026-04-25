import { Module } from '@nestjs/common';
import { DocumentsModule } from '../documents/documents.module';
import {
  DraftingController,
  DraftingSourceRegistryController,
  ProjectDraftingTransmittalsController,
} from './drafting.controller';
import { DraftingService } from './drafting.service';

@Module({
  imports: [DocumentsModule],
  controllers: [
    DraftingController,
    DraftingSourceRegistryController,
    ProjectDraftingTransmittalsController,
  ],
  providers: [DraftingService],
  exports: [DraftingService],
})
export class DraftingModule {}
