import * as React from 'react';
import type { DraftingModel, DraftingObject, DraftingPoint } from '@eng/shared';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  createGridAxisValues,
  getGridStep,
  getVisibleWorldBounds,
  type DraftingCanvasSize,
} from '../geometry-utils';
import { getDraftingModelBounds, getLayerById } from '../model-utils';
import { renderDraftingObject } from '../renderers/render-drafting-object';
import { DraftingStatusBar } from './drafting-status-bar';

export function DraftingStage({
  canvasSize,
  containerRef,
  model,
  onBackgroundPointerDown,
  onCanvasClick,
  onCanvasWheel,
  onObjectPointerDown,
  pendingLinePoints,
  selectedObjectId,
  visibleObjects,
}: {
  canvasSize: DraftingCanvasSize;
  containerRef: React.RefObject<HTMLDivElement | null>;
  model: DraftingModel;
  onBackgroundPointerDown: (event: React.PointerEvent<SVGSVGElement>) => void;
  onCanvasClick: (event: React.MouseEvent<SVGSVGElement>) => void;
  onCanvasWheel: (event: React.WheelEvent<SVGSVGElement>) => void;
  onObjectPointerDown: (event: React.PointerEvent, object: DraftingObject) => void;
  pendingLinePoints: DraftingPoint[];
  selectedObjectId: string | null;
  visibleObjects: DraftingObject[];
}) {
  const visibleWorldBounds = getVisibleWorldBounds(model.view, canvasSize);
  const gridStep = getGridStep(model.view.scale);

  return (
    <Card className="min-h-[720px]">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Canvas</CardTitle>
            <CardDescription>
              Model space units are millimetres. Pan, zoom, select, move, and edit saved objects.
            </CardDescription>
          </div>
          <Badge variant="outline">{Math.round(model.view.scale * 1000)} px / m</Badge>
        </div>
      </CardHeader>

      <CardContent>
        <div
          ref={containerRef}
          className="relative h-[640px] overflow-hidden rounded-lg border bg-slate-50"
        >
          <svg
            className="h-full w-full touch-none"
            onWheel={onCanvasWheel}
            onClick={onCanvasClick}
            onPointerDown={onBackgroundPointerDown}
          >
            <rect x={0} y={0} width={canvasSize.width} height={canvasSize.height} fill="#f8fafc" />
            <GridLayer
              bounds={visibleWorldBounds}
              height={canvasSize.height}
              offsetX={model.view.offsetX}
              offsetY={model.view.offsetY}
              scale={model.view.scale}
              step={gridStep}
              width={canvasSize.width}
            />

            <g
              transform={`translate(${model.view.offsetX} ${model.view.offsetY}) scale(${model.view.scale})`}
            >
              {visibleObjects.map((object) =>
                renderDraftingObject({
                  isSelected: object.id === selectedObjectId,
                  layer: getLayerById(model, object.layerId),
                  object,
                  onPointerDown: (event) => onObjectPointerDown(event, object),
                }),
              )}

              {pendingLinePoints.length > 0 ? (
                <polyline
                  fill="none"
                  points={pendingLinePoints.map((point) => `${point.x},${point.y}`).join(' ')}
                  stroke="#b91c1c"
                  strokeDasharray="400 200"
                  strokeWidth={40}
                  vectorEffect="non-scaling-stroke"
                />
              ) : null}
            </g>
          </svg>

          <DraftingStatusBar
            hasModelExtents={Boolean(getDraftingModelBounds(visibleObjects))}
            visibleObjectCount={visibleObjects.length}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function GridLayer({
  bounds,
  height,
  offsetX,
  offsetY,
  scale,
  step,
  width,
}: {
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  height: number;
  offsetX: number;
  offsetY: number;
  scale: number;
  step: number;
  width: number;
}) {
  const verticalLines = createGridAxisValues(bounds.minX, bounds.maxX, step);
  const horizontalLines = createGridAxisValues(bounds.minY, bounds.maxY, step);
  const majorStep = step * 5;

  return (
    <g>
      {verticalLines.map((x) => {
        const screenX = x * scale + offsetX;
        const isMajor = Math.round(x / majorStep) === x / majorStep;

        return (
          <line
            key={`v-${x}`}
            x1={screenX}
            x2={screenX}
            y1={0}
            y2={height}
            stroke={isMajor ? '#cbd5e1' : '#e2e8f0'}
            strokeWidth={1}
          />
        );
      })}

      {horizontalLines.map((y) => {
        const screenY = y * scale + offsetY;
        const isMajor = Math.round(y / majorStep) === y / majorStep;

        return (
          <line
            key={`h-${y}`}
            x1={0}
            x2={width}
            y1={screenY}
            y2={screenY}
            stroke={isMajor ? '#cbd5e1' : '#e2e8f0'}
            strokeWidth={1}
          />
        );
      })}
    </g>
  );
}
