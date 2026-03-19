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
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LoadCombinationsService } from './load-combinations.service';
import { CreateLoadCombinationSetDto } from './dto/create-load-combination-set.dto';
import { UpdateLoadCombinationSetDto } from './dto/update-load-combination-set.dto';
import { CreateLoadCombinationDto } from './dto/create-load-combination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, RequestUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('load-combination-sets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/load-combination-sets')
export class LoadCombinationsController {
  constructor(private readonly loadCombinationsService: LoadCombinationsService) {}

  @Get()
  @ApiOperation({ summary: 'List load combination sets for a project' })
  async findAll(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: RequestUser,
    @Query() pagination: PaginationDto,
  ) {
    this.requireOrgContext(user);
    return this.loadCombinationsService.findAllSets(projectId, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a load combination set by ID' })
  async findById(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    this.requireOrgContext(user);
    return this.loadCombinationsService.findSetById(id, projectId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Create a load combination set' })
  async create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateLoadCombinationSetDto,
    @CurrentUser() user: RequestUser,
  ) {
    this.requireOrgContext(user);
    return this.loadCombinationsService.createSet(projectId, dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Update a load combination set' })
  async update(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLoadCombinationSetDto,
    @CurrentUser() user: RequestUser,
  ) {
    this.requireOrgContext(user);
    return this.loadCombinationsService.updateSet(id, projectId, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Delete a load combination set' })
  async remove(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    this.requireOrgContext(user);
    return this.loadCombinationsService.removeSet(id, projectId);
  }

  @Post(':id/combinations')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Add a combination to a set' })
  async addCombination(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) setId: string,
    @Body() dto: CreateLoadCombinationDto,
    @CurrentUser() user: RequestUser,
  ) {
    this.requireOrgContext(user);
    return this.loadCombinationsService.addCombination(setId, projectId, dto);
  }

  @Delete(':setId/combinations/:combinationId')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Remove a combination from a set' })
  async removeCombination(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('setId', ParseUUIDPipe) setId: string,
    @Param('combinationId', ParseUUIDPipe) combinationId: string,
    @CurrentUser() user: RequestUser,
  ) {
    this.requireOrgContext(user);
    return this.loadCombinationsService.removeCombination(setId, combinationId, projectId);
  }

  private requireOrgContext(user: RequestUser): asserts user is RequestUser & { organisationId: string } {
    if (!user.organisationId) {
      throw new ForbiddenException('Organisation context required.');
    }
  }
}
