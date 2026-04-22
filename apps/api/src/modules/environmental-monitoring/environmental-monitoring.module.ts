import { Module } from '@nestjs/common';
import { OmnidotsModule } from '../omnidots/omnidots.module';
import { ProjectEnvironmentalMonitoringController } from './environmental-monitoring.controller';
import { ProjectEnvironmentalMonitoringService } from './environmental-monitoring.service';

@Module({
  imports: [OmnidotsModule],
  controllers: [ProjectEnvironmentalMonitoringController],
  providers: [ProjectEnvironmentalMonitoringService],
})
export class ProjectEnvironmentalMonitoringModule {}
