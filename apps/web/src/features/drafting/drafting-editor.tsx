'use client';

import * as React from 'react';
import type { DraftingObject, Project } from '@eng/shared';
import { toast } from 'sonner';
import { PageLoading } from '@/components/loading';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DraftingLayerPanel } from './components/drafting-layer-panel';
import { DraftingPropertiesPanel } from './components/drafting-properties-panel';
import { DraftingStage } from './components/drafting-stage';
import { DraftingToolPalette } from './components/drafting-tool-palette';
import { DraftingToolbar } from './components/drafting-toolbar';
import { DraftingUnderlaysPanel } from './components/drafting-underlays-panel';
import { downloadDraftingModelJson } from './export-utils';
import { clientToWorldPoint } from './geometry-utils';
import { useDrafting } from './hooks/use-drafting';
import { useDraftingHistory } from './hooks/use-drafting-history';
import { useDraftingSelection } from './hooks/use-drafting-selection';
import { useDraftingView } from './hooks/use-drafting-view';
import {
  createDraftingObject,
  getVisibleDraftingObjects,
  updateLayer,
} from './model-utils';

export function DraftingEditor({
  projectId,
  drawingId,
  project,
}: {
  projectId: string;
  drawingId: string;
  project: Project;
}) {
  const drafting = useDrafting();
  const history = useDraftingHistory(projectId, drawingId);
  const view = useDraftingView({
    activeTool: drafting.activeTool,
    model: history.model,
    patchModel: history.patchModel,
    replaceModel: history.replaceModel,
  });
  const selection = useDraftingSelection({
    activeTool: drafting.activeTool,
    containerRef: view.containerRef,
    model: history.model,
    onCancelPendingLine: drafting.clearPendingLine,
    onSelectPropertiesTab: () => drafting.setActiveTab('properties'),
    pendingLinePointCount: drafting.pendingLinePoints.length,
    patchModel: history.patchModel,
  });

  if (history.isLoading || !history.drawing || !history.model) {
    return <PageLoading />;
  }

  const currentDrawing = history.drawing;
  const currentModel = history.model;
  const visibleObjects = getVisibleDraftingObjects(currentModel);

  async function handleSaveModel() {
    try {
      await history.saveModel();
      toast.success('Drafting model saved');
    } catch {
      toast.error('Failed to save drafting model');
    }
  }

  function handleCanvasClick(event: React.MouseEvent<SVGSVGElement>) {
    const target = event.target as SVGElement;
    if (target.closest('[data-drafting-object="true"]')) {
      return;
    }

    const point = clientToWorldPoint(
      event.clientX,
      event.clientY,
      view.containerRef.current,
      currentModel,
    );
    if (!point) {
      return;
    }

    if (drafting.activeTool === 'select' || drafting.activeTool === 'pan') {
      selection.clearSelection();
      return;
    }

    if (drafting.activeTool === 'excavation_line') {
      drafting.addPendingLinePoint(point);
      return;
    }

    const nextObject = createDraftingObject(drafting.activeTool, point, currentModel);
    history.replaceModel({
      ...currentModel,
      objects: [...currentModel.objects, nextObject],
    });
    selection.selectObject(nextObject.id);
    drafting.setActiveTab('properties');
  }

  function handleFinishExcavationLine() {
    if (drafting.pendingLinePoints.length < 2) {
      return;
    }

    const nextObject = createDraftingObject(
      'excavation_line',
      drafting.pendingLinePoints[0]!,
      currentModel,
      drafting.pendingLinePoints,
    );

    history.replaceModel({
      ...currentModel,
      objects: [...currentModel.objects, nextObject],
    });
    drafting.clearPendingLine();
    selection.selectObject(nextObject.id);
    drafting.setActiveTab('properties');
  }

  return (
    <>
      <DraftingToolbar
        drawing={currentDrawing}
        isDirty={history.isDirty}
        isSaving={history.isSaving}
        onExportJson={() => downloadDraftingModelJson(currentModel, currentDrawing.title)}
        onFitView={view.handleFitView}
        onSave={handleSaveModel}
        projectCode={project.code}
        projectId={projectId}
      />

      <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)_340px]">
        <DraftingToolPalette
          activeTool={drafting.activeTool}
          drawingUpdatedAt={currentDrawing.updatedAt}
          model={currentModel}
          onCancelLine={drafting.clearPendingLine}
          onFinishLine={handleFinishExcavationLine}
          onToolChange={drafting.setActiveTool}
          pendingLinePointsCount={drafting.pendingLinePoints.length}
        />

        <DraftingStage
          canvasSize={view.canvasSize}
          containerRef={view.containerRef}
          model={currentModel}
          onBackgroundPointerDown={view.handleBackgroundPointerDown}
          onCanvasClick={handleCanvasClick}
          onCanvasWheel={view.handleCanvasWheel}
          onObjectPointerDown={selection.handleObjectPointerDown}
          pendingLinePoints={drafting.pendingLinePoints}
          selectedObjectId={selection.selectedObjectId}
          visibleObjects={visibleObjects}
        />

        <Card className="min-h-[720px]">
          <CardHeader>
            <CardTitle className="text-base">Inspector</CardTitle>
            <CardDescription>
              Edit object properties, layer controls, and underlay placeholders.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              value={drafting.activeTab}
              onValueChange={(value) => drafting.setActiveTab(value as typeof drafting.activeTab)}
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="properties">Properties</TabsTrigger>
                <TabsTrigger value="layers">Layers</TabsTrigger>
                <TabsTrigger value="underlays">Underlays</TabsTrigger>
              </TabsList>

              <TabsContent value="properties">
                <ScrollArea className="h-[580px] pr-3">
                  <DraftingPropertiesPanel
                    layers={currentModel.layers}
                    object={selection.selectedObject}
                    onDelete={selection.deleteSelectedObject}
                    onUpdate={(nextObject: DraftingObject) => selection.updateSelectedObject(nextObject)}
                  />
                </ScrollArea>
              </TabsContent>

              <TabsContent value="layers">
                <ScrollArea className="h-[580px] pr-3">
                  <DraftingLayerPanel
                    layers={currentModel.layers}
                    onUpdate={(nextLayer) =>
                      history.replaceModel(updateLayer(currentModel, nextLayer))
                    }
                  />
                </ScrollArea>
              </TabsContent>

              <TabsContent value="underlays">
                <DraftingUnderlaysPanel />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
