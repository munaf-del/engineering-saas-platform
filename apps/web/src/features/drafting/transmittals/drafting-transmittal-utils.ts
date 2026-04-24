import type {
  DraftingDrawingSheetIssue,
  DraftingDrawingTransmittal,
  DraftingDrawingTransmittalStatus,
  DraftingModel,
} from '@eng/shared';
import type { RootSheetTemplate } from '@/features/templates/root-sheet-template-types';
import {
  buildDraftingDrawingSheetIssueManifest,
  compareDraftingDrawingSheetIssue,
} from '../sheets/drafting-drawing-sheet-issue-utils';

export type DraftingTransmittalInput = {
  cc?: string[];
  id: string;
  includedDrawingSheetIssueIds: string[];
  issueDate?: string;
  issuedBy?: string;
  issuedTo?: string[];
  notes?: string;
  purpose: string;
  status?: DraftingDrawingTransmittalStatus;
  title: string;
  transmittalNumber: string;
};

export type DraftingTransmittalManifest = {
  comparisonSummary: {
    hasDrift: boolean;
    issueWarnings: Array<{
      drawingSheetIssueId: string;
      messages: string[];
    }>;
  };
  createdAt: string;
  includedDrawingSheetIssueIds: string[];
  includedSheets: DraftingDrawingTransmittal['includedSheets'];
  issueManifests: Array<{
    comparison: ReturnType<typeof compareDraftingDrawingSheetIssue>;
    drawingSheetIssueId: string;
    issue: ReturnType<typeof buildDraftingDrawingSheetIssueManifest>['issue'];
    lockedTemplateMetadata: ReturnType<
      typeof buildDraftingDrawingSheetIssueManifest
    >['lockedTemplateMetadata'];
    lockedUnderlays: ReturnType<typeof buildDraftingDrawingSheetIssueManifest>['lockedUnderlays'];
    objectProvenanceSummary: Array<{
      label?: string;
      objectId: string;
      objectType: string;
      provenance?: Record<string, unknown>;
      scheduleKey?: string;
    }>;
    titleRevision: {
      lockedRevisionBlock: ReturnType<
        typeof buildDraftingDrawingSheetIssueManifest
      >['lockedRevisionBlock'];
      lockedTitleBlock: ReturnType<
        typeof buildDraftingDrawingSheetIssueManifest
      >['lockedTitleBlock'];
    };
  }>;
  transmittal: Omit<DraftingDrawingTransmittal, 'includedSheets'>;
  updatedAt: string;
};

export function getDrawingTransmittals(model: DraftingModel) {
  return model.drawingTransmittals ?? [];
}

export function getFrozenDrawingSheetIssues(model: DraftingModel) {
  return (model.drawingSheetIssues ?? []).filter(isFrozenDrawingSheetIssue);
}

export function createDraftingTransmittal(
  model: DraftingModel,
  input: DraftingTransmittalInput,
): DraftingDrawingTransmittal {
  const issueMap = new Map(getFrozenDrawingSheetIssues(model).map((issue) => [issue.id, issue]));
  const selectedIssues = unique(input.includedDrawingSheetIssueIds)
    .map((id) => issueMap.get(id))
    .filter((issue): issue is DraftingDrawingSheetIssue => Boolean(issue));

  if (selectedIssues.length === 0) {
    throw new Error('A transmittal requires at least one frozen drawing sheet issue snapshot.');
  }

  const now = input.issueDate ?? new Date().toISOString();
  return {
    id: input.id,
    transmittalNumber: input.transmittalNumber.trim(),
    title: input.title.trim(),
    purpose: input.purpose.trim(),
    status: input.status ?? 'draft',
    issueDate: now,
    issuedBy: input.issuedBy?.trim() ?? '',
    issuedTo: normalizePartyList(input.issuedTo),
    cc: normalizePartyList(input.cc),
    ...(input.notes?.trim() ? { notes: input.notes.trim() } : {}),
    includedDrawingSheetIssueIds: selectedIssues.map((issue) => issue.id),
    includedSheets: selectedIssues.flatMap((issue) => mapIssueToTransmittalSheets(issue)),
    createdAt: now,
    updatedAt: now,
  };
}

export function addDrawingTransmittal(
  model: DraftingModel,
  transmittal: DraftingDrawingTransmittal,
): DraftingModel {
  return {
    ...model,
    drawingTransmittals: [...getDrawingTransmittals(model), transmittal],
  };
}

export function updateDraftingTransmittal(
  model: DraftingModel,
  transmittalId: string,
  input: Omit<DraftingTransmittalInput, 'id'>,
): DraftingModel {
  const existing = getDrawingTransmittals(model).find(
    (candidate) => candidate.id === transmittalId,
  );
  if (!existing) {
    return model;
  }

  const updated = createDraftingTransmittal(model, {
    ...input,
    id: existing.id,
    issueDate: input.issueDate ?? existing.issueDate,
  });

  return {
    ...model,
    drawingTransmittals: getDrawingTransmittals(model).map((candidate) =>
      candidate.id === transmittalId
        ? {
            ...updated,
            createdAt: existing.createdAt,
            updatedAt: new Date().toISOString(),
          }
        : candidate,
    ),
  };
}

