'use client';

import * as React from 'react';
import type { DraftingObject, Project } from '@eng/shared';
import { toast } from 'sonner';
import { PageLoading } from '@/components/loading';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TabsContent } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth';
import { usePileGroups } from '@/hooks/use-pile-groups';
import { useProjectSpatialFeatures } from '@/hooks/use-project-spatial';
import { DraftingInspectorDrawer } from './components/drafting-inspector-drawer';
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
import {
  buildDraftingPileSourceRecords,
  buildDraftingSpatialSourceRecords,
  createDraftingObjectFromSpatialSource,
  createPileObjectFromSource,
  findExistingSourceObject,
  type DraftingPileSourceRecord,
  type DraftingSpatialSourceRecord,
} from './source-binding-utils';

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
  const [inspectorExpanded, setInspectorExpanded] = React.useState(false);
  const currentUserName = user?.name ?? user?.email ?? null;
  const drafting = useDrafting();
  const pileGroupsQuery = usePileGroups(projectId);
  const spatialFeaturesQuery = useProjectSpatialFeatures(projectId);
  const history = useDraftingHistory(projectId, drawingId);
  const view = useDraftingView({
    activeTool: drafting.activeTool,
    drawingId,
    model: history.model,
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
    view: view.currentView,
  });
  const underlays = useDraftingUnderlays({
    activeTool: drafting.activeTool,
    containerRef: view.containerRef,
    model: history.model,
    onSelectUnderlaysTab: () => drafting.setActiveTab('underlays'),
    onSelectUnderlay: () => {},
    onClearObjectSelection: selection.clearSelection,
    patchModel: history.patchModel,
    view: view.currentView,
  });
  const pileSourceRecords = React.useMemo(
    () => buildDraftingPileSourceRecords(pileGroupsQuery.data),
    [pileGroupsQuery.data],
  );
  const spatialSourceRecords = React.useMemo(
    () => buildDraftingSpatialSourceRecords(spatialFeaturesQuery.data),
    [spatialFeaturesQuery.data],
  );
  const placedSourceIds = React.useMemo(
    () =>
      (history.model?.objects ?? []).flatMap((object) =>
        object.sourceRef?.sourceId ? [object.sourceRef.sourceId] : [],
      ),
    [history.model?.objects],
  );

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
        if (!view.isViewLocked) {
          view.handleZoomIn();
        }
        return;
      }

      if (event.key === '-') {
        event.preventDefault();
        if (!view.isViewLocked) {
          view.handleZoomOut();
        }
        return;
      }

      if (event.key === '0') {
        event.preventDefault();
        if (!view.isViewLocked) {
          view.handleResetZoom();
        }
        return;
      }

      if (event.key.toLowerCase() === 'f') {
        event.preventDefault();
        if (!view.isViewLocked) {
          if (event.shiftKey && selection.selectedObject) {
            view.handleFitSelected([selection.selectedObject]);
          } else if (!event.shiftKey) {
            view.handleFitView();
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selection.selectedObject, view]);

  React.useEffect(() => {
    const storedValue = window.localStorage.getItem(getInspectorStorageKey(drawingId));
    setInspectorExpanded(storedValue === 'expanded');
  }, [drawingId]);

  React.useEffect(() => {
    window.localStorage.setItem(
      getInspectorStorageKey(drawingId),
      inspectorExpanded ? 'expanded' : 'collapsed',
    );
  }, [drawingId, inspectorExpanded]);

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
      toast.success('Project model saved');
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
      view.currentView,
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
      view.currentView,
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
    view.handleCenterViewOnPoint(reference);
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
      view.currentView,
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

  function handlePlacePileSource(source: DraftingPileSourceRecord) {
    const existing = findExistingSourceObject(currentModel, 'foundation_pile', source.sourceId);
    if (existing) {
      selection.selectObject(existing.id);
      drafting.setActiveTab('properties');
      toast.info(`${source.sourceLabel} is already in the model; selected existing object`);
      return;
    }

    const nextObject = createPileObjectFromSource({
      fallbackPoint: getViewportCentrePoint(),
      linkedBy: currentUserName,
      model: currentModel,
      source,
    });
    history.replaceModel(addDraftingObject(currentModel, nextObject, { by: currentUserName }));
    selection.selectObject(nextObject.id);
    drafting.setActiveTab('properties');
    toast.success(`Placed linked pile ${source.sourceLabel}`);
  }

  function handlePlaceSpatialSource(source: DraftingSpatialSourceRecord) {
    const existing =
      findExistingSourceObject(currentModel, 'spatial_feature', source.sourceId) ??
      findExistingSourceObject(currentModel, 'geotech_borehole', source.sourceId);
    if (existing) {
      selection.selectObject(existing.id);
      drafting.setActiveTab('properties');
      toast.info(`${source.sourceLabel} is already in the model; selected existing object`);
      return;
    }

    const nextObject = createDraftingObjectFromSpatialSource({
      fallbackPoint: getViewportCentrePoint(),
      linkedBy: currentUserName,
      model: currentModel,
      source,
    });
    history.replaceModel(addDraftingObject(currentModel, nextObject, { by: currentUserName }));
    selection.selectObject(nextObject.id);
    drafting.setActiveTab('properties');
    toast.success(`Placed linked ${source.objectType.replaceAll('_', ' ')} ${source.sourceLabel}`);
  }

  function getViewportCentrePoint() {
    const stageRect = view.containerRef.current?.getBoundingClientRect();
    return screenToWorldPoint(
      {
        x: stageRect?.width ? stageRect.width / 2 : view.canvasSize.width / 2,
        y: stageRect?.height ? stageRect.height / 2 : view.canvasSize.height / 2,
      },
      view.currentView,
    );
  }

  function handleInspectorTabChange(value: string) {
    drafting.setActiveTab(value as typeof drafting.activeTab);
    setInspectorExpanded(true);
  }

  const selectedObjectSummary = selection.selectedObject
    ? `${selection.selectedObject.name ?? selection.selectedObject.type.replaceAll('_', ' ')} · ${selection.selectedObject.type.replaceAll('_', ' ')}`
    : 'No object selected';

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

      <div className="space-y-3" data-testid="drafting-workspace-layout">
        <DraftingToolPalette
          activeTool={drafting.activeTool}
          drawingUpdatedAt={currentDrawing.updatedAt}
          model={currentModel}
          onCancelLine={drafting.clearPendingLine}
          onFinishLine={handleFinishExcavationLine}
          onPlacePileSource={handlePlacePileSource}
          onPlaceSpatialSource={handlePlaceSpatialSource}
          onToolChange={drafting.setActiveTool}
          pendingLinePointsCount={drafting.pendingLinePoints.length}
          pileSources={pileSourceRecords}
          placedSourceIds={placedSourceIds}
          spatialSources={spatialSourceRecords}
          sourceLoading={pileGroupsQuery.isLoading || spatialFeaturesQuery.isLoading}
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
          onObjectHandlePointerDown={selection.handleObjectHandlePointerDown}
          onObjectPointerDown={selection.handleObjectPointerDown}
          onResetZoom={view.handleResetZoom}
          onSetZoomScale={view.handleSetZoomScale}
          onViewLockedChange={view.setViewLocked}
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
          view={view.currentView}
          viewMode={view.currentView.mode}
          viewLocked={view.isViewLocked}
          visibleUnderlays={visibleUnderlays}
          visibleObjects={visibleObjects}
        />

        <DraftingInspectorDrawer
          activeTab={drafting.activeTab}
          expanded={inspectorExpanded}
          objectCount={currentModel.objects.length}
          onExpandedChange={setInspectorExpanded}
          onTabChange={handleInspectorTabChange}
          selectedObjectSummary={selectedObjectSummary}
          childrenByTab={{
            setup: (
              <TabsContent className="m-0" forceMount value="setup">
                <ScrollArea className="h-[320px] pr-3">
                  <DraftingSetupPanel
                    model={currentModel}
                    onCenterViewOnReference={handleCenterViewOnReference}
                    onModelChange={history.replaceModel}
                    onSetReferenceToViewCentre={handleSetReferenceToViewCentre}
                  />
                </ScrollArea>
              </TabsContent>
            ),
            properties: (
              <TabsContent className="m-0" forceMount value="properties">
                <ScrollArea className="h-[320px] pr-3">
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
            ),
            layers: (
              <TabsContent className="m-0" forceMount value="layers">
                <ScrollArea className="h-[320px] pr-3">
                  <DraftingLayerPanel
                    layers={currentModel.layers}
                    onUpdate={(nextLayer) =>
                      history.replaceModel(updateLayer(currentModel, nextLayer))
                    }
                  />
                </ScrollArea>
              </TabsContent>
            ),
            underlays: (
              <TabsContent className="m-0" forceMount value="underlays">
                <ScrollArea className="h-[320px] pr-3">
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
            ),
            sheets: (
              <TabsContent className="m-0" forceMount value="sheets">
                <ScrollArea className="h-[320px] pr-3">
                  <DraftingDrawingSheetsPanel
                    activeSheetId={activeDrawingSheetId}
                    canvasSize={view.canvasSize}
                    currentUserName={currentUserName}
                    currentView={view.currentView}
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
            ),
            transmittals: (
              <TabsContent className="m-0" forceMount value="transmittals">
                <ScrollArea className="h-[320px] pr-3">
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
            ),
            schedules: (
              <TabsContent className="m-0" forceMount value="schedules">
                <ScrollArea className="h-[320px] pr-3">
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
            ),
          }}
        />
      </div>
    </>
  );
}

function getInspectorStorageKey(drawingId: string) {
  return `eng.drafting.inspector.${drawingId}`;
}
