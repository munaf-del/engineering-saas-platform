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
import { StandardsService } from './standards.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CurrentUser,
  RequestUser,
} from '../auth/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CreateStandardDto, UpdateStandardDto } from './dto/create-standard.dto';
import { CreateStandardEditionDto } from './dto/create-standard-edition.dto';
import {
  CreateStandardsProfileDto,
  UpdateStandardsProfileDto,
  PinStandardDto,
  BulkPinStandardsDto,
  AssignProjectStandardDto,
} from './dto/standards-profile.dto';

@ApiTags('standards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('standards')
export class StandardsController {
  constructor(private readonly standardsService: StandardsService) {}

  // ── Standards Registry ────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'List all standards (paginated)' })
  async findAllStandards(@Query() pagination: PaginationDto) {
    return this.standardsService.findAllStandards(pagination);
  }

  @Get('current')
  @ApiOperation({ summary: 'List current standard editions (alias)' })
  async findCurrentEditionsAlias(@Query() pagination: PaginationDto) {
    return this.standardsService.findCurrent(pagination);
  }

  @Get('code/:code')
  @ApiOperation({ summary: 'Find standard by code' })
  async findStandardByCode(@Param('code') code: string) {
    return this.standardsService.findStandardByCode(code);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Create a standard (admin only)' })
  async createStandard(@Body() dto: CreateStandardDto) {
    return this.standardsService.createStandard(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Update a standard (admin only)' })
  async updateStandard(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStandardDto,
  ) {
    return this.standardsService.updateStandard(id, dto);
  }

  // ── Standard Editions ─────────────────────────────────────────

  @Get('editions')
  @ApiOperation({ summary: 'List all standard editions (paginated)' })
  async findAllEditions(@Query() pagination: PaginationDto) {
    return this.standardsService.findAll(pagination);
  }

  @Get('editions/current')
  @ApiOperation({ summary: 'List current standard editions' })
  async findCurrentEditions(@Query() pagination: PaginationDto) {
    return this.standardsService.findCurrent(pagination);
  }

  @Get('editions/by-code/:code')
  @ApiOperation({ summary: 'Find editions by standard code' })
  async findEditionsByCode(@Param('code') code: string) {
    return this.standardsService.findByCode(code);
  }

  @Post('editions')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Create a standard edition (admin only)' })
  async createEdition(@Body() dto: CreateStandardEditionDto) {
    return this.standardsService.createEdition(dto);
  }

  // ── Standards Profiles ────────────────────────────────────────

  @Get('profiles')
  @ApiOperation({ summary: 'List standards profiles for the current organisation' })
  async findProfiles(
    @CurrentUser() user: RequestUser,
    @Query() pagination: PaginationDto,
  ) {
    this.requireOrgContext(user);
    return this.standardsService.findProfiles(user.organisationId!, pagination);
  }

  @Get('profiles/:id')
  @ApiOperation({ summary: 'Get a standards profile by ID' })
  async findProfileById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    this.requireOrgContext(user);
    return this.standardsService.findProfileById(id, user.organisationId!);
  }

  @Post('profiles')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Create a standards profile' })
  async createProfile(
    @Body() dto: CreateStandardsProfileDto,
    @CurrentUser() user: RequestUser,
  ) {
    this.requireOrgContext(user);
    return this.standardsService.createProfile(user.organisationId!, dto);
  }

  @Patch('profiles/:id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Update a standards profile' })
  async updateProfile(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStandardsProfileDto,
    @CurrentUser() user: RequestUser,
  ) {
    this.requireOrgContext(user);
    return this.standardsService.updateProfile(id, user.organisationId!, dto);
  }

  @Delete('profiles/:id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Delete a standards profile' })
  async deleteProfile(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    this.requireOrgContext(user);
    return this.standardsService.deleteProfile(id, user.organisationId!);
  }

  // ── Profile Pinning ───────────────────────────────────────────

  @Post('profiles/:id/pin')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Pin a standard edition to a profile' })
  async pinStandard(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PinStandardDto,
    @CurrentUser() user: RequestUser,
  ) {
    this.requireOrgContext(user);
    return this.standardsService.pinStandard(
      id,
      user.organisationId!,
      dto.standardEditionId,
    );
  }

  @Post('profiles/:id/pin/bulk')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Bulk pin standard editions to a profile' })
  async bulkPinStandards(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: BulkPinStandardsDto,
    @CurrentUser() user: RequestUser,
  ) {
    this.requireOrgContext(user);
    return this.standardsService.bulkPinStandards(
      id,
      user.organisationId!,
      dto.standardEditionIds,
    );
  }

  @Delete('profiles/:profileId/pin/:editionId')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Unpin a standard edition from a profile' })
  async unpinStandard(
    @Param('profileId', ParseUUIDPipe) profileId: string,
    @Param('editionId', ParseUUIDPipe) editionId: string,
    @CurrentUser() user: RequestUser,
  ) {
    this.requireOrgContext(user);
    return this.standardsService.unpinStandard(
      profileId,
      user.organisationId!,
      editionId,
    );
  }

  // ── Project Standard Assignments ──────────────────────────────

  @Get('projects/:projectId/assignments')
  @ApiOperation({ summary: 'List standard assignments for a project' })
  async getProjectAssignments(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: RequestUser,
  ) {
    this.requireOrgContext(user);
    return this.standardsService.getProjectAssignments(
      projectId,
      user.organisationId!,
    );
  }

  @Post('projects/:projectId/assignments')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Assign a standard edition to a project' })
  async assignProjectStandard(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: AssignProjectStandardDto,
    @CurrentUser() user: RequestUser,
  ) {
    this.requireOrgContext(user);
    return this.standardsService.assignProjectStandard(
      projectId,
      user.organisationId!,
      dto.standardEditionId,
      user.id,
      dto.notes,
    );
  }

  @Delete('projects/:projectId/assignments/:editionId')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Remove a standard assignment from a project' })
  async removeProjectAssignment(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('editionId', ParseUUIDPipe) editionId: string,
    @CurrentUser() user: RequestUser,
  ) {
    this.requireOrgContext(user);
    return this.standardsService.removeProjectAssignment(
      projectId,
      user.organisationId!,
      editionId,
    );
  }

  // ── Catch-all code lookup (must be last single-segment GET) ──

  @Get(':code')
  @ApiOperation({ summary: 'Find standard by code (shorthand)' })
  async findStandardByCodeShort(@Param('code') code: string) {
    return this.standardsService.findStandardByCode(code);
  }

  // ── Helper ────────────────────────────────────────────────────

  private requireOrgContext(
    user: RequestUser,
  ): asserts user is RequestUser & { organisationId: string } {
    if (!user.organisationId) {
      throw new ForbiddenException('Organisation context required');
    }
  }
}
