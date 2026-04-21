import {
  TEMPLATE_MAP_ALIGNMENT_OPTIONS,
  TEMPLATE_PAGE_ORIENTATION_OPTIONS,
  TEMPLATE_PAPER_SIZE_OPTIONS,
  TEMPLATE_PRESET_OPTIONS,
  TEMPLATE_TITLE_BLOCK_POSITION_OPTIONS,
  getTemplateLayoutPreset,
  getTemplatePageLayout,
  type TemplateMapAlignment,
  type TemplateLayoutPreset,
  type TemplatePageOrientation,
  type TemplatePaperSize,
  type TemplatePresetId,
  type TemplateTitleBlockPosition,
} from '@/features/templates/core/template-preset';
import type { TemplatePageLayout } from '@/features/templates/core/template-page';

export type ProjectSpatialPaperSize = TemplatePaperSize;

export type ProjectSpatialSheetOrientation = TemplatePageOrientation;

export type ProjectSpatialSheetMode = TemplatePresetId;

export type ProjectSpatialTitleBlockPosition = TemplateTitleBlockPosition;

export type ProjectSpatialMapAlignment = TemplateMapAlignment;

export type ProjectSpatialSheetLayoutControls = TemplateLayoutPreset & {
  // Legacy preset scalars are retained for storage compatibility while the
  // new Templates module moves toward object-driven sizing instead.
  contextScale: number;
  legendScale: number;
  mapAlignment: ProjectSpatialMapAlignment;
  mapHeightScale: number;
  mapWidthScale: number;
  marginScale: number;
  notesScale: number;
  titleBlockHeightScale: number;
  titleBlockWidthScale: number;
};

export type ProjectSpatialSheetPageLayout = TemplatePageLayout;

export const PROJECT_SPATIAL_PAPER_SIZE_OPTIONS = TEMPLATE_PAPER_SIZE_OPTIONS;

export const PROJECT_SPATIAL_SHEET_ORIENTATION_OPTIONS = TEMPLATE_PAGE_ORIENTATION_OPTIONS;

export const PROJECT_SPATIAL_SHEET_MODE_OPTIONS = TEMPLATE_PRESET_OPTIONS;

export const PROJECT_SPATIAL_TITLE_BLOCK_POSITION_OPTIONS =
  TEMPLATE_TITLE_BLOCK_POSITION_OPTIONS;

export const PROJECT_SPATIAL_MAP_ALIGNMENT_OPTIONS = TEMPLATE_MAP_ALIGNMENT_OPTIONS;

const PROJECT_SPATIAL_LEGACY_LAYOUT_PRESETS: Record<
  Exclude<ProjectSpatialSheetMode, 'custom'>,
  Omit<
    ProjectSpatialSheetLayoutControls,
    'mode' | 'showLegend' | 'showNotes' | 'showSheetContext' | 'titleBlockPosition'
  >
> = {
  system_default: {
    contextScale: 1,
    legendScale: 1,
    mapAlignment: 'center',
    mapHeightScale: 1,
    mapWidthScale: 1,
    marginScale: 1,
    notesScale: 1,
    titleBlockHeightScale: 1,
    titleBlockWidthScale: 1,
  },
  as1100_inspired: {
    contextScale: 0.94,
    legendScale: 0.92,
    mapAlignment: 'center',
    mapHeightScale: 1.08,
    mapWidthScale: 1.02,
    marginScale: 0.92,
    notesScale: 0.9,
    titleBlockHeightScale: 1.08,
    titleBlockWidthScale: 1.08,
  },
};

export function getProjectSpatialSheetLayoutPreset(
  mode: ProjectSpatialSheetMode,
): ProjectSpatialSheetLayoutControls {
  const templatePreset = getTemplateLayoutPreset(mode);
  const legacyPreset =
    mode === 'custom'
      ? PROJECT_SPATIAL_LEGACY_LAYOUT_PRESETS.system_default
      : PROJECT_SPATIAL_LEGACY_LAYOUT_PRESETS[mode];

  return {
    ...legacyPreset,
    ...templatePreset,
  };
}

export function getProjectSpatialSheetPageLayout(
  paperSize: ProjectSpatialPaperSize,
  orientation: ProjectSpatialSheetOrientation,
): ProjectSpatialSheetPageLayout {
  return getTemplatePageLayout(paperSize, orientation);
}
