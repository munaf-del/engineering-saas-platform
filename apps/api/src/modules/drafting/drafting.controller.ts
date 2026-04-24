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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, RequestUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { DraftingService } from './drafting.service';
import { CreateDraftingDrawingDto } from './dto/create-drafting-drawing.dto';
import { UpdateDraftingDrawingDto } from './dto/update-drafting-drawing.dto';
import { SaveDraftingModelDto } from './dto/save-drafting-model.dto';
import {
  AttachDraftingTransmittalEvidenceDto,
  UploadDraftingTransmittalEvidenceDto,
} from './dto/transmittal-evidence.dto';
import { SaveProjectDraftingTransmittalDto } from './dto/project-transmittal.dto';

@ApiTags('drafting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/drafting/drawings')
export class DraftingController {
  constructor(private readonly draftingService: DraftingService) {}

  @Get()
  @ApiOperation({ summary: 'List drafting drawings for a project' })
  async listDrawings(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.draftingService.listDrawings(this.access(projectId, user));
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Create a drafting drawing' })
  async createDrawing(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateDraftingDrawingDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.draftingService.createDrawing(this.access(projectId, user), dto);
  }

  @Get(':drawingId')
  @ApiOperation({ summary: 'Get a drafting drawing' })
  async findDrawing(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('drawingId', ParseUUIDPipe) drawingId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.draftingService.findDrawing(this.access(projectId, user), drawingId);
  }

  @Patch(':drawingId')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Update drafting drawing metadata' })
  async updateDrawing(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('drawingId', ParseUUIDPipe) drawingId: string,
    @Body() dto: UpdateDraftingDrawingDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.draftingService.updateDrawing(this.access(projectId, user), drawingId, dto);
  }

  @Put(':drawingId/model')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Save drafting drawing model JSON' })
  async saveModel(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('drawingId', ParseUUIDPipe) drawingId: string,
    @Body() dto: SaveDraftingModelDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.draftingService.saveModel(this.access(projectId, user), drawingId, dto.model);
  }

  @Post(':drawingId/transmittals/:transmittalId/evidence/upload')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload and attach PDF evidence for a drafting transmittal' })
  async uploadTransmittalEvidence(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('drawingId', ParseUUIDPipe) drawingId: string,
    @Param('transmittalId') transmittalId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDraftingTransmittalEvidenceDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.draftingService.uploadTransmittalEvidence(
      this.access(projectId, user),
      drawingId,
      transmittalId,
      dto,
      file,
    );
  }

  @Post(':drawingId/transmittals/:transmittalId/evidence/attach')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Attach an existing project PDF as drafting transmittal evidence' })
  async attachTransmittalEvidence(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('drawingId', ParseUUIDPipe) drawingId: string,
    @Param('transmittalId') transmittalId: string,
    @Body() dto: AttachDraftingTransmittalEvidenceDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.draftingService.attachTransmittalEvidence(
      this.access(projectId, user),
      drawingId,
      transmittalId,
      dto,
    );
  }

  @Delete(':drawingId/transmittals/:transmittalId/evidence')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Remove drafting transmittal PDF evidence metadata' })
  async removeTransmittalEvidence(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('drawingId', ParseUUIDPipe) drawingId: string,
    @Param('transmittalId') transmittalId: string,
    @Body() dto: { notes?: string },
    @CurrentUser() user: RequestUser,
  ) {
    return this.draftingService.removeTransmittalEvidence(
      this.access(projectId, user),
      drawingId,
      transmittalId,
      dto.notes,
    );
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

@ApiTags('drafting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/drafting/transmittals')
export class ProjectDraftingTransmittalsController {
  constructor(private readonly draftingService: DraftingService) {}

  @Get()
  @ApiOperation({ summary: 'List project-level drafting transmittals' })
  async listProjectTransmittals(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.draftingService.listProjectTransmittals(this.access(projectId, user));
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Create a project-level drafting transmittal' })
  async createProjectTransmittal(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: SaveProjectDraftingTransmittalDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.draftingService.createProjectTransmittal(this.access(projectId, user), dto);
  }

  @Get(':transmittalId')
  @ApiOperation({ summary: 'Get a project-level drafting transmittal' })
  async findProjectTransmittal(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('transmittalId', ParseUUIDPipe) transmittalId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.draftingService.findProjectTransmittal(this.access(projectId, user), transmittalId);
  }

  @Put(':transmittalId')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Update a draft project-level drafting transmittal' })
  async updateProjectTransmittal(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('transmittalId', ParseUUIDPipe) transmittalId: string,
    @Body() dto: SaveProjectDraftingTransmittalDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.draftingService.updateProjectTransmittal(
      this.access(projectId, user),
      transmittalId,
      dto,
    );
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
