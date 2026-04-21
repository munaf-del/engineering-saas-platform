import {
  createTemplateDocumentId,
  createTemplateObjectId,
  type TemplateDocument,
  type TemplateObjectBase,
} from './template-document';
import {
  asRecord,
  clampMm,
  clampTemplateRect,
  normalizeNumber,
  remapTemplateRectToSafeArea,
  resolveTemplateObjectInteraction,
  sortTemplateObjectsByOrder,
} from './template-geometry';
import {
  getTemplateSafeArea,
  getTemplatePageLayout,
  type TemplatePageOrientation,
  type TemplatePaperSize,
  type TemplatePresetId,
} from './template-preset';
import {
  getAs1100FormatLineThicknessSpec,
  getAs1100TitleBlockSpec,
} from '../presets/as1100-101/as1100-spec';

export type GenericTemplateObjectType =
  | 'titleBlock'
  | 'textBlock'
  | 'detailsBlock'
  | 'imageFrame'
  | 'mapFrame';

export type GenericTemplateImageFitMode = 'contain' | 'cover';
export type GenericTemplateMapFitMode = 'fit' | 'fill';

export type GenericTemplateFontFamily =
  | 'technical_mono'
  | 'technical_sans'
  | 'serif'
  | 'condensed_sans';

export type GenericTemplateTypographyRoleStyle = {
  fontFamily: GenericTemplateFontFamily;
  fontSizePx: number;
  fontWeight: number;
  letterSpacingEm: number;
};

export type GenericTemplateTypography = {
  body: GenericTemplateTypographyRoleStyle;
  label: GenericTemplateTypographyRoleStyle;
  title: GenericTemplateTypographyRoleStyle;
};

export type GenericTemplateLineStyle = {
  color: string;
  visible: boolean;
  widthPx: number;
};

export type GenericTemplateChromeStyle = {
  color: string;
  visible: boolean;
  widthPx: number;
};

export type GenericTemplateDetailRow = {
  id: string;
  label: string;
  value: string;
};

export type GenericTemplateObject = TemplateObjectBase<GenericTemplateObjectType> & {
  body?: string;
  caption?: string;
  checkedBy?: string;
  fitMode?: GenericTemplateImageFitMode;
  generatedAtLabel?: string;
  imageUrl?: string;
  lineStyle?: GenericTemplateLineStyle;
  mapFitMode?: GenericTemplateMapFitMode;
  preparedBy?: string;
  projectAddress?: string;
  projectCode?: string;
  projectName?: string;
  revision?: string;
  rows?: GenericTemplateDetailRow[];
  scaleLabel?: string;
  sheetNumber?: string;
  subtitle?: string;
  title?: string;
  typography?: GenericTemplateTypography;
};

export type GenericTemplateDocument = TemplateDocument<GenericTemplateObject> & {
  chromeStyle: GenericTemplateChromeStyle;
  createdAt: string;
  kind: 'generic';
  orientation: TemplatePageOrientation;
  paperSize: TemplatePaperSize;
  presetId: TemplatePresetId;
};

type GenericTemplateObjectDefinition = {
  defaultOrder: number;
  label: string;
  maxSizeRatio: {
    height: number;
    width: number;
  };
  minSizeMm: {
    height: number;
    width: number;
  };
};

const GENERIC_TEMPLATE_FONT_FAMILIES = [
  'technical_mono',
  'technical_sans',
  'serif',
  'condensed_sans',
] as const satisfies GenericTemplateFontFamily[];

const GENERIC_TEMPLATE_FONT_WEIGHTS = [400, 500, 600, 700] as const;

export const GENERIC_TEMPLATE_FONT_FAMILY_OPTIONS: Array<{
  description: string;
  label: string;
  value: GenericTemplateFontFamily;
}> = [
  {
    value: 'technical_mono',
    label: 'Technical Mono',
    description: 'Monospace look for drafting-style labels and metadata.',
  },
  {
    value: 'technical_sans',
    label: 'Technical Sans',
    description: 'Clean sans-serif text for general title-block content.',
  },
  {
    value: 'serif',
    label: 'Serif',
    description: 'Traditional document styling for formal sheets.',
  },
  {
    value: 'condensed_sans',
    label: 'Condensed Sans',
    description: 'Tighter headings when the title block needs denser text.',
  },
];

export const GENERIC_TEMPLATE_FONT_WEIGHT_OPTIONS: Array<{
  label: string;
  value: number;
}> = [
  { value: 400, label: 'Regular (400)' },
  { value: 500, label: 'Medium (500)' },
  { value: 600, label: 'Semibold (600)' },
  { value: 700, label: 'Bold (700)' },
];

export const DEFAULT_GENERIC_TEMPLATE_LINE_STYLE = {
  color: '#0f172a',
  visible: true,
  widthPx: 2,
} satisfies GenericTemplateLineStyle;

