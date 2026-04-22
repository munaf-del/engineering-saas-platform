import { describe, expect, it } from 'vitest';
import {
  createEmptyDraftingModel,
  createDefaultDraftingLayers,
  defaultLayerIdForDraftingObjectType,
} from './drafting.js';
import { DraftingModelSchema, DraftingUnderlaySchema } from '../schemas/drafting.js';

describe('drafting defaults', () => {
  it('creates a valid empty drafting model', () => {
    const model = createEmptyDraftingModel('drawing-123');
    const parsed = DraftingModelSchema.parse(model);

    expect(parsed.drawingId).toBe('drawing-123');
    expect(parsed.units).toBe('mm');
    expect(parsed.layers).toHaveLength(10);
    expect(parsed.objects).toHaveLength(0);
  });

  it('clones the default layers instead of reusing references', () => {
    const left = createDefaultDraftingLayers();
    const right = createDefaultDraftingLayers();

    left[0]!.visible = false;

    expect(right[0]!.visible).toBe(true);
  });

  it('maps authored object types to the expected default layer', () => {
    expect(defaultLayerIdForDraftingObjectType('pile')).toBe('piles');
    expect(defaultLayerIdForDraftingObjectType('excavation_line')).toBe('excavation');
    expect(defaultLayerIdForDraftingObjectType('monitoring_point')).toBe('monitoring');
    expect(defaultLayerIdForDraftingObjectType('leader_note')).toBe('notes');
  });

  it('validates PDF underlay configuration with uniform calibration metadata', () => {
    const parsed = DraftingUnderlaySchema.parse({
      id: 'underlay-1',
      name: 'Existing survey sheet',
      fileId: 'document-1',
      fileName: 'survey.pdf',
      pageNumber: 1,
      visible: true,
      opacity: 0.65,
      locked: false,
      transform: {
        x: 1200,
        y: 2400,
        scale: 1.25,
        rotationDeg: 12,
      },
      crop: {
        x: 10,
        y: 20,
        width: 300,
        height: 450,
      },
      calibration: {
        method: 'two_point_uniform_scale',
        pdfPointA: { x: 10, y: 20 },
        pdfPointB: { x: 210, y: 20 },
        modelPointA: { x: 1200, y: 2400 },
        modelPointB: { x: 3700, y: 2400 },
        modelDistanceMm: 2500,
        calculatedScale: 12.5,
        calibratedAt: new Date('2026-04-22T00:00:00.000Z').toISOString(),
        warningAcknowledged: true,
      },
      createdAt: new Date('2026-04-22T00:00:00.000Z').toISOString(),
      updatedAt: new Date('2026-04-22T00:00:00.000Z').toISOString(),
    });

    expect(parsed.calibration?.warningAcknowledged).toBe(true);
    expect(parsed.transform.scale).toBe(1.25);
  });

  it('preserves saved underlay configuration when a drafting model is parsed and reloaded', () => {
    const model = createEmptyDraftingModel('drawing-456');
    model.underlays.push({
      id: 'underlay-3',
      name: 'Reloaded PDF',
      fileId: 'document-3',
      fileName: 'reloaded.pdf',
      pageNumber: 2,
      visible: true,
      opacity: 0.5,
      locked: true,
      transform: {
        x: 500,
        y: 750,
        scale: 0.3527777778,
        rotationDeg: 8,
      },
      crop: {
        x: 12,
        y: 18,
        width: 280,
        height: 360,
      },
      calibration: null,
      createdAt: new Date('2026-04-22T00:00:00.000Z').toISOString(),
      updatedAt: new Date('2026-04-22T00:00:00.000Z').toISOString(),
    });

    const parsed = DraftingModelSchema.parse(JSON.parse(JSON.stringify(model)));

    expect(parsed.underlays).toHaveLength(1);
    expect(parsed.underlays[0]).toEqual(model.underlays[0]);
  });

  it('rejects saved calibration metadata when the warning has not been acknowledged', () => {
    expect(() =>
      DraftingUnderlaySchema.parse({
        id: 'underlay-2',
        name: 'Unacknowledged calibration',
        fileId: 'document-2',
        fileName: 'calibration.pdf',
        pageNumber: 1,
        visible: true,
        opacity: 1,
        locked: false,
        transform: {
          x: 0,
          y: 0,
          scale: 1,
          rotationDeg: 0,
        },
        calibration: {
          method: 'two_point_uniform_scale',
          pdfPointA: { x: 0, y: 0 },
          pdfPointB: { x: 100, y: 0 },
          modelPointA: { x: 0, y: 0 },
          modelPointB: { x: 1000, y: 0 },
          modelDistanceMm: 1000,
          calculatedScale: 10,
          calibratedAt: new Date('2026-04-22T00:00:00.000Z').toISOString(),
          warningAcknowledged: false,
        },
        createdAt: new Date('2026-04-22T00:00:00.000Z').toISOString(),
        updatedAt: new Date('2026-04-22T00:00:00.000Z').toISOString(),
      }),
    ).toThrow();
  });
});
