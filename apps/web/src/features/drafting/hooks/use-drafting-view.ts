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

type PanState = {
  startClientX: number;
  startClientY: number;
  originOffsetX: number;
  originOffsetY: number;
};

type UseDraftingViewOptions = {
  activeTool: DraftingTool;
  model: DraftingModel | null;
  patchModel: (
    updater: (current: DraftingModel) => DraftingModel,
    options?: { dirty?: boolean },
  ) => void;
  replaceModel: (nextModel: DraftingModel, options?: { dirty?: boolean }) => void;
};

export function useDraftingView({
  activeTool,
  model,
  patchModel,
  replaceModel,
}: UseDraftingViewOptions) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 720 });
  const [panState, setPanState] = useState<PanState | null>(null);
  const zoomStep = 1.25;

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

    patchModel(
      (current) => ({
        ...current,
        view: {
          ...current.view,
          offsetX: panState.originOffsetX + deltaX,
          offsetY: panState.originOffsetY + deltaY,
        },
      }),
      { dirty: false },
    );
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

    if (!model) {
      return;
    }

    const point = clientToWorldPoint(event.clientX, event.clientY, containerRef.current, model);
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

    replaceModel(
      {
        ...model,
        view: zoomDraftingViewAtPoint(
          model.view,
          point,
          { x: localX, y: localY },
          model.view.scale * scaleFactor,
        ),
      },
      { dirty: false },
    );
  }

  function handleBackgroundPointerDown(event: React.PointerEvent<SVGSVGElement>) {
    if (activeTool !== 'pan' || !model) {
      return;
    }

    setPanState({
      startClientX: event.clientX,
      startClientY: event.clientY,
      originOffsetX: model.view.offsetX,
      originOffsetY: model.view.offsetY,
    });
  }

  function handleFitView() {
    if (!model) {
      return;
    }

    replaceModel(
      {
        ...model,
        view: fitDraftingModelView(model, canvasSize.width, canvasSize.height),
      },
      { dirty: false },
    );
  }

  function updateView(nextView: DraftingModel['view']) {
    if (!model) {
      return;
    }

    replaceModel({ ...model, view: nextView }, { dirty: false });
  }

  function handleZoomBy(factor: number) {
    if (!model) {
      return;
    }

    const centerScreenPoint = { x: canvasSize.width / 2, y: canvasSize.height / 2 };
    const centerWorldPoint = {
      x: (centerScreenPoint.x - model.view.offsetX) / model.view.scale,
      y: (centerScreenPoint.y - model.view.offsetY) / model.view.scale,
    };

    updateView(
      zoomDraftingViewAtPoint(
        model.view,
        centerWorldPoint,
        centerScreenPoint,
        model.view.scale * factor,
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
    if (!model) {
      return;
    }

    updateView(resetDraftingViewZoom(model, canvasSize));
  }

  function handleSetZoomScale(scale: number) {
    if (!model || !Number.isFinite(scale)) {
      return;
    }

    const nextScale = Math.min(Math.max(scale, DRAFTING_VIEW_MIN_SCALE), DRAFTING_VIEW_MAX_SCALE);
    const centerScreenPoint = { x: canvasSize.width / 2, y: canvasSize.height / 2 };
    const centerWorldPoint = {
      x: (centerScreenPoint.x - model.view.offsetX) / model.view.scale,
      y: (centerScreenPoint.y - model.view.offsetY) / model.view.scale,
    };

    updateView(zoomDraftingViewAtPoint(model.view, centerWorldPoint, centerScreenPoint, nextScale));
  }

  function handleFitSelected(objects: DraftingObject[]) {
    if (!model || objects.length === 0) {
      return;
    }

    updateView(fitDraftingObjectsView(objects, canvasSize.width, canvasSize.height, model.view));
  }

  return {
    canvasSize,
    containerRef,
    handleBackgroundPointerDown,
    handleCanvasWheel,
    handleFitView,
    handleFitSelected,
    handleResetZoom,
    handleSetZoomScale,
    handleZoomIn,
    handleZoomOut,
  };
}