export const DEFAULT_GENERIC_TEMPLATE_CHROME_STYLE = {
  color: '#0f172a',
  visible: true,
  widthPx: 2,
} satisfies GenericTemplateChromeStyle;

export const DEFAULT_GENERIC_TEMPLATE_TITLE_BLOCK_TYPOGRAPHY = {
  body: {
    fontFamily: 'technical_sans',
    fontSizePx: 11,
    fontWeight: 500,
    letterSpacingEm: 0.02,
  },
  label: {
    fontFamily: 'technical_mono',
    fontSizePx: 9,
    fontWeight: 600,
    letterSpacingEm: 0.14,
  },
  title: {
    fontFamily: 'technical_sans',
    fontSizePx: 13,
    fontWeight: 600,
    letterSpacingEm: 0.02,
  },
} satisfies GenericTemplateTypography;

const GENERIC_TEMPLATE_OBJECT_DEFINITIONS: Record<
  GenericTemplateObjectType,
  GenericTemplateObjectDefinition
> = {
  titleBlock: {
    defaultOrder: 10,
    label: 'Title Block',
    maxSizeRatio: { width: 1, height: 0.42 },
    minSizeMm: { width: 80, height: 35 },
  },
  textBlock: {
    defaultOrder: 20,
    label: 'Text Block',
    maxSizeRatio: { width: 0.72, height: 0.4 },
    minSizeMm: { width: 55, height: 26 },
  },
  detailsBlock: {
    defaultOrder: 30,
    label: 'Details Block',
    maxSizeRatio: { width: 0.5, height: 0.46 },
    minSizeMm: { width: 55, height: 30 },
  },
  imageFrame: {
    defaultOrder: 40,
    label: 'Image Frame',
    maxSizeRatio: { width: 1, height: 1 },
    minSizeMm: { width: 80, height: 60 },
  },
  mapFrame: {
    defaultOrder: 45,
    label: 'Map Frame',
    maxSizeRatio: { width: 1, height: 1 },
    minSizeMm: { width: 90, height: 70 },
  },
};

const GENERIC_TEMPLATE_OBJECT_TYPES = Object.keys(
  GENERIC_TEMPLATE_OBJECT_DEFINITIONS,
) as GenericTemplateObjectType[];

export function createDefaultGenericTemplateLineStyle(
  overrides: Partial<GenericTemplateLineStyle> = {},
): GenericTemplateLineStyle {
  return {
    ...DEFAULT_GENERIC_TEMPLATE_LINE_STYLE,
    ...overrides,
  };
}

export function createDefaultGenericTemplateChromeStyle(
  overrides: Partial<GenericTemplateChromeStyle> = {},
): GenericTemplateChromeStyle {
  return {
    ...DEFAULT_GENERIC_TEMPLATE_CHROME_STYLE,
    ...overrides,
  };
}

export function createDefaultGenericTemplateTypography(
  overrides: Partial<GenericTemplateTypography> = {},
): GenericTemplateTypography {
  return {
    body: {
      ...DEFAULT_GENERIC_TEMPLATE_TITLE_BLOCK_TYPOGRAPHY.body,
      ...overrides.body,
    },
    label: {
      ...DEFAULT_GENERIC_TEMPLATE_TITLE_BLOCK_TYPOGRAPHY.label,
      ...overrides.label,
    },
    title: {
      ...DEFAULT_GENERIC_TEMPLATE_TITLE_BLOCK_TYPOGRAPHY.title,
      ...overrides.title,
    },
  };
}

export function getGenericTemplateFontFamilyStack(fontFamily: GenericTemplateFontFamily) {
  switch (fontFamily) {
    case 'technical_mono':
      return '"IBM Plex Mono", "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace';
    case 'technical_sans':
      return '"IBM Plex Sans", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
    case 'serif':
      return '"Source Serif 4", Georgia, "Times New Roman", serif';
    case 'condensed_sans':
      return '"Arial Narrow", "Franklin Gothic Medium", "Helvetica Neue", Arial, sans-serif';
    default:
      return '"IBM Plex Sans", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
  }
}

export function createGenericTemplateDetailRows(
  rows: Array<Pick<GenericTemplateDetailRow, 'label' | 'value'>> = [
    { label: 'Document', value: 'Reusable sheet template' },
    { label: 'Revision', value: 'A' },
    { label: 'Status', value: 'Draft' },
  ],
) {
  return rows.map((row, index) => ({
    id: `detail-row-${index + 1}-${Math.random().toString(36).slice(2, 8)}`,
    label: row.label,
    value: row.value,
  }));
}

