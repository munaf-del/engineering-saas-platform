import { describe, expect, it } from 'vitest';
import {
  TEMPLATE_CANVAS_MAX_ZOOM,
  TEMPLATE_CANVAS_MIN_ZOOM,
  clampTemplateCanvasZoom,
  getNextTemplateCanvasZoom,
  getTemplateCanvasFitZoom,
} from './template-canvas-zoom';

describe('template canvas zoom helpers', () => {
  it('clamps zoom to the supported editor range', () => {
    expect(clampTemplateCanvasZoom(0.1)).toBe(TEMPLATE_CANVAS_MIN_ZOOM);
    expect(clampTemplateCanvasZoom(5)).toBe(TEMPLATE_CANVAS_MAX_ZOOM);
    expect(clampTemplateCanvasZoom(1.25)).toBe(1.25);
  });

  it('steps zoom in and out using the editor zoom ladder', () => {
    expect(getNextTemplateCanvasZoom(1, 'in')).toBe(1.25);
    expect(getNextTemplateCanvasZoom(1, 'out')).toBe(0.8);
    expect(getNextTemplateCanvasZoom(0.93, 'in')).toBe(1);
    expect(getNextTemplateCanvasZoom(0.93, 'out')).toBe(0.8);
  });

  it('calculates a fit zoom that respects viewport padding and page size', () => {
    expect(
      getTemplateCanvasFitZoom({
        pageHeightPx: 624,
        pageWidthPx: 882,
        viewportHeightPx: 900,
        viewportWidthPx: 1400,
      }),
    ).toBe(1.33);

    expect(
      getTemplateCanvasFitZoom({
        pageHeightPx: 624,
        pageWidthPx: 882,
        paddingPx: 160,
        viewportHeightPx: 720,
        viewportWidthPx: 960,
      }),
    ).toBe(0.9);
  });
});
