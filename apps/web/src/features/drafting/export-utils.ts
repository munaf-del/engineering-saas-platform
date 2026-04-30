import type {
  DraftingDrawingSheetIssue,
  DraftingDrawingStatus,
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

export type DraftingModelJsonExportContext = {
  currentIssue?: Pick<
    DraftingDrawingSheetIssue,
    'id' | 'issueDate' | 'issueNumber' | 'purpose' | 'revision' | 'status'
  >;
  currentRevision?: string | null;
  drawingId?: string;
  drawingStatus?: DraftingDrawingStatus;
  drawingTitle?: string;
  exportedAt?: string;
  projectId?: string;
};

export function serializeDraftingModelJson(
  model: DraftingModel,
  context: DraftingModelJsonExportContext = {},
) {
  const exportModel = sanitizeDraftingModelForJsonExport(model);

  return JSON.stringify(
    {
      exportSchemaVersion: 'drafting.model-export.v2',
      exportedAt: context.exportedAt ?? new Date().toISOString(),
      binaryPolicy:
        'Metadata only. No PDF bytes, rendered images, tokens, secrets, passwords, sessions, or unrelated document content.',
      metadata: buildDraftingModelJsonExportMetadata(exportModel, context),
      profileAudit: buildDraftingSheetProfileAudit({ model: exportModel }),
      model: exportModel,
    },
    null,
    2,
  );
}

export function downloadDraftingModelJson(
  model: DraftingModel,
  title: string,
  context: DraftingModelJsonExportContext = {},
) {
  downloadTextFile(
    `${buildDraftingExportFilename(title)}.json`,
    serializeDraftingModelJson(model, {
      ...context,
      drawingTitle: context.drawingTitle ?? title,
    }),
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

function buildDraftingModelJsonExportMetadata(
  model: DraftingModel,
  context: DraftingModelJsonExportContext,
) {
  return {
    modelVersion: model.version,
    units: model.units,
    drawingId: context.drawingId ?? model.drawingId,
    ...(context.projectId ? { projectId: context.projectId } : {}),
    ...(context.drawingTitle ? { drawingTitle: context.drawingTitle } : {}),
    ...(context.drawingStatus ? { drawingStatus: context.drawingStatus } : {}),
    currentRevision:
      context.currentRevision ??
      model.revisionBlock?.currentRevision ??
      model.revisionBlock?.revisions.at(-1)?.revision ??
      null,
    ...(context.currentIssue
      ? {
          currentIssue: {
            id: context.currentIssue.id,
            issueDate: context.currentIssue.issueDate,
            issueNumber: context.currentIssue.issueNumber,
            purpose: context.currentIssue.purpose,
            revision: context.currentIssue.revision,
            status: context.currentIssue.status,
          },
        }
      : {}),
    counts: {
      drawingSheetIssues: model.drawingSheetIssues.length,
      drawingSheets: model.drawingSheets.length,
      layers: model.layers.length,
      objects: model.objects.length,
      schedulePackIssues: model.schedulePackIssues.length,
      scheduleSheets: model.scheduleSheets.length,
      transmittals: model.drawingTransmittals.length,
      underlays: model.underlays.length,
    },
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
