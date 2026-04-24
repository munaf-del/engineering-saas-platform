import type {
  DraftingModel,
  DraftingRevisionBlockRow,
  DraftingSchedulePackIssue,
  DraftingScheduleSheetDefinition,
  DraftingScheduleSheetTemplateSnapshot,
  DraftingScheduleSummarySnapshot,
} from '@eng/shared';
import {
  DEFAULT_GENERIC_TEMPLATE_LINE_STYLE,
  type GenericTemplateDocument,
} from '@/features/templates/core/generic-template-document';
import type { TemplateRectMm } from '@/features/templates/core/template-document';
import { buildGenericTemplateSharedSheetRenderModel } from '@/features/templates/adapters/generic-template-render-model';
import type {
  SharedSheetBlockContent,
  SharedSheetBlockDefinition,
  SharedSheetRenderModel,
  SharedSheetTableBlockContent,
} from '@/features/templates/core/shared-sheet-schema';
import {
  DRAFTING_SCHEDULE_GROUP_DEFINITIONS,
  buildDraftingScheduleSummary,
} from './drafting-schedule-utils';
import {
  getOrderedScheduleSheetDefinitions,
  getScheduleSheetRootTemplateId,
} from './drafting-schedule-sheet-definition-utils';
import type {
  DraftingScheduleGroup,
  DraftingScheduleGroupKey,
  DraftingScheduleSummary,
} from './drafting-schedule-types';
import {
  buildDefaultDraftingScheduleSheetBaseDefinition,
  buildSharedSheetBaseContentFromDefinition,
  resolveDraftingScheduleRegion,
} from './drafting-schedule-sheet-layout';
import {
  buildDraftingLockedTemplateSource,
  type DraftingResolvedScheduleSheetTemplateSource,
} from './drafting-schedule-template-snapshot';

export const DRAFTING_SCHEDULE_ALL_GROUPS = 'all';
export type DraftingScheduleSheetGroupSelection =
  | DraftingScheduleGroupKey
  | typeof DRAFTING_SCHEDULE_ALL_GROUPS;

export type DraftingScheduleSheetMetadata = {
  checkedBy?: string;
  clientName?: string;
  drawingId: string;
  drawingNumber?: string;
  drawingRevision?: string;
  drawingStatus?: string;
  drawingTitle: string;
  generatedAtLabel?: string;
  issueDateLabel?: string;
  issuePurpose?: string;
  issueStatus?: string;
  issuedBy?: string;
  pageCount?: number;
  pageNumber?: number;
  preparedBy?: string;
  projectAddress?: string;
  projectCode: string;
  projectName: string;
  revision?: string;
  sheetNumber?: string;
  subtitle?: string;
  title?: string;
};

export type DraftingScheduleDrawingMetadata = {
  clientName: string | null;
  currentRevision: string | null;
  currentRevisionRow: DraftingRevisionBlockRow | null;
  drawingNumber: string | null;
  drawingTitle: string | null;
  titleBlock: DraftingModel['titleBlock'];
};

export type DraftingScheduleSheetTemplateSource = {
  definition?: DraftingResolvedScheduleSheetTemplateSource['definition'] | null;
  label: string;
  template: GenericTemplateDocument | null;
};

type DraftingScheduleSheetDefinitionWithOptionalSnapshot = DraftingScheduleSheetDefinition & {
  templateSnapshot?: DraftingScheduleSheetTemplateSnapshot;
};

type BuildDraftingScheduleSheetRenderModelArgs = {
  groupSelection: DraftingScheduleSheetGroupSelection;
  metadata: DraftingScheduleSheetMetadata;
  model: DraftingModel;
  templateSource?: DraftingScheduleSheetTemplateSource | null;
};

export type BuildDraftingScheduleSheetPackArgs = {
  definitions: DraftingScheduleSheetDefinitionWithOptionalSnapshot[];
  metadata: DraftingScheduleSheetMetadata;
  model: DraftingModel;
  scheduleSummary?: DraftingScheduleSummary | DraftingScheduleSummarySnapshot;
  sourceContext?: DraftingScheduleSheetSourceContext;
  templateSourcesById?: Record<string, DraftingScheduleSheetTemplateSource | undefined>;
};

export type BuildDraftingScheduleSheetPackFromSnapshotArgs = {
  issue: DraftingSchedulePackIssue;
  metadata: DraftingScheduleSheetMetadata;
  templateSourcesById?: Record<string, DraftingScheduleSheetTemplateSource | undefined>;
};

