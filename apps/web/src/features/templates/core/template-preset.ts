import type { TemplateSafeArea } from './template-document';
import {
  TEMPLATE_PAGE_ORIENTATION_OPTIONS,
  TEMPLATE_PAPER_SIZE_OPTIONS,
  getTemplatePageLayout,
  type TemplatePageOrientation,
  type TemplatePaperSize,
} from './template-page';

export type TemplatePresetId = 'system_default' | 'as1100_inspired' | 'custom';

export type TemplateTitleBlockPosition = 'bottom_right' | 'bottom_left' | 'bottom_full';

export type TemplateMapAlignment = 'left' | 'center' | 'right';

export type TemplateLayoutPreset = {
  mode: TemplatePresetId;
  showLegend: boolean;
  showNotes: boolean;
  showSheetContext: boolean;
  titleBlockPosition: TemplateTitleBlockPosition;
};

type TemplateMargins = {
  bottom: number;
  left: number;
  right: number;
  top: number;
};

const TEMPLATE_LAYOUT_PRESETS: Record<
  Exclude<TemplatePresetId, 'custom'>,
  Omit<TemplateLayoutPreset, 'mode'>
> = {
  system_default: {
    showLegend: true,
    showNotes: true,
    showSheetContext: true,
    titleBlockPosition: 'bottom_right',
  },
  as1100_inspired: {
    showLegend: true,
    showNotes: true,
    showSheetContext: true,
    titleBlockPosition: 'bottom_right',
  },
};

// Preferred-series sheet boundary offsets:
// A0/A1 use 20 mm all around, while A2/A3/A4 use 10 mm all around.
const GENERIC_TEMPLATE_SAFE_AREA_MARGINS_MM: Record<TemplatePaperSize, TemplateMargins> = {
  a0: { left: 20, right: 20, top: 20, bottom: 20 },
  a1: { left: 20, right: 20, top: 20, bottom: 20 },
  a2: { left: 10, right: 10, top: 10, bottom: 10 },
  a3: { left: 10, right: 10, top: 10, bottom: 10 },
  a4: { left: 10, right: 10, top: 10, bottom: 10 },
};

export const TEMPLATE_PRESET_OPTIONS: Array<{
  label: string;
  value: TemplatePresetId;
}> = [
  { value: 'system_default', label: 'System Default' },
  { value: 'as1100_inspired', label: 'AS 1100-inspired' },
  { value: 'custom', label: 'Custom Layout' },
];

export const TEMPLATE_TITLE_BLOCK_POSITION_OPTIONS: Array<{
  label: string;
  value: TemplateTitleBlockPosition;
}> = [
  { value: 'bottom_right', label: 'Bottom Right' },
  { value: 'bottom_left', label: 'Bottom Left' },
  { value: 'bottom_full', label: 'Full-Width Bottom' },
];

export const TEMPLATE_MAP_ALIGNMENT_OPTIONS: Array<{
  label: string;
  value: TemplateMapAlignment;
}> = [
  { value: 'center', label: 'Center' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
];

export {
  TEMPLATE_PAGE_ORIENTATION_OPTIONS,
  TEMPLATE_PAPER_SIZE_OPTIONS,
  getTemplatePageLayout,
  type TemplatePageOrientation,
  type TemplatePaperSize,
};

export function getTemplateLayoutPreset(mode: TemplatePresetId): TemplateLayoutPreset {
  if (mode === 'custom') {
    return {
      mode,
      ...TEMPLATE_LAYOUT_PRESETS.system_default,
    };
  }

  return {
    mode,
    ...TEMPLATE_LAYOUT_PRESETS[mode],
  };
}

export function getTemplateSafeArea(
  paperSize: TemplatePaperSize,
  orientation: TemplatePageOrientation,
): TemplateSafeArea {
  const pageLayout = getTemplatePageLayout(paperSize, orientation);
  const margins = GENERIC_TEMPLATE_SAFE_AREA_MARGINS_MM[paperSize];

  return {
    height: Math.max(0, pageLayout.heightMm - margins.top - margins.bottom),
    margin: Math.min(margins.top, margins.right, margins.bottom, margins.left),
    width: Math.max(0, pageLayout.widthMm - margins.left - margins.right),
    x: margins.left,
    y: margins.top,
  };
}
