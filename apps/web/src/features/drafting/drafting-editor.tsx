'use client';

import * as React from 'react';
import type { DraftingImplementedObjectType, DraftingObject, Project } from '@eng/shared';
import { toast } from 'sonner';
import { PageLoading } from '@/components/loading';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TabsContent } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth';
import { useDraftingSourceRegistry } from '@/hooks/use-drafting';
import { DraftingInspectorDrawer } from './components/drafting-inspector-drawer';
import { DraftingLayerPanel } from './components/drafting-layer-panel';
import { DraftingDrawingSheetsPanel } from './components/drafting-drawing-sheets-panel';
import { DraftingPropertiesPanel } from './components/drafting-properties-panel';
import { DraftingSchedulesPanel } from './components/drafting-schedules-panel';
import { DraftingSetupPanel } from './components/drafting-setup-panel';
import { DraftingSourceCoveragePanel } from './components/drafting-source-coverage-panel';
import { DraftingStandardsProfilePanel } from './components/drafting-standards-profile-panel';
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
import { clientToWorldPoint, getGridStep, screenToWorldPoint } from './geometry-utils';
import { useDrafting } from './hooks/use-drafting';
import { useDraftingHistory } from './hooks/use-drafting-history';
import { useDraftingSelection } from './hooks/use-drafting-selection';
import { useDraftingUnderlays } from './hooks/use-drafting-underlays';
import { useDraftingView } from './hooks/use-drafting-view';
import type { DraftingCanvasLabelMode } from './renderers/label-policy';
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
  buildDraftingPileSourceRecordsFromRegistry,
  buildDraftingPileTypeSourceRecordsFromRegistry,
  buildDraftingSpatialSourceRecordsFromRegistry,
  createDraftingObjectFromSpatialSource,
  createPileObjectFromSource,
  createPileObjectFromTypeSource,
  findExistingSourceObject,
  refreshPileObjectFromSource,
  refreshStructuralJointObjectFromSource,
  refreshSpatialObjectFromSource,
  type DraftingPileSourceRecord,
  type DraftingPileTypeSourceRecord,
  type DraftingSpatialSourceRecord,
} from './source-binding-utils';
import { isDraftingPrimitiveCommandTool } from './commands/drafting-command-session';
import { resolveDraftingSnapPoint } from './snapping/drafting-snap-utils';
import type { DraftingTool } from './tools/drafting-tool-types';
import type { DraftingPileSourceMode } from './components/drafting-tool-palette';

const PDF_POINT_TO_MM = 25.4 / 72;

const TWO_POINT_AUTHORING_TOOLS = new Set([
  'secant_pile_wall',
  'soldier_pile_wall',
  'anchor_tieback',
  'section_marker',
]);

