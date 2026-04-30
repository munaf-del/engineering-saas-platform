import type {
  DraftingDrawing,
  DraftingDrawingSheetIssue,
  DraftingDrawingStatus,
  DraftingModel,
} from '@eng/shared';
import {
  buildDraftingExportFilename,
  getDraftingCurrentRevisionLabel,
  getDraftingDrawingTitle,
  getDraftingWorkspaces,
  getVisibleDraftingObjectsForWorkspace,
} from './model-utils';
import { buildDraftingScheduleSummary } from './schedules/drafting-schedule-utils';
import { getDrawingSheetDefinitions } from './sheets/drafting-drawing-sheet-utils';
import { getDrawingSheetIssues } from './sheets/drafting-drawing-sheet-issue-utils';

export type DraftingReportIntegrationIndex = {
  schemaVersion: 'drafting.report-integration.v1';
  generatedAt: string;
  drawing: {
    id: string;
    kind: DraftingDrawing['kind'];
    modelVersion: number;
    projectId: string;
    status: DraftingDrawingStatus;
    title: string;
    updatedAt: string;
    currentRevision: string | null;
  };
  jsonExport: {
    filename: string;
    schemaVersion: 'drafting.model-export.v2';
    binaryPolicy: 'metadata_only';
  };
  drawingSheets: Array<{
    id: string;
    includeUnderlays: boolean;
    name: string;
    previewHref: string;
    sheetNumber: string;
    title: string;
  }>;
  issueSnapshots: Array<{
    id: string;
    issueDate: string;
    issueNumber: string;
    previewHref: string;
    purpose: string;
    revision: string;
    sheetCount: number;
    status: DraftingDrawingSheetIssue['status'];
  }>;
  scheduleExports: Array<{
    csvFilename: string;
    groupKey: string;
    rowCount: number;
    title: string;
  }>;
  workspaces: Array<{
    id: string;
    kind: string;
    name: string;
    objectCount: number;
    visible: boolean;
  }>;
  revisionSnapshots: Array<{
    createdAt: string;
    id: string;
    revisionNumber: number;
    title: string;
  }>;
};

export function buildDraftingReportIntegrationIndex({
  drawing,
  generatedAt = new Date().toISOString(),
  model = drawing.model,
}: {
  drawing: DraftingDrawing;
  generatedAt?: string;
  model?: DraftingModel;
}): DraftingReportIntegrationIndex {
  const drawingTitle = getDraftingDrawingTitle(model, drawing.title);
  const exportBaseName = buildDraftingExportFilename(drawingTitle);
  const scheduleSummary = buildDraftingScheduleSummary(model);

  return {
    schemaVersion: 'drafting.report-integration.v1',
    generatedAt,
    drawing: {
      id: drawing.id,
      kind: drawing.kind,
      modelVersion: drawing.modelVersion,
      projectId: drawing.projectId,
      status: drawing.status,
      title: drawingTitle,
      updatedAt: drawing.updatedAt,
      currentRevision: getDraftingCurrentRevisionLabel(model) ?? null,
    },
    jsonExport: {
      filename: `${exportBaseName}.json`,
      schemaVersion: 'drafting.model-export.v2',
      binaryPolicy: 'metadata_only',
    },
    drawingSheets: getDrawingSheetDefinitions(model).map((sheet) => ({
      id: sheet.id,
      includeUnderlays: sheet.includeUnderlays,
      name: sheet.name,
      previewHref: `/projects/${drawing.projectId}/drafting/${drawing.id}/sheets/preview?sheetId=${sheet.id}`,
      sheetNumber: sheet.sheetNumber,
      title: sheet.title,
    })),
    issueSnapshots: getDrawingSheetIssues(model).map((issue) => ({
      id: issue.id,
      issueDate: issue.issueDate,
      issueNumber: issue.issueNumber,
      previewHref: `/projects/${drawing.projectId}/drafting/${drawing.id}/sheets/preview?issueId=${issue.id}`,
      purpose: issue.purpose,
      revision: issue.revision,
      sheetCount: issue.lockedDrawingSheets.length,
      status: issue.status,
    })),
    scheduleExports: scheduleSummary.groups.map((group) => ({
      csvFilename: `${exportBaseName}-${group.key}.csv`,
      groupKey: group.key,
      rowCount: group.rows.length,
      title: group.title,
    })),
    workspaces: getDraftingWorkspaces(model).map((workspace) => ({
      id: workspace.id,
      kind: workspace.kind,
      name: workspace.name,
      objectCount: getVisibleDraftingObjectsForWorkspace(model, workspace.id).length,
      visible: workspace.visible !== false,
    })),
    revisionSnapshots: drawing.revisions.map((revision) => ({
      createdAt: revision.createdAt,
      id: revision.id,
      revisionNumber: revision.revisionNumber,
      title: revision.title,
    })),
  };
}
