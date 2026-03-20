import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateCalculatorDto } from './dto/create-calculator.dto';
import { CreateCalculatorVersionDto } from './dto/create-calculator-version.dto';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

const V1_CALCULATOR_SEEDS = [
  {
    code: 'pile-group-v1',
    name: 'Pile Group Analysis',
    calcType: 'pile_group',
    description: 'Rigid cap pile group reaction distribution with design checks',
    category: 'geotechnical',
    version: '1.0.0',
    inputSchema: {
      type: 'object',
      properties: {
        grid_nx: { type: 'number', description: 'Grid columns (grid layout)' },
        grid_ny: { type: 'number', description: 'Grid rows (grid layout)' },
        grid_spacing_x: { type: 'number', description: 'Grid X spacing in m' },
        grid_spacing_y: { type: 'number', description: 'Grid Y spacing in m' },
        pile_count: { type: 'number', description: 'Pile count (explicit layout)' },
        pile_diameter: { type: 'number', description: 'Pile diameter in m' },
        pile_length: { type: 'number', description: 'Pile length in m' },
        compression_capacity: { type: 'number', description: 'Ultimate compression capacity in N' },
        tension_capacity: { type: 'number', description: 'Ultimate tension capacity in N' },
        lateral_capacity: { type: 'number', description: 'Ultimate lateral capacity in N' },
      },
    },
    outputSchema: {
      type: 'object',
      properties: {
        num_piles: { type: 'number' },
        num_combinations: { type: 'number' },
      },
    },
  },
] as const;

@Injectable()
export class CalculatorsService {
  private readonly logger = new Logger(CalculatorsService.name);

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

  async seedV1Calculators(): Promise<{ created: number; skipped: number }> {
    let created = 0;
    let skipped = 0;

    for (const seed of V1_CALCULATOR_SEEDS) {
      const existing = await this.prisma.calculatorDefinition.findUnique({
        where: { code: seed.code },
      });
      if (existing) {
        skipped++;
        continue;
      }

      const def = await this.prisma.calculatorDefinition.create({
        data: {
          code: seed.code,
          name: seed.name,
          calcType: seed.calcType,
          description: seed.description,
          category: seed.category,
        },
      });

      await this.prisma.calculatorVersion.create({
        data: {
          definitionId: def.id,
          version: seed.version,
          inputSchema: seed.inputSchema,
          outputSchema: seed.outputSchema,
          status: 'active',
          releaseNotes: 'v1 initial release — rigid cap pile group analysis.',
        },
      });

      this.logger.log(`Seeded calculator: ${seed.code} v${seed.version}`);
      created++;
    }

    return { created, skipped };
  }

  private async assertDefinitionExists(id: string) {
    const def = await this.prisma.calculatorDefinition.findUnique({ where: { id } });
    if (!def) {
      throw new NotFoundException('Calculator definition not found');
    }
    return def;
  }
}
