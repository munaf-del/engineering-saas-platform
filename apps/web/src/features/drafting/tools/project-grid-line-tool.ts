import type {
  DraftingModel,
  DraftingPoint,
  DraftingProjectGridBubblePlacement,
  DraftingProjectGridLineAxis,
  DraftingProjectGridLineObject,
  DraftingProjectGridLineRole,
} from '@eng/shared';
import { defaultLayerIdForDraftingObjectType } from '@eng/shared';
import { nextDraftingObjectSequence } from './drafting-tool-types';
import {
  DEFAULT_PROJECT_GRID_BUBBLE_RADIUS_MM,
  DEFAULT_PROJECT_GRID_LINE_COUNT,
  DEFAULT_PROJECT_GRID_MAJOR_EVERY,
  DEFAULT_PROJECT_GRID_MODULE_SIZE_MM,
  DEFAULT_PROJECT_GRID_SPACING_MM,
  createProjectGridLabel,
  formatProjectGridModuleNotation,
} from './project-grid-tool';

const PROJECT_GRID_REFERENCE_NOTE =
  'AS1100-informed modular grid style; requires project verification.';

export function createProjectGridLineObject(
  start: DraftingPoint,
  model: DraftingModel,
  end: DraftingPoint = { x: start.x, y: start.y + DEFAULT_PROJECT_GRID_SPACING_MM * 3 },
): DraftingProjectGridLineObject {
  const now = new Date().toISOString();
  const sequence = nextDraftingObjectSequence(model.objects, 'project_grid_line');
  const axis = inferProjectGridLineAxis(start, end);
  const label = nextProjectGridLineLabel(model, axis);
  const gridLineId = `GL${sequence}`;

  return {
    id: crypto.randomUUID(),
    type: 'project_grid_line',
    layerId: defaultLayerIdForDraftingObjectType('project_grid_line'),
    name: `Grid Line ${label}`,
    visible: true,
    locked: false,
    style: {
      stroke: '#475569',
      fill: '#ffffff',
      lineWeight: 1,
    },
    geometry: {
      start: { ...start },
      end: { ...end },
    },
    metadata: {
      gridLineId,
      label,
      axis,
      lineRole: 'major',
      bubblePlacement: 'both',
      bubbleRadiusMm: DEFAULT_PROJECT_GRID_BUBBLE_RADIUS_MM,
      moduleSizeMm: DEFAULT_PROJECT_GRID_MODULE_SIZE_MM,
      showModuleNotation: false,
      as1100Profile: 'modular_grid_informed',
      notes: PROJECT_GRID_REFERENCE_NOTE,
      sequence,
    },
    sourceRef: {
      sourceType: 'manual',
      sourceLabel: gridLineId,
      status: 'manual',
    },
    createdAt: now,
    updatedAt: now,
  };
}

export function createProjectGridLineObjectsFromGridSet(
  origin: DraftingPoint,
  model: DraftingModel,
  options: {
    bubblePlacement?: DraftingProjectGridBubblePlacement;
    lineRole?: DraftingProjectGridLineRole;
    moduleSizeMm?: number;
    name?: string;
    xCount?: number;
    xLabels?: string[];
    xSpacingMm?: number;
    yCount?: number;
    yLabels?: string[];
    ySpacingMm?: number;
  } = {},
): DraftingProjectGridLineObject[] {
  const now = new Date().toISOString();
  const gridSetSequence =
    model.objects.filter((object) =>
      object.type === 'project_grid_line'
        ? object.metadata.gridSetId
        : object.type === 'project_grid',
    ).length + 1;
  const gridSetId = crypto.randomUUID();
  const gridSetName = options.name?.trim() || `Grid Set ${gridSetSequence}`;
  const moduleSizeMm = Math.max(1, options.moduleSizeMm ?? DEFAULT_PROJECT_GRID_MODULE_SIZE_MM);
  const xCount = clampInteger(options.xCount ?? DEFAULT_PROJECT_GRID_LINE_COUNT, 1, 80);
  const yCount = clampInteger(options.yCount ?? DEFAULT_PROJECT_GRID_LINE_COUNT, 1, 80);
  const xSpacingMm = Math.max(1, options.xSpacingMm ?? DEFAULT_PROJECT_GRID_SPACING_MM);
  const ySpacingMm = Math.max(1, options.ySpacingMm ?? DEFAULT_PROJECT_GRID_SPACING_MM);
  const xExtent = xSpacingMm * Math.max(0, xCount - 1);
  const yExtent = ySpacingMm * Math.max(0, yCount - 1);
  const sequenceStart = nextDraftingObjectSequence(model.objects, 'project_grid_line');
  const objects: DraftingProjectGridLineObject[] = [];

  for (let index = 0; index < xCount; index += 1) {
    const offset = index * xSpacingMm;
    objects.push(
      createGridSetLine({
        axis: 'x',
        bubblePlacement: options.bubblePlacement ?? 'both',
        end: { x: origin.x + offset, y: origin.y + yExtent },
        gridSetId,
        gridSetName,
        index,
        label: options.xLabels?.[index]?.trim() || createProjectGridLabel(index, 'letters'),
        lineRole: options.lineRole ?? defaultGridLineRole(index),
        moduleSizeMm,
        offset,
        sequence: sequenceStart + objects.length,
        start: { x: origin.x + offset, y: origin.y },
        timestamp: now,
      }),
    );
  }

  for (let index = 0; index < yCount; index += 1) {
    const offset = index * ySpacingMm;
    objects.push(
      createGridSetLine({
        axis: 'y',
        bubblePlacement: options.bubblePlacement ?? 'both',
        end: { x: origin.x + xExtent, y: origin.y + offset },
        gridSetId,
        gridSetName,
        index,
        label: options.yLabels?.[index]?.trim() || createProjectGridLabel(index, 'numbers'),
        lineRole: options.lineRole ?? defaultGridLineRole(index),
        moduleSizeMm,
        offset,
        sequence: sequenceStart + objects.length,
        start: { x: origin.x, y: origin.y + offset },
        timestamp: now,
      }),
    );
  }

  return objects;
}

