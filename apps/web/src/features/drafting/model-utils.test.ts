import { describe, expect, it } from 'vitest';
import {
  DraftingModelSchema,
  createEmptyDraftingModel,
  type DraftingObjectChangeEvent,
} from '@eng/shared';
import {
  addDraftingObject,
  addDraftingUnderlay,
  appendDraftingObjectChangeEvent,
  applyTwoPointUniformCalibration,
  canEditDraftingUnderlay,
  canEditDraftingObject,
  centerDraftingViewOnPoint,
  createDraftingObject,
  fitDraftingModelView,
  fitDraftingObjectsView,
  getVisibleDraftingObjects,
  getVisibleDraftingUnderlays,
  recordDraftingObjectChangeEvent,
  removeDraftingUnderlay,
  removeDraftingObject,
  removeDraftingObjectWithProvenance,
  replaceDraftingObjectWithProvenance,
  resetDraftingViewZoom,
  translateDraftingObject,
  updateDraftingDrawingSetup,
  updateDraftingUnderlay,
  updateDraftingObject,
  updateLayer,
  zoomDraftingViewAtPoint,
} from './model-utils';

describe('drafting model utils', () => {
  it('updates drawing setup without moving drafting objects', () => {
    const model = createEmptyDraftingModel('drawing-setup');
    const pile = createDraftingObject('pile', { x: 1000, y: 2000 }, model);
    const withPile = { ...model, objects: [pile] };

    const updated = updateDraftingDrawingSetup(withPile, (setup) => ({
      ...setup,
      referencePoint: {
        ...setup.referencePoint,
        sitePoint: { easting: 334000, northing: 6251000, elevation: 41.2 },
        datum: 'AHD',
        coordinateSystem: 'MGA2020 Zone 56',
      },
      north: {
        ...setup.north,
        projectNorthAngleDeg: 10,
        trueNorthAngleDeg: 13.5,
      },
    }));

    expect(updated.drawingSetup?.referencePoint.sitePoint).toEqual({
      easting: 334000,
      northing: 6251000,
      elevation: 41.2,
    });
    expect(updated.drawingSetup?.north.trueNorthAngleDeg).toBe(13.5);
    expect(updated.objects[0]).toEqual(pile);
    expect(DraftingModelSchema.parse(updated).drawingSetup?.referencePoint.datum).toBe('AHD');
  });

  it('centres the canvas view on the reference point without changing scale', () => {
    const model = createEmptyDraftingModel('drawing-reference-view');
    const centred = centerDraftingViewOnPoint(
      model,
      { x: 1000, y: 2000 },
      { width: 1200, height: 640 },
    );

    expect(centred.view.scale).toBe(model.view.scale);
    expect(centred.view.offsetX).toBe(1200 / 2 - 1000 * model.view.scale);
    expect(centred.view.offsetY).toBe(640 / 2 - 2000 * model.view.scale);
  });

  it('zooms the editor view around an anchor point without changing drafting geometry', () => {
    const model = createEmptyDraftingModel('drawing-zoom');
    const pile = createDraftingObject('pile', { x: 1000, y: 500 }, model);
    if (pile.type !== 'pile') {
      throw new Error('Expected pile object');
    }
    const zoomedView = zoomDraftingViewAtPoint(
      model.view,
      pile.geometry.centre,
      { x: 400, y: 300 },
      model.view.scale * 2,
    );

    expect(zoomedView.scale).toBe(model.view.scale * 2);
    expect(zoomedView.offsetX).toBe(400 - pile.geometry.centre.x * zoomedView.scale);
    expect(zoomedView.offsetY).toBe(300 - pile.geometry.centre.y * zoomedView.scale);
    expect(pile.geometry).toEqual({ centre: { x: 1000, y: 500 }, diameterMm: 600 });
  });

  it('resets editor zoom to 100 percent around the current view centre', () => {
    const model = {
      ...createEmptyDraftingModel('drawing-reset-zoom'),
      view: { scale: 0.05, offsetX: 100, offsetY: 200 },
    };
    const reset = resetDraftingViewZoom(model, { width: 1200, height: 640 });

    expect(reset.scale).toBe(1);
    expect((1200 / 2 - reset.offsetX) / reset.scale).toBe(
      (1200 / 2 - model.view.offsetX) / model.view.scale,
    );
    expect((640 / 2 - reset.offsetY) / reset.scale).toBe(
      (640 / 2 - model.view.offsetY) / model.view.scale,
    );
  });

  it('fits the full model and selected objects using view scale only', () => {
    const model = createEmptyDraftingModel('drawing-fit-selected');
    const pileA = createDraftingObject('pile', { x: 0, y: 0 }, model);
    const pileB = createDraftingObject('pile', { x: 10000, y: 0 }, model);
    if (pileA.type !== 'pile' || pileB.type !== 'pile') {
      throw new Error('Expected pile objects');
    }
    const withObjects = { ...model, objects: [pileA, pileB] };

    const modelFit = fitDraftingModelView(withObjects, 1200, 640);
    const selectedFit = fitDraftingObjectsView([pileB], 1200, 640, model.view);
    const selectedScreenPoint = {
      x: pileB.geometry.centre.x * selectedFit.scale + selectedFit.offsetX,
      y: pileB.geometry.centre.y * selectedFit.scale + selectedFit.offsetY,
    };

    expect(modelFit.scale).toBeLessThan(selectedFit.scale);
    expect(selectedScreenPoint.x).toBeGreaterThan(64);
    expect(selectedScreenPoint.x).toBeLessThan(1200 - 64);
    expect(selectedScreenPoint.y).toBeGreaterThan(64);
    expect(selectedScreenPoint.y).toBeLessThan(640 - 64);
    expect(withObjects.objects).toEqual([pileA, pileB]);
  });

  it('updates and removes drafting objects without mutating the original model', () => {
    const model = createEmptyDraftingModel('drawing-1');
    const pile = createDraftingObject('pile', { x: 1000, y: 2000 }, model);
    const withPile = { ...model, objects: [pile] };

    const updated = updateDraftingObject(withPile, pile.id, (current) => {
      if (current.type !== 'pile') {
        return current;
      }

      return {
        ...current,
        metadata: {
          ...current.metadata,
          pileId: 'P-UPDATED',
        },
      };
    });
    const removed = removeDraftingObject(updated, pile.id);

    expect(withPile.objects[0]).toMatchObject({ metadata: { pileId: 'P1' } });
    expect(updated.objects[0]).toMatchObject({ metadata: { pileId: 'P-UPDATED' } });
    expect(removed.objects).toHaveLength(0);
  });

  it('adds provenance metadata to new objects, edits, moves, and removals', () => {
    const model = createEmptyDraftingModel('drawing-provenance');
    const pile = createDraftingObject('pile', { x: 1000, y: 2000 }, model, [], 'Avery Drafter');
    const withPile = addDraftingObject(model, pile, {
      at: '2026-04-24T00:00:00.000Z',
      by: 'Avery Drafter',
    });
    const createdPile = withPile.objects[0];
    if (!createdPile || createdPile.type !== 'pile') {
      throw new Error('Expected pile object');
    }
    const updated = replaceDraftingObjectWithProvenance(
      withPile,
      pile.id,
      {
        ...createdPile,
        metadata: {
          ...createdPile.metadata,
          pileId: 'P-UPDATED',
        },
        updatedAt: '2026-04-24T01:00:00.000Z',
      },
      {
        action: 'updated',
        at: '2026-04-24T01:00:00.000Z',
        by: 'Avery Drafter',
      },
    );
    const moved = translateDraftingObject(updated.objects[0]!, 100, 200, {
      by: 'Avery Drafter',
    });
    const movedModel = recordDraftingObjectChangeEvent({ ...updated, objects: [moved] }, moved, {
      action: 'moved',
      at: moved.provenance?.updatedAt,
      by: 'Avery Drafter',
    });
    const removed = removeDraftingObjectWithProvenance(movedModel, pile.id, {
      at: '2026-04-24T02:00:00.000Z',
      by: 'Avery Drafter',
    });

    expect(withPile.objects[0]?.provenance).toMatchObject({
      createdBy: 'Avery Drafter',
      updatedBy: 'Avery Drafter',
      lastAction: 'created',
    });
    expect(updated.objects[0]?.provenance).toMatchObject({
      lastAction: 'updated',
      updatedBy: 'Avery Drafter',
    });
    expect(moved.provenance).toMatchObject({
      lastAction: 'moved',
      updatedBy: 'Avery Drafter',
    });
    expect(removed.objects).toHaveLength(0);
    expect(removed.objectChangeEvents?.map((event) => event.action)).toEqual([
      'created',
      'updated',
      'moved',
      'deleted',
    ]);
    expect(removed.objectChangeEvents?.[3]).toMatchObject({
      action: 'deleted',
      by: 'Avery Drafter',
      objectId: pile.id,
    });
  });

  it('caps object change events deterministically to the newest entries', () => {
    const events = Array.from({ length: 205 }, (_, index) => ({
      id: `event-${index}`,
      objectId: `object-${index}`,
      objectType: 'pile' as const,
      action: 'updated' as const,
      at: new Date(Date.UTC(2026, 3, 24, 0, index)).toISOString(),
      source: 'drafting-editor' as const,
    })).reduce<DraftingObjectChangeEvent[]>(
      (currentEvents, event) => appendDraftingObjectChangeEvent(currentEvents, event),
      [],
    );

    expect(events).toHaveLength(200);
    expect(events[0]?.id).toBe('event-5');
    expect(events[199]?.id).toBe('event-204');
  });

  it('translates pile geometry without mutating the source object', () => {
    const pile = createDraftingObject('pile', { x: 1200, y: 400 }, createEmptyDraftingModel('d1'));
    const translated = translateDraftingObject(pile, 1600, 1200);
    if (pile.type !== 'pile' || translated.type !== 'pile') {
      throw new Error('Expected translated pile objects');
    }

    expect(translated.geometry.centre).toEqual({ x: 2800, y: 1600 });
    expect(pile.geometry.centre).toEqual({ x: 1200, y: 400 });
  });

  it('recalculates and preserves derived shoring object geometry across translation and reload', () => {
    const model = createEmptyDraftingModel('drawing-1');
    const secantWall = createDraftingObject('secant_pile_wall', { x: 0, y: 0 }, model);
    const soldierWall = createDraftingObject('soldier_pile_wall', { x: 0, y: 2000 }, model);
    const anchor = createDraftingObject('anchor_tieback', { x: 0, y: 4000 }, model);
    const translatedSecantWall = translateDraftingObject(secantWall, 500, 750);
    const translatedAnchor = translateDraftingObject(anchor, 1000, 500);

    if (
      secantWall.type !== 'secant_pile_wall' ||
      translatedSecantWall.type !== 'secant_pile_wall' ||
      soldierWall.type !== 'soldier_pile_wall' ||
      anchor.type !== 'anchor_tieback' ||
      translatedAnchor.type !== 'anchor_tieback'
    ) {
      throw new Error('Expected semantic drafting objects');
    }

    const parsed = DraftingModelSchema.parse({
      ...model,
      objects: [translatedSecantWall, soldierWall, translatedAnchor],
    });

    expect(translatedSecantWall.geometry.baselinePoints[0]).toEqual({ x: 500, y: 750 });
    expect(translatedSecantWall.metadata.pileCount).toBe(
      translatedSecantWall.geometry.pileCentres.length,
    );
    expect(soldierWall.metadata.pileCount).toBe(soldierWall.geometry.pilePositions.length);
    expect(translatedAnchor.geometry.headPoint).toEqual({ x: 1000, y: 4500 });
    expect(parsed.objects).toHaveLength(3);
  });

  it('preserves new semantic annotation objects across translation and reload', () => {
    const model = createEmptyDraftingModel('drawing-annotations');
    const dimensionChain = createDraftingObject('dimension_chain', { x: 1000, y: 1000 }, model);
    const callout = createDraftingObject('callout', { x: 2000, y: 2000 }, model);
    const sectionMarker = createDraftingObject('section_marker', { x: 3000, y: 3000 }, model);
    const borehole = createDraftingObject('borehole', { x: 4000, y: 4000 }, model);
    const serviceRun = createDraftingObject('service_run', { x: 5000, y: 5000 }, model);
    const serviceCrossing = createDraftingObject('service_crossing', { x: 6000, y: 6000 }, model);
    const translatedDimensionChain = translateDraftingObject(dimensionChain, 500, 200);
    const translatedServiceRun = translateDraftingObject(serviceRun, -300, 450);

    if (
      translatedDimensionChain.type !== 'dimension_chain' ||
      callout.type !== 'callout' ||
      sectionMarker.type !== 'section_marker' ||
      borehole.type !== 'borehole' ||
      translatedServiceRun.type !== 'service_run' ||
      serviceCrossing.type !== 'service_crossing'
    ) {
      throw new Error('Expected semantic annotation drafting objects');
    }

    const parsed = DraftingModelSchema.parse({
      ...model,
      objects: [
        translatedDimensionChain,
        callout,
        sectionMarker,
        borehole,
        translatedServiceRun,
        serviceCrossing,
      ],
    });

    expect(translatedDimensionChain.geometry.points[0]).toEqual({ x: 1500, y: 1200 });
    expect(translatedDimensionChain.parameters.dimensionId).toBe('DIM1');
    expect(callout.parameters.calloutId).toBe('CO1');
    expect(sectionMarker.parameters.sectionId).toBe('S1');
    expect(borehole.parameters.boreholeId).toBe('BH1');
    expect(translatedServiceRun.geometry.path[0]).toEqual({ x: 4700, y: 5450 });
    expect(serviceCrossing.parameters.crossingId).toBe('SC1');
    expect(parsed.objects).toHaveLength(6);
  });

  it('applies layer visibility and lock rules to visible/editable objects', () => {
    const model = createEmptyDraftingModel('drawing-1');
    const pile = createDraftingObject('pile', { x: 1000, y: 1000 }, model);
    const note = createDraftingObject('leader_note', { x: 2000, y: 2000 }, model);
    const withObjects = { ...model, objects: [pile, { ...note, visible: false }] };
    const pilesLayer = withObjects.layers.find((layer) => layer.id === 'piles');
    if (!pilesLayer) {
      throw new Error('Expected piles layer');
    }

    const hiddenLayerModel = updateLayer(withObjects, {
      ...pilesLayer,
      visible: false,
      locked: true,
    });

    expect(getVisibleDraftingObjects(withObjects)).toHaveLength(1);
    expect(getVisibleDraftingObjects(hiddenLayerModel)).toHaveLength(0);
    expect(canEditDraftingObject(hiddenLayerModel, pile)).toBe(false);
  });

  it('adds, updates, and removes underlays without mutating the original model', () => {
    const model = createEmptyDraftingModel('drawing-1');
    const underlay = createTestUnderlay();
    const withUnderlay = addDraftingUnderlay(model, underlay);
    const updated = updateDraftingUnderlay(withUnderlay, underlay.id, (current) => ({
      ...current,
      name: 'Updated survey underlay',
    }));
    const removed = removeDraftingUnderlay(updated, underlay.id);

    expect(model.underlays).toHaveLength(0);
    expect(withUnderlay.underlays[0]?.name).toBe('Survey underlay');
    expect(updated.underlays[0]?.name).toBe('Updated survey underlay');
    expect(removed.underlays).toHaveLength(0);
  });

  it('applies visibility and lock rules to PDF underlays', () => {
    const model = createEmptyDraftingModel('drawing-1');
    const underlay = createTestUnderlay();
    const withUnderlay = addDraftingUnderlay(model, underlay);
    const underlayLayer = withUnderlay.layers.find((layer) => layer.id === 'underlay');
    if (!underlayLayer) {
      throw new Error('Expected underlay layer');
    }

    const hiddenLayerModel = updateLayer(withUnderlay, {
      ...underlayLayer,
      visible: false,
      locked: true,
    });

    expect(getVisibleDraftingUnderlays(withUnderlay)).toHaveLength(1);
    expect(getVisibleDraftingUnderlays(hiddenLayerModel)).toHaveLength(0);
    expect(canEditDraftingUnderlay(withUnderlay, underlay)).toBe(true);
    expect(canEditDraftingUnderlay(hiddenLayerModel, underlay)).toBe(false);
    expect(canEditDraftingUnderlay(withUnderlay, { ...underlay, locked: true })).toBe(false);
  });

  it('calculates and persists uniform two-point calibration metadata', () => {
    const calibrated = applyTwoPointUniformCalibration(createTestUnderlay(), {
      pdfPointA: { x: 10, y: 10 },
      pdfPointB: { x: 210, y: 10 },
      modelDistanceMm: 2500,
      warningAcknowledged: true,
    });

    expect(calibrated.transform.scale).toBeCloseTo(12.5);
    expect(calibrated.calibration?.method).toBe('two_point_uniform_scale');
    expect(calibrated.calibration?.warningAcknowledged).toBe(true);
    expect(calibrated.calibration?.modelDistanceMm).toBe(2500);
  });

  it('requires the calibration warning acknowledgement before applying scale changes', () => {
    expect(() =>
      applyTwoPointUniformCalibration(createTestUnderlay(), {
        pdfPointA: { x: 0, y: 0 },
        pdfPointB: { x: 100, y: 0 },
        modelDistanceMm: 1000,
        warningAcknowledged: false,
      }),
    ).toThrow('Calibration warning acknowledgement is required');
  });
});

function createTestUnderlay() {
  const now = new Date('2026-04-22T00:00:00.000Z').toISOString();

  return {
    id: 'underlay-1',
    name: 'Survey underlay',
    fileId: 'document-1',
    fileName: 'survey.pdf',
    pageNumber: 1,
    visible: true,
    opacity: 0.6,
    locked: false,
    transform: {
      x: 1200,
      y: 2400,
      scale: 1,
      rotationDeg: 0,
    },
    crop: null,
    calibration: null,
    createdAt: now,
    updatedAt: now,
  } as const;
}