export function createDefaultGenericTemplateObjects(args: {
  orientation: TemplatePageOrientation;
  paperSize: TemplatePaperSize;
  presetId: TemplatePresetId;
}) {
  const safeArea = getTemplateSafeArea(args.paperSize, args.orientation);
  const gap = clampMm(Math.min(safeArea.width, safeArea.height) * 0.025, 4, 12);
  const asTitleBlock =
    args.presetId === 'as1100_inspired'
      ? getAs1100TitleBlockSpec(args.paperSize, args.orientation)
      : null;
  const includeAdditionalBlocksArea = args.presetId === 'as1100_inspired' && args.paperSize !== 'a4';
  const titleBlockHeight = clampMm(asTitleBlock?.totalHeightMm ?? 46, 35, 110);
  const titleBlockWidth = clampMm(
    includeAdditionalBlocksArea ? safeArea.width : (asTitleBlock?.totalWidthMm ?? safeArea.width),
    GENERIC_TEMPLATE_OBJECT_DEFINITIONS.titleBlock.minSizeMm.width,
    safeArea.width,
  );
  const titleBlockY = safeArea.y + safeArea.height - titleBlockHeight;
  const topBandHeight = clampMm((safeArea.height - titleBlockHeight - gap) * 0.26, 28, 52);
  const textWidth = clampMm(safeArea.width * 0.58, 60, safeArea.width * 0.72);
  const detailsWidth = Math.max(
    GENERIC_TEMPLATE_OBJECT_DEFINITIONS.detailsBlock.minSizeMm.width,
    safeArea.width - textWidth - gap,
  );
  const imageY = safeArea.y + topBandHeight + gap;
  const imageHeight = Math.max(
    GENERIC_TEMPLATE_OBJECT_DEFINITIONS.imageFrame.minSizeMm.height,
    titleBlockY - imageY - gap,
  );
  const as1100BlankDefaults = args.presetId === 'as1100_inspired';

  const defaultObjects: GenericTemplateObject[] = [
    {
      body: as1100BlankDefaults ? '' : 'Add reusable notes, assumptions, or drawing instructions here.',
      height: topBandHeight,
      id: createTemplateObjectId('generic-object'),
      lineStyle: createDefaultGenericTemplateLineStyle(),
      locked: false,
      name: 'Notes Block',
      order: GENERIC_TEMPLATE_OBJECT_DEFINITIONS.textBlock.defaultOrder,
      title: as1100BlankDefaults ? '' : 'Notes',
      type: 'textBlock',
      visible: true,
      width: textWidth,
      x: safeArea.x,
      y: safeArea.y,
    },
    {
      height: topBandHeight,
      id: createTemplateObjectId('generic-object'),
      lineStyle: createDefaultGenericTemplateLineStyle(),
      locked: false,
      name: 'Details Block',
      order: GENERIC_TEMPLATE_OBJECT_DEFINITIONS.detailsBlock.defaultOrder,
      rows: as1100BlankDefaults
        ? createGenericTemplateDetailRows([
            { label: '', value: '' },
            { label: '', value: '' },
            { label: '', value: '' },
          ])
        : createGenericTemplateDetailRows(),
      title: as1100BlankDefaults ? '' : 'Document Details',
      type: 'detailsBlock',
      visible: true,
      width: detailsWidth,
      x: safeArea.x + textWidth + gap,
      y: safeArea.y,
    },
    {
      caption: as1100BlankDefaults ? '' : 'Optional reference image or diagram area',
      fitMode: 'contain',
      height: imageHeight,
      id: createTemplateObjectId('generic-object'),
      imageUrl: '',
      lineStyle: createDefaultGenericTemplateLineStyle(),
      locked: false,
      name: 'Image Frame',
      order: GENERIC_TEMPLATE_OBJECT_DEFINITIONS.imageFrame.defaultOrder,
      title: as1100BlankDefaults ? '' : 'Reference Image',
      type: 'imageFrame',
      visible: true,
      width: safeArea.width,
      x: safeArea.x,
      y: imageY,
    },
    {
      height: titleBlockHeight,
      id: createTemplateObjectId('generic-object'),
      lineStyle: createDefaultGenericTemplateLineStyle(),
      locked: false,
      name: 'Title Block',
      order: GENERIC_TEMPLATE_OBJECT_DEFINITIONS.titleBlock.defaultOrder,
      projectCode: as1100BlankDefaults ? '' : 'TMP-001',
      projectName: as1100BlankDefaults ? '' : 'Reusable Template',
      sheetNumber: as1100BlankDefaults ? '' : '001',
      subtitle: as1100BlankDefaults
        ? ''
        : 'Edit this title block for your reports, sketches, or printable sheets.',
      title: as1100BlankDefaults ? '' : 'General Arrangement',
      typography: createDefaultGenericTemplateTypography(),
      type: 'titleBlock',
      visible: true,
      width: titleBlockWidth,
      x: includeAdditionalBlocksArea ? safeArea.x : safeArea.x + safeArea.width - titleBlockWidth,
      y: titleBlockY,
    },
  ];

  return sortTemplateObjectsByOrder(defaultObjects).map((object) =>
    clampGenericTemplateObject(object, args.paperSize, args.orientation),
  );
}

