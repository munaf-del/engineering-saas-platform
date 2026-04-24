'use client';

import * as React from 'react';
import type { DraftingObject, Project } from '@eng/shared';
import { toast } from 'sonner';
import { PageLoading } from '@/components/loading';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth';
import { DraftingLayerPanel } from './components/drafting-layer-panel';
import { DraftingDrawingSheetsPanel } from './components/drafting-drawing-sheets-panel';
import { DraftingPropertiesPanel } from './components/drafting-properties-panel';
import { DraftingSchedulesPanel } from './components/drafting-schedules-panel';
import { DraftingStage } from './components/drafting-stage';
import { DraftingTitleRevisionDialog } from './components/drafting-title-revision-dialog';
import { DraftingToolPalette } from './components/drafting-tool-palette';
import { DraftingToolbar } from './components/drafting-toolbar';
import { DraftingUnderlaysPanel } from './components/drafting-underlays-panel';
import {
  downloadDraftingModelJson,
  downloadDraftingScheduleSheetPackJson,
  downloadDraftingScheduleCsv,
  downloadDraftingSchedulesJson,
} from './export-utils';
import { clientToWorldPoint, screenToWorldPoint } from './geometry-utils';
import { useDrafting } from './hooks/use-drafting';
import { useDraftingHistory } from './hooks/use-drafting-history';
import { useDraftingSelection } from './hooks/use-drafting-selection';
import { useDraftingUnderlays } from './hooks/use-drafting-underlays';
import { useDraftingView } from './hooks/use-drafting-view';
import {
  addDraftingObject,
  addDraftingUnderlay,
  createDraftingObject,
  formatDrawingRevision,
  formatDraftingTimestamp,
  getDraftingCurrentRevisionLabel,
  getDraftingDrawingTitle,
  getVisibleDraftingUnderlays,
  getVisibleDraftingObjects,
  updateLayer,
} from './model-utils';

const PDF_POINT_TO_MM = 25.4 / 72;

