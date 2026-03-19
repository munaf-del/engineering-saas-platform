import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreatePileGroupDto } from './dto/create-pile-group.dto';
import { UpdatePileGroupDto } from './dto/update-pile-group.dto';
import { CreatePileDto } from './dto/create-pile.dto';
import { CreatePileLayoutPointDto } from './dto/create-pile-layout-point.dto';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class PileGroupsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(projectId: string, pagination: PaginationDto) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;
    const where = { projectId };

    const [data, total] = await Promise.all([
      this.prisma.pileGroup.findMany({
        where,
        include: {
          piles: true,
          layoutPoints: true,
          _count: { select: { piles: true, layoutPoints: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.pileGroup.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findById(id: string, projectId: string) {
    const group = await this.prisma.pileGroup.findFirst({
      where: { id, projectId },
      include: {
        piles: true,
        layoutPoints: { include: { pile: { select: { id: true, name: true } } } },
      },
    });
    if (!group) {
      throw new NotFoundException('Pile group not found');
    }
    return group;
  }

  async create(projectId: string, dto: CreatePileGroupDto) {
    return this.prisma.pileGroup.create({
      data: {
        projectId,
        name: dto.name,
        description: dto.description,
        metadata: dto.metadata ?? {},
      },
      include: { piles: true, layoutPoints: true },
    });
  }

  async update(id: string, projectId: string, dto: UpdatePileGroupDto) {
    await this.assertGroupExists(id, projectId);

    return this.prisma.pileGroup.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.metadata !== undefined && { metadata: dto.metadata }),
      },
      include: { piles: true, layoutPoints: true },
    });
  }

  async remove(id: string, projectId: string) {
    await this.assertGroupExists(id, projectId);
    return this.prisma.pileGroup.delete({ where: { id } });
  }

  async addPile(pileGroupId: string, projectId: string, dto: CreatePileDto) {
    await this.assertGroupExists(pileGroupId, projectId);

    return this.prisma.pile.create({
      data: {
        pileGroupId,
        name: dto.name,
        pileType: dto.pileType as any,
        diameter: dto.diameter,
        length: dto.length,
        embedmentDepth: dto.embedmentDepth,
        rakeAngle: dto.rakeAngle,
        materialId: dto.materialId,
        properties: dto.properties ?? {},
      },
    });
  }

  async updatePile(pileId: string, pileGroupId: string, projectId: string, dto: Partial<CreatePileDto>) {
    await this.assertGroupExists(pileGroupId, projectId);
    const pile = await this.prisma.pile.findFirst({ where: { id: pileId, pileGroupId } });
    if (!pile) {
      throw new NotFoundException('Pile not found');
    }

    return this.prisma.pile.update({
      where: { id: pileId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.pileType !== undefined && { pileType: dto.pileType as any }),
        ...(dto.diameter !== undefined && { diameter: dto.diameter }),
        ...(dto.length !== undefined && { length: dto.length }),
        ...(dto.embedmentDepth !== undefined && { embedmentDepth: dto.embedmentDepth }),
        ...(dto.rakeAngle !== undefined && { rakeAngle: dto.rakeAngle }),
        ...(dto.materialId !== undefined && { materialId: dto.materialId }),
        ...(dto.properties !== undefined && { properties: dto.properties }),
      },
    });
  }

  async removePile(pileId: string, pileGroupId: string, projectId: string) {
    await this.assertGroupExists(pileGroupId, projectId);
    const pile = await this.prisma.pile.findFirst({ where: { id: pileId, pileGroupId } });
    if (!pile) {
      throw new NotFoundException('Pile not found');
    }
    return this.prisma.pile.delete({ where: { id: pileId } });
  }

  async addLayoutPoint(pileGroupId: string, projectId: string, dto: CreatePileLayoutPointDto) {
    await this.assertGroupExists(pileGroupId, projectId);

    return this.prisma.pileLayoutPoint.create({
      data: {
        pileGroupId,
        pileId: dto.pileId,
        x: dto.x,
        y: dto.y,
        z: dto.z ?? 0,
        label: dto.label,
      },
    });
  }

  async removeLayoutPoint(pointId: string, pileGroupId: string, projectId: string) {
    await this.assertGroupExists(pileGroupId, projectId);
    const point = await this.prisma.pileLayoutPoint.findFirst({ where: { id: pointId, pileGroupId } });
    if (!point) {
      throw new NotFoundException('Layout point not found');
    }
    return this.prisma.pileLayoutPoint.delete({ where: { id: pointId } });
  }

  private async assertGroupExists(id: string, projectId: string) {
    const group = await this.prisma.pileGroup.findFirst({ where: { id, projectId } });
    if (!group) {
      throw new NotFoundException('Pile group not found');
    }
    return group;
  }
}
