import { Module } from '@nestjs/common';
import { ProjectWasteClassificationController } from './waste-classification.controller';
import { NswAssAutofillService } from './nsw-ass-autofill.service';
import { ProjectWasteClassificationService } from './waste-classification.service';

@Module({
  controllers: [ProjectWasteClassificationController],
  providers: [ProjectWasteClassificationService, NswAssAutofillService],
})
export class ProjectWasteClassificationModule {}
