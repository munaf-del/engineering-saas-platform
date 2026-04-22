import type * as React from 'react';
import { useEffect, useEffectEvent, useState } from 'react';
import type { DraftingModel, DraftingPoint, DraftingUnderlay } from '@eng/shared';
import { clientToWorldPoint } from '../geometry-utils';
import type { PdfUnderlayPageMetrics } from './use-pdf-underlay-render';
import {
  applyTwoPointUniformCalibration,
  canEditDraftingUnderlay,
  clampDraftingPoint,
  clampDraftingUnderlayCrop,
  normalizeDraftingRect,
  removeDraftingUnderlay,
  replaceDraftingUnderlay,
  translateDraftingUnderlay,
  updateDraftingUnderlay,
  worldToDraftingUnderlayLocalPoint,
} from '../model-utils';
import type { DraftingTool } from '../tools/drafting-tool-types';

type UnderlayDragState = {
  underlayId: string;
  startWorldPoint: DraftingPoint;
  originalUnderlay: DraftingUnderlay;
};

type UnderlayCropState = {
  underlayId: string;
  metrics: PdfUnderlayPageMetrics;
  startLocalPoint: DraftingPoint;
  currentLocalPoint: DraftingPoint;
};

type UnderlayCalibrationState = {
  underlayId: string;
  pdfPointA: DraftingPoint | null;
  pdfPointB: DraftingPoint | null;
};

type UseDraftingUnderlaysOptions = {
  activeTool: DraftingTool;
  containerRef: React.RefObject<HTMLDivElement | null>;
  model: DraftingModel | null;
  onSelectUnderlaysTab: () => void;
  onSelectUnderlay: (underlayId: string) => void;
  onClearObjectSelection: () => void;
  patchModel: (
    updater: (current: DraftingModel) => DraftingModel,
    options?: { dirty?: boolean },
  ) => void;
};

