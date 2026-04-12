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
  CreateProjectWasteClassificationChecklistItemDto,
  CreateProjectWasteClassificationLabResultDto,
  CreateProjectWasteClassificationMaterialPathwayDto,
  CreateProjectWasteClassificationRecommendationDto,
  CreateProjectWasteClassificationReferenceDto,
  CreateProjectWasteClassificationRelatedPathwayDto,
  CreateProjectWasteClassificationReportDto,
  CreateProjectWasteClassificationStepDecisionDto,
  UpdateProjectWasteClassificationChecklistItemDto,
  UpdateProjectWasteClassificationLabResultDto,
  UpdateProjectWasteClassificationMaterialPathwayDto,
  UpdateProjectWasteClassificationRecommendationDto,
  UpdateProjectWasteClassificationReferenceDto,
  UpdateProjectWasteClassificationRelatedPathwayDto,
  UpdateProjectWasteClassificationReportDto,
  UpdateProjectWasteClassificationStepDecisionDto,
  GenerateProjectWasteClassificationDraftRecommendationDto,
} from './dto/waste-classification.dto';
import { ProjectWasteClassificationService } from './waste-classification.service';

@ApiTags('project-waste-classification')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/environmental/waste-classification')
export class ProjectWasteClassificationController {
  constructor(
    private readonly projectWasteClassificationService: ProjectWasteClassificationService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List waste classification reports for a project' })
  async listForProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectWasteClassificationService.listForProject(this.access(projectId, user));
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Create a new waste classification report for a project' })
  async createReport(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateProjectWasteClassificationReportDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectWasteClassificationService.createReport(this.access(projectId, user), dto);
  }

  @Get(':reportId')
  @ApiOperation({ summary: 'Get a waste classification report' })
  async findReport(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectWasteClassificationService.findReport(
      this.access(projectId, user),
      reportId,
    );
  }

  @Put(':reportId')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Save the waste classification report document fields' })
  async updateReport(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Body() dto: UpdateProjectWasteClassificationReportDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectWasteClassificationService.updateReport(
      this.access(projectId, user),
      reportId,
      dto,
    );
  }

  @Delete(':reportId')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Delete a waste classification report' })
  async deleteReport(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectWasteClassificationService.deleteReport(
      this.access(projectId, user),
      reportId,
    );
  }

  @Post(':reportId/references')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Add a linked reference to a waste classification report' })
  async createReference(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Body() dto: CreateProjectWasteClassificationReferenceDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectWasteClassificationService.createReference(
      this.access(projectId, user),
      reportId,
      dto,
    );
  }

  @Patch(':reportId/references/:id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Update a linked reference on a waste classification report' })
  async updateReference(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectWasteClassificationReferenceDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectWasteClassificationService.updateReference(
      this.access(projectId, user),
      reportId,
      id,
      dto,
    );
  }

