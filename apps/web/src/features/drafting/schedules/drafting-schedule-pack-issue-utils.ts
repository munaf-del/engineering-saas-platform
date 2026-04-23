import type {
  DraftingModel,
  DraftingSchedulePackIssue,
  DraftingSchedulePackIssueStatus,
  DraftingScheduleSheetTemplateSnapshot,
  DraftingScheduleSummarySnapshot,
} from '@eng/shared';
import {
  buildDraftingScheduleSheetPack,
  type DraftingScheduleSheetMetadata,
} from './drafting-schedule-sheet';
import type { DraftingScheduleSummary } from './drafting-schedule-types';
import { getOrderedScheduleSheetDefinitions } from './drafting-schedule-sheet-definition-utils';
import { buildDraftingScheduleSummary } from './drafting-schedule-utils';

export type CreateDraftingSchedulePackIssueSnapshotArgs = {
  id: string;
  includedScheduleSheetIds?: string[];
  issuePurpose: string;
  issueStatus?: DraftingSchedulePackIssueStatus;
  issuedAt?: string;
  issuedBy?: string;
  metadata: DraftingScheduleSheetMetadata;
  name: string;
  notes?: string;
  revisionLabel: string;
  templateSnapshotsBySheetId?: Record<string, DraftingScheduleSheetTemplateSnapshot | undefined>;
};

export type DuplicateDraftingSchedulePackIssueSnapshotArgs = {
  id: string;
  issuePurpose?: string;
  name?: string;
  notes?: string;
  revisionLabel?: string;
};

export function getOrderedSchedulePackIssues(model: DraftingModel) {
  return model.schedulePackIssues ?? [];
}

export function createDraftingSchedulePackIssueSnapshot(
  model: DraftingModel,
  args: CreateDraftingSchedulePackIssueSnapshotArgs,
): DraftingSchedulePackIssue {
  const orderedDefinitions = getOrderedScheduleSheetDefinitions(model);
  const includedScheduleSheetIds =
    args.includedScheduleSheetIds && args.includedScheduleSheetIds.length > 0
      ? args.includedScheduleSheetIds
      : orderedDefinitions.map((definition) => definition.id);
  const includedIdSet = new Set(includedScheduleSheetIds);
  const lockedSheetDefinitions = orderedDefinitions
    .filter((definition) => includedIdSet.has(definition.id))
    .map((definition) =>
      cloneScheduleSheetDefinition(definition, args.templateSnapshotsBySheetId?.[definition.id]),
    );
  const scheduleSummary = buildDraftingScheduleSummary(model);
  const pack = buildDraftingScheduleSheetPack({
    definitions: lockedSheetDefinitions,
    metadata: {
      ...args.metadata,
      issuePurpose: args.issuePurpose,
      revision: args.revisionLabel,
    },
    model,
    scheduleSummary,
  });

  return {
    id: args.id,
    name: args.name,
    revisionLabel: args.revisionLabel,
    issuePurpose: args.issuePurpose,
    issueStatus: args.issueStatus ?? 'draft',
    ...(args.issuedAt ? { issuedAt: args.issuedAt } : {}),
    ...(args.issuedBy ? { issuedBy: args.issuedBy } : {}),
    ...(args.notes ? { notes: args.notes } : {}),
    includedScheduleSheetIds: lockedSheetDefinitions.map((definition) => definition.id),
    lockedSheetDefinitions,
    lockedScheduleSummary: cloneScheduleSummarySnapshot(scheduleSummary),
    pageCount: pack.pages.length,
  };
}

export function addSchedulePackIssue(
  model: DraftingModel,
  issue: DraftingSchedulePackIssue,
): DraftingModel {
  return {
    ...model,
    schedulePackIssues: [...getOrderedSchedulePackIssues(model), issue],
  };
}

export function updateSchedulePackIssue(
  model: DraftingModel,
  issueId: string,
  patch: Partial<DraftingSchedulePackIssue>,
): DraftingModel {
  return {
    ...model,
    schedulePackIssues: getOrderedSchedulePackIssues(model).map((issue) =>
      issue.id === issueId ? { ...issue, ...patch } : issue,
    ),
  };
}

export function markSchedulePackIssueIssued(
  model: DraftingModel,
  issueId: string,
  args: {
    issuedAt: string;
    issuedBy?: string;
  },
): DraftingModel {
  return updateSchedulePackIssue(model, issueId, {
    issueStatus: 'issued',
    issuedAt: args.issuedAt,
    ...(args.issuedBy ? { issuedBy: args.issuedBy } : {}),
  });
}

