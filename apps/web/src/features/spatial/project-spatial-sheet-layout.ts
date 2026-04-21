'use client';

import {
  createTemplateDocumentId,
  createTemplateObjectId,
  type TemplateSafeArea,
} from '@/features/templates/core/template-document';
import {
  asRecord,
  clampInteger,
  clampMm,
  clampTemplateRect,
  normalizeNumber,
  remapTemplateRectToSafeArea,
  resizeTemplateRectWithAnchors,
  resolveTemplateObjectInteraction,
  sortTemplateObjectsByOrder,
  type TemplateInteractionMode,
} from '@/features/templates/core/template-geometry';
import { getTemplateSafeArea } from '@/features/templates/core/template-preset';
import {
  ensureRequiredTemplateObjects,
  indexTemplateObjectDefinitions,
  type TemplateObjectDefinition,
} from '@/features/templates/bindings/template-renderer-registry';
import {
  getProjectSpatialSheetPageLayout,
  type ProjectSpatialPaperSize,
  type ProjectSpatialSheetMode,
  type ProjectSpatialSheetOrientation,
  type ProjectSpatialTitleBlockPosition,
} from './project-spatial-sheet-config';
import {
  getProjectSpatialAs1100FrameSpec,
  getProjectSpatialAs1100TitleBlockSpec,
} from './project-spatial-sheet-standard';

export type ProjectSpatialSheetObjectType =
  | 'mapFrame'
  | 'titleBlock'
  | 'legend'
  | 'notes'
  | 'sheetContext'
  | 'northArrow'
  | 'scaleBar';

export type ProjectSpatialSheetMapFitMode = 'fill' | 'fit';
export type ProjectSpatialSheetObjectDensity = 'compact' | 'normal';
export type ProjectSpatialSheetContextRowKey =
  | 'basemap'
  | 'generated'
  | 'geoQuery'
  | 'geology'
  | 'layout'
  | 'paper'
  | 'purpose';
export type ProjectSpatialSheetContextRowsVisibility = Record<
  ProjectSpatialSheetContextRowKey,
  boolean
>;

export type ProjectSpatialSheetObject = {
  contentScale?: number;
  density?: ProjectSpatialSheetObjectDensity;
  height: number;
  id: string;
  legendColumns?: number;
  legendShowMapContext?: boolean;
  linkedSavedViewId?: string | null;
  locked: boolean;
  mapFitMode?: ProjectSpatialSheetMapFitMode;
  name: string;
  order: number;
  paddingScale?: number;
  scaleBarShowLabel?: boolean;
  sheetContextRowsVisibility?: ProjectSpatialSheetContextRowsVisibility;
  symbolScale?: number;
  type: ProjectSpatialSheetObjectType;
  visible: boolean;
  width: number;
  x: number;
  y: number;
};

export type ProjectSpatialSheetTemplate = {
  createdAt: string;
  id: string;
  mode: ProjectSpatialSheetMode;
  name: string;
  objects: ProjectSpatialSheetObject[];
  orientation: ProjectSpatialSheetOrientation;
  paperSize: ProjectSpatialPaperSize;
  updatedAt: string;
};

export type ProjectSpatialSheetInteractionMode = 'move' | 'nw' | 'ne' | 'sw' | 'se';

export type ProjectSpatialSheetContentMetrics = {
  addressLineCount: number;
  addressMaxLineLength: number;
  contextMaxValueLength: number;
  contextRowCount: number;
  legendEntryCount: number;
  legendMaxLabelLength: number;
  notesLineCount: number;
  notesMaxLineLength: number;
  subtitleLineCount: number;
  subtitleMaxLineLength: number;
  titleLineCount: number;
  titleMaxLineLength: number;
};

const PROJECT_SPATIAL_OBJECT_DEFINITIONS = [
  {
    defaultOrder: 10,
    label: 'Map Frame',
    maxSizeRatio: { width: 1, height: 1 },
    minSizeMm: { width: 70, height: 55 },
    required: true,
    singleton: true,
    type: 'mapFrame',
  },
  {
    defaultOrder: 40,
    label: 'Title Block',
    maxSizeRatio: { width: 0.82, height: 0.42 },
    minSizeMm: { width: 55, height: 28 },
    required: true,
    singleton: true,
    type: 'titleBlock',
  },
  {
    defaultOrder: 30,
    label: 'Legend',
    maxSizeRatio: { width: 0.34, height: 0.42 },
    minSizeMm: { width: 35, height: 24 },
    required: true,
    singleton: true,
    type: 'legend',
  },
  {
    defaultOrder: 31,
    label: 'Notes',
    maxSizeRatio: { width: 0.44, height: 0.34 },
    minSizeMm: { width: 40, height: 24 },
    required: true,
    singleton: true,
    type: 'notes',
  },
  {
    defaultOrder: 32,
    label: 'Sheet Context',
    maxSizeRatio: { width: 0.34, height: 0.32 },
    minSizeMm: { width: 34, height: 24 },
    required: true,
    singleton: true,
    type: 'sheetContext',
  },
  {
    defaultOrder: 50,
    label: 'North Arrow',
    maxSizeRatio: { width: 0.12, height: 0.18 },
    minSizeMm: { width: 12, height: 18 },
    required: true,
    singleton: true,
    type: 'northArrow',
  },
  {
    defaultOrder: 51,
    label: 'Scale Bar',
    maxSizeRatio: { width: 0.28, height: 0.1 },
    minSizeMm: { width: 28, height: 10 },
    required: true,
    singleton: true,
    type: 'scaleBar',
  },
] as const satisfies ReadonlyArray<TemplateObjectDefinition<ProjectSpatialSheetObjectType>>;

