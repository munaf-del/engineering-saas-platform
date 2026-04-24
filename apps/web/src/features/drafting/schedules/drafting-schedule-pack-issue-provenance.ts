import type {
  DraftingLockedScheduleSheetDefinition,
  DraftingModel,
  DraftingSchedulePackIssue,
  DraftingScheduleSheetDefinition,
  DraftingScheduleSheetTemplateRectSnapshot,
  DraftingScheduleSheetTemplateScheduleRegionSnapshot,
  DraftingScheduleSheetTemplateSnapshot,
} from '@eng/shared';
import type { RootSheetTemplate } from '@/features/templates/root-sheet-template-types';
import type {
  DraftingScheduleSheetMetadata,
  DraftingScheduleSheetTemplateSource,
} from './drafting-schedule-sheet';
import type {
  DraftingScheduleGroup,
  DraftingScheduleRow,
  DraftingScheduleSummary,
} from './drafting-schedule-types';
import { buildDraftingScheduleSheetPack } from './drafting-schedule-sheet';
import {
  getOrderedScheduleSheetDefinitions,
  getScheduleSheetRootTemplateId,
} from './drafting-schedule-sheet-definition-utils';
import {
  DRAFTING_SCHEDULE_GROUP_DEFINITIONS,
  buildDraftingScheduleSummary,
} from './drafting-schedule-utils';
import {
  formatSheetLayoutSummary,
  resolveDraftingScheduleSheetTemplateState,
} from './drafting-schedule-template-snapshot';

export type DraftingSchedulePackIssueSnapshotStatus =
  | 'legacy_snapshot'
  | 'locked_template_snapshot';

export type DraftingSchedulePackIssueDriftState =
  | 'in_sync'
  | 'mixed_drift'
  | 'row_summary_drift'
  | 'sheet_definition_drift'
  | 'template_drift';

type DraftingSchedulePackIssueTemplateSource =
  | DraftingScheduleSheetTemplateSnapshot['source']
  | 'legacy';

export type DraftingSchedulePackIssueTemplateSnapshotInfo = {
  fallbackProvenance: string;
  label: string | null;
  legacy: boolean;
  rootSheetTemplateId: string | null;
  rootSheetTemplateName: string | null;
  rootSheetTemplateVersionId: string | null;
  safeArea: DraftingScheduleSheetTemplateRectSnapshot | null;
  scheduleRegion: DraftingScheduleSheetTemplateScheduleRegionSnapshot | null;
  source: DraftingSchedulePackIssueTemplateSource;
  templateFingerprint: string | null;
};

export type DraftingSchedulePackIssueLiveTemplateInfo = {
  label: string;
  rootSheetTemplateId: string | null;
  rootSheetTemplateName: string | null;
  rootSheetTemplateVersionId: string | null;
  source: DraftingScheduleSheetTemplateSnapshot['source'];
  templateFingerprint: string | null;
};

export type DraftingSchedulePackIssueSheetDetail = {
  currentLiveLayoutSummary: string | null;
  currentLiveTemplate: DraftingSchedulePackIssueLiveTemplateInfo | null;
  currentLiveTemplateDiffers: boolean;
  driftMessages: string[];
  hasSheetDefinitionDrift: boolean;
  hasTemplateDrift: boolean;
  id: string;
  includedGroupLabels: string[];
  includedScheduleGroups: string[];
  isMissingLiveDefinition: boolean;
  issuedLayoutSummary: string;
  name: string;
  pageOrder: number;
  revisionLabel: string | null;
  sheetTitle: string;
  snapshotStatus: DraftingSchedulePackIssueSnapshotStatus;
  subtitle: string | null;
  templateSnapshotInfo: DraftingSchedulePackIssueTemplateSnapshotInfo;
};

export type DraftingSchedulePackIssueComparisonGroupCount = {
  difference: number;
  groupKey: string;
  issuedRowCount: number;
  liveRowCount: number;
  title: string;
};

export type DraftingSchedulePackIssueRowStatus = 'unchanged' | 'added' | 'removed' | 'changed';

export type DraftingSchedulePackIssueRowKeySource =
  | 'semantic_id'
  | 'source_object_id'
  | 'deterministic_fallback';

export type DraftingSchedulePackIssueChangedField = {
  fieldKey: string;
  label: string;
  issuedValue: string;
  liveValue: string;
};

export type DraftingSchedulePackIssueRowComparison = {
  changedFields: DraftingSchedulePackIssueChangedField[];
  issuedRow: DraftingScheduleRow | null;
  keySource: DraftingSchedulePackIssueRowKeySource;
  label: string;
  liveRow: DraftingScheduleRow | null;
  objectType: string;
  rowKey: string;
  status: DraftingSchedulePackIssueRowStatus;
};

export type DraftingSchedulePackIssueGroupRowComparison = {
  addedRows: DraftingSchedulePackIssueRowComparison[];
  changedRows: DraftingSchedulePackIssueRowComparison[];
  emptyState: string | null;
  groupKey: string;
  issuedRowCount: number;
  legacySnapshotMissingRowData: boolean;
  liveRowCount: number;
  removedRows: DraftingSchedulePackIssueRowComparison[];
  rows: DraftingSchedulePackIssueRowComparison[];
  title: string;
  unchangedRowCount: number;
  unchangedRows: DraftingSchedulePackIssueRowComparison[];
};

