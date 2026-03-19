import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { StandardsService } from './standards.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('standards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('standards')
export class StandardsController {
  constructor(private readonly standardsService: StandardsService) {}

  @Get()
  @ApiOperation({ summary: 'List all standard editions (paginated)' })
  async findAll(@Query() pagination: PaginationDto) {
    return this.standardsService.findAll(pagination);
  }

  @Get('current')
  @ApiOperation({ summary: 'List current standard editions (paginated)' })
  async findCurrent(@Query() pagination: PaginationDto) {
    return this.standardsService.findCurrent(pagination);
  }

  @Get(':code')
  @ApiOperation({ summary: 'Find standard editions by code' })
  async findByCode(@Param('code') code: string) {
    return this.standardsService.findByCode(code);
  }
}
