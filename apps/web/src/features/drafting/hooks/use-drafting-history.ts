import { useEffect, useState } from 'react';
import type { DraftingModel } from '@eng/shared';
import { useDraftingDrawing, useSaveDraftingModel } from '@/hooks/use-drafting';
import { cloneDraftingModel } from '../model-utils';

type DraftingModelUpdateOptions = {
  dirty?: boolean;
};

export function useDraftingHistory(projectId: string, drawingId: string) {
  const { data: drawing, isLoading } = useDraftingDrawing(projectId, drawingId);
  const saveMutation = useSaveDraftingModel(projectId, drawingId);
  const [model, setModel] = useState<DraftingModel | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (!drawing || isDirty) {
      return;
    }

    setModel(cloneDraftingModel(drawing.model));
  }, [drawing, isDirty]);

  function replaceModel(nextModel: DraftingModel, options: DraftingModelUpdateOptions = {}) {
    setModel(nextModel);
    if (options.dirty !== false) {
      setIsDirty(true);
    }
  }

  function patchModel(
    updater: (current: DraftingModel) => DraftingModel,
    options: DraftingModelUpdateOptions = {},
  ) {
    setModel((current) => {
      if (!current) {
        return current;
      }

      return updater(current);
    });

    if (options.dirty !== false) {
      setIsDirty(true);
    }
  }

  async function saveModel() {
    if (!model) {
      return null;
    }

    const saved = await saveMutation.mutateAsync(model);
    setModel(cloneDraftingModel(saved.model));
    setIsDirty(false);
    return saved;
  }

  return {
    drawing,
    isDirty,
    isLoading,
    isSaving: saveMutation.isPending,
    model,
    patchModel,
    replaceModel,
    saveModel,
  };
}
