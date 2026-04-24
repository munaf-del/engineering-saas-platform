import { describe, expect, it } from 'vitest';
import { createEmptyDraftingModel, type DraftingLayerId, type DraftingObject } from '@eng/shared';
import {
  addDrawingSheetDefinition,
  createDraftingDrawingSheetDefinition,
  deleteDrawingSheetDefinition,
  duplicateDrawingSheetDefinition,
  fitDrawingSheetDefinitionToModel,
  fitDrawingSheetViewportToModelExtents,
  getDrawingSheetVisibleObjects,
  getDrawingSheetVisibleUnderlays,
  updateDrawingSheetDefinition,
} from './drafting-drawing-sheet-utils';

describe('drafting drawing sheet definition utils', () => {
  it('creates, updates, duplicates, and deletes drawing sheet definitions without mutating the source model', () => {
    const model = createEmptyDraftingModel('drawing-sheets');
    const sheet = createDraftingDrawingSheetDefinition({
      id: 'sheet-1',
      name: 'Plan Sheet',
      now: '2026-04-24T00:00:00.000Z',
      sheetNumber: 'S-101',
      title: 'Retention Plan',
    });

    const withSheet = addDrawingSheetDefinition(model, sheet);
    const renamed = updateDrawingSheetDefinition(
      withSheet,
      'sheet-1',
      { name: 'General Arrangement', title: 'General Arrangement' },
      '2026-04-24T01:00:00.000Z',
    );
    const duplicated = duplicateDrawingSheetDefinition(
      renamed,
      'sheet-1',
      'sheet-2',
      '2026-04-24T02:00:00.000Z',
    );
    const removed = deleteDrawingSheetDefinition(duplicated, 'sheet-1');

    expect(model.drawingSheets).toEqual([]);
    expect(withSheet.drawingSheets[0]).toMatchObject({
      name: 'Plan Sheet',
      sheetNumber: 'S-101',
      viewport: { fitMode: 'model_extents' },
    });
    expect(renamed.drawingSheets[0]).toMatchObject({
      name: 'General Arrangement',
      title: 'General Arrangement',
      updatedAt: '2026-04-24T01:00:00.000Z',
    });
    expect(duplicated.drawingSheets.map((entry) => entry.id)).toEqual(['sheet-1', 'sheet-2']);
    expect(duplicated.drawingSheets[1]).toMatchObject({
      name: 'General Arrangement Copy',
      sheetNumber: 'S-002',
    });
    expect(removed.drawingSheets.map((entry) => entry.id)).toEqual(['sheet-2']);
  });

  it('fits a viewport around model extents using the printable frame dimensions', () => {
    const viewport = fitDrawingSheetViewportToModelExtents({
      bounds: {
        minX: 1000,
        minY: 2000,
        maxX: 11000,
        maxY: 7000,
      },
      frameHeightMm: 200,
      frameWidthMm: 300,
    });

    expect(viewport.center).toEqual({ x: 6000, y: 4500 });
    expect(viewport.fitMode).toBe('model_extents');
    expect(viewport.scale).toBeCloseTo(0.0252, 4);
  });

  it('falls back to a stable viewport when the drawing has no model extents', () => {
    const viewport = fitDrawingSheetViewportToModelExtents({
      bounds: null,
      frameHeightMm: 200,
      frameWidthMm: 300,
    });

    expect(viewport).toMatchObject({
      center: { x: 0, y: 0 },
      fitMode: 'model_extents',
      scale: 0.01,
    });
  });

  it('fits a sheet definition to visible model geometry', () => {
    const model = createEmptyDraftingModel('drawing-fit');
    model.objects.push(createPile('pile-1', 1000, 1000), createPile('pile-2', 9000, 5000));
    const sheet = createDraftingDrawingSheetDefinition({ id: 'sheet-1' });

    const fitted = fitDrawingSheetDefinitionToModel(model, sheet, 320, 180);

    expect(fitted.viewport.center.x).toBeCloseTo(5000, 0);
    expect(fitted.viewport.center.y).toBeCloseTo(3000, 0);
    expect(fitted.viewport.widthMm).toBe(320);
    expect(fitted.viewport.heightMm).toBe(180);
    expect(fitted.viewport.scale).toBeGreaterThan(0);
  });

  it('applies drawing sheet layer filters to objects and underlays', () => {
    const model = createEmptyDraftingModel('drawing-filter');
    const sheet = createDraftingDrawingSheetDefinition({ id: 'sheet-1' });
    model.objects.push(createPile('pile-1', 1000, 1000), {
      ...createPile('note-like', 2000, 2000),
      layerId: 'notes',
    });
    model.underlays.push({
      id: 'underlay-1',
      name: 'Survey underlay',
      fileId: 'document-1',
      fileName: 'survey.pdf',
      pageNumber: 1,
      visible: true,
      opacity: 0.65,
      locked: false,
      transform: { x: 0, y: 0, scale: 1, rotationDeg: 0 },
      crop: null,
      calibration: null,
      createdAt: '2026-04-24T00:00:00.000Z',
      updatedAt: '2026-04-24T00:00:00.000Z',
    });

    const filteredSheet = {
      ...sheet,
      includeUnderlays: true,
      layerFilter: {
        hiddenLayerIds: ['notes'] satisfies DraftingLayerId[],
        visibleLayerIds: ['piles', 'underlay'] satisfies DraftingLayerId[],
      },
    };

    expect(getDrawingSheetVisibleObjects(model, filteredSheet).map((object) => object.id)).toEqual([
      'pile-1',
    ]);
    expect(
      getDrawingSheetVisibleUnderlays(model, filteredSheet).map((underlay) => underlay.id),
    ).toEqual(['underlay-1']);
    expect(
      getDrawingSheetVisibleUnderlays(model, { ...filteredSheet, includeUnderlays: false }),
    ).toEqual([]);
  });
});

function createPile(id: string, x: number, y: number): DraftingObject {
  return {
    id,
    type: 'pile',
    layerId: 'piles',
    geometry: {
      centre: { x, y },
      diameterMm: 600,
    },
    metadata: {
      pileId: id,
    },
    createdAt: '2026-04-24T00:00:00.000Z',
    updatedAt: '2026-04-24T00:00:00.000Z',
  };
}
