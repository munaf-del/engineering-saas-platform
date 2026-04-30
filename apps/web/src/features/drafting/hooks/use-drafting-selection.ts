import type * as React from 'react';
import { useEffect, useEffectEvent, useState } from 'react';
import type { DraftingModel, DraftingObject } from '@eng/shared';
import { clientToWorldPoint } from '../geometry-utils';
import {
  canEditDraftingObject,
  haveDraftingObjectGeometryOrLayerChanged,
  recordDraftingObjectChangeEvent,
  removeDraftingObjectWithProvenance,
  replaceDraftingObject,
  replaceDraftingObjectWithProvenance,
  translateDraftingObject,
} from '../model-utils';
import { updateDraftingObjectHandle } from '../handles/drafting-object-handles';
import type { DraftingTool } from '../tools/drafting-tool-types';

type DragState = {
  handleId?: string;
  objectId: string;
  startWorldPoint: { x: number; y: number };
  originalObject: DraftingObject;
};

type UseDraftingSelectionOptions = {
  activeTool: DraftingTool;
  containerRef: React.RefObject<HTMLDivElement | null>;
  model: DraftingModel | null;
  view: DraftingModel['view'];
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
  view,
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

    const point = clientToWorldPoint(event.clientX, event.clientY, containerRef.current, view);
    if (!point) {
      return;
    }

    const nextObject = dragState.handleId
      ? updateDraftingObjectHandle(
          dragState.originalObject,
          dragState.handleId,
          point,
          currentUserName,
        )
      : translateDraftingObject(
          dragState.originalObject,
          point.x - dragState.startWorldPoint.x,
          point.y - dragState.startWorldPoint.y,
          { by: currentUserName },
        );

    patchModel((current) => replaceDraftingObject(current, dragState.objectId, nextObject));
  });

  const handleDragPointerUp = useEffectEvent(() => {
    const currentObject =
      dragState && model ? model.objects.find((object) => object.id === dragState.objectId) : null;
    if (
      dragState &&
      currentObject &&
      haveDraftingObjectGeometryOrLayerChanged(dragState.originalObject, currentObject)
    ) {
      patchModel((current) => {
        const latestObject = current.objects.find((object) => object.id === dragState.objectId);
        if (!latestObject) {
          return current;
        }

        return recordDraftingObjectChangeEvent(current, latestObject, {
          action: 'moved',
          at: latestObject.provenance?.updatedAt ?? latestObject.updatedAt,
          by: currentUserName,
        });
      });
    }

    setDragState(null);
  });

  useEffect(() => {
    if (!dragState) {
      return;
    }

    function handleWindowPointerMove(event: PointerEvent) {
      handleDragPointerMove(event);
    }

    function handlePointerUp() {
      handleDragPointerUp();
    }

    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
    // `useEffectEvent` handlers intentionally stay out of the dependency list here.
  }, [dragState, handleDragPointerMove, handleDragPointerUp]);

  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (isEditableKeyboardTarget(event.target)) {
      return;
    }

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
      replaceDraftingObjectWithProvenance(current, selectedObject.id, nextObject, {
        action: 'updated',
        at: nextObject.updatedAt,
        by: currentUserName,
      }),
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
    if (activeTool !== 'select') {
      return;
    }

    event.stopPropagation();

    if (!model) {
      return;
    }

    setSelectedObjectId(object.id);
    onSelectPropertiesTab();

    const point = clientToWorldPoint(event.clientX, event.clientY, containerRef.current, view);
    if (!point) {
      return;
    }

    if (activeTool === 'select' && canEditDraftingObject(model, object)) {
      setDragState({
        objectId: object.id,
        startWorldPoint: point,
        originalObject: object,
      });
    }
  }

  function handleObjectHandlePointerDown(
    event: React.PointerEvent,
    object: DraftingObject,
    handleId: string,
  ) {
    event.stopPropagation();
    event.preventDefault();

    if (!model || activeTool !== 'select' || !canEditDraftingObject(model, object)) {
      return;
    }

    const point = clientToWorldPoint(event.clientX, event.clientY, containerRef.current, view);
    if (!point) {
      return;
    }

    setSelectedObjectId(object.id);
    onSelectPropertiesTab();
    setDragState({
      handleId,
      objectId: object.id,
      startWorldPoint: point,
      originalObject: object,
    });
  }

  return {
    clearSelection,
    deleteSelectedObject,
    handleObjectHandlePointerDown,
    handleObjectPointerDown,
    selectObject,
    selectedObject,
    selectedObjectId,
    updateSelectedObject,
  };
}

function isEditableKeyboardTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(
    target.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""]'),
  );
}