export type DraftingSchedulePackIssueRowComparisonSummary = {
  addedRowCount: number;
  changedRowCount: number;
  emptyState: string | null;
  groups: DraftingSchedulePackIssueGroupRowComparison[];
  legacySnapshotMissingRowData: boolean;
  noLockedRows: boolean;
  removedRowCount: number;
  unchangedRowCount: number;
};

export type DraftingSchedulePackIssueComparisonSummary = {
  driftMessages: string[];
  driftState: DraftingSchedulePackIssueDriftState;
  groupCounts: DraftingSchedulePackIssueComparisonGroupCount[];
  hasRowSummaryDrift: boolean;
  hasSheetDefinitionDrift: boolean;
  hasTemplateDrift: boolean;
  pageCount: {
    difference: number;
    issued: number;
    live: number;
  };
  rowCount: {
    difference: number;
    issued: number;
    live: number;
  };
  rowComparison: DraftingSchedulePackIssueRowComparisonSummary;
  sheetCount: {
    difference: number;
    issued: number;
    live: number;
  };
};

export type DraftingSchedulePackIssueDetail = {
  comparison: DraftingSchedulePackIssueComparisonSummary;
  includedSheetCount: number;
  issueId: string;
  issueName: string;
  issuePurpose: string;
  issueStatus: DraftingSchedulePackIssue['issueStatus'];
  issuedAt: string | null;
  issuedBy: string | null;
  legacy: boolean;
  legacyWarning: string | null;
  lockedScheduleGroupCounts: Array<{
    groupKey: string;
    rowCount: number;
    title: string;
  }>;
  lockedTotalRowCount: number;
  notes: string | null;
  pageCount: number;
  revisionLabel: string;
  selectedSheetDefinitions: DraftingSchedulePackIssueSheetDetail[];
  snapshotStatus: DraftingSchedulePackIssueSnapshotStatus;
};

export type DraftingSchedulePackIssueHistoryRow = {
  driftState: DraftingSchedulePackIssueDriftState;
  id: string;
  issueName: string;
  issuePurpose: string;
  issueStatus: DraftingSchedulePackIssue['issueStatus'];
  issuedAt: string | null;
  issuedBy: string | null;
  pageCount: number;
  revisionLabel: string;
  selectedSheetCount: number;
  snapshotStatus: DraftingSchedulePackIssueSnapshotStatus;
};

export type DraftingSchedulePackIssueManifest = {
  comparison: DraftingSchedulePackIssueComparisonSummary;
  driftStatus: DraftingSchedulePackIssueDriftState;
  issueId: string;
  issueName: string;
  issuePurpose: string;
  issueStatus: DraftingSchedulePackIssue['issueStatus'];
  issuedAt: string | null;
  issuedBy: string | null;
  legacy: boolean;
  lockedScheduleGroupCounts: Array<{
    groupKey: string;
    rowCount: number;
    title: string;
  }>;
  notes: string | null;
  pageCount: number;
  revisionLabel: string;
  selectedSheetDefinitions: DraftingSchedulePackIssueSheetDetail[];
  snapshotStatus: DraftingSchedulePackIssueSnapshotStatus;
};

export function buildDraftingSchedulePackIssueHistoryRows(args: {
  issues: DraftingSchedulePackIssue[];
  model: DraftingModel;
  rootTemplatesById: ReadonlyMap<string, RootSheetTemplate>;
}): DraftingSchedulePackIssueHistoryRow[] {
  return args.issues.map((issue) => {
    const detail = buildDraftingSchedulePackIssueDetail({
      issue,
      model: args.model,
      rootTemplatesById: args.rootTemplatesById,
    });

    return {
      driftState: detail.comparison.driftState,
      id: detail.issueId,
      issueName: detail.issueName,
      issuePurpose: detail.issuePurpose,
      issueStatus: detail.issueStatus,
      issuedAt: detail.issuedAt,
      issuedBy: detail.issuedBy,
      pageCount: detail.pageCount,
      revisionLabel: detail.revisionLabel,
      selectedSheetCount: detail.includedSheetCount,
      snapshotStatus: detail.snapshotStatus,
    };
  });
}

