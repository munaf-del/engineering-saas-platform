import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { Prisma } from '@prisma/client';

@Injectable()
export class OrganisationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.organisation.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    return this.prisma.organisation.findUnique({ where: { id } });
  }

  async create(data: Prisma.OrganisationCreateInput) {
    return this.prisma.organisation.create({ data });
  }
}
