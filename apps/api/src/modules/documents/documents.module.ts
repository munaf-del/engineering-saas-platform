import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentStorageService } from './document-storage.service';
import { DocumentsService } from './documents.service';

@Module({
  controllers: [DocumentsController],
  providers: [DocumentsService, DocumentStorageService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
