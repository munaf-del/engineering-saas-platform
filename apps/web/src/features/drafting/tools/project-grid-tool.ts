import type {
  DraftingModel,
  DraftingPoint,
  DraftingProjectGridBubblePlacement,
  DraftingProjectGridLabelMode,
  DraftingProjectGridLineDefinition,
  DraftingProjectGridLineRole,
  DraftingProjectGridObject,
} from '@eng/shared';
import { defaultLayerIdForDraftingObjectType } from '@eng/shared';
import { nextDraftingObjectSequence } from './drafting-tool-types';

export const DEFAULT_PROJECT_GRID_MODULE_SIZE_MM = 100;
export const DEFAULT_PROJECT_GRID_SPACING_MM = 1000;
export const DEFAULT_PROJECT_GRID_LINE_COUNT = 4;
export const DEFAULT_PROJECT_GRID_MAJOR_EVERY = 3;
export const DEFAULT_PROJECT_GRID_BUBBLE_RADIUS_MM = 180;

export function createProjectGridObject(
  origin: DraftingPoint,
  model: DraftingModel,
): DraftingProjectGridObject {
  const now = new Date().toISOString();
  const sequence = nextDraftingObjectSequence(model.objects, 'project_grid');
  const gridId = `GRID${sequence}`;
  const moduleSizeMm = DEFAULT_PROJECT_GRID_MODULE_SIZE_MM;
  const majorEvery = DEFAULT_PROJECT_GRID_MAJOR_EVERY;

  return {
    id: crypto.randomUUID(),
    type: 'project_grid',
    layerId: defaultLayerIdForDraftingObjectType('project_grid'),
    name: `Project Grid ${sequence}`,
    visible: true,
    locked: false,
    style: {
      stroke: '#475569',
      fill: '#ffffff',
      lineWeight: 1,
    },
    geometry: {
      origin: { ...origin },
      rotationDeg: 0,
      extentXPositiveMm: DEFAULT_PROJECT_GRID_SPACING_MM * (DEFAULT_PROJECT_GRID_LINE_COUNT - 1),
      extentXNegativeMm: 0,
      extentYPositiveMm: DEFAULT_PROJECT_GRID_SPACING_MM * (DEFAULT_PROJECT_GRID_LINE_COUNT - 1),
      extentYNegativeMm: 0,
      xLines: createProjectGridLines({
        axis: 'x',
        bubblePlacement: 'both',
        count: DEFAULT_PROJECT_GRID_LINE_COUNT,
        labelMode: 'letters',
        majorEvery,
        moduleSizeMm,
        spacingMm: DEFAULT_PROJECT_GRID_SPACING_MM,
      }),
      yLines: createProjectGridLines({
        axis: 'y',
        bubblePlacement: 'both',
        count: DEFAULT_PROJECT_GRID_LINE_COUNT,
        labelMode: 'numbers',
        majorEvery,
        moduleSizeMm,
        spacingMm: DEFAULT_PROJECT_GRID_SPACING_MM,
      }),
    },
    metadata: {
      gridId,
      moduleSizeMm,
      xLabelMode: 'letters',
      yLabelMode: 'numbers',
      bubbleRadiusMm: DEFAULT_PROJECT_GRID_BUBBLE_RADIUS_MM,
      bubblePlacement: 'both',
      showModuleNotation: true,
      majorEvery,
      as1100Profile: 'modular_grid_informed',
      note: 'AS1100-informed modular grid style; requires project verification.',
    },
    sourceRef: {
      sourceType: 'manual',
      sourceLabel: gridId,
      status: 'manual',
    },
    createdAt: now,
    updatedAt: now,
  };
}

export function createProjectGridLines({
  axis,
  bubblePlacement,
  count,
  labels,
  labelMode,
  majorEvery,
  moduleSizeMm,
  spacingMm,
}: {
  axis: 'x' | 'y';
  bubblePlacement: DraftingProjectGridBubblePlacement;
  count: number;
  labels?: string[];
  labelMode: DraftingProjectGridLabelMode;
  majorEvery: number;
  moduleSizeMm: number;
  spacingMm: number;
}): DraftingProjectGridLineDefinition[] {
  const safeCount = clampInteger(count, 1, 80);
  const safeSpacing = Math.max(1, spacingMm);
  const safeModule = Math.max(1, moduleSizeMm);
  const safeMajorEvery = clampInteger(majorEvery, 1, 50);
  const bubbleFlags = bubblePlacementToFlags(bubblePlacement);

  return Array.from({ length: safeCount }, (_, index) => {
    const offsetMm = index * safeSpacing;
    const label = labels?.[index]?.trim() || createProjectGridLabel(index, labelMode);
    const lineRole: DraftingProjectGridLineRole =
      index === 0 ? 'axis' : index % safeMajorEvery === 0 ? 'major' : 'minor';

    return {
      id: `${axis}-${index + 1}`,
      label,
      offsetMm,
      lineRole,
      bubbleStart: bubbleFlags.start,
      bubbleEnd: bubbleFlags.end,
      moduleNotation: formatProjectGridModuleNotation(offsetMm || safeSpacing, safeModule),
      visible: true,
      locked: false,
    };
  });
}

