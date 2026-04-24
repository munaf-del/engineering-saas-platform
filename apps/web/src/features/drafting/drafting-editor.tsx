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
import { DraftingSetupPanel } from './components/drafting-setup-panel';
import { DraftingStage } from './components/drafting-stage';
import { DraftingTitleRevisionDialog } from './components/drafting-title-revision-dialog';
import { DraftingToolPalette } from './components/drafting-tool-palette';
import { DraftingTransmittalsPanel } from './components/drafting-transmittals-panel';
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
  centerDraftingViewOnPoint,
  createDraftingObject,
  formatDrawingRevision,
  formatDraftingTimestamp,
  getDraftingCurrentRevisionLabel,
  getDraftingDrawingTitle,
  getVisibleDraftingUnderlays,
  getVisibleDraftingObjects,
  updateDraftingDrawingSetup,
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

  React.useEffect(() => {
    const model = history.model;
    if (!model || model.objects.length > 0 || model.underlays.length > 0) {
      return;
    }

    if (model.view.offsetX !== 160 || model.view.offsetY !== 160) {
      return;
    }

    const reference = model.drawingSetup?.referencePoint.modelPoint ?? { x: 0, y: 0 };
    history.replaceModel(centerDraftingViewOnPoint(model, reference, view.canvasSize), {
      dirty: false,
    });
  }, [history, view.canvasSize]);

  React.useEffect(() => {
    function isTextEntryTarget(target: EventTarget | null) {
      if (!(target instanceof HTMLElement)) {
        return false;
      }

      return (
        target.isContentEditable ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT'
      );
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (isTextEntryTarget(event.target) || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        view.handleZoomIn();
        return;
      }

      if (event.key === '-') {
        event.preventDefault();
        view.handleZoomOut();
        return;
      }

      if (event.key === '0') {
        event.preventDefault();
        view.handleResetZoom();
        return;
      }

      if (event.key.toLowerCase() === 'f') {
        event.preventDefault();
        if (event.shiftKey && selection.selectedObject) {
          view.handleFitSelected([selection.selectedObject]);
        } else if (!event.shiftKey) {
          view.handleFitView();
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selection.selectedObject, view]);

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

  function handleCenterViewOnReference() {
    const reference = currentModel.drawingSetup!.referencePoint.modelPoint;
    history.replaceModel(centerDraftingViewOnPoint(currentModel, reference, view.canvasSize), {
      dirty: false,
    });
  }

  function handleFitSelectedView() {
    if (!selection.selectedObject) {
      return;
    }

    view.handleFitSelected([selection.selectedObject]);
  }

  function handleSetReferenceToViewCentre() {
    const stageRect = view.containerRef.current?.getBoundingClientRect();
    const point = screenToWorldPoint(
      {
        x: stageRect?.width ? stageRect.width / 2 : view.canvasSize.width / 2,
        y: stageRect?.height ? stageRect.height / 2 : view.canvasSize.height / 2,
      },
      currentModel.view,
    );

    history.replaceModel(
      updateDraftingDrawingSetup(currentModel, (setup) => ({
        ...setup,
        referencePoint: {
          ...setup.referencePoint,
          modelPoint: {
            x: point.x,
            y: point.y,
            z: setup.referencePoint.modelPoint.z,
          },
          updatedAt: new Date().toISOString(),
          ...(currentUserName ? { updatedBy: currentUserName } : {}),
        },
      })),
    );
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
          onCenterReference={handleCenterViewOnReference}
          onFitModel={view.handleFitView}
          onFitSelected={handleFitSelectedView}
          onObjectPointerDown={selection.handleObjectPointerDown}
          onResetZoom={view.handleResetZoom}
          onSetZoomScale={view.handleSetZoomScale}
          onUnderlayPointerDown={underlays.handleUnderlayPointerDown}
          onZoomIn={view.handleZoomIn}
          onZoomOut={view.handleZoomOut}
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
              Edit drawing setup, object properties, layer controls, underlays, sheets, and derived
              schedules.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              value={drafting.activeTab}
              onValueChange={(value) => drafting.setActiveTab(value as typeof drafting.activeTab)}
            >
              <TabsList className="grid w-full grid-cols-7">
                <TabsTrigger value="setup">Setup</TabsTrigger>
                <TabsTrigger value="properties">Properties</TabsTrigger>
                <TabsTrigger value="layers">Layers</TabsTrigger>
                <TabsTrigger value="underlays">Underlays</TabsTrigger>
                <TabsTrigger value="sheets">Sheets</TabsTrigger>
                <TabsTrigger value="transmittals">Transmittals</TabsTrigger>
                <TabsTrigger value="schedules">Schedules</TabsTrigger>
              </TabsList>

              <TabsContent value="setup">
                <ScrollArea className="h-[580px] pr-3">
                  <DraftingSetupPanel
                    model={currentModel}
                    onCenterViewOnReference={handleCenterViewOnReference}
                    onModelChange={history.replaceModel}
                    onSetReferenceToViewCentre={handleSetReferenceToViewCentre}
                  />
                </ScrollArea>
              </TabsContent>

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

              <TabsContent value="transmittals">
                <ScrollArea className="h-[580px] pr-3">
                  <DraftingTransmittalsPanel
                    currentUserName={currentUserName}
                    drawingId={drawingId}
                    drawingTitle={currentDrawing.title}
                    model={currentModel}
                    onModelChange={history.replaceModel}
                    projectId={projectId}
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