export function useDraftingUnderlays({
  activeTool,
  containerRef,
  model,
  onSelectUnderlaysTab,
  onSelectUnderlay,
  onClearObjectSelection,
  patchModel,
}: UseDraftingUnderlaysOptions) {
  const [selectedUnderlayId, setSelectedUnderlayId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<UnderlayDragState | null>(null);
  const [cropState, setCropState] = useState<UnderlayCropState | null>(null);
  const [activeCropUnderlayId, setActiveCropUnderlayId] = useState<string | null>(null);
  const [calibrationState, setCalibrationState] = useState<UnderlayCalibrationState | null>(null);

  useEffect(() => {
    if (!model || !selectedUnderlayId) {
      return;
    }

    if (!model.underlays.some((underlay) => underlay.id === selectedUnderlayId)) {
      setSelectedUnderlayId(null);
    }
  }, [model, selectedUnderlayId]);

  const handleDragPointerMove = useEffectEvent((event: PointerEvent) => {
    if (!dragState || !model) {
      return;
    }

    const point = clientToWorldPoint(event.clientX, event.clientY, containerRef.current, model);
    if (!point) {
      return;
    }

    const deltaX = point.x - dragState.startWorldPoint.x;
    const deltaY = point.y - dragState.startWorldPoint.y;

    patchModel((current) =>
      replaceDraftingUnderlay(
        current,
        dragState.underlayId,
        translateDraftingUnderlay(dragState.originalUnderlay, deltaX, deltaY),
      ),
    );
  });

  const handleCropPointerMove = useEffectEvent((event: PointerEvent) => {
    if (!cropState || !model) {
      return;
    }

    const point = clientToWorldPoint(event.clientX, event.clientY, containerRef.current, model);
    if (!point) {
      return;
    }

    const underlay = model.underlays.find((entry) => entry.id === cropState.underlayId);
    if (!underlay) {
      return;
    }

    const localPoint = clampDraftingPoint(
      worldToDraftingUnderlayLocalPoint(point, underlay.transform),
      cropState.metrics.width,
      cropState.metrics.height,
    );

    setCropState((current) =>
      current
        ? {
            ...current,
            currentLocalPoint: localPoint,
          }
        : current,
    );
  });

  useEffect(() => {
    if (!dragState && !cropState) {
      return;
    }

    function handleWindowPointerMove(event: PointerEvent) {
      handleDragPointerMove(event);
      handleCropPointerMove(event);
    }

    function handlePointerUp() {
      setDragState(null);

      if (!cropState) {
        return;
      }

      try {
        const nextCrop = clampDraftingUnderlayCrop(
          normalizeDraftingRect(cropState.startLocalPoint, cropState.currentLocalPoint),
          cropState.metrics.width,
          cropState.metrics.height,
        );

        patchModel((current) =>
          updateDraftingUnderlay(current, cropState.underlayId, (underlay) => ({
            ...underlay,
            crop: nextCrop,
            updatedAt: new Date().toISOString(),
          })),
        );
      } catch {
        // Ignore zero-area crop drags and leave the existing crop untouched.
      } finally {
        setCropState(null);
        setActiveCropUnderlayId(null);
      }
    }

    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [cropState, dragState, handleCropPointerMove, handleDragPointerMove, patchModel]);

  const selectedUnderlay =
    model?.underlays.find((underlay) => underlay.id === selectedUnderlayId) ?? null;

  function clearUnderlaySelection() {
    setSelectedUnderlayId(null);
  }

  function selectUnderlay(underlayId: string | null) {
    setSelectedUnderlayId(underlayId);
  }

  function updateSelectedUnderlay(updater: (underlay: DraftingUnderlay) => DraftingUnderlay) {
    if (!selectedUnderlay) {
      return;
    }

    patchModel((current) => updateDraftingUnderlay(current, selectedUnderlay.id, updater));
  }

  function removeSelectedUnderlay() {
    if (!selectedUnderlayId) {
      return;
    }

    patchModel((current) => removeDraftingUnderlay(current, selectedUnderlayId));
    setSelectedUnderlayId(null);
    setActiveCropUnderlayId(null);
    setCropState(null);
    setCalibrationState(null);
  }

  function beginCrop(underlayId: string) {
    setSelectedUnderlayId(underlayId);
    setCalibrationState(null);
    setCropState(null);
    setActiveCropUnderlayId(underlayId);
    onClearObjectSelection();
    onSelectUnderlay(underlayId);
    onSelectUnderlaysTab();
  }

  function cancelCrop() {
    setActiveCropUnderlayId(null);
    setCropState(null);
  }

  function clearCrop(underlayId: string) {
    patchModel((current) =>
      updateDraftingUnderlay(current, underlayId, (underlay) => ({
        ...underlay,
        crop: null,
        updatedAt: new Date().toISOString(),
      })),
    );
    setActiveCropUnderlayId(null);
    setCropState(null);
  }

  function beginCalibration(underlayId: string) {
    setSelectedUnderlayId(underlayId);
    setActiveCropUnderlayId(null);
    setCropState(null);
    setCalibrationState({
      underlayId,
      pdfPointA: null,
      pdfPointB: null,
    });
    onClearObjectSelection();
    onSelectUnderlay(underlayId);
    onSelectUnderlaysTab();
  }

  function cancelCalibration() {
    setCalibrationState(null);
  }

  function applyCalibration(modelDistanceMm: number, warningAcknowledged: boolean) {
    if (
      !calibrationState ||
      !calibrationState.pdfPointA ||
      !calibrationState.pdfPointB ||
      !selectedUnderlay
    ) {
      return false;
    }

    patchModel((current) =>
      updateDraftingUnderlay(current, calibrationState.underlayId, (underlay) =>
        applyTwoPointUniformCalibration(underlay, {
          pdfPointA: calibrationState.pdfPointA!,
          pdfPointB: calibrationState.pdfPointB!,
          modelDistanceMm,
          warningAcknowledged,
        }),
      ),
    );
    setCalibrationState(null);
    return true;
  }

  function handleUnderlayPointerDown(
    event: React.PointerEvent<SVGElement>,
    underlay: DraftingUnderlay,
    metrics: PdfUnderlayPageMetrics,
  ) {
    event.stopPropagation();

    if (!model) {
      return;
    }

    const point = clientToWorldPoint(event.clientX, event.clientY, containerRef.current, model);
    if (!point) {
      return;
    }

    if (!canEditDraftingUnderlay(model, underlay)) {
      return;
    }

    const localPoint = clampDraftingPoint(
      worldToDraftingUnderlayLocalPoint(point, underlay.transform),
      metrics.width,
      metrics.height,
    );

    setSelectedUnderlayId(underlay.id);
    onClearObjectSelection();
    onSelectUnderlay(underlay.id);
    onSelectUnderlaysTab();

    if (activeCropUnderlayId === underlay.id) {
      setCropState({
        underlayId: underlay.id,
        metrics,
        startLocalPoint: localPoint,
        currentLocalPoint: localPoint,
      });
      return;
    }

    if (calibrationState?.underlayId === underlay.id) {
      setCalibrationState((current) => {
        if (!current || current.underlayId !== underlay.id) {
          return current;
        }

        if (!current.pdfPointA) {
          return {
            ...current,
            pdfPointA: localPoint,
          };
        }

        return {
          ...current,
          pdfPointB: localPoint,
        };
      });
      return;
    }

    if (activeTool === 'select') {
      setDragState({
        underlayId: underlay.id,
        startWorldPoint: point,
        originalUnderlay: underlay,
      });
    }
  }

  return {
    activeCropUnderlayId,
    applyCalibration,
    beginCalibration,
    beginCrop,
    calibrationState,
    cancelCalibration,
    cancelCrop,
    clearCrop,
    clearUnderlaySelection,
    cropPreview:
      cropState && cropState.underlayId === selectedUnderlayId
        ? normalizeDraftingRect(cropState.startLocalPoint, cropState.currentLocalPoint)
        : null,
    handleUnderlayPointerDown,
    isUnderlayInteractionEnabled:
      activeTool === 'select' || calibrationState != null || activeCropUnderlayId != null,
    removeSelectedUnderlay,
    selectUnderlay,
    selectedUnderlay,
    selectedUnderlayId,
    updateSelectedUnderlay,
  };
}
