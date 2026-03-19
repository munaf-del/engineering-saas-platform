import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class CalculationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(projectId: string, pagination: PaginationDto) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;
    const where = { projectId };

    const [data, total] = await Promise.all([
      this.prisma.calculationRun.findMany({
        where,
        include: {
          creator: { select: { id: true, email: true, name: true } },
          element: { select: { id: true, name: true, elementType: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.calculationRun.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findById(id: string, projectId: string) {
    const run = await this.prisma.calculationRun.findFirst({
      where: { id, projectId },
      include: {
        creator: { select: { id: true, email: true, name: true } },
        element: { select: { id: true, name: true, elementType: true } },
        snapshot: true,
        designChecks: true,
        reports: true,
      },
    });
    if (!run) {
      throw new NotFoundException('Calculation run not found');
    }
    return run;
  }

  async getSnapshot(runId: string, projectId: string) {
    const run = await this.prisma.calculationRun.findFirst({
      where: { id: runId, projectId },
    });
    if (!run) {
      throw new NotFoundException('Calculation run not found');
    }

    const snapshot = await this.prisma.calculationSnapshot.findUnique({
      where: { calculationRunId: runId },
    });
    if (!snapshot) {
      throw new NotFoundException('Snapshot not found for this calculation run');
    }
    return snapshot;
  }

  async getDesignChecks(runId: string, projectId: string) {
    const run = await this.prisma.calculationRun.findFirst({
      where: { id: runId, projectId },
    });
    if (!run) {
      throw new NotFoundException('Calculation run not found');
    }

    return this.prisma.pileDesignCheck.findMany({
      where: { calculationRunId: runId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