export function buildDraftingSchedulePackIssueDetail(args: {
  issue: DraftingSchedulePackIssue;
  model: DraftingModel;
  rootTemplatesById: ReadonlyMap<string, RootSheetTemplate>;
}): DraftingSchedulePackIssueDetail {
  const liveContext = buildLivePackContext(args.model, args.rootTemplatesById);
  const selectedSheetDefinitions = args.issue.lockedSheetDefinitions.map((lockedDefinition) =>
    buildSheetDetail({
      liveDefinition: liveContext.definitionById.get(lockedDefinition.id) ?? null,
      lockedDefinition,
      rootTemplatesById: args.rootTemplatesById,
    }),
  );
  const snapshotStatus = selectedSheetDefinitions.some(
    (sheet) => sheet.snapshotStatus === 'legacy_snapshot',
  )
    ? 'legacy_snapshot'
    : 'locked_template_snapshot';
  const comparison = buildComparisonSummary({
    issue: args.issue,
    liveContext,
    selectedSheetDefinitions,
  });
  const lockedGroupKeys = collectIncludedGroupKeys(args.issue.lockedSheetDefinitions);
  const lockedScheduleGroupCounts = buildLockedGroupCounts(args.issue, lockedGroupKeys);
  const lockedTotalRowCount = lockedScheduleGroupCounts.reduce(
    (total, group) => total + group.rowCount,
    0,
  );

  return {
    comparison,
    includedSheetCount: args.issue.lockedSheetDefinitions.length,
    issueId: args.issue.id,
    issueName: args.issue.name,
    issuePurpose: args.issue.issuePurpose,
    issueStatus: args.issue.issueStatus,
    issuedAt: args.issue.issuedAt ?? null,
    issuedBy: args.issue.issuedBy ?? null,
    legacy: snapshotStatus === 'legacy_snapshot',
    legacyWarning:
      snapshotStatus === 'legacy_snapshot'
        ? 'Legacy issue snapshot created before template snapshot locking. Exact template/version metadata was not stored for at least one issued sheet.'
        : null,
    lockedScheduleGroupCounts,
    lockedTotalRowCount,
    notes: args.issue.notes ?? null,
    pageCount: args.issue.pageCount,
    revisionLabel: args.issue.revisionLabel,
    selectedSheetDefinitions,
    snapshotStatus,
  };
}

export function buildDraftingSchedulePackIssueManifest(args: {
  issue: DraftingSchedulePackIssue;
  model: DraftingModel;
  rootTemplatesById: ReadonlyMap<string, RootSheetTemplate>;
}): DraftingSchedulePackIssueManifest {
  const detail = buildDraftingSchedulePackIssueDetail(args);

  return {
    comparison: detail.comparison,
    driftStatus: detail.comparison.driftState,
    issueId: detail.issueId,
    issueName: detail.issueName,
    issuePurpose: detail.issuePurpose,
    issueStatus: detail.issueStatus,
    issuedAt: detail.issuedAt,
    issuedBy: detail.issuedBy,
    legacy: detail.legacy,
    lockedScheduleGroupCounts: detail.lockedScheduleGroupCounts,
    notes: detail.notes,
    pageCount: detail.pageCount,
    revisionLabel: detail.revisionLabel,
    selectedSheetDefinitions: detail.selectedSheetDefinitions,
    snapshotStatus: detail.snapshotStatus,
  };
}

export function serializeDraftingSchedulePackIssueManifestJson(
  manifest: DraftingSchedulePackIssueManifest,
) {
  return JSON.stringify(manifest, null, 2);
}

export function formatDraftingSchedulePackIssueSnapshotStatus(
  status: DraftingSchedulePackIssueSnapshotStatus,
) {
  return status === 'locked_template_snapshot' ? 'Locked template snapshot' : 'Legacy snapshot';
}

export function formatDraftingSchedulePackIssueDriftState(
  driftState: DraftingSchedulePackIssueDriftState,
) {
  switch (driftState) {
    case 'template_drift':
      return 'Template drift';
    case 'sheet_definition_drift':
      return 'Sheet-definition drift';
    case 'row_summary_drift':
      return 'Row-summary drift';
    case 'mixed_drift':
      return 'Mixed drift';
    default:
      return 'In sync';
  }
}

