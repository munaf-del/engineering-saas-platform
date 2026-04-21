import { describe, expect, it } from 'vitest';
import { createEmptyDraftingModel } from '@eng/shared';
import {
  canEditDraftingObject,
  createDraftingObject,
  getVisibleDraftingObjects,
  removeDraftingObject,
  translateDraftingObject,
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
});
