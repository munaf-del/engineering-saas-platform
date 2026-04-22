import { describe, expect, it } from 'vitest';
import { createEmptyDraftingModel } from '@eng/shared';
import { serializeDraftingModelJson } from './export-utils';

describe('drafting export utils', () => {
  it('serializes underlay metadata without embedding binary content', () => {
    const model = createEmptyDraftingModel('drawing-1');
    model.underlays.push({
      id: 'underlay-1',
      name: 'Calibrated PDF',
      fileId: 'document-1',
      fileName: 'calibrated.pdf',
      pageNumber: 2,
      visible: true,
      opacity: 0.7,
      locked: false,
      transform: {
        x: 100,
        y: 200,
        scale: 0.3527777778,
        rotationDeg: 15,
      },
      crop: {
        x: 10,
        y: 20,
        width: 300,
        height: 400,
      },
      calibration: {
        method: 'two_point_uniform_scale',
        pdfPointA: { x: 0, y: 0 },
        pdfPointB: { x: 100, y: 0 },
        modelPointA: { x: 100, y: 200 },
        modelPointB: { x: 1100, y: 200 },
        modelDistanceMm: 1000,
        calculatedScale: 10,
        calibratedAt: new Date('2026-04-22T00:00:00.000Z').toISOString(),
        warningAcknowledged: true,
      },
      createdAt: new Date('2026-04-22T00:00:00.000Z').toISOString(),
      updatedAt: new Date('2026-04-22T00:00:00.000Z').toISOString(),
    });
    const exported = serializeDraftingModelJson(model);
    const parsed = JSON.parse(exported);

    expect(parsed).toEqual(model);
    expect(exported).toContain('"fileId": "document-1"');
    expect(exported).not.toContain('data:application/pdf');
    expect(exported).not.toContain('"buffer"');
  });
});
