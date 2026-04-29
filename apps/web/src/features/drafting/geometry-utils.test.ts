import { describe, expect, it } from 'vitest';
import {
  createGridAxisValues,
  getGridStep,
  getVisibleWorldBounds,
  screenToWorldPoint,
  worldToScreenPoint,
} from './geometry-utils';

describe('drafting geometry utils', () => {
  it('converts between screen and world coordinates', () => {
    const view = {
      scale: 0.1,
      offsetX: 50,
      offsetY: 20,
    };

    const worldPoint = screenToWorldPoint({ x: 250, y: 220 }, view);
    const screenPoint = worldToScreenPoint(worldPoint, view);

    expect(worldPoint).toEqual({ x: 2000, y: 2000 });
    expect(screenPoint).toEqual({ x: 250, y: 220 });
  });

  it('computes visible world bounds and grid lines for the active view', () => {
    const bounds = getVisibleWorldBounds(
      {
        scale: 0.05,
        offsetX: 100,
        offsetY: 200,
      },
      {
        width: 1200,
        height: 800,
      },
    );

    expect(bounds).toEqual({
      minX: -2000,
      minY: -4000,
      maxX: 22000,
      maxY: 12000,
    });
    expect(createGridAxisValues(bounds.minX, bounds.maxX, 5000)).toEqual([
      -5000, 0, 5000, 10000, 15000, 20000, 25000,
    ]);
    expect(getGridStep(0.05)).toBe(500);
  });

  it('keeps cursor coordinate conversion stable after zoom and pan', () => {
    const view = {
      scale: 0.5,
      offsetX: -150,
      offsetY: 75,
    };
    const worldPoint = { x: 1200, y: -400 };
    const screenPoint = worldToScreenPoint(worldPoint, view);

    expect(screenToWorldPoint(screenPoint, view)).toEqual(worldPoint);
  });
});
