import { describe, expect, it } from 'vitest';
import { createEmptyDraftingModel } from '@eng/shared';
import { createDraftingObject } from '../model-utils';
import {
  DEFAULT_DRAFTING_SNAP_SETTINGS,
  collectDraftingSnapCandidates,
  resolveDraftingSnapPoint,
} from './drafting-snap-utils';

describe('drafting snap utils', () => {
  it('collects grid, origin, endpoints, centres, and midpoints', () => {
    const model = createEmptyDraftingModel('drawing-1');
    const pile = createDraftingObject('pile', { x: 1000, y: 2000 }, model);
    const line = createDraftingObject('draft_line', { x: 0, y: 0 }, model, [
      { x: 0, y: 0 },
      { x: 4000, y: 0 },
    ]);

    const candidates = collectDraftingSnapCandidates(model, [pile, line], 1000, {
      x: 1030,
      y: 1975,
    });

    expect(candidates.some((candidate) => candidate.label === 'Grid')).toBe(true);
    expect(candidates.some((candidate) => candidate.label === 'Origin')).toBe(true);
    expect(candidates.some((candidate) => candidate.label === 'Pile centre')).toBe(true);
    expect(candidates.some((candidate) => candidate.label === 'Line midpoint')).toBe(true);
  });

  it('snaps to an object centre and preserves an anchor ref', () => {
    const model = createEmptyDraftingModel('drawing-1');
    const pile = createDraftingObject('pile', { x: 1000, y: 2000 }, model);

    const result = resolveDraftingSnapPoint({
      gridStepMm: 1000,
      model,
      objects: [pile],
      point: { x: 1006, y: 1994 },
      scale: 1,
      settings: DEFAULT_DRAFTING_SNAP_SETTINGS,
    });

    expect(result.candidate?.label).toBe('Pile centre');
    expect(result.point).toMatchObject({
      x: 1000,
      y: 2000,
      snapRef: {
        anchorKind: 'centre',
        sourceObjectId: pile.id,
      },
    });
  });

  it('applies orthogonal mode from the previous command point', () => {
    const model = createEmptyDraftingModel('drawing-1');

    const result = resolveDraftingSnapPoint({
      gridStepMm: 1000,
      model,
      objects: [],
      orthogonalOrigin: { x: 0, y: 0 },
      point: { x: 2000, y: 900 },
      scale: 1,
      settings: {
        ...DEFAULT_DRAFTING_SNAP_SETTINGS,
        modes: { ...DEFAULT_DRAFTING_SNAP_SETTINGS.modes, grid: false, orthogonal: true },
      },
    });

    expect(result.point).toMatchObject({ x: 2000, y: 0 });
  });
});
