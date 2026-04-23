import type { DraftingModel } from '@eng/shared';
import {
  DEFAULT_GENERIC_TEMPLATE_LINE_STYLE,
  createDefaultGenericTemplateChromeStyleForDocument,
  createDefaultGenericTemplateLineStyle,
  createDefaultGenericTemplateTypography,
  type GenericTemplateDocument,
} from '@/features/templates/core/generic-template-document';
import {
  getTemplateSafeArea,
  type TemplatePaperSize,
} from '@/features/templates/core/template-preset';
import type { TemplateRectMm } from '@/features/templates/core/template-document';
import {
  buildGenericTemplateSharedSheetRenderModel,
  adaptGenericTemplateToSharedDefinition,
} from '@/features/templates/adapters/generic-template-render-model';
import type {
  SharedSheetBlockContent,
  SharedSheetBlockDefinition,
  SharedSheetDefinition,
  SharedSheetRenderModel,
  SharedSheetTableBlockContent,
} from '@/features/templates/core/shared-sheet-schema';
import { buildDraftingScheduleSummary } from './drafting-schedule-utils';
import type { DraftingScheduleGroup, DraftingScheduleGroupKey } from './drafting-schedule-types';

export const DRAFTING_SCHEDULE_ALL_GROUPS = 'all';
export type DraftingScheduleSheetGroupSelection =
  | DraftingScheduleGroupKey
  | typeof DRAFTING_SCHEDULE_ALL_GROUPS;

export type DraftingScheduleSheetMetadata = {
  drawingId: string;
  drawingStatus?: string;
  drawingTitle: string;
  generatedAtLabel?: string;
  projectCode: string;
  projectName: string;
  revision?: string;
  sheetNumber?: string;
};

export type DraftingScheduleSheetTemplateSource = {
  label: string;
  template: GenericTemplateDocument | null;
};

type BuildDraftingScheduleSheetRenderModelArgs = {
  groupSelection: DraftingScheduleSheetGroupSelection;
  metadata: DraftingScheduleSheetMetadata;
  model: DraftingModel;
  templateSource?: DraftingScheduleSheetTemplateSource | null;
};

const DEFAULT_SHEET_PAPER_SIZE: TemplatePaperSize = 'a3';
const DEFAULT_SHEET_ORIENTATION = 'landscape';
const DEFAULT_DETAIL_BLOCK_HEIGHT_MM = 24;
const DEFAULT_TITLE_BLOCK_HEIGHT_MM = 46;
const DEFAULT_OBJECT_GAP_MM = 5;

