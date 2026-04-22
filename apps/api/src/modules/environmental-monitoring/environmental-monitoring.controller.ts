import {
  Body,
  Controller,
  Delete,
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
import {
  CreateProjectEnvironmentalMonitoringLocationDto,
  CreateProjectEnvironmentalMonitoringAnnexureDto,
  CreateProjectEnvironmentalMonitoringObservationDto,
  CreateProjectEnvironmentalMonitoringReportPackageIssueDto,
  CreateProjectEnvironmentalMonitoringRecommendationDto,
  CreateProjectEnvironmentalMonitoringReferenceDto,
  CreateProjectEnvironmentalMonitoringReportDto,
  CreateProjectEnvironmentalMonitoringSelectedCriterionDto,
  CreateProjectEnvironmentalNoiseResultRowDto,
  CreateProjectEnvironmentalVibrationResultRowDto,
  ImportProjectEnvironmentalMonitoringLocationsFromViewDto,
  ReorderProjectEnvironmentalMonitoringAnnexuresDto,
  UpdateProjectEnvironmentalMonitoringLocationDto,
  UpdateProjectEnvironmentalMonitoringAnnexureDto,
  UpdateProjectEnvironmentalMonitoringObservationDto,
  UpdateProjectEnvironmentalMonitoringRecommendationDto,
  UpdateProjectEnvironmentalMonitoringReferenceDto,
  UpdateProjectEnvironmentalMonitoringReportDto,
  UpdateProjectEnvironmentalMonitoringSelectedCriterionDto,
  UpdateProjectEnvironmentalNoiseResultRowDto,
  UpdateProjectEnvironmentalVibrationResultRowDto,
} from './dto/environmental-monitoring.dto';
import {
  CreateOmnidotsProviderConnectionDto,
  UpdateOmnidotsProviderConnectionDto,
} from '../omnidots/dto/omnidots-connection.dto';
import {
  CreateProjectEnvironmentalMonitoringVibrationResultsFromOmnidotsDatasetDto,
  ProjectEnvironmentalMonitoringOmnidotsBuildDatasetDto,
  ProjectEnvironmentalMonitoringOmnidotsImportDto,
} from './dto/environmental-monitoring-omnidots.dto';
import { ProjectEnvironmentalMonitoringService } from './environmental-monitoring.service';

@ApiTags('project-environmental-monitoring')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/environmental/monitoring')
export class ProjectEnvironmentalMonitoringController {
  constructor(
    private readonly projectEnvironmentalMonitoringService: ProjectEnvironmentalMonitoringService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List environmental monitoring reports for a project' })
  async listForProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectEnvironmentalMonitoringService.listForProject(this.access(projectId, user));
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Create a new environmental monitoring report for a project' })
  async createReport(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateProjectEnvironmentalMonitoringReportDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectEnvironmentalMonitoringService.createReport(
      this.access(projectId, user),
      dto,
    );
  }

  @Post(':reportId/duplicate')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Duplicate an environmental monitoring report' })
  async duplicateReport(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectEnvironmentalMonitoringService.duplicateReport(
      this.access(projectId, user),
      reportId,
    );
  }

  @Get(':reportId')
  @ApiOperation({ summary: 'Get an environmental monitoring report' })
  async findReport(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectEnvironmentalMonitoringService.findReport(
      this.access(projectId, user),
      reportId,
    );
  }

  @Get(':reportId/omnidots/connections')
  @ApiOperation({
    summary: 'List Omnidots connections available to a vibration monitoring report',
  })
  async listOmnidotsConnections(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectEnvironmentalMonitoringService.listOmnidotsConnections(
      this.access(projectId, user),
      reportId,
    );
  }

  @Post(':reportId/omnidots/connections')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({
    summary: 'Create an Omnidots connection from the vibration monitoring report workflow',
  })
  async createOmnidotsConnection(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Body() dto: CreateOmnidotsProviderConnectionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectEnvironmentalMonitoringService.createOmnidotsConnection(
      this.access(projectId, user),
      reportId,
      dto,
    );
  }

  @Patch(':reportId/omnidots/connections/:connectionId')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({
    summary: 'Update an Omnidots connection from the vibration monitoring report workflow',
  })
  async updateOmnidotsConnection(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Param('connectionId', ParseUUIDPipe) connectionId: string,
    @Body() dto: UpdateOmnidotsProviderConnectionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectEnvironmentalMonitoringService.updateOmnidotsConnection(
      this.access(projectId, user),
      reportId,
      connectionId,
      dto,
    );
  }

  @Post(':reportId/omnidots/connections/:connectionId/validate')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({
    summary: 'Validate an Omnidots connection from the vibration monitoring report workflow',
  })
  async validateOmnidotsConnection(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Param('connectionId', ParseUUIDPipe) connectionId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectEnvironmentalMonitoringService.validateOmnidotsConnection(
      this.access(projectId, user),
      reportId,
      connectionId,
    );
  }

  @Post(':reportId/omnidots/connections/:connectionId/sync-measuring-points')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({
    summary: 'Sync Omnidots measuring points from the vibration monitoring report workflow',
  })
  async syncOmnidotsMeasuringPoints(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Param('connectionId', ParseUUIDPipe) connectionId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectEnvironmentalMonitoringService.syncOmnidotsMeasuringPoints(
      this.access(projectId, user),
      reportId,
      connectionId,
    );
  }

  @Get(':reportId/omnidots/connections/:connectionId/measuring-points')
  @ApiOperation({
    summary: 'List synced Omnidots measuring points for a vibration monitoring report connection',
  })
  async listOmnidotsMeasuringPoints(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Param('connectionId', ParseUUIDPipe) connectionId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectEnvironmentalMonitoringService.listOmnidotsMeasuringPoints(
      this.access(projectId, user),
      reportId,
      connectionId,
    );
  }

  @Post(':reportId/omnidots/import')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({
    summary: 'Import Omnidots metrics into monitoring series for a vibration monitoring report',
  })
  async importOmnidotsData(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Body() dto: ProjectEnvironmentalMonitoringOmnidotsImportDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectEnvironmentalMonitoringService.importOmnidotsData(
      this.access(projectId, user),
      reportId,
      dto,
    );
  }

  @Post(':reportId/omnidots/build-dataset')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({
    summary:
      'Build or refresh a frozen Omnidots dataset snapshot for a vibration monitoring report',
  })
  async buildOmnidotsDataset(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Body() dto: ProjectEnvironmentalMonitoringOmnidotsBuildDatasetDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectEnvironmentalMonitoringService.buildOmnidotsDataset(
      this.access(projectId, user),
      reportId,
      dto,
    );
  }

  @Post(':reportId/omnidots/create-vibration-results')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({
    summary:
      'Create authored vibration result rows from a frozen Omnidots dataset summary only after explicit confirmation',
  })
  async createVibrationResultsFromOmnidotsDataset(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Body() dto: CreateProjectEnvironmentalMonitoringVibrationResultsFromOmnidotsDatasetDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectEnvironmentalMonitoringService.createVibrationResultsFromOmnidotsDataset(
      this.access(projectId, user),
      reportId,
      dto,
    );
  }

  @Put(':reportId')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Save the environmental monitoring report document fields' })
  async updateReport(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Body() dto: UpdateProjectEnvironmentalMonitoringReportDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectEnvironmentalMonitoringService.updateReport(
      this.access(projectId, user),
      reportId,
      dto,
    );
  }

  @Delete(':reportId')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Delete an environmental monitoring report' })
  async deleteReport(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectEnvironmentalMonitoringService.deleteReport(
      this.access(projectId, user),
      reportId,
    );
  }

  @Post(':reportId/package-issues')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Create a frozen report package issue snapshot' })
  async createPackageIssue(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Body() dto: CreateProjectEnvironmentalMonitoringReportPackageIssueDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectEnvironmentalMonitoringService.createPackageIssue(
      this.access(projectId, user),
      reportId,
      dto,
    );
  }

  @Get(':reportId/package-issues/:issueId')
  @ApiOperation({ summary: 'Get a frozen report package issue snapshot' })
  async findPackageIssue(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Param('issueId', ParseUUIDPipe) issueId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectEnvironmentalMonitoringService.findPackageIssue(
      this.access(projectId, user),
      reportId,
      issueId,
    );
  }

  @Post(':reportId/annexures')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Add an annexure to an environmental monitoring report' })
  async createAnnexure(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Body() dto: CreateProjectEnvironmentalMonitoringAnnexureDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectEnvironmentalMonitoringService.createAnnexure(
      this.access(projectId, user),
      reportId,
      dto,
    );
  }

  @Put(':reportId/annexures/reorder')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Reorder annexures on an environmental monitoring report' })
  async reorderAnnexures(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Body() dto: ReorderProjectEnvironmentalMonitoringAnnexuresDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectEnvironmentalMonitoringService.reorderAnnexures(
      this.access(projectId, user),
      reportId,
      dto,
    );
  }

  @Patch(':reportId/annexures/:id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Update an annexure on an environmental monitoring report' })
  async updateAnnexure(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectEnvironmentalMonitoringAnnexureDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectEnvironmentalMonitoringService.updateAnnexure(
      this.access(projectId, user),
      reportId,
      id,
      dto,
    );
  }

  @Delete(':reportId/annexures/:id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Delete an annexure from an environmental monitoring report' })
  async deleteAnnexure(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectEnvironmentalMonitoringService.deleteAnnexure(
      this.access(projectId, user),
      reportId,
      id,
    );
  }

  @Post(':reportId/references')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Add a linked reference to an environmental monitoring report' })
  async createReference(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Body() dto: CreateProjectEnvironmentalMonitoringReferenceDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectEnvironmentalMonitoringService.createReference(
      this.access(projectId, user),
      reportId,
      dto,
    );
  }

  @Patch(':reportId/references/:id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Update a linked reference on an environmental monitoring report' })
  async updateReference(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectEnvironmentalMonitoringReferenceDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectEnvironmentalMonitoringService.updateReference(
      this.access(projectId, user),
      reportId,
      id,
      dto,
    );
  }

  @Delete(':reportId/references/:id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Delete a linked reference from an environmental monitoring report' })
  async deleteReference(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectEnvironmentalMonitoringService.deleteReference(
      this.access(projectId, user),
      reportId,
      id,
    );
  }

  @Post(':reportId/locations')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Add a monitoring location to an environmental monitoring report' })
  async createLocation(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Body() dto: CreateProjectEnvironmentalMonitoringLocationDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectEnvironmentalMonitoringService.createLocation(
      this.access(projectId, user),
      reportId,
      dto,
    );
  }

  @Patch(':reportId/locations/:id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Update a monitoring location on an environmental monitoring report' })
  async updateLocation(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectEnvironmentalMonitoringLocationDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectEnvironmentalMonitoringService.updateLocation(
      this.access(projectId, user),
      reportId,
      id,
      dto,
    );
  }

  @Delete(':reportId/locations/:id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Delete a monitoring location from an environmental monitoring report' })
  async deleteLocation(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectEnvironmentalMonitoringService.deleteLocation(
      this.access(projectId, user),
      reportId,
      id,
    );
  }

  @Post(':reportId/locations/import-from-view')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({
    summary: 'Import or refresh monitoring locations from a Project Spatial View',
  })
  async importLocationsFromView(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Body() dto: ImportProjectEnvironmentalMonitoringLocationsFromViewDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectEnvironmentalMonitoringService.importLocationsFromView(
      this.access(projectId, user),
      reportId,
      dto,
    );
  }

  @Post(':reportId/selected-criteria')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Select a standards criterion for an environmental monitoring report' })
  async createSelectedCriterion(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Body() dto: CreateProjectEnvironmentalMonitoringSelectedCriterionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectEnvironmentalMonitoringService.createSelectedCriterion(
      this.access(projectId, user),
      reportId,
      dto,
    );
  }

  @Patch(':reportId/selected-criteria/:id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({
    summary: 'Update a selected standards criterion on an environmental monitoring report',
  })
  async updateSelectedCriterion(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectEnvironmentalMonitoringSelectedCriterionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectEnvironmentalMonitoringService.updateSelectedCriterion(
      this.access(projectId, user),
      reportId,
      id,
      dto,
    );
  }

  @Delete(':reportId/selected-criteria/:id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({
    summary: 'Delete a selected standards criterion from an environmental monitoring report',
  })
  async deleteSelectedCriterion(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectEnvironmentalMonitoringService.deleteSelectedCriterion(
      this.access(projectId, user),
      reportId,
      id,
    );
  }

  @Post(':reportId/noise-results')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Add a noise result row to a noise monitoring report' })
  async createNoiseResult(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Body() dto: CreateProjectEnvironmentalNoiseResultRowDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectEnvironmentalMonitoringService.createNoiseResult(
      this.access(projectId, user),
      reportId,
      dto,
    );
  }

  @Patch(':reportId/noise-results/:id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Update a noise result row on a noise monitoring report' })
  async updateNoiseResult(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectEnvironmentalNoiseResultRowDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectEnvironmentalMonitoringService.updateNoiseResult(
      this.access(projectId, user),
      reportId,
      id,
      dto,
    );
  }

  @Delete(':reportId/noise-results/:id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Delete a noise result row from a noise monitoring report' })
  async deleteNoiseResult(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectEnvironmentalMonitoringService.deleteNoiseResult(
      this.access(projectId, user),
      reportId,
      id,
    );
  }

  @Post(':reportId/vibration-results')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Add a vibration result row to a vibration monitoring report' })
  async createVibrationResult(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Body() dto: CreateProjectEnvironmentalVibrationResultRowDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectEnvironmentalMonitoringService.createVibrationResult(
      this.access(projectId, user),
      reportId,
      dto,
    );
  }

  @Patch(':reportId/vibration-results/:id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Update a vibration result row on a vibration monitoring report' })
  async updateVibrationResult(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectEnvironmentalVibrationResultRowDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectEnvironmentalMonitoringService.updateVibrationResult(
      this.access(projectId, user),
      reportId,
      id,
      dto,
    );
  }

  @Delete(':reportId/vibration-results/:id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Delete a vibration result row from a vibration monitoring report' })
  async deleteVibrationResult(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectEnvironmentalMonitoringService.deleteVibrationResult(
      this.access(projectId, user),
      reportId,
      id,
    );
  }

  @Post(':reportId/observations')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Add an observation to an environmental monitoring report' })
  async createObservation(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Body() dto: CreateProjectEnvironmentalMonitoringObservationDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectEnvironmentalMonitoringService.createObservation(
      this.access(projectId, user),
      reportId,
      dto,
    );
  }

  @Patch(':reportId/observations/:id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Update an observation on an environmental monitoring report' })
  async updateObservation(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectEnvironmentalMonitoringObservationDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectEnvironmentalMonitoringService.updateObservation(
      this.access(projectId, user),
      reportId,
      id,
      dto,
    );
  }

  @Delete(':reportId/observations/:id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Delete an observation from an environmental monitoring report' })
  async deleteObservation(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectEnvironmentalMonitoringService.deleteObservation(
      this.access(projectId, user),
      reportId,
      id,
    );
  }

  @Post(':reportId/recommendations')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Add a recommendation to an environmental monitoring report' })
  async createRecommendation(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Body() dto: CreateProjectEnvironmentalMonitoringRecommendationDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectEnvironmentalMonitoringService.createRecommendation(
      this.access(projectId, user),
      reportId,
      dto,
    );
  }

  @Patch(':reportId/recommendations/:id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Update a recommendation on an environmental monitoring report' })
  async updateRecommendation(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectEnvironmentalMonitoringRecommendationDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectEnvironmentalMonitoringService.updateRecommendation(
      this.access(projectId, user),
      reportId,
      id,
      dto,
    );
  }

  @Delete(':reportId/recommendations/:id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Delete a recommendation from an environmental monitoring report' })
  async deleteRecommendation(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectEnvironmentalMonitoringService.deleteRecommendation(
      this.access(projectId, user),
      reportId,
      id,
    );
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
