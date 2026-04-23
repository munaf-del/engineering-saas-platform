import type { DraftingModel } from '@eng/shared';
import type { DraftingSchedulePackIssue } from '@eng/shared';
import type { RootSheetTemplate } from '@/features/templates/root-sheet-template-types';
import { buildDraftingExportFilename } from './model-utils';
import type { DraftingScheduleGroupKey } from './schedules/drafting-schedule-types';
import type { DraftingScheduleSheetMetadata } from './schedules/drafting-schedule-sheet';
import {
  buildDraftingSchedulePackIssueManifest,
  serializeDraftingSchedulePackIssueManifestJson,
} from './schedules/drafting-schedule-pack-issue-provenance';
import {
  buildDraftingScheduleSheetPack,
  serializeDraftingScheduleSheetPackJson,
} from './schedules/drafting-schedule-sheet';
import { getOrderedScheduleSheetDefinitions } from './schedules/drafting-schedule-sheet-definition-utils';
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

export function downloadDraftingScheduleSheetPackJson(
  model: DraftingModel,
  title: string,
  metadata: DraftingScheduleSheetMetadata,
) {
  const pack = buildDraftingScheduleSheetPack({
    definitions: getOrderedScheduleSheetDefinitions(model),
    metadata,
    model,
  });

  downloadTextFile(
    `${buildDraftingExportFilename(title)}-schedule-pack.json`,
    serializeDraftingScheduleSheetPackJson(pack),
    'application/json',
  );
}

export function downloadDraftingSchedulePackIssueManifestJson(args: {
  issue: DraftingSchedulePackIssue;
  model: DraftingModel;
  rootTemplatesById: ReadonlyMap<string, RootSheetTemplate>;
  title: string;
}) {
  const manifest = buildDraftingSchedulePackIssueManifest({
    issue: args.issue,
    model: args.model,
    rootTemplatesById: args.rootTemplatesById,
  });

  downloadTextFile(
    `${buildDraftingExportFilename(args.title)}-schedule-issue-${sanitizeFilenameSegment(args.issue.revisionLabel)}-manifest.json`,
    serializeDraftingSchedulePackIssueManifestJson(manifest),
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

function sanitizeFilenameSegment(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
