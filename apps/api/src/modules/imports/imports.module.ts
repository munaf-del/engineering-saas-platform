import { Module } from '@nestjs/common';
import { ImportsController } from './imports.controller';
import { ImportsService } from './imports.service';
import { ImportParserService } from './import-parser.service';
import { ImportValidatorService } from './import-validator.service';
import { ImportTemplatesService } from './import-templates.service';
import { RulePackIngestionService } from './rule-pack-ingestion.service';

@Module({
  controllers: [ImportsController],
  providers: [
    ImportsService,
    ImportParserService,
    ImportValidatorService,
    ImportTemplatesService,
    RulePackIngestionService,
  ],
  exports: [ImportsService, RulePackIngestionService],
})
export class ImportsModule {}
