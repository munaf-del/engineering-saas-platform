import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class StandardsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.standardEdition.findMany({
      orderBy: { code: 'asc' },
    });
  }

  async findByCode(code: string) {
    return this.prisma.standardEdition.findMany({
      where: { code },
      orderBy: { effectiveDate: 'desc' },
    });
  }

  async findCurrent() {
    return this.prisma.standardEdition.findMany({
      where: { status: 'current' },
      orderBy: { code: 'asc' },
    });
  }
}
