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
import { MaterialsService } from './materials.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CurrentUser,
  RequestUser,
} from '../auth/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CreateMaterialFamilyDto } from './dto/create-material-family.dto';
import {
  CreateMaterialGradeDto,
  UpdateMaterialGradeDto,
} from './dto/create-material-grade.dto';
import { CreatePropertySchemaDto } from './dto/create-property-schema.dto';

@ApiTags('materials')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('materials')
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  // ── Families ──────────────────────────────────────────────────

  @Get('families')
  @ApiOperation({ summary: 'List material families' })
  async findAllFamilies(@Query() pagination: PaginationDto) {
    return this.materialsService.findAllFamilies(pagination);
  }

  @Get('families/:id')
  @ApiOperation({ summary: 'Get material family by ID' })
  async findFamilyById(@Param('id', ParseUUIDPipe) id: string) {
    return this.materialsService.findFamilyById(id);
  }

  @Post('families')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Create a material family (admin only)' })
  async createFamily(@Body() dto: CreateMaterialFamilyDto) {
    return this.materialsService.createFamily(dto);
  }

  // ── Property Schemas ──────────────────────────────────────────

  @Post('property-schemas')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Create a property schema for a material family' })
  async createPropertySchema(@Body() dto: CreatePropertySchemaDto) {
    return this.materialsService.createPropertySchema(dto);
  }

  // ── Grades ────────────────────────────────────────────────────

  @Get('grades')
  @ApiOperation({ summary: 'List material grades (shows system + org materials)' })
  @ApiQuery({ name: 'category', required: false })
  async findAllGrades(
    @CurrentUser() user: RequestUser,
    @Query() pagination: PaginationDto,
    @Query('category') category?: string,
  ) {
    return this.materialsService.findAllGrades(
      user.organisationId,
      pagination,
      category,
    );
  }

  @Get('grades/:id')
  @ApiOperation({ summary: 'Get material grade by ID' })
  async findGradeById(@Param('id', ParseUUIDPipe) id: string) {
    return this.materialsService.findGradeById(id);
  }

  @Post('grades')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Create a material grade' })
  async createGrade(
    @Body() dto: CreateMaterialGradeDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.materialsService.createGrade(user.organisationId, dto);
  }

  @Patch('grades/:id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Update a material grade' })
  async updateGrade(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMaterialGradeDto,
  ) {
    return this.materialsService.updateGrade(id, dto);
  }

  @Delete('grades/:id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Delete a material grade' })
  async deleteGrade(@Param('id', ParseUUIDPipe) id: string) {
    return this.materialsService.deleteGrade(id);
  }
}
