import { describe, expect, it } from 'vitest';
import {
  clampTemplateRect,
  remapTemplateRectToSafeArea,
  resolveTemplateObjectInteraction,
  resizeTemplateRectWithAnchors,
} from './template-geometry';
import type { TemplateSafeArea } from './template-document';

const SAFE_AREA: TemplateSafeArea = {
  height: 190,
  margin: 10,
  width: 267,
  x: 20,
  y: 10,
};

const CONSTRAINT = {
  maxHeight: 150,
  maxWidth: 220,
  minHeight: 20,
  minWidth: 30,
};

describe('template geometry', () => {
  it('clamps a rect within the safe area and size constraints', () => {
    const result = clampTemplateRect(
      {
        height: 300,
        width: 260,
        x: 0,
        y: 0,
      },
      SAFE_AREA,
      CONSTRAINT,
    );

    expect(result).toEqual({
      height: 150,
      width: 220,
      x: 20,
      y: 10,
    });
  });

  it('remaps a rect to a new safe area while preserving edge anchoring', () => {
    const result = remapTemplateRectToSafeArea({
      constraint: CONSTRAINT,
      fromSafeArea: SAFE_AREA,
      rect: {
        height: 40,
        width: 80,
        x: 20 + 267 - 80,
        y: 10 + 190 - 40,
      },
      toSafeArea: {
        height: 554,
        margin: 20,
        width: 801,
        x: 20,
        y: 20,
      },
    });

    expect(result.x + result.width).toBeCloseTo(821, 5);
    expect(result.y + result.height).toBeCloseTo(574, 5);
  });

  it('resolves resize interaction against constraints', () => {
    const result = resolveTemplateObjectInteraction({
      constraint: CONSTRAINT,
      deltaX: 120,
      deltaY: 80,
      mode: 'se',
      rect: {
        height: 40,
        width: 60,
        x: 40,
        y: 30,
      },
      safeArea: SAFE_AREA,
    });

    expect(result.width).toBe(180);
    expect(result.height).toBe(120);
    expect(result.x).toBe(40);
    expect(result.y).toBe(30);
  });

  it('keeps anchored positioning when auto-resizing', () => {
    const result = resizeTemplateRectWithAnchors({
      constraint: CONSTRAINT,
      nextHeight: 60,
      nextWidth: 100,
      rect: {
        height: 40,
        width: 80,
        x: SAFE_AREA.x + SAFE_AREA.width - 80,
        y: SAFE_AREA.y + SAFE_AREA.height - 40,
      },
      safeArea: SAFE_AREA,
    });

    expect(result.x + result.width).toBeCloseTo(SAFE_AREA.x + SAFE_AREA.width, 5);
    expect(result.y + result.height).toBeCloseTo(SAFE_AREA.y + SAFE_AREA.height, 5);
  });
});
