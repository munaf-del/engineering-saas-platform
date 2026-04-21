import {
  Body,
  Controller,
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
import { DraftingService } from './drafting.service';
import { CreateDraftingDrawingDto } from './dto/create-drafting-drawing.dto';
import { UpdateDraftingDrawingDto } from './dto/update-drafting-drawing.dto';
import { SaveDraftingModelDto } from './dto/save-drafting-model.dto';

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
