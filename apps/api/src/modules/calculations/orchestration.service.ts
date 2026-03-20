import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CalcEngineClient, CalcEngineDesignCheck } from './calc-engine.client';
import { SnapshotService } from './snapshot.service';
import { SubmitCalculationDto } from './dto/submit-calculation.dto';

interface ResolvedRulePack {
  id: string;
  standardCode: string;
  version: string;
  rules: Record<string, unknown>;
}

const VALID_CALC_TYPES = new Set([
  'pile_capacity', 'pile_settlement', 'pile_lateral', 'pile_group',
  'beam_check', 'column_check', 'connection_check', 'footing_check',
  'retaining_wall', 'bearing_capacity',
]);

const SI_CONVERSIONS: Record<string, { toSI: number; dimension: string }> = {
  m: { toSI: 1, dimension: 'length' },
  mm: { toSI: 0.001, dimension: 'length' },
  cm: { toSI: 0.01, dimension: 'length' },
  km: { toSI: 1000, dimension: 'length' },
  N: { toSI: 1, dimension: 'force' },
  kN: { toSI: 1000, dimension: 'force' },
  MN: { toSI: 1e6, dimension: 'force' },
  Pa: { toSI: 1, dimension: 'stress' },
  kPa: { toSI: 1000, dimension: 'stress' },
  MPa: { toSI: 1e6, dimension: 'stress' },
  GPa: { toSI: 1e9, dimension: 'stress' },
  'N·m': { toSI: 1, dimension: 'moment' },
  'kN·m': { toSI: 1000, dimension: 'moment' },
  'm²': { toSI: 1, dimension: 'area' },
  'mm²': { toSI: 1e-6, dimension: 'area' },
  'm³': { toSI: 1, dimension: 'volume' },
  'kg/m³': { toSI: 1, dimension: 'density' },
  'kN/m³': { toSI: 1000, dimension: 'unit_weight' },
  rad: { toSI: 1, dimension: 'angle' },
  deg: { toSI: Math.PI / 180, dimension: 'angle' },
};

const SI_UNIT_FOR_DIMENSION: Record<string, string> = {
  length: 'm',
  force: 'N',
  stress: 'Pa',
  moment: 'N·m',
  area: 'm²',
  volume: 'm³',
  density: 'kg/m³',
  unit_weight: 'kN/m³',
  angle: 'rad',
};

@Injectable()
export class OrchestrationService {
  private readonly logger = new Logger(OrchestrationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly calcEngineClient: CalcEngineClient,
    private readonly snapshotService: SnapshotService,
  ) {}

  async submitCalculation(projectId: string, userId: string, dto: SubmitCalculationDto) {
    this.validateRequest(dto);

    const resolvedRulePack = await this.resolveRulePack(dto.rulePack);

    const normalizedInputs = this.normalizeInputsToSI(dto.inputs);

    const requestPayload = {
      calcType: dto.calcType,
      inputs: normalizedInputs,
      loadCombinations: dto.loadCombinations,
      rulePack: resolvedRulePack,
      standardsRefs: dto.standardsRefs,
      options: dto.options,
    };

    const snapshotData = this.snapshotService.buildSnapshotData({
      inputs: normalizedInputs,
      standardsRefs: dto.standardsRefs,
      rulePack: resolvedRulePack,
      loadCombinations: dto.loadCombinations,
    });

    const run = await this.prisma.calculationRun.create({
      data: {
        projectId,
        elementId: dto.elementId,
        calculatorVersionId: dto.calculatorVersionId,
        calcType: dto.calcType,
        status: 'running',
        requestSnapshot: requestPayload,
        requestHash: snapshotData.combinedHash,
        notes: dto.notes,
        createdBy: userId,
      },
    });

    try {
      const result = await this.calcEngineClient.runCalculation(requestPayload);

      const hasErrors = result.errors && result.errors.length > 0;
      const status = hasErrors ? 'failed' : 'completed';

      const updatedRun = await this.prisma.calculationRun.update({
        where: { id: run.id },
        data: {
          status,
          resultSnapshot: result,
          durationMs: Math.round(result.durationMs),
        },
      });

      const outputSnapshot = result.outputs ? { outputs: result.outputs, steps: result.steps } : undefined;
      await this.snapshotService.createSnapshot(run.id, snapshotData, outputSnapshot);

      if (result.designChecks && result.designChecks.length > 0) {
        await this.persistDesignChecks(run.id, result.designChecks, dto);
      }

      return {
        ...updatedRun,
        result,
      };
    } catch (error) {
      await this.prisma.calculationRun.update({
        where: { id: run.id },
        data: { status: 'failed' },
      });

      await this.snapshotService.createSnapshot(run.id, snapshotData);

      throw error;
    }
  }