const PROJECT_SPATIAL_OBJECT_DEFINITION_BY_TYPE = indexTemplateObjectDefinitions(
  PROJECT_SPATIAL_OBJECT_DEFINITIONS,
);

const OBJECT_TYPES = PROJECT_SPATIAL_OBJECT_DEFINITIONS.map((definition) => definition.type);

const DEFAULT_OBJECT_ORDER = Object.fromEntries(
  PROJECT_SPATIAL_OBJECT_DEFINITIONS.map((definition) => [definition.type, definition.defaultOrder]),
) as Record<ProjectSpatialSheetObjectType, number>;

const OBJECT_MIN_SIZE = Object.fromEntries(
  PROJECT_SPATIAL_OBJECT_DEFINITIONS.map((definition) => [definition.type, definition.minSizeMm]),
) as Record<ProjectSpatialSheetObjectType, { height: number; width: number }>;

const OBJECT_MAX_SIZE_RATIO = Object.fromEntries(
  PROJECT_SPATIAL_OBJECT_DEFINITIONS.map((definition) => [definition.type, definition.maxSizeRatio]),
) as Record<ProjectSpatialSheetObjectType, { height: number; width: number }>;

const AUTO_SIZE_FALLBACK_METRICS: ProjectSpatialSheetContentMetrics = {
  addressLineCount: 3,
  addressMaxLineLength: 26,
  contextMaxValueLength: 18,
  contextRowCount: 7,
  legendEntryCount: 6,
  legendMaxLabelLength: 20,
  notesLineCount: 3,
  notesMaxLineLength: 28,
  subtitleLineCount: 1,
  subtitleMaxLineLength: 24,
  titleLineCount: 1,
  titleMaxLineLength: 26,
};

const DEFAULT_SHEET_CONTEXT_ROWS_VISIBILITY: ProjectSpatialSheetContextRowsVisibility = {
  basemap: true,
  generated: true,
  geoQuery: true,
  geology: true,
  layout: true,
  paper: true,
  purpose: true,
};

type ProjectSpatialSheetSafeArea = TemplateSafeArea;

export function createProjectSpatialSheetObjectId() {
  return createTemplateObjectId('sheet-object');
}

export function createProjectSpatialSheetTemplateId() {
  return createTemplateDocumentId('sheet-template');
}

export function createDefaultProjectSpatialSheetContextRowsVisibility(): ProjectSpatialSheetContextRowsVisibility {
  return {
    ...DEFAULT_SHEET_CONTEXT_ROWS_VISIBILITY,
  };
}

export function getProjectSpatialSheetObjectLabel(type: ProjectSpatialSheetObjectType) {
  return PROJECT_SPATIAL_OBJECT_DEFINITION_BY_TYPE[type]?.label ?? type;
}

function createDefaultProjectSpatialSheetObjectPresentation(
  type: ProjectSpatialSheetObjectType,
): Pick<
  ProjectSpatialSheetObject,
  | 'contentScale'
  | 'density'
  | 'legendColumns'
  | 'legendShowMapContext'
  | 'mapFitMode'
  | 'paddingScale'
  | 'scaleBarShowLabel'
  | 'sheetContextRowsVisibility'
  | 'symbolScale'
> {
  switch (type) {
    case 'mapFrame':
      return {
        contentScale: 1,
        mapFitMode: 'fit',
      };
    case 'titleBlock':
      return {
        contentScale: 1,
        density: 'normal',
        paddingScale: 1,
      };
    case 'legend':
      return {
        contentScale: 1,
        density: 'normal',
        legendColumns: 1,
        legendShowMapContext: true,
        paddingScale: 1,
        symbolScale: 1,
      };
    case 'notes':
      return {
        contentScale: 1,
        density: 'normal',
        paddingScale: 1,
      };
    case 'sheetContext':
      return {
        contentScale: 1,
        density: 'normal',
        paddingScale: 1,
        sheetContextRowsVisibility: createDefaultProjectSpatialSheetContextRowsVisibility(),
      };
    case 'northArrow':
      return {
        contentScale: 1,
      };
    case 'scaleBar':
      return {
        contentScale: 1,
        scaleBarShowLabel: true,
      };
    default:
      return {
        contentScale: 1,
      };
  }
}