export type DraftingScheduleSheetPackPage = {
  definition: DraftingScheduleSheetDefinitionWithOptionalSnapshot;
  definitionPageCount: number;
  definitionPageNumber: number;
  groupKeys: DraftingScheduleGroupKey[];
  id: string;
  pageCount: number;
  pageNumber: number;
  renderModel: SharedSheetRenderModel;
  rowCount: number;
};

export type DraftingScheduleSheetPack = {
  definitions: DraftingScheduleSheetDefinitionWithOptionalSnapshot[];
  drawingMetadata: DraftingScheduleDrawingMetadata;
  drawingId: string;
  pages: DraftingScheduleSheetPackPage[];
  summary: DraftingScheduleSummary;
};

export type DraftingScheduleSheetSourceContext = {
  drawingId: string;
  objectCount: number;
  units: DraftingModel['units'];
};

const DEFAULT_OBJECT_GAP_MM = 5;
const MIN_ROWS_PER_SCHEDULE_PAGE = 1;

export function buildDraftingScheduleSheetRenderModel({
  groupSelection,
  metadata,
  model,
  templateSource = null,
}: BuildDraftingScheduleSheetRenderModelArgs): SharedSheetRenderModel {
  const summary = buildDraftingScheduleSummary(model);
  const sourceContext = createScheduleSourceContextFromModel(model);
  const scheduleGroups = resolveScheduleGroups(summary.groups, groupSelection);
  const groupLabel =
    groupSelection === DRAFTING_SCHEDULE_ALL_GROUPS
      ? 'All schedule groups'
      : (scheduleGroups[0]?.title ?? 'Schedule group');

  return buildDraftingScheduleSheetRenderModelForGroups({
    groups: scheduleGroups,
    groupLabel,
    metadata,
    sourceContext,
    templateSource,
  });
}

export function buildDraftingScheduleSheetPack({
  definitions,
  metadata,
  model,
  scheduleSummary,
  sourceContext,
  templateSourcesById = {},
}: BuildDraftingScheduleSheetPackArgs): DraftingScheduleSheetPack {
  const summary = scheduleSummary
    ? normalizeDraftingScheduleSummarySnapshot(scheduleSummary)
    : buildDraftingScheduleSummary(model);
  const resolvedSourceContext =
    sourceContext ??
    (scheduleSummary
      ? createScheduleSourceContextFromSummary(summary)
      : createScheduleSourceContextFromModel(model));
  const orderedDefinitions = getOrderedScheduleSheetDefinitions({
    ...model,
    scheduleSheets: definitions,
  });
  const pendingPages = orderedDefinitions.flatMap((definition) =>
    planDefinitionPages({
      definition,
      metadata,
      sourceContext: resolvedSourceContext,
      summary,
      templateSource: resolveDefinitionTemplateSource(definition, templateSourcesById),
    }),
  );
  const pageCount = pendingPages.length;
  const pages = pendingPages.map<DraftingScheduleSheetPackPage>((pendingPage, index) => {
    const pageNumber = index + 1;
    const renderModel = buildDraftingScheduleSheetRenderModelForGroups({
      groups: pendingPage.groups,
      groupLabel: pendingPage.groupLabel,
      metadata: {
        ...pendingPage.metadata,
        pageCount,
        pageNumber,
        sheetNumber: `D-SCH-${String(pageNumber).padStart(3, '0')}`,
      },
      sourceContext: resolvedSourceContext,
      sheetDefinition: pendingPage.definition,
      templateSource: pendingPage.templateSource,
    });

    return {
      definition: pendingPage.definition,
      definitionPageCount: pendingPage.definitionPageCount,
      definitionPageNumber: pendingPage.definitionPageNumber,
      groupKeys: pendingPage.groups.map((group) => group.key),
      id: `${pendingPage.definition.id}-page-${pendingPage.definitionPageNumber}`,
      pageCount,
      pageNumber,
      renderModel,
      rowCount: pendingPage.groups.reduce((total, group) => total + group.rows.length, 0),
    };
  });

  return {
    definitions: orderedDefinitions,
    drawingMetadata: buildScheduleDrawingMetadata(model, metadata),
    drawingId: summary.drawingId,
    pages,
    summary,
  };
}

