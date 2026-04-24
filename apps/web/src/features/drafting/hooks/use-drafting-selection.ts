import type * as React from 'react';
import { useEffect, useEffectEvent, useState } from 'react';
import type { DraftingModel, DraftingObject } from '@eng/shared';
import { clientToWorldPoint } from '../geometry-utils';
import {
  canEditDraftingObject,
  removeDraftingObjectWithProvenance,
  replaceDraftingObject,
  stampDraftingObjectProvenance,
  translateDraftingObject,
} from '../model-utils';
import type { DraftingTool } from '../tools/drafting-tool-types';

type DragState = {
  objectId: string;
  startWorldPoint: { x: number; y: number };
  originalObject: DraftingObject;
};

type UseDraftingSelectionOptions = {
  activeTool: DraftingTool;
  containerRef: React.RefObject<HTMLDivElement | null>;
  model: DraftingModel | null;
  currentUserName?: string | null;
  onCancelPendingLine: () => void;
  onSelectPropertiesTab: () => void;
  pendingLinePointCount: number;
  patchModel: (
    updater: (current: DraftingModel) => DraftingModel,
    options?: { dirty?: boolean },
  ) => void;
};

export function useDraftingSelection({
  activeTool,
  containerRef,
  currentUserName,
  model,
  onCancelPendingLine,
  onSelectPropertiesTab,
  pendingLinePointCount,
  patchModel,
}: UseDraftingSelectionOptions) {
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);

  useEffect(() => {
    if (!model || !selectedObjectId) {
      return;
    }

    if (!model.objects.some((object) => object.id === selectedObjectId)) {
      setSelectedObjectId(null);
    }
  }, [model, selectedObjectId]);

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
      replaceDraftingObject(
        current,
        dragState.objectId,
        translateDraftingObject(dragState.originalObject, deltaX, deltaY, {
          by: currentUserName,
        }),
      ),
    );
  });

  useEffect(() => {
    if (!dragState) {
      return;
    }

    function handleWindowPointerMove(event: PointerEvent) {
      handleDragPointerMove(event);
    }

    function handlePointerUp() {
      setDragState(null);
    }

    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
    // `useEffectEvent` handlers intentionally stay out of the dependency list here.
  }, [dragState, handleDragPointerMove]);

  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (selectedObjectId && (event.key === 'Delete' || event.key === 'Backspace')) {
      patchModel((current) =>
        removeDraftingObjectWithProvenance(current, selectedObjectId, {
          by: currentUserName,
        }),
      );
      setSelectedObjectId(null);
    }

    if (event.key === 'Escape' && pendingLinePointCount > 0) {
      onCancelPendingLine();
    }
  });

  useEffect(() => {
    function handleWindowKeyDown(event: KeyboardEvent) {
      handleKeyDown(event);
    }

    window.addEventListener('keydown', handleWindowKeyDown);
    return () => window.removeEventListener('keydown', handleWindowKeyDown);
    // `useEffectEvent` handlers intentionally stay out of the dependency list here.
  }, [handleKeyDown]);

  const selectedObject = model?.objects.find((object) => object.id === selectedObjectId) ?? null;

  function selectObject(objectId: string | null) {
    setSelectedObjectId(objectId);
  }

  function clearSelection() {
    setSelectedObjectId(null);
  }

  function updateSelectedObject(nextObject: DraftingObject) {
    if (!selectedObject) {
      return;
    }

    patchModel((current) =>
      replaceDraftingObject(
        current,
        selectedObject.id,
        stampDraftingObjectProvenance(nextObject, {
          action: 'updated',
          by: currentUserName,
        }),
      ),
    );
  }

  function deleteSelectedObject() {
    if (!selectedObjectId) {
      return;
    }

    patchModel((current) =>
      removeDraftingObjectWithProvenance(current, selectedObjectId, {
        by: currentUserName,
      }),
    );
    setSelectedObjectId(null);
  }

  function handleObjectPointerDown(event: React.PointerEvent, object: DraftingObject) {
    event.stopPropagation();

    if (!model) {
      return;
    }

    const point = clientToWorldPoint(event.clientX, event.clientY, containerRef.current, model);
    if (!point) {
      return;
    }

    setSelectedObjectId(object.id);
    onSelectPropertiesTab();

    if (activeTool === 'select' && canEditDraftingObject(model, object)) {
      setDragState({
        objectId: object.id,
        startWorldPoint: point,
        originalObject: object,
      });
    }
  }

  return {
    clearSelection,
    deleteSelectedObject,
    handleObjectPointerDown,
    selectObject,
    selectedObject,
    selectedObjectId,
    updateSelectedObject,
  };
}
