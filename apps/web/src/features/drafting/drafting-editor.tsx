'use client';

import type * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  type DraftingExcavationLineObject,
  type DraftingLayer,
  type DraftingLeaderNoteObject,
  type DraftingModel,
  type DraftingMonitoringPointObject,
  type DraftingObject,
  type DraftingPileObject,
  type DraftingPoint,
  type Project,
} from '@eng/shared';
import { ArrowLeft, Download, Save } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { PageLoading } from '@/components/loading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useDraftingDrawing, useSaveDraftingModel } from '@/hooks/use-drafting';
import {
  buildDraftingExportFilename,
  clampNumber,
  cloneDraftingModel,
  createDraftingObject,
  fitDraftingModelView,
  formatDrawingRevision,
  formatDraftingTimestamp,
  getDraftingModelBounds,
  getGridStep,
  getLayerById,
  isLayerLocked,
  removeDraftingObject,
  replaceDraftingObject,
  translateDraftingObject,
  updateLayer,
} from './model-utils';

type ActiveTool = 'select' | 'pan' | 'pile' | 'excavation_line' | 'monitoring_point' | 'leader_note';

type DragState = {
  objectId: string;
  startWorldPoint: DraftingPoint;
  originalObject: DraftingObject;
};

type PanState = {
  startClientX: number;
  startClientY: number;
  originOffsetX: number;
  originOffsetY: number;
};

