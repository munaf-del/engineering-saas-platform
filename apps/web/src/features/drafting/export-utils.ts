import type { DraftingModel } from '@eng/shared';
import { buildDraftingExportFilename } from './model-utils';
import type { DraftingScheduleGroupKey } from './schedules/drafting-schedule-types';
import {
  buildDraftingScheduleSummary,
  getDraftingScheduleGroup,
  serializeDraftingScheduleGroupCsv,
  serializeDraftingSchedulesJson,
} from './schedules/drafting-schedule-utils';

export function serializeDraftingModelJson(model: DraftingModel) {
  return JSON.stringify(model, null, 2);
}

export function downloadDraftingModelJson(model: DraftingModel, title: string) {
  downloadTextFile(
    `${buildDraftingExportFilename(title)}.json`,
    serializeDraftingModelJson(model),
    'application/json',
  );
}

export function downloadDraftingScheduleCsv(
  model: DraftingModel,
  title: string,
  groupKey: DraftingScheduleGroupKey,
) {
  const summary = buildDraftingScheduleSummary(model);
  const group = getDraftingScheduleGroup(summary, groupKey);

  downloadTextFile(
    `${buildDraftingExportFilename(title)}-${group.key}.csv`,
    serializeDraftingScheduleGroupCsv(group),
    'text/csv;charset=utf-8',
  );
}

export function downloadDraftingSchedulesJson(model: DraftingModel, title: string) {
  const summary = buildDraftingScheduleSummary(model);

  downloadTextFile(
    `${buildDraftingExportFilename(title)}-schedules.json`,
    serializeDraftingSchedulesJson(summary),
    'application/json',
  );
}

function downloadTextFile(filename: string, contents: string, type: string) {
  const blob = new Blob([contents], {
    type,
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
