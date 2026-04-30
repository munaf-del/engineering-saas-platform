import type {
  DraftingDrawingSheetIssue,
  DraftingDrawingTransmittal,
  DraftingModel,
  DraftingUnderlay,
} from '@eng/shared';
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
  buildDraftingDrawingSheetIssueManifest,
  serializeDraftingDrawingSheetIssueManifestJson,
} from './sheets/drafting-drawing-sheet-issue-utils';
import {
  buildDraftingTransmittalManifest,
  serializeDraftingTransmittalManifestJson,
} from './transmittals/drafting-transmittal-utils';
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
import { buildDraftingSheetProfileAudit } from './standards/drafting-profile-audit';

export function serializeDraftingModelJson(model: DraftingModel) {
  const exportModel = sanitizeDraftingModelForJsonExport(model);

  return JSON.stringify(
    {
      exportSchemaVersion: 'drafting.model-export.v2',
      binaryPolicy:
        'Metadata only. No PDF bytes, rendered images, tokens, secrets, passwords, sessions, or unrelated document content.',
      profileAudit: buildDraftingSheetProfileAudit({ model: exportModel }),
      model: exportModel,
    },
    null,
    2,
  );
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

export function downloadDraftingDrawingSheetIssueManifestJson(args: {
  issue: DraftingDrawingSheetIssue;
  model: DraftingModel;
  rootTemplatesById: ReadonlyMap<string, RootSheetTemplate>;
  title: string;
}) {
  const manifest = buildDraftingDrawingSheetIssueManifest({
    issue: args.issue,
    model: args.model,
    rootTemplatesById: args.rootTemplatesById,
  });

  downloadTextFile(
    `${buildDraftingExportFilename(args.title)}-drawing-sheet-issue-${sanitizeFilenameSegment(args.issue.issueNumber)}-manifest.json`,
    serializeDraftingDrawingSheetIssueManifestJson(manifest),
    'application/json',
  );
}

export function downloadDraftingTransmittalManifestJson(args: {
  model: DraftingModel;
  rootTemplatesById: ReadonlyMap<string, RootSheetTemplate>;
  title: string;
  transmittal: DraftingDrawingTransmittal;
}) {
  const manifest = buildDraftingTransmittalManifest({
    model: args.model,
    rootTemplatesById: args.rootTemplatesById,
    transmittal: args.transmittal,
  });

  downloadTextFile(
    `${buildDraftingExportFilename(args.title)}-transmittal-${sanitizeFilenameSegment(args.transmittal.transmittalNumber)}-manifest.json`,
    serializeDraftingTransmittalManifestJson(manifest),
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

function sanitizeDraftingModelForJsonExport(model: DraftingModel): DraftingModel {
  return {
    ...model,
    underlays: model.underlays.map(toDraftingUnderlayMetadataExport),
  };
}

function toDraftingUnderlayMetadataExport(underlay: DraftingUnderlay): DraftingUnderlay {
  const exported: DraftingUnderlay = {
    id: underlay.id,
    name: underlay.name,
    fileId: underlay.fileId,
    fileName: underlay.fileName,
    pageNumber: underlay.pageNumber,
    visible: underlay.visible,
    opacity: underlay.opacity,
    locked: underlay.locked,
    transform: { ...underlay.transform },
    createdAt: underlay.createdAt,
    updatedAt: underlay.updatedAt,
  };

  if (underlay.crop !== undefined) {
    exported.crop = underlay.crop ? { ...underlay.crop } : null;
  }

  if (underlay.calibration !== undefined) {
    exported.calibration = underlay.calibration
      ? {
          ...underlay.calibration,
          modelPointA: { ...underlay.calibration.modelPointA },
          modelPointB: { ...underlay.calibration.modelPointB },
          pdfPointA: { ...underlay.calibration.pdfPointA },
          pdfPointB: { ...underlay.calibration.pdfPointB },
        }
      : null;
  }

  return exported;
}
