import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { GeotechService } from './geotech.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CurrentUser,
  RequestUser,
} from '../auth/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import {
  CreateGeotechMaterialClassDto,
  CreateGeotechParameterSetDto,
  UpdateGeotechParameterSetDto,
} from './dto/create-geotech.dto';

@ApiTags('geotech')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('geotech')
export class GeotechController {
  constructor(private readonly geotechService: GeotechService) {}

  // ── Classes ───────────────────────────────────────────────────

  @Get('classes')
  @ApiOperation({ summary: 'List geotechnical material classes' })
  async findAllClasses(@Query() pagination: PaginationDto) {
    return this.geotechService.findAllClasses(pagination);
  }

  @Get('classes/:id')
  @ApiOperation({ summary: 'Get geotech material class by ID' })
  async findClassById(@Param('id', ParseUUIDPipe) id: string) {
    return this.geotechService.findClassById(id);
  }

  @Post('classes')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Create a geotech material class (admin only)' })
  async createClass(@Body() dto: CreateGeotechMaterialClassDto) {
    return this.geotechService.createClass(dto);
  }

  // ── Parameter Sets ────────────────────────────────────────────

  @Get('parameters')
  @ApiOperation({ summary: 'List geotech parameter sets (system + org)' })
  @ApiQuery({ name: 'classId', required: false })
  async findParameterSets(
    @CurrentUser() user: RequestUser,
    @Query() pagination: PaginationDto,
    @Query('classId') classId?: string,
  ) {
    return this.geotechService.findParameterSets(
      user.organisationId,
      pagination,
      classId,
    );
  }

  @Get('parameters/:id')
  @ApiOperation({ summary: 'Get geotech parameter set by ID' })
  async findParameterSetById(@Param('id', ParseUUIDPipe) id: string) {
    return this.geotechService.findParameterSetById(id);
  }

  @Post('parameters')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Create a geotech parameter set' })
  async createParameterSet(
    @Body() dto: CreateGeotechParameterSetDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.geotechService.createParameterSet(user.organisationId, dto);
  }

  @Patch('parameters/:id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Update a geotech parameter set' })
  async updateParameterSet(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGeotechParameterSetDto,
  ) {
    return this.geotechService.updateParameterSet(id, dto);
  }

  @Delete('parameters/:id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Delete a geotech parameter set' })
  async deleteParameterSet(@Param('id', ParseUUIDPipe) id: string) {
    return this.geotechService.deleteParameterSet(id);
  }
}
