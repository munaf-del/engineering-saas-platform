import { Module } from '@nestjs/common';
import { CalculationsController } from './calculations.controller';
import { CalculationsService } from './calculations.service';
import { OrchestrationService } from './orchestration.service';
import { SnapshotService } from './snapshot.service';
import { CalcEngineClient } from './calc-engine.client';

@Module({
  controllers: [CalculationsController],
  providers: [
    CalculationsService,
    OrchestrationService,
    SnapshotService,
    CalcEngineClient,
  ],
  exports: [CalculationsService, OrchestrationService, SnapshotService],
})
export class CalculationsModule {}
