import type { DraftingModel } from '@eng/shared';
import { buildDraftingExportFilename } from './model-utils';

export function serializeDraftingModelJson(model: DraftingModel) {
  return JSON.stringify(model, null, 2);
}

export function downloadDraftingModelJson(model: DraftingModel, title: string) {
  const blob = new Blob([serializeDraftingModelJson(model)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${buildDraftingExportFilename(title)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
