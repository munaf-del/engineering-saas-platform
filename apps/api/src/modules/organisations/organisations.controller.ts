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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrganisationsService } from './organisations.service';
import { CreateOrganisationDto } from './dto/create-organisation.dto';
import { UpdateOrganisationDto } from './dto/update-organisation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  RequestUser,
} from '../auth/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('organisations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organisations')
export class OrganisationsController {
  constructor(private readonly organisationsService: OrganisationsService) {}

  @Get()
  @ApiOperation({ summary: 'List organisations the current user belongs to' })
  async findAll(
    @CurrentUser() user: RequestUser,
    @Query() pagination: PaginationDto,
  ) {
    return this.organisationsService.findByUser(user.id, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get organisation by ID (must be a member)' })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.organisationsService.findById(id, user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create an organisation (caller becomes owner)' })
  async create(
    @Body() dto: CreateOrganisationDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.organisationsService.create(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an organisation (owner/admin only)' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrganisationDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.organisationsService.update(id, user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an organisation (owner only)' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.organisationsService.remove(id, user.id);
  }
}