export function buildDraftingScheduleSheetPackFromSnapshot({
  issue,
  metadata,
  templateSourcesById = {},
}: BuildDraftingScheduleSheetPackFromSnapshotArgs): DraftingScheduleSheetPack {
  const summary = normalizeDraftingScheduleSummarySnapshot(issue.lockedScheduleSummary);

  return buildDraftingScheduleSheetPackFromSummary({
    definitions: issue.lockedSheetDefinitions,
    metadata: {
      ...metadata,
      issueDateLabel: metadata.issueDateLabel ?? issue.issuedAt,
      issuePurpose: issue.issuePurpose,
      issueStatus: issue.issueStatus,
      issuedBy: issue.issuedBy,
      revision: issue.revisionLabel,
    },
    summary,
    templateSourcesById,
  });
}

export function buildDraftingScheduleSheetPackFromSummary({
  definitions,
  metadata,
  summary,
  templateSourcesById = {},
}: {
  definitions: DraftingScheduleSheetDefinitionWithOptionalSnapshot[];
  metadata: DraftingScheduleSheetMetadata;
  summary: DraftingScheduleSummary | DraftingScheduleSummarySnapshot;
  templateSourcesById?: Record<string, DraftingScheduleSheetTemplateSource | undefined>;
}): DraftingScheduleSheetPack {
  const resolvedSummary = normalizeDraftingScheduleSummarySnapshot(summary);
  const emptyModel = createScheduleOnlyModel(resolvedSummary);

  return buildDraftingScheduleSheetPack({
    definitions,
    metadata,
    model: emptyModel,
    scheduleSummary: resolvedSummary,
    sourceContext: createScheduleSourceContextFromSummary(resolvedSummary),
    templateSourcesById,
  });
}

export function serializeDraftingScheduleSheetPackJson(pack: DraftingScheduleSheetPack) {
  return JSON.stringify(
    {
      definitionCount: pack.definitions.length,
      definitions: pack.definitions.map((definition) => ({
        id: definition.id,
        includedScheduleGroups: definition.includedScheduleGroups,
        name: definition.name,
        orientation: definition.orientation,
        pageOrder: definition.pageOrder,
        pageSize: definition.pageSize,
        rootSheetTemplateId: getScheduleSheetRootTemplateId(definition),
        tableDensity: definition.tableDensity,
        templateId: definition.templateId ?? null,
        title: definition.title,
      })),
      drawingMetadata: pack.drawingMetadata,
      drawingId: pack.drawingId,
      pageCount: pack.pages.length,
      pages: pack.pages.map((page) => ({
        definitionId: page.definition.id,
        definitionName: page.definition.name,
        definitionPageCount: page.definitionPageCount,
        definitionPageNumber: page.definitionPageNumber,
        groupKeys: page.groupKeys,
        id: page.id,
        pageNumber: page.pageNumber,
        rowCount: page.rowCount,
      })),
      scheduleRowCounts: pack.summary.groups.map((group) => ({
        groupKey: group.key,
        rowCount: group.rows.length,
      })),
    },
    null,
    2,
  );
}

type PendingScheduleSheetPackPage = {
  definition: DraftingScheduleSheetDefinitionWithOptionalSnapshot;
  definitionPageCount: number;
  definitionPageNumber: number;
  groupLabel: string;
  groups: DraftingScheduleGroup[];
  metadata: DraftingScheduleSheetMetadata;
  templateSource: DraftingScheduleSheetTemplateSource | null;
};

function planDefinitionPages({
  definition,
  metadata,
  sourceContext,
  summary,
  templateSource,
}: {
  definition: DraftingScheduleSheetDefinitionWithOptionalSnapshot;
  metadata: DraftingScheduleSheetMetadata;
  sourceContext: DraftingScheduleSheetSourceContext;
  summary: DraftingScheduleSummary;
  templateSource: DraftingScheduleSheetTemplateSource | null;
}): PendingScheduleSheetPackPage[] {
  const groups = resolveDefinitionScheduleGroups(summary.groups, definition);
  const scheduleRegion = resolveScheduleRegionForDefinition({
    definition,
    metadata,
    sourceContext,
    templateSource,
  });
  const rowsPerPage = resolveRowsPerSchedulePage(scheduleRegion, definition.tableDensity);
  const groupPages =
    groups.length > 0
      ? groups.flatMap((group) => splitScheduleGroupAcrossPages(group, rowsPerPage))
      : [
          {
            groupLabel: 'No schedule groups selected',
            groups: [],
          },
        ];
  const definitionPageCount = groupPages.length;

  return groupPages.map((groupPage, index) => ({
    definition,
    definitionPageCount,
    definitionPageNumber: index + 1,
    groupLabel: groupPage.groupLabel,
    groups: groupPage.groups,
    metadata: {
      ...metadata,
      issuePurpose: definition.issuePurpose ?? metadata.issuePurpose,
      revision: definition.revisionLabel ?? metadata.revision,
      subtitle: definition.subtitle
        ? `${definition.subtitle} - ${groupPage.groupLabel}`
        : groupPage.groupLabel,
      title: definition.title,
    },
    templateSource,
  }));
}