  @Delete(':reportId/references/:id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Delete a linked reference from a waste classification report' })
  async deleteReference(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectWasteClassificationService.deleteReference(
      this.access(projectId, user),
      reportId,
      id,
    );
  }

  @Post(':reportId/step-decisions')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Add a step decision to a waste classification report' })
  async createStepDecision(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Body() dto: CreateProjectWasteClassificationStepDecisionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectWasteClassificationService.createStepDecision(
      this.access(projectId, user),
      reportId,
      dto,
    );
  }

  @Patch(':reportId/step-decisions/:id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Update a step decision on a waste classification report' })
  async updateStepDecision(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectWasteClassificationStepDecisionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectWasteClassificationService.updateStepDecision(
      this.access(projectId, user),
      reportId,
      id,
      dto,
    );
  }

  @Delete(':reportId/step-decisions/:id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Delete a step decision from a waste classification report' })
  async deleteStepDecision(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectWasteClassificationService.deleteStepDecision(
      this.access(projectId, user),
      reportId,
      id,
    );
  }

  @Post(':reportId/step-decisions/:stepDecisionId/checklist-items')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Add a checklist item to a waste classification step decision' })
  async createChecklistItem(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Param('stepDecisionId', ParseUUIDPipe) stepDecisionId: string,
    @Body() dto: CreateProjectWasteClassificationChecklistItemDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectWasteClassificationService.createChecklistItem(
      this.access(projectId, user),
      reportId,
      stepDecisionId,
      dto,
    );
  }

  @Patch(':reportId/step-decisions/:stepDecisionId/checklist-items/:id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Update a checklist item on a waste classification step decision' })
  async updateChecklistItem(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Param('stepDecisionId', ParseUUIDPipe) stepDecisionId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectWasteClassificationChecklistItemDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectWasteClassificationService.updateChecklistItem(
      this.access(projectId, user),
      reportId,
      stepDecisionId,
      id,
      dto,
    );
  }

  @Delete(':reportId/step-decisions/:stepDecisionId/checklist-items/:id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Delete a checklist item from a waste classification step decision' })
  async deleteChecklistItem(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Param('stepDecisionId', ParseUUIDPipe) stepDecisionId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectWasteClassificationService.deleteChecklistItem(
      this.access(projectId, user),
      reportId,
      stepDecisionId,
      id,
    );
  }

  @Post(':reportId/lab-results')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Add a lab result row to a waste classification report' })
  async createLabResult(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Body() dto: CreateProjectWasteClassificationLabResultDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectWasteClassificationService.createLabResult(
      this.access(projectId, user),
      reportId,
      dto,
    );
  }

  @Patch(':reportId/lab-results/:id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Update a lab result row on a waste classification report' })
  async updateLabResult(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectWasteClassificationLabResultDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectWasteClassificationService.updateLabResult(
      this.access(projectId, user),
      reportId,
      id,
      dto,
    );
  }

  @Delete(':reportId/lab-results/:id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Delete a lab result row from a waste classification report' })
  async deleteLabResult(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectWasteClassificationService.deleteLabResult(
      this.access(projectId, user),
      reportId,
      id,
    );
  }

  @Post(':reportId/recommendations')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Add a recommendation to a waste classification report' })
  async createRecommendation(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Body() dto: CreateProjectWasteClassificationRecommendationDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectWasteClassificationService.createRecommendation(
      this.access(projectId, user),
      reportId,
      dto,
    );
  }

  @Patch(':reportId/recommendations/:id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Update a recommendation on a waste classification report' })
  async updateRecommendation(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectWasteClassificationRecommendationDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectWasteClassificationService.updateRecommendation(
      this.access(projectId, user),
      reportId,
      id,
      dto,
    );
  }

  @Delete(':reportId/recommendations/:id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Delete a recommendation from a waste classification report' })
  async deleteRecommendation(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectWasteClassificationService.deleteRecommendation(
      this.access(projectId, user),
      reportId,
      id,
    );
  }

  @Post(':reportId/material-pathways')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Add a material / reuse pathway to a waste classification report' })
  async createMaterialPathway(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Body() dto: CreateProjectWasteClassificationMaterialPathwayDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectWasteClassificationService.createMaterialPathway(
      this.access(projectId, user),
      reportId,
      dto,
    );
  }

  @Patch(':reportId/material-pathways/:id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Update a material / reuse pathway on a waste classification report' })
  async updateMaterialPathway(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectWasteClassificationMaterialPathwayDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectWasteClassificationService.updateMaterialPathway(
      this.access(projectId, user),
      reportId,
      id,
      dto,
    );
  }

  @Post(':reportId/material-pathways/:id/ass-autofill')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({
    summary:
      'Return a draft Acid Sulfate Soils class autofill result using the NSW Planning Portal layer',
  })
  async autofillAssMaterialPathway(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectWasteClassificationService.autofillAssMaterialPathway(
      this.access(projectId, user),
      reportId,
      id,
    );
  }

  @Post(':reportId/draft-recommendation')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({
    summary:
      'Return a draft disposal / management recommendation helper without mutating the report',
  })
  async generateDraftRecommendation(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Body() dto: GenerateProjectWasteClassificationDraftRecommendationDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectWasteClassificationService.generateDraftRecommendation(
      this.access(projectId, user),
      reportId,
      dto,
    );
  }

  @Post(':reportId/related-pathways')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Add a related pathway to a waste classification report' })
  async createRelatedPathway(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Body() dto: CreateProjectWasteClassificationRelatedPathwayDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectWasteClassificationService.createRelatedPathway(
      this.access(projectId, user),
      reportId,
      dto,
    );
  }

  @Patch(':reportId/related-pathways/:id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Update a related pathway on a waste classification report' })
  async updateRelatedPathway(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectWasteClassificationRelatedPathwayDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectWasteClassificationService.updateRelatedPathway(
      this.access(projectId, user),
      reportId,
      id,
      dto,
    );
  }

  @Delete(':reportId/related-pathways/:id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Delete a related pathway from a waste classification report' })
  async deleteRelatedPathway(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectWasteClassificationService.deleteRelatedPathway(
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
