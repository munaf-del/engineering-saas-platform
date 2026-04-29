import { describe, expect, it } from 'vitest';
import {
  getProjectSpatialSheetSafeArea,
  normalizeProjectSpatialSheetObjects,
} from './project-spatial-sheet-layout';

describe('project spatial sheet layout', () => {
  it('preserves duplicate objects while backfilling required defaults', () => {
    const objects = normalizeProjectSpatialSheetObjects(
      [
        { id: 'map-1', type: 'mapFrame', width: 120, height: 80, x: 20, y: 10, order: 10 },
        { id: 'map-2', type: 'mapFrame', width: 100, height: 70, x: 40, y: 30, order: 11 },
      ],
      'a4',
      'landscape',
    );

    expect(objects.filter((object) => object.type === 'mapFrame')).toHaveLength(2);
    expect(objects.some((object) => object.type === 'titleBlock')).toBe(true);
    expect(objects.some((object) => object.type === 'legend')).toBe(true);
  });

  it('uses the compatibility safe area for landscape A4 sheets', () => {
    expect(getProjectSpatialSheetSafeArea('a4', 'landscape')).toEqual({
      height: 190,
      margin: 10,
      width: 277,
      x: 10,
      y: 10,
    });
  });
});