function buildSheetDetail(args: {
  liveDefinition: DraftingScheduleSheetDefinition | null;
  lockedDefinition: DraftingLockedScheduleSheetDefinition;
  rootTemplatesById: ReadonlyMap<string, RootSheetTemplate>;
}): DraftingSchedulePackIssueSheetDetail {
  const templateSnapshotInfo = buildLockedTemplateSnapshotInfo(args.lockedDefinition);
  const liveTemplateState = args.liveDefinition
    ? resolveDraftingScheduleSheetTemplateState(args.liveDefinition, args.rootTemplatesById)
    : null;
  const currentLiveTemplate = liveTemplateState
    ? buildLiveTemplateInfo(liveTemplateState.snapshot)
    : null;
  const templateMessages: string[] = [];
  const definitionMessages: string[] = [];
  let hasTemplateDrift = false;
  let hasSheetDefinitionDrift = false;

  if (!args.liveDefinition) {
    hasSheetDefinitionDrift = true;
    definitionMessages.push('Live sheet definition is no longer available.');
  } else {
    if (
      !areStringArraysEqual(
        args.lockedDefinition.includedScheduleGroups,
        args.liveDefinition.includedScheduleGroups,
      )
    ) {
      hasSheetDefinitionDrift = true;
      definitionMessages.push(
        `Included schedule groups changed from ${formatGroupLabels(args.lockedDefinition.includedScheduleGroups)} to ${formatGroupLabels(args.liveDefinition.includedScheduleGroups)}.`,
      );
    }

    if (args.lockedDefinition.pageOrder !== args.liveDefinition.pageOrder) {
      hasSheetDefinitionDrift = true;
      definitionMessages.push(
        `Sheet order changed from ${args.lockedDefinition.pageOrder} to ${args.liveDefinition.pageOrder}.`,
      );
    }

    if (
      args.lockedDefinition.name !== args.liveDefinition.name ||
      args.lockedDefinition.title !== args.liveDefinition.title ||
      (args.lockedDefinition.subtitle ?? null) !== (args.liveDefinition.subtitle ?? null) ||
      (args.lockedDefinition.revisionLabel ?? null) !==
        (args.liveDefinition.revisionLabel ?? null) ||
      (args.lockedDefinition.issuePurpose ?? null) !== (args.liveDefinition.issuePurpose ?? null)
    ) {
      hasSheetDefinitionDrift = true;
      definitionMessages.push('Sheet definition metadata changed since issue time.');
    }

    if (
      args.lockedDefinition.pageSize !== args.liveDefinition.pageSize ||
      args.lockedDefinition.orientation !== args.liveDefinition.orientation ||
      args.lockedDefinition.tableDensity !== args.liveDefinition.tableDensity
    ) {
      hasSheetDefinitionDrift = true;
      definitionMessages.push(
        `Live pack now uses ${formatSheetLayoutSummary(args.liveDefinition)} instead of issued ${formatSheetLayoutSummary(args.lockedDefinition)}.`,
      );
    }
  }

  if (templateSnapshotInfo.source !== 'legacy' && args.liveDefinition && liveTemplateState) {
    const liveSnapshot = liveTemplateState.snapshot;

    if (
      (templateSnapshotInfo.rootSheetTemplateId ?? null) !==
        (liveSnapshot.rootSheetTemplateId ?? null) ||
      templateSnapshotInfo.source !== liveSnapshot.source
    ) {
      hasTemplateDrift = true;
      templateMessages.push(
        `Live pack now resolves ${currentLiveTemplate?.label ?? 'an unavailable template'} instead of issued ${templateSnapshotInfo.label ?? 'an unavailable template'}.`,
      );
    }

    if (
      templateSnapshotInfo.rootSheetTemplateVersionId !==
      (liveSnapshot.rootSheetTemplateVersionId ?? null)
    ) {
      hasTemplateDrift = true;
      templateMessages.push('Live pack now resolves a different root sheet template version.');
    }

    if (
      templateSnapshotInfo.templateFingerprint !== (liveSnapshot.templateFingerprint ?? null) &&
      templateMessages.length === 0 &&
      !hasSheetDefinitionDrift
    ) {
      hasTemplateDrift = true;
      templateMessages.push(
        'Live pack render configuration differs from the issued template snapshot.',
      );
    }
  }

  return {
    currentLiveLayoutSummary: args.liveDefinition
      ? formatSheetLayoutSummary(args.liveDefinition)
      : null,
    currentLiveTemplate,
    currentLiveTemplateDiffers:
      templateSnapshotInfo.source !== 'legacy' &&
      Boolean(
        currentLiveTemplate &&
        ((templateSnapshotInfo.rootSheetTemplateId ?? null) !==
          currentLiveTemplate.rootSheetTemplateId ||
          (templateSnapshotInfo.rootSheetTemplateVersionId ?? null) !==
            currentLiveTemplate.rootSheetTemplateVersionId ||
          templateSnapshotInfo.source !== currentLiveTemplate.source),
      ),
    driftMessages: [...templateMessages, ...definitionMessages],
    hasSheetDefinitionDrift,
    hasTemplateDrift,
    id: args.lockedDefinition.id,
    includedGroupLabels: args.lockedDefinition.includedScheduleGroups.map(resolveGroupTitle),
    includedScheduleGroups: [...args.lockedDefinition.includedScheduleGroups],
    isMissingLiveDefinition: args.liveDefinition === null,
    issuedLayoutSummary: formatSheetLayoutSummary(args.lockedDefinition),
    name: args.lockedDefinition.name,
    pageOrder: args.lockedDefinition.pageOrder,
    revisionLabel: args.lockedDefinition.revisionLabel ?? null,
    sheetTitle: args.lockedDefinition.title,
    snapshotStatus: templateSnapshotInfo.legacy ? 'legacy_snapshot' : 'locked_template_snapshot',
    subtitle: args.lockedDefinition.subtitle ?? null,
    templateSnapshotInfo,
  };
}