export function applyAs1100TitleBlockGeometry(
  objects: GenericTemplateObject[],
  paperSize: TemplatePaperSize,
  orientation: TemplatePageOrientation,
) {
  const safeArea = getTemplateSafeArea(paperSize, orientation);
  const spec = getAs1100TitleBlockSpec(paperSize, orientation);
  const includeAdditionalBlocksArea = paperSize !== 'a4';
  const titleBlockWidth = clampMm(
    includeAdditionalBlocksArea ? safeArea.width : spec.totalWidthMm,
    GENERIC_TEMPLATE_OBJECT_DEFINITIONS.titleBlock.minSizeMm.width,
    safeArea.width,
  );
  const titleBlockHeight = clampMm(
    spec.totalHeightMm,
    GENERIC_TEMPLATE_OBJECT_DEFINITIONS.titleBlock.minSizeMm.height,
    safeArea.height,
  );
  const titleBlockX = includeAdditionalBlocksArea
    ? safeArea.x
    : safeArea.x + safeArea.width - titleBlockWidth;
  const titleBlockY = safeArea.y + safeArea.height - titleBlockHeight;

  return sortTemplateObjectsByOrder(
    objects.map((object) =>
      clampGenericTemplateObject(
        object.type === 'titleBlock'
          ? {
              ...object,
              height: titleBlockHeight,
              width: titleBlockWidth,
              x: titleBlockX,
              y: titleBlockY,
            }
          : object,
        paperSize,
        orientation,
      ),
    ),
  );
}

export function sanitizeAs1100StarterObjects(objects: GenericTemplateObject[]) {
  return objects.map((object) => {
    if (object.type === 'textBlock') {
      return {
        ...object,
        body:
          object.body === 'Add reusable notes, assumptions, or drawing instructions here.'
            ? ''
            : object.body,
        title: object.title === 'Notes' ? '' : object.title,
      } satisfies GenericTemplateObject;
    }

    if (object.type === 'imageFrame') {
      return {
        ...object,
        caption:
          object.caption === 'Optional reference image or diagram area' ? '' : object.caption,
        title: object.title === 'Reference Image' ? '' : object.title,
      } satisfies GenericTemplateObject;
    }

    if (object.type === 'detailsBlock') {
      const rows = object.rows ?? [];
      const hasOnlyDefaultLabels =
        rows.length > 0 &&
        rows.every((row, index) => {
          const normalizedLabel = row.label.trim().toLowerCase();
          return (
            normalizedLabel === '' ||
            normalizedLabel === ['document', 'revision', 'status'][index]
          );
        });
      const hasOnlyPlaceholderValues =
        rows.length > 0 &&
        rows.every((row) =>
          ['', 'A', 'Draft', 'Reusable sheet template', 'Value'].includes(row.value.trim()),
        );

      return {
        ...object,
        rows: hasOnlyPlaceholderValues && hasOnlyDefaultLabels
          ? rows.map((row) => ({
              ...row,
              label: '',
              value: '',
            }))
          : rows,
        title: object.title === 'Document Details' ? '' : object.title,
      } satisfies GenericTemplateObject;
    }

    if (object.type === 'titleBlock') {
      return {
        ...object,
        projectCode: object.projectCode === 'TMP-001' ? '' : object.projectCode,
        projectName: object.projectName === 'Reusable Template' ? '' : object.projectName,
        sheetNumber: object.sheetNumber === '001' ? '' : object.sheetNumber,
        subtitle:
          object.subtitle === 'Edit this title block for your reports, sketches, or printable sheets.'
            ? ''
            : object.subtitle,
        title: object.title === 'General Arrangement' ? '' : object.title,
      } satisfies GenericTemplateObject;
    }

    return object;
  });
}

export function createDefaultGenericTemplateChromeStyleForDocument(args: {
  orientation: TemplatePageOrientation;
  paperSize: TemplatePaperSize;
  presetId: TemplatePresetId;
}) {
  if (args.presetId !== 'as1100_inspired') {
    return createDefaultGenericTemplateChromeStyle();
  }

  const pageLayout = getTemplatePageLayout(args.paperSize, args.orientation);
  const pxPerMm = pageLayout.widthPx / pageLayout.widthMm;

  return createDefaultGenericTemplateChromeStyle({
    widthPx: getAs1100FormatLineThicknessSpec(args.paperSize).borderLineMm * pxPerMm,
  });
}

export function createGenericTemplateDocument(args: {
  name?: string;
  objects?: GenericTemplateObject[];
  orientation?: TemplatePageOrientation;
  paperSize?: TemplatePaperSize;
  presetId?: TemplatePresetId;
}) {
  const now = new Date().toISOString();
  const orientation = args.orientation ?? 'landscape';
  const paperSize = args.paperSize ?? 'a4';
  const presetId = args.presetId ?? 'system_default';

  return {
    chromeStyle: createDefaultGenericTemplateChromeStyleForDocument({
      orientation,
      paperSize,
      presetId,
    }),
    createdAt: now,
    id: createTemplateDocumentId('generic-template'),
    kind: 'generic',
    name: args.name?.trim() || 'Untitled Template',
    objects:
      args.objects && args.objects.length > 0
        ? normalizeGenericTemplateObjects(args.objects, paperSize, orientation)
        : createDefaultGenericTemplateObjects({
            orientation,
            paperSize,
            presetId,
          }),
    orientation,
    paperSize,
    presetId,
    updatedAt: now,
  } satisfies GenericTemplateDocument;
}

