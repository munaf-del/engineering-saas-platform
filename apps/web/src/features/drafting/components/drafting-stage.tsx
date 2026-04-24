import * as React from 'react';
import type {
  DraftingDrawingSheetDefinition,
  DraftingModel,
  DraftingObject,
  DraftingPoint,
  DraftingUnderlay,
} from '@eng/shared';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  createGridAxisValues,
  getGridStep,
  getVisibleWorldBounds,
  screenToWorldPoint,
  type DraftingCanvasSize,
} from '../geometry-utils';
import { getDraftingModelBounds, getLayerById } from '../model-utils';
import { renderDraftingObject } from '../renderers/render-drafting-object';
import type { DraftingRect } from '../model-utils';
import type { PdfUnderlayPageMetrics } from '../hooks/use-pdf-underlay-render';
import { DraftingPdfUnderlay } from './drafting-pdf-underlay';
import { DraftingStatusBar } from './drafting-status-bar';

export function DraftingStage({
  canvasSize,
  containerRef,
  model,
  onBackgroundPointerDown,
  onCanvasClick,
  onCanvasWheel,
  onObjectPointerDown,
  onUnderlayPointerDown,
  pendingLinePoints,
  selectedDrawingSheet,
  selectedUnderlayId,
  showDrawingSheetViewportOverlay,
  underlayCalibrationState,
  underlayCropPreview,
  underlayInteractionEnabled,
  selectedObjectId,
  visibleUnderlays,
  visibleObjects,
}: {
  canvasSize: DraftingCanvasSize;
  containerRef: React.RefObject<HTMLDivElement | null>;
  model: DraftingModel;
  onBackgroundPointerDown: (event: React.PointerEvent<SVGSVGElement>) => void;
  onCanvasClick: (event: React.MouseEvent<SVGSVGElement>) => void;
  onCanvasWheel: (event: React.WheelEvent<SVGSVGElement>) => void;
  onObjectPointerDown: (event: React.PointerEvent, object: DraftingObject) => void;
  onUnderlayPointerDown: (
    event: React.PointerEvent<SVGElement>,
    underlay: DraftingUnderlay,
    metrics: PdfUnderlayPageMetrics,
  ) => void;
  pendingLinePoints: DraftingPoint[];
  selectedDrawingSheet: DraftingDrawingSheetDefinition | null;
  selectedUnderlayId: string | null;
  showDrawingSheetViewportOverlay: boolean;
  underlayCalibrationState: {
    underlayId: string;
    pointA?: DraftingPoint | null;
    pointB?: DraftingPoint | null;
  } | null;
  underlayCropPreview: {
    underlayId: string;
    rect: DraftingRect | null;
  } | null;
  underlayInteractionEnabled: (underlay: DraftingUnderlay) => boolean;
  selectedObjectId: string | null;
  visibleUnderlays: DraftingUnderlay[];
  visibleObjects: DraftingObject[];
}) {
  const visibleWorldBounds = getVisibleWorldBounds(model.view, canvasSize);
  const gridStep = getGridStep(model.view.scale);
  const [cursorPoint, setCursorPoint] = React.useState<DraftingPoint | null>(null);
  const setup = model.drawingSetup!;
  const referencePoint = setup.referencePoint.modelPoint;
  const selectedSheetScale = selectedDrawingSheet?.scaleLabel ?? setup.scale.defaultSheetScale;

  function handlePointerMove(event: React.PointerEvent<SVGSVGElement>) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    setCursorPoint(
      screenToWorldPoint(
        {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        },
        model.view,
      ),
    );
  }

  return (
    <Card className="min-h-[720px]">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Canvas</CardTitle>
            <CardDescription>
              Model units {setup.modelUnits}; display units {setup.displayUnits}. Canvas zoom and
              plotted sheet scale are separate.
            </CardDescription>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Badge variant="outline">Model {setup.modelUnits}</Badge>
            <Badge variant="outline">Display {setup.displayUnits}</Badge>
            <Badge variant="outline">Zoom {Math.round(model.view.scale * 100)}%</Badge>
            <Badge variant="secondary">Sheet {selectedSheetScale}</Badge>
          </div>
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
            onPointerMove={handlePointerMove}
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
              {visibleUnderlays.map((underlay) => (
                <DraftingPdfUnderlay
                  key={underlay.id}
                  underlay={underlay}
                  isSelected={underlay.id === selectedUnderlayId}
                  interactionEnabled={underlayInteractionEnabled(underlay)}
                  cropPreview={
                    underlayCropPreview?.underlayId === underlay.id
                      ? underlayCropPreview.rect
                      : null
                  }
                  calibrationPoints={
                    underlayCalibrationState?.underlayId === underlay.id
                      ? {
                          pointA: underlayCalibrationState.pointA ?? null,
                          pointB: underlayCalibrationState.pointB ?? null,
                        }
                      : null
                  }
                  onPointerDown={(event, metrics) =>
                    onUnderlayPointerDown(event, underlay, metrics)
                  }
                />
              ))}

              {visibleObjects.map((object) =>
                renderDraftingObject({
                  isSelected: object.id === selectedObjectId,
                  layer: getLayerById(model, object.layerId),
                  object,
                  onPointerDown: (event) => onObjectPointerDown(event, object),
                }),
              )}

              <ReferencePointMarker
                label={setup.referencePoint.label}
                point={referencePoint}
                scale={model.view.scale}
              />

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

              {showDrawingSheetViewportOverlay && selectedDrawingSheet ? (
                <DrawingSheetViewportOverlay sheet={selectedDrawingSheet} />
              ) : null}
            </g>
            <CanvasNorthOverlay setup={setup} width={canvasSize.width} />
          </svg>

          <DraftingStatusBar
            cursorPoint={cursorPoint}
            displayUnits={setup.displayUnits}
            hasModelExtents={Boolean(getDraftingModelBounds(visibleObjects))}
            visibleObjectCount={visibleObjects.length}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function ReferencePointMarker({
  label,
  point,
  scale,
}: {
  label: string;
  point: DraftingPoint & { z: number };
  scale: number;
}) {
  const safeScale = Math.max(0.0001, scale);

  return (
    <g
      data-testid="drafting-reference-point"
      pointerEvents="none"
      transform={`translate(${point.x} ${point.y}) scale(${1 / safeScale})`}
    >
      <circle fill="#ffffff" r={9} stroke="#0f766e" strokeWidth={2} />
      <line stroke="#0f766e" strokeWidth={2} x1={-16} x2={16} y1={0} y2={0} />
      <line stroke="#0f766e" strokeWidth={2} x1={0} x2={0} y1={-16} y2={16} />
      <text fill="#0f766e" fontSize={12} fontWeight={700} x={20} y={-12}>
        {label}
      </text>
      <text fill="#475569" fontSize={10} x={20} y={2}>
        X {point.x.toFixed(0)} Y {point.y.toFixed(0)} Z {point.z.toFixed(0)}
      </text>
    </g>
  );
}

function CanvasNorthOverlay({
  setup,
  width,
}: {
  setup: NonNullable<DraftingModel['drawingSetup']>;
  width: number;
}) {
  const arrows = [
    setup.north.showProjectNorth
      ? { angle: setup.north.projectNorthAngleDeg, color: '#1e293b', label: 'PN' }
      : null,
    setup.north.showTrueNorth
      ? { angle: setup.north.trueNorthAngleDeg, color: '#b91c1c', label: 'TN' }
      : null,
  ].filter((arrow): arrow is { angle: number; color: string; label: string } => arrow !== null);

  if (arrows.length === 0) {
    return null;
  }

  const originX = Math.max(72, width - 86);

  return (
    <g data-testid="drafting-north-overlay" pointerEvents="none">
      {arrows.map((arrow, index) => (
        <g
          key={arrow.label}
          transform={`translate(${originX - index * 46} 76) rotate(${arrow.angle})`}
        >
          <line stroke={arrow.color} strokeWidth={2.5} x1={0} x2={0} y1={28} y2={-28} />
          <polygon fill={arrow.color} points="0,-38 -8,-22 8,-22" />
          <text
            fill={arrow.color}
            fontSize={12}
            fontWeight={700}
            textAnchor="middle"
            transform={`rotate(${-arrow.angle})`}
            y={48}
          >
            {arrow.label}
          </text>
        </g>
      ))}
    </g>
  );
}

function DrawingSheetViewportOverlay({ sheet }: { sheet: DraftingDrawingSheetDefinition }) {
  const width = (sheet.viewport.widthMm ?? 360) / Math.max(0.0001, Math.abs(sheet.viewport.scale));
  const height =
    (sheet.viewport.heightMm ?? 220) / Math.max(0.0001, Math.abs(sheet.viewport.scale));
  const label = `${sheet.sheetNumber || sheet.name} - ${sheet.scaleLabel || sheet.viewport.scale.toFixed(4)}`;

  return (
    <g
      data-testid="drafting-sheet-viewport-overlay"
      pointerEvents="none"
      transform={`translate(${sheet.viewport.center.x} ${sheet.viewport.center.y}) rotate(${sheet.viewport.rotationDeg ?? 0})`}
    >
      <rect
        fill="rgba(14, 165, 233, 0.08)"
        height={height}
        stroke="#0284c7"
        strokeDasharray="220 140"
        strokeWidth={24}
        vectorEffect="non-scaling-stroke"
        width={width}
        x={-width / 2}
        y={-height / 2}
      />
      <text
        fill="#0369a1"
        fontSize={260}
        fontWeight={700}
        stroke="#ffffff"
        strokeWidth={18}
        vectorEffect="non-scaling-stroke"
        x={-width / 2}
        y={-height / 2 - 180}
      >
        {label}
      </text>
    </g>
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