function resolveDefinitionScheduleGroups(
  groups: DraftingScheduleGroup[],
  definition: DraftingScheduleSheetDefinitionWithOptionalSnapshot,
) {
  const includedGroups = new Set(definition.includedScheduleGroups);

  return groups.filter((group) => includedGroups.has(group.key));
}

function splitScheduleGroupAcrossPages(group: DraftingScheduleGroup, rowsPerPage: number) {
  if (group.rows.length === 0) {
    return [
      {
        groupLabel: group.title,
        groups: [group],
      },
    ];
  }

  const pageCount = Math.max(1, Math.ceil(group.rows.length / rowsPerPage));

  return Array.from({ length: pageCount }, (_, index) => {
    const pageNumber = index + 1;
    const rowStart = index * rowsPerPage;
    const pageRows = group.rows.slice(rowStart, rowStart + rowsPerPage);
    const continuedTitle =
      pageCount > 1 ? `${group.title} (${pageNumber} of ${pageCount})` : group.title;

    return {
      groupLabel: continuedTitle,
      groups: [
        {
          ...group,
          rows: pageRows,
          title: continuedTitle,
        },
      ],
    };
  });
}

function resolveScheduleRegionForDefinition({
  definition,
  metadata,
  sourceContext,
  templateSource,
}: {
  definition: DraftingScheduleSheetDefinitionWithOptionalSnapshot;
  metadata: DraftingScheduleSheetMetadata;
  sourceContext: DraftingScheduleSheetSourceContext;
  templateSource: DraftingScheduleSheetTemplateSource | null;
}) {
  const templateDefinition = resolveTemplateSourceDefinition(templateSource);
  if (templateDefinition) {
    return resolveDraftingScheduleRegion(templateDefinition);
  }

  return resolveDraftingScheduleRegion(
    buildDefaultScheduleSheetRenderModel(
      applyDefinitionMetadata(metadata, definition),
      sourceContext,
      definition.name,
      definition,
    ).definition,
  );
}

function resolveRowsPerSchedulePage(
  region: TemplateRectMm,
  density: DraftingScheduleSheetDefinition['tableDensity'],
) {
  const tableChromeHeightMm = density === 'compact' ? 19 : 24;
  const rowHeightMm = density === 'compact' ? 6.6 : 8.8;

  return Math.max(
    MIN_ROWS_PER_SCHEDULE_PAGE,
    Math.floor((region.height - tableChromeHeightMm) / rowHeightMm),
  );
}

function resolveDefinitionTemplateSource(
  definition: DraftingScheduleSheetDefinitionWithOptionalSnapshot,
  templateSourcesById: Record<string, DraftingScheduleSheetTemplateSource | undefined>,
) {
  const lockedTemplateSource = buildDraftingLockedTemplateSource(definition.templateSnapshot);
  if (lockedTemplateSource) {
    return {
      definition: lockedTemplateSource.definition,
      label: lockedTemplateSource.label,
      template: lockedTemplateSource.template,
    } satisfies DraftingScheduleSheetTemplateSource;
  }

  const rootSheetTemplateId = getScheduleSheetRootTemplateId(definition);

  if (!rootSheetTemplateId) {
    return null;
  }

  return templateSourcesById[rootSheetTemplateId] ?? null;
}

