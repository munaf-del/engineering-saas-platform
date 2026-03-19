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
import { PileCapacityService } from './pile-capacity.service';
import { CreatePileCapacityProfileDto } from './dto/create-pile-capacity-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, RequestUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('pile-capacity-profiles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/pile-capacity-profiles')
export class PileCapacityController {
  constructor(private readonly pileCapacityService: PileCapacityService) {}

  @Get()
  @ApiOperation({ summary: 'List pile capacity profiles for a project' })
  async findAll(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: RequestUser,
    @Query() pagination: PaginationDto,
  ) {
    this.requireOrgContext(user);
    return this.pileCapacityService.findAll(projectId, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a pile capacity profile' })
  async findById(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    this.requireOrgContext(user);
    return this.pileCapacityService.findById(id, projectId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Create a pile capacity profile' })
  async create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreatePileCapacityProfileDto,
    @CurrentUser() user: RequestUser,
  ) {
    this.requireOrgContext(user);
    return this.pileCapacityService.create(projectId, dto);
  }

  private requireOrgContext(user: RequestUser): asserts user is RequestUser & { organisationId: string } {
    if (!user.organisationId) {
      throw new ForbiddenException('Organisation context required.');
    }
  }
}
