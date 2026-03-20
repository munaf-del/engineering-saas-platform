import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ParsedRow } from './import-parser.service';

export interface RulePackIngestResult {
  rulePackId: string;
  standardCode: string;
  version: string;
  ruleCount: number;
  contentHash: string;
  conflicts: RulePackConflictItem[];
  isNew: boolean;
}

export interface RulePackConflictItem {
  ruleKey: string;
  existingVersion: string;
  incomingVersion: string;
  existingValue?: unknown;
  incomingValue?: unknown;
}

@Injectable()
export class RulePackIngestionService {
  private readonly logger = new Logger(RulePackIngestionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async validateAndPreview(
    rows: ParsedRow[],
    entityType: 'load_combination_rules' | 'pile_design_rules',
  ): Promise<{
    standardCode: string;
    version: string;
    ruleCount: number;
    contentHash: string;
    rules: Record<string, unknown>;
    conflicts: RulePackConflictItem[];
  }> {
    if (rows.length === 0) {
      throw new BadRequestException('No rules found in import data');
    }

    const meta = (rows[0]?.data?.['_yamlMeta'] ?? {}) as Record<string, unknown>;
    const standardCode = String(meta['standardCode'] ?? '');
    const version = String(meta['version'] ?? '');

    if (!standardCode) {
      throw new BadRequestException('standardCode is required in rule-pack metadata');
    }
    if (!version) {
      throw new BadRequestException('version is required in rule-pack metadata');
    }

    const rules: Record<string, unknown> = {};
    for (const row of rows) {
      const ruleKey = String(row.data['ruleKey'] ?? row.data['rule_key'] ?? '');
      if (!ruleKey) continue;

      rules[ruleKey] = {
        clauseRef: row.data['clauseRef'] ?? row.data['clause_ref'] ?? '',
        description: row.data['description'] ?? '',
        ...(row.data['value'] !== undefined && { value: Number(row.data['value']) }),
        ...(row.data['table'] !== undefined && { table: row.data['table'] }),
        ...(row.data['formula'] !== undefined && { formula: String(row.data['formula']) }),
      };
    }

    const contentHash = createHash('sha256')
      .update(JSON.stringify({ standardCode, version, rules }))
      .digest('hex');

    const conflicts = await this.detectConflicts(standardCode, version, rules);

    return {
      standardCode,
      version,
      ruleCount: Object.keys(rules).length,
      contentHash,
      rules,
      conflicts,
    };
  }

  async ingest(
    userId: string,
    standardCode: string,
    version: string,
    rules: Record<string, unknown>,
    contentHash: string,
  ): Promise<RulePackIngestResult> {
    const existing = await this.prisma.standardRulePack.findUnique({
      where: { standardCode_version: { standardCode, version } },
    });

    if (existing) {
      if (existing.contentHash === contentHash) {
        return {
          rulePackId: existing.id,
          standardCode,
          version,
          ruleCount: Object.keys(rules).length,
          contentHash,
          conflicts: [],
          isNew: false,
        };
      }
      throw new BadRequestException(
        `Rule pack ${standardCode}@${version} already exists with different content. ` +
        `Use a new version identifier to avoid conflicts.`,
      );
    }

    const rulePack = await this.prisma.standardRulePack.create({
      data: {
        standardCode,
        version,
        contentHash,
        rules: rules as object,
        isDemo: false,
        importedBy: userId,
      },
    });

    return {
      rulePackId: rulePack.id,
      standardCode,
      version,
      ruleCount: Object.keys(rules).length,
      contentHash,
      conflicts: [],
      isNew: true,
    };
  }

  async activate(
    rulePackId: string,
    userId: string,
    importJobId?: string,
    note?: string,
  ): Promise<void> {
    const rulePack = await this.prisma.standardRulePack.findUnique({
      where: { id: rulePackId },
    });
    if (!rulePack) {
      throw new BadRequestException('Rule pack not found');
    }

    await this.prisma.$transaction([
      this.prisma.rulePackActivation.updateMany({
        where: { rulePackId: { not: rulePackId }, isActive: true },
        data: { isActive: false, deactivatedAt: new Date(), deactivatedBy: userId },
      }),
      this.prisma.rulePackActivation.create({
        data: {
          rulePackId,
          importJobId,
          activatedBy: userId,
          isActive: true,
          note,
        },
      }),
    ]);
  }

  async deactivate(rulePackId: string, userId: string): Promise<void> {
    await this.prisma.rulePackActivation.updateMany({
      where: { rulePackId, isActive: true },
      data: { isActive: false, deactivatedAt: new Date(), deactivatedBy: userId },
    });
  }

  async getActiveRulePacks(): Promise<
    Array<{ rulePackId: string; standardCode: string; version: string; activatedAt: Date }>
  > {
    const activations = await this.prisma.rulePackActivation.findMany({
      where: { isActive: true },
      include: { rulePack: true },
      orderBy: { activatedAt: 'desc' },
    });

    return activations.map((a) => ({
      rulePackId: a.rulePackId,
      standardCode: a.rulePack.standardCode,
      version: a.rulePack.version,
      activatedAt: a.activatedAt,
    }));
  }

  private async detectConflicts(
    standardCode: string,
    version: string,
    incomingRules: Record<string, unknown>,
  ): Promise<RulePackConflictItem[]> {
    const conflicts: RulePackConflictItem[] = [];

    const activations = await this.prisma.rulePackActivation.findMany({
      where: { isActive: true },
      include: { rulePack: true },
    });

    for (const activation of activations) {
      if (activation.rulePack.standardCode !== standardCode) continue;

      const existingRules = activation.rulePack.rules as Record<string, unknown>;
      for (const [key, incoming] of Object.entries(incomingRules)) {
        const existing = existingRules[key];
        if (existing !== undefined) {
          const existingEntry = existing as Record<string, unknown>;
          const incomingEntry = incoming as Record<string, unknown>;
          if (JSON.stringify(existingEntry) !== JSON.stringify(incomingEntry)) {
            conflicts.push({
              ruleKey: key,
              existingVersion: activation.rulePack.version,
              incomingVersion: version,
              existingValue: existingEntry['value'] ?? existingEntry['table'],
              incomingValue: incomingEntry['value'] ?? incomingEntry['table'],
            });
          }
        }
      }
    }

    return conflicts;
  }
}