export function createDefaultProjectSpatialSheetObjects({
  assignedSavedViewId = null,
  orientation,
  paperSize,
  showLegend = true,
  showNotes = true,
  showSheetContext = true,
  titleBlockPosition = 'bottom_right',
}: {
  assignedSavedViewId?: string | null;
  orientation: ProjectSpatialSheetOrientation;
  paperSize: ProjectSpatialPaperSize;
  showLegend?: boolean;
  showNotes?: boolean;
  showSheetContext?: boolean;
  titleBlockPosition?: ProjectSpatialTitleBlockPosition;
}): ProjectSpatialSheetObject[] {
  const page = getProjectSpatialSheetPageLayout(paperSize, orientation);
  const safeArea = getProjectSpatialSheetSafeArea(paperSize, orientation);
  const isA3Landscape = paperSize === 'a3' && page.isLandscape;
  const gap = clampMm(Math.min(page.widthMm, page.heightMm) * 0.025, 4, 14);
  const standardFrame = getProjectSpatialAs1100FrameSpec(paperSize, orientation);
  const standardTitleBlock = getProjectSpatialAs1100TitleBlockSpec(paperSize, orientation);
  const useCompactBottomBand =
    titleBlockPosition === 'bottom_full' || !page.isLandscape || paperSize === 'a4';
  const titleBlockHeight = isA3Landscape
    ? clampMm(standardTitleBlock.heightMm * 0.84, 28, 56)
    : clampMm(standardTitleBlock.heightMm, 28, 92);
  const titleBlockWidth = useCompactBottomBand
    ? safeArea.width
    : isA3Landscape
      ? clampMm(standardTitleBlock.widthMm * 0.76, 102, safeArea.width * 0.46)
      : clampMm(standardTitleBlock.widthMm, 58, safeArea.width * 0.72);
  const titleBlockX =
    titleBlockPosition === 'bottom_left' || useCompactBottomBand
      ? safeArea.x
      : safeArea.x + safeArea.width - titleBlockWidth;
  const titleBlockY = safeArea.y + safeArea.height - titleBlockHeight;
  const mapFrameWidth = safeArea.width;
  const supportHeight = isA3Landscape
    ? clampMm(titleBlockHeight * 0.62, 18, 28)
    : clampMm(titleBlockHeight * 0.96, 24, titleBlockHeight);
  const minInlineSupportWidth =
    OBJECT_MIN_SIZE.legend.width + OBJECT_MIN_SIZE.notes.width + OBJECT_MIN_SIZE.sheetContext.width + gap * 2;
  const inlineSupportWidth = useCompactBottomBand ? 0 : safeArea.width - titleBlockWidth - gap;
  const useInlineSupportBand = inlineSupportWidth >= minInlineSupportWidth;
  const supportY = useInlineSupportBand
    ? titleBlockY
    : Math.max(safeArea.y, titleBlockY - supportHeight - gap);
  const supportSpanX = useInlineSupportBand
    ? titleBlockPosition === 'bottom_left'
      ? titleBlockX + titleBlockWidth + gap
      : safeArea.x
    : safeArea.x;
  const supportSpanWidth = useInlineSupportBand
    ? Math.max(0, safeArea.width - titleBlockWidth - gap)
    : safeArea.width;
  const legendWidth = clampMm(
    supportSpanWidth * (isA3Landscape ? 0.12 : page.isLandscape ? 0.16 : 0.22),
    36,
    Math.min(isA3Landscape ? 72 : 84, supportSpanWidth * 0.28),
  );
  const contextWidth = clampMm(
    isA3Landscape ? standardTitleBlock.recordPanelWidthMm * 0.88 : standardTitleBlock.recordPanelWidthMm,
    34,
    Math.min(isA3Landscape ? 82 : 110, supportSpanWidth * (isA3Landscape ? 0.2 : 0.3)),
  );
  const notesWidth = clampMm(
    supportSpanWidth - legendWidth - contextWidth - gap * 2,
    OBJECT_MIN_SIZE.notes.width,
    Math.max(OBJECT_MIN_SIZE.notes.width, supportSpanWidth - gap),
  );
  const legendX =
    titleBlockPosition === 'bottom_left' && useInlineSupportBand
      ? supportSpanX + supportSpanWidth - legendWidth
      : supportSpanX;
  const notesX =
    titleBlockPosition === 'bottom_left' && useInlineSupportBand
      ? supportSpanX + contextWidth + gap
      : supportSpanX + legendWidth + gap;
  const contextX =
    titleBlockPosition === 'bottom_left' && useInlineSupportBand
      ? supportSpanX
      : supportSpanX + supportSpanWidth - contextWidth;
  const mapFrameHeight = clampMm(
    supportY - gap - safeArea.y,
    OBJECT_MIN_SIZE.mapFrame.height,
    safeArea.height,
  );

  const objects: ProjectSpatialSheetObject[] = [
    {
      ...createDefaultProjectSpatialSheetObjectPresentation('mapFrame'),
      height: mapFrameHeight,
      id: createProjectSpatialSheetObjectId(),
      linkedSavedViewId: assignedSavedViewId,
      locked: false,
      name: 'Primary Map Frame',
      order: DEFAULT_OBJECT_ORDER.mapFrame,
      type: 'mapFrame',
      visible: true,
      width: mapFrameWidth,
      x: safeArea.x,
      y: safeArea.y,
    },
    {
      ...createDefaultProjectSpatialSheetObjectPresentation('titleBlock'),
      height: titleBlockHeight,
      id: createProjectSpatialSheetObjectId(),
      locked: false,
      name: 'Title Block',
      order: DEFAULT_OBJECT_ORDER.titleBlock,
      type: 'titleBlock',
      visible: true,
      width: titleBlockWidth,
      x: titleBlockX,
      y: titleBlockY,
    },
    {
      ...createDefaultProjectSpatialSheetObjectPresentation('legend'),
      height: supportHeight,
      id: createProjectSpatialSheetObjectId(),
      locked: false,
      name: 'Legend',
      order: DEFAULT_OBJECT_ORDER.legend,
      type: 'legend',
      visible: showLegend,
      width: legendWidth,
      x: legendX,
      y: supportY,
    },
    {
      ...createDefaultProjectSpatialSheetObjectPresentation('notes'),
      height: supportHeight,
      id: createProjectSpatialSheetObjectId(),
      locked: false,
      name: 'Notes',
      order: DEFAULT_OBJECT_ORDER.notes,
      type: 'notes',
      visible: showNotes,
      width: notesWidth,
      x: notesX,
      y: supportY,
    },
    {
      ...createDefaultProjectSpatialSheetObjectPresentation('sheetContext'),
      height: supportHeight,
      id: createProjectSpatialSheetObjectId(),
      locked: false,
      name: 'Sheet Context',
      order: DEFAULT_OBJECT_ORDER.sheetContext,
      type: 'sheetContext',
      visible: showSheetContext,
      width: contextWidth,
      x: clampMm(contextX, safeArea.x, safeArea.x + safeArea.width - contextWidth),
      y: supportY,
    },
    {
      ...createDefaultProjectSpatialSheetObjectPresentation('northArrow'),
      height: 18,
      id: createProjectSpatialSheetObjectId(),
      locked: false,
      name: 'North Arrow',
      order: DEFAULT_OBJECT_ORDER.northArrow,
      type: 'northArrow',
      visible: true,
      width: 12,
      x: safeArea.x + mapFrameWidth - 18,
      y: safeArea.y + Math.max(6, standardFrame.bandTopMm * 0.3),
    },
    {
      ...createDefaultProjectSpatialSheetObjectPresentation('scaleBar'),
      height: 10,
      id: createProjectSpatialSheetObjectId(),
      locked: false,
      name: 'Scale Bar',
      order: DEFAULT_OBJECT_ORDER.scaleBar,
      type: 'scaleBar',
      visible: true,
      width: clampMm(safeArea.width * 0.12, 28, 60),
      x: safeArea.x + Math.max(6, standardFrame.bandLeftMm * 0.35),
      y: safeArea.y + mapFrameHeight - 14,
    },
  ];

  return normalizeProjectSpatialSheetObjects(objects, paperSize, orientation);
}

