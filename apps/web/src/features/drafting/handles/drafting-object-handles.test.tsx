import { describe, expect, it } from 'vitest';
import { createEmptyDraftingModel } from '@eng/shared';
import { createDraftingObject } from '../model-utils';
import { getDraftingObjectHandles, updateDraftingObjectHandle } from './drafting-object-handles';

describe('drafting object handles', () => {
  it('renders handles for major engineering object types', () => {
    const model = createEmptyDraftingModel('drawing-handle-list');
    const types = [
      'pile',
      'secant_pile_wall',
      'soldier_pile_wall',
      'anchor_tieback',
      'service_run',
      'service_crossing',
      'callout',
      'dimension_chain',
      'section_marker',
    ] as const;

    for (const type of types) {
      const object = createDraftingObject(type, { x: 1000, y: 1000 }, model);
      expect(getDraftingObjectHandles(object).length).toBeGreaterThan(0);
    }
  });

  it('updates pile, wall, anchor, service run, and service crossing geometry from handle drags', () => {
    const model = createEmptyDraftingModel('drawing-handle-update');
    const pile = createDraftingObject('pile', { x: 0, y: 0 }, model);
    const wall = createDraftingObject('secant_pile_wall', { x: 0, y: 0 }, model);
    const anchor = createDraftingObject('anchor_tieback', { x: 0, y: 0 }, model);
    const serviceRun = createDraftingObject('service_run', { x: 0, y: 0 }, model);
    const crossing = createDraftingObject('service_crossing', { x: 0, y: 0 }, model);

    const movedPile = updateDraftingObjectHandle(pile, 'centre', { x: 100, y: 200 });
    const resizedPile = updateDraftingObjectHandle(pile, 'diameter', { x: 450, y: 0 });
    const movedWall = updateDraftingObjectHandle(wall, 'baseline-1', { x: 9000, y: 1200 });
    const movedAnchor = updateDraftingObjectHandle(anchor, 'tail', { x: 3000, y: 3000 });
    const movedRun = updateDraftingObjectHandle(serviceRun, 'path-1', { x: 1200, y: 900 });
    const movedCrossing = updateDraftingObjectHandle(crossing, 'crossing', { x: 800, y: 700 });

    expect(movedPile.type === 'pile' ? movedPile.geometry.centre : null).toEqual({
      x: 100,
      y: 200,
    });
    expect(resizedPile.type === 'pile' ? resizedPile.geometry.diameterMm : 0).toBe(900);
    expect(
      movedWall.type === 'secant_pile_wall' ? movedWall.geometry.baselinePoints[1] : null,
    ).toEqual({
      x: 9000,
      y: 1200,
    });
    expect(
      movedWall.type === 'secant_pile_wall' ? movedWall.geometry.pileCentres.length : 0,
    ).toBeGreaterThan(1);
    expect(
      movedAnchor.type === 'anchor_tieback' ? movedAnchor.parameters.planLengthMm : 0,
    ).toBeGreaterThan(4000);
    expect(movedRun.type === 'service_run' ? movedRun.geometry.path[1] : null).toEqual({
      x: 1200,
      y: 900,
    });
    expect(
      movedCrossing.type === 'service_crossing' ? movedCrossing.geometry.crossingPoint : null,
    ).toEqual({
      x: 800,
      y: 700,
    });
  });
});
