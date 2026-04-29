import type {
  DraftingDrawingSheetDefinition,
  DraftingLayerId,
  DraftingModel,
  DraftingObject,
  DraftingUnderlay,
} from '@eng/shared';
import {
  getDraftingModelBounds,
  getVisibleDraftingObjects,
  getVisibleDraftingUnderlays,
  type DraftingBounds,
} from '../model-utils';

export const DEFAULT_DRAFTING_DRAWING_SHEET_PAGE_SIZE = 'a3';
export const DEFAULT_DRAFTING_DRAWING_SHEET_ORIENTATION = 'landscape';
export const DEFAULT_DRAFTING_DRAWING_SHEET_SCALE_LABEL = 'Fit';
export const DEFAULT_DRAFTING_DRAWING_SHEET_VIEWPORT_WIDTH_MM = 360;
export const DEFAULT_DRAFTING_DRAWING_SHEET_VIEWPORT_HEIGHT_MM = 220;
const MIN_DRAFTING_DRAWING_SHEET_VIEWPORT_SCALE = 0.0001;
const MAX_DRAFTING_DRAWING_SHEET_VIEWPORT_SCALE = 10;
const DEFAULT_DRAFTING_DRAWING_SHEET_NUDGE_RATIO = 0.1;

export type CreateDraftingDrawingSheetDefinitionArgs = {
  id: string;
  name?: string;
  now?: string;
  sheetNumber?: string;
  title?: string;
  viewport?: Partial<DraftingDrawingSheetDefinition['viewport']>;
};

export function createDraftingDrawingSheetDefinition({
  id,
  name = 'Drawing Sheet',
  now = new Date().toISOString(),
  sheetNumber = 'S-001',
  title = name,
  viewport,
}: CreateDraftingDrawingSheetDefinitionArgs): DraftingDrawingSheetDefinition {
  return {
    id,
    name,
    title,
    sheetNumber,
    rootSheetTemplateId: null,
    pageSize: DEFAULT_DRAFTING_DRAWING_SHEET_PAGE_SIZE,
    orientation: DEFAULT_DRAFTING_DRAWING_SHEET_ORIENTATION,
    scaleLabel: DEFAULT_DRAFTING_DRAWING_SHEET_SCALE_LABEL,
    viewport: {
      center: viewport?.center ?? { x: 0, y: 0 },
      fitMode: viewport?.fitMode ?? 'model_extents',
      heightMm: viewport?.heightMm ?? DEFAULT_DRAFTING_DRAWING_SHEET_VIEWPORT_HEIGHT_MM,
      rotationDeg: viewport?.rotationDeg ?? 0,
      scale: viewport?.scale ?? 0.01,
      widthMm: viewport?.widthMm ?? DEFAULT_DRAFTING_DRAWING_SHEET_VIEWPORT_WIDTH_MM,
    },
    includeUnderlays: false,
    includeGrid: true,
    includeObjectLabels: false,
    createdAt: now,
    updatedAt: now,
  };
}

export function getDrawingSheetDefinitions(model: DraftingModel) {
  return model.drawingSheets ?? [];
}

export function addDrawingSheetDefinition(
  model: DraftingModel,
  definition: DraftingDrawingSheetDefinition,
): DraftingModel {
  return {
    ...model,
    drawingSheets: [...getDrawingSheetDefinitions(model), definition],
  };
}

export function updateDrawingSheetDefinition(
  model: DraftingModel,
  sheetId: string,
  patch: Partial<DraftingDrawingSheetDefinition>,
  now = new Date().toISOString(),
): DraftingModel {
  return {
    ...model,
    drawingSheets: getDrawingSheetDefinitions(model).map((sheet) =>
      sheet.id === sheetId ? { ...sheet, ...patch, updatedAt: now } : sheet,
    ),
  };
}

export function duplicateDrawingSheetDefinition(
  model: DraftingModel,
  sourceSheetId: string,
  nextId: string,
  now = new Date().toISOString(),
): DraftingModel {
  const sheets = getDrawingSheetDefinitions(model);
  const sourceIndex = sheets.findIndex((sheet) => sheet.id === sourceSheetId);
  if (sourceIndex === -1) {
    return model;
  }

  const source = sheets[sourceIndex]!;
  const duplicate: DraftingDrawingSheetDefinition = {
    ...source,
    id: nextId,
    name: `${source.name} Copy`,
    sheetNumber: nextSheetNumber(sheets.length + 1),
    createdAt: now,
    updatedAt: now,
  };

  return {
    ...model,
    drawingSheets: [
      ...sheets.slice(0, sourceIndex + 1),
      duplicate,
      ...sheets.slice(sourceIndex + 1),
    ],
  };
}