export function buildDraftingScheduleSheetRenderModel({
  groupSelection,
  metadata,
  model,
  templateSource = null,
}: BuildDraftingScheduleSheetRenderModelArgs): SharedSheetRenderModel {
  const summary = buildDraftingScheduleSummary(model);
  const scheduleGroups = resolveScheduleGroups(summary.groups, groupSelection);
  const groupLabel =
    groupSelection === DRAFTING_SCHEDULE_ALL_GROUPS
      ? 'All schedule groups'
      : (scheduleGroups[0]?.title ?? 'Schedule group');
  const template = templateSource?.template ?? null;
  const baseRenderModel = template
    ? buildGenericTemplateSharedSheetRenderModel(template)
    : buildDefaultScheduleSheetRenderModel(metadata, model, groupLabel);
  const definition = template
    ? adaptGenericTemplateToSharedDefinition(template)
    : baseRenderModel.definition;
  const scheduleRegion = resolveScheduleRegion(definition);
  const scheduleBlocks = buildScheduleTableBlocks({
    groups: scheduleGroups,
    region: scheduleRegion,
    startingOrder: scheduleRegion.order,
  });
  const retainedObjects = retainTemplateObjectsForScheduleSheet(
    definition.objects,
    scheduleRegion.sourceBlockId,
  );
  const contentByBlockId = bindScheduleSheetContent({
    baseContentByBlockId: baseRenderModel.contentByBlockId,
    groups: scheduleGroups,
    groupLabel,
    metadata,
    model,
    objects: [...retainedObjects, ...scheduleBlocks],
    tableBlocks: scheduleBlocks,
    templateLabel: templateSource?.label ?? 'Default drafting schedule sheet',
  });

  return {
    contentByBlockId,
    definition: {
      ...definition,
      name: `${metadata.drawingTitle} Schedule Sheet`,
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
  model: DraftingModel,
  groupLabel: string,
): SharedSheetRenderModel {
  const safeArea = getTemplateSafeArea(DEFAULT_SHEET_PAPER_SIZE, DEFAULT_SHEET_ORIENTATION);
  const titleY = safeArea.y + safeArea.height - DEFAULT_TITLE_BLOCK_HEIGHT_MM;
  const tableY = safeArea.y + DEFAULT_DETAIL_BLOCK_HEIGHT_MM + DEFAULT_OBJECT_GAP_MM;
  const tableHeight = Math.max(80, titleY - tableY - DEFAULT_OBJECT_GAP_MM);
  const objects: SharedSheetBlockDefinition[] = [
    {
      checkedBy: '',
      generatedAtLabel: metadata.generatedAtLabel ?? '',
      height: DEFAULT_TITLE_BLOCK_HEIGHT_MM,
      id: 'drafting-schedule-title-block',
      lineStyle: createDefaultGenericTemplateLineStyle(),
      locked: true,
      name: 'Title Block',
      order: 10,
      preparedBy: '',
      projectCode: metadata.projectCode,
      projectName: metadata.projectName,
      revision: metadata.revision ?? 'A',
      scaleLabel: 'NTS',
      sheetNumber: metadata.sheetNumber ?? 'D-SCH-001',
      subtitle: groupLabel,
      title: `${metadata.drawingTitle} Schedules`,
      type: 'titleBlock',
      typography: createDefaultGenericTemplateTypography(),
      variant: 'as1100_drawing',
      visible: true,
      width: safeArea.width,
      x: safeArea.x,
      y: titleY,
    },
    {
      height: DEFAULT_DETAIL_BLOCK_HEIGHT_MM,
      id: 'drafting-schedule-details-block',
      lineStyle: createDefaultGenericTemplateLineStyle(),
      locked: true,
      name: 'Schedule Metadata',
      order: 20,
      title: 'Schedule Metadata',
      type: 'detailsBlock',
      variant: 'generic',
      visible: true,
      width: safeArea.width,
      x: safeArea.x,
      y: safeArea.y,
    },
    {
      columns: [],
      height: tableHeight,
      id: 'drafting-schedule-table-region',
      lineStyle: createDefaultGenericTemplateLineStyle(),
      locked: true,
      name: 'Schedule Table Region',
      order: 30,
      title: 'Schedule Table Region',
      type: 'tableBlock',
      variant: 'generic',
      visible: true,
      width: safeArea.width,
      x: safeArea.x,
      y: tableY,
    },
  ];
  const definition: SharedSheetDefinition = {
    chromeStyle: createDefaultGenericTemplateChromeStyleForDocument({
      orientation: DEFAULT_SHEET_ORIENTATION,
      paperSize: DEFAULT_SHEET_PAPER_SIZE,
      presetId: 'as1100_inspired',
    }),
    createdAt: '2026-04-22T00:00:00.000Z',
    id: 'drafting-schedule-default-sheet',
    kind: 'shared_sheet',
    name: `${metadata.drawingTitle} Schedule Sheet`,
    objects,
    orientation: DEFAULT_SHEET_ORIENTATION,
    paperSize: DEFAULT_SHEET_PAPER_SIZE,
    presetId: 'as1100_inspired',
    source: 'built_in_template_definition',
    updatedAt: '2026-04-22T00:00:00.000Z',
  };

  return {
    contentByBlockId: bindScheduleSheetContent({
      baseContentByBlockId: {},
      groups: [],
      groupLabel,
      metadata,
      model,
      objects,
      tableBlocks: [],
      templateLabel: 'Default drafting schedule sheet',
    }),
    definition,
  };
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

function resolveScheduleRegion(definition: SharedSheetDefinition) {
  const largestContentBlock = definition.objects
    .filter((block) => block.visible && block.type !== 'titleBlock')
    .sort((left, right) => right.width * right.height - left.width * left.height)[0];

  if (largestContentBlock) {
    return {
      height: largestContentBlock.height,
      order: largestContentBlock.order,
      sourceBlockId: largestContentBlock.id,
      width: largestContentBlock.width,
      x: largestContentBlock.x,
      y: largestContentBlock.y,
    };
  }

  const safeArea = getTemplateSafeArea(definition.paperSize, definition.orientation);
  const titleBlocks = definition.objects.filter(
    (block) => block.visible && block.type === 'titleBlock',
  );
  const titleTopY = titleBlocks.reduce(
    (topY, block) => Math.min(topY, block.y),
    safeArea.y + safeArea.height,
  );
  const height = Math.max(70, titleTopY - safeArea.y - DEFAULT_OBJECT_GAP_MM);

  return {
    height,
    order: 50,
    sourceBlockId: null,
    width: safeArea.width,
    x: safeArea.x,
    y: safeArea.y,
  };
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
  groups,
  region,
  startingOrder,
}: {
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
      contentScale: groups.length > 1 ? 0.72 : 0.86,
      density: 'compact',
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
  model,
  objects,
  tableBlocks,
  templateLabel,
}: {
  baseContentByBlockId: Record<string, SharedSheetBlockContent | undefined>;
  groups: DraftingScheduleGroup[];
  groupLabel: string;
  metadata: DraftingScheduleSheetMetadata;
  model: DraftingModel;
  objects: SharedSheetBlockDefinition[];
  tableBlocks: SharedSheetBlockDefinition[];
  templateLabel: string;
}) {
  const rows = buildMetadataRows({ groupLabel, metadata, model, templateLabel });
  const contentByBlockId: Record<string, SharedSheetBlockContent | undefined> = {
    ...baseContentByBlockId,
  };

  for (const object of objects) {
    if (object.type === 'titleBlock') {
      const baseContent = baseContentByBlockId[object.id];
      const titleBlockContent = baseContent?.type === 'titleBlock' ? baseContent : undefined;
      contentByBlockId[object.id] = {
        ...titleBlockContent,
        generatedAtLabel: metadata.generatedAtLabel ?? titleBlockContent?.generatedAtLabel,
        projectCode: metadata.projectCode || titleBlockContent?.projectCode,
        projectName: metadata.projectName || titleBlockContent?.projectName,
        revision: metadata.revision ?? titleBlockContent?.revision ?? 'A',
        scaleLabel: 'NTS',
        sheetModeLabel: 'Drafting schedules',
        sheetNumber: metadata.sheetNumber ?? titleBlockContent?.sheetNumber ?? 'D-SCH-001',
        sheetTitle: `${metadata.drawingTitle} Schedules`,
        subtitle: groupLabel,
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
  model,
  templateLabel,
}: {
  groupLabel: string;
  metadata: DraftingScheduleSheetMetadata;
  model: DraftingModel;
  templateLabel: string;
}) {
  return [
    { id: 'project', label: 'Project', value: metadata.projectName },
    { id: 'drawing', label: 'Drawing', value: metadata.drawingTitle },
    { id: 'drawing-id', label: 'Drawing ID', value: metadata.drawingId },
    { id: 'revision', label: 'Revision', value: metadata.revision ?? 'A' },
    { id: 'status', label: 'Status', value: metadata.drawingStatus ?? 'draft' },
    { id: 'groups', label: 'Groups', value: groupLabel },
    { id: 'objects', label: 'Objects', value: `${model.objects.length}` },
    { id: 'units', label: 'Units', value: model.units },
    { id: 'template', label: 'Template', value: templateLabel },
  ];
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

function resolveScheduleColumnWidthRatio(columnKey: string) {
  if (/(notes|title|text|linked|connection|construction|method|pattern)/i.test(columnKey)) {
    return 1.5;
  }

  if (/(id|type|label|status|stage|unit|angle|risk)/i.test(columnKey)) {
    return 0.82;
  }

  return 1;
}
