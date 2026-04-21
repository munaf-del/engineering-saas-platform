import { describe, expect, it } from 'vitest';
import { createEmptyDraftingModel } from '@eng/shared';
import {
  buildDraftingExportFilename,
  createDraftingObject,
  isLayerLocked,
  translateDraftingObject,
  updateLayer,
} from './model-utils';

describe('drafting model utils', () => {
  it('creates sequenced pile objects with drafting defaults', () => {
    const model = createEmptyDraftingModel('drawing-1');
    const firstPile = createDraftingObject('pile', { x: 1000, y: 2000 }, model);
    const secondPile = createDraftingObject('pile', { x: 3000, y: 4000 }, {
      ...model,
      objects: [firstPile],
    });
    if (firstPile.type !== 'pile' || secondPile.type !== 'pile') {
      throw new Error('Expected pile objects');
    }

    expect(firstPile.type).toBe('pile');
    expect(firstPile.layerId).toBe('piles');
    expect(firstPile.metadata.pileId).toBe('P1');
    expect(secondPile.metadata.pileId).toBe('P2');
  });

  it('uses captured polyline points for excavation lines', () => {
    const model = createEmptyDraftingModel('drawing-1');
    const points = [
      { x: 0, y: 0 },
      { x: 2500, y: 500 },
      { x: 4000, y: 1500 },
    ];
    const line = createDraftingObject('excavation_line', points[0]!, model, points);
    if (line.type !== 'excavation_line') {
      throw new Error('Expected excavation line object');
    }

    expect(line.type).toBe('excavation_line');
    expect(line.geometry.points).toEqual(points);
    expect(line.metadata.excavationId).toBe('EX1');
  });

  it('translates pile geometry without mutating the source object', () => {
    const pile = createDraftingObject('pile', { x: 1200, y: 400 }, createEmptyDraftingModel('d1'));
    const translated = translateDraftingObject(pile, 1600, 1200);
    if (pile.type !== 'pile' || translated.type !== 'pile') {
      throw new Error('Expected translated pile objects');
    }

    expect(translated.type).toBe('pile');
    expect(translated.geometry.centre).toEqual({ x: 2800, y: 1600 });
    expect(pile.geometry.centre).toEqual({ x: 1200, y: 400 });
  });

  it('updates layer visibility and locking state', () => {
    const model = createEmptyDraftingModel('drawing-1');
    const anchorsLayer = model.layers.find((layer) => layer.id === 'anchors');
    if (!anchorsLayer) {
      throw new Error('Expected anchors layer');
    }

    const nextModel = updateLayer(model, {
      ...anchorsLayer,
      visible: false,
      locked: true,
    });

    expect(isLayerLocked(nextModel, 'anchors')).toBe(true);
    expect(nextModel.layers.find((layer) => layer.id === 'anchors')?.visible).toBe(false);
  });

  it('builds stable export filenames from drawing titles', () => {
    expect(buildDraftingExportFilename('Basement Shoring Layout Rev 01')).toBe(
      'basement-shoring-layout-rev-01',
    );
    expect(buildDraftingExportFilename('!!!')).toBe('drafting-model');
  });
});
