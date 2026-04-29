import { describe, expect, it } from 'vitest';
import { createEmptyDraftingModel } from '@eng/shared';
import { createDimensionChainObject } from './tools/dimension-chain-tool';
import {
  buildDimensionChainOffsetPoints,
  calculateDimensionChainSegments,
  calculateDimensionChainTotal,
  formatDimensionDistance,
} from './semantic-object-utils';

describe('semantic drafting object utils', () => {
  it('calculates dimension chain segment lengths and total distance', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 3000, y: 0 },
      { x: 3000, y: 4000 },
    ];

    expect(calculateDimensionChainSegments(points)).toEqual([3000, 4000]);
    expect(calculateDimensionChainTotal(points)).toBe(7000);
    expect(formatDimensionDistance(7000, 'mm', 0)).toBe('7000 mm');
    expect(formatDimensionDistance(7000, 'm', 2)).toBe('7.00 m');
  });

  it('builds offset points for dimension chain rendering', () => {
    const object = {
      ...createDimensionChainObject({ x: 1000, y: 2000 }, createEmptyDraftingModel('d1')),
      geometry: {
        points: [
          { x: 1000, y: 2000 },
          { x: 4000, y: 2000 },
        ],
        offsetDistanceMm: 1200,
      },
    };
    const offsetPoints = buildDimensionChainOffsetPoints(object);

    expect(offsetPoints).toHaveLength(object.geometry.points.length);
    expect(offsetPoints[0]?.x).toBeCloseTo(1000);
    expect(offsetPoints[0]?.y).toBeCloseTo(800);
  });
});