export function inferProjectGridLineAxis(
  start: DraftingPoint,
  end: DraftingPoint,
): DraftingProjectGridLineAxis {
  const deltaX = Math.abs(end.x - start.x);
  const deltaY = Math.abs(end.y - start.y);

  if (deltaX < deltaY * 0.25) {
    return 'x';
  }
  if (deltaY < deltaX * 0.25) {
    return 'y';
  }
  return 'custom';
}

function createGridSetLine({
  axis,
  bubblePlacement,
  end,
  gridSetId,
  gridSetName,
  index,
  label,
  lineRole,
  moduleSizeMm,
  offset,
  sequence,
  start,
  timestamp,
}: {
  axis: DraftingProjectGridLineAxis;
  bubblePlacement: DraftingProjectGridBubblePlacement;
  end: DraftingPoint;
  gridSetId: string;
  gridSetName: string;
  index: number;
  label: string;
  lineRole: DraftingProjectGridLineRole;
  moduleSizeMm: number;
  offset: number;
  sequence: number;
  start: DraftingPoint;
  timestamp: string;
}): DraftingProjectGridLineObject {
  const gridLineId = `${gridSetName.replace(/\s+/g, '-').toUpperCase()}-${axis.toUpperCase()}-${index + 1}`;
  return {
    id: crypto.randomUUID(),
    type: 'project_grid_line',
    layerId: defaultLayerIdForDraftingObjectType('project_grid_line'),
    name: `Grid Line ${label}`,
    visible: true,
    locked: false,
    style: {
      stroke: '#475569',
      fill: '#ffffff',
      lineWeight: 1,
    },
    geometry: {
      start,
      end,
    },
    metadata: {
      gridLineId,
      label,
      axis,
      lineRole,
      bubblePlacement,
      bubbleRadiusMm: DEFAULT_PROJECT_GRID_BUBBLE_RADIUS_MM,
      moduleSizeMm,
      showModuleNotation: true,
      gridSetId,
      gridSetName,
      sequence,
      as1100Profile: 'modular_grid_informed',
      notes: PROJECT_GRID_REFERENCE_NOTE,
      ...(offset > 0
        ? { moduleNotation: formatProjectGridModuleNotation(offset, moduleSizeMm) }
        : {}),
    },
    sourceRef: {
      sourceType: 'manual',
      sourceLabel: gridLineId,
      status: 'manual',
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function nextProjectGridLineLabel(model: DraftingModel, axis: DraftingProjectGridLineAxis) {
  const mode = axis === 'x' ? 'letters' : axis === 'y' ? 'numbers' : 'custom';
  const count = model.objects.filter(
    (object) => object.type === 'project_grid_line' && object.metadata.axis === axis,
  ).length;
  return createProjectGridLabel(count, mode);
}

function defaultGridLineRole(index: number): DraftingProjectGridLineRole {
  if (index === 0) {
    return 'axis';
  }
  return index % DEFAULT_PROJECT_GRID_MAJOR_EVERY === 0 ? 'major' : 'minor';
}

function clampInteger(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, Math.round(value)));
}