function buildComparisonSummary(args: {
  issue: DraftingSchedulePackIssue;
  liveContext: ReturnType<typeof buildLivePackContext>;
  selectedSheetDefinitions: DraftingSchedulePackIssueSheetDetail[];
}): DraftingSchedulePackIssueComparisonSummary {
  const lockedGroupKeySet = new Set(collectIncludedGroupKeys(args.issue.lockedSheetDefinitions));
  const liveGroupKeySet = new Set(collectIncludedGroupKeys(args.liveContext.definitions));
  const relevantGroupKeys = DRAFTING_SCHEDULE_GROUP_DEFINITIONS.map((group) => group.key).filter(
    (key) => lockedGroupKeySet.has(key) || liveGroupKeySet.has(key),
  );
  const groupCounts = relevantGroupKeys.map((groupKey) => {
    const issuedRowCount = args.issue.lockedScheduleSummary.counts[groupKey] ?? 0;
    const liveRowCount = args.liveContext.summary.counts[groupKey] ?? 0;

    return {
      difference: liveRowCount - issuedRowCount,
      groupKey,
      issuedRowCount,
      liveRowCount,
      title: resolveGroupTitle(groupKey),
    };
  });
  const driftMessages = groupCounts
    .filter((group) => group.issuedRowCount !== group.liveRowCount)
    .map(
      (group) =>
        `${group.title}: issued ${group.issuedRowCount} row(s), live ${group.liveRowCount} row(s).`,
    );
  const rowComparison = buildDraftingSchedulePackIssueRowComparison({
    issue: args.issue,
    liveSummary: args.liveContext.summary,
    relevantGroupKeys,
  });
  const lockedDefinitionById = new Map(
    args.issue.lockedSheetDefinitions.map((definition) => [definition.id, definition] as const),
  );
  const extraLiveDefinitions = args.liveContext.definitions.filter(
    (definition) => !lockedDefinitionById.has(definition.id),
  );
  const missingLiveDefinitions = args.selectedSheetDefinitions.filter(
    (definition) => definition.isMissingLiveDefinition,
  );
  const hasSheetDefinitionDrift =
    extraLiveDefinitions.length > 0 ||
    args.selectedSheetDefinitions.some((definition) => definition.hasSheetDefinitionDrift);
  const hasTemplateDrift = args.selectedSheetDefinitions.some(
    (definition) => definition.hasTemplateDrift,
  );
  const hasRowSummaryDrift =
    groupCounts.some((group) => group.issuedRowCount !== group.liveRowCount) ||
    rowComparison.addedRowCount > 0 ||
    rowComparison.removedRowCount > 0 ||
    rowComparison.changedRowCount > 0;

  for (const group of rowComparison.groups) {
    if (group.changedRows.length > 0) {
      driftMessages.push(`${group.title}: ${group.changedRows.length} changed row(s).`);
    }
  }

  if (extraLiveDefinitions.length > 0) {
    driftMessages.unshift(
      `Live pack now includes additional sheet definitions: ${extraLiveDefinitions
        .map((definition) => definition.name)
        .join(', ')}.`,
    );
  }

  if (missingLiveDefinitions.length > 0) {
    driftMessages.unshift(
      `Issued sheet definitions missing from the live pack: ${missingLiveDefinitions
        .map((definition) => definition.name)
        .join(', ')}.`,
    );
  }

  const issuedSheetIds = args.issue.lockedSheetDefinitions.map((definition) => definition.id);
  const liveSheetIds = args.liveContext.definitions.map((definition) => definition.id);
  if (!areStringArraysEqual(issuedSheetIds, liveSheetIds)) {
    driftMessages.unshift('Live pack sheet composition or order differs from the issued pack.');
  }

  if (args.liveContext.pageCount !== args.issue.pageCount) {
    driftMessages.push(
      `Live pack page count is ${args.liveContext.pageCount} instead of issued ${args.issue.pageCount}.`,
    );
  }

  const issuedRowCount = groupCounts.reduce((total, group) => total + group.issuedRowCount, 0);
  const liveRowCount = groupCounts.reduce((total, group) => total + group.liveRowCount, 0);

  return {
    driftMessages,
    driftState: deriveDriftState({
      hasRowSummaryDrift,
      hasSheetDefinitionDrift,
      hasTemplateDrift,
    }),
    groupCounts,
    hasRowSummaryDrift,
    hasSheetDefinitionDrift,
    hasTemplateDrift,
    pageCount: {
      difference: args.liveContext.pageCount - args.issue.pageCount,
      issued: args.issue.pageCount,
      live: args.liveContext.pageCount,
    },
    rowCount: {
      difference: liveRowCount - issuedRowCount,
      issued: issuedRowCount,
      live: liveRowCount,
    },
    rowComparison,
    sheetCount: {
      difference: args.liveContext.definitions.length - args.issue.lockedSheetDefinitions.length,
      issued: args.issue.lockedSheetDefinitions.length,
      live: args.liveContext.definitions.length,
    },
  };
}