export function deleteDrawingSheetDefinition(model: DraftingModel, sheetId: string): DraftingModel {
  return {
    ...model,
    drawingSheets: getDrawingSheetDefinitions(model).filter((sheet) => sheet.id !== sheetId),
  };
}

export function fitDrawingSheetViewportToModelExtents({
  bounds,
  frameHeightMm,
  frameWidthMm,
  paddingRatio = 0.08,
}: {
  bounds: DraftingBounds | null;
  frameHeightMm: number;
  frameWidthMm: number;
  paddingRatio?: number;
}): DraftingDrawingSheetDefinition['viewport'] {
  return fitDrawingSheetViewportToBounds({
    bounds,
    fitMode: 'model_extents',
    frameHeightMm,
    frameWidthMm,
    paddingRatio,
  });
}

export function fitDrawingSheetViewportToSelectedObjects({
  frameHeightMm,
  frameWidthMm,
  objects,
  paddingRatio = 0.08,
}: {
  frameHeightMm: number;
  frameWidthMm: number;
  objects: DraftingObject[];
  paddingRatio?: number;
}): DraftingDrawingSheetDefinition['viewport'] {
  return fitDrawingSheetViewportToBounds({
    bounds: getDraftingModelBounds(objects),
    fitMode: 'selected_extents',
    frameHeightMm,
    frameWidthMm,
    paddingRatio,
  });
}

export function fitDrawingSheetDefinitionToSelectedObjects(
  model: DraftingModel,
  sheet: DraftingDrawingSheetDefinition,
  selectedObjectIds: string[],
  frameWidthMm = sheet.viewport.widthMm ?? DEFAULT_DRAFTING_DRAWING_SHEET_VIEWPORT_WIDTH_MM,
  frameHeightMm = sheet.viewport.heightMm ?? DEFAULT_DRAFTING_DRAWING_SHEET_VIEWPORT_HEIGHT_MM,
) {
  const selectedObjects = getVisibleDraftingObjects(model).filter((object) =>
    selectedObjectIds.includes(object.id),
  );

  return {
    ...sheet,
    viewport: fitDrawingSheetViewportToSelectedObjects({
      frameHeightMm,
      frameWidthMm,
      objects: selectedObjects,
    }),
  } satisfies DraftingDrawingSheetDefinition;
}

export function fitDrawingSheetDefinitionToModel(
  model: DraftingModel,
  sheet: DraftingDrawingSheetDefinition,
  frameWidthMm = sheet.viewport.widthMm ?? DEFAULT_DRAFTING_DRAWING_SHEET_VIEWPORT_WIDTH_MM,
  frameHeightMm = sheet.viewport.heightMm ?? DEFAULT_DRAFTING_DRAWING_SHEET_VIEWPORT_HEIGHT_MM,
) {
  return {
    ...sheet,
    viewport: fitDrawingSheetViewportToModelExtents({
      bounds: getDraftingModelBounds(getVisibleDraftingObjects(model)),
      frameHeightMm,
      frameWidthMm,
    }),
  } satisfies DraftingDrawingSheetDefinition;
}

export function fitDrawingSheetViewportToCurrentCanvasView({
  canvasHeightPx,
  canvasWidthPx,
  frameHeightMm,
  frameWidthMm,
  view,
}: {
  canvasHeightPx: number;
  canvasWidthPx: number;
  frameHeightMm: number;
  frameWidthMm: number;
  view: DraftingModel['view'];
}): DraftingDrawingSheetDefinition['viewport'] {
  const safeCanvasWidth = Math.max(1, canvasWidthPx);
  const safeCanvasHeight = Math.max(1, canvasHeightPx);
  const safeViewScale = clampViewportScale(view.scale);
  const worldWidth = safeCanvasWidth / safeViewScale;
  const worldHeight = safeCanvasHeight / safeViewScale;

  return {
    center: {
      x: (safeCanvasWidth / 2 - view.offsetX) / safeViewScale,
      y: (safeCanvasHeight / 2 - view.offsetY) / safeViewScale,
    },
    fitMode: 'manual',
    heightMm: frameHeightMm,
    rotationDeg: 0,
    scale: clampViewportScale(Math.min(frameWidthMm / worldWidth, frameHeightMm / worldHeight)),
    widthMm: frameWidthMm,
  };
}

