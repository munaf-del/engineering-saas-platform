import type * as React from 'react';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import type { DraftingModel, DraftingObject } from '@eng/shared';
import { clientToWorldPoint } from '../geometry-utils';
import {
  DRAFTING_VIEW_MAX_SCALE,
  DRAFTING_VIEW_MIN_SCALE,
  fitDraftingModelView,
  fitDraftingObjectsView,
  resetDraftingViewZoom,
  zoomDraftingViewAtPoint,
} from '../model-utils';
import type { DraftingTool } from '../tools/drafting-tool-types';

export const DRAFTING_EDITOR_VIEW_STORAGE_VERSION = 1;
export const DRAFTING_EDITOR_VIEW_STORAGE_PREFIX = 'eng.drafting.view';

type PanState = {
  startClientX: number;
  startClientY: number;
  originOffsetX: number;
  originOffsetY: number;
};

export type DraftingEditorViewState = DraftingModel['view'] & {
  locked: boolean;
  updatedAt?: string;
  version: number;
};

type UseDraftingViewOptions = {
  activeTool: DraftingTool;
  drawingId: string;
  model: DraftingModel | null;
};

export function useDraftingView({ activeTool, drawingId, model }: UseDraftingViewOptions) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 720 });
  const [panState, setPanState] = useState<PanState | null>(null);
  const [editorView, setEditorView] = useState<DraftingEditorViewState>(() =>
    createDraftingEditorViewState(model?.view),
  );
  const [resolvedDrawingId, setResolvedDrawingId] = useState<string | null>(null);
  const drawingIdRef = useRef<string | null>(null);
  const zoomStep = 1.25;

  useEffect(() => {
    if (!model || drawingIdRef.current === drawingId) {
      return;
    }

    drawingIdRef.current = drawingId;
    setPanState(null);
    setEditorView(resolveInitialDraftingEditorView(drawingId, model));
    setResolvedDrawingId(drawingId);
  }, [drawingId, model]);

  useEffect(() => {
    if (resolvedDrawingId !== drawingId) {
      return;
    }

    persistDraftingEditorView(drawingId, editorView);
  }, [drawingId, editorView, resolvedDrawingId]);

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

  const handlePointerMove = useEffectEvent((event: PointerEvent) => {
    if (!panState) {
      return;
    }

    const deltaX = event.clientX - panState.startClientX;
    const deltaY = event.clientY - panState.startClientY;

    updateView({
      ...editorView,
      offsetX: panState.originOffsetX + deltaX,
      offsetY: panState.originOffsetY + deltaY,
    });
  });

  useEffect(() => {
    if (!panState) {
      return;
    }

    function handleWindowPointerMove(event: PointerEvent) {
      handlePointerMove(event);
    }

    function handlePointerUp() {
      setPanState(null);
    }

    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
    // `useEffectEvent` handlers intentionally stay out of the dependency list here.
  }, [handlePointerMove, panState]);

  function handleCanvasWheel(event: React.WheelEvent<SVGSVGElement>) {
    event.preventDefault();

    if (!model || editorView.locked) {
      return;
    }

    const point = clientToWorldPoint(
      event.clientX,
      event.clientY,
      containerRef.current,
      editorView,
    );
    if (!point) {
      return;
    }

    const scaleFactor = event.deltaY < 0 ? 1.1 : 0.9;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;

    updateView(
      zoomDraftingViewAtPoint(
        editorView,
        point,
        { x: localX, y: localY },
        editorView.scale * scaleFactor,
      ),
    );
  }

  function handleBackgroundPointerDown(event: React.PointerEvent<SVGSVGElement>) {
    if (activeTool !== 'pan' || !model || editorView.locked) {
      return;
    }

    setPanState({
      startClientX: event.clientX,
      startClientY: event.clientY,
      originOffsetX: editorView.offsetX,
      originOffsetY: editorView.offsetY,
    });
  }

  function handleFitView() {
    if (!model || editorView.locked) {
      return;
    }

    updateView(fitDraftingModelView(model, canvasSize.width, canvasSize.height));
  }

  function updateView(nextView: DraftingModel['view']) {
    setEditorView((current) =>
      createDraftingEditorViewState(nextView, current.locked, new Date().toISOString()),
    );
  }

  function handleZoomBy(factor: number) {
    if (!model || editorView.locked) {
      return;
    }

    const centerScreenPoint = { x: canvasSize.width / 2, y: canvasSize.height / 2 };
    const centerWorldPoint = {
      x: (centerScreenPoint.x - editorView.offsetX) / editorView.scale,
      y: (centerScreenPoint.y - editorView.offsetY) / editorView.scale,
    };

    updateView(
      zoomDraftingViewAtPoint(
        editorView,
        centerWorldPoint,
        centerScreenPoint,
        editorView.scale * factor,
      ),
    );
  }

  function handleZoomIn() {
    handleZoomBy(zoomStep);
  }

  function handleZoomOut() {
    handleZoomBy(1 / zoomStep);
  }

  function handleResetZoom() {
    if (!model || editorView.locked) {
      return;
    }

    updateView(resetDraftingViewZoom({ ...model, view: editorView }, canvasSize));
  }

  function handleSetZoomScale(scale: number) {
    if (!model || editorView.locked || !Number.isFinite(scale)) {
      return;
    }

    const nextScale = Math.min(Math.max(scale, DRAFTING_VIEW_MIN_SCALE), DRAFTING_VIEW_MAX_SCALE);
    const centerScreenPoint = { x: canvasSize.width / 2, y: canvasSize.height / 2 };
    const centerWorldPoint = {
      x: (centerScreenPoint.x - editorView.offsetX) / editorView.scale,
      y: (centerScreenPoint.y - editorView.offsetY) / editorView.scale,
    };

    updateView(zoomDraftingViewAtPoint(editorView, centerWorldPoint, centerScreenPoint, nextScale));
  }

  function handleFitSelected(objects: DraftingObject[]) {
    if (!model || editorView.locked || objects.length === 0) {
      return;
    }

    updateView(fitDraftingObjectsView(objects, canvasSize.width, canvasSize.height, editorView));
  }

  function handleCenterViewOnPoint(point: { x: number; y: number }) {
    if (!model || editorView.locked) {
      return;
    }

    updateView({
      ...editorView,
      offsetX: canvasSize.width / 2 - point.x * editorView.scale,
      offsetY: canvasSize.height / 2 - point.y * editorView.scale,
    });
  }

  function setViewLocked(locked: boolean) {
    setPanState(null);
    setEditorView((current) => ({
      ...current,
      locked,
      updatedAt: new Date().toISOString(),
      version: DRAFTING_EDITOR_VIEW_STORAGE_VERSION,
    }));
  }

  return {
    canvasSize,
    containerRef,
    currentView: editorView,
    handleBackgroundPointerDown,
    handleCanvasWheel,
    handleCenterViewOnPoint,
    handleFitView,
    handleFitSelected,
    handleResetZoom,
    handleSetZoomScale,
    handleZoomIn,
    handleZoomOut,
    isViewLocked: editorView.locked,
    setViewLocked,
  };
}