export function DraftingEditor({
  projectId,
  drawingId,
  project,
}: {
  projectId: string;
  drawingId: string;
  project: Project;
}) {
  const { data: drawing, isLoading } = useDraftingDrawing(projectId, drawingId);
  const saveModel = useSaveDraftingModel(projectId, drawingId);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 720 });
  const [model, setModel] = useState<DraftingModel | null>(null);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<ActiveTool>('select');
  const [pendingLinePoints, setPendingLinePoints] = useState<DraftingPoint[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [panState, setPanState] = useState<PanState | null>(null);
  const [activeTab, setActiveTab] = useState<'properties' | 'layers' | 'underlays'>('properties');

  useEffect(() => {
    if (drawing && !isDirty) {
      setModel(cloneDraftingModel(drawing.model));
      if (!drawing.model.objects.some((object) => object.id === selectedObjectId)) {
        setSelectedObjectId(null);
      }
    }
  }, [drawing, isDirty, selectedObjectId]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      setCanvasSize({
        width: Math.max(entry.contentRect.width, 320),
        height: Math.max(entry.contentRect.height, 320),
      });
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!model || (!dragState && !panState)) {
      return;
    }

    const currentModel = model;

    function handlePointerMove(event: PointerEvent) {
      if (dragState) {
        const point = clientToWorldPoint(
          event.clientX,
          event.clientY,
          containerRef.current,
          currentModel,
        );
        if (!point) {
          return;
        }

        const deltaX = point.x - dragState.startWorldPoint.x;
        const deltaY = point.y - dragState.startWorldPoint.y;

        setModel((current) => {
          if (!current) {
            return current;
          }

          return replaceDraftingObject(
            current,
            dragState.objectId,
            translateDraftingObject(dragState.originalObject, deltaX, deltaY),
          );
        });
        setIsDirty(true);
      }

      if (panState) {
        const deltaX = event.clientX - panState.startClientX;
        const deltaY = event.clientY - panState.startClientY;

        setModel((current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            view: {
              ...current.view,
              offsetX: panState.originOffsetX + deltaX,
              offsetY: panState.originOffsetY + deltaY,
            },
          };
        });
      }
    }

    function handlePointerUp() {
      setDragState(null);
      setPanState(null);
    }

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragState, model, panState]);

  useEffect(() => {
    if (!model) {
      return;
    }

    const currentModel = model;

    function handleKeyDown(event: KeyboardEvent) {
      if (!selectedObjectId) {
        return;
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        setModel(removeDraftingObject(currentModel, selectedObjectId));
        setSelectedObjectId(null);
        setIsDirty(true);
      }

      if (event.key === 'Escape' && pendingLinePoints.length > 0) {
        setPendingLinePoints([]);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [model, pendingLinePoints.length, selectedObjectId]);

  if (isLoading || !drawing || !model) {
    return <PageLoading />;
  }

  const currentDrawing = drawing;
  const currentModel = model;

  const selectedObject =
    currentModel.objects.find((object) => object.id === selectedObjectId) ?? null;
  const visibleObjects = currentModel.objects.filter((object) => {
    if (object.visible === false) {
      return false;
    }

    const layer = getLayerById(currentModel, object.layerId);
    return layer?.visible !== false;
  });
  const gridStep = getGridStep(currentModel.view.scale);
  const visibleWorldBounds = {
    minX: (0 - currentModel.view.offsetX) / currentModel.view.scale,
    minY: (0 - currentModel.view.offsetY) / currentModel.view.scale,
    maxX: (canvasSize.width - currentModel.view.offsetX) / currentModel.view.scale,
    maxY: (canvasSize.height - currentModel.view.offsetY) / currentModel.view.scale,
  };

  async function handleSaveModel() {
    try {
      const saved = await saveModel.mutateAsync(currentModel);
      setModel(cloneDraftingModel(saved.model));
      setIsDirty(false);
      toast.success('Drafting model saved');
    } catch {
      toast.error('Failed to save drafting model');
    }
  }

  function updateSelectedObject(nextObject: DraftingObject) {
    if (!selectedObject) {
      return;
    }

    setModel((current) => (current ? replaceDraftingObject(current, selectedObject.id, nextObject) : current));
    setIsDirty(true);
  }

  function updateModel(nextModel: DraftingModel) {
    setModel(nextModel);
    setIsDirty(true);
  }

  function handleCanvasWheel(event: React.WheelEvent<SVGSVGElement>) {
    event.preventDefault();

    const point = clientToWorldPoint(
      event.clientX,
      event.clientY,
      containerRef.current,
      currentModel,
    );
    if (!point) {
      return;
    }

    const scaleFactor = event.deltaY < 0 ? 1.1 : 0.9;
    const nextScale = clampNumber(currentModel.view.scale * scaleFactor, 0.005, 2);
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;

    updateModel({
      ...currentModel,
      view: {
        scale: nextScale,
        offsetX: localX - point.x * nextScale,
        offsetY: localY - point.y * nextScale,
      },
    });
  }

  function handleCanvasClick(event: React.MouseEvent<SVGSVGElement>) {
    const target = event.target as SVGElement;
    if (target.closest('[data-drafting-object="true"]')) {
      return;
    }

    const point = clientToWorldPoint(
      event.clientX,
      event.clientY,
      containerRef.current,
      currentModel,
    );
    if (!point) {
      return;
    }

    if (activeTool === 'select' || activeTool === 'pan') {
      setSelectedObjectId(null);
      return;
    }

    if (activeTool === 'excavation_line') {
      setPendingLinePoints((current) => [...current, point]);
      return;
    }

    const nextObject = createDraftingObject(activeTool, point, currentModel);
    updateModel({
      ...currentModel,
      objects: [...currentModel.objects, nextObject],
    });
    setSelectedObjectId(nextObject.id);
    setActiveTab('properties');
  }

  function handleBackgroundPointerDown(event: React.PointerEvent<SVGSVGElement>) {
    if (activeTool !== 'pan') {
      return;
    }

    setPanState({
      startClientX: event.clientX,
      startClientY: event.clientY,
      originOffsetX: currentModel.view.offsetX,
      originOffsetY: currentModel.view.offsetY,
    });
  }

  function handleObjectPointerDown(event: React.PointerEvent, object: DraftingObject) {
    event.stopPropagation();

    const point = clientToWorldPoint(
      event.clientX,
      event.clientY,
      containerRef.current,
      currentModel,
    );
    if (!point) {
      return;
    }

    setSelectedObjectId(object.id);
    setActiveTab('properties');

    if (
      activeTool === 'select' &&
      !object.locked &&
      !isLayerLocked(currentModel, object.layerId)
    ) {
      setDragState({
        objectId: object.id,
        startWorldPoint: point,
        originalObject: object,
      });
    }
  }

  function handleFitView() {
    updateModel({
      ...currentModel,
      view: fitDraftingModelView(currentModel, canvasSize.width, canvasSize.height),
    });
  }

  function handleExportJson() {
    const blob = new Blob([JSON.stringify(currentModel, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${buildDraftingExportFilename(currentDrawing.title)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleFinishExcavationLine() {
    if (pendingLinePoints.length < 2) {
      return;
    }

    const nextObject = createDraftingObject(
      'excavation_line',
      pendingLinePoints[0]!,
      currentModel,
      pendingLinePoints,
    );

    updateModel({
      ...currentModel,
      objects: [...currentModel.objects, nextObject],
    });
    setPendingLinePoints([]);
    setSelectedObjectId(nextObject.id);
    setActiveTab('properties');
  }

  return (
    <>
      <div className="mb-4">
        <Link
          href={`/projects/${projectId}/drafting`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to drawing register
        </Link>
      </div>

      <PageHeader
        title={currentDrawing.title}
        description={`${project.code} · Drafting editor`}
        badges={
          <>
            <Badge variant={currentDrawing.status === 'draft' ? 'warning' : 'secondary'}>
              {currentDrawing.status}
            </Badge>
            <Badge variant="outline">{formatDrawingRevision(currentDrawing)}</Badge>
            {isDirty ? (
              <Badge variant="warning">Unsaved changes</Badge>
            ) : (
              <Badge variant="success">Saved</Badge>
            )}
          </>
        }
        actions={
          <>
            <Button variant="outline" onClick={handleFitView}>
              Fit View
            </Button>
            <Button variant="outline" onClick={handleExportJson}>
              <Download className="mr-2 h-4 w-4" />
              Export JSON
            </Button>
            <Button variant="outline" disabled>
              Revision Placeholder
            </Button>
            <Button onClick={handleSaveModel} disabled={!isDirty || saveModel.isPending}>
              <Save className="mr-2 h-4 w-4" />
              Save
            </Button>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)_340px]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Tools</CardTitle>
            <CardDescription>
              Choose a tool, then author typed objects into the drawing model.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <ToolButton active={activeTool === 'select'} onClick={() => setActiveTool('select')}>
              Select / Move
            </ToolButton>
            <ToolButton active={activeTool === 'pan'} onClick={() => setActiveTool('pan')}>
              Pan View
            </ToolButton>
            <Separator />
            <ToolButton active={activeTool === 'pile'} onClick={() => setActiveTool('pile')}>
              Add Pile
            </ToolButton>
            <ToolButton
              active={activeTool === 'excavation_line'}
              onClick={() => setActiveTool('excavation_line')}
            >
              Add Excavation Line
            </ToolButton>
            <ToolButton
              active={activeTool === 'monitoring_point'}
              onClick={() => setActiveTool('monitoring_point')}
            >
              Add Monitoring Point
            </ToolButton>
            <ToolButton
              active={activeTool === 'leader_note'}
              onClick={() => setActiveTool('leader_note')}
            >
              Add Leader Note
            </ToolButton>

            {activeTool === 'excavation_line' ? (
              <>
                <Separator />
                <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                  {pendingLinePoints.length === 0
                    ? 'Click in the canvas to start the excavation polyline.'
                    : `${pendingLinePoints.length} point(s) captured for the current line.`}
                </div>
                <Button
                  className="w-full"
                  onClick={handleFinishExcavationLine}
                  disabled={pendingLinePoints.length < 2}
                >
                  Finish Line
                </Button>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => setPendingLinePoints([])}
                  disabled={pendingLinePoints.length === 0}
                >
                  Cancel Line
                </Button>
              </>
            ) : null}

            <Separator />
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>{currentModel.objects.length} object(s) in current model</p>
              <p>Last saved {formatDraftingTimestamp(currentDrawing.updatedAt)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="min-h-[720px]">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">Canvas</CardTitle>
                <CardDescription>
                  Model space units are millimetres. Pan, zoom, select, move, and edit saved objects.
                </CardDescription>
              </div>
              <Badge variant="outline">
                {Math.round(currentModel.view.scale * 1000)} px / m
              </Badge>
            </div>
          </CardHeader>

          <CardContent>
            <div
              ref={containerRef}
              className="relative h-[640px] overflow-hidden rounded-lg border bg-slate-50"
            >
              <svg
                className="h-full w-full touch-none"
                onWheel={handleCanvasWheel}
                onClick={handleCanvasClick}
                onPointerDown={handleBackgroundPointerDown}
              >
                <rect x={0} y={0} width={canvasSize.width} height={canvasSize.height} fill="#f8fafc" />
                <GridLayer
                  bounds={visibleWorldBounds}
                  height={canvasSize.height}
                  offsetX={currentModel.view.offsetX}
                  offsetY={currentModel.view.offsetY}
                  scale={currentModel.view.scale}
                  step={gridStep}
                  width={canvasSize.width}
                />

                <g
                  transform={`translate(${currentModel.view.offsetX} ${currentModel.view.offsetY}) scale(${currentModel.view.scale})`}
                >
                  {visibleObjects.map((object) => (
                    <DraftingObjectShape
                      key={object.id}
                      isSelected={object.id === selectedObjectId}
                      layer={getLayerById(currentModel, object.layerId)}
                      object={object}
                      onPointerDown={(event) => handleObjectPointerDown(event, object)}
                    />
                  ))}

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

              <div className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-white/90 px-3 py-2 text-xs text-muted-foreground shadow">
                {visibleObjects.length} visible object(s) ·{' '}
                {getDraftingModelBounds(visibleObjects)
                  ? 'Model extents ready'
                  : 'Place the first object to establish extents'}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="min-h-[720px]">
          <CardHeader>
            <CardTitle className="text-base">Inspector</CardTitle>
            <CardDescription>
              Edit object properties, layer controls, and underlay placeholders.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="properties">Properties</TabsTrigger>
                <TabsTrigger value="layers">Layers</TabsTrigger>
                <TabsTrigger value="underlays">Underlays</TabsTrigger>
              </TabsList>

              <TabsContent value="properties">
                <ScrollArea className="h-[580px] pr-3">
                  {!selectedObject ? (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">No selection</CardTitle>
                        <CardDescription>
                          Select a drafting object to edit its layer, geometry, style, and metadata.
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  ) : (
                    <SelectedObjectInspector
                      layers={currentModel.layers}
                      object={selectedObject}
                      onDelete={() => {
                        updateModel(removeDraftingObject(currentModel, selectedObject.id));
                        setSelectedObjectId(null);
                      }}
                      onUpdate={updateSelectedObject}
                    />
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="layers">
                <ScrollArea className="h-[580px] pr-3">
                  <div className="space-y-3">
                    {currentModel.layers.map((layer) => (
                      <LayerEditor
                        key={layer.id}
                        layer={layer}
                        onUpdate={(nextLayer) => updateModel(updateLayer(currentModel, nextLayer))}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="underlays">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">PDF Underlays</CardTitle>
                    <CardDescription>
                      Underlay management is scaffolded here and the actual PDF workflow is the next phase.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button variant="outline" disabled>
                      Add PDF Underlay Placeholder
                    </Button>
                    <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                      No underlays are loaded yet. Phase 2 focuses on authored objects and model persistence; PDF.js rendering will plug into this tab next.
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function ToolButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Button className="w-full justify-start" variant={active ? 'default' : 'outline'} onClick={onClick}>
      {children}
    </Button>
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
  const verticalLines = [];
  const horizontalLines = [];
  const startX = Math.floor(bounds.minX / step) * step;
  const endX = Math.ceil(bounds.maxX / step) * step;
  const startY = Math.floor(bounds.minY / step) * step;
  const endY = Math.ceil(bounds.maxY / step) * step;
  const majorStep = step * 5;

  for (let x = startX; x <= endX; x += step) {
    const screenX = x * scale + offsetX;
    const isMajor = Math.round(x / majorStep) === x / majorStep;

    verticalLines.push(
      <line
        key={`v-${x}`}
        x1={screenX}
        x2={screenX}
        y1={0}
        y2={height}
        stroke={isMajor ? '#cbd5e1' : '#e2e8f0'}
        strokeWidth={1}
      />,
    );
  }

  for (let y = startY; y <= endY; y += step) {
    const screenY = y * scale + offsetY;
    const isMajor = Math.round(y / majorStep) === y / majorStep;

    horizontalLines.push(
      <line
        key={`h-${y}`}
        x1={0}
        x2={width}
        y1={screenY}
        y2={screenY}
        stroke={isMajor ? '#cbd5e1' : '#e2e8f0'}
        strokeWidth={1}
      />,
    );
  }

  return (
    <g>
      {verticalLines}
      {horizontalLines}
    </g>
  );
}

function DraftingObjectShape({
  isSelected,
  layer,
  object,
  onPointerDown,
}: {
  isSelected: boolean;
  layer: DraftingLayer | null;
  object: DraftingObject;
  onPointerDown: (event: React.PointerEvent) => void;
}) {
  const stroke = object.style?.stroke ?? layer?.color ?? '#334155';
  const fill = object.style?.fill ?? 'transparent';
  const lineWeight = object.style?.lineWeight ?? layer?.lineWeight ?? 1;
  const dashArray = object.style?.lineStyle === 'dashed' ? '300 180' : undefined;

  if (object.type === 'pile') {
    const radius = object.geometry.diameterMm / 2;
    return (
      <g data-drafting-object="true" onPointerDown={onPointerDown}>
        {isSelected ? (
          <circle
            cx={object.geometry.centre.x}
            cy={object.geometry.centre.y}
            fill="rgba(59, 130, 246, 0.12)"
            r={radius + 180}
            stroke="#2563eb"
            strokeWidth={50}
            vectorEffect="non-scaling-stroke"
          />
        ) : null}
        <circle
          cx={object.geometry.centre.x}
          cy={object.geometry.centre.y}
          fill={fill}
          r={radius}
          stroke={stroke}
          strokeWidth={lineWeight * 30}
          vectorEffect="non-scaling-stroke"
        />
        <text
          fill={stroke}
          fontSize={220}
          x={object.geometry.centre.x + radius + 180}
          y={object.geometry.centre.y - 120}
        >
          {object.metadata.pileId}
        </text>
      </g>
    );
  }

  if (object.type === 'monitoring_point') {
    const { x, y } = object.geometry.point;
    return (
      <g data-drafting-object="true" onPointerDown={onPointerDown}>
        {isSelected ? (
          <circle
            cx={x}
            cy={y}
            fill="rgba(124, 58, 237, 0.12)"
            r={420}
            stroke="#7c3aed"
            strokeWidth={50}
            vectorEffect="non-scaling-stroke"
          />
        ) : null}
        <circle
          cx={x}
          cy={y}
          fill={fill}
          r={220}
          stroke={stroke}
          strokeWidth={lineWeight * 30}
          vectorEffect="non-scaling-stroke"
        />
        <line
          stroke={stroke}
          strokeWidth={lineWeight * 30}
          vectorEffect="non-scaling-stroke"
          x1={x - 300}
          x2={x + 300}
          y1={y}
          y2={y}
        />
        <line
          stroke={stroke}
          strokeWidth={lineWeight * 30}
          vectorEffect="non-scaling-stroke"
          x1={x}
          x2={x}
          y1={y - 300}
          y2={y + 300}
        />
        <text fill={stroke} fontSize={220} x={x + 320} y={y - 140}>
          {object.metadata.pointId}
        </text>
      </g>
    );
  }

  if (object.type === 'leader_note') {
    const { anchor, textPoint } = object.geometry;
    return (
      <g data-drafting-object="true" onPointerDown={onPointerDown}>
        <line
          stroke={stroke}
          strokeWidth={lineWeight * 25}
          vectorEffect="non-scaling-stroke"
          x1={anchor.x}
          x2={textPoint.x}
          y1={anchor.y}
          y2={textPoint.y}
        />
        <circle
          cx={anchor.x}
          cy={anchor.y}
          fill={stroke}
          r={60}
          vectorEffect="non-scaling-stroke"
        />
        <rect
          fill="rgba(255,255,255,0.92)"
          height={420}
          rx={60}
          stroke={isSelected ? '#2563eb' : stroke}
          strokeWidth={lineWeight * 20}
          vectorEffect="non-scaling-stroke"
          width={1600}
          x={textPoint.x}
          y={textPoint.y - 300}
        />
        <text fill={stroke} fontSize={220} x={textPoint.x + 120} y={textPoint.y - 40}>
          {object.metadata.text}
        </text>
      </g>
    );
  }

  if (object.type === 'excavation_line') {
    const firstPoint = object.geometry.points[0];
    return (
      <g data-drafting-object="true" onPointerDown={onPointerDown}>
        <polyline
          fill={object.geometry.closed ? 'rgba(185, 28, 28, 0.08)' : 'none'}
          points={object.geometry.points.map((point) => `${point.x},${point.y}`).join(' ')}
          stroke={isSelected ? '#991b1b' : stroke}
          strokeDasharray={dashArray}
          strokeWidth={lineWeight * 35}
          vectorEffect="non-scaling-stroke"
        />
        {firstPoint ? (
          <text fill={stroke} fontSize={220} x={firstPoint.x + 120} y={firstPoint.y - 160}>
            {object.metadata.excavationId || object.name || 'Excavation'}
          </text>
        ) : null}
      </g>
    );
  }

  return null;
}

function SelectedObjectInspector({
  layers,
  object,
  onDelete,
  onUpdate,
}: {
  layers: DraftingLayer[];
  object: DraftingObject;
  onDelete: () => void;
  onUpdate: (nextObject: DraftingObject) => void;
}) {
  function patch(updater: (current: DraftingObject) => DraftingObject) {
    onUpdate(updater(object));
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Selected Object</CardTitle>
          <CardDescription>
            {object.type.replaceAll('_', ' ')} · Created {formatDraftingTimestamp(object.createdAt)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <Input
                value={object.name ?? ''}
                onChange={(event) =>
                  patch((current) => ({
                    ...current,
                    name: event.target.value,
                    updatedAt: new Date().toISOString(),
                  }))
                }
              />
            </Field>

            <Field label="Layer">
              <Select
                value={object.layerId}
                onValueChange={(value) =>
                  patch((current) => ({
                    ...current,
                    layerId: value as DraftingObject['layerId'],
                    updatedAt: new Date().toISOString(),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {layers.map((layer) => (
                    <SelectItem key={layer.id} value={layer.id}>
                      {layer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Stroke">
              <Input
                type="color"
                value={normalizeColorInput(object.style?.stroke, '#334155')}
                onChange={(event) =>
                  patch((current) => ({
                    ...current,
                    style: {
                      ...current.style,
                      stroke: event.target.value,
                    },
                    updatedAt: new Date().toISOString(),
                  }))
                }
              />
            </Field>

            <Field label="Fill">
              <Input
                type="color"
                value={normalizeColorInput(object.style?.fill, '#ffffff')}
                onChange={(event) =>
                  patch((current) => ({
                    ...current,
                    style: {
                      ...current.style,
                      fill: event.target.value,
                    },
                    updatedAt: new Date().toISOString(),
                  }))
                }
              />
            </Field>
          </div>

          {object.type === 'pile' ? (
            <PileFields object={object} onUpdate={onUpdate} />
          ) : null}

          {object.type === 'monitoring_point' ? (
            <MonitoringFields object={object} onUpdate={onUpdate} />
          ) : null}

          {object.type === 'leader_note' ? (
            <LeaderNoteFields object={object} onUpdate={onUpdate} />
          ) : null}

          {object.type === 'excavation_line' ? (
            <ExcavationLineFields object={object} onUpdate={onUpdate} />
          ) : null}

          <Separator />

          <div className="flex gap-2">
            <Button variant="destructive" onClick={onDelete}>
              Delete Object
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PileFields({
  object,
  onUpdate,
}: {
  object: DraftingPileObject;
  onUpdate: (nextObject: DraftingObject) => void;
}) {
  const now = new Date().toISOString();

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="Centre X (mm)"
          value={object.geometry.centre.x}
          onChange={(value) =>
            onUpdate({
              ...object,
              geometry: {
                ...object.geometry,
                centre: { ...object.geometry.centre, x: value },
              },
              updatedAt: now,
            })
          }
        />
        <NumberField
          label="Centre Y (mm)"
          value={object.geometry.centre.y}
          onChange={(value) =>
            onUpdate({
              ...object,
              geometry: {
                ...object.geometry,
                centre: { ...object.geometry.centre, y: value },
              },
              updatedAt: now,
            })
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Pile ID">
          <Input
            value={object.metadata.pileId}
            onChange={(event) =>
              onUpdate({
                ...object,
                metadata: {
                  ...object.metadata,
                  pileId: event.target.value,
                },
                updatedAt: now,
              })
            }
          />
        </Field>
        <NumberField
          label="Diameter (mm)"
          value={object.geometry.diameterMm}
          onChange={(value) =>
            onUpdate({
              ...object,
              geometry: {
                ...object.geometry,
                diameterMm: value,
              },
              updatedAt: now,
            })
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="Cut-off Level"
          value={object.metadata.cutOffLevel ?? ''}
          onChange={(value) =>
            onUpdate({
              ...object,
              metadata: {
                ...object.metadata,
                cutOffLevel: value,
              },
              updatedAt: now,
            })
          }
        />
        <NumberField
          label="Toe Level"
          value={object.metadata.toeLevel ?? ''}
          onChange={(value) =>
            onUpdate({
              ...object,
              metadata: {
                ...object.metadata,
                toeLevel: value,
              },
              updatedAt: now,
            })
          }
        />
      </div>

      <Field label="Notes">
        <Textarea
          rows={3}
          value={object.metadata.notes ?? ''}
          onChange={(event) =>
            onUpdate({
              ...object,
              metadata: {
                ...object.metadata,
                notes: event.target.value,
              },
              updatedAt: now,
            })
          }
        />
      </Field>
    </div>
  );
}

function MonitoringFields({
  object,
  onUpdate,
}: {
  object: DraftingMonitoringPointObject;
  onUpdate: (nextObject: DraftingObject) => void;
}) {
  const now = new Date().toISOString();

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="Point X (mm)"
          value={object.geometry.point.x}
          onChange={(value) =>
            onUpdate({
              ...object,
              geometry: {
                point: { ...object.geometry.point, x: value },
              },
              updatedAt: now,
            })
          }
        />
        <NumberField
          label="Point Y (mm)"
          value={object.geometry.point.y}
          onChange={(value) =>
            onUpdate({
              ...object,
              geometry: {
                point: { ...object.geometry.point, y: value },
              },
              updatedAt: now,
            })
          }
        />
      </div>

      <Field label="Monitoring ID">
        <Input
          value={object.metadata.pointId}
          onChange={(event) =>
            onUpdate({
              ...object,
              metadata: {
                ...object.metadata,
                pointId: event.target.value,
              },
              updatedAt: now,
            })
          }
        />
      </Field>

      <Field label="Monitoring Type">
        <Select
          value={object.metadata.monitoringType}
          onValueChange={(value) =>
            onUpdate({
              ...object,
              metadata: {
                ...object.metadata,
                monitoringType: value as DraftingMonitoringPointObject['metadata']['monitoringType'],
              },
              updatedAt: now,
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="vibration">Vibration</SelectItem>
            <SelectItem value="settlement">Settlement</SelectItem>
            <SelectItem value="inclinometer">Inclinometer</SelectItem>
            <SelectItem value="crack">Crack</SelectItem>
            <SelectItem value="survey">Survey</SelectItem>
            <SelectItem value="noise">Noise</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <Field label="Notes">
        <Textarea
          rows={3}
          value={object.metadata.notes ?? ''}
          onChange={(event) =>
            onUpdate({
              ...object,
              metadata: {
                ...object.metadata,
                notes: event.target.value,
              },
              updatedAt: now,
            })
          }
        />
      </Field>
    </div>
  );
}

function LeaderNoteFields({
  object,
  onUpdate,
}: {
  object: DraftingLeaderNoteObject;
  onUpdate: (nextObject: DraftingObject) => void;
}) {
  const now = new Date().toISOString();

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="Anchor X (mm)"
          value={object.geometry.anchor.x}
          onChange={(value) =>
            onUpdate({
              ...object,
              geometry: {
                ...object.geometry,
                anchor: { ...object.geometry.anchor, x: value },
              },
              updatedAt: now,
            })
          }
        />
        <NumberField
          label="Anchor Y (mm)"
          value={object.geometry.anchor.y}
          onChange={(value) =>
            onUpdate({
              ...object,
              geometry: {
                ...object.geometry,
                anchor: { ...object.geometry.anchor, y: value },
              },
              updatedAt: now,
            })
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="Text X (mm)"
          value={object.geometry.textPoint.x}
          onChange={(value) =>
            onUpdate({
              ...object,
              geometry: {
                ...object.geometry,
                textPoint: { ...object.geometry.textPoint, x: value },
              },
              updatedAt: now,
            })
          }
        />
        <NumberField
          label="Text Y (mm)"
          value={object.geometry.textPoint.y}
          onChange={(value) =>
            onUpdate({
              ...object,
              geometry: {
                ...object.geometry,
                textPoint: { ...object.geometry.textPoint, y: value },
              },
              updatedAt: now,
            })
          }
        />
      </div>

      <Field label="Note Text">
        <Textarea
          rows={4}
          value={object.metadata.text}
          onChange={(event) =>
            onUpdate({
              ...object,
              metadata: {
                text: event.target.value,
              },
              updatedAt: now,
            })
          }
        />
      </Field>
    </div>
  );
}

function ExcavationLineFields({
  object,
  onUpdate,
}: {
  object: DraftingExcavationLineObject;
  onUpdate: (nextObject: DraftingObject) => void;
}) {
  const now = new Date().toISOString();

  return (
    <div className="space-y-4">
      <Field label="Excavation ID">
        <Input
          value={object.metadata.excavationId ?? ''}
          onChange={(event) =>
            onUpdate({
              ...object,
              metadata: {
                ...object.metadata,
                excavationId: event.target.value,
              },
              updatedAt: now,
            })
          }
        />
      </Field>

      <Field label="Stage">
        <Input
          value={object.metadata.stage ?? ''}
          onChange={(event) =>
            onUpdate({
              ...object,
              metadata: {
                ...object.metadata,
                stage: event.target.value,
              },
              updatedAt: now,
            })
          }
        />
      </Field>

      <div className="space-y-3">
        <Label>Polyline Points (mm)</Label>
        {object.geometry.points.map((point, index) => (
          <div key={`${object.id}-point-${index}`} className="grid gap-4 sm:grid-cols-2">
            <NumberField
              label={`Point ${index + 1} X`}
              value={point.x}
              onChange={(value) =>
                onUpdate({
                  ...object,
                  geometry: {
                    ...object.geometry,
                    points: object.geometry.points.map((existingPoint, pointIndex) =>
                      pointIndex === index ? { ...existingPoint, x: value } : existingPoint,
                    ),
                  },
                  updatedAt: now,
                })
              }
            />
            <NumberField
              label={`Point ${index + 1} Y`}
              value={point.y}
              onChange={(value) =>
                onUpdate({
                  ...object,
                  geometry: {
                    ...object.geometry,
                    points: object.geometry.points.map((existingPoint, pointIndex) =>
                      pointIndex === index ? { ...existingPoint, y: value } : existingPoint,
                    ),
                  },
                  updatedAt: now,
                })
              }
            />
          </div>
        ))}
      </div>

      <Field label="Notes">
        <Textarea
          rows={3}
          value={object.metadata.notes ?? ''}
          onChange={(event) =>
            onUpdate({
              ...object,
              metadata: {
                ...object.metadata,
                notes: event.target.value,
              },
              updatedAt: now,
            })
          }
        />
      </Field>
    </div>
  );
}

function LayerEditor({
  layer,
  onUpdate,
}: {
  layer: DraftingLayer;
  onUpdate: (nextLayer: DraftingLayer) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{layer.name}</CardTitle>
        <CardDescription>{layer.id}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Visible">
            <Button
              variant={layer.visible ? 'default' : 'outline'}
              onClick={() => onUpdate({ ...layer, visible: !layer.visible })}
            >
              {layer.visible ? 'Visible' : 'Hidden'}
            </Button>
          </Field>

          <Field label="Locked">
            <Button
              variant={layer.locked ? 'default' : 'outline'}
              onClick={() => onUpdate({ ...layer, locked: !layer.locked })}
            >
              {layer.locked ? 'Locked' : 'Unlocked'}
            </Button>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Color">
            <Input
              type="color"
              value={normalizeColorInput(layer.color, '#334155')}
              onChange={(event) => onUpdate({ ...layer, color: event.target.value })}
            />
          </Field>

          <NumberField
            label="Line Weight"
            value={layer.lineWeight}
            onChange={(value) => onUpdate({ ...layer, lineWeight: value })}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function NumberField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: number) => void;
  value: number | string;
}) {
  return (
    <Field label={label}>
      <Input
        type="number"
        value={value}
        onChange={(event) => {
          const nextValue = Number(event.target.value);
          if (Number.isFinite(nextValue)) {
            onChange(nextValue);
          }
        }}
      />
    </Field>
  );
}

function normalizeColorInput(value: string | undefined, fallback: string) {
  if (!value) {
    return fallback;
  }

  if (value.startsWith('#') && (value.length === 7 || value.length === 4)) {
    return value;
  }

  return fallback;
}

function clientToWorldPoint(
  clientX: number,
  clientY: number,
  node: HTMLDivElement | null,
  model: DraftingModel,
) {
  if (!node) {
    return null;
  }

  const rect = node.getBoundingClientRect();
  return {
    x: (clientX - rect.left - model.view.offsetX) / model.view.scale,
    y: (clientY - rect.top - model.view.offsetY) / model.view.scale,
  };
}
