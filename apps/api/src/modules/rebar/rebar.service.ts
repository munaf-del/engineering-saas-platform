import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';
import {
  CreateRebarCatalogDto,
  UpdateRebarCatalogDto,
  CreateRebarSizeDto,
} from './dto/rebar.dto';

@Injectable()
export class RebarService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Catalogs ──────────────────────────────────────────────────

  async findAllCatalogs(
    organisationId: string | undefined,
    pagination: PaginationDto,
  ) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const where = organisationId
      ? {
          OR: [
            { organisationId },
            { organisationId: null, isDemo: true },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.rebarCatalog.findMany({
        where,
        include: { _count: { select: { sizes: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.rebarCatalog.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findCatalogById(id: string) {
    const catalog = await this.prisma.rebarCatalog.findUnique({
      where: { id },
      include: { _count: { select: { sizes: true } } },
    });
    if (!catalog) throw new NotFoundException('Rebar catalog not found');
    return catalog;
  }

  async createCatalog(
    organisationId: string | undefined,
    userId: string,
    dto: CreateRebarCatalogDto,
  ) {
    if (!dto.sourceStandard) {
      throw new BadRequestException('sourceStandard is required');
    }
    if (!dto.sourceEdition) {
      throw new BadRequestException('sourceEdition is required');
    }

    return this.prisma.rebarCatalog.create({
      data: {
        organisationId,
        name: dto.name,
        version: dto.version,
        sourceStandard: dto.sourceStandard,
        sourceEdition: dto.sourceEdition,
        sourceAmendment: dto.sourceAmendment,
        status: dto.status ?? 'draft',
        isDemo: dto.isDemo ?? false,
        createdBy: userId,
        effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : null,
      },
    });
  }

  async updateCatalog(id: string, dto: UpdateRebarCatalogDto) {
    await this.assertCatalogExists(id);
    return this.prisma.rebarCatalog.update({
      where: { id },
      data: {
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.effectiveDate !== undefined && {
          effectiveDate: new Date(dto.effectiveDate),
        }),
      },
    });
  }

  async activateCatalog(id: string) {
    const catalog = await this.assertCatalogExists(id);

    const sizes = await this.prisma.rebarSize.findMany({
      where: { catalogId: id },
      orderBy: { designation: 'asc' },
    });

    const hash = createHash('sha256')
      .update(JSON.stringify(sizes.map((s) => ({
        d: s.designation,
        dia: s.barDiameter,
        a: s.nominalArea,
        m: s.massPerMetre,
        g: s.grade,
      }))))
      .digest('hex');

    if (catalog.status === 'active' && catalog.snapshotHash === hash) {
      return catalog;
    }

    await this.prisma.rebarCatalog.updateMany({
      where: {
        name: catalog.name,
        status: 'active',
        id: { not: id },
      },
      data: { status: 'superseded' },
    });

    return this.prisma.rebarCatalog.update({
      where: { id },
      data: { status: 'active', snapshotHash: hash },
    });
  }

  // ── Sizes ─────────────────────────────────────────────────────

  async findSizes(catalogId: string, pagination: PaginationDto) {
    await this.assertCatalogExists(catalogId);
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;
    const where = { catalogId };

    const [data, total] = await Promise.all([
      this.prisma.rebarSize.findMany({
        where,
        orderBy: { barDiameter: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.rebarSize.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findSizeById(id: string) {
    const size = await this.prisma.rebarSize.findUnique({
      where: { id },
      include: { catalog: true },
    });
    if (!size) throw new NotFoundException('Rebar size not found');
    return size;
  }

  async createSize(dto: CreateRebarSizeDto) {
    const catalog = await this.assertCatalogExists(dto.catalogId);
    if (catalog.status !== 'draft') {
      throw new BadRequestException(
        'Can only add sizes to catalogs in draft status',
      );
    }

    return this.prisma.rebarSize.create({
      data: {
        catalogId: dto.catalogId,
        designation: dto.designation,
        barDiameter: dto.barDiameter,
        nominalArea: dto.nominalArea,
        massPerMetre: dto.massPerMetre,
        grade: dto.grade,
        ductilityClass: dto.ductilityClass,
        standardRef: dto.standardRef,
        isDemo: dto.isDemo ?? false,
      },
    });
  }

  async bulkCreateSizes(catalogId: string, sizes: CreateRebarSizeDto[]) {
    const catalog = await this.assertCatalogExists(catalogId);
    if (catalog.status !== 'draft') {
      throw new BadRequestException(
        'Can only add sizes to catalogs in draft status',
      );
    }

    const data = sizes.map((s) => ({
      catalogId,
      designation: s.designation,
      barDiameter: s.barDiameter,
      nominalArea: s.nominalArea,
      massPerMetre: s.massPerMetre,
      grade: s.grade,
      ductilityClass: s.ductilityClass,
      standardRef: s.standardRef,
      isDemo: s.isDemo ?? false,
    }));

    return this.prisma.rebarSize.createMany({ data, skipDuplicates: true });
  }

  // ── Helpers ───────────────────────────────────────────────────

  private async assertCatalogExists(id: string) {
    const c = await this.prisma.rebarCatalog.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Rebar catalog not found');
    return c;
  }
}
