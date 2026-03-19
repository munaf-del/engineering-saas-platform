import { Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreatePileCapacityProfileDto } from './dto/create-pile-capacity-profile.dto';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class PileCapacityService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(projectId: string, pagination: PaginationDto) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;
    const where = { projectId };

    const [data, total] = await Promise.all([
      this.prisma.pileCapacityProfile.findMany({
        where,
        include: { pile: { select: { id: true, name: true, pileType: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.pileCapacityProfile.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findById(id: string, projectId: string) {
    const profile = await this.prisma.pileCapacityProfile.findFirst({
      where: { id, projectId },
      include: { pile: true },
    });
    if (!profile) {
      throw new NotFoundException('Pile capacity profile not found');
    }
    return profile;
  }

  async create(projectId: string, dto: CreatePileCapacityProfileDto) {
    const inputSnapshot = {
      method: dto.method,
      parameters: dto.parameters,
      pileId: dto.pileId,
      soilProfileId: dto.soilProfileId,
    };

    const inputHash = createHash('sha256')
      .update(JSON.stringify(inputSnapshot, Object.keys(inputSnapshot).sort()))
      .digest('hex');

    return this.prisma.pileCapacityProfile.create({
      data: {
        projectId,
        pileId: dto.pileId,
        soilProfileId: dto.soilProfileId,
        method: dto.method,
        standardRef: dto.standardRef,
        parameters: dto.parameters,
        inputSnapshot,
        inputHash,
      },
      include: { pile: { select: { id: true, name: true, pileType: true } } },
    });
  }
}