export function DraftingEditor({
  projectId,
  drawingId,
  project,
}: {
  projectId: string;
  drawingId: string;
  project: Project;
}) {
  const { user } = useAuth();
  const [titleRevisionOpen, setTitleRevisionOpen] = React.useState(false);
  const [activeDrawingSheetId, setActiveDrawingSheetId] = React.useState<string | null>(null);
  const [showDrawingSheetViewportOverlay, setShowDrawingSheetViewportOverlay] =
    React.useState(true);
  const currentUserName = user?.name ?? user?.email ?? null;
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
    currentUserName,
    model: history.model,
    onCancelPendingLine: drafting.clearPendingLine,
    onSelectPropertiesTab: () => drafting.setActiveTab('properties'),
    pendingLinePointCount: drafting.pendingLinePoints.length,
    patchModel: history.patchModel,
  });
  const underlays = useDraftingUnderlays({
    activeTool: drafting.activeTool,
    containerRef: view.containerRef,
    model: history.model,
    onSelectUnderlaysTab: () => drafting.setActiveTab('underlays'),
    onSelectUnderlay: () => {},
    onClearObjectSelection: selection.clearSelection,
    patchModel: history.patchModel,
  });

  if (history.isLoading || !history.drawing || !history.model) {
    return <PageLoading />;
  }

  const currentDrawing = history.drawing;
  const currentModel = history.model;
  const drawingRevisionLabel =
    getDraftingCurrentRevisionLabel(currentModel) ?? formatDrawingRevision(currentDrawing);
  const drawingTitle = getDraftingDrawingTitle(currentModel, currentDrawing.title);
  const scheduleMetadata = {
    checkedBy: currentModel.titleBlock?.checkedBy,
    clientName: currentModel.titleBlock?.clientName,
    drawingId: currentDrawing.id,
    drawingNumber: currentModel.titleBlock?.drawingNumber,
    drawingRevision: drawingRevisionLabel,
    drawingStatus: currentDrawing.status,
    drawingTitle,
    generatedAtLabel: `Updated ${formatDraftingTimestamp(currentDrawing.updatedAt)}`,
    projectCode: project.code,
    projectName: currentModel.titleBlock?.projectName ?? project.name,
    revision: drawingRevisionLabel,
  };
  const visibleUnderlays = getVisibleDraftingUnderlays(currentModel);
  const visibleObjects = getVisibleDraftingObjects(currentModel);
  const selectedDrawingSheet =
    currentModel.drawingSheets.find((sheet) => sheet.id === activeDrawingSheetId) ??
    currentModel.drawingSheets[0] ??
    null;

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
    const isUnderlayModeActive =
      underlays.activeCropUnderlayId !== null || underlays.calibrationState !== null;

    if (target.closest('[data-drafting-object="true"]')) {
      return;
    }
    if (isUnderlayModeActive && !target.closest('[data-drafting-underlay="true"]')) {
      return;
    }
    if (target.closest('[data-drafting-underlay="true"]')) {
      if (
        drafting.activeTool === 'select' ||
        underlays.activeCropUnderlayId !== null ||
        underlays.calibrationState !== null
      ) {
        return;
      }
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
      underlays.clearUnderlaySelection();
      return;
    }

    if (drafting.activeTool === 'excavation_line') {
      drafting.addPendingLinePoint(point);
      return;
    }

    const nextObject = createDraftingObject(
      drafting.activeTool,
      point,
      currentModel,
      [],
      currentUserName,
    );
    history.replaceModel(addDraftingObject(currentModel, nextObject, { by: currentUserName }));
    selection.selectObject(nextObject.id);
    drafting.setActiveTab('properties');
  }

  function handleAddUnderlay(args: {
    fileId: string;
    fileName: string;
    name: string;
    pageNumber: number;
    pageWidth: number;
    pageHeight: number;
  }) {
    const now = new Date().toISOString();
    const stageRect = view.containerRef.current?.getBoundingClientRect();
    const viewportCentre = screenToWorldPoint(
      {
        x: stageRect?.width ? stageRect.width / 2 : view.canvasSize.width / 2,
        y: stageRect?.height ? stageRect.height / 2 : view.canvasSize.height / 2,
      },
      currentModel.view,
    );

    const initialScale = PDF_POINT_TO_MM;
    const nextUnderlay = {
      id: crypto.randomUUID(),
      name: args.name,
      fileId: args.fileId,
      fileName: args.fileName,
      pageNumber: args.pageNumber,
      visible: true,
      opacity: 0.65,
      locked: false,
      transform: {
        x: viewportCentre.x - (args.pageWidth * initialScale) / 2,
        y: viewportCentre.y - (args.pageHeight * initialScale) / 2,
        scale: initialScale,
        rotationDeg: 0,
      },
      crop: null,
      calibration: null,
      createdAt: now,
      updatedAt: now,
    } as const;

    history.replaceModel(addDraftingUnderlay(currentModel, nextUnderlay));
    underlays.selectUnderlay(nextUnderlay.id);
    drafting.setActiveTab('underlays');
  }

  function underlayInteractionEnabled(underlayId: string) {
    const exclusiveUnderlayId =
      underlays.activeCropUnderlayId ?? underlays.calibrationState?.underlayId ?? null;

    if (exclusiveUnderlayId) {
      return exclusiveUnderlayId === underlayId;
    }

    return drafting.activeTool === 'select';
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
      currentUserName,
    );

    history.replaceModel(addDraftingObject(currentModel, nextObject, { by: currentUserName }));
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
        currentRevisionLabel={drawingRevisionLabel}
        onExportJson={() => downloadDraftingModelJson(currentModel, currentDrawing.title)}
        onFitView={view.handleFitView}
        onOpenTitleRevision={() => setTitleRevisionOpen(true)}
        onSave={handleSaveModel}
        projectCode={project.code}
        projectId={projectId}
      />
      <DraftingTitleRevisionDialog
        model={currentModel}
        onModelChange={history.patchModel}
        onOpenChange={setTitleRevisionOpen}
        open={titleRevisionOpen}
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
          onUnderlayPointerDown={underlays.handleUnderlayPointerDown}
          pendingLinePoints={drafting.pendingLinePoints}
          selectedDrawingSheet={selectedDrawingSheet}
          selectedObjectId={selection.selectedObjectId}
          selectedUnderlayId={underlays.selectedUnderlayId}
          showDrawingSheetViewportOverlay={showDrawingSheetViewportOverlay}
          underlayCalibrationState={
            underlays.calibrationState
              ? {
                  underlayId: underlays.calibrationState.underlayId,
                  pointA: underlays.calibrationState.pdfPointA,
                  pointB: underlays.calibrationState.pdfPointB,
                }
              : null
          }
          underlayCropPreview={
            underlays.cropPreview && underlays.selectedUnderlayId
              ? {
                  underlayId: underlays.selectedUnderlayId,
                  rect: underlays.cropPreview,
                }
              : null
          }
          underlayInteractionEnabled={(underlay) => underlayInteractionEnabled(underlay.id)}
          visibleUnderlays={visibleUnderlays}
          visibleObjects={visibleObjects}
        />

        <Card className="min-h-[720px]">
          <CardHeader>
            <CardTitle className="text-base">Inspector</CardTitle>
            <CardDescription>
              Edit object properties, layer controls, underlays, sheets, and derived schedules.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              value={drafting.activeTab}
              onValueChange={(value) => drafting.setActiveTab(value as typeof drafting.activeTab)}
            >
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="properties">Properties</TabsTrigger>
                <TabsTrigger value="layers">Layers</TabsTrigger>
                <TabsTrigger value="underlays">Underlays</TabsTrigger>
                <TabsTrigger value="sheets">Sheets</TabsTrigger>
                <TabsTrigger value="schedules">Schedules</TabsTrigger>
              </TabsList>

              <TabsContent value="properties">
                <ScrollArea className="h-[580px] pr-3">
                  <DraftingPropertiesPanel
                    layers={currentModel.layers}
                    object={selection.selectedObject}
                    onDelete={selection.deleteSelectedObject}
                    onUpdate={(nextObject: DraftingObject) =>
                      selection.updateSelectedObject(nextObject)
                    }
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
                <ScrollArea className="h-[580px] pr-3">
                  <DraftingUnderlaysPanel
                    drawingId={drawingId}
                    onAddUnderlay={handleAddUnderlay}
                    onApplyCalibration={underlays.applyCalibration}
                    onBeginCalibration={(underlayId) => underlays.beginCalibration(underlayId)}
                    onBeginCrop={(underlayId) => underlays.beginCrop(underlayId)}
                    onCancelCalibration={underlays.cancelCalibration}
                    onCancelCrop={underlays.cancelCrop}
                    onClearCrop={(underlayId) => underlays.clearCrop(underlayId)}
                    onRemoveUnderlay={underlays.removeSelectedUnderlay}
                    onSelectUnderlay={underlays.selectUnderlay}
                    onUpdateUnderlay={underlays.updateSelectedUnderlay}
                    projectId={projectId}
                    selectedUnderlay={underlays.selectedUnderlay}
                    underlays={currentModel.underlays}
                    calibrationState={underlays.calibrationState}
                    cropModeUnderlayId={underlays.activeCropUnderlayId}
                  />
                </ScrollArea>
              </TabsContent>

              <TabsContent value="sheets">
                <ScrollArea className="h-[580px] pr-3">
                  <DraftingDrawingSheetsPanel
                    activeSheetId={activeDrawingSheetId}
                    canvasSize={view.canvasSize}
                    currentUserName={currentUserName}
                    currentView={currentModel.view}
                    drawingTitle={currentDrawing.title}
                    model={currentModel}
                    onActiveSheetChange={setActiveDrawingSheetId}
                    onModelChange={history.replaceModel}
                    onViewportOverlayEnabledChange={setShowDrawingSheetViewportOverlay}
                    projectId={projectId}
                    selectedObjectIds={
                      selection.selectedObjectId ? [selection.selectedObjectId] : []
                    }
                    viewportOverlayEnabled={showDrawingSheetViewportOverlay}
                  />
                </ScrollArea>
              </TabsContent>

              <TabsContent value="schedules">
                <ScrollArea className="h-[580px] pr-3">
                  <DraftingSchedulesPanel
                    currentUserName={currentUserName}
                    drawingTitle={currentDrawing.title}
                    model={currentModel}
                    metadata={scheduleMetadata}
                    onExportAllJson={() =>
                      downloadDraftingSchedulesJson(currentModel, currentDrawing.title)
                    }
                    onExportGroupCsv={(groupKey) =>
                      downloadDraftingScheduleCsv(currentModel, currentDrawing.title, groupKey)
                    }
                    onExportPackJson={() =>
                      downloadDraftingScheduleSheetPackJson(
                        currentModel,
                        currentDrawing.title,
                        scheduleMetadata,
                      )
                    }
                    onModelChange={history.replaceModel}
                    projectId={projectId}
                  />
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
