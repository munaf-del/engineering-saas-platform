import { describe, expect, it } from 'vitest';
import { createEmptyDraftingModel, type DraftingPileObject } from '@eng/shared';
import { createDraftingObject } from '../model-utils';
import {
  getDraftingObjectHandles,
  resolveDraftingObjectHandles,
  updateDraftingObjectHandle,
} from './drafting-object-handles';

describe('drafting object handles', () => {
  it('renders handles for major engineering object types', () => {
    const model = createEmptyDraftingModel('drawing-handle-list');
    const types = [
      'pile',
      'secant_pile_wall',
      'soldier_pile_wall',
      'anchor_tieback',
      'capping_beam',
      'waler',
      'monitoring_point',
      'borehole',
      'leader_note',
      'service_run',
      'service_crossing',
      'callout',
      'dimension_chain',
      'section_marker',
      'excavation_line',
      'draft_line',
      'draft_polyline',
      'draft_polygon',
      'draft_rectangle',
      'draft_circle',
      'structural_joint',
      'geotech_surface',
    ] as const;

    for (const type of types) {
      const point = type === 'geotech_surface' ? { x: 1000, y: 1000, z: 10 } : { x: 1000, y: 1000 };
      const object = createDraftingObject(type, point, model, defaultHandleTestPath());
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

  it('resolves editable and blocked handle state from object, layer, and surface context', () => {
    const model = createEmptyDraftingModel('drawing-handle-blocks');
    const wall = createDraftingObject('secant_pile_wall', { x: 0, y: 0 }, model);
    const wallHandles = resolveDraftingObjectHandles({ model, object: wall });

    expect(wallHandles.find((handle) => handle.id === 'baseline-0')).toMatchObject({
      editable: true,
      kind: 'baseline',
      updatePath: 'geometry.baselinePoints.0',
    });
    expect(wallHandles.find((handle) => handle.id === 'pile-centre-0')).toMatchObject({
      blockedReason: 'Generated from baseline points',
      editable: false,
      kind: 'generated',
    });

    const lockedLayerModel = {
      ...model,
      layers: model.layers.map((layer) =>
        layer.id === wall.layerId ? { ...layer, locked: true } : layer,
      ),
    };
    expect(
      resolveDraftingObjectHandles({ model: lockedLayerModel, object: wall }).every(
        (handle) => !handle.editable && handle.blockedReason === 'Layer locked',
      ),
    ).toBe(true);
    expect(
      resolveDraftingObjectHandles({ object: wall, surface: 'read_only' }).every(
        (handle) => !handle.editable && handle.blockedReason === 'Read-only surface',
      ),
    ).toBe(true);
    expect(
      resolveDraftingObjectHandles({ object: wall, surface: 'sheet' }).every(
        (handle) => !handle.editable && handle.blockedReason === 'sheet surface is not interactive',
      ),
    ).toBe(true);
  });

  it('preserves point metadata in resolved handles and handle updates', () => {
    const model = createEmptyDraftingModel('drawing-handle-metadata');
    const snapRef = {
      anchorKind: 'centre' as const,
      anchorName: 'Existing centre',
      capturedCoordinate: { x: 0, y: 0, z: 4, rl: 12.5 },
      sourceObjectId: 'source-object-1',
    };
    const pile = {
      ...createDraftingObject('pile', { x: 0, y: 0 }, model),
      geometry: {
        centre: { x: 0, y: 0, rl: 12.5, snapRef, z: 4 },
        diameterMm: 600,
      },
    } as DraftingPileObject;
    const centreHandle = getDraftingObjectHandles(pile).find((handle) => handle.id === 'centre');
    const movedPile = updateDraftingObjectHandle(pile, 'centre', {
      x: 100,
      y: 200,
    }) as DraftingPileObject;

    expect(centreHandle).toMatchObject({
      sourcePointMetadata: {
        rl: 12.5,
        snapRef,
        z: 4,
      },
    });
    expect(movedPile.geometry.centre).toEqual({
      x: 100,
      y: 200,
      rl: 12.5,
      snapRef,
      z: 4,
    });
  });
});

function defaultHandleTestPath() {
  return [
    { x: 1000, y: 1000, z: 10 },
    { x: 2200, y: 1000, z: 10 },
    { x: 2600, y: 1800, z: 10 },
  ];
}