export function rebuildProjectGridObjectLines(args: {
  object: DraftingProjectGridObject;
  xLabels?: string[];
  xLineCount?: number;
  xSpacingMm?: number;
  yLabels?: string[];
  yLineCount?: number;
  ySpacingMm?: number;
  moduleSizeMm?: number;
  majorEvery?: number;
  bubblePlacement?: DraftingProjectGridBubblePlacement;
}): DraftingProjectGridObject {
  const moduleSizeMm = Math.max(1, args.moduleSizeMm ?? args.object.metadata.moduleSizeMm);
  const majorEvery = clampInteger(args.majorEvery ?? args.object.metadata.majorEvery ?? 1, 1, 50);
  const bubblePlacement = args.bubblePlacement ?? args.object.metadata.bubblePlacement;
  const xSpacing = Math.max(
    1,
    args.xSpacingMm ?? inferProjectGridSpacing(args.object.geometry.xLines),
  );
  const ySpacing = Math.max(
    1,
    args.ySpacingMm ?? inferProjectGridSpacing(args.object.geometry.yLines),
  );
  const xCount = clampInteger(
    args.xLineCount ?? args.xLabels?.length ?? args.object.geometry.xLines.length,
    1,
    80,
  );
  const yCount = clampInteger(
    args.yLineCount ?? args.yLabels?.length ?? args.object.geometry.yLines.length,
    1,
    80,
  );

  return {
    ...args.object,
    geometry: {
      ...args.object.geometry,
      extentXPositiveMm: xSpacing * Math.max(0, xCount - 1),
      extentYPositiveMm: ySpacing * Math.max(0, yCount - 1),
      xLines: createProjectGridLines({
        axis: 'x',
        bubblePlacement,
        count: xCount,
        labels: args.xLabels,
        labelMode: args.object.metadata.xLabelMode,
        majorEvery,
        moduleSizeMm,
        spacingMm: xSpacing,
      }),
      yLines: createProjectGridLines({
        axis: 'y',
        bubblePlacement,
        count: yCount,
        labels: args.yLabels,
        labelMode: args.object.metadata.yLabelMode,
        majorEvery,
        moduleSizeMm,
        spacingMm: ySpacing,
      }),
    },
    metadata: {
      ...args.object.metadata,
      bubblePlacement,
      majorEvery,
      moduleSizeMm,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function inferProjectGridSpacing(lines: DraftingProjectGridLineDefinition[]) {
  const sortedOffsets = [...lines]
    .map((line) => line.offsetMm)
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);
  for (let index = 1; index < sortedOffsets.length; index += 1) {
    const delta = sortedOffsets[index]! - sortedOffsets[index - 1]!;
    if (delta > 0) {
      return delta;
    }
  }
  return DEFAULT_PROJECT_GRID_SPACING_MM;
}

export function formatProjectGridModuleNotation(offsetMm: number, moduleSizeMm: number) {
  if (offsetMm <= 0 || moduleSizeMm <= 0) {
    return undefined;
  }
  const modules = offsetMm / moduleSizeMm;
  if (!Number.isFinite(modules)) {
    return undefined;
  }
  const rounded = Math.round(modules * 100) / 100;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : String(rounded)}M`;
}

export function createProjectGridLabel(index: number, mode: DraftingProjectGridLabelMode) {
  if (mode === 'numbers') {
    return String(index + 1);
  }
  if (mode === 'letters') {
    return toAlphabeticLabel(index);
  }
  return `G${index + 1}`;
}

function bubblePlacementToFlags(placement: DraftingProjectGridBubblePlacement) {
  return {
    start: placement === 'both' || placement === 'start',
    end: placement === 'both' || placement === 'end',
  };
}

function toAlphabeticLabel(index: number) {
  let remaining = index;
  let label = '';
  do {
    label = String.fromCharCode(65 + (remaining % 26)) + label;
    remaining = Math.floor(remaining / 26) - 1;
  } while (remaining >= 0);
  return label;
}

function clampInteger(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, Math.round(value)));
}
