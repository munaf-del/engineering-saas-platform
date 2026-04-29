import { describe, expect, it } from 'vitest';
import { createEmptyDraftingModel, type DraftingLayerId, type DraftingObject } from '@eng/shared';
import {
  addDrawingSheetDefinition,
  createDraftingDrawingSheetDefinition,
  deleteDrawingSheetDefinition,
  duplicateDrawingSheetDefinition,
  fitDrawingSheetDefinitionToModel,
  fitDrawingSheetDefinitionToSelectedObjects,
  fitDrawingSheetViewportToCurrentCanvasView,
  fitDrawingSheetViewportToModelExtents,
  fitDrawingSheetViewportToSelectedObjects,
  getDrawingSheetVisibleObjects,
  getDrawingSheetVisibleUnderlays,
  nudgeDrawingSheetViewport,
  resetDrawingSheetViewport,
  updateDrawingSheetDefinition,
  zoomDrawingSheetViewport,
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

  it('fits a viewport around selected object extents', () => {
    const viewport = fitDrawingSheetViewportToSelectedObjects({
      frameHeightMm: 180,
      frameWidthMm: 320,
      objects: [createPile('pile-1', 1000, 1000), createPile('pile-2', 9000, 5000)],
    });

    expect(viewport.center.x).toBeCloseTo(5000, 0);
    expect(viewport.center.y).toBeCloseTo(3000, 0);
    expect(viewport.fitMode).toBe('selected_extents');
    expect(viewport.scale).toBeGreaterThan(0);
  });

  it('fits a sheet definition to selected visible objects only', () => {
    const model = createEmptyDraftingModel('drawing-selected-fit');
    model.objects.push(
      createPile('pile-1', 1000, 1000),
      createPile('pile-2', 9000, 5000),
      createPile('pile-3', 40000, 40000),
    );
    const sheet = createDraftingDrawingSheetDefinition({ id: 'sheet-1' });

    const fitted = fitDrawingSheetDefinitionToSelectedObjects(model, sheet, ['pile-1', 'pile-2']);

    expect(fitted.viewport.center.x).toBeCloseTo(5000, 0);
    expect(fitted.viewport.center.y).toBeCloseTo(3000, 0);
    expect(fitted.viewport.fitMode).toBe('selected_extents');
  });

  it('captures the current canvas view as a manual viewport', () => {
    const viewport = fitDrawingSheetViewportToCurrentCanvasView({
      canvasHeightPx: 600,
      canvasWidthPx: 1000,
      frameHeightMm: 200,
      frameWidthMm: 300,
      view: {
        offsetX: 100,
        offsetY: 50,
        scale: 0.1,
      },
    });

    expect(viewport.center).toEqual({ x: 4000, y: 2500 });
    expect(viewport.fitMode).toBe('manual');
    expect(viewport.scale).toBeCloseTo(0.03);
  });

  it('nudges a viewport by a deterministic fraction of the visible world span', () => {
    const viewport = createDraftingDrawingSheetDefinition({ id: 'sheet-1' }).viewport;

    const nudged = nudgeDrawingSheetViewport(viewport, 'right');

    expect(nudged.center.x).toBeCloseTo(3600);
    expect(nudged.center.y).toBe(0);
    expect(nudged.fitMode).toBe('manual');
  });

  it('zooms a viewport in and out without moving its centre', () => {
    const viewport = createDraftingDrawingSheetDefinition({
      id: 'sheet-1',
      viewport: { center: { x: 1000, y: 2000 }, scale: 0.02 },
    }).viewport;

    const zoomedIn = zoomDrawingSheetViewport(viewport, 'in');
    const zoomedOut = zoomDrawingSheetViewport(zoomedIn, 'out');

    expect(zoomedIn.center).toEqual({ x: 1000, y: 2000 });
    expect(zoomedIn.scale).toBeCloseTo(0.025);
    expect(zoomedOut.scale).toBeCloseTo(0.02);
  });

  it('resets a viewport to a stable manual default', () => {
    expect(resetDrawingSheetViewport(300, 180)).toMatchObject({
      center: { x: 0, y: 0 },
      fitMode: 'manual',
      heightMm: 180,
      scale: 0.01,
      widthMm: 300,
    });
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