export function normalizeProjectSpatialSheetObject(
  value: unknown,
  paperSize: ProjectSpatialPaperSize,
  orientation: ProjectSpatialSheetOrientation,
  fallbackType: ProjectSpatialSheetObjectType = 'notes',
) {
  const record = asRecord(value);
  const type = OBJECT_TYPES.includes(record.type as ProjectSpatialSheetObjectType)
    ? (record.type as ProjectSpatialSheetObjectType)
    : fallbackType;
  const minSize = OBJECT_MIN_SIZE[type];
  const defaultPresentation = createDefaultProjectSpatialSheetObjectPresentation(type);
  const object: ProjectSpatialSheetObject = {
    contentScale: normalizeScale(record.contentScale, defaultPresentation.contentScale ?? 1, 0.8, 1.5),
    density:
      record.density === 'compact'
        ? 'compact'
        : (defaultPresentation.density ?? 'normal'),
    height: normalizeNumber(record.height, minSize.height),
    id: typeof record.id === 'string' ? record.id : createProjectSpatialSheetObjectId(),
    legendColumns:
      type === 'legend'
        ? clampInteger(normalizeNumber(record.legendColumns, defaultPresentation.legendColumns ?? 1), 1, 2)
        : undefined,
    legendShowMapContext:
      type === 'legend'
        ? normalizeBoolean(record.legendShowMapContext, defaultPresentation.legendShowMapContext ?? true)
        : undefined,
    linkedSavedViewId:
      type === 'mapFrame' && typeof record.linkedSavedViewId === 'string'
        ? record.linkedSavedViewId
        : type === 'mapFrame'
          ? null
          : undefined,
    locked: typeof record.locked === 'boolean' ? record.locked : false,
    mapFitMode:
      type === 'mapFrame' && record.mapFitMode === 'fill'
        ? 'fill'
        : type === 'mapFrame'
          ? 'fit'
          : undefined,
    name:
      typeof record.name === 'string' && record.name.trim()
        ? record.name
        : getProjectSpatialSheetObjectLabel(type),
    order: normalizeNumber(record.order, DEFAULT_OBJECT_ORDER[type]),
    paddingScale: normalizeScale(record.paddingScale, defaultPresentation.paddingScale ?? 1, 0.75, 1.45),
    scaleBarShowLabel:
      type === 'scaleBar'
        ? normalizeBoolean(record.scaleBarShowLabel, defaultPresentation.scaleBarShowLabel ?? true)
        : undefined,
    sheetContextRowsVisibility:
      type === 'sheetContext'
        ? normalizeSheetContextRowsVisibility(record.sheetContextRowsVisibility)
        : undefined,
    symbolScale:
      type === 'legend' || type === 'northArrow' || type === 'scaleBar'
        ? normalizeScale(record.symbolScale, defaultPresentation.symbolScale ?? 1, 0.75, 1.5)
        : undefined,
    type,
    visible: typeof record.visible === 'boolean' ? record.visible : true,
    width: normalizeNumber(record.width, minSize.width),
    x: normalizeNumber(record.x, 0),
    y: normalizeNumber(record.y, 0),
  };

  return clampProjectSpatialSheetObject(object, paperSize, orientation);
}

