import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';
import { CreateMaterialFamilyDto } from './dto/create-material-family.dto';
import {
  CreateMaterialGradeDto,
  UpdateMaterialGradeDto,
} from './dto/create-material-grade.dto';
import { CreatePropertySchemaDto } from './dto/create-property-schema.dto';

@Injectable()
export class MaterialsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Material Families ─────────────────────────────────────────

  async findAllFamilies(pagination: PaginationDto) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.materialFamily.findMany({
        include: { propertySchemas: { orderBy: { sortOrder: 'asc' } } },
        orderBy: { code: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.materialFamily.count(),
    ]);

    return paginate(data, total, page, limit);
  }

  async findFamilyById(id: string) {
    const family = await this.prisma.materialFamily.findUnique({
      where: { id },
      include: {
        propertySchemas: { orderBy: { sortOrder: 'asc' } },
        grades: { take: 20, orderBy: { name: 'asc' } },
      },
    });
    if (!family) throw new NotFoundException('Material family not found');
    return family;
  }

  async createFamily(dto: CreateMaterialFamilyDto) {
    return this.prisma.materialFamily.create({
      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description,
        category: dto.category,
        isDemo: dto.isDemo ?? false,
      },
      include: { propertySchemas: true },
    });
  }

  // ── Property Schemas ──────────────────────────────────────────

  async createPropertySchema(dto: CreatePropertySchemaDto) {
    if (!dto.unit) {
      throw new BadRequestException('unit is required for all property schemas');
    }

    const family = await this.prisma.materialFamily.findUnique({
      where: { id: dto.familyId },
    });
    if (!family) throw new NotFoundException('Material family not found');

    return this.prisma.materialPropertySchema.create({
      data: {
        familyId: dto.familyId,
        key: dto.key,
        label: dto.label,
        unit: dto.unit,
        required: dto.required ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  // ── Material Grades ───────────────────────────────────────────

  async findAllGrades(
    organisationId: string | undefined,
    pagination: PaginationDto,
    category?: string,
  ) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (category) where.category = category;
    if (organisationId) {
      where.OR = [
        { organisationId },
        { organisationId: null, isSystemDefault: true },
        { isDemo: true },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.material.findMany({
        where,
        include: { family: true, propertySets: true },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.material.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findGradeById(id: string) {
    const grade = await this.prisma.material.findUnique({
      where: { id },
      include: { family: true, propertySets: true },
    });
    if (!grade) throw new NotFoundException('Material grade not found');
    return grade;
  }

  async createGrade(organisationId: string | undefined, dto: CreateMaterialGradeDto) {
    if (!dto.sourceStandard) {
      throw new BadRequestException('sourceStandard is required for traceability');
    }
    if (!dto.sourceEdition) {
      throw new BadRequestException('sourceEdition is required for traceability');
    }

    this.validatePropertyUnits(dto.properties);

    return this.prisma.material.create({
      data: {
        organisationId,
        familyId: dto.familyId,
        category: dto.category,
        name: dto.name,
        grade: dto.grade,
        standardRef: dto.standardRef,
        sourceStandard: dto.sourceStandard,
        sourceEdition: dto.sourceEdition,
        sourceAmendment: dto.sourceAmendment,
        properties: dto.properties as object,
        isDemo: dto.isDemo ?? false,
      },
      include: { family: true },
    });
  }

  async updateGrade(id: string, dto: UpdateMaterialGradeDto) {
    await this.assertGradeExists(id);

    if (dto.properties) {
      this.validatePropertyUnits(dto.properties);
    }

    return this.prisma.material.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.grade !== undefined && { grade: dto.grade }),
        ...(dto.standardRef !== undefined && { standardRef: dto.standardRef }),
        ...(dto.sourceStandard !== undefined && { sourceStandard: dto.sourceStandard }),
        ...(dto.sourceEdition !== undefined && { sourceEdition: dto.sourceEdition }),
        ...(dto.sourceAmendment !== undefined && { sourceAmendment: dto.sourceAmendment }),
        ...(dto.properties !== undefined && { properties: dto.properties as object }),
      },
      include: { family: true },
    });
  }

  async deleteGrade(id: string) {
    await this.assertGradeExists(id);
    return this.prisma.material.delete({ where: { id } });
  }

  // ── Helpers ───────────────────────────────────────────────────

  private validatePropertyUnits(properties: Record<string, unknown>) {
    for (const [key, val] of Object.entries(properties)) {
      if (typeof val === 'object' && val !== null) {
        const prop = val as Record<string, unknown>;
        if (!prop.unit) {
          throw new BadRequestException(
            `Property "${key}" is missing required "unit" field`,
          );
        }
      }
    }
  }

  private async assertGradeExists(id: string) {
    const g = await this.prisma.material.findUnique({ where: { id } });
    if (!g) throw new NotFoundException('Material grade not found');
    return g;
  }
}