  private validateRequest(dto: SubmitCalculationDto): void {
    if (!VALID_CALC_TYPES.has(dto.calcType)) {
      throw new BadRequestException(
        `Invalid calcType '${dto.calcType}'. Must be one of: ${[...VALID_CALC_TYPES].join(', ')}`,
      );
    }

    if (!dto.rulePack || !dto.rulePack.rules || Object.keys(dto.rulePack.rules).length === 0) {
      throw new BadRequestException(
        'rulePack with at least one rule is required. Cannot proceed without rule-pack inputs.',
      );
    }

    if (!dto.inputs || Object.keys(dto.inputs).length === 0) {
      throw new BadRequestException('At least one input value is required.');
    }

    if (!dto.standardsRefs || dto.standardsRefs.length === 0) {
      throw new BadRequestException('At least one standards reference is required.');
    }
  }

  private async persistDesignChecks(
    runId: string,
    checks: CalcEngineDesignCheck[],
    dto: SubmitCalculationDto,
  ): Promise<void> {
    const VALID_LIMIT_STATES = ['strength', 'serviceability', 'stability'] as const;
    type PrismaLimitState = (typeof VALID_LIMIT_STATES)[number];

    const data = checks
      .filter((dc) => VALID_LIMIT_STATES.includes(dc.limitState as PrismaLimitState))
      .map((dc) => ({
        calculationRunId: runId,
        pileGroupId: dto.elementId ?? undefined,
        checkType: dc.checkType,
        limitState: dc.limitState as PrismaLimitState,
        demandValue: dc.demandValue,
        capacityValue: dc.capacityValue,
        utilisationRatio: dc.utilisationRatio,
        status: dc.status as 'pass' | 'fail' | 'warning' | 'not_checked',
        clauseRef: dc.clauseRef,
        notes: dc.notes,
      }));

    try {
      await this.prisma.pileDesignCheck.createMany({ data });
      this.logger.log(`Persisted ${data.length} design checks for run ${runId}`);
    } catch (error) {
      this.logger.error(`Failed to persist design checks: ${error}`);
    }
  }

  private async resolveRulePack(dtoRulePack: {
    id: string;
    standardCode: string;
    version: string;
    rules: Record<string, unknown>;
  }): Promise<ResolvedRulePack> {
    const dbPack = await this.prisma.standardRulePack.findUnique({
      where: { id: dtoRulePack.id },
    });

    if (dbPack) {
      const activation = await this.prisma.rulePackActivation.findFirst({
        where: { rulePackId: dbPack.id, isActive: true },
      });

      if (!activation) {
        this.logger.warn(
          `Rule pack ${dbPack.standardCode}@${dbPack.version} is not activated. ` +
          `Using rule data from request, but calculations should use approved activated rule packs.`,
        );
      }

      return {
        id: dbPack.id,
        standardCode: dbPack.standardCode,
        version: dbPack.version,
        rules: dbPack.rules as Record<string, unknown>,
      };
    }

    return dtoRulePack;
  }

  private normalizeInputsToSI(
    inputs: Record<string, { value: number; unit: string; label: string; source?: string }>,
  ): Record<string, { value: number; unit: string; label: string; source?: string }> {
    const normalized: Record<string, { value: number; unit: string; label: string; source?: string }> = {};

    for (const [key, input] of Object.entries(inputs)) {
      const conv = SI_CONVERSIONS[input.unit];
      if (conv) {
        normalized[key] = {
          value: input.value * conv.toSI,
          unit: SI_UNIT_FOR_DIMENSION[conv.dimension] ?? input.unit,
          label: input.label,
          source: input.source,
        };
      } else {
        normalized[key] = { ...input };
      }
    }

    return normalized;
  }
}
