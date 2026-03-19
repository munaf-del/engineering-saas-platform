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
import { LoadCasesService } from './load-cases.service';
import { CreateLoadCaseDto } from './dto/create-load-case.dto';
import { UpdateLoadCaseDto } from './dto/update-load-case.dto';
import { CreateLoadActionDto } from './dto/create-load-action.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, RequestUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('load-cases')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/load-cases')
export class LoadCasesController {
  constructor(private readonly loadCasesService: LoadCasesService) {}

  @Get()
  @ApiOperation({ summary: 'List load cases for a project' })
  async findAll(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: RequestUser,
    @Query() pagination: PaginationDto,
  ) {
    this.requireOrgContext(user);
    return this.loadCasesService.findAll(projectId, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a load case by ID' })
  async findById(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    this.requireOrgContext(user);
    return this.loadCasesService.findById(id, projectId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Create a load case' })
  async create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateLoadCaseDto,
    @CurrentUser() user: RequestUser,
  ) {
    this.requireOrgContext(user);
    return this.loadCasesService.create(projectId, dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Update a load case' })
  async update(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLoadCaseDto,
    @CurrentUser() user: RequestUser,
  ) {
    this.requireOrgContext(user);
    return this.loadCasesService.update(id, projectId, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Delete a load case' })
  async remove(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    this.requireOrgContext(user);
    return this.loadCasesService.remove(id, projectId);
  }

  @Post(':id/actions')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Add a load action to a load case' })
  async addAction(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) loadCaseId: string,
    @Body() dto: CreateLoadActionDto,
    @CurrentUser() user: RequestUser,
  ) {
    this.requireOrgContext(user);
    return this.loadCasesService.addAction(loadCaseId, projectId, dto);
  }

  @Delete(':loadCaseId/actions/:actionId')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Remove a load action' })
  async removeAction(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('loadCaseId', ParseUUIDPipe) loadCaseId: string,
    @Param('actionId', ParseUUIDPipe) actionId: string,
    @CurrentUser() user: RequestUser,
  ) {
    this.requireOrgContext(user);
    return this.loadCasesService.removeAction(loadCaseId, actionId, projectId);
  }

  private requireOrgContext(user: RequestUser): asserts user is RequestUser & { organisationId: string } {
    if (!user.organisationId) {
      throw new ForbiddenException('Organisation context required.');
    }
  }
}
