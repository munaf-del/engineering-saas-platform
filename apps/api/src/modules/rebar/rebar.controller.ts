import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RebarService } from './rebar.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CurrentUser,
  RequestUser,
} from '../auth/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import {
  CreateRebarCatalogDto,
  UpdateRebarCatalogDto,
  CreateRebarSizeDto,
} from './dto/rebar.dto';

@ApiTags('rebar')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('rebar')
export class RebarController {
  constructor(private readonly rebarService: RebarService) {}

  @Get('catalogs')
  @ApiOperation({ summary: 'List rebar catalogs (system + org)' })
  async findAllCatalogs(
    @CurrentUser() user: RequestUser,
    @Query() pagination: PaginationDto,
  ) {
    return this.rebarService.findAllCatalogs(user.organisationId, pagination);
  }

  @Get('catalogs/:id')
  @ApiOperation({ summary: 'Get a rebar catalog by ID' })
  async findCatalogById(@Param('id', ParseUUIDPipe) id: string) {
    return this.rebarService.findCatalogById(id);
  }

  @Post('catalogs')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Create a rebar catalog (versioned snapshot)' })
  async createCatalog(
    @Body() dto: CreateRebarCatalogDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.rebarService.createCatalog(user.organisationId, user.id, dto);
  }

  @Patch('catalogs/:id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Update rebar catalog status or effective date' })
  async updateCatalog(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRebarCatalogDto,
  ) {
    return this.rebarService.updateCatalog(id, dto);
  }

  @Post('catalogs/:id/activate')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  @ApiOperation({
    summary: 'Activate a rebar catalog (snapshot hash, supersedes previous)',
  })
  async activateCatalog(@Param('id', ParseUUIDPipe) id: string) {
    return this.rebarService.activateCatalog(id);
  }

  @Get('catalogs/:catalogId/sizes')
  @ApiOperation({ summary: 'List rebar sizes in a catalog (paginated)' })
  async findSizes(
    @Param('catalogId', ParseUUIDPipe) catalogId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.rebarService.findSizes(catalogId, pagination);
  }

  @Get('sizes/:id')
  @ApiOperation({ summary: 'Get a rebar size by ID' })
  async findSizeById(@Param('id', ParseUUIDPipe) id: string) {
    return this.rebarService.findSizeById(id);
  }

  @Post('sizes')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Add a rebar size to a draft catalog' })
  async createSize(@Body() dto: CreateRebarSizeDto) {
    return this.rebarService.createSize(dto);
  }

  @Post('catalogs/:catalogId/sizes/bulk')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Bulk add rebar sizes to a draft catalog' })
  async bulkCreateSizes(
    @Param('catalogId', ParseUUIDPipe) catalogId: string,
    @Body() sizes: CreateRebarSizeDto[],
  ) {
    return this.rebarService.bulkCreateSizes(catalogId, sizes);
  }
}
