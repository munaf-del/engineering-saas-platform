import { Module } from '@nestjs/common';
import { DocumentsModule } from '../documents/documents.module';
import { DraftingController, ProjectDraftingTransmittalsController } from './drafting.controller';
import { DraftingService } from './drafting.service';

@Module({
  imports: [DocumentsModule],
  controllers: [DraftingController, ProjectDraftingTransmittalsController],
  providers: [DraftingService],
  exports: [DraftingService],
})
export class DraftingModule {}
