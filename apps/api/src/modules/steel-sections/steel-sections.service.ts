import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';
import {
  CreateSteelSectionCatalogDto,
  UpdateSteelSectionCatalogDto,
  CreateSteelSectionDto,
} from './dto/steel-section.dto';

@Injectable()
export class SteelSectionsService {
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
      this.prisma.steelSectionCatalog.findMany({
        where,
        include: { _count: { select: { sections: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.steelSectionCatalog.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findCatalogById(id: string) {
    const catalog = await this.prisma.steelSectionCatalog.findUnique({
      where: { id },
      include: { _count: { select: { sections: true } } },
    });
    if (!catalog) throw new NotFoundException('Steel section catalog not found');
    return catalog;
  }

  async createCatalog(
    organisationId: string | undefined,
    userId: string,
    dto: CreateSteelSectionCatalogDto,
  ) {
    if (!dto.sourceStandard) {
      throw new BadRequestException('sourceStandard is required');
    }
    if (!dto.sourceEdition) {
      throw new BadRequestException('sourceEdition is required');
    }

    return this.prisma.steelSectionCatalog.create({
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

  async updateCatalog(id: string, dto: UpdateSteelSectionCatalogDto) {
    await this.assertCatalogExists(id);
    return this.prisma.steelSectionCatalog.update({
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

    const sections = await this.prisma.steelSection.findMany({
      where: { catalogId: id },
      orderBy: { designation: 'asc' },
    });

    const hash = createHash('sha256')
      .update(JSON.stringify(sections.map((s) => ({ d: s.designation, p: s.properties }))))
      .digest('hex');

    if (catalog.status === 'active' && catalog.snapshotHash === hash) {
      return catalog;
    }

    await this.prisma.steelSectionCatalog.updateMany({
      where: {
        name: catalog.name,
        status: 'active',
        id: { not: id },
      },
      data: { status: 'superseded' },
    });

    return this.prisma.steelSectionCatalog.update({
      where: { id },
      data: { status: 'active', snapshotHash: hash },
    });
  }

  // ── Sections ──────────────────────────────────────────────────

  async findSections(catalogId: string, pagination: PaginationDto) {
    await this.assertCatalogExists(catalogId);
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;
    const where = { catalogId };

    const [data, total] = await Promise.all([
      this.prisma.steelSection.findMany({
        where,
        orderBy: { designation: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.steelSection.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findSectionById(id: string) {
    const section = await this.prisma.steelSection.findUnique({
      where: { id },
      include: { catalog: true },
    });
    if (!section) throw new NotFoundException('Steel section not found');
    return section;
  }

  async createSection(dto: CreateSteelSectionDto) {
    const catalog = await this.assertCatalogExists(dto.catalogId);
    if (catalog.status !== 'draft') {
      throw new BadRequestException(
        'Can only add sections to catalogs in draft status',
      );
    }

    return this.prisma.steelSection.create({
      data: {
        catalogId: dto.catalogId,
        designation: dto.designation,
        sectionType: dto.sectionType,
        properties: dto.properties as object,
        standardRef: dto.standardRef,
        sourceDoc: dto.sourceDoc,
        isDemo: dto.isDemo ?? false,
      },
    });
  }

  async bulkCreateSections(
    catalogId: string,
    sections: CreateSteelSectionDto[],
  ) {
    const catalog = await this.assertCatalogExists(catalogId);
    if (catalog.status !== 'draft') {
      throw new BadRequestException(
        'Can only add sections to catalogs in draft status',
      );
    }

    const data = sections.map((s) => ({
      catalogId,
      designation: s.designation,
      sectionType: s.sectionType,
      properties: s.properties as object,
      standardRef: s.standardRef,
      sourceDoc: s.sourceDoc,
      isDemo: s.isDemo ?? false,
    }));

    return this.prisma.steelSection.createMany({ data, skipDuplicates: true });
  }

  // ── Helpers ───────────────────────────────────────────────────

  private async assertCatalogExists(id: string) {
    const c = await this.prisma.steelSectionCatalog.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Steel section catalog not found');
    return c;
  }
}
