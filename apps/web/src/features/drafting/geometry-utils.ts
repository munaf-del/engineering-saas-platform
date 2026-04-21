import type { DraftingModel, DraftingPoint } from '@eng/shared';

export type DraftingCanvasSize = {
  width: number;
  height: number;
};

export type DraftingVisibleWorldBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export function screenToWorldPoint(point: DraftingPoint, view: DraftingModel['view']): DraftingPoint {
  return {
    x: (point.x - view.offsetX) / view.scale,
    y: (point.y - view.offsetY) / view.scale,
  };
}

export function worldToScreenPoint(point: DraftingPoint, view: DraftingModel['view']): DraftingPoint {
  return {
    x: point.x * view.scale + view.offsetX,
    y: point.y * view.scale + view.offsetY,
  };
}

export function clientToWorldPoint(
  clientX: number,
  clientY: number,
  node: HTMLDivElement | null,
  model: DraftingModel,
) {
  if (!node) {
    return null;
  }

  const rect = node.getBoundingClientRect();
  return screenToWorldPoint(
    {
      x: clientX - rect.left,
      y: clientY - rect.top,
    },
    model.view,
  );
}

export function getVisibleWorldBounds(
  view: DraftingModel['view'],
  canvasSize: DraftingCanvasSize,
): DraftingVisibleWorldBounds {
  return {
    minX: (0 - view.offsetX) / view.scale,
    minY: (0 - view.offsetY) / view.scale,
    maxX: (canvasSize.width - view.offsetX) / view.scale,
    maxY: (canvasSize.height - view.offsetY) / view.scale,
  };
}

export function createGridAxisValues(min: number, max: number, step: number) {
  const axisValues: number[] = [];
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;

  for (let value = start; value <= end; value += step) {
    axisValues.push(value);
  }

  return axisValues;
}

export function getGridStep(scale: number) {
  const candidates = [100, 250, 500, 1000, 2000, 5000, 10000, 20000];
  return candidates.find((candidate) => candidate * scale >= 24) ?? candidates[candidates.length - 1]!;
}
