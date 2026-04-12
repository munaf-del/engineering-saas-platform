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
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PileGroupsService } from './pile-groups.service';
import { MultiPileService } from './multi-pile.service';
import { CreatePileGroupDto } from './dto/create-pile-group.dto';
import { UpdatePileGroupDto } from './dto/update-pile-group.dto';
import { CreatePileDto } from './dto/create-pile.dto';
import { CreatePileLayoutPointDto } from './dto/create-pile-layout-point.dto';
import { RunMultiPileEnvelopeDto } from './dto/run-multi-pile-envelope.dto';
import { SaveMultiPileStateDto } from './dto/save-multi-pile-state.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, RequestUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('pile-groups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/pile-groups')
export class PileGroupsController {
  constructor(
    private readonly pileGroupsService: PileGroupsService,
    private readonly multiPileService: MultiPileService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List pile groups for a project' })
  async findAll(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: RequestUser,
    @Query() pagination: PaginationDto,
  ) {
    this.requireOrgContext(user);
    return this.pileGroupsService.findAll(projectId, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a pile group with piles and layout' })
  async findById(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    this.requireOrgContext(user);
    return this.pileGroupsService.findById(id, projectId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Create a pile group' })
  async create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreatePileGroupDto,
    @CurrentUser() user: RequestUser,
  ) {
    this.requireOrgContext(user);
    return this.pileGroupsService.create(projectId, dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Update a pile group' })
  async update(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePileGroupDto,
    @CurrentUser() user: RequestUser,
  ) {
    this.requireOrgContext(user);
    return this.pileGroupsService.update(id, projectId, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Delete a pile group' })
  async remove(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    this.requireOrgContext(user);
    return this.pileGroupsService.remove(id, projectId);
  }

  @Post(':id/piles')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Add a pile to a group' })
  async addPile(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) pileGroupId: string,
    @Body() dto: CreatePileDto,
    @CurrentUser() user: RequestUser,
  ) {
    this.requireOrgContext(user);
    return this.pileGroupsService.addPile(pileGroupId, projectId, dto);
  }

  @Patch(':id/piles/:pileId')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Update a pile' })
  async updatePile(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) pileGroupId: string,
    @Param('pileId', ParseUUIDPipe) pileId: string,
    @Body() dto: CreatePileDto,
    @CurrentUser() user: RequestUser,
  ) {
    this.requireOrgContext(user);
    return this.pileGroupsService.updatePile(pileId, pileGroupId, projectId, dto);
  }

  @Delete(':id/piles/:pileId')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Remove a pile from a group' })
  async removePile(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) pileGroupId: string,
    @Param('pileId', ParseUUIDPipe) pileId: string,
    @CurrentUser() user: RequestUser,
  ) {
    this.requireOrgContext(user);
    return this.pileGroupsService.removePile(pileId, pileGroupId, projectId);
  }

  @Post(':id/layout-points')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Add a layout point to a pile group' })
  async addLayoutPoint(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) pileGroupId: string,
    @Body() dto: CreatePileLayoutPointDto,
    @CurrentUser() user: RequestUser,
  ) {
    this.requireOrgContext(user);
    return this.pileGroupsService.addLayoutPoint(pileGroupId, projectId, dto);
  }

  @Delete(':id/layout-points/:pointId')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Remove a layout point' })
  async removeLayoutPoint(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) pileGroupId: string,
    @Param('pointId', ParseUUIDPipe) pointId: string,
    @CurrentUser() user: RequestUser,
  ) {
    this.requireOrgContext(user);
    return this.pileGroupsService.removeLayoutPoint(pointId, pileGroupId, projectId);
  }

  @Get(':id/multi-pile')
  @ApiOperation({ summary: 'Get normalized multi-pile authored state for a pile group' })
  async getMultiPileState(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) pileGroupId: string,
    @CurrentUser() user: RequestUser,
  ) {
    this.requireOrgContext(user);
    return this.multiPileService.getState(pileGroupId, projectId);
  }

  @Put(':id/multi-pile')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Save normalized multi-pile authored state for a pile group' })
  async saveMultiPileState(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) pileGroupId: string,
    @Body() dto: SaveMultiPileStateDto,
    @CurrentUser() user: RequestUser,
  ) {
    this.requireOrgContext(user);
    return this.multiPileService.saveState(pileGroupId, projectId, dto.state);
  }

  @Post(':id/multi-pile/envelope-runs')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Run the multi-pile envelope calculation for a pile group' })
  async runMultiPileEnvelope(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) pileGroupId: string,
    @Body() dto: RunMultiPileEnvelopeDto,
    @CurrentUser() user: RequestUser,
  ) {
    this.requireOrgContext(user);
    return this.multiPileService.runEnvelope(pileGroupId, projectId, user.id, dto?.state);
  }

  @Get(':id/multi-pile/envelope-runs/latest')
  @ApiOperation({ summary: 'Get the latest multi-pile envelope run for a pile group' })
  async getLatestMultiPileEnvelope(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) pileGroupId: string,
    @CurrentUser() user: RequestUser,
  ) {
    this.requireOrgContext(user);
    return this.multiPileService.getLatestEnvelopeRun(pileGroupId, projectId);
  }

  private requireOrgContext(user: RequestUser): asserts user is RequestUser & { organisationId: string } {
    if (!user.organisationId) {
      throw new ForbiddenException('Organisation context required.');
    }
  }
}