function applyDefinitionMetadata(
  metadata: DraftingScheduleSheetMetadata,
  sheetDefinition: DraftingScheduleSheetDefinitionWithOptionalSnapshot | null,
): DraftingScheduleSheetMetadata {
  if (!sheetDefinition) {
    return metadata;
  }

  return {
    ...metadata,
    checkedBy: sheetDefinition.projectMetadata?.checkedBy ?? metadata.checkedBy,
    issuePurpose: sheetDefinition.issuePurpose ?? metadata.issuePurpose,
    preparedBy: sheetDefinition.projectMetadata?.preparedBy ?? metadata.preparedBy,
    projectAddress: sheetDefinition.projectMetadata?.projectAddress ?? metadata.projectAddress,
    projectCode: sheetDefinition.projectMetadata?.projectCode ?? metadata.projectCode,
    projectName: sheetDefinition.projectMetadata?.projectName ?? metadata.projectName,
    revision: sheetDefinition.revisionLabel ?? metadata.revision,
    subtitle: metadata.subtitle ?? sheetDefinition.subtitle,
    title: metadata.title ?? sheetDefinition.title,
  };
}

function buildDraftingScheduleSheetRenderModelForGroups({
  groups,
  groupLabel,
  metadata,
  sourceContext,
  sheetDefinition = null,
  templateSource = null,
}: {
  groups: DraftingScheduleGroup[];
  groupLabel: string;
  metadata: DraftingScheduleSheetMetadata;
  sourceContext: DraftingScheduleSheetSourceContext;
  sheetDefinition?: DraftingScheduleSheetDefinitionWithOptionalSnapshot | null;
  templateSource?: DraftingScheduleSheetTemplateSource | null;
}): SharedSheetRenderModel {
  const resolvedMetadata = applyDefinitionMetadata(metadata, sheetDefinition);
  const baseRenderModel = templateSource
    ? buildTemplateSourceRenderModel(templateSource)
    : buildDefaultScheduleSheetRenderModel(
        resolvedMetadata,
        sourceContext,
        groupLabel,
        sheetDefinition,
      );
  const definition = baseRenderModel.definition;
  const scheduleRegion = resolveDraftingScheduleRegion(definition);
  const scheduleBlocks = buildScheduleTableBlocks({
    density: sheetDefinition?.tableDensity ?? 'compact',
    groups,
    region: scheduleRegion,
    startingOrder: scheduleRegion.order,
  });
  const retainedObjects = retainTemplateObjectsForScheduleSheet(
    definition.objects,
    scheduleRegion.sourceBlockId,
  );
  const contentByBlockId = bindScheduleSheetContent({
    baseContentByBlockId: baseRenderModel.contentByBlockId,
    groups,
    groupLabel,
    metadata: resolvedMetadata,
    objects: [...retainedObjects, ...scheduleBlocks],
    sourceContext,
    tableBlocks: scheduleBlocks,
    templateLabel: templateSource?.label ?? 'Default drafting schedule sheet',
  });

  return {
    contentByBlockId,
    definition: {
      ...definition,
      name: resolvedMetadata.title ?? `${resolvedMetadata.drawingTitle} Schedule Sheet`,
      objects: [...retainedObjects, ...scheduleBlocks],
    },
  };
}

export function getDraftingScheduleSheetPaper(renderModel: SharedSheetRenderModel) {
  return {
    orientation: renderModel.definition.orientation,
    paperSize: renderModel.definition.paperSize,
  };
}

function buildDefaultScheduleSheetRenderModel(
  metadata: DraftingScheduleSheetMetadata,
  sourceContext: DraftingScheduleSheetSourceContext,
  groupLabel: string,
  sheetDefinition: DraftingScheduleSheetDefinitionWithOptionalSnapshot | null = null,
): SharedSheetRenderModel {
  const definition = buildDefaultDraftingScheduleSheetBaseDefinition(sheetDefinition);

  return {
    contentByBlockId: bindScheduleSheetContent({
      baseContentByBlockId: buildSharedSheetBaseContentFromDefinition(definition),
      groups: [],
      groupLabel,
      metadata,
      objects: definition.objects,
      sourceContext,
      tableBlocks: [],
      templateLabel: 'Default drafting schedule sheet',
    }),
    definition,
  };
}

function buildTemplateSourceRenderModel(
  templateSource: DraftingScheduleSheetTemplateSource,
): SharedSheetRenderModel {
  if (templateSource.template) {
    return buildGenericTemplateSharedSheetRenderModel(templateSource.template);
  }

  const definition = resolveTemplateSourceDefinition(templateSource);
  if (!definition) {
    return buildDefaultScheduleSheetRenderModel(
      {
        drawingId: 'drafting-schedule-fallback',
        drawingTitle: 'Drafting Schedule',
        projectCode: '',
        projectName: '',
      },
      {
        drawingId: 'drafting-schedule-fallback',
        objectCount: 0,
        units: 'mm',
      },
      'Schedule group',
      null,
    );
  }

  return {
    contentByBlockId: buildSharedSheetBaseContentFromDefinition(definition),
    definition,
  };
}