export function duplicateGenericTemplateDocument(template: GenericTemplateDocument) {
  const now = new Date().toISOString();

  return {
    ...template,
    chromeStyle: {
      ...template.chromeStyle,
    },
    createdAt: now,
    id: createTemplateDocumentId('generic-template'),
    name: `${template.name} Copy`,
    objects: template.objects.map((object) => cloneGenericTemplateObject(object)),
    updatedAt: now,
  } satisfies GenericTemplateDocument;
}

export function createGenericTemplateObject(args: {
  existingObjects: GenericTemplateObject[];
  orientation: TemplatePageOrientation;
  paperSize: TemplatePaperSize;
  type: GenericTemplateObjectType;
}) {
  const safeArea = getTemplateSafeArea(args.paperSize, args.orientation);
  const definition = GENERIC_TEMPLATE_OBJECT_DEFINITIONS[args.type];
  const index = args.existingObjects.filter((object) => object.type === args.type).length;
  const cascade = Math.min(18, index * 6);
  const width = clampMm(
    safeArea.width *
      (args.type === 'imageFrame' || args.type === 'mapFrame'
        ? 0.6
        : args.type === 'titleBlock'
          ? 0.7
          : 0.38),
    definition.minSizeMm.width,
    safeArea.width * definition.maxSizeRatio.width,
  );
  const height = clampMm(
    safeArea.height *
      (args.type === 'imageFrame' || args.type === 'mapFrame'
        ? 0.32
        : args.type === 'titleBlock'
          ? 0.18
          : 0.2),
    definition.minSizeMm.height,
    safeArea.height * definition.maxSizeRatio.height,
  );
  const baseX = safeArea.x + clampMm(10 + cascade, 0, Math.max(0, safeArea.width - width));
  const baseY = safeArea.y + clampMm(10 + cascade, 0, Math.max(0, safeArea.height - height));

  const nextObject: GenericTemplateObject =
    args.type === 'titleBlock'
      ? {
          height,
          id: createTemplateObjectId('generic-object'),
          lineStyle: createDefaultGenericTemplateLineStyle(),
          locked: false,
          name: 'Title Block',
          order: definition.defaultOrder + index,
          projectCode: 'TMP-001',
          projectName: 'Reusable Template',
          sheetNumber: `00${index + 1}`,
          subtitle: 'Reusable template subtitle',
          title: 'General Arrangement',
          typography: createDefaultGenericTemplateTypography(),
          type: 'titleBlock',
          visible: true,
          width,
          x: baseX,
          y: baseY,
        }
      : args.type === 'textBlock'
        ? {
            body: 'Add notes, assumptions, or fixed explanatory text here.',
            height,
            id: createTemplateObjectId('generic-object'),
            lineStyle: createDefaultGenericTemplateLineStyle(),
            locked: false,
            name: 'Text Block',
            order: definition.defaultOrder + index,
            title: 'Notes',
            type: 'textBlock',
            visible: true,
            width,
            x: baseX,
            y: baseY,
          }
        : args.type === 'detailsBlock'
          ? {
              height,
              id: createTemplateObjectId('generic-object'),
              lineStyle: createDefaultGenericTemplateLineStyle(),
              locked: false,
              name: 'Details Block',
              order: definition.defaultOrder + index,
              rows: createGenericTemplateDetailRows([
                { label: 'Field', value: 'Value' },
                { label: 'Field', value: 'Value' },
              ]),
              title: 'Details',
              type: 'detailsBlock',
              visible: true,
              width,
              x: baseX,
              y: baseY,
            }
          : args.type === 'imageFrame'
            ? {
                caption: 'Optional image frame',
                fitMode: 'contain',
                height,
                id: createTemplateObjectId('generic-object'),
                imageUrl: '',
                lineStyle: createDefaultGenericTemplateLineStyle(),
                locked: false,
                name: 'Image Frame',
                order: definition.defaultOrder + index,
                title: 'Image',
                type: 'imageFrame',
                visible: true,
                width,
                x: baseX,
                y: baseY,
              }
            : {
                height,
                id: createTemplateObjectId('generic-object'),
                lineStyle: createDefaultGenericTemplateLineStyle(),
                locked: false,
                mapFitMode: 'fit',
                name: 'Map Frame',
                order: definition.defaultOrder + index,
                title: 'Map Frame',
                type: 'mapFrame',
                visible: true,
                width,
                x: baseX,
                y: baseY,
              };

  return clampGenericTemplateObject(nextObject, args.paperSize, args.orientation);
}

