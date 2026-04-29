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
import {
  resolveDraftingSnapPoint,
  type DraftingSnapMode,
  type DraftingSnapResult,
  type DraftingSnapSettings,
} from '../snapping/drafting-snap-utils';
import type { DraftingRect } from '../model-utils';
import type { PdfUnderlayPageMetrics } from '../hooks/use-pdf-underlay-render';
import { buildDraftingLabelLayout } from '../labels/drafting-label-candidates';
import {
  resolveDraftingLineStyle,
  resolveDraftingTextStyle,
} from '../standards/drafting-style-resolver';
import { getDraftingStandardProfile } from '../standards/drafting-standard-profiles';
import type { DraftingCommandTool } from '../commands/drafting-command-session';
import {
  DRAFTING_CANVAS_LABEL_MODES,
  type DraftingCanvasLabelMode,
} from '../renderers/label-policy';
import { DraftingPdfUnderlay } from './drafting-pdf-underlay';
import { DraftingStatusBar } from './drafting-status-bar';

export function DraftingStage({
  canvasSize,
  commandPrompt,
  containerRef,
  model,
  labelMode = 'minimal',
  onBackgroundPointerDown,
  onCanvasClick,
  onCanvasPointerMove,
  onCanvasWheel,
  onCenterReference,
  onFitModel,
  onFitSelected,
  onObjectHandlePointerDown,
  onObjectPointerDown,
  onResetZoom,
  onSetZoomScale,
  onLabelModeChange = () => {},
  onToggleSnapEnabled = () => {},
  onToggleSnapMode = () => {},
  onViewLockedChange,
  onUnderlayPointerDown,
  onZoomIn,
  onZoomOut,
  pendingCommandPreviewTool,
  pendingLinePoints,
  pendingLinePreviewPoints,
  snapSettings,
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
  commandPrompt?: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
  model: DraftingModel;
  labelMode?: DraftingCanvasLabelMode;
  onBackgroundPointerDown: (event: React.PointerEvent<SVGSVGElement>) => void;
  onCanvasClick: (event: React.MouseEvent<SVGSVGElement>) => void;
  onCanvasPointerMove?: (point: DraftingPoint | null) => void;
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
  onLabelModeChange?: (mode: DraftingCanvasLabelMode) => void;
  onToggleSnapEnabled?: () => void;
  onToggleSnapMode?: (mode: DraftingSnapMode) => void;
  onViewLockedChange: (locked: boolean) => void;
  onUnderlayPointerDown: (
    event: React.PointerEvent<SVGElement>,
    underlay: DraftingUnderlay,
    metrics: PdfUnderlayPageMetrics,
  ) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  pendingCommandPreviewTool?: DraftingCommandTool | null;
  pendingLinePoints: DraftingPoint[];
  pendingLinePreviewPoints?: DraftingPoint[];
  snapSettings?: DraftingSnapSettings;
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
  const [snapPreview, setSnapPreview] = React.useState<DraftingSnapResult | null>(null);
  const activeSnapSettings = snapSettings ?? {
    enabled: false,
    modes: {
      centre: false,
      endpoint: false,
      grid: false,
      intersection: false,
      midpoint: false,
      nearest_path: false,
      orthogonal: false,
    },
    tolerancePx: 14,
  };
  const setup = model.drawingSetup!;
  const standardProfile = getDraftingStandardProfile(setup.activeStandardProfileId);
  const pendingLineStyle = resolveDraftingLineStyle({ role: 'constructionSetout', setup });
  const referencePoint = setup.referencePoint.modelPoint;
  const selectedSheetScale = selectedDrawingSheet?.scaleLabel ?? setup.scale.defaultSheetScale;
  const zoomPercent = Math.round(view.scale * 100);
  const viewStatus = formatDraftingCanvasViewStatus(viewMode, zoomPercent);
  const selectedObject = selectedObjectId
    ? (visibleObjects.find((object) => object.id === selectedObjectId) ?? null)
    : null;
  const labelLayout = React.useMemo(
    () =>
      buildDraftingLabelLayout({
        labelMode,
        model,
        objects: visibleObjects,
        selectedObjectId,
        surface: 'editor',
        viewScale: view.scale,
      }),
    [labelMode, model, selectedObjectId, view.scale, visibleObjects],
  );

  function handlePointerMove(event: React.PointerEvent<SVGSVGElement>) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    const worldPoint = screenToWorldPoint(
      {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      },
      view,
    );
    setCursorPoint(worldPoint);
    const resolvedSnap = resolveDraftingSnapPoint({
      gridStepMm: gridStep,
      model,
      objects: visibleObjects,
      orthogonalOrigin: pendingLinePoints.at(-1) ?? null,
      point: worldPoint,
      scale: view.scale,
      settings: activeSnapSettings,
    });
    setSnapPreview(resolvedSnap);
    onCanvasPointerMove?.(resolvedSnap.point);
  }

  const pendingPreviewPoints = pendingLinePreviewPoints ?? pendingLinePoints;
  const pendingPreviewCursorPoint = snapPreview?.point ?? cursorPoint;
  const renderedPendingLinePoints =
    pendingCommandPreviewTool &&
    pendingLinePoints.length > 0 &&
    pendingPreviewPoints.length <= pendingLinePoints.length &&
    pendingPreviewCursorPoint
      ? [...pendingLinePoints, pendingPreviewCursorPoint]
      : pendingPreviewPoints;

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
            onToggleSnapEnabled={onToggleSnapEnabled}
            onToggleSnapMode={onToggleSnapMode}
            onLabelModeChange={onLabelModeChange}
            onViewLockedChange={onViewLockedChange}
            onZoomIn={onZoomIn}
            onZoomOut={onZoomOut}
            selectedObjectId={selectedObjectId}
            sheetScale={selectedSheetScale}
            viewMode={viewMode}
            viewLocked={viewLocked}
            zoomPercent={zoomPercent}
            snapSettings={activeSnapSettings}
            labelMode={labelMode}
          />
          <svg
            className="h-full w-full touch-none"
            data-testid="drafting-canvas-svg"
            onWheel={onCanvasWheel}
            onClick={onCanvasClick}
            onPointerMove={handlePointerMove}
            onPointerDown={onBackgroundPointerDown}
          >
            <rect
              x={0}
              y={0}
              width={canvasSize.width}
              height={canvasSize.height}
              fill={standardProfile.palette.background}
            />
            <GridLayer
              bounds={visibleWorldBounds}
              height={canvasSize.height}
              offsetX={view.offsetX}
              offsetY={view.offsetY}
              scale={view.scale}
              setup={setup}
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
                    labelMode,
                    labelPlacement: labelLayout.placementByObjectId[object.id],
                    object,
                    allObjects: model.objects,
                    onPointerDown: (event) => onObjectPointerDown(event, object),
                    viewScale: view.scale,
                  })}
                </React.Fragment>
              ))}

              <DraftingObjectHandles
                model={model}
                object={selectedObject}
                onHandlePointerDown={onObjectHandlePointerDown}
                scale={view.scale}
              />
              <SelectedObjectSourceBadge object={selectedObject} scale={view.scale} />

              <ReferencePointMarker
                label={setup.referencePoint.label}
                point={referencePoint}
                scale={view.scale}
                setup={setup}
              />

              <PendingCommandPreview
                points={renderedPendingLinePoints}
                stroke={pendingLineStyle.color}
                strokeDasharray={pendingLineStyle.dashArray}
                strokeWidth={pendingLineStyle.editorStrokeWidth}
                tool={pendingCommandPreviewTool}
              />

              {snapPreview?.candidate ? (
                <SnapPreviewMarker scale={view.scale} snapPreview={snapPreview} />
              ) : null}

              {showDrawingSheetViewportOverlay && selectedDrawingSheet ? (
                <DrawingSheetViewportOverlay sheet={selectedDrawingSheet} />
              ) : null}
            </g>
            <CanvasNorthOverlay setup={setup} width={canvasSize.width} />
          </svg>

          <DraftingStatusBar
            commandPrompt={commandPrompt}
            cursorPoint={cursorPoint}
            displayUnits={setup.displayUnits}
            hasModelExtents={Boolean(getDraftingModelBounds(visibleObjects))}
            snapLabel={
              snapPreview?.candidate
                ? `${snapPreview.candidate.label}`
                : activeSnapSettings.enabled
                  ? 'Snap on'
                  : 'Snap off'
            }
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
  onToggleSnapEnabled,
  onToggleSnapMode,
  onLabelModeChange,
  onViewLockedChange,
  onZoomIn,
  onZoomOut,
  selectedObjectId,
  sheetScale,
  viewMode,
  viewLocked,
  zoomPercent,
  snapSettings,
  labelMode,
}: {
  onCenterReference: () => void;
  onFitModel: () => void;
  onFitSelected: () => void;
  onResetZoom: () => void;
  onSetZoomScale: (scale: number) => void;
  onToggleSnapEnabled: () => void;
  onToggleSnapMode: (mode: DraftingSnapMode) => void;
  onLabelModeChange: (mode: DraftingCanvasLabelMode) => void;
  onViewLockedChange: (locked: boolean) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  selectedObjectId: string | null;
  sheetScale: string;
  viewMode: DraftingCanvasViewMode;
  viewLocked: boolean;
  zoomPercent: number;
  snapSettings: DraftingSnapSettings;
  labelMode: DraftingCanvasLabelMode;
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
      <div className="flex items-center gap-1 border-l pl-2">
        <Button
          aria-label="Toggle snap"
          className="h-8 px-2 text-xs"
          type="button"
          variant={snapSettings.enabled ? 'secondary' : 'outline'}
          onClick={onToggleSnapEnabled}
          title="S toggles snap"
        >
          Snap {snapSettings.enabled ? 'On' : 'Off'}
        </Button>
        <Button
          aria-label="Toggle grid snap"
          className="h-8 px-2 text-xs"
          type="button"
          variant={snapSettings.modes.grid ? 'secondary' : 'outline'}
          onClick={() => onToggleSnapMode('grid')}
          title="G toggles grid snap"
        >
          Grid
        </Button>
        <Button
          aria-label="Toggle orthogonal mode"
          className="h-8 px-2 text-xs"
          type="button"
          variant={snapSettings.modes.orthogonal ? 'secondary' : 'outline'}
          onClick={() => onToggleSnapMode('orthogonal')}
          title="O toggles ortho mode"
        >
          Ortho
        </Button>
      </div>
      <div className="flex items-center gap-1 border-l pl-2" aria-label="Canvas label mode">
        <span className="px-1 text-xs font-medium text-muted-foreground">Labels</span>
        {DRAFTING_CANVAS_LABEL_MODES.map((mode) => (
          <Button
            aria-label={`Labels ${mode}`}
            className="h-8 px-2 text-xs capitalize"
            key={mode}
            type="button"
            variant={labelMode === mode ? 'secondary' : 'outline'}
            onClick={() => onLabelModeChange(mode)}
          >
            {mode}
          </Button>
        ))}
      </div>
      <div className="basis-full text-right text-[11px] text-muted-foreground">
        {viewLocked ? 'Unlock view to pan, zoom, fit, or recenter. ' : ''}
        Canvas view separate · Sheet scale {sheetScale} · Labels {labelMode} · Snap{' '}
        {snapSettings.enabled ? 'on' : 'off'}
      </div>
    </div>
  );
}

