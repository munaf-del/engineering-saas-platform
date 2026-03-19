import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';
import { CreateStandardDto, UpdateStandardDto } from './dto/create-standard.dto';
import { CreateStandardEditionDto } from './dto/create-standard-edition.dto';
import {
  CreateStandardsProfileDto,
  UpdateStandardsProfileDto,
} from './dto/standards-profile.dto';

@Injectable()
export class StandardsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Standards CRUD ────────────────────────────────────────────

  async findAllStandards(pagination: PaginationDto) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.standard.findMany({
        include: { editions: { orderBy: { effectiveDate: 'desc' } } },
        orderBy: { code: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.standard.count(),
    ]);

    return paginate(data, total, page, limit);
  }

  async findStandardByCode(code: string) {
    const standard = await this.prisma.standard.findUnique({
      where: { code },
      include: { editions: { orderBy: { effectiveDate: 'desc' } } },
    });
    if (!standard) throw new NotFoundException(`Standard ${code} not found`);
    return standard;
  }

  async createStandard(dto: CreateStandardDto) {
    return this.prisma.standard.create({
      data: {
        code: dto.code,
        title: dto.title,
        category: dto.category,
        isDemo: dto.isDemo ?? false,
      },
      include: { editions: true },
    });
  }

  async updateStandard(id: string, dto: UpdateStandardDto) {
    await this.assertStandardExists(id);
    return this.prisma.standard.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.category !== undefined && { category: dto.category }),
      },
      include: { editions: true },
    });
  }

  // ── Standard Editions ─────────────────────────────────────────

  async findAll(pagination: PaginationDto) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.standardEdition.findMany({
        include: { standard: true },
        orderBy: { code: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.standardEdition.count(),
    ]);

    return paginate(data, total, page, limit);
  }

  async findCurrent(pagination: PaginationDto) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;
    const where = { status: 'current' as const };

    const [data, total] = await Promise.all([
      this.prisma.standardEdition.findMany({
        where,
        include: { standard: true },
        orderBy: { code: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.standardEdition.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findByCode(code: string) {
    return this.prisma.standardEdition.findMany({
      where: { code },
      include: { standard: true, clauseRefs: true },
      orderBy: { effectiveDate: 'desc' },
    });
  }

  async createEdition(dto: CreateStandardEditionDto) {
    const standard = await this.prisma.standard.findUnique({
      where: { id: dto.standardId },
    });
    if (!standard) {
      throw new BadRequestException(`Standard ${dto.standardId} not found`);
    }

    if (!dto.sourceEdition) {
      throw new BadRequestException('sourceEdition is required for traceability');
    }
    if (!dto.effectiveDate) {
      throw new BadRequestException('effectiveDate is required');
    }

    return this.prisma.standardEdition.create({
      data: {
        standardId: dto.standardId,
        code: standard.code,
        title: standard.title,
        edition: dto.edition,
        amendment: dto.amendment,
        sourceEdition: dto.sourceEdition,
        sourceAmendment: dto.sourceAmendment,
        clauseRef: dto.clauseRef,
        note: dto.note,
        sourceDoc: dto.sourceDoc,
        effectiveDate: new Date(dto.effectiveDate),
        status: dto.status ?? 'current',
        isDemo: dto.isDemo ?? false,
      },
      include: { standard: true },
    });
  }

  // ── Standards Profiles ────────────────────────────────────────

  async findProfiles(organisationId: string, pagination: PaginationDto) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;
    const where = { organisationId };

    const [data, total] = await Promise.all([
      this.prisma.standardsProfile.findMany({
        where,
        include: {
          pinnedStandards: {
            include: { standardEdition: { include: { standard: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.standardsProfile.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findProfileById(id: string, organisationId: string) {
    const profile = await this.prisma.standardsProfile.findFirst({
      where: { id, organisationId },
      include: {
        pinnedStandards: {
          include: { standardEdition: { include: { standard: true } } },
        },
        projects: { select: { id: true, name: true, code: true } },
      },
    });
    if (!profile) throw new NotFoundException('Standards profile not found');
    return profile;
  }

  async createProfile(organisationId: string, dto: CreateStandardsProfileDto) {
    return this.prisma.standardsProfile.create({
      data: {
        organisationId,
        name: dto.name,
        description: dto.description,
        isDefault: dto.isDefault ?? false,
      },
      include: { pinnedStandards: true },
    });
  }

  async updateProfile(
    id: string,
    organisationId: string,
    dto: UpdateStandardsProfileDto,
  ) {
    await this.assertProfileExists(id, organisationId);
    return this.prisma.standardsProfile.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
      },
      include: { pinnedStandards: true },
    });
  }

  async deleteProfile(id: string, organisationId: string) {
    await this.assertProfileExists(id, organisationId);
    return this.prisma.standardsProfile.delete({ where: { id } });
  }

  // ── Pinning ───────────────────────────────────────────────────

  async pinStandard(profileId: string, organisationId: string, editionId: string) {
    await this.assertProfileExists(profileId, organisationId);
    await this.assertEditionExists(editionId);

    return this.prisma.pinnedStandard.create({
      data: { standardsProfileId: profileId, standardEditionId: editionId },
      include: { standardEdition: { include: { standard: true } } },
    });
  }

  async unpinStandard(profileId: string, organisationId: string, editionId: string) {
    await this.assertProfileExists(profileId, organisationId);

    const pin = await this.prisma.pinnedStandard.findUnique({
      where: {
        standardsProfileId_standardEditionId: {
          standardsProfileId: profileId,
          standardEditionId: editionId,
        },
      },
    });
    if (!pin) throw new NotFoundException('Pinned standard not found');

    return this.prisma.pinnedStandard.delete({ where: { id: pin.id } });
  }

  async bulkPinStandards(
    profileId: string,
    organisationId: string,
    editionIds: string[],
  ) {
    await this.assertProfileExists(profileId, organisationId);

    const editions = await this.prisma.standardEdition.findMany({
      where: { id: { in: editionIds } },
    });
    if (editions.length !== editionIds.length) {
      const found = new Set(editions.map((e) => e.id));
      const missing = editionIds.filter((id) => !found.has(id));
      throw new BadRequestException(`Standard editions not found: ${missing.join(', ')}`);
    }

    const data = editionIds.map((editionId) => ({
      standardsProfileId: profileId,
      standardEditionId: editionId,
    }));

    await this.prisma.pinnedStandard.createMany({
      data,
      skipDuplicates: true,
    });

    return this.findProfileById(profileId, organisationId);
  }

  // ── Project Standard Assignments ──────────────────────────────

  async getProjectAssignments(projectId: string, organisationId: string) {
    await this.assertProjectInOrg(projectId, organisationId);
    return this.prisma.projectStandardAssignment.findMany({
      where: { projectId },
      include: { standardEdition: { include: { standard: true } } },
      orderBy: { pinnedAt: 'desc' },
    });
  }

  async assignProjectStandard(
    projectId: string,
    organisationId: string,
    editionId: string,
    userId: string,
    notes?: string,
  ) {
    await this.assertProjectInOrg(projectId, organisationId);
    await this.assertEditionExists(editionId);

    return this.prisma.projectStandardAssignment.create({
      data: {
        projectId,
        standardEditionId: editionId,
        pinnedBy: userId,
        notes,
      },
      include: { standardEdition: { include: { standard: true } } },
    });
  }

  async removeProjectAssignment(
    projectId: string,
    organisationId: string,
    editionId: string,
  ) {
    await this.assertProjectInOrg(projectId, organisationId);

    const assignment = await this.prisma.projectStandardAssignment.findUnique({
      where: {
        projectId_standardEditionId: { projectId, standardEditionId: editionId },
      },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');

    return this.prisma.projectStandardAssignment.delete({
      where: { id: assignment.id },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────

  private async assertStandardExists(id: string) {
    const s = await this.prisma.standard.findUnique({ where: { id } });
    if (!s) throw new NotFoundException('Standard not found');
    return s;
  }

  private async assertEditionExists(id: string) {
    const e = await this.prisma.standardEdition.findUnique({ where: { id } });
    if (!e) throw new NotFoundException('Standard edition not found');
    return e;
  }

  private async assertProfileExists(id: string, organisationId: string) {
    const p = await this.prisma.standardsProfile.findFirst({
      where: { id, organisationId },
    });
    if (!p) throw new NotFoundException('Standards profile not found');
    return p;
  }

  private async assertProjectInOrg(projectId: string, organisationId: string) {
    const p = await this.prisma.project.findFirst({
      where: { id: projectId, organisationId },
    });
    if (!p) throw new NotFoundException('Project not found');
    return p;
  }
}
