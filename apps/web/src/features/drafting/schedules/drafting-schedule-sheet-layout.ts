import type { DraftingScheduleSheetDefinition } from '@eng/shared';
import {
  createDefaultGenericTemplateChromeStyleForDocument,
  createDefaultGenericTemplateLineStyle,
  createDefaultGenericTemplateTypography,
} from '@/features/templates/core/generic-template-document';
import type { TemplateRectMm } from '@/features/templates/core/template-document';
import {
  getTemplateSafeArea,
  type TemplatePageOrientation,
  type TemplatePaperSize,
} from '@/features/templates/core/template-preset';
import type {
  SharedSheetBlockContent,
  SharedSheetBlockDefinition,
  SharedSheetDefinition,
} from '@/features/templates/core/shared-sheet-schema';

const DEFAULT_SHEET_PAPER_SIZE: TemplatePaperSize = 'a3';
const DEFAULT_SHEET_ORIENTATION: TemplatePageOrientation = 'landscape';
const DEFAULT_DETAIL_BLOCK_HEIGHT_MM = 24;
const DEFAULT_TITLE_BLOCK_HEIGHT_MM = 46;
const DEFAULT_OBJECT_GAP_MM = 5;

export function buildDefaultDraftingScheduleSheetBaseDefinition(
  sheetDefinition: DraftingScheduleSheetDefinition | null = null,
): SharedSheetDefinition {
  const paperSize = (sheetDefinition?.pageSize ?? DEFAULT_SHEET_PAPER_SIZE) as TemplatePaperSize;
  const orientation = (sheetDefinition?.orientation ??
    DEFAULT_SHEET_ORIENTATION) as TemplatePageOrientation;
  const safeArea = getTemplateSafeArea(paperSize, orientation);
  const titleY = safeArea.y + safeArea.height - DEFAULT_TITLE_BLOCK_HEIGHT_MM;
  const tableY = safeArea.y + DEFAULT_DETAIL_BLOCK_HEIGHT_MM + DEFAULT_OBJECT_GAP_MM;
  const tableHeight = Math.max(80, titleY - tableY - DEFAULT_OBJECT_GAP_MM);
  const title = sheetDefinition?.title ?? sheetDefinition?.name ?? 'Drafting Schedule Sheet';
  const subtitle = sheetDefinition?.subtitle ?? 'Schedule Sheet';
  const objects: SharedSheetBlockDefinition[] = [
    {
      checkedBy: sheetDefinition?.projectMetadata?.checkedBy ?? '',
      generatedAtLabel: '',
      height: DEFAULT_TITLE_BLOCK_HEIGHT_MM,
      id: 'drafting-schedule-title-block',
      lineStyle: createDefaultGenericTemplateLineStyle(),
      locked: true,
      name: 'Title Block',
      order: 10,
      preparedBy: sheetDefinition?.projectMetadata?.preparedBy ?? '',
      projectAddress: sheetDefinition?.projectMetadata?.projectAddress,
      projectCode: sheetDefinition?.projectMetadata?.projectCode,
      projectName: sheetDefinition?.projectMetadata?.projectName,
      revision: sheetDefinition?.revisionLabel ?? 'A',
      scaleLabel: 'NTS',
      sheetNumber: 'D-SCH-001',
      subtitle,
      title,
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

  return {
    chromeStyle: createDefaultGenericTemplateChromeStyleForDocument({
      orientation,
      paperSize,
      presetId: 'as1100_inspired',
    }),
    createdAt: '2026-04-22T00:00:00.000Z',
    id: sheetDefinition?.id ?? 'drafting-schedule-default-sheet',
    kind: 'shared_sheet',
    name: title,
    objects,
    orientation,
    paperSize,
    presetId: 'as1100_inspired',
    source: 'built_in_template_definition',
    updatedAt: '2026-04-22T00:00:00.000Z',
  };
}

export function resolveDraftingScheduleRegion(definition: SharedSheetDefinition) {
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

export function buildSharedSheetBaseContentFromDefinition(
  definition: SharedSheetDefinition,
): Record<string, SharedSheetBlockContent | undefined> {
  return Object.fromEntries(
    definition.objects.map((object) => {
      switch (object.type) {
        case 'titleBlock':
          return [
            object.id,
            {
              checkedBy: object.checkedBy,
              generatedAtLabel: object.generatedAtLabel,
              preparedBy: object.preparedBy,
              projectAddress: object.projectAddress,
              projectCode: object.projectCode,
              projectName: object.projectName,
              revision: object.revision,
              scaleLabel: object.scaleLabel,
              sheetNumber: object.sheetNumber,
              sheetTitle: object.title,
              subtitle: object.subtitle,
              type: 'titleBlock',
            } satisfies SharedSheetBlockContent,
          ];
        case 'detailsBlock':
          return [
            object.id,
            {
              rows: object.rows,
              title: object.title,
              type: 'detailsBlock',
            } satisfies SharedSheetBlockContent,
          ];
        case 'textBlock':
          return [
            object.id,
            {
              body: object.body,
              subtitle: object.subtitle,
              title: object.title,
              type: 'textBlock',
            } satisfies SharedSheetBlockContent,
          ];
        default:
          return [object.id, undefined];
      }
    }),
  );
}

export function buildDraftingScheduleSafeAreaSnapshot(definition: SharedSheetDefinition) {
  const safeArea = getTemplateSafeArea(definition.paperSize, definition.orientation);

  return toTemplateRectSnapshot(safeArea);
}

export function toTemplateRectSnapshot(rect: TemplateRectMm) {
  return {
    height: rect.height,
    width: rect.width,
    x: rect.x,
    y: rect.y,
  };
}