export function nudgeDrawingSheetViewport(
  viewport: DraftingDrawingSheetDefinition['viewport'],
  direction: 'left' | 'right' | 'up' | 'down',
  ratio = DEFAULT_DRAFTING_DRAWING_SHEET_NUDGE_RATIO,
): DraftingDrawingSheetDefinition['viewport'] {
  const worldWidth =
    (viewport.widthMm ?? DEFAULT_DRAFTING_DRAWING_SHEET_VIEWPORT_WIDTH_MM) /
    clampViewportScale(viewport.scale);
  const worldHeight =
    (viewport.heightMm ?? DEFAULT_DRAFTING_DRAWING_SHEET_VIEWPORT_HEIGHT_MM) /
    clampViewportScale(viewport.scale);
  const deltaX =
    direction === 'left' ? -worldWidth * ratio : direction === 'right' ? worldWidth * ratio : 0;
  const deltaY =
    direction === 'up' ? -worldHeight * ratio : direction === 'down' ? worldHeight * ratio : 0;

  return {
    ...viewport,
    center: {
      x: viewport.center.x + deltaX,
      y: viewport.center.y + deltaY,
    },
    fitMode: 'manual',
  };
}

export function zoomDrawingSheetViewport(
  viewport: DraftingDrawingSheetDefinition['viewport'],
  direction: 'in' | 'out',
  factor = 1.25,
): DraftingDrawingSheetDefinition['viewport'] {
  return {
    ...viewport,
    fitMode: 'manual',
    scale: clampViewportScale(viewport.scale * (direction === 'in' ? factor : 1 / factor)),
  };
}

export function resetDrawingSheetViewport(
  frameWidthMm = DEFAULT_DRAFTING_DRAWING_SHEET_VIEWPORT_WIDTH_MM,
  frameHeightMm = DEFAULT_DRAFTING_DRAWING_SHEET_VIEWPORT_HEIGHT_MM,
): DraftingDrawingSheetDefinition['viewport'] {
  return {
    center: { x: 0, y: 0 },
    fitMode: 'manual',
    heightMm: frameHeightMm,
    rotationDeg: 0,
    scale: 0.01,
    widthMm: frameWidthMm,
  };
}

export function isLayerAllowedByDrawingSheet(
  sheet: DraftingDrawingSheetDefinition,
  layerId: DraftingLayerId,
) {
  const visibleLayerIds = sheet.layerFilter?.visibleLayerIds;
  const hiddenLayerIds = sheet.layerFilter?.hiddenLayerIds;

  if (visibleLayerIds && visibleLayerIds.length > 0 && !visibleLayerIds.includes(layerId)) {
    return false;
  }

  return !(hiddenLayerIds ?? []).includes(layerId);
}

export function getDrawingSheetVisibleObjects(
  model: DraftingModel,
  sheet: DraftingDrawingSheetDefinition,
): DraftingObject[] {
  return getVisibleDraftingObjects(model).filter((object) =>
    isLayerAllowedByDrawingSheet(sheet, object.layerId),
  );
}

export function getDrawingSheetVisibleUnderlays(
  model: DraftingModel,
  sheet: DraftingDrawingSheetDefinition,
): DraftingUnderlay[] {
  if (!sheet.includeUnderlays || !isLayerAllowedByDrawingSheet(sheet, 'underlay')) {
    return [];
  }

  return getVisibleDraftingUnderlays(model);
}

function nextSheetNumber(index: number) {
  return `S-${String(index).padStart(3, '0')}`;
}

function fitDrawingSheetViewportToBounds({
  bounds,
  fitMode,
  frameHeightMm,
  frameWidthMm,
  paddingRatio,
}: {
  bounds: DraftingBounds | null;
  fitMode: DraftingDrawingSheetDefinition['viewport']['fitMode'];
  frameHeightMm: number;
  frameWidthMm: number;
  paddingRatio: number;
}): DraftingDrawingSheetDefinition['viewport'] {
  if (!bounds) {
    return {
      center: { x: 0, y: 0 },
      fitMode,
      heightMm: frameHeightMm,
      rotationDeg: 0,
      scale: 0.01,
      widthMm: frameWidthMm,
    };
  }

  const spanX = Math.max(1, bounds.maxX - bounds.minX);
  const spanY = Math.max(1, bounds.maxY - bounds.minY);
  const usableWidth = frameWidthMm * (1 - paddingRatio * 2);
  const usableHeight = frameHeightMm * (1 - paddingRatio * 2);

  return {
    center: {
      x: (bounds.minX + bounds.maxX) / 2,
      y: (bounds.minY + bounds.maxY) / 2,
    },
    fitMode,
    heightMm: frameHeightMm,
    rotationDeg: 0,
    scale: clampViewportScale(Math.min(usableWidth / spanX, usableHeight / spanY)),
    widthMm: frameWidthMm,
  };
}

function clampViewportScale(value: number) {
  if (!Number.isFinite(value)) {
    return 0.01;
  }

  return Math.min(
    Math.max(value, MIN_DRAFTING_DRAWING_SHEET_VIEWPORT_SCALE),
    MAX_DRAFTING_DRAWING_SHEET_VIEWPORT_SCALE,
  );
}