export function buildDraftingSchedulePackIssueRowComparison(args: {
  issue: Pick<DraftingSchedulePackIssue, 'lockedScheduleSummary'>;
  liveSummary: DraftingScheduleSummary;
  relevantGroupKeys?: string[];
}): DraftingSchedulePackIssueRowComparisonSummary {
  const lockedSummary = args.issue.lockedScheduleSummary;
  const lockedGroupKeys = new Set((lockedSummary.groups ?? []).map((group) => group.key));
  const liveGroupKeys = new Set(args.liveSummary.groups.map((group) => group.key));
  const relevantGroupKeys =
    args.relevantGroupKeys ??
    DRAFTING_SCHEDULE_GROUP_DEFINITIONS.map((group) => group.key).filter(
      (key) =>
        lockedGroupKeys.has(key) ||
        liveGroupKeys.has(key) ||
        (lockedSummary.counts[key] ?? 0) > 0 ||
        (args.liveSummary.counts[key] ?? 0) > 0,
    );
  const groups = relevantGroupKeys.map((groupKey) =>
    buildGroupRowComparison({
      groupKey,
      issuedGroup: findScheduleGroup(lockedSummary, groupKey),
      issuedRowCount: lockedSummary.counts[groupKey] ?? 0,
      liveGroup: findScheduleGroup(args.liveSummary, groupKey),
      liveRowCount: (args.liveSummary.counts as Record<string, number>)[groupKey] ?? 0,
    }),
  );
  const issuedCountFromSnapshot = relevantGroupKeys.reduce(
    (total, groupKey) => total + (lockedSummary.counts[groupKey] ?? 0),
    0,
  );
  const issuedRowDataCount = groups.reduce((total, group) => total + group.issuedRowCount, 0);
  const legacySnapshotMissingRowData =
    issuedCountFromSnapshot > 0 && groups.some((group) => group.legacySnapshotMissingRowData);
  const noLockedRows = issuedCountFromSnapshot === 0 && issuedRowDataCount === 0;
  const addedRowCount = groups.reduce((total, group) => total + group.addedRows.length, 0);
  const changedRowCount = groups.reduce((total, group) => total + group.changedRows.length, 0);
  const removedRowCount = groups.reduce((total, group) => total + group.removedRows.length, 0);

  return {
    addedRowCount,
    changedRowCount,
    emptyState: legacySnapshotMissingRowData
      ? 'Legacy snapshot does not contain row-level schedule data'
      : noLockedRows && addedRowCount === 0
        ? 'No locked schedule rows in this snapshot'
        : null,
    groups,
    legacySnapshotMissingRowData,
    noLockedRows,
    removedRowCount,
    unchangedRowCount: groups.reduce((total, group) => total + group.unchangedRows.length, 0),
  };
}

export function deriveDraftingScheduleRowKey(args: {
  groupKey: string;
  index: number;
  row: DraftingScheduleRow;
}): {
  keySource: DraftingSchedulePackIssueRowKeySource;
  label: string;
  rowKey: string;
} {
  const semanticValue = firstNonEmpty([
    ...semanticCellKeysForRow(args.row).map((key) => args.row.cells[key]),
    args.row.id,
  ]);

  if (semanticValue) {
    return {
      keySource: 'semantic_id',
      label: buildRowLabel(args.row, semanticValue),
      rowKey: stableRowKey(args.groupKey, args.row.objectType, semanticValue),
    };
  }

  if (args.row.sourceObjectId) {
    return {
      keySource: 'source_object_id',
      label: buildRowLabel(args.row, args.row.sourceObjectId),
      rowKey: stableRowKey(args.groupKey, args.row.objectType, args.row.sourceObjectId),
    };
  }

  const fallbackLabel = buildFallbackRowLabel(args.row, args.index);
  return {
    keySource: 'deterministic_fallback',
    label: buildRowLabel(args.row, fallbackLabel),
    rowKey: stableRowKey(args.groupKey, args.row.objectType, `${fallbackLabel}:${args.index}`),
  };
}

function buildGroupRowComparison(args: {
  groupKey: string;
  issuedGroup: DraftingScheduleGroup | null;
  issuedRowCount: number;
  liveGroup: DraftingScheduleGroup | null;
  liveRowCount: number;
}): DraftingSchedulePackIssueGroupRowComparison {
  const issuedRows = args.issuedGroup?.rows ?? [];
  const liveRows = args.liveGroup?.rows ?? [];
  const legacySnapshotMissingRowData =
    args.issuedRowCount > 0 && issuedRows.length === 0 && args.issuedGroup === null;
  const liveRowsForDiff = legacySnapshotMissingRowData ? [] : liveRows;
  const columns = args.issuedGroup?.columns ?? args.liveGroup?.columns ?? [];
  const issuedByKey = mapRowsByKey(args.groupKey, issuedRows);
  const liveByKey = mapRowsByKey(args.groupKey, liveRowsForDiff);
  const rowKeys = Array.from(new Set([...issuedByKey.keys(), ...liveByKey.keys()])).sort();
  const rows = rowKeys.map((rowKey) => {
    const issued = issuedByKey.get(rowKey) ?? null;
    const live = liveByKey.get(rowKey) ?? null;
    const row = live?.row ?? issued?.row;
    const changedFields = issued && live ? deriveChangedFields(issued.row, live.row, columns) : [];
    const status: DraftingSchedulePackIssueRowStatus = !issued
      ? 'added'
      : !live
        ? 'removed'
        : changedFields.length > 0
          ? 'changed'
          : 'unchanged';

    return {
      changedFields,
      issuedRow: issued?.row ?? null,
      keySource: live?.keySource ?? issued?.keySource ?? 'deterministic_fallback',
      label: live?.label ?? issued?.label ?? rowKey,
      liveRow: live?.row ?? null,
      objectType: row?.objectType ?? 'unknown',
      rowKey,
      status,
    };
  });
  return {
    addedRows: rows.filter((row) => row.status === 'added'),
    changedRows: rows.filter((row) => row.status === 'changed'),
    emptyState: legacySnapshotMissingRowData
      ? 'Legacy snapshot does not contain row-level schedule data'
      : args.issuedRowCount === 0 && issuedRows.length === 0 && liveRows.length === 0
        ? 'No locked schedule rows in this snapshot'
        : null,
    groupKey: args.groupKey,
    issuedRowCount: args.issuedRowCount || issuedRows.length,
    legacySnapshotMissingRowData,
    liveRowCount: args.liveRowCount || liveRows.length,
    removedRows: rows.filter((row) => row.status === 'removed'),
    rows,
    title: resolveGroupTitle(args.groupKey),
    unchangedRowCount: rows.filter((row) => row.status === 'unchanged').length,
    unchangedRows: rows.filter((row) => row.status === 'unchanged'),
  };
}

