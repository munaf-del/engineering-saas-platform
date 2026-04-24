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
  if (!bounds) {
    return {
      center: { x: 0, y: 0 },
      fitMode: 'model_extents',
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
    fitMode: 'model_extents',
    heightMm: frameHeightMm,
    rotationDeg: 0,
    scale: Math.min(usableWidth / spanX, usableHeight / spanY),
    widthMm: frameWidthMm,
  };
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
