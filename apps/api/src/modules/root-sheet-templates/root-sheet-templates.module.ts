import { Module } from '@nestjs/common';
import { RootSheetTemplatesController } from './root-sheet-templates.controller';
import { RootSheetTemplatesService } from './root-sheet-templates.service';

@Module({
  controllers: [RootSheetTemplatesController],
  providers: [RootSheetTemplatesService],
})
export class RootSheetTemplatesModule {}

