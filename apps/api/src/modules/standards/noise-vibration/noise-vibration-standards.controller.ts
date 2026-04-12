import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { NoiseVibrationCriteriaQueryDto } from './dto/noise-vibration-criteria-query.dto';
import { NoiseVibrationStandardsService } from './noise-vibration-standards.service';

@ApiTags('standards/noise-vibration')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('standards/noise-vibration')
export class NoiseVibrationStandardsController {
  constructor(private readonly noiseVibrationStandardsService: NoiseVibrationStandardsService) {}

  @Get('sources')
  @ApiOperation({ summary: 'List noise and vibration standards/guideline sources' })
  async findSources() {
    return this.noiseVibrationStandardsService.findSources();
  }

  @Get('criteria')
  @ApiOperation({ summary: 'List and filter noise and vibration criterion rows' })
  async findCriteria(@Query() query: NoiseVibrationCriteriaQueryDto) {
    return this.noiseVibrationStandardsService.findCriteria(query);
  }

  @Get('criteria/:id')
  @ApiOperation({ summary: 'Get one noise and vibration criterion row' })
  async findCriterionById(@Param('id', ParseUUIDPipe) id: string) {
    return this.noiseVibrationStandardsService.findCriterionById(id);
  }
}