function resolveTemplateSourceDefinition(
  templateSource: DraftingScheduleSheetTemplateSource | null,
) {
  if (templateSource?.definition) {
    return templateSource.definition;
  }

  if (templateSource?.template) {
    return buildGenericTemplateSharedSheetRenderModel(templateSource.template).definition;
  }

  return null;
}

function resolveScheduleGroups(
  groups: DraftingScheduleGroup[],
  groupSelection: DraftingScheduleSheetGroupSelection,
) {
  if (groupSelection === DRAFTING_SCHEDULE_ALL_GROUPS) {
    return groups;
  }

  return [groups.find((group) => group.key === groupSelection) ?? groups[0]!];
}

function retainTemplateObjectsForScheduleSheet(
  objects: SharedSheetBlockDefinition[],
  scheduleRegionSourceBlockId: string | null,
) {
  return objects.filter((block) => {
    if (block.id === scheduleRegionSourceBlockId) {
      return false;
    }

    return (
      block.type === 'titleBlock' || block.type === 'detailsBlock' || block.type === 'textBlock'
    );
  });
}

function buildScheduleTableBlocks({
  density,
  groups,
  region,
  startingOrder,
}: {
  density: DraftingScheduleSheetDefinition['tableDensity'];
  groups: DraftingScheduleGroup[];
  region: TemplateRectMm;
  startingOrder: number;
}) {
  const columnCount = groups.length > 1 && region.width >= 250 ? 2 : 1;
  const rowCount = Math.max(1, Math.ceil(groups.length / columnCount));
  const gap = groups.length > 1 ? DEFAULT_OBJECT_GAP_MM : 0;
  const blockWidth = (region.width - gap * (columnCount - 1)) / columnCount;
  const blockHeight = (region.height - gap * (rowCount - 1)) / rowCount;

  return groups.map<SharedSheetBlockDefinition>((group, index) => {
    const columnIndex = index % columnCount;
    const rowIndex = Math.floor(index / columnCount);

    return {
      columns: group.columns.map((column) => ({
        id: column.key,
        label: column.label,
        widthRatio: resolveScheduleColumnWidthRatio(column.key),
      })),
      contentScale: resolveScheduleContentScale(density, groups.length),
      density,
      height: blockHeight,
      id: `drafting-schedule-table-${group.key}`,
      lineStyle: {
        ...DEFAULT_GENERIC_TEMPLATE_LINE_STYLE,
        widthPx: 1,
      },
      locked: true,
      name: group.title,
      order: startingOrder + index + 1,
      title: group.title,
      type: 'tableBlock',
      variant: 'generic',
      visible: true,
      width: blockWidth,
      x: region.x + columnIndex * (blockWidth + gap),
      y: region.y + rowIndex * (blockHeight + gap),
    };
  });
}