export function normalizeProjectSpatialSheetObjects(
  value: unknown,
  paperSize: ProjectSpatialPaperSize,
  orientation: ProjectSpatialSheetOrientation,
) {
  const rawObjects = Array.isArray(value) ? value : [];
  const normalized = rawObjects
    .map((object) => normalizeProjectSpatialSheetObject(object, paperSize, orientation))
    .filter(
      (object, index, objects) =>
        objects.findIndex((candidate) => candidate.id === object.id) === index,
    );

  return sortTemplateObjectsByOrder(
    ensureRequiredTemplateObjects({
      createDefaultObject: (type) =>
        createDefaultProjectSpatialSheetObjects({
          orientation,
          paperSize,
        }).find((object) => object.type === type)!,
      definitions: PROJECT_SPATIAL_OBJECT_DEFINITIONS,
      objects: normalized,
    }),
  );
}

export function getProjectSpatialSheetSafeArea(
  paperSize: ProjectSpatialPaperSize,
  orientation: ProjectSpatialSheetOrientation,
): ProjectSpatialSheetSafeArea {
  return getTemplateSafeArea(paperSize, orientation);
}

export function getProjectSpatialSheetObjectSizeConstraint(
  objectType: ProjectSpatialSheetObjectType,
  paperSize: ProjectSpatialPaperSize,
  orientation: ProjectSpatialSheetOrientation,
) {
  const safeArea = getProjectSpatialSheetSafeArea(paperSize, orientation);
  const definition = PROJECT_SPATIAL_OBJECT_DEFINITION_BY_TYPE[objectType];
  const minSize = definition.minSizeMm;
  const maxSizeRatio = definition.maxSizeRatio;

  return {
    maxHeight: clampMm(safeArea.height * maxSizeRatio.height, minSize.height, safeArea.height),
    maxWidth: clampMm(safeArea.width * maxSizeRatio.width, minSize.width, safeArea.width),
    minHeight: minSize.height,
    minWidth: minSize.width,
  };
}

export function clampProjectSpatialSheetObject(
  object: ProjectSpatialSheetObject,
  paperSize: ProjectSpatialPaperSize,
  orientation: ProjectSpatialSheetOrientation,
) {
  const safeArea = getProjectSpatialSheetSafeArea(paperSize, orientation);
  const { height, width, x, y } = clampTemplateRect(
    object,
    safeArea,
    getProjectSpatialSheetObjectSizeConstraint(object.type, paperSize, orientation),
  );

  return {
    ...object,
    height,
    order: Number.isFinite(object.order) ? object.order : DEFAULT_OBJECT_ORDER[object.type],
    width,
    x,
    y,
  };
}

export function remapProjectSpatialSheetObjectsToPage(
  objects: ProjectSpatialSheetObject[],
  fromPaperSize: ProjectSpatialPaperSize,
  fromOrientation: ProjectSpatialSheetOrientation,
  toPaperSize: ProjectSpatialPaperSize,
  toOrientation: ProjectSpatialSheetOrientation,
  contentMetrics?: ProjectSpatialSheetContentMetrics,
) {
  const fromSafeArea = getProjectSpatialSheetSafeArea(fromPaperSize, fromOrientation);
  const toSafeArea = getProjectSpatialSheetSafeArea(toPaperSize, toOrientation);
  const remappedObjects = objects.map((object) => {
    return {
      ...object,
      ...remapTemplateRectToSafeArea({
        constraint: getProjectSpatialSheetObjectSizeConstraint(
          object.type,
          toPaperSize,
          toOrientation,
        ),
        fromSafeArea,
        rect: object,
        toSafeArea,
      }),
    };
  });

  return contentMetrics
    ? autoSizeProjectSpatialSheetObjects(
        remappedObjects,
        toPaperSize,
        toOrientation,
        contentMetrics,
      )
    : remappedObjects;
}