const PATH_AUTHORING_TOOLS = new Set([
  'excavation_line',
  'capping_beam',
  'waler',
  'service_run',
  'draft_polyline',
  'draft_polygon',
]);

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
  const [canvasLabelMode, setCanvasLabelMode] = React.useState<DraftingCanvasLabelMode>('minimal');
  const [pileSourceMode, setPileSourceMode] =
    React.useState<DraftingPileSourceMode>('manual_sketch');
  const [selectedPileTypeSourceId, setSelectedPileTypeSourceId] = React.useState<string | null>(
    null,
  );
  const currentUserName = user?.name ?? user?.email ?? null;
  const drafting = useDrafting();
  const sourceRegistryQuery = useDraftingSourceRegistry(projectId, drawingId);
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
    () => buildDraftingPileSourceRecordsFromRegistry(sourceRegistryQuery.data),
    [sourceRegistryQuery.data],
  );
  const pileTypeSourceRecords = React.useMemo(
    () => buildDraftingPileTypeSourceRecordsFromRegistry(sourceRegistryQuery.data),
    [sourceRegistryQuery.data],
  );
  const spatialSourceRecords = React.useMemo(
    () => buildDraftingSpatialSourceRecordsFromRegistry(sourceRegistryQuery.data),
    [sourceRegistryQuery.data],
  );
  const placedSourceIds = React.useMemo(
    () =>
      (history.model?.objects ?? []).flatMap((object) =>
        object.sourceRef?.sourceId ? [object.sourceRef.sourceId] : [],
      ),
    [history.model?.objects],
  );
  const sourcePileGroupId = pileSourceRecords[0]?.groupId ?? pileTypeSourceRecords[0]?.groupId;
  const selectedSourceRefreshState = getSelectedSourceRefreshState(
    selection.selectedObject,
    pileSourceRecords,
    pileTypeSourceRecords,
    spatialSourceRecords,
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
    const storedValue = window.localStorage.getItem(getLabelModeStorageKey(drawingId));
    if (storedValue === 'minimal' || storedValue === 'engineering' || storedValue === 'full') {
      setCanvasLabelMode(storedValue);
    } else {
      setCanvasLabelMode('minimal');
    }
  }, [drawingId]);

  React.useEffect(() => {
    window.localStorage.setItem(
      getInspectorStorageKey(drawingId),
      inspectorExpanded ? 'expanded' : 'collapsed',
    );
  }, [drawingId, inspectorExpanded]);

  React.useEffect(() => {
    window.localStorage.setItem(getLabelModeStorageKey(drawingId), canvasLabelMode);
  }, [canvasLabelMode, drawingId]);

  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isEditableKeyboardTarget(event.target)) {
        return;
      }
      if (event.key.toLowerCase() === 's') {
        event.preventDefault();
        drafting.toggleSnapEnabled();
      }
      if (event.key.toLowerCase() === 'g') {
        event.preventDefault();
        drafting.toggleSnapMode('grid');
      }
      if (event.key.toLowerCase() === 'o') {
        event.preventDefault();
        drafting.toggleSnapMode('orthogonal');
      }
      if (event.key === 'Escape') {
        drafting.clearPendingLine();
      }
      if (event.key === 'Enter' && PATH_AUTHORING_TOOLS.has(drafting.activeTool)) {
        event.preventDefault();
        handleFinishPendingPath();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drafting]);

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

    if (
      target.closest('[data-drafting-object="true"]') &&
      (drafting.activeTool === 'select' || drafting.activeTool === 'pan')
    ) {
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

    const rawPoint = clientToWorldPoint(
      event.clientX,
      event.clientY,
      view.containerRef.current,
      view.currentView,
    );
    if (!rawPoint) {
      return;
    }
    const point = resolveAuthoringPoint(rawPoint);

    if (drafting.activeTool === 'select' || drafting.activeTool === 'pan') {
      selection.clearSelection();
      underlays.clearUnderlaySelection();
      return;
    }

    if (isDraftingPrimitiveCommandTool(drafting.activeTool)) {
      const commandResult = drafting.commitPrimitiveCommandPoint(drafting.activeTool, point);
      if (!commandResult.committed) {
        return;
      }

      const nextObject = createDraftingObject(
        commandResult.tool,
        commandResult.points[0],
        currentModel,
        commandResult.points,
        currentUserName,
      );
      history.replaceModel(addDraftingObject(currentModel, nextObject, { by: currentUserName }));
      selection.selectObject(nextObject.id);
      drafting.setActiveTab('properties');
      return;
    }

    if (PATH_AUTHORING_TOOLS.has(drafting.activeTool)) {
      drafting.addPendingLinePoint(point);
      return;
    }

    if (TWO_POINT_AUTHORING_TOOLS.has(drafting.activeTool)) {
      const points = [...drafting.pendingLinePoints, point];
      if (points.length < 2) {
        drafting.setPendingLinePoints(points);
        return;
      }

      const nextObject = createDraftingObject(
        drafting.activeTool,
        points[0]!,
        currentModel,
        points,
        currentUserName,
      );
      history.replaceModel(addDraftingObject(currentModel, nextObject, { by: currentUserName }));
      drafting.clearPendingLine();
      selection.selectObject(nextObject.id);
      drafting.setActiveTab('properties');
      return;
    }

    if (drafting.activeTool === 'dimension_chain') {
      const points = [...drafting.pendingLinePoints, point];
      if (points.length < 3) {
        drafting.setPendingLinePoints(points);
        return;
      }
      const nextObject = createDraftingObject(
        'dimension_chain',
        points[0]!,
        currentModel,
        points,
        currentUserName,
      );
      history.replaceModel(addDraftingObject(currentModel, nextObject, { by: currentUserName }));
      drafting.clearPendingLine();
      selection.selectObject(nextObject.id);
      drafting.setActiveTab('properties');
      return;
    }

    if (drafting.activeTool === 'pile' && pileSourceMode === 'pile_type') {
      const source = pileTypeSourceRecords.find(
        (candidate) => candidate.sourceId === selectedPileTypeSourceId,
      );
      if (!source) {
        toast.info('Select a pile type before placing a linked drafting pile.');
        return;
      }
      const nextObject = createPileObjectFromTypeSource({
        linkedBy: currentUserName,
        model: currentModel,
        point,
        source,
      });
      history.replaceModel(addDraftingObject(currentModel, nextObject, { by: currentUserName }));
      selection.selectObject(nextObject.id);
      drafting.setActiveTab('properties');
      toast.success(`Placed pile type ${source.sourceLabel}`);
      return;
    }

    const nextObject = createDraftingObject(
      drafting.activeTool as DraftingImplementedObjectType,
      point,
      currentModel,
      [],
      currentUserName,
    );
    history.replaceModel(addDraftingObject(currentModel, nextObject, { by: currentUserName }));
    selection.selectObject(nextObject.id);
    drafting.setActiveTab('properties');
  }

  function resolveAuthoringPoint(point: { x: number; y: number }) {
    return resolveDraftingSnapPoint({
      gridStepMm: getGridStep(view.currentView.scale),
      model: currentModel,
      objects: visibleObjects,
      orthogonalOrigin: drafting.pendingLinePoints.at(-1) ?? null,
      point,
      scale: view.currentView.scale,
      settings: drafting.snapSettings,
    }).point;
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

  function handleFinishPendingPath() {
    if (drafting.pendingLinePoints.length < 2) {
      return;
    }

    const tool =
      drafting.activeTool === 'draft_polygon' && drafting.pendingLinePoints.length < 3
        ? 'draft_polyline'
        : drafting.activeTool;
    const nextObject = createDraftingObject(
      tool as DraftingImplementedObjectType,
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
    const existing =
      findExistingSourceObject(currentModel, source.sourceType, source.sourceId) ??
      findExistingSourceObject(currentModel, 'foundation_pile', source.sourceId) ??
      findExistingSourceObject(currentModel, 'foundation_joint', source.sourceId);
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

  function handleSelectPileTypeSource(source: DraftingPileTypeSourceRecord | null) {
    setSelectedPileTypeSourceId(source?.sourceId ?? null);
    setPileSourceMode(source ? 'pile_type' : 'manual_sketch');
    drafting.setActiveTool('pile');
  }

  function handlePileSourceModeChange(mode: DraftingPileSourceMode) {
    setPileSourceMode(mode);
    if (mode !== 'pile_type') {
      setSelectedPileTypeSourceId(null);
    }
    drafting.setActiveTool('pile');
  }

  function handleRefreshSourceObject(
    object: DraftingObject,
    options?: { updateCoordinates?: boolean },
  ) {
    const refreshed = refreshDraftingObjectFromCurrentSources(object, options);

    if (refreshed === object) {
      return;
    }
    history.replaceModel({
      ...currentModel,
      objects: currentModel.objects.map((candidate) =>
        candidate.id === refreshed.id ? refreshed : candidate,
      ),
    });
    selection.selectObject(refreshed.id);
    if (refreshed.sourceRef?.status === 'missing_source') {
      toast.warning('Source record was not found; object marked as missing source');
    } else {
      toast.success('Source snapshot refreshed');
    }
  }

  function handleRefreshSourceObjects(
    objects: DraftingObject[],
    options?: { updateCoordinates?: boolean },
  ) {
    const objectIds = new Set(objects.map((object) => object.id));
    let refreshedCount = 0;
    const nextObjects = currentModel.objects.map((candidate) => {
      if (!objectIds.has(candidate.id)) {
        return candidate;
      }
      const refreshed = refreshDraftingObjectFromCurrentSources(candidate, options);
      if (refreshed !== candidate) {
        refreshedCount += 1;
      }
      return refreshed;
    });

    if (refreshedCount === 0) {
      return;
    }

    history.replaceModel({ ...currentModel, objects: nextObjects });
    toast.success(`Refreshed ${refreshedCount} source snapshot(s)`);
  }

  function refreshDraftingObjectFromCurrentSources(
    object: DraftingObject,
    options?: { updateCoordinates?: boolean },
  ) {
    return object.type === 'pile'
      ? refreshPileObjectFromSource({
          object,
          pileSources: pileSourceRecords,
          pileTypeSources: pileTypeSourceRecords,
          updateCoordinates: options?.updateCoordinates,
        })
      : object.type === 'structural_joint'
        ? refreshStructuralJointObjectFromSource({
            object,
            pileSources: pileSourceRecords,
            updateCoordinates: options?.updateCoordinates,
          })
        : object.type === 'borehole' ||
            object.type === 'monitoring_point' ||
            object.type === 'service_run' ||
            object.type === 'service_crossing'
          ? refreshSpatialObjectFromSource({
              object,
              spatialSources: spatialSourceRecords,
              updateCoordinates: options?.updateCoordinates,
            })
          : object;
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

  function handlePlacePileSources(sources: DraftingPileSourceRecord[]) {
    if (sources.length === 0) {
      return;
    }
    const fallbackPoint = getViewportCentrePoint();
    let nextModel = currentModel;
    let placedCount = 0;
    let lastObjectId: string | null = null;

    for (const source of sources) {
      const existing =
        findExistingSourceObject(nextModel, source.sourceType, source.sourceId) ??
        findExistingSourceObject(nextModel, 'foundation_pile', source.sourceId) ??
        findExistingSourceObject(nextModel, 'foundation_joint', source.sourceId);
      if (existing) {
        lastObjectId = existing.id;
        continue;
      }
      const nextObject = createPileObjectFromSource({
        fallbackPoint,
        linkedBy: currentUserName,
        model: nextModel,
        source,
      });
      nextModel = addDraftingObject(nextModel, nextObject, { by: currentUserName });
      placedCount += 1;
      lastObjectId = nextObject.id;
    }

    if (nextModel !== currentModel) {
      history.replaceModel(nextModel);
    }
    if (lastObjectId) {
      selection.selectObject(lastObjectId);
      drafting.setActiveTab('properties');
    }
    if (placedCount > 0) {
      toast.success(`Placed ${placedCount} linked pile source(s)`);
    }
  }

  function handlePlaceSpatialSources(sources: DraftingSpatialSourceRecord[]) {
    if (sources.length === 0) {
      return;
    }
    const fallbackPoint = getViewportCentrePoint();
    let nextModel = currentModel;
    let placedCount = 0;
    let lastObjectId: string | null = null;

    for (const source of sources) {
      const existing =
        findExistingSourceObject(nextModel, 'spatial_feature', source.sourceId) ??
        findExistingSourceObject(nextModel, 'geotech_borehole', source.sourceId);
      if (existing) {
        lastObjectId = existing.id;
        continue;
      }
      const nextObject = createDraftingObjectFromSpatialSource({
        fallbackPoint,
        linkedBy: currentUserName,
        model: nextModel,
        source,
      });
      nextModel = addDraftingObject(nextModel, nextObject, { by: currentUserName });
      placedCount += 1;
      lastObjectId = nextObject.id;
    }

    if (nextModel !== currentModel) {
      history.replaceModel(nextModel);
    }
    if (lastObjectId) {
      selection.selectObject(lastObjectId);
      drafting.setActiveTab('properties');
    }
    if (placedCount > 0) {
      toast.success(`Placed ${placedCount} linked source object(s)`);
    }
  }

  function handleSelectSourceCoverageObject(objectId: string) {
    selection.selectObject(objectId);
    drafting.setActiveTab('properties');
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
          onFinishLine={handleFinishPendingPath}
          onPlacePileSource={handlePlacePileSource}
          onPlaceSpatialSource={handlePlaceSpatialSource}
          onPileSourceModeChange={handlePileSourceModeChange}
          onSelectPileTypeSource={handleSelectPileTypeSource}
          onToolChange={drafting.setActiveTool}
          pendingLinePointsCount={drafting.pendingLinePoints.length}
          pileSourceManageHref={
            sourcePileGroupId
              ? `/projects/${projectId}/pile-groups/${sourcePileGroupId}/multi-pile`
              : undefined
          }
          pileSourceMode={pileSourceMode}
          pileSources={pileSourceRecords}
          pileTypeSources={pileTypeSourceRecords}
          placedSourceIds={placedSourceIds}
          selectedPileTypeSourceId={selectedPileTypeSourceId}
          spatialSources={spatialSourceRecords}
          sourceLoading={sourceRegistryQuery.isLoading}
        />

        <DraftingStage
          canvasSize={view.canvasSize}
          commandPrompt={getDraftingCommandPrompt(
            drafting.activeTool,
            drafting.pendingLinePoints.length,
          )}
          containerRef={view.containerRef}
          labelMode={canvasLabelMode}
          model={currentModel}
          onBackgroundPointerDown={view.handleBackgroundPointerDown}
          onCanvasClick={handleCanvasClick}
          onCanvasPointerMove={(point) => {
            if (isDraftingPrimitiveCommandTool(drafting.activeTool)) {
              drafting.updatePrimitiveCommandPreview(point);
            }
          }}
          onCanvasWheel={view.handleCanvasWheel}
          onCenterReference={handleCenterViewOnReference}
          onFitModel={view.handleFitView}
          onFitSelected={handleFitSelectedView}
          onObjectHandlePointerDown={selection.handleObjectHandlePointerDown}
          onObjectPointerDown={selection.handleObjectPointerDown}
          onResetZoom={view.handleResetZoom}
          onSetZoomScale={view.handleSetZoomScale}
          onLabelModeChange={setCanvasLabelMode}
          onToggleSnapEnabled={drafting.toggleSnapEnabled}
          onToggleSnapMode={drafting.toggleSnapMode}
          onViewLockedChange={view.setViewLocked}
          onUnderlayPointerDown={underlays.handleUnderlayPointerDown}
          onZoomIn={view.handleZoomIn}
          onZoomOut={view.handleZoomOut}
          pendingCommandPreviewTool={drafting.commandPreviewTool}
          pendingLinePoints={drafting.pendingLinePoints}
          pendingLinePreviewPoints={drafting.commandPreviewPoints}
          snapSettings={drafting.snapSettings}
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
            standards: (
              <TabsContent className="m-0" forceMount value="standards">
                <ScrollArea className="h-[320px] pr-3">
                  <DraftingStandardsProfilePanel
                    model={currentModel}
                    onModelChange={history.replaceModel}
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
                    objects={currentModel.objects}
                    onDelete={selection.deleteSelectedObject}
                    onRefreshSource={handleRefreshSourceObject}
                    onUpdate={(nextObject: DraftingObject) =>
                      selection.updateSelectedObject(nextObject)
                    }
                    referenceDatum={currentModel.drawingSetup?.referencePoint.datum}
                    sourceRefreshState={selectedSourceRefreshState}
                    sourceManageHref={
                      sourcePileGroupId
                        ? `/projects/${projectId}/pile-groups/${sourcePileGroupId}/multi-pile`
                        : `/projects/${projectId}/pile-groups`
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
            sources: (
              <TabsContent className="m-0" forceMount value="sources">
                <ScrollArea className="h-[320px] pr-3">
                  <DraftingSourceCoveragePanel
                    model={currentModel}
                    onPlacePileSource={handlePlacePileSource}
                    onPlacePileSources={handlePlacePileSources}
                    onPlaceSpatialSource={handlePlaceSpatialSource}
                    onPlaceSpatialSources={handlePlaceSpatialSources}
                    onRefreshObject={handleRefreshSourceObject}
                    onRefreshObjects={handleRefreshSourceObjects}
                    onSelectObject={handleSelectSourceCoverageObject}
                    pileSourceManageHref={
                      sourcePileGroupId
                        ? `/projects/${projectId}/pile-groups/${sourcePileGroupId}/multi-pile`
                        : undefined
                    }
                    pileSources={pileSourceRecords}
                    registry={sourceRegistryQuery.data}
                    spatialSources={spatialSourceRecords}
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

function getLabelModeStorageKey(drawingId: string) {
  return `eng.drafting.labelMode.${drawingId}`;
}

function getSelectedSourceRefreshState(
  object: DraftingObject | null,
  pileSources: DraftingPileSourceRecord[],
  pileTypeSources: DraftingPileTypeSourceRecord[],
  spatialSources: DraftingSpatialSourceRecord[],
): 'current' | 'stale' | 'missing' {
  const sourceRef = object?.sourceRef;
  if (!sourceRef || sourceRef.sourceType === 'manual') {
    return 'current';
  }
  if (sourceRef.status === 'missing_source') {
    return 'missing';
  }

  const currentVersion = getCurrentSourceVersion(sourceRef.sourceType, sourceRef.sourceId, {
    pileSources,
    pileTypeSources,
    spatialSources,
  });
  if (!currentVersion) {
    return 'missing';
  }
  if (sourceRef.sourceVersion && sourceRef.sourceVersion !== currentVersion) {
    return 'stale';
  }
  return 'current';
}

function getCurrentSourceVersion(
  sourceType: NonNullable<DraftingObject['sourceRef']>['sourceType'],
  sourceId: string | undefined,
  sources: {
    pileSources: DraftingPileSourceRecord[];
    pileTypeSources: DraftingPileTypeSourceRecord[];
    spatialSources: DraftingSpatialSourceRecord[];
  },
) {
  if (!sourceId) {
    return null;
  }
  if (sourceType === 'foundation_pile') {
    return (
      sources.pileSources.find((source) => source.sourceId === sourceId)?.sourceVersion ?? null
    );
  }
  if (sourceType === 'foundation_pile_type') {
    return (
      sources.pileTypeSources.find((source) => source.sourceId === sourceId)?.sourceVersion ?? null
    );
  }
  if (sourceType === 'spatial_feature' || sourceType === 'geotech_borehole') {
    return (
      sources.spatialSources.find((source) => source.sourceId === sourceId)?.feature.updatedAt ??
      null
    );
  }
  return null;
}

function isEditableKeyboardTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(
    target.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""]'),
  );
}

function getDraftingCommandPrompt(tool: DraftingTool, pendingPointCount: number) {
  if (isDraftingPrimitiveCommandTool(tool)) {
    if (tool === 'draft_circle') {
      return pendingPointCount === 0 ? 'Pick centre point' : 'Pick radius point';
    }
    return pendingPointCount === 0 ? 'Pick start point' : 'Pick end point';
  }

  if (TWO_POINT_AUTHORING_TOOLS.has(tool)) {
    return pendingPointCount === 0 ? 'Pick start point' : 'Pick end point';
  }

  if (PATH_AUTHORING_TOOLS.has(tool)) {
    return pendingPointCount === 0
      ? 'Pick start point'
      : 'Pick next point · Enter to finish / Esc to cancel';
  }

  if (tool === 'dimension_chain') {
    if (pendingPointCount === 0) {
      return 'Pick first witness point';
    }
    if (pendingPointCount === 1) {
      return 'Pick next witness point';
    }
    return 'Pick dimension offset';
  }

  if (
    tool === 'pile' ||
    tool === 'service_crossing' ||
    tool === 'borehole' ||
    tool === 'monitoring_point' ||
    tool === 'structural_joint'
  ) {
    return 'Pick placement point';
  }

  return undefined;
}
