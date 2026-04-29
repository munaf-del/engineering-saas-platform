import { Module } from '@nestjs/common';
import { ProjectSpatialController } from './project-spatial.controller';
import { ProjectSpatialSheetsController } from './project-spatial-sheets.controller';
import { ProjectSpatialService } from './project-spatial.service';
import { ProjectSpatialViewsController } from './project-spatial-views.controller';

@Module({
  controllers: [
    ProjectSpatialController,
    ProjectSpatialViewsController,
    ProjectSpatialSheetsController,
  ],
  providers: [ProjectSpatialService],
})
export class ProjectSpatialModule {}