export function autoSizeProjectSpatialSheetObjects(
  objects: ProjectSpatialSheetObject[],
  paperSize: ProjectSpatialPaperSize,
  orientation: ProjectSpatialSheetOrientation,
  contentMetrics: ProjectSpatialSheetContentMetrics = AUTO_SIZE_FALLBACK_METRICS,
) {
  return objects
    .map((object) => {
      const targetSize = resolveAutoSizedObjectSize(object, paperSize, orientation, contentMetrics);
      if (!targetSize) {
        return clampProjectSpatialSheetObject(object, paperSize, orientation);
      }

      return resizeObjectWithAnchors(
        object,
        targetSize.width,
        targetSize.height,
        paperSize,
        orientation,
      );
    })
    .sort((left, right) => left.order - right.order);
}

export function autoArrangeProjectSpatialSheetObjects(args: {
  assignedSavedViewId?: string | null;
  contentMetrics?: ProjectSpatialSheetContentMetrics;
  objects: ProjectSpatialSheetObject[];
  orientation: ProjectSpatialSheetOrientation;
  paperSize: ProjectSpatialPaperSize;
  titleBlockPosition?: ProjectSpatialTitleBlockPosition;
}) {
  const currentObjectsByType = new Map<
    ProjectSpatialSheetObjectType,
    ProjectSpatialSheetObject[]
  >();
  for (const object of args.objects) {
    const existingObjects = currentObjectsByType.get(object.type) ?? [];
    existingObjects.push(object);
    currentObjectsByType.set(object.type, existingObjects);
  }
  const arrangedDefaults = autoSizeProjectSpatialSheetObjects(
    createDefaultProjectSpatialSheetObjects({
      assignedSavedViewId:
        currentObjectsByType.get('mapFrame')?.[0]?.linkedSavedViewId ??
        args.assignedSavedViewId ??
        null,
      orientation: args.orientation,
      paperSize: args.paperSize,
      showLegend: currentObjectsByType.get('legend')?.[0]?.visible ?? true,
      showNotes: currentObjectsByType.get('notes')?.[0]?.visible ?? true,
      showSheetContext: currentObjectsByType.get('sheetContext')?.[0]?.visible ?? true,
      titleBlockPosition: args.titleBlockPosition,
    }),
    args.paperSize,
    args.orientation,
    args.contentMetrics,
  );

  const arrangedPrimaryObjects = arrangedDefaults
    .map((defaultObject) => {
      const existingObject = currentObjectsByType.get(defaultObject.type)?.shift();
      if (!existingObject) {
        return defaultObject;
      }

      return {
        ...defaultObject,
        contentScale: existingObject.contentScale,
        density: existingObject.density,
        id: existingObject.id,
        legendColumns: existingObject.legendColumns,
        legendShowMapContext: existingObject.legendShowMapContext,
        linkedSavedViewId:
          defaultObject.type === 'mapFrame'
            ? existingObject.linkedSavedViewId ?? defaultObject.linkedSavedViewId ?? null
            : undefined,
        locked: existingObject.locked,
        mapFitMode: existingObject.mapFitMode,
        name: existingObject.name,
        order: existingObject.order,
        paddingScale: existingObject.paddingScale,
        scaleBarShowLabel: existingObject.scaleBarShowLabel,
        sheetContextRowsVisibility: existingObject.sheetContextRowsVisibility,
        symbolScale: existingObject.symbolScale,
        visible: existingObject.visible,
      };
    });
  const trailingObjects = Array.from(currentObjectsByType.values())
    .flat()
    .map((object) => clampProjectSpatialSheetObject(object, args.paperSize, args.orientation));

  return sortTemplateObjectsByOrder([...arrangedPrimaryObjects, ...trailingObjects]);
}

