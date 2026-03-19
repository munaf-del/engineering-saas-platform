import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { StandardsService } from './standards.service';

@ApiTags('standards')
@Controller('standards')
export class StandardsController {
  constructor(private readonly standardsService: StandardsService) {}

  @Get()
  @ApiOperation({ summary: 'List all standard editions' })
  async findAll() {
    return this.standardsService.findAll();
  }

  @Get('current')
  @ApiOperation({ summary: 'List current standard editions' })
  async findCurrent() {
    return this.standardsService.findCurrent();
  }

  @Get(':code')
  @ApiOperation({ summary: 'Find standard editions by code' })
  async findByCode(@Param('code') code: string) {
    return this.standardsService.findByCode(code);
  }
}
