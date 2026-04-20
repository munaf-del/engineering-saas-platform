import { Module } from '@nestjs/common';
import { ProjectSpatialController } from './project-spatial.controller';
import { ProjectSpatialService } from './project-spatial.service';

@Module({
  controllers: [ProjectSpatialController],
  providers: [ProjectSpatialService],
})
export class ProjectSpatialModule {}