export function resetProjectSpatialSheetObjectToDefault(args: {
  assignedSavedViewId?: string | null;
  contentMetrics?: ProjectSpatialSheetContentMetrics;
  object: ProjectSpatialSheetObject;
  objects: ProjectSpatialSheetObject[];
  orientation: ProjectSpatialSheetOrientation;
  paperSize: ProjectSpatialPaperSize;
  titleBlockPosition?: ProjectSpatialTitleBlockPosition;
}) {
  const arrangedObjects = autoArrangeProjectSpatialSheetObjects({
    assignedSavedViewId: args.assignedSavedViewId,
    contentMetrics: args.contentMetrics,
    objects: args.objects,
    orientation: args.orientation,
    paperSize: args.paperSize,
    titleBlockPosition: args.titleBlockPosition,
  });
  const defaultObject = arrangedObjects.find((candidate) => candidate.type === args.object.type);

  if (!defaultObject) {
    return clampProjectSpatialSheetObject(args.object, args.paperSize, args.orientation);
  }

  return {
    ...defaultObject,
    contentScale: args.object.contentScale,
    density: args.object.density,
    id: args.object.id,
    legendColumns: args.object.legendColumns,
    legendShowMapContext: args.object.legendShowMapContext,
    linkedSavedViewId:
      args.object.type === 'mapFrame'
        ? args.object.linkedSavedViewId ?? defaultObject.linkedSavedViewId ?? null
        : undefined,
    locked: args.object.locked,
    mapFitMode: args.object.mapFitMode,
    name: args.object.name,
    order: args.object.order,
    paddingScale: args.object.paddingScale,
    scaleBarShowLabel: args.object.scaleBarShowLabel,
    sheetContextRowsVisibility: args.object.sheetContextRowsVisibility,
    symbolScale: args.object.symbolScale,
    visible: args.object.visible,
  } satisfies ProjectSpatialSheetObject;
}

export function resolveProjectSpatialSheetObjectInteraction(args: {
  deltaX: number;
  deltaY: number;
  mode: ProjectSpatialSheetInteractionMode;
  object: ProjectSpatialSheetObject;
  orientation: ProjectSpatialSheetOrientation;
  paperSize: ProjectSpatialPaperSize;
}) {
  return {
    ...args.object,
    ...resolveTemplateObjectInteraction({
      constraint: getProjectSpatialSheetObjectSizeConstraint(
        args.object.type,
        args.paperSize,
        args.orientation,
      ),
      deltaX: args.deltaX,
      deltaY: args.deltaY,
      mode: args.mode as TemplateInteractionMode,
      rect: args.object,
      safeArea: getProjectSpatialSheetSafeArea(args.paperSize, args.orientation),
    }),
  };
}

export function createProjectSpatialSheetTemplate(args: {
  mode: ProjectSpatialSheetMode;
  name: string;
  objects: ProjectSpatialSheetObject[];
  orientation: ProjectSpatialSheetOrientation;
  paperSize: ProjectSpatialPaperSize;
}) {
  const now = new Date().toISOString();
  return {
    createdAt: now,
    id: createProjectSpatialSheetTemplateId(),
    mode: args.mode,
    name: args.name,
    objects: args.objects.map((object) => ({
      ...object,
      id: createProjectSpatialSheetObjectId(),
      linkedSavedViewId: object.type === 'mapFrame' ? null : undefined,
    })),
    orientation: args.orientation,
    paperSize: args.paperSize,
    updatedAt: now,
  } satisfies ProjectSpatialSheetTemplate;
}

export function normalizeProjectSpatialSheetTemplate(value: unknown) {
  const record = asRecord(value);
  const paperSize = normalizePaperSize(record.paperSize);
  const orientation = normalizeOrientation(record.orientation);

  return {
    createdAt: typeof record.createdAt === 'string' ? record.createdAt : new Date().toISOString(),
    id: typeof record.id === 'string' ? record.id : createProjectSpatialSheetTemplateId(),
    mode: normalizeMode(record.mode),
    name:
      typeof record.name === 'string' && record.name.trim()
        ? record.name
        : 'Sheet Template',
    objects: normalizeProjectSpatialSheetObjects(record.objects, paperSize, orientation).map(
      (object) => ({
        ...object,
        linkedSavedViewId: object.type === 'mapFrame' ? null : undefined,
      }),
    ),
    orientation,
    paperSize,
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : new Date().toISOString(),
  } satisfies ProjectSpatialSheetTemplate;
}

