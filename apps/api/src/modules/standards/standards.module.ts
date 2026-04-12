import { Module } from '@nestjs/common';
import { StandardsController } from './standards.controller';
import { StandardsService } from './standards.service';
import { NoiseVibrationStandardsController } from './noise-vibration/noise-vibration-standards.controller';
import { NoiseVibrationStandardsService } from './noise-vibration/noise-vibration-standards.service';

@Module({
  controllers: [StandardsController, NoiseVibrationStandardsController],
  providers: [StandardsService, NoiseVibrationStandardsService],
  exports: [StandardsService, NoiseVibrationStandardsService],
})
export class StandardsModule {}
