import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CalculationsService } from './calculations.service';
import { OrchestrationService } from './orchestration.service';
import { SnapshotService } from './snapshot.service';
import { SubmitCalculationDto } from './dto/submit-calculation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, RequestUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('calculations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/calculations')
export class CalculationsController {
  constructor(
    private readonly calculationsService: CalculationsService,
    private readonly orchestrationService: OrchestrationService,
    private readonly snapshotService: SnapshotService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List calculation runs for a project' })
  async findAll(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: RequestUser,
    @Query() pagination: PaginationDto,
  ) {
    this.requireOrgContext(user);
    return this.calculationsService.findAll(projectId, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a calculation run with snapshot and results' })
  async findById(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    this.requireOrgContext(user);
    return this.calculationsService.findById(id, projectId);
  }

  @Get(':id/snapshot')
  @ApiOperation({ summary: 'Get the immutable snapshot for a calculation run' })
  async getSnapshot(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    this.requireOrgContext(user);
    return this.calculationsService.getSnapshot(id, projectId);
  }

  @Get(':id/snapshot/verify')
  @ApiOperation({ summary: 'Verify snapshot integrity' })
  async verifySnapshot(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) runId: string,
    @CurrentUser() user: RequestUser,
  ) {
    this.requireOrgContext(user);
    const snapshot = await this.calculationsService.getSnapshot(runId, projectId);
    return this.snapshotService.verifySnapshot(snapshot.id);
  }

  @Get(':id/design-checks')
  @ApiOperation({ summary: 'Get design checks for a calculation run' })
  async getDesignChecks(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    this.requireOrgContext(user);
    return this.calculationsService.getDesignChecks(id, projectId);
  }

  @Post('run')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Submit a calculation for execution' })
  async submitCalculation(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: SubmitCalculationDto,
    @CurrentUser() user: RequestUser,
  ) {
    this.requireOrgContext(user);
    return this.orchestrationService.submitCalculation(projectId, user.id, dto);
  }

  private requireOrgContext(user: RequestUser): asserts user is RequestUser & { organisationId: string } {
    if (!user.organisationId) {
      throw new ForbiddenException('Organisation context required.');
    }
  }
}