function resolveAutoSizedObjectSize(
  object: ProjectSpatialSheetObject,
  paperSize: ProjectSpatialPaperSize,
  orientation: ProjectSpatialSheetOrientation,
  contentMetrics: ProjectSpatialSheetContentMetrics,
) {
  const metrics = {
    ...AUTO_SIZE_FALLBACK_METRICS,
    ...contentMetrics,
  };
  const safeArea = getProjectSpatialSheetSafeArea(paperSize, orientation);
  const { maxHeight, maxWidth, minHeight, minWidth } = getProjectSpatialSheetObjectSizeConstraint(
    object.type,
    paperSize,
    orientation,
  );
  const contentScale = object.contentScale ?? 1;
  const paddingScale = object.paddingScale ?? 1;
  const densityScale = object.density === 'compact' ? 0.86 : 1;

  switch (object.type) {
    case 'titleBlock':
      const standardTitleBlock = getProjectSpatialAs1100TitleBlockSpec(paperSize, orientation);
      return {
        height: clampMm(
          Math.max(
            standardTitleBlock.heightMm,
            (22 +
              metrics.titleLineCount * 9 * contentScale +
              metrics.subtitleLineCount * 7 * contentScale +
              metrics.addressLineCount * 6 * contentScale +
              30 * paddingScale) *
              densityScale,
          ),
          minHeight,
          maxHeight,
        ),
        width: clampMm(
          Math.max(
            standardTitleBlock.widthMm,
            (48 * paddingScale +
              Math.max(
                metrics.titleMaxLineLength * 2.1 * contentScale,
                metrics.subtitleMaxLineLength * 1.5 * contentScale,
                metrics.addressMaxLineLength * 1.4 * contentScale,
              )) *
              densityScale,
          ),
          minWidth,
          clampMm(maxWidth, minWidth, safeArea.width * 0.82),
        ),
      };
    case 'legend':
      const legendColumns = clampInteger(object.legendColumns ?? 1, 1, 2);
      const legendContextCount = object.legendShowMapContext === false ? 0 : 2;
      const totalLegendRows = Math.max(
        1,
        Math.ceil((Math.max(0, metrics.legendEntryCount) + legendContextCount) / legendColumns),
      );
      return {
        height: clampMm(
          (18 * paddingScale + totalLegendRows * 6.2 * contentScale) * densityScale,
          minHeight,
          maxHeight,
        ),
        width: clampMm(
          (24 * paddingScale +
            Math.max(12, metrics.legendMaxLabelLength) * 1.5 * contentScale +
            legendColumns * 18 * (object.symbolScale ?? 1)) *
            densityScale,
          minWidth,
          clampMm(maxWidth, minWidth, safeArea.width * 0.34),
        ),
      };
    case 'notes':
      return {
        height: clampMm(
          (18 * paddingScale + Math.max(1, metrics.notesLineCount) * 6 * contentScale) *
            densityScale,
          minHeight,
          maxHeight,
        ),
        width: clampMm(
          (30 * paddingScale + Math.max(16, metrics.notesMaxLineLength) * 1.15 * contentScale) *
            densityScale,
          minWidth,
          clampMm(maxWidth, minWidth, safeArea.width * 0.44),
        ),
      };
    case 'sheetContext':
      const visibleContextRows = countVisibleSheetContextRows(object.sheetContextRowsVisibility);
      return {
        height: clampMm(
          (18 * paddingScale + Math.max(1, visibleContextRows) * 5.5 * contentScale) *
            densityScale,
          minHeight,
          maxHeight,
        ),
        width: clampMm(
          (28 * paddingScale +
            Math.max(16, metrics.contextMaxValueLength) * 1.2 * contentScale) *
            densityScale,
          minWidth,
          clampMm(maxWidth, minWidth, safeArea.width * 0.34),
        ),
      };
    default:
      return null;
  }
}

function resizeObjectWithAnchors(
  object: ProjectSpatialSheetObject,
  nextWidth: number,
  nextHeight: number,
  paperSize: ProjectSpatialPaperSize,
  orientation: ProjectSpatialSheetOrientation,
) {
  return {
    ...object,
    ...resizeTemplateRectWithAnchors({
      constraint: getProjectSpatialSheetObjectSizeConstraint(object.type, paperSize, orientation),
      nextHeight,
      nextWidth,
      rect: object,
      safeArea: getProjectSpatialSheetSafeArea(paperSize, orientation),
    }),
  };
}

function normalizePaperSize(value: unknown): ProjectSpatialPaperSize {
  return ['a4', 'a3', 'a2', 'a1', 'a0'].includes(value as string)
    ? (value as ProjectSpatialPaperSize)
    : 'a4';
}

function normalizeOrientation(value: unknown): ProjectSpatialSheetOrientation {
  return value === 'portrait' || value === 'landscape'
    ? (value as ProjectSpatialSheetOrientation)
    : 'landscape';
}

function normalizeMode(value: unknown): ProjectSpatialSheetMode {
  return value === 'system_default' || value === 'as1100_inspired' || value === 'custom'
    ? (value as ProjectSpatialSheetMode)
    : 'system_default';
}

function normalizeScale(value: unknown, fallback: number, min: number, max: number) {
  return clampMm(normalizeNumber(value, fallback), min, max);
}

function normalizeBoolean(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback;
}

function normalizeSheetContextRowsVisibility(
  value: unknown,
): ProjectSpatialSheetContextRowsVisibility {
  const record = asRecord(value);
  const defaults = createDefaultProjectSpatialSheetContextRowsVisibility();

  return {
    basemap: normalizeBoolean(record.basemap, defaults.basemap),
    generated: normalizeBoolean(record.generated, defaults.generated),
    geoQuery: normalizeBoolean(record.geoQuery, defaults.geoQuery),
    geology: normalizeBoolean(record.geology, defaults.geology),
    layout: normalizeBoolean(record.layout, defaults.layout),
    paper: normalizeBoolean(record.paper, defaults.paper),
    purpose: normalizeBoolean(record.purpose, defaults.purpose),
  };
}

function countVisibleSheetContextRows(
  value: ProjectSpatialSheetContextRowsVisibility | undefined,
) {
  const visibility = value ?? DEFAULT_SHEET_CONTEXT_ROWS_VISIBILITY;
  return Object.values(visibility).filter(Boolean).length;
}