export function getDraftingEditorViewStorageKey(drawingId: string) {
  return `${DRAFTING_EDITOR_VIEW_STORAGE_PREFIX}.${drawingId}`;
}

export function createDraftingEditorViewState(
  view?: DraftingModel['view'] | null,
  locked = false,
  updatedAt?: string,
): DraftingEditorViewState {
  return {
    scale: clampViewScale(view?.scale ?? 0.05),
    offsetX: Number.isFinite(view?.offsetX) ? view!.offsetX : 160,
    offsetY: Number.isFinite(view?.offsetY) ? view!.offsetY : 160,
    locked,
    updatedAt,
    version: DRAFTING_EDITOR_VIEW_STORAGE_VERSION,
  };
}

export function parseStoredDraftingEditorView(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<DraftingEditorViewState>;
    if (
      parsed.version !== DRAFTING_EDITOR_VIEW_STORAGE_VERSION ||
      !Number.isFinite(parsed.scale) ||
      !Number.isFinite(parsed.offsetX) ||
      !Number.isFinite(parsed.offsetY)
    ) {
      return null;
    }

    return createDraftingEditorViewState(
      {
        scale: parsed.scale as number,
        offsetX: parsed.offsetX as number,
        offsetY: parsed.offsetY as number,
      },
      parsed.locked === true,
      typeof parsed.updatedAt === 'string' ? parsed.updatedAt : undefined,
    );
  } catch {
    return null;
  }
}

export function resolveInitialDraftingEditorView(
  drawingId: string,
  model: DraftingModel,
  storage: Pick<Storage, 'getItem'> | null = getBrowserLocalStorage(),
) {
  const stored = storage?.getItem(getDraftingEditorViewStorageKey(drawingId)) ?? null;
  return parseStoredDraftingEditorView(stored) ?? createDraftingEditorViewState(model.view);
}

export function serializeDraftingEditorView(view: DraftingEditorViewState) {
  return JSON.stringify({
    scale: clampViewScale(view.scale),
    offsetX: view.offsetX,
    offsetY: view.offsetY,
    locked: view.locked,
    updatedAt: view.updatedAt,
    version: DRAFTING_EDITOR_VIEW_STORAGE_VERSION,
  });
}

function persistDraftingEditorView(drawingId: string, view: DraftingEditorViewState) {
  try {
    getBrowserLocalStorage()?.setItem(
      getDraftingEditorViewStorageKey(drawingId),
      serializeDraftingEditorView(view),
    );
  } catch {
    // Local viewport persistence is best-effort UI state.
  }
}

function getBrowserLocalStorage() {
  return typeof window === 'undefined' ? null : window.localStorage;
}

function clampViewScale(scale: number) {
  if (!Number.isFinite(scale)) {
    return 0.05;
  }

  return Math.min(Math.max(scale, DRAFTING_VIEW_MIN_SCALE), DRAFTING_VIEW_MAX_SCALE);
}
