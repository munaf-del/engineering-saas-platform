import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateLoadCaseDto } from './dto/create-load-case.dto';
import { UpdateLoadCaseDto } from './dto/update-load-case.dto';
import { CreateLoadActionDto } from './dto/create-load-action.dto';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class LoadCasesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(projectId: string, pagination: PaginationDto) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;
    const where = { projectId };

    const [data, total] = await Promise.all([
      this.prisma.loadCase.findMany({
        where,
        include: { actions: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.loadCase.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findById(id: string, projectId: string) {
    const loadCase = await this.prisma.loadCase.findFirst({
      where: { id, projectId },
      include: { actions: true },
    });
    if (!loadCase) {
      throw new NotFoundException('Load case not found');
    }
    return loadCase;
  }

  async create(projectId: string, dto: CreateLoadCaseDto) {
    return this.prisma.loadCase.create({
      data: {
        projectId,
        name: dto.name,
        category: dto.category as any,
        description: dto.description,
      },
      include: { actions: true },
    });
  }

  async update(id: string, projectId: string, dto: UpdateLoadCaseDto) {
    await this.assertExists(id, projectId);

    return this.prisma.loadCase.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.category !== undefined && { category: dto.category as any }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
      include: { actions: true },
    });
  }

  async remove(id: string, projectId: string) {
    await this.assertExists(id, projectId);
    return this.prisma.loadCase.delete({ where: { id } });
  }

  async addAction(loadCaseId: string, projectId: string, dto: CreateLoadActionDto) {
    await this.assertExists(loadCaseId, projectId);

    return this.prisma.loadAction.create({
      data: {
        loadCaseId,
        name: dto.name,
        direction: dto.direction as any,
        magnitude: dto.magnitude,
        unit: dto.unit,
        metadata: dto.metadata ?? {},
      },
    });
  }

  async removeAction(loadCaseId: string, actionId: string, projectId: string) {
    await this.assertExists(loadCaseId, projectId);

    const action = await this.prisma.loadAction.findFirst({
      where: { id: actionId, loadCaseId },
    });
    if (!action) {
      throw new NotFoundException('Load action not found');
    }

    return this.prisma.loadAction.delete({ where: { id: actionId } });
  }

  private async assertExists(id: string, projectId: string) {
    const loadCase = await this.prisma.loadCase.findFirst({
      where: { id, projectId },
    });
    if (!loadCase) {
      throw new NotFoundException('Load case not found');
    }
    return loadCase;
  }
}
