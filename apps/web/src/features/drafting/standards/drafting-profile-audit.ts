import {
  createDefaultDraftingDrawingSetup,
  type DraftingDrawingSheetDefinition,
  type DraftingDrawingSetup,
  type DraftingModel,
  type DraftingSheetProfileAudit,
  type DraftingSheetSizePreset,
} from '@eng/shared';
import {
  DRAFTING_STANDARD_LINE_ROLE_ALIASES,
  DRAFTING_STANDARD_LINE_ROLES,
  DRAFTING_STANDARD_TEXT_PRESETS,
  getDraftingStandardProfile,
  type DraftingStandardTextPreset,
} from './drafting-standard-profiles';
import {
  resolveDraftingDimensionStyle,
  resolveDraftingLeaderStyle,
  resolveDraftingLineStyle,
  resolveDraftingPaperLineStyle,
  resolveDraftingTextStyle,
} from './drafting-style-resolver';

export const DRAFTING_PROFILE_AUDIT_WARNING =
  'AS1100-informed profile; not a certification or full compliance claim.';

export function buildDraftingSheetProfileAudit(args: {
  model: Pick<DraftingModel, 'drawingSetup'>;
  sheet?: Pick<DraftingDrawingSheetDefinition, 'pageSize' | 'scaleLabel'> | null;
}): DraftingSheetProfileAudit {
  const setup = args.model.drawingSetup ?? createDefaultDraftingDrawingSetup();
  const profile = getDraftingStandardProfile(setup.activeStandardProfileId);
  const sheetSize = resolveAuditSheetSize(setup, args.sheet);
  const dimensionStyle = resolveDraftingDimensionStyle({ setup, surface: 'sheet' });
  const leaderStyle = resolveDraftingLeaderStyle({ setup, surface: 'sheet' });

  return {
    schemaVersion: 'drafting.profile-audit.v1',
    warning: DRAFTING_PROFILE_AUDIT_WARNING,
    activeProfileId: profile.id,
    profileName: profile.label,
    profileVersion: profile.version,
    disciplineProfileId: profile.disciplineProfileId,
    lineWeightTableId: profile.lineWeightTableId,
    lineStyleTableId: profile.lineStyleTableId,
    sheetSize,
    plottedScale: args.sheet?.scaleLabel ?? setup.scale.defaultSheetScale,
    lineWeightScale: setup.outputLineWeightScale ?? setup.graphics.lineWeightScale ?? 1,
    textScaleMode: setup.graphics.textScaleMode,
    lineRoles: DRAFTING_STANDARD_LINE_ROLES.map((role) => {
      const editorStyle = resolveDraftingLineStyle({ role, setup });
      const sheetStyle = resolveDraftingPaperLineStyle({ role, setup });
      return {
        role,
        resolvedRole: DRAFTING_STANDARD_LINE_ROLE_ALIASES[role],
        lineType: profile.lineStyles[DRAFTING_STANDARD_LINE_ROLE_ALIASES[role]].lineType,
        editorStrokeWidthPx: roundAuditNumber(editorStyle.editorStrokeWidth),
        sheetLineWeightMm: roundAuditNumber(sheetStyle.lineWeightMm),
      };
    }),
    textPresets: DRAFTING_STANDARD_TEXT_PRESETS.map((preset) =>
      buildTextPresetAudit(setup, sheetSize, preset),
    ),
    dimensionStyle: {
      extensionRole: dimensionStyle.extensionRole,
      labelGapModelUnits: dimensionStyle.labelGapModelUnits,
      lineRole: dimensionStyle.lineRole,
      sheetLineWeightMm: roundAuditNumber(dimensionStyle.lineStyle.lineWeightMm),
      textHeightMm: roundAuditNumber(dimensionStyle.textStyle.textHeightMm),
      textPreset: dimensionStyle.textPreset,
      tickLengthModelUnits: dimensionStyle.tickLengthModelUnits,
    },
    leaderStyle: {
      colorRole: leaderStyle.colorRole,
      lineRole: leaderStyle.lineRole,
      maxLeaderOpacity: leaderStyle.maxLeaderOpacity,
      sheetLineWeightMm: roundAuditNumber(leaderStyle.lineStyle.lineWeightMm),
      textHeightMm: roundAuditNumber(leaderStyle.textStyle.textHeightMm),
      textPreset: leaderStyle.textPreset,
    },
  };
}

function buildTextPresetAudit(
  setup: DraftingDrawingSetup,
  sheetSize: DraftingSheetSizePreset,
  preset: DraftingStandardTextPreset,
) {
  const profile = getDraftingStandardProfile(setup.activeStandardProfileId);
  const editorStyle = resolveDraftingTextStyle({ role: preset, setup, sheetSize });
  const sheetStyle = resolveDraftingTextStyle({
    role: preset,
    setup,
    sheetSize,
    surface: 'sheet',
  });

  return {
    preset,
    textRole: profile.textPresets[preset].textRole,
    paperHeightMm: roundAuditNumber(sheetStyle.textHeightMm),
    editorFontSizeModelUnits: roundAuditNumber(editorStyle.fontSize),
    sheetFontSizeMm: roundAuditNumber(sheetStyle.fontSize),
  };
}

function resolveAuditSheetSize(
  setup: DraftingDrawingSetup,
  sheet?: Pick<DraftingDrawingSheetDefinition, 'pageSize'> | null,
): DraftingSheetSizePreset {
  const pageSize = sheet?.pageSize?.toUpperCase();
  if (pageSize === 'A0' || pageSize === 'A1' || pageSize === 'A2' || pageSize === 'A3') {
    return pageSize;
  }
  return setup.defaultSheetSize;
}

function roundAuditNumber(value: number) {
  return Number(value.toFixed(3));
}
