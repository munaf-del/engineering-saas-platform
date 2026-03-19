import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateLoadCombinationSetDto } from './dto/create-load-combination-set.dto';
import { UpdateLoadCombinationSetDto } from './dto/update-load-combination-set.dto';
import { CreateLoadCombinationDto } from './dto/create-load-combination.dto';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class LoadCombinationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllSets(projectId: string, pagination: PaginationDto) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;
    const where = { projectId };

    const [data, total] = await Promise.all([
      this.prisma.loadCombinationSet.findMany({
        where,
        include: { combinations: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.loadCombinationSet.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findSetById(id: string, projectId: string) {
    const set = await this.prisma.loadCombinationSet.findFirst({
      where: { id, projectId },
      include: { combinations: true },
    });
    if (!set) {
      throw new NotFoundException('Load combination set not found');
    }
    return set;
  }

  async createSet(projectId: string, dto: CreateLoadCombinationSetDto) {
    return this.prisma.loadCombinationSet.create({
      data: {
        projectId,
        name: dto.name,
        standardRef: dto.standardRef,
        description: dto.description,
      },
      include: { combinations: true },
    });
  }

  async updateSet(id: string, projectId: string, dto: UpdateLoadCombinationSetDto) {
    await this.assertSetExists(id, projectId);

    return this.prisma.loadCombinationSet.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.standardRef !== undefined && { standardRef: dto.standardRef }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
      include: { combinations: true },
    });
  }

  async removeSet(id: string, projectId: string) {
    await this.assertSetExists(id, projectId);
    return this.prisma.loadCombinationSet.delete({ where: { id } });
  }

  async addCombination(setId: string, projectId: string, dto: CreateLoadCombinationDto) {
    await this.assertSetExists(setId, projectId);

    return this.prisma.loadCombination.create({
      data: {
        setId,
        name: dto.name,
        limitState: dto.limitState as any,
        clauseRef: dto.clauseRef,
        factors: dto.factors,
      },
    });
  }

  async removeCombination(setId: string, combinationId: string, projectId: string) {
    await this.assertSetExists(setId, projectId);

    const combination = await this.prisma.loadCombination.findFirst({
      where: { id: combinationId, setId },
    });
    if (!combination) {
      throw new NotFoundException('Load combination not found');
    }

    return this.prisma.loadCombination.delete({ where: { id: combinationId } });
  }

  private async assertSetExists(id: string, projectId: string) {
    const set = await this.prisma.loadCombinationSet.findFirst({
      where: { id, projectId },
    });
    if (!set) {
      throw new NotFoundException('Load combination set not found');
    }
    return set;
  }
}
