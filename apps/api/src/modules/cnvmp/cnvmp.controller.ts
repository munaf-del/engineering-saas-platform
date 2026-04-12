import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, RequestUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ProjectCnvmpService } from './cnvmp.service';
import {
  CreateProjectCnvmpActivityDto,
  CreateProjectCnvmpMitigationMeasureDto,
  CreateProjectCnvmpMonitoringRowDto,
  CreateProjectCnvmpReceiverDto,
  CreateProjectCnvmpReferenceDto,
  CreateProjectCnvmpSelectedCriterionDto,
  CreateProjectCnvmpSelectedSourceDto,
  UpdateProjectCnvmpActivityDto,
  UpdateProjectCnvmpDto,
  UpdateProjectCnvmpMitigationMeasureDto,
  UpdateProjectCnvmpMonitoringRowDto,
  UpdateProjectCnvmpReceiverDto,
  UpdateProjectCnvmpReferenceDto,
  UpdateProjectCnvmpSelectedCriterionDto,
  UpdateProjectCnvmpSelectedSourceDto,
} from './dto/cnvmp.dto';

@ApiTags('project-cnvmp')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/cnvmp')
export class ProjectCnvmpController {
  constructor(private readonly projectCnvmpService: ProjectCnvmpService) {}

  @Get()
  @ApiOperation({ summary: 'Get or create the project CNVMP builder workspace' })
  async findForProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectCnvmpService.findForProject(this.access(projectId, user));
  }

  @Put()
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Save the project CNVMP document setup and authored text sections' })
  async updateForProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: UpdateProjectCnvmpDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectCnvmpService.updateForProject(this.access(projectId, user), dto);
  }

  @Post('references')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Add a source document/reference link to the project CNVMP' })
  async createReference(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateProjectCnvmpReferenceDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectCnvmpService.createReference(this.access(projectId, user), dto);
  }

  @Patch('references/:id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Update a project CNVMP source document/reference link' })
  async updateReference(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectCnvmpReferenceDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectCnvmpService.updateReference(this.access(projectId, user), id, dto);
  }

  @Delete('references/:id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Delete a project CNVMP source document/reference link' })
  async deleteReference(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectCnvmpService.deleteReference(this.access(projectId, user), id);
  }

  @Post('receivers')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Add a receiver to the project CNVMP receiver register' })
  async createReceiver(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateProjectCnvmpReceiverDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectCnvmpService.createReceiver(this.access(projectId, user), dto);
  }

  @Patch('receivers/:id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Update a project CNVMP receiver row' })
  async updateReceiver(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectCnvmpReceiverDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectCnvmpService.updateReceiver(this.access(projectId, user), id, dto);
  }

  @Delete('receivers/:id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Delete a project CNVMP receiver row' })
  async deleteReceiver(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectCnvmpService.deleteReceiver(this.access(projectId, user), id);
  }

  @Post('activities')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Add a project CNVMP construction activity row' })
  async createActivity(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateProjectCnvmpActivityDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectCnvmpService.createActivity(this.access(projectId, user), dto);
  }

  @Patch('activities/:id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Update a project CNVMP construction activity row' })
  async updateActivity(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectCnvmpActivityDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectCnvmpService.updateActivity(this.access(projectId, user), id, dto);
  }

  @Delete('activities/:id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Delete a project CNVMP construction activity row' })
  async deleteActivity(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectCnvmpService.deleteActivity(this.access(projectId, user), id);
  }

  @Post('sources')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Select an applicable standards source for the project CNVMP' })
  async createSelectedSource(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateProjectCnvmpSelectedSourceDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectCnvmpService.createSelectedSource(this.access(projectId, user), dto);
  }

  @Patch('sources/:id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Update an applicable standards source selection' })
  async updateSelectedSource(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectCnvmpSelectedSourceDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectCnvmpService.updateSelectedSource(this.access(projectId, user), id, dto);
  }

  @Delete('sources/:id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Delete an applicable standards source selection' })
  async deleteSelectedSource(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectCnvmpService.deleteSelectedSource(this.access(projectId, user), id);
  }

  @Post('selected-criteria')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Select a criterion row for the project CNVMP' })
  async createSelectedCriterion(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateProjectCnvmpSelectedCriterionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectCnvmpService.createSelectedCriterion(this.access(projectId, user), dto);
  }

  @Patch('selected-criteria/:id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Update a selected criterion row for the project CNVMP' })
  async updateSelectedCriterion(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectCnvmpSelectedCriterionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectCnvmpService.updateSelectedCriterion(this.access(projectId, user), id, dto);
  }

  @Delete('selected-criteria/:id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Delete a selected criterion row from the project CNVMP' })
  async deleteSelectedCriterion(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectCnvmpService.deleteSelectedCriterion(this.access(projectId, user), id);
  }

  @Post('mitigation-measures')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Add a project CNVMP mitigation/management measure row' })
  async createMitigationMeasure(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateProjectCnvmpMitigationMeasureDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectCnvmpService.createMitigationMeasure(this.access(projectId, user), dto);
  }

  @Patch('mitigation-measures/:id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Update a project CNVMP mitigation/management measure row' })
  async updateMitigationMeasure(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectCnvmpMitigationMeasureDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectCnvmpService.updateMitigationMeasure(this.access(projectId, user), id, dto);
  }

  @Delete('mitigation-measures/:id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Delete a project CNVMP mitigation/management measure row' })
  async deleteMitigationMeasure(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectCnvmpService.deleteMitigationMeasure(this.access(projectId, user), id);
  }

  @Post('monitoring-rows')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Add a project CNVMP monitoring/reporting plan row' })
  async createMonitoringRow(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateProjectCnvmpMonitoringRowDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectCnvmpService.createMonitoringRow(this.access(projectId, user), dto);
  }

  @Patch('monitoring-rows/:id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Update a project CNVMP monitoring/reporting plan row' })
  async updateMonitoringRow(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectCnvmpMonitoringRowDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectCnvmpService.updateMonitoringRow(this.access(projectId, user), id, dto);
  }

  @Delete('monitoring-rows/:id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Delete a project CNVMP monitoring/reporting plan row' })
  async deleteMonitoringRow(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectCnvmpService.deleteMonitoringRow(this.access(projectId, user), id);
  }

  private access(projectId: string, user: RequestUser) {
    if (!user.organisationId) {
      throw new ForbiddenException('Organisation context required');
    }
    return {
      projectId,
      organisationId: user.organisationId,
      userId: user.id,
      orgRole: user.orgRole,
    };
  }
}