export function normalizeGenericTemplateDocument(value: unknown) {
  const record = asRecord(value);
  const orientation = normalizeTemplateOrientation(record.orientation);
  const paperSize = normalizeTemplatePaperSize(record.paperSize);
  const presetId = normalizeTemplatePresetId(record.presetId ?? record.mode);
  const normalizedDocument = {
    chromeStyle: normalizeGenericTemplateChromeStyle(record.chromeStyle, {
      orientation,
      paperSize,
      presetId,
    }),
    createdAt: typeof record.createdAt === 'string' ? record.createdAt : new Date().toISOString(),
    id:
      typeof record.id === 'string' && record.id.trim()
        ? record.id
        : createTemplateDocumentId('generic-template'),
    kind: 'generic',
    name:
      typeof record.name === 'string' && record.name.trim()
        ? record.name.trim()
        : 'Untitled Template',
    objects: normalizeGenericTemplateObjects(record.objects, paperSize, orientation),
    orientation,
    paperSize,
    presetId,
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : new Date().toISOString(),
  } satisfies GenericTemplateDocument;

  return normalizedDocument;
}

export function normalizeGenericTemplateObjects(
  value: unknown,
  paperSize: TemplatePaperSize,
  orientation: TemplatePageOrientation,
) {
  const rawObjects = Array.isArray(value) ? value : [];
  const normalizedObjects = rawObjects
    .map((object) => normalizeGenericTemplateObject(object, paperSize, orientation))
    .filter(
      (object, index, objects): object is GenericTemplateObject =>
        object !== null && objects.findIndex((candidate) => candidate?.id === object.id) === index,
    );

  if (normalizedObjects.length === 0) {
    return createDefaultGenericTemplateObjects({
      orientation,
      paperSize,
      presetId: 'system_default',
    });
  }

  return sortTemplateObjectsByOrder(normalizedObjects);
}

export function normalizeGenericTemplateObject(
  value: unknown,
  paperSize: TemplatePaperSize,
  orientation: TemplatePageOrientation,
) {
  const record = asRecord(value);
  const type = normalizeGenericTemplateObjectType(record.type);
  if (!type) {
    return null;
  }

  const definition = GENERIC_TEMPLATE_OBJECT_DEFINITIONS[type];
  const object: GenericTemplateObject = {
    body: type === 'textBlock' && typeof record.body === 'string' ? record.body : undefined,
    caption:
      type === 'imageFrame' && typeof record.caption === 'string' ? record.caption : undefined,
    fitMode: type === 'imageFrame' && record.fitMode === 'cover' ? 'cover' : 'contain',
    height: normalizeNumber(record.height, definition.minSizeMm.height),
    id:
      typeof record.id === 'string' && record.id.trim()
        ? record.id
        : createTemplateObjectId('generic-object'),
    imageUrl:
      type === 'imageFrame' && typeof record.imageUrl === 'string' ? record.imageUrl : undefined,
    lineStyle: normalizeGenericTemplateLineStyle(record.lineStyle),
    locked: typeof record.locked === 'boolean' ? record.locked : false,
    mapFitMode: type === 'mapFrame' && record.mapFitMode === 'fill' ? 'fill' : 'fit',
    name:
      typeof record.name === 'string' && record.name.trim() ? record.name.trim() : definition.label,
    order: normalizeNumber(record.order, definition.defaultOrder),
    preparedBy:
      type === 'titleBlock' && typeof record.preparedBy === 'string'
        ? record.preparedBy
        : undefined,
    checkedBy:
      type === 'titleBlock' && typeof record.checkedBy === 'string'
        ? record.checkedBy
        : undefined,
    generatedAtLabel:
      type === 'titleBlock' && typeof record.generatedAtLabel === 'string'
        ? record.generatedAtLabel
        : undefined,
    projectAddress:
      type === 'titleBlock' && typeof record.projectAddress === 'string'
        ? record.projectAddress
        : undefined,
    projectCode:
      type === 'titleBlock' && typeof record.projectCode === 'string'
        ? record.projectCode
        : undefined,
    projectName:
      type === 'titleBlock' && typeof record.projectName === 'string'
        ? record.projectName
        : undefined,
    revision:
      type === 'titleBlock' && typeof record.revision === 'string'
        ? record.revision
        : undefined,
    rows: type === 'detailsBlock' ? normalizeGenericTemplateDetailRows(record.rows) : undefined,
    scaleLabel:
      type === 'titleBlock' && typeof record.scaleLabel === 'string'
        ? record.scaleLabel
        : undefined,
    sheetNumber:
      type === 'titleBlock' && typeof record.sheetNumber === 'string'
        ? record.sheetNumber
        : undefined,
    subtitle:
      (type === 'titleBlock' || type === 'textBlock') && typeof record.subtitle === 'string'
        ? record.subtitle
        : undefined,
    title:
      typeof record.title === 'string'
        ? record.title
        : type === 'titleBlock'
          ? 'General Arrangement'
          : type === 'detailsBlock'
            ? 'Details'
            : type === 'textBlock'
              ? 'Notes'
              : type === 'imageFrame'
                ? 'Image'
                : 'Map Frame',
    typography:
      type === 'titleBlock' ? normalizeGenericTemplateTypography(record.typography) : undefined,
    type,
    visible: typeof record.visible === 'boolean' ? record.visible : true,
    width: normalizeNumber(record.width, definition.minSizeMm.width),
    x: normalizeNumber(record.x, 0),
    y: normalizeNumber(record.y, 0),
  };

  return clampGenericTemplateObject(object, paperSize, orientation);
}

