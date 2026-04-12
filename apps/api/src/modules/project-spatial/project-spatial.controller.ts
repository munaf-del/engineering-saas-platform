import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, RequestUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  CreateProjectSpatialFeatureDto,
  ProjectSpatialFeatureFiltersDto,
  UpdateProjectSpatialFeatureDto,
} from './dto/project-spatial.dto';
import { ProjectSpatialService } from './project-spatial.service';

@ApiTags('project-spatial')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/spatial/features')
export class ProjectSpatialController {
  constructor(private readonly projectSpatialService: ProjectSpatialService) {}

  @Get()
  @ApiOperation({ summary: 'List project spatial features' })
  async listFeatures(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: ProjectSpatialFeatureFiltersDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectSpatialService.listFeatures(this.access(projectId, user), query);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Create a project spatial feature' })
  async createFeature(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateProjectSpatialFeatureDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectSpatialService.createFeature(this.access(projectId, user), dto);
  }

  @Get(':featureId')
  @ApiOperation({ summary: 'Get a project spatial feature' })
  async findFeature(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('featureId', ParseUUIDPipe) featureId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectSpatialService.findFeature(this.access(projectId, user), featureId);
  }

  @Patch(':featureId')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Update a project spatial feature' })
  async updateFeature(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('featureId', ParseUUIDPipe) featureId: string,
    @Body() dto: UpdateProjectSpatialFeatureDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectSpatialService.updateFeature(this.access(projectId, user), featureId, dto);
  }

  @Delete(':featureId')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Delete a project spatial feature' })
  async deleteFeature(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('featureId', ParseUUIDPipe) featureId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectSpatialService.deleteFeature(this.access(projectId, user), featureId);
  }

  private access(projectId: string, user: RequestUser) {
    if (!user.organisationId) {
      throw new Error('Authenticated user has no organisation');
    }

    return {
      projectId,
      organisationId: user.organisationId,
      userId: user.id,
      orgRole: user.orgRole,
    };
  }
}

