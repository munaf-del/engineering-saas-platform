import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface SnapshotInput {
  inputs: Record<string, unknown>;
  standardsRefs: unknown[];
  rulePack: unknown;
  loadCombinations: unknown[];
}

export interface SnapshotData {
  inputSnapshot: Record<string, unknown>;
  inputHash: string;
  standardsSnapshot: Record<string, unknown>;
  standardsHash: string;
  rulePackSnapshot: Record<string, unknown>;
  rulePackHash: string;
  combinedHash: string;
}

@Injectable()
export class SnapshotService {
  constructor(private readonly prisma: PrismaService) {}

  computeHash(data: unknown): string {
    const canonical = JSON.stringify(data, (_key, value) => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return Object.keys(value).sort().reduce<Record<string, unknown>>((sorted, k) => {
          sorted[k] = value[k];
          return sorted;
        }, {});
      }
      return value;
    });
    return createHash('sha256').update(canonical).digest('hex');
  }

  buildSnapshotData(input: SnapshotInput): SnapshotData {
    const inputSnapshot = {
      inputs: input.inputs,
      loadCombinations: input.loadCombinations,
    };
    const inputHash = this.computeHash(inputSnapshot);

    const standardsSnapshot = { standardsRefs: input.standardsRefs };
    const standardsHash = this.computeHash(standardsSnapshot);

    const rulePackSnapshot = { rulePack: input.rulePack };
    const rulePackHash = this.computeHash(rulePackSnapshot);

    const combinedHash = this.computeHash({
      inputHash,
      standardsHash,
      rulePackHash,
    });

    return {
      inputSnapshot,
      inputHash,
      standardsSnapshot,
      standardsHash,
      rulePackSnapshot,
      rulePackHash,
      combinedHash,
    };
  }

  async createSnapshot(
    calculationRunId: string,
    snapshotData: SnapshotData,
    outputSnapshot?: Record<string, unknown>,
  ) {
    const outputHash = outputSnapshot ? this.computeHash(outputSnapshot) : undefined;

    const finalCombinedHash = outputHash
      ? this.computeHash({
          inputHash: snapshotData.inputHash,
          standardsHash: snapshotData.standardsHash,
          rulePackHash: snapshotData.rulePackHash,
          outputHash,
        })
      : snapshotData.combinedHash;

    return this.prisma.calculationSnapshot.create({
      data: {
        calculationRunId,
        inputSnapshot: snapshotData.inputSnapshot,
        inputHash: snapshotData.inputHash,
        standardsSnapshot: snapshotData.standardsSnapshot,
        standardsHash: snapshotData.standardsHash,
        rulePackSnapshot: snapshotData.rulePackSnapshot,
        rulePackHash: snapshotData.rulePackHash,
        outputSnapshot: outputSnapshot ?? undefined,
        outputHash,
        combinedHash: finalCombinedHash,
      },
    });
  }

  async verifySnapshot(snapshotId: string): Promise<{ valid: boolean; mismatches: string[] }> {
    const snapshot = await this.prisma.calculationSnapshot.findUnique({
      where: { id: snapshotId },
    });

    if (!snapshot) {
      return { valid: false, mismatches: ['snapshot_not_found'] };
    }

    const mismatches: string[] = [];

    const recomputedInputHash = this.computeHash(snapshot.inputSnapshot);
    if (recomputedInputHash !== snapshot.inputHash) {
      mismatches.push('input_hash');
    }

    const recomputedStandardsHash = this.computeHash(snapshot.standardsSnapshot);
    if (recomputedStandardsHash !== snapshot.standardsHash) {
      mismatches.push('standards_hash');
    }

    const recomputedRulePackHash = this.computeHash(snapshot.rulePackSnapshot);
    if (recomputedRulePackHash !== snapshot.rulePackHash) {
      mismatches.push('rule_pack_hash');
    }

    if (snapshot.outputSnapshot && snapshot.outputHash) {
      const recomputedOutputHash = this.computeHash(snapshot.outputSnapshot);
      if (recomputedOutputHash !== snapshot.outputHash) {
        mismatches.push('output_hash');
      }
    }

    return { valid: mismatches.length === 0, mismatches };
  }
}
