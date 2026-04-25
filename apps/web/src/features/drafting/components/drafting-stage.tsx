import * as React from 'react';
import type {
  DraftingDrawingSheetDefinition,
  DraftingModel,
  DraftingObject,
  DraftingPoint,
  DraftingUnderlay,
} from '@eng/shared';
import {
  Crosshair,
  Lock,
  Maximize2,
  Minus,
  Plus,
  RotateCcw,
  ScanSearch,
  Unlock,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  createGridAxisValues,
  getGridStep,
  getVisibleWorldBounds,
  screenToWorldPoint,
  type DraftingCanvasSize,
} from '../geometry-utils';
import { getDraftingModelBounds, getLayerById } from '../model-utils';
import { DraftingObjectHandles } from '../handles/drafting-object-handles';
import { renderDraftingObject } from '../renderers/render-drafting-object';
import type { DraftingRect } from '../model-utils';
import type { PdfUnderlayPageMetrics } from '../hooks/use-pdf-underlay-render';
import { resolveDraftingLineStyle } from '../standards/drafting-style-resolver';
import { DraftingPdfUnderlay } from './drafting-pdf-underlay';
import { DraftingStatusBar } from './drafting-status-bar';

export function DraftingStage({
  canvasSize,
  containerRef,
  model,
  onBackgroundPointerDown,
  onCanvasClick,
  onCanvasWheel,
  onCenterReference,
  onFitModel,
  onFitSelected,
  onObjectHandlePointerDown,
  onObjectPointerDown,
  onResetZoom,
  onSetZoomScale,
  onViewLockedChange,
  onUnderlayPointerDown,
  onZoomIn,
  onZoomOut,
  pendingLinePoints,
  selectedDrawingSheet,
  selectedUnderlayId,
  showDrawingSheetViewportOverlay,
  underlayCalibrationState,
  underlayCropPreview,
  underlayInteractionEnabled,
  view,
  viewMode = 'custom',
  viewLocked,
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
  onCenterReference: () => void;
  onFitModel: () => void;
  onFitSelected: () => void;
  onObjectHandlePointerDown: (
    event: React.PointerEvent,
    object: DraftingObject,
    handleId: string,
  ) => void;
  onObjectPointerDown: (event: React.PointerEvent, object: DraftingObject) => void;
  onResetZoom: () => void;
  onSetZoomScale: (scale: number) => void;
  onViewLockedChange: (locked: boolean) => void;
  onUnderlayPointerDown: (
    event: React.PointerEvent<SVGElement>,
    underlay: DraftingUnderlay,
    metrics: PdfUnderlayPageMetrics,
  ) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
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
  view: DraftingModel['view'];
  viewMode?: DraftingCanvasViewMode;
  viewLocked: boolean;
  selectedObjectId: string | null;
  visibleUnderlays: DraftingUnderlay[];
  visibleObjects: DraftingObject[];
}) {
  const visibleWorldBounds = getVisibleWorldBounds(view, canvasSize);
  const gridStep = getGridStep(view.scale);
  const [cursorPoint, setCursorPoint] = React.useState<DraftingPoint | null>(null);
  const setup = model.drawingSetup!;
  const referencePoint = setup.referencePoint.modelPoint;
  const selectedSheetScale = selectedDrawingSheet?.scaleLabel ?? setup.scale.defaultSheetScale;
  const zoomPercent = Math.round(view.scale * 100);
  const viewStatus = formatDraftingCanvasViewStatus(viewMode, zoomPercent);
  const selectedObject = selectedObjectId
    ? (visibleObjects.find((object) => object.id === selectedObjectId) ?? null)
    : null;

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
        view,
      ),
    );
  }

  return (
    <Card data-testid="drafting-canvas-stage">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Project Model Canvas</CardTitle>
            <CardDescription>
              Model space uses reference point / survey mark coordinates. Model units, display
              units, canvas zoom, and plotted sheet scale are separate.
            </CardDescription>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Badge variant="outline">Model units {setup.modelUnits}</Badge>
            <Badge variant="outline">Display {setup.displayUnits}</Badge>
            <Badge variant="outline">{viewStatus}</Badge>
            {viewLocked ? <Badge variant="secondary">View locked</Badge> : null}
            <Badge variant="secondary">Sheet {selectedSheetScale}</Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div
          ref={containerRef}
          className="relative h-[clamp(560px,66vh,760px)] overflow-hidden rounded-lg border bg-slate-50"
        >
          <DraftingCanvasZoomControls
            onCenterReference={onCenterReference}
            onFitModel={onFitModel}
            onFitSelected={onFitSelected}
            onResetZoom={onResetZoom}
            onSetZoomScale={onSetZoomScale}
            onViewLockedChange={onViewLockedChange}
            onZoomIn={onZoomIn}
            onZoomOut={onZoomOut}
            selectedObjectId={selectedObjectId}
            sheetScale={selectedSheetScale}
            viewMode={viewMode}
            viewLocked={viewLocked}
            zoomPercent={zoomPercent}
          />
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
              offsetX={view.offsetX}
              offsetY={view.offsetY}
              scale={view.scale}
              step={gridStep}
              width={canvasSize.width}
            />

            <g transform={`translate(${view.offsetX} ${view.offsetY}) scale(${view.scale})`}>
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

              {visibleObjects.map((object) => (
                <React.Fragment key={object.id}>
                  {renderDraftingObject({
                    drawingSetup: setup,
                    isSelected: object.id === selectedObjectId,
                    layer: getLayerById(model, object.layerId),
                    object,
                    onPointerDown: (event) => onObjectPointerDown(event, object),
                  })}
                </React.Fragment>
              ))}

              <DraftingObjectHandles
                model={model}
                object={selectedObject}
                onHandlePointerDown={onObjectHandlePointerDown}
                scale={view.scale}
              />

              <ReferencePointMarker
                label={setup.referencePoint.label}
                point={referencePoint}
                scale={view.scale}
                setup={setup}
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

function DraftingCanvasZoomControls({
  onCenterReference,
  onFitModel,
  onFitSelected,
  onResetZoom,
  onSetZoomScale,
  onViewLockedChange,
  onZoomIn,
  onZoomOut,
  selectedObjectId,
  sheetScale,
  viewMode,
  viewLocked,
  zoomPercent,
}: {
  onCenterReference: () => void;
  onFitModel: () => void;
  onFitSelected: () => void;
  onResetZoom: () => void;
  onSetZoomScale: (scale: number) => void;
  onViewLockedChange: (locked: boolean) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  selectedObjectId: string | null;
  sheetScale: string;
  viewMode: DraftingCanvasViewMode;
  viewLocked: boolean;
  zoomPercent: number;
}) {
  const lockedTitle = viewLocked ? 'Unlock view to pan, zoom, fit, or recenter.' : undefined;
  const viewStatus = formatDraftingCanvasViewStatus(viewMode, zoomPercent);

  return (
    <div className="absolute right-3 top-3 z-10 flex flex-wrap items-center justify-end gap-2 rounded-md border bg-background/95 p-2 shadow-sm">
      <div className="flex items-center gap-1">
        <Button
          aria-label="Zoom out"
          disabled={viewLocked}
          size="icon"
          title={lockedTitle}
          variant="outline"
          onClick={onZoomOut}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <div className="min-w-24 text-center text-sm font-medium" aria-label="Current canvas zoom">
          {viewStatus}
        </div>
        <Button
          aria-label="Zoom in"
          disabled={viewLocked}
          size="icon"
          title={lockedTitle}
          variant="outline"
          onClick={onZoomIn}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <Select
        disabled={viewLocked}
        value="custom"
        onValueChange={(value) => {
          if (value === 'fit') {
            onFitModel();
            return;
          }

          const nextScale = Number(value);
          if (Number.isFinite(nextScale)) {
            onSetZoomScale(nextScale);
          }
        }}
      >
        <SelectTrigger className="h-9 w-[116px]" aria-label="Zoom preset" title={lockedTitle}>
          <SelectValue placeholder="Preset" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="custom">Preset</SelectItem>
          <SelectItem value="0.25">25%</SelectItem>
          <SelectItem value="0.5">50%</SelectItem>
          <SelectItem value="1">100%</SelectItem>
          <SelectItem value="2">200%</SelectItem>
          <SelectItem value="fit">Fit</SelectItem>
        </SelectContent>
      </Select>
      <div className="flex items-center gap-1">
        <Button
          aria-label="Reset zoom to 100%"
          disabled={viewLocked}
          size="icon"
          title={lockedTitle}
          variant="outline"
          onClick={onResetZoom}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button
          aria-label="Fit model"
          disabled={viewLocked}
          size="icon"
          title={lockedTitle}
          variant="outline"
          onClick={onFitModel}
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
        <Button
          aria-label="Fit selected"
          size="icon"
          variant="outline"
          onClick={onFitSelected}
          disabled={viewLocked || !selectedObjectId}
          title={lockedTitle}
        >
          <ScanSearch className="h-4 w-4" />
        </Button>
        <Button
          aria-label="Centre on reference point"
          size="icon"
          variant="outline"
          onClick={onCenterReference}
          disabled={viewLocked}
          title={lockedTitle}
        >
          <Crosshair className="h-4 w-4" />
        </Button>
      </div>
      <Button
        aria-label="Lock View"
        className="h-9"
        size="sm"
        type="button"
        variant={viewLocked ? 'secondary' : 'outline'}
        onClick={() => onViewLockedChange(!viewLocked)}
      >
        {viewLocked ? <Lock className="mr-2 h-4 w-4" /> : <Unlock className="mr-2 h-4 w-4" />}
        {viewLocked ? 'View Locked' : 'Lock View'}
      </Button>
      <div className="basis-full text-right text-[11px] text-muted-foreground">
        {viewLocked ? 'Unlock view to pan, zoom, fit, or recenter. ' : ''}
        Canvas view separate · Sheet scale {sheetScale}
      </div>
    </div>
  );
}

type DraftingCanvasViewMode =
  | 'custom'
  | 'model-fit'
  | 'selection-fit'
  | 'reference-centred'
  | 'reset-100';

function formatDraftingCanvasViewStatus(mode: DraftingCanvasViewMode, zoomPercent: number) {
  switch (mode) {
    case 'model-fit':
      return `Fit view (${zoomPercent}%)`;
    case 'selection-fit':
      return `Selection fit (${zoomPercent}%)`;
    case 'reference-centred':
      return `Reference centred (${zoomPercent}%)`;
    case 'reset-100':
      return `Canvas zoom 100%`;
    default:
      return zoomPercent < 25 ? `Model view (${zoomPercent}%)` : `Canvas zoom ${zoomPercent}%`;
  }
}

function ReferencePointMarker({
  label,
  point,
  scale,
  setup,
}: {
  label: string;
  point: DraftingPoint & { z: number };
  scale: number;
  setup: NonNullable<DraftingModel['drawingSetup']>;
}) {
  const safeScale = Math.max(0.0001, scale);
  const surveyStyle = resolveDraftingLineStyle({ role: 'surveyControl', setup });

  return (
    <g
      data-testid="drafting-reference-point"
      pointerEvents="none"
      transform={`translate(${point.x} ${point.y}) scale(${1 / safeScale})`}
    >
      <circle
        fill="#ffffff"
        r={8}
        stroke={surveyStyle.color}
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
      <line
        stroke={surveyStyle.color}
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
        x1={-14}
        x2={14}
        y1={0}
        y2={0}
      />
      <line
        stroke={surveyStyle.color}
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
        x1={0}
        x2={0}
        y1={-14}
        y2={14}
      />
      <text fill={surveyStyle.color} fontSize={12} fontWeight={700} x={20} y={-12}>
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
    setup.north.showProjectNorth ? { angle: setup.north.projectNorthAngleDeg, label: 'PN' } : null,
    setup.north.showTrueNorth ? { angle: setup.north.trueNorthAngleDeg, label: 'TN' } : null,
  ].filter((arrow): arrow is { angle: number; label: string } => arrow !== null);

  if (arrows.length === 0) {
    return null;
  }

  const originX = Math.max(72, width - 86);

  return (
    <g data-testid="drafting-north-overlay" pointerEvents="none">
      {arrows.map((arrow, index) => {
        const arrowStyle = resolveDraftingLineStyle({ role: 'surveyControl', setup });

        return (
          <g
            key={arrow.label}
            transform={`translate(${originX - index * 46} 76) rotate(${arrow.angle})`}
          >
            <line
              stroke={arrowStyle.color}
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
              x1={0}
              x2={0}
              y1={24}
              y2={-24}
            />
            <polygon fill={arrowStyle.color} points="0,-38 -8,-22 8,-22" />
            <text
              fill={arrowStyle.color}
              fontSize={12}
              fontWeight={700}
              textAnchor="middle"
              transform={`rotate(${-arrow.angle})`}
              y={48}
            >
              {arrow.label}
            </text>
          </g>
        );
      })}
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
        fill="rgba(14, 165, 233, 0.035)"
        height={height}
        stroke="#0284c7"
        strokeDasharray="220 140"
        strokeWidth={1.5}
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
        strokeWidth={3}
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
