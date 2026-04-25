import type {
  DraftingDrawingSetup,
  DraftingLayer,
  DraftingObject,
  DraftingSheetSizePreset,
} from '@eng/shared';
import {
  DRAFTING_OBJECT_LINE_ROLE_MAP,
  getDraftingStandardProfile,
  type DraftingLineRole,
  type DraftingLineStyleDefinition,
  type DraftingTextRole,
} from './drafting-standard-profiles';

const LEGACY_LINE_WEIGHT_UNIT_MM = 0.18;
const EDITOR_STROKE_PX_PER_MM = 170;

export type ResolvedDraftingLineStyle = {
  color: string;
  dashArray?: string;
  editorStrokeWidth: number;
  lineWeightMm: number;
  role: DraftingLineRole;
};

export function resolveDraftingObjectLineRole(objectType: DraftingObject['type']) {
  return DRAFTING_OBJECT_LINE_ROLE_MAP[objectType] ?? 'objectVisible';
}

export function resolveDraftingLineStyle(args: {
  layer?: DraftingLayer | null;
  object?: Pick<DraftingObject, 'style' | 'type'> | null;
  role?: DraftingLineRole;
  setup?: DraftingDrawingSetup | null;
}): ResolvedDraftingLineStyle {
  const role =
    args.role ?? (args.object ? resolveDraftingObjectLineRole(args.object.type) : 'objectVisible');
  const setup = args.setup;
  const profile = getDraftingStandardProfile(setup?.activeStandardProfileId);
  const profileStyle = profile.lineStyles[role] ?? profile.lineStyles.objectVisible;
  const overrideLineWeightMm = args.object?.style?.lineWeightMm;
  const legacyLineWeightMm =
    args.object?.style?.lineWeight !== undefined
      ? args.object.style.lineWeight * LEGACY_LINE_WEIGHT_UNIT_MM
      : !setup && args.layer?.lineWeight !== undefined
        ? args.layer.lineWeight * LEGACY_LINE_WEIGHT_UNIT_MM
        : undefined;
  const lineWeightMm =
    (overrideLineWeightMm ?? legacyLineWeightMm ?? profileStyle.lineWeightMm) *
    (setup?.outputLineWeightScale ?? setup?.graphics.lineWeightScale ?? 1);
  const color = args.object?.style?.stroke ?? args.layer?.color ?? profileStyle.color;
  const dashArray = toEditorDashArray(args.object?.style?.lineStyle ? undefined : profileStyle);

  return {
    color,
    ...(dashArray ? { dashArray } : {}),
    editorStrokeWidth: Math.max(12, lineWeightMm * EDITOR_STROKE_PX_PER_MM),
    lineWeightMm,
    role,
  };
}

export function resolveDraftingPaperLineStyle(args: {
  object?: Pick<DraftingObject, 'style' | 'type'> | null;
  role?: DraftingLineRole;
  setup?: DraftingDrawingSetup | null;
}): ResolvedDraftingLineStyle {
  const resolved = resolveDraftingLineStyle(args);

  return {
    ...resolved,
    editorStrokeWidth: resolved.lineWeightMm,
  };
}

export function resolveDraftingLegacyLineWeight(args: {
  layer?: DraftingLayer | null;
  object?: Pick<DraftingObject, 'style' | 'type'> | null;
  setup?: DraftingDrawingSetup | null;
}) {
  return resolveDraftingLineStyle(args).lineWeightMm / LEGACY_LINE_WEIGHT_UNIT_MM;
}

export function resolveDraftingTextHeightMm(args: {
  role: DraftingTextRole;
  setup?: DraftingDrawingSetup | null;
  sheetSize?: DraftingSheetSizePreset;
}) {
  const setup = args.setup;
  const profile = getDraftingStandardProfile(setup?.activeStandardProfileId);
  const textStyle = profile.textStyles[args.role];
  const sheetSize = args.sheetSize ?? setup?.defaultSheetSize ?? 'A1';
  const profileHeight = sheetSize === 'A0' ? textStyle.a0B1HeightMm : textStyle.a1ToA4HeightMm;

  if (args.role === 'drawingTitle' || args.role === 'sheetTitle') {
    return setup?.titleTextHeightMm ?? profileHeight;
  }

  if (args.role === 'dimension') {
    return setup?.dimensionTextHeightMm ?? profileHeight;
  }

  if (args.role === 'generalNote') {
    return setup?.noteTextHeightMm ?? profileHeight;
  }

  return setup?.defaultTextHeightMm ?? profileHeight;
}

function toEditorDashArray(style?: DraftingLineStyleDefinition) {
  if (!style?.dashArray) {
    return undefined;
  }

  return style.dashArray
    .split(' ')
    .map((part) => Number(part) * 80)
    .filter((value) => Number.isFinite(value) && value > 0)
    .join(' ');
}
