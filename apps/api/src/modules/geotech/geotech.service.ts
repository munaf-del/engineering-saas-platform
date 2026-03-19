import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';
import {
  CreateGeotechMaterialClassDto,
  CreateGeotechParameterSetDto,
  UpdateGeotechParameterSetDto,
} from './dto/create-geotech.dto';

@Injectable()
export class GeotechService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Material Classes ──────────────────────────────────────────

  async findAllClasses(pagination: PaginationDto) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.geotechMaterialClass.findMany({
        orderBy: { code: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.geotechMaterialClass.count(),
    ]);

    return paginate(data, total, page, limit);
  }

  async findClassById(id: string) {
    const cls = await this.prisma.geotechMaterialClass.findUnique({
      where: { id },
      include: { parameterSets: { take: 50, orderBy: { name: 'asc' } } },
    });
    if (!cls) throw new NotFoundException('Geotech material class not found');
    return cls;
  }

  async createClass(dto: CreateGeotechMaterialClassDto) {
    return this.prisma.geotechMaterialClass.create({
      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description,
        classification: dto.classification,
        isDemo: dto.isDemo ?? false,
      },
    });
  }

  // ── Parameter Sets ────────────────────────────────────────────

  async findParameterSets(
    organisationId: string | undefined,
    pagination: PaginationDto,
    classId?: string,
  ) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (classId) where.classId = classId;
    if (organisationId) {
      where.OR = [
        { organisationId },
        { organisationId: null, isDemo: true },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.geotechParameterSet.findMany({
        where,
        include: { class: true },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.geotechParameterSet.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findParameterSetById(id: string) {
    const ps = await this.prisma.geotechParameterSet.findUnique({
      where: { id },
      include: { class: true },
    });
    if (!ps) throw new NotFoundException('Geotech parameter set not found');
    return ps;
  }

  async createParameterSet(
    organisationId: string | undefined,
    dto: CreateGeotechParameterSetDto,
  ) {
    if (!dto.sourceStandard) {
      throw new BadRequestException('sourceStandard is required for traceability');
    }
    if (!dto.sourceEdition) {
      throw new BadRequestException('sourceEdition is required for traceability');
    }

    this.validateParameterUnits(dto.parameters);

    const cls = await this.prisma.geotechMaterialClass.findUnique({
      where: { id: dto.classId },
    });
    if (!cls) throw new NotFoundException('Geotech material class not found');

    return this.prisma.geotechParameterSet.create({
      data: {
        organisationId,
        classId: dto.classId,
        name: dto.name,
        description: dto.description,
        sourceStandard: dto.sourceStandard,
        sourceEdition: dto.sourceEdition,
        sourceAmendment: dto.sourceAmendment,
        parameters: dto.parameters as object,
        isDemo: dto.isDemo ?? false,
      },
      include: { class: true },
    });
  }

  async updateParameterSet(id: string, dto: UpdateGeotechParameterSetDto) {
    const existing = await this.prisma.geotechParameterSet.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Geotech parameter set not found');

    if (dto.parameters) {
      this.validateParameterUnits(dto.parameters);
    }

    return this.prisma.geotechParameterSet.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.sourceStandard !== undefined && { sourceStandard: dto.sourceStandard }),
        ...(dto.sourceEdition !== undefined && { sourceEdition: dto.sourceEdition }),
        ...(dto.sourceAmendment !== undefined && { sourceAmendment: dto.sourceAmendment }),
        ...(dto.parameters !== undefined && { parameters: dto.parameters as object }),
      },
      include: { class: true },
    });
  }

  async deleteParameterSet(id: string) {
    const existing = await this.prisma.geotechParameterSet.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Geotech parameter set not found');
    return this.prisma.geotechParameterSet.delete({ where: { id } });
  }

  // ── Helpers ───────────────────────────────────────────────────

  private validateParameterUnits(parameters: Record<string, unknown>) {
    for (const [key, val] of Object.entries(parameters)) {
      if (typeof val === 'object' && val !== null) {
        const param = val as Record<string, unknown>;
        if (!param.unit) {
          throw new BadRequestException(
            `Parameter "${key}" is missing required "unit" field`,
          );
        }
      }
    }
  }
}
