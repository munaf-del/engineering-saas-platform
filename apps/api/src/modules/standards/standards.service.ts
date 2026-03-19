import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class StandardsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(pagination: PaginationDto) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.standardEdition.findMany({
        orderBy: { code: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.standardEdition.count(),
    ]);

    return paginate(data, total, page, limit);
  }

  async findByCode(code: string) {
    return this.prisma.standardEdition.findMany({
      where: { code },
      orderBy: { effectiveDate: 'desc' },
    });
  }

  async findCurrent(pagination: PaginationDto) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const where = { status: 'current' as const };

    const [data, total] = await Promise.all([
      this.prisma.standardEdition.findMany({
        where,
        orderBy: { code: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.standardEdition.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }
}
