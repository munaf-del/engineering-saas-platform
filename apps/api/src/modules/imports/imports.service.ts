import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';
import { ImportParserService, ParsedRow } from './import-parser.service';
import { ImportValidatorService, RowError } from './import-validator.service';
import { CreateImportJobDto } from './dto/import.dto';

interface DiffRow {
  rowNumber: number;
  action: 'add' | 'modify' | 'remove' | 'unchanged';
  key: string;
  changes?: Record<string, { old: unknown; new: unknown }>;
}

@Injectable()
export class ImportsService {
  private readonly logger = new Logger(ImportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly parser: ImportParserService,
    private readonly validator: ImportValidatorService,
  ) {}

  // ── List Jobs ─────────────────────────────────────────────────

  async findAll(organisationId: string, pagination: PaginationDto) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;
    const where = { organisationId };

    const [data, total] = await Promise.all([
      this.prisma.importJob.findMany({
        where,
        include: { _count: { select: { errors: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.importJob.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findById(id: string) {
    const job = await this.prisma.importJob.findUnique({
      where: { id },
      include: { errors: { orderBy: { rowNumber: 'asc' } } },
    });
    if (!job) throw new NotFoundException('Import job not found');
    return job;
  }

  // ── Upload & Validate ─────────────────────────────────────────

  async uploadAndValidate(
    organisationId: string,
    userId: string,
    dto: CreateImportJobDto,
    file: { buffer: Buffer; originalname: string },
  ) {
    if (!dto.sourceStandard) {
      throw new BadRequestException('sourceStandard is required for import traceability');
    }
    if (!dto.sourceEdition) {
      throw new BadRequestException('sourceEdition is required for import traceability');
    }

    const job = await this.prisma.importJob.create({
      data: {
        organisationId,
        entityType: dto.entityType,
        format: dto.format,
        fileName: file.originalname,
        status: 'validating',
        dryRun: dto.dryRun ?? false,
        createdBy: userId,
      },
    });

    try {
      const rows = await this.parser.parse(file.buffer, dto.format, file.originalname);
      const result = this.validator.validate(rows, dto.entityType as any);

      const diff = await this.computeDiff(
        organisationId,
        dto.entityType,
        dto.catalogName,
        result.validRows,
      );

      await this.prisma.$transaction([
        this.prisma.importJob.update({
          where: { id: job.id },
          data: {
            status: result.valid ? 'validated' : 'failed',
            totalRows: rows.length,
            validRows: result.validRows.length,
            errorRows: result.errors.filter((e) => e.severity === 'error').length,
            diff: diff as object,
          },
        }),
        ...result.errors.map((err) =>
          this.prisma.importItemError.create({
            data: {
              importJobId: job.id,
              rowNumber: err.rowNumber,
              field: err.field,
              message: err.message,
              severity: err.severity,
            },
          }),
        ),
      ]);

      return this.findById(job.id);
    } catch (err) {
      await this.prisma.importJob.update({
        where: { id: job.id },
        data: { status: 'failed' },
      });
      throw err;
    }
  }

  // ── Apply Import ──────────────────────────────────────────────

  async apply(id: string, userId: string) {
    const job = await this.findById(id);

    if (job.status !== 'validated') {
      throw new BadRequestException(
        `Cannot apply import in status "${job.status}". Must be "validated".`,
      );
    }

    if (job.dryRun) {
      throw new BadRequestException(
        'Cannot apply a dry-run import. Re-upload without dryRun flag.',
      );
    }

    await this.prisma.importJob.update({
      where: { id },
      data: { status: 'applying' },
    });

    try {
      const diff = job.diff as { rows?: DiffRow[] } | null;
      const rows = diff?.rows?.filter((r) => r.action === 'add') ?? [];

      const meta = await this.extractJobMeta(job);
      const snapshotId = await this.applyRows(job, rows, meta);

      await this.prisma.importJob.update({
        where: { id },
        data: {
          status: 'applied',
          snapshotId,
          completedAt: new Date(),
        },
      });

      return this.findById(id);
    } catch (err) {
      await this.prisma.importJob.update({
        where: { id },
        data: { status: 'failed' },
      });
      throw err;
    }
  }

  // ── Rollback ──────────────────────────────────────────────────

  async rollback(id: string, userId: string) {
    const job = await this.findById(id);

    if (job.status !== 'applied') {
      throw new BadRequestException(
        `Cannot rollback import in status "${job.status}". Must be "applied".`,
      );
    }

    await this.prisma.importJob.update({
      where: { id },
      data: { status: 'rolling_back' },
    });

    try {
      if (job.snapshotId) {
        await this.rollbackSnapshot(job.entityType, job.snapshotId);
      }

      await this.prisma.importJob.update({
        where: { id },
        data: {
          status: 'rolled_back',
          rolledBackAt: new Date(),
          rolledBackBy: userId,
        },
      });

      return this.findById(id);
    } catch (err) {
      await this.prisma.importJob.update({
        where: { id },
        data: { status: 'failed' },
      });
      throw err;
    }
  }

  // ── Get Errors ────────────────────────────────────────────────

  async getErrors(jobId: string, pagination: PaginationDto) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;
    const where = { importJobId: jobId };

    const [data, total] = await Promise.all([
      this.prisma.importItemError.findMany({
        where,
        orderBy: { rowNumber: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.importItemError.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  // ── Diff Computation ──────────────────────────────────────────

  private async computeDiff(
    organisationId: string,
    entityType: string,
    catalogName: string,
    validRows: ParsedRow[],
  ): Promise<{ added: number; modified: number; unchanged: number; removed: number; rows: DiffRow[] }> {
    const diffRows: DiffRow[] = validRows.map((row) => ({
      rowNumber: row.rowNumber,
      action: 'add' as const,
      key: String(row.data['designation'] ?? row.data['name'] ?? `row-${row.rowNumber}`),
    }));

    return {
      added: diffRows.length,
      modified: 0,
      unchanged: 0,
      removed: 0,
      rows: diffRows,
    };
  }

  // ── Apply Logic ───────────────────────────────────────────────

  private async applyRows(
    job: { id: string; organisationId: string; entityType: string },
    rows: DiffRow[],
    meta: { catalogName: string; catalogVersion: string; sourceStandard: string; sourceEdition: string; sourceAmendment?: string },
  ): Promise<string | null> {
    switch (job.entityType) {
      case 'steel_section':
        return this.applySteelSections(job, meta);
      case 'rebar_size':
        return this.applyRebarSizes(job, meta);
      default:
        return null;
    }
  }

  private async applySteelSections(
    job: { id: string; organisationId: string },
    meta: { catalogName: string; catalogVersion: string; sourceStandard: string; sourceEdition: string; sourceAmendment?: string },
  ): Promise<string> {
    const catalog = await this.prisma.steelSectionCatalog.create({
      data: {
        organisationId: job.organisationId,
        name: meta.catalogName,
        version: meta.catalogVersion,
        sourceStandard: meta.sourceStandard,
        sourceEdition: meta.sourceEdition,
        sourceAmendment: meta.sourceAmendment,
        status: 'draft',
        importJobId: job.id,
      },
    });

    const diff = (await this.prisma.importJob.findUnique({
      where: { id: job.id },
      select: { diff: true },
    }))?.diff as { rows?: DiffRow[] } | null;

    if (diff?.rows) {
      for (const row of diff.rows) {
        if (row.action !== 'add') continue;
        const rowData = row as DiffRow & { data?: Record<string, unknown> };
        if (rowData.data) {
          await this.prisma.steelSection.create({
            data: {
              catalogId: catalog.id,
              designation: String(rowData.data['designation'] ?? row.key),
              sectionType: String(rowData.data['sectionType'] ?? 'unknown'),
              properties: rowData.data as object,
            },
          });
        }
      }
    }

    return catalog.id;
  }

  private async applyRebarSizes(
    job: { id: string; organisationId: string },
    meta: { catalogName: string; catalogVersion: string; sourceStandard: string; sourceEdition: string; sourceAmendment?: string },
  ): Promise<string> {
    const catalog = await this.prisma.rebarCatalog.create({
      data: {
        organisationId: job.organisationId,
        name: meta.catalogName,
        version: meta.catalogVersion,
        sourceStandard: meta.sourceStandard,
        sourceEdition: meta.sourceEdition,
        sourceAmendment: meta.sourceAmendment,
        status: 'draft',
        importJobId: job.id,
      },
    });

    return catalog.id;
  }

  // ── Rollback Logic ────────────────────────────────────────────

  private async rollbackSnapshot(entityType: string, snapshotId: string) {
    switch (entityType) {
      case 'steel_section':
        await this.prisma.steelSection.deleteMany({ where: { catalogId: snapshotId } });
        await this.prisma.steelSectionCatalog.delete({ where: { id: snapshotId } });
        break;
      case 'rebar_size':
        await this.prisma.rebarSize.deleteMany({ where: { catalogId: snapshotId } });
        await this.prisma.rebarCatalog.delete({ where: { id: snapshotId } });
        break;
      default:
        this.logger.warn(`No rollback handler for entity type: ${entityType}`);
    }
  }

  // ── Meta Extraction ───────────────────────────────────────────

  private async extractJobMeta(job: {
    id: string;
    diff: unknown;
  }): Promise<{
    catalogName: string;
    catalogVersion: string;
    sourceStandard: string;
    sourceEdition: string;
    sourceAmendment?: string;
  }> {
    const raw = await this.prisma.importJob.findUnique({
      where: { id: job.id },
    });

    const d = raw?.diff as Record<string, unknown> | null;
    return {
      catalogName: String(d?.['catalogName'] ?? 'Imported Catalog'),
      catalogVersion: String(d?.['catalogVersion'] ?? '1.0'),
      sourceStandard: String(d?.['sourceStandard'] ?? 'Unknown'),
      sourceEdition: String(d?.['sourceEdition'] ?? 'Unknown'),
      sourceAmendment: d?.['sourceAmendment'] ? String(d['sourceAmendment']) : undefined,
    };
  }
}
