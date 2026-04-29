import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, RequestUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  CreateProjectSpatialViewDto,
  UpdateProjectSpatialViewDto,
} from './dto/project-spatial.dto';
import { ProjectSpatialService } from './project-spatial.service';

@ApiTags('project-spatial')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/spatial/views')
export class ProjectSpatialViewsController {
  constructor(private readonly projectSpatialService: ProjectSpatialService) {}

  @Get()
  @ApiOperation({ summary: 'List Project Spatial Views' })
  async listViews(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectSpatialService.listViews(this.access(projectId, user));
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Create a Project Spatial View' })
  async createView(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateProjectSpatialViewDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectSpatialService.createView(this.access(projectId, user), dto);
  }

  @Patch(':viewId')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Update a Project Spatial View' })
  async updateView(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('viewId', ParseUUIDPipe) viewId: string,
    @Body() dto: UpdateProjectSpatialViewDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectSpatialService.updateView(this.access(projectId, user), viewId, dto);
  }

  @Delete(':viewId')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Delete a Project Spatial View' })
  async deleteView(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('viewId', ParseUUIDPipe) viewId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectSpatialService.deleteView(this.access(projectId, user), viewId);
  }

  private access(projectId: string, user: RequestUser) {
    if (!user.organisationId) {
      throw new Error('Authenticated user has no organisation');
    }

    return {
      organisationId: user.organisationId,
      orgRole: user.orgRole,
      projectId,
      userId: user.id,
    };
  }
}
