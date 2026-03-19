import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateCalculatorDto } from './dto/create-calculator.dto';
import { CreateCalculatorVersionDto } from './dto/create-calculator-version.dto';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class CalculatorsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(pagination: PaginationDto) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.calculatorDefinition.findMany({
        include: {
          versions: {
            where: { status: 'active' },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.calculatorDefinition.count(),
    ]);

    return paginate(data, total, page, limit);
  }

  async findById(id: string) {
    const definition = await this.prisma.calculatorDefinition.findUnique({
      where: { id },
      include: { versions: { orderBy: { createdAt: 'desc' } } },
    });
    if (!definition) {
      throw new NotFoundException('Calculator definition not found');
    }
    return definition;
  }

  async findByCode(code: string) {
    const definition = await this.prisma.calculatorDefinition.findUnique({
      where: { code },
      include: { versions: { orderBy: { createdAt: 'desc' } } },
    });
    if (!definition) {
      throw new NotFoundException('Calculator definition not found');
    }
    return definition;
  }

  async create(dto: CreateCalculatorDto) {
    const existing = await this.prisma.calculatorDefinition.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException(`Calculator with code '${dto.code}' already exists`);
    }

    return this.prisma.calculatorDefinition.create({
      data: {
        code: dto.code,
        name: dto.name,
        calcType: dto.calcType,
        description: dto.description,
        category: dto.category,
      },
    });
  }

  async listVersions(definitionId: string) {
    await this.assertDefinitionExists(definitionId);
    return this.prisma.calculatorVersion.findMany({
      where: { definitionId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createVersion(definitionId: string, dto: CreateCalculatorVersionDto) {
    await this.assertDefinitionExists(definitionId);

    return this.prisma.calculatorVersion.create({
      data: {
        definitionId,
        version: dto.version,
        inputSchema: dto.inputSchema,
        outputSchema: dto.outputSchema,
        defaultInputs: dto.defaultInputs,
        status: (dto.status as any) ?? 'draft',
        releaseNotes: dto.releaseNotes,
      },
    });
  }

  async getActiveVersion(definitionId: string) {
    const version = await this.prisma.calculatorVersion.findFirst({
      where: { definitionId, status: 'active' },
      orderBy: { createdAt: 'desc' },
    });
    if (!version) {
      throw new NotFoundException('No active version found for this calculator');
    }
    return version;
  }

  private async assertDefinitionExists(id: string) {
    const def = await this.prisma.calculatorDefinition.findUnique({ where: { id } });
    if (!def) {
      throw new NotFoundException('Calculator definition not found');
    }
    return def;
  }
}
