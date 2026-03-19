import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { OrganisationsService } from './organisations.service';
import { CreateOrganisationDto } from './dto/create-organisation.dto';

@ApiTags('organisations')
@Controller('organisations')
export class OrganisationsController {
  constructor(private readonly organisationsService: OrganisationsService) {}

  @Get()
  @ApiOperation({ summary: 'List all organisations' })
  async findAll() {
    return this.organisationsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get organisation by ID' })
  async findById(@Param('id') id: string) {
    return this.organisationsService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create an organisation' })
  async create(@Body() dto: CreateOrganisationDto) {
    return this.organisationsService.create(dto);
  }
}
