import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CalculatorsService } from './calculators.service';
import { CreateCalculatorDto } from './dto/create-calculator.dto';
import { CreateCalculatorVersionDto } from './dto/create-calculator-version.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('calculators')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('calculators')
export class CalculatorsController {
  constructor(private readonly calculatorsService: CalculatorsService) {}

  @Get()
  @ApiOperation({ summary: 'List all calculator definitions' })
  async findAll(@Query() pagination: PaginationDto) {
    return this.calculatorsService.findAll(pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a calculator definition with versions' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.calculatorsService.findById(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Register a new calculator definition' })
  async create(@Body() dto: CreateCalculatorDto) {
    return this.calculatorsService.create(dto);
  }

  @Get(':id/versions')
  @ApiOperation({ summary: 'List versions for a calculator' })
  async listVersions(@Param('id', ParseUUIDPipe) id: string) {
    return this.calculatorsService.listVersions(id);
  }

  @Post(':id/versions')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Create a new version for a calculator' })
  async createVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCalculatorVersionDto,
  ) {
    return this.calculatorsService.createVersion(id, dto);
  }
}
