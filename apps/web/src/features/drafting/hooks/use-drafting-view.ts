import type * as React from 'react';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import type { DraftingModel } from '@eng/shared';
import { clientToWorldPoint } from '../geometry-utils';
import { clampNumber, fitDraftingModelView } from '../model-utils';
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
    const nextScale = clampNumber(model.view.scale * scaleFactor, 0.005, 2);
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;

    replaceModel({
      ...model,
      view: {
        scale: nextScale,
        offsetX: localX - point.x * nextScale,
        offsetY: localY - point.y * nextScale,
      },
    });
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

    replaceModel({
      ...model,
      view: fitDraftingModelView(model, canvasSize.width, canvasSize.height),
    });
  }

  return {
    canvasSize,
    containerRef,
    handleBackgroundPointerDown,
    handleCanvasWheel,
    handleFitView,
  };
}
