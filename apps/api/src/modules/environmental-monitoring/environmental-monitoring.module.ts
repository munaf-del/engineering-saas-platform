import { Module } from '@nestjs/common';
import { ProjectEnvironmentalMonitoringController } from './environmental-monitoring.controller';
import { ProjectEnvironmentalMonitoringService } from './environmental-monitoring.service';

@Module({
  controllers: [ProjectEnvironmentalMonitoringController],
  providers: [ProjectEnvironmentalMonitoringService],
})
export class ProjectEnvironmentalMonitoringModule {}
