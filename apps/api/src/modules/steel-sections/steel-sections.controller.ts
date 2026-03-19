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
import { SteelSectionsService } from './steel-sections.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CurrentUser,
  RequestUser,
} from '../auth/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import {
  CreateSteelSectionCatalogDto,
  UpdateSteelSectionCatalogDto,
  CreateSteelSectionDto,
} from './dto/steel-section.dto';

@ApiTags('steel-sections')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('steel-sections')
export class SteelSectionsController {
  constructor(private readonly steelSectionsService: SteelSectionsService) {}

  // ── Catalogs ──────────────────────────────────────────────────

  @Get('catalogs')
  @ApiOperation({ summary: 'List steel section catalogs (system + org)' })
  async findAllCatalogs(
    @CurrentUser() user: RequestUser,
    @Query() pagination: PaginationDto,
  ) {
    return this.steelSectionsService.findAllCatalogs(
      user.organisationId,
      pagination,
    );
  }

  @Get('catalogs/:id')
  @ApiOperation({ summary: 'Get a steel section catalog by ID' })
  async findCatalogById(@Param('id', ParseUUIDPipe) id: string) {
    return this.steelSectionsService.findCatalogById(id);
  }

  @Post('catalogs')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Create a steel section catalog (versioned snapshot)' })
  async createCatalog(
    @Body() dto: CreateSteelSectionCatalogDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.steelSectionsService.createCatalog(
      user.organisationId,
      user.id,
      dto,
    );
  }

  @Patch('catalogs/:id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Update catalog status or effective date' })
  async updateCatalog(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSteelSectionCatalogDto,
  ) {
    return this.steelSectionsService.updateCatalog(id, dto);
  }

  @Post('catalogs/:id/activate')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  @ApiOperation({
    summary: 'Activate a catalog (computes snapshot hash, supersedes previous active)',
  })
  async activateCatalog(@Param('id', ParseUUIDPipe) id: string) {
    return this.steelSectionsService.activateCatalog(id);
  }

  // ── Sections ──────────────────────────────────────────────────

  @Get('catalogs/:catalogId/sections')
  @ApiOperation({ summary: 'List sections in a catalog (paginated)' })
  async findSections(
    @Param('catalogId', ParseUUIDPipe) catalogId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.steelSectionsService.findSections(catalogId, pagination);
  }

  @Get('sections/:id')
  @ApiOperation({ summary: 'Get a steel section by ID' })
  async findSectionById(@Param('id', ParseUUIDPipe) id: string) {
    return this.steelSectionsService.findSectionById(id);
  }

  @Post('sections')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Add a section to a draft catalog' })
  async createSection(@Body() dto: CreateSteelSectionDto) {
    return this.steelSectionsService.createSection(dto);
  }

  @Post('catalogs/:catalogId/sections/bulk')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Bulk add sections to a draft catalog' })
  async bulkCreateSections(
    @Param('catalogId', ParseUUIDPipe) catalogId: string,
    @Body() sections: CreateSteelSectionDto[],
  ) {
    return this.steelSectionsService.bulkCreateSections(catalogId, sections);
  }
}