export function supersedeSchedulePackIssue(model: DraftingModel, issueId: string): DraftingModel {
  return updateSchedulePackIssue(model, issueId, {
    issueStatus: 'superseded',
  });
}

export function duplicateSchedulePackIssueSnapshot(
  model: DraftingModel,
  sourceIssueId: string,
  args: DuplicateDraftingSchedulePackIssueSnapshotArgs,
): DraftingModel {
  const sourceIssue = getOrderedSchedulePackIssues(model).find(
    (issue) => issue.id === sourceIssueId,
  );
  if (!sourceIssue) {
    return model;
  }

  const duplicate: DraftingSchedulePackIssue = {
    ...cloneSchedulePackIssue(sourceIssue),
    id: args.id,
    name: args.name ?? `${sourceIssue.name} Next`,
    revisionLabel: args.revisionLabel ?? nextRevisionLabel(sourceIssue.revisionLabel),
    issuePurpose: args.issuePurpose ?? sourceIssue.issuePurpose,
    issueStatus: 'draft',
    ...(args.notes ? { notes: args.notes } : {}),
  };
  delete duplicate.issuedAt;
  delete duplicate.issuedBy;

  return addSchedulePackIssue(model, duplicate);
}

export function nextRevisionLabel(label: string) {
  const trimmed = label.trim();
  const alphaMatch = /^(.*?)([A-Z])$/i.exec(trimmed);
  if (alphaMatch) {
    const prefix = alphaMatch[1] ?? '';
    const letter = alphaMatch[2]!.toUpperCase();
    if (letter !== 'Z') {
      return `${prefix}${String.fromCharCode(letter.charCodeAt(0) + 1)}`;
    }
  }

  const numericMatch = /^(.*?)(\d+)$/.exec(trimmed);
  if (numericMatch) {
    const prefix = numericMatch[1] ?? '';
    const value = Number(numericMatch[2]);
    return `${prefix}${value + 1}`;
  }

  return `${trimmed || 'Rev A'} Next`;
}

function cloneSchedulePackIssue(issue: DraftingSchedulePackIssue): DraftingSchedulePackIssue {
  return {
    ...issue,
    includedScheduleSheetIds: [...issue.includedScheduleSheetIds],
    lockedSheetDefinitions: issue.lockedSheetDefinitions.map((definition) =>
      cloneScheduleSheetDefinition(definition, definition.templateSnapshot),
    ),
    lockedScheduleSummary: cloneScheduleSummarySnapshot(issue.lockedScheduleSummary),
  };
}

function cloneScheduleSheetDefinition(
  definition: DraftingSchedulePackIssue['lockedSheetDefinitions'][number],
  templateSnapshot: DraftingScheduleSheetTemplateSnapshot | undefined = definition.templateSnapshot,
) {
  return {
    ...definition,
    includedScheduleGroups: [...definition.includedScheduleGroups],
    projectMetadata: definition.projectMetadata ? { ...definition.projectMetadata } : undefined,
    templateSnapshot: templateSnapshot ? cloneTemplateSnapshot(templateSnapshot) : undefined,
  };
}

function cloneTemplateSnapshot(snapshot: DraftingScheduleSheetTemplateSnapshot) {
  return {
    ...snapshot,
    renderDefinition: JSON.parse(
      JSON.stringify(snapshot.renderDefinition),
    ) as DraftingScheduleSheetTemplateSnapshot['renderDefinition'],
    safeArea: { ...snapshot.safeArea },
    scheduleRegion: { ...snapshot.scheduleRegion },
  };
}

function cloneScheduleSummarySnapshot(
  summary: DraftingScheduleSummary | DraftingScheduleSummarySnapshot,
): DraftingScheduleSummarySnapshot {
  return {
    counts: { ...summary.counts },
    drawingId: summary.drawingId,
    groups: summary.groups.map((group) => ({
      columns: group.columns.map((column) => ({ ...column })),
      description: group.description,
      key: group.key,
      rows: group.rows.map((row) => ({
        cells: { ...row.cells },
        id: row.id,
        objectType: row.objectType,
        sourceObjectId: row.sourceObjectId,
      })),
      title: group.title,
    })),
    units: summary.units,
  };
}
