import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { ProjectRolesGuard } from '../auth/guards/project-role.guard';

@Module({
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectRolesGuard],
  exports: [ProjectsService],
})
export class ProjectsModule {}
