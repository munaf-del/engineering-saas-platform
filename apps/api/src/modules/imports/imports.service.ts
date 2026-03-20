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
import { ImportValidatorService } from './import-validator.service';
import { RulePackIngestionService } from './rule-pack-ingestion.service';
import { CreateImportJobDto } from './dto/import.dto';

export interface DiffRow {
  rowNumber: number;
  action: 'add' | 'modify' | 'remove' | 'unchanged';
  key: string;
  data?: Record<string, unknown>;
  changes?: Record<string, { old: unknown; new: unknown }>;
}

export interface DiffResult {
  meta: {
    catalogName: string;
    catalogVersion: string;
    sourceStandard: string;
    sourceEdition: string;
    sourceAmendment?: string;
  };
  added: number;
  modified: number;
  unchanged: number;
  removed: number;
  rows: DiffRow[];
}

@Injectable()
export class ImportsService {
  private readonly logger = new Logger(ImportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly parser: ImportParserService,
    private readonly validator: ImportValidatorService,
    private readonly rulePackIngestion: RulePackIngestionService,
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

      diff.meta = {
        catalogName: dto.catalogName,
        catalogVersion: dto.catalogVersion,
        sourceStandard: dto.sourceStandard,
        sourceEdition: dto.sourceEdition,
        sourceAmendment: dto.sourceAmendment,
      };

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

    const applyableStatuses = ['validated', 'approved'];
    if (!applyableStatuses.includes(job.status)) {
      throw new BadRequestException(
        `Cannot apply import in status "${job.status}". Must be "validated" or "approved".`,
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
      const diff = job.diff as DiffResult | null;
      const actionableRows = diff?.rows?.filter(
        (r) => r.action === 'add' || r.action === 'modify',
      ) ?? [];

      const meta = diff?.meta ?? {
        catalogName: 'Imported Catalog',
        catalogVersion: '1.0',
        sourceStandard: 'Unknown',
        sourceEdition: 'Unknown',
      };

      const snapshotId = await this.applyRows(job, actionableRows, meta);

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
      await this.rollbackSnapshot(job.entityType, job.snapshotId, job.diff);

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

  // ── Submit for Approval ─────────────────────────────────────

  async submitForApproval(id: string) {
    const job = await this.findById(id);
    if (job.status !== 'validated') {
      throw new BadRequestException(
        `Cannot submit for approval in status "${job.status}". Must be "validated".`,
      );
    }

    return this.prisma.importJob.update({
      where: { id },
      data: { status: 'awaiting_approval' },
    });
  }

  // ── Approve ────────────────────────────────────────────────

  async approve(id: string, userId: string, reason?: string) {
    const job = await this.findById(id);
    if (job.status !== 'awaiting_approval') {
      throw new BadRequestException(
        `Cannot approve import in status "${job.status}". Must be "awaiting_approval".`,
      );
    }

    await this.prisma.$transaction([
      this.prisma.importApproval.create({
        data: {
          importJobId: id,
          action: 'approve',
          reason,
          userId,
        },
      }),
      this.prisma.importJob.update({
        where: { id },
        data: {
          status: 'approved',
          approvedAt: new Date(),
          approvedBy: userId,
        },
      }),
    ]);

    return this.findById(id);
  }

  // ── Reject ────────────────────────────────────────────────

  async reject(id: string, userId: string, reason?: string) {
    const job = await this.findById(id);
    if (job.status !== 'awaiting_approval') {
      throw new BadRequestException(
        `Cannot reject import in status "${job.status}". Must be "awaiting_approval".`,
      );
    }

    await this.prisma.$transaction([
      this.prisma.importApproval.create({
        data: {
          importJobId: id,
          action: 'reject',
          reason,
          userId,
        },
      }),
      this.prisma.importJob.update({
        where: { id },
        data: {
          status: 'rejected',
          rejectedAt: new Date(),
          rejectedBy: userId,
          rejectionReason: reason,
        },
      }),
    ]);

    return this.findById(id);
  }

  // ── Activate (post-approval apply) ────────────────────────

  async activate(id: string, userId: string) {
    const job = await this.findById(id);

    if (job.status !== 'approved') {
      throw new BadRequestException(
        `Cannot activate import in status "${job.status}". Must be "approved".`,
      );
    }

    return this.apply(id, userId);
  }

  // ── Get Approvals ─────────────────────────────────────────

  async getApprovals(jobId: string) {
    return this.prisma.importApproval.findMany({
      where: { importJobId: jobId },
      orderBy: { createdAt: 'desc' },
    });
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
  ): Promise<DiffResult> {
    const existingMap = await this.loadExistingData(
      organisationId,
      entityType,
      catalogName,
    );

    const diffRows: DiffRow[] = [];
    const seenKeys = new Set<string>();

    for (const row of validRows) {
      const key = this.extractKey(row.data, entityType);
      seenKeys.add(key);

      const existing = existingMap.get(key);
      if (!existing) {
        diffRows.push({
          rowNumber: row.rowNumber,
          action: 'add',
          key,
          data: row.data,
        });
      } else {
        const changes = this.detectChanges(row.data, existing, entityType);
        if (Object.keys(changes).length > 0) {
          diffRows.push({
            rowNumber: row.rowNumber,
            action: 'modify',
            key,
            data: row.data,
            changes,
          });
        } else {
          diffRows.push({
            rowNumber: row.rowNumber,
            action: 'unchanged',
            key,
            data: row.data,
          });
        }
      }
    }

    let rowCounter = validRows.length;
    for (const [key] of existingMap) {
      if (!seenKeys.has(key)) {
        rowCounter++;
        diffRows.push({
          rowNumber: rowCounter,
          action: 'remove',
          key,
        });
      }
    }

    return {
      meta: {
        catalogName: catalogName ?? 'Imported Catalog',
        catalogVersion: '1.0',
        sourceStandard: 'Unknown',
        sourceEdition: 'Unknown',
      },
      added: diffRows.filter((r) => r.action === 'add').length,
      modified: diffRows.filter((r) => r.action === 'modify').length,
      unchanged: diffRows.filter((r) => r.action === 'unchanged').length,
      removed: diffRows.filter((r) => r.action === 'remove').length,
      rows: diffRows,
    };
  }

  private async loadExistingData(
    organisationId: string,
    entityType: string,
    catalogName: string,
  ): Promise<Map<string, Record<string, unknown>>> {
    const map = new Map<string, Record<string, unknown>>();

    switch (entityType) {
      case 'steel_section': {
        const activeCatalog = await this.prisma.steelSectionCatalog.findFirst({
          where: { organisationId, name: catalogName, status: 'active' },
          orderBy: { createdAt: 'desc' },
        });
        if (activeCatalog) {
          const sections = await this.prisma.steelSection.findMany({
            where: { catalogId: activeCatalog.id },
          });
          for (const s of sections) {
            map.set(s.designation, {
              designation: s.designation,
              sectionType: s.sectionType,
              ...(s.properties as Record<string, unknown>),
            });
          }
        }
        break;
      }
      case 'rebar_size': {
        const activeCatalog = await this.prisma.rebarCatalog.findFirst({
          where: { organisationId, name: catalogName, status: 'active' },
          orderBy: { createdAt: 'desc' },
        });
        if (activeCatalog) {
          const sizes = await this.prisma.rebarSize.findMany({
            where: { catalogId: activeCatalog.id },
          });
          for (const s of sizes) {
            map.set(s.designation, {
              designation: s.designation,
              barDiameter: s.barDiameter,
              nominalArea: s.nominalArea,
              massPerMetre: s.massPerMetre,
              grade: s.grade,
              ductilityClass: s.ductilityClass,
            });
          }
        }
        break;
      }
      case 'material': {
        const materials = await this.prisma.material.findMany({
          where: {
            OR: [
              { organisationId },
              { organisationId: null, isSystemDefault: true },
            ],
          },
        });
        for (const m of materials) {
          const key = `${m.name}||${m.grade ?? ''}`;
          map.set(key, {
            name: m.name,
            category: m.category,
            grade: m.grade,
            sourceStandard: m.sourceStandard,
            sourceEdition: m.sourceEdition,
            ...(m.properties as Record<string, unknown>),
          });
        }
        break;
      }
      case 'geotech_parameter': {
        const params = await this.prisma.geotechParameterSet.findMany({
          where: {
            OR: [
              { organisationId },
              { organisationId: null, isDemo: true },
            ],
          },
          include: { class: true },
        });
        for (const p of params) {
          const key = `${p.name}||${p.class?.code ?? ''}`;
          map.set(key, {
            name: p.name,
            classCode: p.class?.code,
            sourceStandard: p.sourceStandard,
            sourceEdition: p.sourceEdition,
            ...(p.parameters as Record<string, unknown>),
          });
        }
        break;
      }
      case 'standards_registry': {
        const editions = await this.prisma.standardEdition.findMany({
          include: { standard: true },
        });
        for (const e of editions) {
          const key = `${e.code}||${e.edition}`;
          map.set(key, {
            code: e.code,
            title: e.title,
            edition: e.edition,
            category: e.standard.category,
            effectiveDate: e.effectiveDate.toISOString(),
          });
        }
        break;
      }
      case 'load_combination_rules':
      case 'pile_design_rules': {
        const activations = await this.prisma.rulePackActivation.findMany({
          where: { isActive: true },
          include: { rulePack: true },
        });
        for (const a of activations) {
          const rules = a.rulePack.rules as Record<string, unknown>;
          for (const [ruleKey, ruleVal] of Object.entries(rules)) {
            map.set(`${a.rulePack.standardCode}||${ruleKey}`, ruleVal as Record<string, unknown>);
          }
        }
        break;
      }
    }

    return map;
  }

  private extractKey(data: Record<string, unknown>, entityType: string): string {
    switch (entityType) {
      case 'steel_section':
      case 'rebar_size':
        return String(data['designation'] ?? `row-unknown`);
      case 'material':
        return `${data['name'] ?? ''}||${data['grade'] ?? ''}`;
      case 'geotech_parameter':
        return `${data['name'] ?? ''}||${data['classCode'] ?? ''}`;
      case 'standards_registry':
        return `${data['code'] ?? ''}||${data['edition'] ?? ''}`;
      case 'load_combination_rules':
      case 'pile_design_rules': {
        const meta = data['_yamlMeta'] as Record<string, unknown> | undefined;
        const stdCode = meta?.['standardCode'] ?? '';
        return `${stdCode}||${data['ruleKey'] ?? data['rule_key'] ?? ''}`;
      }
      default:
        return String(data['designation'] ?? data['name'] ?? 'unknown');
    }
  }

  private detectChanges(
    incoming: Record<string, unknown>,
    existing: Record<string, unknown>,
    entityType: string,
  ): Record<string, { old: unknown; new: unknown }> {
    const changes: Record<string, { old: unknown; new: unknown }> = {};
    const compareFields = this.getCompareFields(entityType);

    for (const field of compareFields) {
      const newVal = incoming[field];
      const oldVal = existing[field];

      if (newVal === undefined || newVal === '' || newVal === null) continue;
      if (oldVal === undefined || oldVal === '' || oldVal === null) {
        changes[field] = { old: oldVal ?? null, new: newVal };
        continue;
      }

      const nNew = Number(newVal);
      const nOld = Number(oldVal);
      if (!isNaN(nNew) && !isNaN(nOld)) {
        if (Math.abs(nNew - nOld) > 1e-9) {
          changes[field] = { old: oldVal, new: newVal };
        }
      } else if (String(newVal) !== String(oldVal)) {
        changes[field] = { old: oldVal, new: newVal };
      }
    }

    return changes;
  }

  private getCompareFields(entityType: string): string[] {
    switch (entityType) {
      case 'steel_section':
        return [
          'sectionType', 'massPerMetre', 'depth', 'flangeWidth',
          'flangeThickness', 'webThickness', 'sectionArea',
          'momentOfInertiaX', 'momentOfInertiaY',
        ];
      case 'rebar_size':
        return ['barDiameter', 'nominalArea', 'massPerMetre', 'grade', 'ductilityClass'];
      case 'material':
        return ['category', 'grade', 'sourceStandard', 'sourceEdition'];
      case 'geotech_parameter':
        return [
          'sourceStandard', 'sourceEdition', 'unitWeight', 'cohesion', 'frictionAngle',
        ];
      case 'standards_registry':
        return ['title', 'category', 'effectiveDate'];
      case 'load_combination_rules':
      case 'pile_design_rules':
        return ['clauseRef', 'description', 'value', 'table', 'formula'];
      default:
        return [];
    }
  }

  // ── Apply Logic ───────────────────────────────────────────────

  private async applyRows(
    job: { id: string; organisationId: string; entityType: string },
    rows: DiffRow[],
    meta: {
      catalogName: string;
      catalogVersion: string;
      sourceStandard: string;
      sourceEdition: string;
      sourceAmendment?: string;
    },
  ): Promise<string | null> {
    switch (job.entityType) {
      case 'steel_section':
        return this.applySteelSections(job, rows, meta);
      case 'rebar_size':
        return this.applyRebarSizes(job, rows, meta);
      case 'material':
        return this.applyMaterials(job, rows, meta);
      case 'geotech_parameter':
        return this.applyGeotechParameters(job, rows, meta);
      case 'standards_registry':
        return this.applyStandardsRegistry(job, rows, meta);
      case 'load_combination_rules':
      case 'pile_design_rules':
        return this.applyRulePack(job, rows, meta);
      default:
        return null;
    }
  }

  private async applySteelSections(
    job: { id: string; organisationId: string },
    rows: DiffRow[],
    meta: {
      catalogName: string;
      catalogVersion: string;
      sourceStandard: string;
      sourceEdition: string;
      sourceAmendment?: string;
    },
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

    const sectionData = rows
      .filter((r) => r.data)
      .map((r) => {
        const d = r.data!;
        return {
          catalogId: catalog.id,
          designation: String(d['designation'] ?? r.key),
          sectionType: String(d['sectionType'] ?? 'unknown'),
          properties: d as object,
        };
      });

    if (sectionData.length > 0) {
      await this.prisma.steelSection.createMany({
        data: sectionData,
        skipDuplicates: true,
      });
    }

    const hash = this.computeSnapshotHash(sectionData);
    await this.prisma.steelSectionCatalog.update({
      where: { id: catalog.id },
      data: { snapshotHash: hash },
    });

    return catalog.id;
  }

  private async applyRebarSizes(
    job: { id: string; organisationId: string },
    rows: DiffRow[],
    meta: {
      catalogName: string;
      catalogVersion: string;
      sourceStandard: string;
      sourceEdition: string;
      sourceAmendment?: string;
    },
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

    const sizeData = rows
      .filter((r) => r.data)
      .map((r) => {
        const d = r.data!;
        return {
          catalogId: catalog.id,
          designation: String(d['designation'] ?? r.key),
          barDiameter: Number(d['barDiameter'] ?? 0),
          nominalArea: Number(d['nominalArea'] ?? 0),
          massPerMetre: Number(d['massPerMetre'] ?? 0),
          grade: String(d['grade'] ?? ''),
          ductilityClass: String(d['ductilityClass'] ?? ''),
        };
      });

    if (sizeData.length > 0) {
      await this.prisma.rebarSize.createMany({
        data: sizeData,
        skipDuplicates: true,
      });
    }

    const hash = this.computeSnapshotHash(sizeData);
    await this.prisma.rebarCatalog.update({
      where: { id: catalog.id },
      data: { snapshotHash: hash },
    });

    return catalog.id;
  }

  private async applyMaterials(
    job: { id: string; organisationId: string },
    rows: DiffRow[],
    meta: {
      catalogName: string;
      catalogVersion: string;
      sourceStandard: string;
      sourceEdition: string;
      sourceAmendment?: string;
    },
  ): Promise<string> {
    const createdIds: string[] = [];

    for (const row of rows) {
      if (!row.data) continue;
      const d = row.data;

      const category = String(d['category'] ?? 'concrete');
      const validCategories = [
        'concrete', 'structural_steel', 'reinforcing_steel',
        'soil', 'rock', 'timber',
      ];
      const resolvedCategory = validCategories.includes(category)
        ? category
        : 'concrete';

      let properties: object = {};
      if (d['properties_json']) {
        try {
          properties =
            typeof d['properties_json'] === 'string'
              ? JSON.parse(d['properties_json'] as string)
              : d['properties_json'] as object;
        } catch {
          properties = {};
        }
      }

      const material = await this.prisma.material.create({
        data: {
          organisationId: job.organisationId,
          category: resolvedCategory as any,
          name: String(d['name'] ?? ''),
          grade: d['grade'] ? String(d['grade']) : null,
          sourceStandard: String(d['sourceStandard'] ?? meta.sourceStandard),
          sourceEdition: String(d['sourceEdition'] ?? meta.sourceEdition),
          sourceAmendment: d['sourceAmendment']
            ? String(d['sourceAmendment'])
            : meta.sourceAmendment ?? null,
          properties,
          isDemo: false,
        },
      });

      createdIds.push(material.id);
    }

    await this.storeCreatedIds(job.id, createdIds);
    return job.id;
  }

  private async applyGeotechParameters(
    job: { id: string; organisationId: string },
    rows: DiffRow[],
    meta: {
      catalogName: string;
      catalogVersion: string;
      sourceStandard: string;
      sourceEdition: string;
      sourceAmendment?: string;
    },
  ): Promise<string> {
    const createdIds: string[] = [];

    for (const row of rows) {
      if (!row.data) continue;
      const d = row.data;

      const classCode = String(d['classCode'] ?? 'UNKNOWN');
      let geoClass = await this.prisma.geotechMaterialClass.findFirst({
        where: { code: classCode },
      });
      if (!geoClass) {
        geoClass = await this.prisma.geotechMaterialClass.create({
          data: {
            code: classCode,
            name: classCode,
            isDemo: false,
          },
        });
      }

      const parameters: Record<string, unknown> = {};
      const paramFields = ['unitWeight', 'cohesion', 'frictionAngle'];
      for (const f of paramFields) {
        if (d[f] !== undefined && d[f] !== '' && d[f] !== null) {
          parameters[f] = {
            value: Number(d[f]),
            unit: d[`${f}_unit`] ? String(d[`${f}_unit`]) : this.defaultUnit(f),
          };
        }
      }

      const paramSet = await this.prisma.geotechParameterSet.create({
        data: {
          organisationId: job.organisationId,
          classId: geoClass.id,
          name: String(d['name'] ?? ''),
          sourceStandard: String(d['sourceStandard'] ?? meta.sourceStandard),
          sourceEdition: String(d['sourceEdition'] ?? meta.sourceEdition),
          sourceAmendment: d['sourceAmendment']
            ? String(d['sourceAmendment'])
            : meta.sourceAmendment ?? null,
          parameters,
          isDemo: false,
        },
      });

      createdIds.push(paramSet.id);
    }

    await this.storeCreatedIds(job.id, createdIds);
    return job.id;
  }

  private async applyStandardsRegistry(
    job: { id: string; organisationId: string },
    rows: DiffRow[],
    meta: {
      catalogName: string;
      catalogVersion: string;
      sourceStandard: string;
      sourceEdition: string;
      sourceAmendment?: string;
    },
  ): Promise<string> {
    const createdIds: string[] = [];

    for (const row of rows) {
      if (!row.data) continue;
      const d = row.data;

      const code = String(d['code'] ?? '');
      const title = String(d['title'] ?? '');
      const category = String(d['category'] ?? 'general');
      const edition = String(d['edition'] ?? '');
      const sourceEdition = String(d['sourceEdition'] ?? d['source_edition'] ?? meta.sourceEdition);
      const effectiveDate = String(d['effectiveDate'] ?? d['effective_date'] ?? '');

      const validCategories = ['loading', 'concrete', 'steel', 'reinforcement', 'geotech', 'general'];
      const resolvedCategory = validCategories.includes(category) ? category : 'general';

      let standard = await this.prisma.standard.findUnique({ where: { code } });
      if (!standard) {
        standard = await this.prisma.standard.create({
          data: { code, title, category: resolvedCategory as any, isDemo: false },
        });
      }

      const stdEdition = await this.prisma.standardEdition.create({
        data: {
          standardId: standard.id,
          code,
          title,
          edition,
          amendment: d['amendment'] ? String(d['amendment']) : null,
          sourceEdition,
          sourceAmendment: d['sourceAmendment'] ? String(d['sourceAmendment']) : meta.sourceAmendment ?? null,
          effectiveDate: new Date(effectiveDate || Date.now()),
          sourceDoc: d['sourceDataset'] ? String(d['sourceDataset']) : d['source_dataset'] ? String(d['source_dataset']) : null,
          status: 'current',
          isDemo: false,
        },
      });

      createdIds.push(stdEdition.id);
    }

    await this.storeCreatedIds(job.id, createdIds);
    return job.id;
  }

  private async applyRulePack(
    job: { id: string; organisationId: string; entityType: string; createdBy?: string },
    rows: DiffRow[],
    meta: {
      catalogName: string;
      catalogVersion: string;
      sourceStandard: string;
      sourceEdition: string;
      sourceAmendment?: string;
    },
  ): Promise<string> {
    const parsedRows: ParsedRow[] = rows
      .filter((r) => r.data)
      .map((r) => ({ rowNumber: r.rowNumber, data: r.data! }));

    const preview = await this.rulePackIngestion.validateAndPreview(
      parsedRows,
      job.entityType as 'load_combination_rules' | 'pile_design_rules',
    );

    if (preview.conflicts.length > 0) {
      throw new BadRequestException(
        `Rule pack has ${preview.conflicts.length} conflicting rule(s) with active packs. ` +
        `Resolve conflicts before applying. Conflicts: ${preview.conflicts.map(c => c.ruleKey).join(', ')}`,
      );
    }

    const userId = (job as any).createdBy ?? 'system';
    const result = await this.rulePackIngestion.ingest(
      userId,
      preview.standardCode,
      preview.version,
      preview.rules,
      preview.contentHash,
    );

    await this.storeCreatedIds(job.id, [result.rulePackId]);
    return result.rulePackId;
  }

  private defaultUnit(field: string): string {
    switch (field) {
      case 'unitWeight': return 'kN/m³';
      case 'cohesion': return 'kPa';
      case 'frictionAngle': return 'degrees';
      default: return '';
    }
  }

  private async storeCreatedIds(jobId: string, ids: string[]) {
    const job = await this.prisma.importJob.findUnique({
      where: { id: jobId },
      select: { diff: true },
    });
    const diff = (job?.diff ?? {}) as Record<string, unknown>;
    diff['createdIds'] = ids;
    await this.prisma.importJob.update({
      where: { id: jobId },
      data: { diff: diff as object },
    });
  }

  // ── Rollback Logic ────────────────────────────────────────────

  private async rollbackSnapshot(
    entityType: string,
    snapshotId: string | null,
    diff: unknown,
  ) {
    switch (entityType) {
      case 'steel_section':
        if (snapshotId) {
          await this.prisma.steelSection.deleteMany({ where: { catalogId: snapshotId } });
          await this.prisma.steelSectionCatalog.delete({ where: { id: snapshotId } });
        }
        break;
      case 'rebar_size':
        if (snapshotId) {
          await this.prisma.rebarSize.deleteMany({ where: { catalogId: snapshotId } });
          await this.prisma.rebarCatalog.delete({ where: { id: snapshotId } });
        }
        break;
      case 'material': {
        const ids = this.extractCreatedIds(diff);
        if (ids.length > 0) {
          await this.prisma.material.deleteMany({ where: { id: { in: ids } } });
        }
        break;
      }
      case 'geotech_parameter': {
        const ids = this.extractCreatedIds(diff);
        if (ids.length > 0) {
          await this.prisma.geotechParameterSet.deleteMany({ where: { id: { in: ids } } });
        }
        break;
      }
      case 'standards_registry': {
        const ids = this.extractCreatedIds(diff);
        if (ids.length > 0) {
          await this.prisma.standardEdition.deleteMany({ where: { id: { in: ids } } });
        }
        break;
      }
      case 'load_combination_rules':
      case 'pile_design_rules': {
        const ids = this.extractCreatedIds(diff);
        if (ids.length > 0) {
          await this.prisma.rulePackActivation.deleteMany({ where: { rulePackId: { in: ids } } });
          await this.prisma.standardRulePack.deleteMany({ where: { id: { in: ids } } });
        }
        break;
      }
      default:
        this.logger.warn(`No rollback handler for entity type: ${entityType}`);
    }
  }

  private extractCreatedIds(diff: unknown): string[] {
    if (!diff || typeof diff !== 'object') return [];
    const d = diff as Record<string, unknown>;
    if (Array.isArray(d['createdIds'])) {
      return d['createdIds'] as string[];
    }
    return [];
  }

  // ── Helpers ───────────────────────────────────────────────────

  private computeSnapshotHash(data: unknown[]): string {
    return createHash('sha256').update(JSON.stringify(data)).digest('hex');
  }
}