function PendingCommandPreview({
  points,
  stroke,
  strokeDasharray,
  strokeWidth,
  tool,
}: {
  points: DraftingPoint[];
  stroke: string;
  strokeDasharray?: string;
  strokeWidth: number;
  tool?: DraftingCommandTool | null;
}) {
  if (points.length === 0) {
    return null;
  }

  const [startPoint, previewPoint] = points;
  if (tool === 'dimension_chain') {
    if (!previewPoint) {
      return null;
    }

    return (
      <polyline
        data-testid="drafting-command-preview-dimension-chain"
        fill="none"
        points={points.map((point) => `${point.x},${point.y}`).join(' ')}
        stroke={stroke}
        strokeDasharray={strokeDasharray}
        strokeWidth={strokeWidth}
        vectorEffect="non-scaling-stroke"
      />
    );
  }

  if (tool === 'leader_note') {
    return (
      <g data-testid="drafting-command-preview-leader-note">
        <line
          fill="none"
          stroke={stroke}
          strokeDasharray={strokeDasharray}
          strokeWidth={strokeWidth}
          vectorEffect="non-scaling-stroke"
          x1={startPoint!.x}
          x2={startPoint!.x + 1200}
          y1={startPoint!.y}
          y2={startPoint!.y - 600}
        />
        <circle
          cx={startPoint!.x}
          cy={startPoint!.y}
          fill="none"
          r={48}
          stroke={stroke}
          strokeDasharray={strokeDasharray}
          strokeWidth={strokeWidth}
          vectorEffect="non-scaling-stroke"
        />
      </g>
    );
  }

  if (tool === 'callout') {
    const labelPoint = { x: startPoint!.x + 1800, y: startPoint!.y - 1400 };
    return (
      <g data-testid="drafting-command-preview-callout">
        <polyline
          fill="none"
          points={`${startPoint!.x},${startPoint!.y} ${labelPoint.x},${labelPoint.y + 180}`}
          stroke={stroke}
          strokeDasharray={strokeDasharray}
          strokeWidth={strokeWidth}
          vectorEffect="non-scaling-stroke"
        />
        <rect
          fill="none"
          height={360}
          stroke={stroke}
          strokeDasharray={strokeDasharray}
          strokeWidth={strokeWidth}
          vectorEffect="non-scaling-stroke"
          width={1900}
          x={labelPoint.x}
          y={labelPoint.y}
        />
        <circle
          cx={startPoint!.x}
          cy={startPoint!.y}
          fill="none"
          r={48}
          stroke={stroke}
          strokeDasharray={strokeDasharray}
          strokeWidth={strokeWidth}
          vectorEffect="non-scaling-stroke"
        />
      </g>
    );
  }

  if (tool === 'monitoring_point') {
    return (
      <g data-testid="drafting-command-preview-monitoring-point">
        <circle
          cx={startPoint!.x}
          cy={startPoint!.y}
          fill="none"
          r={220}
          stroke={stroke}
          strokeDasharray={strokeDasharray}
          strokeWidth={strokeWidth}
          vectorEffect="non-scaling-stroke"
        />
        <line
          stroke={stroke}
          strokeDasharray={strokeDasharray}
          strokeWidth={strokeWidth}
          vectorEffect="non-scaling-stroke"
          x1={startPoint!.x - 300}
          x2={startPoint!.x + 300}
          y1={startPoint!.y}
          y2={startPoint!.y}
        />
        <line
          stroke={stroke}
          strokeDasharray={strokeDasharray}
          strokeWidth={strokeWidth}
          vectorEffect="non-scaling-stroke"
          x1={startPoint!.x}
          x2={startPoint!.x}
          y1={startPoint!.y - 300}
          y2={startPoint!.y + 300}
        />
      </g>
    );
  }

  if (tool === 'structural_joint') {
    return (
      <g data-testid="drafting-command-preview-structural-joint">
        <circle
          cx={startPoint!.x}
          cy={startPoint!.y}
          fill="none"
          r={120}
          stroke={stroke}
          strokeDasharray={strokeDasharray}
          strokeWidth={strokeWidth}
          vectorEffect="non-scaling-stroke"
        />
        <line
          stroke={stroke}
          strokeDasharray={strokeDasharray}
          strokeWidth={strokeWidth}
          vectorEffect="non-scaling-stroke"
          x1={startPoint!.x - 190}
          x2={startPoint!.x + 190}
          y1={startPoint!.y}
          y2={startPoint!.y}
        />
        <line
          stroke={stroke}
          strokeDasharray={strokeDasharray}
          strokeWidth={strokeWidth}
          vectorEffect="non-scaling-stroke"
          x1={startPoint!.x}
          x2={startPoint!.x}
          y1={startPoint!.y - 190}
          y2={startPoint!.y + 190}
        />
      </g>
    );
  }

  if (tool === 'service_crossing') {
    return (
      <g data-testid="drafting-command-preview-service-crossing">
        <polygon
          fill="none"
          points={[
            `${startPoint!.x},${startPoint!.y - 220}`,
            `${startPoint!.x + 220},${startPoint!.y}`,
            `${startPoint!.x},${startPoint!.y + 220}`,
            `${startPoint!.x - 220},${startPoint!.y}`,
          ].join(' ')}
          stroke={stroke}
          strokeDasharray={strokeDasharray}
          strokeWidth={strokeWidth}
          vectorEffect="non-scaling-stroke"
        />
        <line
          stroke={stroke}
          strokeDasharray={strokeDasharray}
          strokeWidth={strokeWidth}
          vectorEffect="non-scaling-stroke"
          x1={startPoint!.x - 110}
          x2={startPoint!.x + 110}
          y1={startPoint!.y - 110}
          y2={startPoint!.y + 110}
        />
        <line
          stroke={stroke}
          strokeDasharray={strokeDasharray}
          strokeWidth={strokeWidth}
          vectorEffect="non-scaling-stroke"
          x1={startPoint!.x - 110}
          x2={startPoint!.x + 110}
          y1={startPoint!.y + 110}
          y2={startPoint!.y - 110}
        />
      </g>
    );
  }

  if (tool === 'borehole') {
    return (
      <g data-testid="drafting-command-preview-borehole">
        <circle
          cx={startPoint!.x}
          cy={startPoint!.y}
          fill="none"
          r={160}
          stroke={stroke}
          strokeDasharray={strokeDasharray}
          strokeWidth={strokeWidth}
          vectorEffect="non-scaling-stroke"
        />
        <line
          stroke={stroke}
          strokeDasharray={strokeDasharray}
          strokeWidth={strokeWidth}
          vectorEffect="non-scaling-stroke"
          x1={startPoint!.x}
          x2={startPoint!.x}
          y1={startPoint!.y - 220}
          y2={startPoint!.y + 220}
        />
        <line
          stroke={stroke}
          strokeDasharray={strokeDasharray}
          strokeWidth={strokeWidth}
          vectorEffect="non-scaling-stroke"
          x1={startPoint!.x - 220}
          x2={startPoint!.x + 220}
          y1={startPoint!.y}
          y2={startPoint!.y}
        />
      </g>
    );
  }

  if (tool === 'pile') {
    const radius = 300;
    const centreMark = 105;
    return (
      <g data-testid="drafting-command-preview-pile">
        <circle
          cx={startPoint!.x}
          cy={startPoint!.y}
          fill="none"
          r={radius}
          stroke={stroke}
          strokeDasharray={strokeDasharray}
          strokeWidth={strokeWidth}
          vectorEffect="non-scaling-stroke"
        />
        <line
          stroke={stroke}
          strokeDasharray={strokeDasharray}
          strokeWidth={strokeWidth}
          vectorEffect="non-scaling-stroke"
          x1={startPoint!.x - centreMark}
          x2={startPoint!.x + centreMark}
          y1={startPoint!.y}
          y2={startPoint!.y}
        />
        <line
          stroke={stroke}
          strokeDasharray={strokeDasharray}
          strokeWidth={strokeWidth}
          vectorEffect="non-scaling-stroke"
          x1={startPoint!.x}
          x2={startPoint!.x}
          y1={startPoint!.y - centreMark}
          y2={startPoint!.y + centreMark}
        />
      </g>
    );
  }

  if (tool === 'anchor_tieback') {
    if (!previewPoint) {
      return null;
    }

    return (
      <g data-testid="drafting-command-preview-anchor-tieback">
        <line
          fill="none"
          stroke={stroke}
          strokeDasharray={strokeDasharray}
          strokeWidth={strokeWidth}
          vectorEffect="non-scaling-stroke"
          x1={startPoint!.x}
          x2={previewPoint.x}
          y1={startPoint!.y}
          y2={previewPoint.y}
        />
        <circle
          cx={startPoint!.x}
          cy={startPoint!.y}
          fill="none"
          r={95}
          stroke={stroke}
          strokeDasharray={strokeDasharray}
          strokeWidth={strokeWidth}
          vectorEffect="non-scaling-stroke"
        />
        <circle
          cx={previewPoint.x}
          cy={previewPoint.y}
          fill="none"
          r={60}
          stroke={stroke}
          strokeDasharray={strokeDasharray}
          strokeWidth={strokeWidth}
          vectorEffect="non-scaling-stroke"
        />
      </g>
    );
  }

  if (!tool || tool === 'draft_line' || !previewPoint) {
    return (
      <polyline
        data-testid="drafting-command-preview-line"
        fill="none"
        points={points.map((point) => `${point.x},${point.y}`).join(' ')}
        stroke={stroke}
        strokeDasharray={strokeDasharray}
        strokeWidth={strokeWidth}
        vectorEffect="non-scaling-stroke"
      />
    );
  }

  if (tool === 'capping_beam') {
    return (
      <polyline
        data-testid="drafting-command-preview-capping-beam"
        fill="none"
        points={points.map((point) => `${point.x},${point.y}`).join(' ')}
        stroke={stroke}
        strokeDasharray={strokeDasharray}
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
        vectorEffect="non-scaling-stroke"
      />
    );
  }

  if (tool === 'excavation_line') {
    return (
      <polyline
        data-testid="drafting-command-preview-excavation-line"
        fill="none"
        points={points.map((point) => `${point.x},${point.y}`).join(' ')}
        stroke={stroke}
        strokeDasharray={strokeDasharray}
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
        vectorEffect="non-scaling-stroke"
      />
    );
  }

  if (tool === 'draft_polyline') {
    return (
      <polyline
        data-testid="drafting-command-preview-polyline"
        fill="none"
        points={points.map((point) => `${point.x},${point.y}`).join(' ')}
        stroke={stroke}
        strokeDasharray={strokeDasharray}
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
        vectorEffect="non-scaling-stroke"
      />
    );
  }

  if (tool === 'draft_polygon') {
    if (points.length < 3) {
      return (
        <polyline
          data-testid="drafting-command-preview-polygon"
          fill="none"
          points={points.map((point) => `${point.x},${point.y}`).join(' ')}
          stroke={stroke}
          strokeDasharray={strokeDasharray}
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
          vectorEffect="non-scaling-stroke"
        />
      );
    }

    return (
      <polygon
        data-testid="drafting-command-preview-polygon"
        fill="none"
        points={points.map((point) => `${point.x},${point.y}`).join(' ')}
        stroke={stroke}
        strokeDasharray={strokeDasharray}
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
        vectorEffect="non-scaling-stroke"
      />
    );
  }

  if (tool === 'section_marker') {
    return (
      <line
        data-testid="drafting-command-preview-section-marker"
        fill="none"
        stroke={stroke}
        strokeDasharray={strokeDasharray}
        strokeWidth={strokeWidth}
        vectorEffect="non-scaling-stroke"
        x1={startPoint!.x}
        x2={previewPoint.x}
        y1={startPoint!.y}
        y2={previewPoint.y}
      />
    );
  }

  if (tool === 'draft_rectangle') {
    const x = Math.min(startPoint!.x, previewPoint.x);
    const y = Math.min(startPoint!.y, previewPoint.y);
    const width = Math.abs(previewPoint.x - startPoint!.x);
    const height = Math.abs(previewPoint.y - startPoint!.y);

    return (
      <rect
        data-testid="drafting-command-preview-rectangle"
        fill="none"
        height={height}
        stroke={stroke}
        strokeDasharray={strokeDasharray}
        strokeWidth={strokeWidth}
        vectorEffect="non-scaling-stroke"
        width={width}
        x={x}
        y={y}
      />
    );
  }

  const radius = Math.hypot(previewPoint.x - startPoint!.x, previewPoint.y - startPoint!.y);
  return (
    <circle
      cx={startPoint!.x}
      cy={startPoint!.y}
      data-testid="drafting-command-preview-circle"
      fill="none"
      r={radius}
      stroke={stroke}
      strokeDasharray={strokeDasharray}
      strokeWidth={strokeWidth}
      vectorEffect="non-scaling-stroke"
    />
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

function SelectedObjectSourceBadge({
  object,
  scale,
}: {
  object: DraftingObject | null;
  scale: number;
}) {
  if (!object) {
    return null;
  }
  const anchor = getSourceBadgeAnchor(object);
  if (!anchor) {
    return null;
  }
  const label = getSelectedSourceBadgeLabel(object);
  const safeScale = Math.max(0.0001, scale);
  const width = Math.max(92, label.length * 7 + 18);
  const profile = getDraftingStandardProfile();
  const lineStyle = resolveDraftingLineStyle({ role: 'leaderLine' });
  const textStyle = resolveDraftingTextStyle({ role: 'NOTE_SMALL', surface: 'editor' });

  return (
    <g
      data-testid="drafting-selected-source-badge"
      pointerEvents="none"
      transform={`translate(${anchor.x} ${anchor.y}) scale(${1 / safeScale})`}
    >
      <rect
        fill={profile.palette.halo}
        height={22}
        rx={4}
        stroke={lineStyle.color}
        strokeWidth={lineStyle.editorStrokeWidth}
        vectorEffect="non-scaling-stroke"
        width={width}
        x={16}
        y={-34}
      />
      <text fill={lineStyle.color} fontSize={11} fontWeight={textStyle.fontWeight} x={26} y={-19}>
        {label}
      </text>
    </g>
  );
}

function SnapPreviewMarker({
  scale,
  snapPreview,
}: {
  scale: number;
  snapPreview: DraftingSnapResult;
}) {
  const candidate = snapPreview.candidate;
  if (!candidate) {
    return null;
  }
  const safeScale = Math.max(0.0001, scale);
  const label = candidate.label;
  const profile = getDraftingStandardProfile();
  const markerStyle = resolveDraftingLineStyle({ role: 'surveyControl' });
  const textStyle = resolveDraftingTextStyle({ role: 'NOTE_SMALL', surface: 'editor' });
  return (
    <g
      data-testid="drafting-snap-preview"
      pointerEvents="none"
      transform={`translate(${snapPreview.point.x} ${snapPreview.point.y}) scale(${1 / safeScale})`}
    >
      <rect
        fill={profile.palette.halo}
        height={20}
        rx={4}
        stroke={markerStyle.color}
        width={Math.max(64, label.length * 7 + 18)}
        x={12}
        y={-32}
      />
      <text fill={markerStyle.color} fontSize={11} fontWeight={textStyle.fontWeight} x={21} y={-18}>
        {label}
      </text>
      <circle
        fill={profile.palette.halo}
        r={6}
        stroke={markerStyle.color}
        strokeWidth={markerStyle.editorStrokeWidth}
        vectorEffect="non-scaling-stroke"
      />
      <line
        stroke={markerStyle.color}
        strokeWidth={markerStyle.editorStrokeWidth}
        vectorEffect="non-scaling-stroke"
        x1={-12}
        x2={12}
        y1={0}
        y2={0}
      />
      <line
        stroke={markerStyle.color}
        strokeWidth={markerStyle.editorStrokeWidth}
        vectorEffect="non-scaling-stroke"
        x1={0}
        x2={0}
        y1={-12}
        y2={12}
      />
    </g>
  );
}

function getSourceBadgeAnchor(object: DraftingObject): DraftingPoint | null {
  switch (object.type) {
    case 'pile':
      return object.geometry.centre;
    case 'borehole':
    case 'monitoring_point':
      return object.geometry.point;
    case 'service_crossing':
      return object.geometry.crossingPoint;
    case 'service_run':
      return object.geometry.path[0] ?? null;
    default:
      return null;
  }
}

function getSelectedSourceBadgeLabel(object: DraftingObject) {
  const sourceRef = object.sourceRef;
  if (!sourceRef || sourceRef.sourceType === 'manual') {
    return 'Sketch / unlinked';
  }
  if (sourceRef.sourceType === 'foundation_pile_type') {
    return `${sourceRef.sourceLabel ?? 'Pile type'} linked`;
  }
  if (sourceRef.sourceType === 'foundation_pile') {
    return `${sourceRef.sourceLabel ?? 'Pile'} linked`;
  }
  if (sourceRef.sourceType === 'foundation_joint') {
    return `${sourceRef.sourceLabel ?? 'Joint'} linked`;
  }
  if (sourceRef.sourceType === 'geotech_borehole') {
    return `${sourceRef.sourceLabel ?? 'Borehole'} linked`;
  }
  if (sourceRef.sourceType === 'spatial_feature') {
    if (object.type === 'service_run') {
      return `${sourceRef.sourceLabel ?? 'Service'} source`;
    }
    if (object.type === 'service_crossing') {
      return `${sourceRef.sourceLabel ?? 'Crossing'} source`;
    }
    return `${sourceRef.sourceLabel ?? 'Spatial'} linked`;
  }
  return 'Source linked';
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
  const textStyle = resolveDraftingTextStyle({ role: 'NOTE_SMALL', setup, surface: 'editor' });
  const profile = getDraftingStandardProfile(setup.activeStandardProfileId);

  return (
    <g
      data-testid="drafting-reference-point"
      pointerEvents="none"
      transform={`translate(${point.x} ${point.y}) scale(${1 / safeScale})`}
    >
      <circle
        fill={profile.palette.halo}
        r={8}
        stroke={surveyStyle.color}
        strokeWidth={surveyStyle.editorStrokeWidth}
        vectorEffect="non-scaling-stroke"
      />
      <line
        stroke={surveyStyle.color}
        strokeWidth={surveyStyle.editorStrokeWidth}
        vectorEffect="non-scaling-stroke"
        x1={-14}
        x2={14}
        y1={0}
        y2={0}
      />
      <line
        stroke={surveyStyle.color}
        strokeWidth={surveyStyle.editorStrokeWidth}
        vectorEffect="non-scaling-stroke"
        x1={0}
        x2={0}
        y1={-14}
        y2={14}
      />
      <text fill={surveyStyle.color} fontSize={11} fontWeight={textStyle.fontWeight} x={20} y={-12}>
        {label}
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
  const textStyle = resolveDraftingTextStyle({ role: 'NOTE_SMALL', setup, surface: 'editor' });

  return (
    <g data-testid="drafting-north-overlay" pointerEvents="none">
      {arrows.map((arrow, index) => {
        const arrowStyle = resolveDraftingLineStyle({ role: 'northArrow', setup });

        return (
          <g
            key={arrow.label}
            transform={`translate(${originX - index * 46} 76) rotate(${arrow.angle})`}
          >
            <line
              stroke={arrowStyle.color}
              strokeWidth={arrowStyle.editorStrokeWidth}
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
              fontWeight={textStyle.fontWeight}
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
  const profile = getDraftingStandardProfile();
  const borderStyle = resolveDraftingLineStyle({ role: 'BORDER' });
  const textStyle = resolveDraftingTextStyle({ role: 'SUBTITLE', surface: 'editor' });

  return (
    <g
      data-testid="drafting-sheet-viewport-overlay"
      pointerEvents="none"
      transform={`translate(${sheet.viewport.center.x} ${sheet.viewport.center.y}) rotate(${sheet.viewport.rotationDeg ?? 0})`}
    >
      <rect
        fill={profile.palette.selectionFill}
        height={height}
        stroke={borderStyle.color}
        strokeDasharray="220 140"
        strokeWidth={borderStyle.editorStrokeWidth}
        vectorEffect="non-scaling-stroke"
        width={width}
        x={-width / 2}
        y={-height / 2}
      />
      <text
        fill={borderStyle.color}
        fontSize={Math.max(180, textStyle.fontSize)}
        fontWeight={textStyle.fontWeight}
        stroke={textStyle.haloColor}
        strokeWidth={textStyle.haloStrokeWidth}
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
  setup,
  step,
  width,
}: {
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  height: number;
  offsetX: number;
  offsetY: number;
  scale: number;
  setup: NonNullable<DraftingModel['drawingSetup']>;
  step: number;
  width: number;
}) {
  const verticalLines = createGridAxisValues(bounds.minX, bounds.maxX, step);
  const horizontalLines = createGridAxisValues(bounds.minY, bounds.maxY, step);
  const majorStep = step * 5;
  const gridStyle = resolveDraftingLineStyle({ role: 'GRID', setup });
  const majorGridStyle = resolveDraftingLineStyle({ role: 'underlay', setup });

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
            stroke={isMajor ? majorGridStyle.color : gridStyle.color}
            strokeWidth={Math.max(0.6, gridStyle.editorStrokeWidth * (isMajor ? 1.25 : 0.8))}
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
            stroke={isMajor ? majorGridStyle.color : gridStyle.color}
            strokeWidth={Math.max(0.6, gridStyle.editorStrokeWidth * (isMajor ? 1.25 : 0.8))}
          />
        );
      })}
    </g>
  );
}