export function buildDraftingTransmittalManifest(args: {
  model: DraftingModel;
  rootTemplatesById?: ReadonlyMap<string, RootSheetTemplate>;
  transmittal: DraftingDrawingTransmittal;
}): DraftingTransmittalManifest {
  const issueMap = new Map((args.model.drawingSheetIssues ?? []).map((issue) => [issue.id, issue]));
  const issueManifests = args.transmittal.includedDrawingSheetIssueIds
    .map((issueId) => issueMap.get(issueId))
    .filter((issue): issue is DraftingDrawingSheetIssue => Boolean(issue))
    .map((issue) => {
      const manifest = buildDraftingDrawingSheetIssueManifest({
        issue,
        model: args.model,
        rootTemplatesById: args.rootTemplatesById,
      });

      return {
        comparison: manifest.comparison,
        drawingSheetIssueId: issue.id,
        issue: manifest.issue,
        lockedTemplateMetadata: manifest.lockedTemplateMetadata,
        lockedUnderlays: manifest.lockedUnderlays,
        objectProvenanceSummary: manifest.lockedObjects.map((object) => ({
          label: object.label,
          objectId: object.objectId,
          objectType: object.objectType,
          provenance: object.provenance,
          scheduleKey: object.scheduleKey,
        })),
        titleRevision: {
          lockedRevisionBlock: manifest.lockedRevisionBlock,
          lockedTitleBlock: manifest.lockedTitleBlock,
        },
      };
    });

  const issueWarnings = buildDraftingTransmittalWarnings({
    model: args.model,
    rootTemplatesById: args.rootTemplatesById,
    transmittal: args.transmittal,
  }).filter((warning) => warning.messages.length > 0);

  return {
    comparisonSummary: {
      hasDrift: issueManifests.some((issue) => issue.comparison.hasDrift),
      issueWarnings,
    },
    createdAt: args.transmittal.createdAt,
    includedDrawingSheetIssueIds: args.transmittal.includedDrawingSheetIssueIds,
    includedSheets: args.transmittal.includedSheets,
    issueManifests,
    transmittal: {
      cc: args.transmittal.cc,
      createdAt: args.transmittal.createdAt,
      id: args.transmittal.id,
      includedDrawingSheetIssueIds: args.transmittal.includedDrawingSheetIssueIds,
      issueDate: args.transmittal.issueDate,
      issuedBy: args.transmittal.issuedBy,
      issuedTo: args.transmittal.issuedTo,
      notes: args.transmittal.notes,
      purpose: args.transmittal.purpose,
      status: args.transmittal.status,
      title: args.transmittal.title,
      transmittalNumber: args.transmittal.transmittalNumber,
      updatedAt: args.transmittal.updatedAt,
    },
    updatedAt: args.transmittal.updatedAt,
  };
}

export function serializeDraftingTransmittalManifestJson(manifest: DraftingTransmittalManifest) {
  return JSON.stringify(manifest, null, 2);
}

export function buildDraftingTransmittalWarnings(args: {
  model: DraftingModel;
  rootTemplatesById?: ReadonlyMap<string, RootSheetTemplate>;
  transmittal: DraftingDrawingTransmittal;
}): Array<{ drawingSheetIssueId: string; messages: string[] }> {
  const issueMap = new Map((args.model.drawingSheetIssues ?? []).map((issue) => [issue.id, issue]));
  return args.transmittal.includedDrawingSheetIssueIds.map((issueId) => {
    const issue = issueMap.get(issueId);
    if (!issue) {
      return {
        drawingSheetIssueId: issueId,
        messages: ['Referenced drawing sheet issue snapshot is missing.'],
      };
    }

    const messages = getIssueCompletenessWarnings(issue);
    const comparison = compareDraftingDrawingSheetIssue(
      args.model,
      issue,
      args.rootTemplatesById ?? new Map(),
    );
    if (comparison.hasDrift) {
      messages.push('Current live drawing has drift since this issued snapshot.');
    }

    return {
      drawingSheetIssueId: issueId,
      messages,
    };
  });
}

export function getIssueCompletenessWarnings(issue: DraftingDrawingSheetIssue) {
  const messages: string[] = [];
  if (issue.lockedDrawingSheets.length === 0) {
    messages.push('Snapshot has no locked drawing sheets.');
  }
  if (!issue.lockedTitleBlock || !issue.lockedRevisionBlock) {
    messages.push('Snapshot is missing title or revision metadata.');
  }
  if (issue.lockedObjects.some((object) => !object.renderedState)) {
    messages.push('Snapshot has legacy object records without rendered state.');
  }
  if (issue.lockedDrawingSheets.some((sheet) => !sheet.templateSnapshot)) {
    messages.push('Snapshot has legacy sheet records without template metadata.');
  }
  return messages;
}

export function nextTransmittalNumber(transmittalCount: number) {
  return `TRN-${String(transmittalCount + 1).padStart(3, '0')}`;
}

function isFrozenDrawingSheetIssue(issue: DraftingDrawingSheetIssue) {
  return (
    issue.lockedDrawingSheets.length > 0 &&
    issue.sheetIds.length > 0 &&
    issue.createdAt.length > 0 &&
    issue.updatedAt.length > 0
  );
}

function mapIssueToTransmittalSheets(issue: DraftingDrawingSheetIssue) {
  return issue.lockedDrawingSheets.map((sheet) => ({
    drawingSheetIssueId: issue.id,
    sheetId: sheet.id,
    sheetNumber: sheet.sheetNumber,
    sheetName: sheet.name,
    revision: issue.revision,
    status: issue.status,
    issueNumber: issue.issueNumber,
    snapshotLabel: `${issue.issueNumber} Rev ${issue.revision} - ${sheet.sheetNumber} ${sheet.name}`,
  }));
}

function normalizePartyList(values: string[] | undefined) {
  return unique(
    (values ?? [])
      .flatMap((value) => value.split(/[,\n]/g))
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}