function mapRowsByKey(groupKey: string, rows: DraftingScheduleRow[]) {
  return new Map(
    rows.map((row, index) => {
      const derived = deriveDraftingScheduleRowKey({ groupKey, index, row });
      return [
        derived.rowKey,
        {
          ...derived,
          row,
        },
      ] as const;
    }),
  );
}

function deriveChangedFields(
  issued: DraftingScheduleRow,
  live: DraftingScheduleRow,
  columns: DraftingScheduleGroup['columns'],
): DraftingSchedulePackIssueChangedField[] {
  const columnLabelsByKey = new Map(columns.map((column) => [column.key, column.label] as const));
  const cellKeys = Array.from(
    new Set([
      ...columns.map((column) => column.key),
      ...Object.keys(issued.cells),
      ...Object.keys(live.cells),
    ]),
  );
  const fields = cellKeys.flatMap((fieldKey) => {
    const issuedValue = issued.cells[fieldKey] ?? '';
    const liveValue = live.cells[fieldKey] ?? '';
    if (issuedValue === liveValue) {
      return [];
    }

    return [
      {
        fieldKey,
        issuedValue,
        label: columnLabelsByKey.get(fieldKey) ?? fieldKey,
        liveValue,
      },
    ];
  });

  if (issued.objectType !== live.objectType) {
    fields.unshift({
      fieldKey: 'objectType',
      issuedValue: issued.objectType,
      label: 'Object Type',
      liveValue: live.objectType,
    });
  }

  return fields;
}

function findScheduleGroup(
  summary:
    | DraftingScheduleSummary
    | Pick<DraftingSchedulePackIssue['lockedScheduleSummary'], 'groups'>,
  groupKey: string,
): DraftingScheduleGroup | null {
  const group = summary.groups.find((candidate) => candidate.key === groupKey);
  return group ? (group as DraftingScheduleGroup) : null;
}

function semanticCellKeysForRow(row: DraftingScheduleRow) {
  switch (row.objectType) {
    case 'anchor_tieback':
      return ['anchorId'];
    case 'borehole':
      return ['boreholeId'];
    case 'capping_beam':
    case 'waler':
      return ['beamOrWalerId'];
    case 'service_run':
    case 'service_crossing':
      return ['serviceOrCrossingId'];
    case 'pile':
    case 'secant_pile_wall':
    case 'soldier_pile_wall':
    case 'excavation_line':
      return ['idOrWallId'];
    case 'section_marker':
    case 'callout':
    case 'dimension_chain':
    case 'leader_note':
    case 'monitoring_point':
      return ['id'];
    default:
      return [];
  }
}

function buildRowLabel(row: DraftingScheduleRow, fallback: string) {
  return firstNonEmpty([
    row.cells.id,
    row.cells.anchorId,
    row.cells.idOrWallId,
    row.cells.beamOrWalerId,
    row.cells.boreholeId,
    row.cells.serviceOrCrossingId,
    row.cells.label,
    row.cells.titleOrText,
    row.id,
    fallback,
  ])!;
}

function buildFallbackRowLabel(row: DraftingScheduleRow, index: number) {
  return `${row.objectType}:${
    firstNonEmpty([row.cells.label, row.cells.titleOrText, row.cells.objectType, row.id]) ?? 'row'
  }:${index + 1}`;
}

function stableRowKey(groupKey: string, objectType: string, value: string) {
  return `${groupKey}:${objectType}:${normalizeKeyPart(value)}`;
}

