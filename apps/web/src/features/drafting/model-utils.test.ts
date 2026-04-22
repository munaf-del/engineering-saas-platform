import { describe, expect, it } from 'vitest';
import { DraftingModelSchema, createEmptyDraftingModel } from '@eng/shared';
import {
  addDraftingUnderlay,
  applyTwoPointUniformCalibration,
  canEditDraftingUnderlay,
  canEditDraftingObject,
  createDraftingObject,
  getVisibleDraftingObjects,
  getVisibleDraftingUnderlays,
  removeDraftingUnderlay,
  removeDraftingObject,
  translateDraftingObject,
  updateDraftingUnderlay,
  updateDraftingObject,
  updateLayer,
} from './model-utils';

describe('drafting model utils', () => {
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
