import type {
  DraftingDrawingSetup,
  DraftingLayer,
  DraftingObject,
  DraftingSheetSizePreset,
} from '@eng/shared';
import {
  DRAFTING_OBJECT_LINE_ROLE_MAP,
  getDraftingStandardProfile,
  resolveDraftingStandardLineRole,
  type DraftingLineProfileRole,
  type DraftingLineRole,
  type DraftingLineStyleDefinition,
  type DraftingStandardTextPreset,
  type DraftingTextRole,
} from './drafting-standard-profiles';

const LEGACY_LINE_WEIGHT_UNIT_MM = 0.18;
const EDITOR_STROKE_PX_PER_MM = 4;
const CANVAS_TEXT_UNITS_PER_MM = 70;

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
  role?: DraftingLineProfileRole;
  setup?: DraftingDrawingSetup | null;
}): ResolvedDraftingLineStyle {
  const role =
    args.role ?? (args.object ? resolveDraftingObjectLineRole(args.object.type) : 'objectVisible');
  const resolvedRole = resolveDraftingStandardLineRole(role);
  const setup = args.setup;
  const profile = getDraftingStandardProfile(setup?.activeStandardProfileId);
  const profileStyle = profile.lineStyles[resolvedRole] ?? profile.lineStyles.objectVisible;
  const overrideLineWeightMm = args.object?.style?.lineWeightMm;
  const legacyLineWeightMm =
    !setup && args.object?.style?.lineWeight !== undefined
      ? args.object.style.lineWeight * LEGACY_LINE_WEIGHT_UNIT_MM
      : !setup && args.layer?.lineWeight !== undefined
        ? args.layer.lineWeight * LEGACY_LINE_WEIGHT_UNIT_MM
        : undefined;
  const lineWeightMm =
    (overrideLineWeightMm ?? legacyLineWeightMm ?? profileStyle.lineWeightMm) *
    (setup?.outputLineWeightScale ?? setup?.graphics.lineWeightScale ?? 1);
  const color = profileStyle.color ?? args.object?.style?.stroke ?? args.layer?.color;
  const dashArray = toEditorDashArray(args.object?.style?.lineStyle ? undefined : profileStyle);

  return {
    color,
    ...(dashArray ? { dashArray } : {}),
    editorStrokeWidth: Math.max(0.75, lineWeightMm * EDITOR_STROKE_PX_PER_MM),
    lineWeightMm,
    role: resolvedRole,
  };
}

export function resolveDraftingPaperLineStyle(args: {
  object?: Pick<DraftingObject, 'style' | 'type'> | null;
  role?: DraftingLineProfileRole;
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
  role: DraftingTextRole | DraftingStandardTextPreset;
  setup?: DraftingDrawingSetup | null;
  sheetSize?: DraftingSheetSizePreset;
}) {
  const setup = args.setup;
  const profile = getDraftingStandardProfile(setup?.activeStandardProfileId);
  const resolvedRole = resolveDraftingTextRole(args.role, profile);
  const textStyle = profile.textStyles[resolvedRole];
  const sheetSize = args.sheetSize ?? setup?.defaultSheetSize ?? 'A1';
  const profileHeight = sheetSize === 'A0' ? textStyle.a0B1HeightMm : textStyle.a1ToA4HeightMm;

  if (resolvedRole === 'drawingTitle' || resolvedRole === 'sheetTitle') {
    return setup?.titleTextHeightMm ?? profileHeight;
  }

  if (resolvedRole === 'dimension') {
    return setup?.dimensionTextHeightMm ?? profileHeight;
  }

  if (resolvedRole === 'generalNote') {
    return setup?.noteTextHeightMm ?? profileHeight;
  }

  return setup?.defaultTextHeightMm ?? profileHeight;
}

export type ResolvedDraftingTextStyle = {
  fill: string;
  fontSize: number;
  fontWeight: number;
  haloColor: string;
  haloStrokeWidth: number;
  lineHeight: number;
  secondaryFill: string;
  secondaryFontSize: number;
  secondaryFontWeight: number;
  textHeightMm: number;
};

export function resolveDraftingTextStyle(args: {
  role: DraftingTextRole | DraftingStandardTextPreset;
  setup?: DraftingDrawingSetup | null;
  sheetSize?: DraftingSheetSizePreset;
  surface?: 'editor' | 'sheet';
}): ResolvedDraftingTextStyle {
  const profile = getDraftingStandardProfile(args.setup?.activeStandardProfileId);
  const resolvedRole = resolveDraftingTextRole(args.role, profile);
  const preset = Object.values(profile.textPresets).find(
    (candidate) => candidate.textRole === resolvedRole,
  );
  const textHeightMm = resolveDraftingTextHeightMm({ ...args, role: resolvedRole });
  const fontSize =
    args.surface === 'sheet' ? textHeightMm : textHeightMm * CANVAS_TEXT_UNITS_PER_MM;
  const emphasis = preset?.emphasis ?? (resolvedRole === 'dimension' ? 'medium' : 'normal');

  return {
    fill: profile.palette.ink,
    fontSize,
    fontWeight: emphasis === 'strong' ? 700 : emphasis === 'medium' ? 600 : 500,
    haloColor: profile.palette.halo,
    haloStrokeWidth: Math.max(args.surface === 'sheet' ? 0.18 : 14, fontSize * 0.08),
    lineHeight: preset?.lineHeight ?? 1.08,
    secondaryFill: profile.palette.softInk,
    secondaryFontSize: fontSize * 0.74,
    secondaryFontWeight: 500,
    textHeightMm,
  };
}

export function resolveDraftingDimensionStyle(args: {
  setup?: DraftingDrawingSetup | null;
  surface?: 'editor' | 'sheet';
}) {
  const profile = getDraftingStandardProfile(args.setup?.activeStandardProfileId);
  const dimensionLine =
    args.surface === 'sheet' ? resolveDraftingPaperLineStyle : resolveDraftingLineStyle;
  const lineStyle = dimensionLine({ role: profile.dimensionStyle.lineRole, setup: args.setup });
  const extensionStyle = dimensionLine({
    role: profile.dimensionStyle.extensionRole,
    setup: args.setup,
  });
  return {
    ...profile.dimensionStyle,
    extensionStyle,
    lineStyle,
    textStyle: resolveDraftingTextStyle({
      role: profile.dimensionStyle.textPreset,
      setup: args.setup,
      surface: args.surface,
    }),
  };
}

export function resolveDraftingLeaderStyle(args: {
  setup?: DraftingDrawingSetup | null;
  surface?: 'editor' | 'sheet';
}) {
  const profile = getDraftingStandardProfile(args.setup?.activeStandardProfileId);
  const lineResolver =
    args.surface === 'sheet' ? resolveDraftingPaperLineStyle : resolveDraftingLineStyle;
  return {
    ...profile.leaderStyle,
    lineStyle: lineResolver({ role: profile.leaderStyle.lineRole, setup: args.setup }),
    textStyle: resolveDraftingTextStyle({
      role: profile.leaderStyle.textPreset,
      setup: args.setup,
      surface: args.surface,
    }),
  };
}

export const getLineStyle = resolveDraftingLineStyle;
export const getTextStyle = resolveDraftingTextStyle;

function resolveDraftingTextRole(
  role: DraftingTextRole | DraftingStandardTextPreset,
  profile: ReturnType<typeof getDraftingStandardProfile>,
): DraftingTextRole {
  if (role in profile.textPresets) {
    return profile.textPresets[role as DraftingStandardTextPreset].textRole;
  }

  return role as DraftingTextRole;
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