function normalizeKeyPart(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function firstNonEmpty(values: Array<string | null | undefined>) {
  return (
    values.find((value) => typeof value === 'string' && value.trim().length > 0)?.trim() ?? null
  );
}

function buildLivePackContext(
  model: DraftingModel,
  rootTemplatesById: ReadonlyMap<string, RootSheetTemplate>,
) {
  const definitions = getOrderedScheduleSheetDefinitions(model);
  const definitionById = new Map(
    definitions.map((definition) => [definition.id, definition] as const),
  );
  const summary = buildDraftingScheduleSummary(model);
  const templateSourcesById = Object.fromEntries(
    definitions.flatMap((definition) => {
      const rootSheetTemplateId = getScheduleSheetRootTemplateId(definition);
      if (!rootSheetTemplateId) {
        return [];
      }

      return [
        [
          rootSheetTemplateId,
          resolveDraftingScheduleSheetTemplateState(definition, rootTemplatesById).templateSource,
        ] as const,
      ];
    }),
  ) as Record<string, DraftingScheduleSheetTemplateSource | undefined>;
  const pack = buildDraftingScheduleSheetPack({
    definitions,
    metadata: minimalPackMetadata(model),
    model,
    scheduleSummary: summary,
    templateSourcesById,
  });

  return {
    definitionById,
    definitions,
    pageCount: pack.pages.length,
    summary,
  };
}

function buildLockedGroupCounts(issue: DraftingSchedulePackIssue, lockedGroupKeys: string[]) {
  return lockedGroupKeys.map((groupKey) => ({
    groupKey,
    rowCount: issue.lockedScheduleSummary.counts[groupKey] ?? 0,
    title: resolveGroupTitle(groupKey),
  }));
}

function buildLockedTemplateSnapshotInfo(
  definition: DraftingLockedScheduleSheetDefinition,
): DraftingSchedulePackIssueTemplateSnapshotInfo {
  const snapshot = definition.templateSnapshot;
  if (!snapshot) {
    return {
      fallbackProvenance:
        'Legacy issue created before template snapshot locking; exact template/version metadata was not stored.',
      label: definition.rootSheetTemplateId ?? definition.templateId ?? null,
      legacy: true,
      rootSheetTemplateId: getScheduleSheetRootTemplateId(definition),
      rootSheetTemplateName: null,
      rootSheetTemplateVersionId: null,
      safeArea: null,
      scheduleRegion: null,
      source: 'legacy',
      templateFingerprint: null,
    };
  }

  return {
    fallbackProvenance: describeTemplateSnapshotProvenance(snapshot),
    label: snapshot.rootSheetTemplateName ?? snapshot.label,
    legacy: false,
    rootSheetTemplateId: snapshot.rootSheetTemplateId ?? null,
    rootSheetTemplateName: snapshot.rootSheetTemplateName ?? null,
    rootSheetTemplateVersionId: snapshot.rootSheetTemplateVersionId ?? null,
    safeArea: { ...snapshot.safeArea },
    scheduleRegion: { ...snapshot.scheduleRegion },
    source: snapshot.source,
    templateFingerprint: snapshot.templateFingerprint ?? null,
  };
}

function buildLiveTemplateInfo(
  snapshot: DraftingScheduleSheetTemplateSnapshot,
): DraftingSchedulePackIssueLiveTemplateInfo {
  return {
    label: snapshot.rootSheetTemplateName ?? snapshot.label,
    rootSheetTemplateId: snapshot.rootSheetTemplateId ?? null,
    rootSheetTemplateName: snapshot.rootSheetTemplateName ?? null,
    rootSheetTemplateVersionId: snapshot.rootSheetTemplateVersionId ?? null,
    source: snapshot.source,
    templateFingerprint: snapshot.templateFingerprint ?? null,
  };
}

function collectIncludedGroupKeys(
  definitions: Array<Pick<DraftingScheduleSheetDefinition, 'includedScheduleGroups'>>,
) {
  const included = new Set(definitions.flatMap((definition) => definition.includedScheduleGroups));

  return DRAFTING_SCHEDULE_GROUP_DEFINITIONS.map((group) => group.key).filter((key) =>
    included.has(key),
  );
}

function deriveDriftState(args: {
  hasRowSummaryDrift: boolean;
  hasSheetDefinitionDrift: boolean;
  hasTemplateDrift: boolean;
}): DraftingSchedulePackIssueDriftState {
  const activeCount = [
    args.hasTemplateDrift,
    args.hasSheetDefinitionDrift,
    args.hasRowSummaryDrift,
  ].filter(Boolean).length;

  if (activeCount === 0) {
    return 'in_sync';
  }

  if (activeCount > 1) {
    return 'mixed_drift';
  }

  if (args.hasTemplateDrift) {
    return 'template_drift';
  }

  if (args.hasSheetDefinitionDrift) {
    return 'sheet_definition_drift';
  }

  return 'row_summary_drift';
}

function minimalPackMetadata(model: DraftingModel): DraftingScheduleSheetMetadata {
  return {
    drawingId: model.drawingId,
    drawingTitle: 'Drafting schedule pack',
    projectCode: '',
    projectName: '',
  };
}

function describeTemplateSnapshotProvenance(snapshot: DraftingScheduleSheetTemplateSnapshot) {
  if (snapshot.source === 'default_layout') {
    return 'Locked against the internal default drafting schedule layout.';
  }

  if (snapshot.source === 'missing_template_fallback') {
    return `Locked against the internal default drafting schedule layout because root sheet template ${snapshot.rootSheetTemplateId ?? 'unknown'} was missing at issue time.`;
  }

  if (snapshot.source === 'incompatible_template_fallback') {
    return `Locked against the internal default drafting schedule layout because bound root sheet template ${snapshot.rootSheetTemplateName ?? snapshot.rootSheetTemplateId ?? 'unknown'} was incompatible at issue time.`;
  }

  return 'Locked against the published root sheet template snapshot that was active at issue time.';
}

function resolveGroupTitle(groupKey: string) {
  return (
    DRAFTING_SCHEDULE_GROUP_DEFINITIONS.find((group) => group.key === groupKey)?.title ?? groupKey
  );
}

function formatGroupLabels(groupKeys: string[]) {
  if (groupKeys.length === 0) {
    return 'no schedule groups';
  }

  return groupKeys.map(resolveGroupTitle).join(', ');
}

function areStringArraysEqual(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