export function getGenericTemplateObjectLabel(type: GenericTemplateObjectType) {
  return GENERIC_TEMPLATE_OBJECT_DEFINITIONS[type].label;
}

export function getGenericTemplateObjectSizeConstraint(
  objectType: GenericTemplateObjectType,
  paperSize: TemplatePaperSize,
  orientation: TemplatePageOrientation,
) {
  const safeArea = getTemplateSafeArea(paperSize, orientation);
  const definition = GENERIC_TEMPLATE_OBJECT_DEFINITIONS[objectType];

  return {
    maxHeight: clampMm(
      safeArea.height * definition.maxSizeRatio.height,
      definition.minSizeMm.height,
      safeArea.height,
    ),
    maxWidth: clampMm(
      safeArea.width * definition.maxSizeRatio.width,
      definition.minSizeMm.width,
      safeArea.width,
    ),
    minHeight: definition.minSizeMm.height,
    minWidth: definition.minSizeMm.width,
  };
}

export function clampGenericTemplateObject(
  object: GenericTemplateObject,
  paperSize: TemplatePaperSize,
  orientation: TemplatePageOrientation,
) {
  const safeArea = getTemplateSafeArea(paperSize, orientation);
  const { height, width, x, y } = clampTemplateRect(
    object,
    safeArea,
    getGenericTemplateObjectSizeConstraint(object.type, paperSize, orientation),
  );

  return {
    ...object,
    height,
    order: Number.isFinite(object.order)
      ? object.order
      : GENERIC_TEMPLATE_OBJECT_DEFINITIONS[object.type].defaultOrder,
    width,
    x,
    y,
  };
}

export function resolveGenericTemplateObjectInteraction(args: {
  deltaX: number;
  deltaY: number;
  mode: 'move' | 'nw' | 'ne' | 'sw' | 'se';
  object: GenericTemplateObject;
  orientation: TemplatePageOrientation;
  paperSize: TemplatePaperSize;
}) {
  return {
    ...args.object,
    ...resolveTemplateObjectInteraction({
      constraint: getGenericTemplateObjectSizeConstraint(
        args.object.type,
        args.paperSize,
        args.orientation,
      ),
      deltaX: args.deltaX,
      deltaY: args.deltaY,
      mode: args.mode,
      rect: args.object,
      safeArea: getTemplateSafeArea(args.paperSize, args.orientation),
    }),
  };
}

export function remapGenericTemplateObjectsToPage(
  objects: GenericTemplateObject[],
  fromPaperSize: TemplatePaperSize,
  fromOrientation: TemplatePageOrientation,
  toPaperSize: TemplatePaperSize,
  toOrientation: TemplatePageOrientation,
) {
  const fromSafeArea = getTemplateSafeArea(fromPaperSize, fromOrientation);
  const toSafeArea = getTemplateSafeArea(toPaperSize, toOrientation);

  return sortTemplateObjectsByOrder(
    objects.map((object) => ({
      ...object,
      ...remapTemplateRectToSafeArea({
        constraint: getGenericTemplateObjectSizeConstraint(object.type, toPaperSize, toOrientation),
        fromSafeArea,
        rect: object,
        toSafeArea,
      }),
    })),
  );
}

function cloneGenericTemplateObject(object: GenericTemplateObject): GenericTemplateObject {
  return {
    ...object,
    id: createTemplateObjectId('generic-object'),
    lineStyle: object.lineStyle ? { ...object.lineStyle } : undefined,
    rows: object.rows?.map((row) => ({
      ...row,
      id: createTemplateObjectId('detail-row'),
    })),
    typography: object.typography
      ? {
          body: { ...object.typography.body },
          label: { ...object.typography.label },
          title: { ...object.typography.title },
        }
      : undefined,
  };
}

function normalizeGenericTemplateObjectType(value: unknown): GenericTemplateObjectType | null {
  return GENERIC_TEMPLATE_OBJECT_TYPES.includes(value as GenericTemplateObjectType)
    ? (value as GenericTemplateObjectType)
    : null;
}

function normalizeTemplatePaperSize(value: unknown): TemplatePaperSize {
  return ['a4', 'a3', 'a2', 'a1', 'a0'].includes(value as string)
    ? (value as TemplatePaperSize)
    : 'a4';
}