function bindScheduleSheetContent({
  baseContentByBlockId,
  groups,
  groupLabel,
  metadata,
  objects,
  sourceContext,
  tableBlocks,
  templateLabel,
}: {
  baseContentByBlockId: Record<string, SharedSheetBlockContent | undefined>;
  groups: DraftingScheduleGroup[];
  groupLabel: string;
  metadata: DraftingScheduleSheetMetadata;
  objects: SharedSheetBlockDefinition[];
  sourceContext: DraftingScheduleSheetSourceContext;
  tableBlocks: SharedSheetBlockDefinition[];
  templateLabel: string;
}) {
  const rows = buildMetadataRows({ groupLabel, metadata, sourceContext, templateLabel });
  const contentByBlockId: Record<string, SharedSheetBlockContent | undefined> = {
    ...baseContentByBlockId,
  };

  for (const object of objects) {
    if (object.type === 'titleBlock') {
      const baseContent = baseContentByBlockId[object.id];
      const titleBlockContent = baseContent?.type === 'titleBlock' ? baseContent : undefined;
      contentByBlockId[object.id] = {
        ...titleBlockContent,
        checkedBy: metadata.checkedBy ?? titleBlockContent?.checkedBy,
        generatedAtLabel: metadata.generatedAtLabel ?? titleBlockContent?.generatedAtLabel,
        preparedBy: metadata.preparedBy ?? titleBlockContent?.preparedBy,
        projectAddress: metadata.projectAddress ?? titleBlockContent?.projectAddress,
        projectCode: metadata.projectCode || titleBlockContent?.projectCode,
        projectName: metadata.projectName || titleBlockContent?.projectName,
        revision: metadata.revision ?? titleBlockContent?.revision ?? 'A',
        scaleLabel: 'NTS',
        sheetModeLabel: 'Drafting schedules',
        sheetNumber: metadata.sheetNumber ?? titleBlockContent?.sheetNumber ?? 'D-SCH-001',
        sheetTitle: metadata.title ?? `${metadata.drawingTitle} Schedules`,
        subtitle: metadata.subtitle ?? groupLabel,
        type: 'titleBlock',
      };
    }

    if (object.type === 'detailsBlock') {
      const baseContent = baseContentByBlockId[object.id];
      const detailsContent = baseContent?.type === 'detailsBlock' ? baseContent : undefined;
      contentByBlockId[object.id] = {
        rows,
        title: detailsContent?.title ?? object.title ?? 'Schedule Metadata',
        type: 'detailsBlock',
      };
    }

    if (object.type === 'textBlock') {
      const baseContent = baseContentByBlockId[object.id];
      const textContent = baseContent?.type === 'textBlock' ? baseContent : undefined;
      contentByBlockId[object.id] = {
        body: `Source: DraftingModel semantic objects\nUnderlay files: excluded from schedule export`,
        subtitle: textContent?.subtitle ?? object.subtitle,
        title: textContent?.title ?? object.title ?? 'Schedule Source',
        type: 'textBlock',
      };
    }
  }

  for (const block of tableBlocks) {
    if (block.type !== 'tableBlock') {
      continue;
    }

    const group = groups.find((candidate) => block.id.endsWith(candidate.key));
    if (!group) {
      continue;
    }

    contentByBlockId[block.id] = buildScheduleTableContent(group);
  }

  return contentByBlockId;
}

function buildMetadataRows({
  groupLabel,
  metadata,
  sourceContext,
  templateLabel,
}: {
  groupLabel: string;
  metadata: DraftingScheduleSheetMetadata;
  sourceContext: DraftingScheduleSheetSourceContext;
  templateLabel: string;
}) {
  const rows = [
    { id: 'project', label: 'Project', value: metadata.projectName },
    { id: 'drawing', label: 'Drawing', value: metadata.drawingTitle },
    ...(metadata.drawingNumber
      ? [{ id: 'drawing-number', label: 'Drawing Number', value: metadata.drawingNumber }]
      : []),
    { id: 'drawing-id', label: 'Drawing ID', value: metadata.drawingId },
    { id: 'revision', label: 'Revision', value: metadata.revision ?? 'A' },
    ...(metadata.drawingRevision && metadata.drawingRevision !== metadata.revision
      ? [
          {
            id: 'drawing-revision',
            label: 'Drawing Revision',
            value: metadata.drawingRevision,
          },
        ]
      : []),
    ...(metadata.clientName ? [{ id: 'client', label: 'Client', value: metadata.clientName }] : []),
    { id: 'status', label: 'Status', value: metadata.drawingStatus ?? 'draft' },
    { id: 'groups', label: 'Groups', value: groupLabel },
    { id: 'objects', label: 'Objects', value: `${sourceContext.objectCount}` },
    { id: 'units', label: 'Units', value: sourceContext.units },
    { id: 'template', label: 'Template', value: templateLabel },
  ];

  if (metadata.pageNumber && metadata.pageCount) {
    rows.splice(5, 0, {
      id: 'page',
      label: 'Page',
      value: `${metadata.pageNumber} of ${metadata.pageCount}`,
    });
  }

  if (metadata.issuePurpose) {
    rows.splice(6, 0, {
      id: 'issue-purpose',
      label: 'Issue Purpose',
      value: metadata.issuePurpose,
    });
  }

  if (metadata.issueStatus) {
    rows.splice(7, 0, {
      id: 'issue-status',
      label: 'Issue Status',
      value: metadata.issueStatus,
    });
  }

  if (metadata.issueDateLabel) {
    rows.splice(8, 0, {
      id: 'issue-date',
      label: 'Issue Date',
      value: metadata.issueDateLabel,
    });
  }

  if (metadata.issuedBy) {
    rows.splice(9, 0, {
      id: 'issued-by',
      label: 'Issued By',
      value: metadata.issuedBy,
    });
  }

  return rows;
}

