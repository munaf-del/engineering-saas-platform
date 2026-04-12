import { describe, expect, it } from 'vitest';
import type { MultiPileEnvelopeRunSummary, MultiPileState } from '@eng/shared';
import { buildMultiPileEnvelopeInputSignature } from '@eng/shared';
import {
  findSuggestedPileTypeForEnvelopeExtremes,
  materializeAutoAssignedPileTypes,
  summarizePileTypeUltimateRange,
} from './utils';

function stateFixture(): MultiPileState {
  return {
    version: 1,
    combinationSettings: {
      alpha: 0.015,
      psiC: 0.4,
      psiE: 0.3,
      psiL: 0.4,
      groundwaterFactor: 1.2,
      minPermanentFactor: 0.9,
      reduceMinimumPermanentWithPointNine: false,
    },
    pileTypes: [
      {
        id: 'BP1',
        displayName: 'BP1',
        sizePreset: '450',
        useCustom: false,
        customMm: 450,
        Dmm: 450,
        nominalDiameterMm: 450,
        eoop: 0.075,
        eoopM: 0.075,
        compressionUltimateMin: 0,
        compressionUltimateMax: 400,
        tensionUltimateMin: 0,
        tensionUltimateMax: 120,
        active: true,
        order: 0,
      },
      {
        id: 'BP2',
        displayName: 'BP2',
        sizePreset: '600',
        useCustom: false,
        customMm: 600,
        Dmm: 600,
        nominalDiameterMm: 600,
        eoop: 0.075,
        eoopM: 0.075,
        compressionUltimateMin: 450,
        compressionUltimateMax: 650,
        tensionUltimateMin: 0,
        tensionUltimateMax: 150,
        active: true,
        order: 1,
      },
      {
        id: 'BP3',
        displayName: 'BP3',
        sizePreset: '900',
        useCustom: false,
        customMm: 900,
        Dmm: 900,
        nominalDiameterMm: 900,
        eoop: 0.075,
        eoopM: 0.075,
        compressionUltimateMin: null,
        compressionUltimateMax: 700,
        tensionUltimateMin: 0,
        tensionUltimateMax: 180,
        active: true,
        order: 2,
      },
    ],
    geoArrSettings: {
      irrValues: [1, 1, 1, 1, 1],
      testType: 'NONE',
      testPilePercentage: 0,
      weightTotal: 0,
      weightedScore: 0,
      arrValue: 0,
      arrBand: '',
      phiTf: null,
      testBenefitK: 1,
      phiGbLow: 0.5,
      phiGbHigh: 0.6,
      phiGLow: 0.5,
      phiGHigh: 0.6,
    },
    geoTypeSettings: {},
    geoResults: {},
    joints: [
      {
        id: 'J1',
        displayName: 'J1',
        jointDisplayName: 'J1',
        x: 0,
        y: 0,
        z: 0,
        supportCount: 1,
        noOfSupports: 1,
        pileTypeId: 'BP1',
        assignmentMode: 'auto',
        active: true,
        order: 0,
      },
    ],
    generatedPiles: [
      {
        id: 'J1-P1',
        parentJointId: 'J1',
        supportIndex: 1,
        supportCount: 1,
        pileTypeId: 'BP1',
      },
    ],
    loadPatterns: [
      {
        id: 'G',
        displayName: 'G',
        patternType: 'Permanent',
        reversible: false,
        enabled: true,
        order: 0,
      },
    ],
    jointLoads: [
      {
        jointId: 'J1',
        patternId: 'G',
        p: 100,
        vx: 0,
        vy: 0,
        mx: 0,
        my: 0,
        mz: 0,
      },
    ],
    combinationLibrary: [
      {
        id: 'ULS1',
        displayName: 'ULS1',
        source: 'built-in',
        kind: 'linear',
        enabled: true,
        includeInEnvelope: true,
        order: 0,
      },
    ],
    selectedCombinations: ['ULS1'],
    uiState: {},
  };
}

function latestRunFixture(state: MultiPileState): MultiPileEnvelopeRunSummary {
  return {
    runId: 'run-1',
    status: 'completed',
    createdAt: '2026-04-08T09:00:00.000Z',
    envelope: {
      version: 1,
      generatedAt: '2026-04-08T09:00:00.000Z',
      pileGroupId: 'group-1',
      jointResults: [
        {
          jointId: 'J1',
          jointDisplayName: 'J1',
          pileTypeId: 'BP1',
          representativePileId: 'J1-P1',
          activePatternIds: ['G'],
          nMax: {
            value: 500,
            combinationId: 'ULS1',
            combinationName: 'ULS1',
            source: 'built-in',
          },
          nMin: {
            value: -100,
            combinationId: 'ULS1',
            combinationName: 'ULS1',
            source: 'built-in',
          },
          vx: {
            value: 0,
            combinationId: 'ULS1',
            combinationName: 'ULS1',
            source: 'built-in',
          },
          vy: {
            value: 0,
            combinationId: 'ULS1',
            combinationName: 'ULS1',
            source: 'built-in',
          },
          mx: {
            value: 0,
            combinationId: 'ULS1',
            combinationName: 'ULS1',
            source: 'built-in',
          },
          my: {
            value: 0,
            combinationId: 'ULS1',
            combinationName: 'ULS1',
            source: 'built-in',
          },
        },
      ],
      projectSummary: {
        jointCount: 1,
        evaluatedCombinationCount: 1,
        governingCombinationCount: 1,
        activePatternCount: 1,
      },
    },
    warnings: [],
    errors: [],
  };
}

describe('multi-pile range matching helpers', () => {
  it('marks pile types with missing axis data as incomplete for auto-matching', () => {
    expect(
      summarizePileTypeUltimateRange({
        compressionUltimateMin: null,
        compressionUltimateMax: 500,
        tensionUltimateMin: null,
        tensionUltimateMax: null,
      }),
    ).toMatchObject({
      participatesInAutoMatching: false,
      label: 'Tension range missing',
    });
  });

  it('chooses the smallest adequate active pile type deterministically', () => {
    const state = stateFixture();
    const suggestion = findSuggestedPileTypeForEnvelopeExtremes(state.pileTypes, {
      maxCompression: 500,
      maxTension: 100,
    });

    expect(suggestion?.id).toBe('BP2');
  });

  it('materializes auto-assigned joints from the current envelope suggestion', () => {
    const state = stateFixture();
    state.uiState = {
      envelope: {
        lastRunInputSignature: buildMultiPileEnvelopeInputSignature(state),
      },
    };
    const latestRun = latestRunFixture(state);

    const nextState = materializeAutoAssignedPileTypes(state, latestRun);

    expect(nextState.joints[0]?.pileTypeId).toBe('BP2');
    expect(nextState.generatedPiles[0]?.pileTypeId).toBe('BP2');
  });
});
