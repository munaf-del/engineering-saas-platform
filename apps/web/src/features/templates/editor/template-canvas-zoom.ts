export const TEMPLATE_CANVAS_MIN_ZOOM = 0.4;
export const TEMPLATE_CANVAS_MAX_ZOOM = 2.5;
export const TEMPLATE_CANVAS_ZOOM_STEPS = [0.4, 0.5, 0.67, 0.8, 1, 1.25, 1.5, 2, 2.5];

export function clampTemplateCanvasZoom(value: number) {
  return Math.min(Math.max(value, TEMPLATE_CANVAS_MIN_ZOOM), TEMPLATE_CANVAS_MAX_ZOOM);
}

export function getNextTemplateCanvasZoom(currentZoom: number, direction: 'in' | 'out') {
  const clampedZoom = clampTemplateCanvasZoom(currentZoom);

  if (direction === 'in') {
    return (
      TEMPLATE_CANVAS_ZOOM_STEPS.find((step) => step > clampedZoom + 0.001) ??
      TEMPLATE_CANVAS_MAX_ZOOM
    );
  }

  return (
    [...TEMPLATE_CANVAS_ZOOM_STEPS].reverse().find((step) => step < clampedZoom - 0.001) ??
    TEMPLATE_CANVAS_MIN_ZOOM
  );
}

export function getTemplateCanvasFitZoom(args: {
  pageHeightPx: number;
  pageWidthPx: number;
  paddingPx?: number;
  viewportHeightPx: number;
  viewportWidthPx: number;
}) {
  const availableWidthPx = Math.max(1, args.viewportWidthPx - (args.paddingPx ?? 72));
  const availableHeightPx = Math.max(1, args.viewportHeightPx - (args.paddingPx ?? 72));
  const widthScale = availableWidthPx / Math.max(args.pageWidthPx, 1);
  const heightScale = availableHeightPx / Math.max(args.pageHeightPx, 1);

  return clampTemplateCanvasZoom(Number(Math.min(widthScale, heightScale).toFixed(2)));
}