export function buildScheduleDrawingMetadata(
  model: DraftingModel,
  metadata?: DraftingScheduleSheetMetadata,
): DraftingScheduleDrawingMetadata {
  const titleBlock = model.titleBlock ?? {};
  const revisionBlock = model.revisionBlock ?? { revisions: [] };
  const currentRevision =
    metadata?.drawingRevision ??
    revisionBlock.currentRevision ??
    revisionBlock.revisions.at(-1)?.revision ??
    null;
  const currentRevisionRow =
    revisionBlock.revisions.find((row) => row.revision === currentRevision) ?? null;

  return {
    clientName: titleBlock.clientName ?? metadata?.clientName ?? null,
    currentRevision,
    currentRevisionRow,
    drawingNumber: titleBlock.drawingNumber ?? metadata?.drawingNumber ?? null,
    drawingTitle: titleBlock.drawingTitle ?? metadata?.drawingTitle ?? null,
    titleBlock,
  };
}

export function normalizeDraftingScheduleSummarySnapshot(
  summary: DraftingScheduleSummary | DraftingScheduleSummarySnapshot,
): DraftingScheduleSummary {
  const snapshotGroupsByKey = new Map(summary.groups.map((group) => [group.key, group]));
  const groups = DRAFTING_SCHEDULE_GROUP_DEFINITIONS.map<DraftingScheduleGroup>((definition) => {
    const snapshotGroup = snapshotGroupsByKey.get(definition.key);

    return {
      key: definition.key,
      title: snapshotGroup?.title ?? definition.title,
      description: snapshotGroup?.description ?? definition.description,
      columns: snapshotGroup?.columns ?? definition.columns,
      rows:
        snapshotGroup?.rows.map((row) => ({
          cells: { ...row.cells },
          id: row.id,
          objectType: row.objectType,
          sourceObjectId: row.sourceObjectId,
        })) ?? [],
    };
  });

  return {
    counts: groups.reduce(
      (counts, group) => ({
        ...counts,
        [group.key]: group.rows.length,
      }),
      {} as Record<DraftingScheduleGroupKey, number>,
    ),
    drawingId: summary.drawingId,
    groups,
    units: summary.units,
  };
}

function createScheduleSourceContextFromModel(
  model: DraftingModel,
): DraftingScheduleSheetSourceContext {
  return {
    drawingId: model.drawingId,
    objectCount: model.objects.length,
    units: model.units,
  };
}

function createScheduleSourceContextFromSummary(
  summary: DraftingScheduleSummary,
): DraftingScheduleSheetSourceContext {
  const sourceObjectIds = new Set(
    summary.groups.flatMap((group) => group.rows.map((row) => row.sourceObjectId)),
  );

  return {
    drawingId: summary.drawingId,
    objectCount: sourceObjectIds.size,
    units: summary.units,
  };
}

function createScheduleOnlyModel(summary: DraftingScheduleSummary): DraftingModel {
  return {
    version: 1,
    units: summary.units,
    drawingId: summary.drawingId,
    view: {
      scale: 0.05,
      offsetX: 0,
      offsetY: 0,
    },
    layers: [],
    underlays: [],
    objects: [],
    scheduleSheets: [],
    schedulePackIssues: [],
    drawingSheets: [],
    drawingSheetIssues: [],
  };
}

function buildScheduleTableContent(group: DraftingScheduleGroup): SharedSheetTableBlockContent {
  return {
    columns: group.columns.map((column) => ({
      id: column.key,
      label: column.label,
      widthRatio: resolveScheduleColumnWidthRatio(column.key),
    })),
    placeholder: `No ${group.title.replace(' Schedule', '').toLowerCase()} rows derived from the current DraftingModel.`,
    rows: group.rows.map((row) => row.cells),
    title: group.title,
    type: 'tableBlock',
  };
}

function resolveScheduleContentScale(
  density: DraftingScheduleSheetDefinition['tableDensity'],
  groupCount: number,
) {
  if (density === 'normal') {
    return groupCount > 1 ? 0.78 : 0.94;
  }

  return groupCount > 1 ? 0.72 : 0.86;
}

function resolveScheduleColumnWidthRatio(columnKey: string) {
  if (/(notes|title|text|linked|connection|construction|method|pattern)/i.test(columnKey)) {
    return 1.5;
  }

  if (/(id|type|label|status|stage|unit|angle|risk)/i.test(columnKey)) {
    return 0.82;
  }

  return 1;
}