function normalizeTemplateOrientation(value: unknown): TemplatePageOrientation {
  return value === 'portrait' || value === 'landscape'
    ? (value as TemplatePageOrientation)
    : 'landscape';
}

function normalizeTemplatePresetId(value: unknown): TemplatePresetId {
  return value === 'system_default' || value === 'as1100_inspired' || value === 'custom'
    ? (value as TemplatePresetId)
    : 'system_default';
}

function normalizeGenericTemplateTypography(value: unknown) {
  const record = asRecord(value);

  return {
    body: normalizeGenericTemplateTypographyRole(
      record.body,
      DEFAULT_GENERIC_TEMPLATE_TITLE_BLOCK_TYPOGRAPHY.body,
    ),
    label: normalizeGenericTemplateTypographyRole(
      record.label,
      DEFAULT_GENERIC_TEMPLATE_TITLE_BLOCK_TYPOGRAPHY.label,
    ),
    title: normalizeGenericTemplateTypographyRole(
      record.title,
      DEFAULT_GENERIC_TEMPLATE_TITLE_BLOCK_TYPOGRAPHY.title,
    ),
  } satisfies GenericTemplateTypography;
}

function normalizeGenericTemplateTypographyRole(
  value: unknown,
  fallback: GenericTemplateTypographyRoleStyle,
) {
  const record = asRecord(value);

  return {
    fontFamily: normalizeGenericTemplateFontFamily(record.fontFamily, fallback.fontFamily),
    fontSizePx: clampNumber(normalizeNumber(record.fontSizePx, fallback.fontSizePx), 8, 26),
    fontWeight: normalizeGenericTemplateFontWeight(record.fontWeight, fallback.fontWeight),
    letterSpacingEm: clampNumber(
      normalizeNumber(record.letterSpacingEm, fallback.letterSpacingEm),
      -0.02,
      0.3,
    ),
  } satisfies GenericTemplateTypographyRoleStyle;
}

function normalizeGenericTemplateLineStyle(value: unknown) {
  const record = asRecord(value);

  return {
    color: normalizeGenericTemplateColor(record.color, DEFAULT_GENERIC_TEMPLATE_LINE_STYLE.color),
    visible:
      typeof record.visible === 'boolean'
        ? record.visible
        : DEFAULT_GENERIC_TEMPLATE_LINE_STYLE.visible,
    widthPx: clampNumber(
      normalizeNumber(record.widthPx, DEFAULT_GENERIC_TEMPLATE_LINE_STYLE.widthPx),
      0.5,
      6,
    ),
  } satisfies GenericTemplateLineStyle;
}

function normalizeGenericTemplateChromeStyle(
  value: unknown,
  args: {
    orientation: TemplatePageOrientation;
    paperSize: TemplatePaperSize;
    presetId: TemplatePresetId;
  },
) {
  const record = asRecord(value);
  const fallback = createDefaultGenericTemplateChromeStyleForDocument(args);

  return {
    color: normalizeGenericTemplateColor(record.color, fallback.color),
    visible:
      typeof record.visible === 'boolean' ? record.visible : fallback.visible,
    widthPx: clampNumber(normalizeNumber(record.widthPx, fallback.widthPx), 0.5, 6),
  } satisfies GenericTemplateChromeStyle;
}

function normalizeGenericTemplateFontFamily(
  value: unknown,
  fallback: GenericTemplateFontFamily,
): GenericTemplateFontFamily {
  return GENERIC_TEMPLATE_FONT_FAMILIES.includes(value as GenericTemplateFontFamily)
    ? (value as GenericTemplateFontFamily)
    : fallback;
}

function normalizeGenericTemplateFontWeight(value: unknown, fallback: number) {
  const parsedWeight =
    typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : fallback;

  return GENERIC_TEMPLATE_FONT_WEIGHTS.includes(
    parsedWeight as (typeof GENERIC_TEMPLATE_FONT_WEIGHTS)[number],
  )
    ? parsedWeight
    : fallback;
}

function normalizeGenericTemplateColor(value: unknown, fallback: string) {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value.trim())
    ? value.trim().toLowerCase()
    : fallback;
}

function normalizeGenericTemplateDetailRows(value: unknown) {
  const rows = Array.isArray(value) ? value : [];
  const normalizedRows = rows
    .map((row, index) => {
      const record = asRecord(row);
      const label =
        typeof record.label === 'string' ? record.label.trim() : `Field ${index + 1}`;
      const valueText =
        typeof record.value === 'string'
          ? record.value.trim()
          : typeof record.value === 'number'
            ? String(record.value)
            : '';

      return {
        id:
          typeof record.id === 'string' && record.id.trim()
            ? record.id
            : createTemplateObjectId('detail-row'),
        label,
        value: valueText,
      } satisfies GenericTemplateDetailRow;
    })
    .filter(
      (row, index, allRows) => allRows.findIndex((candidate) => candidate.id === row.id) === index,
    );

  return normalizedRows.length > 0 ? normalizedRows : createGenericTemplateDetailRows();
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
