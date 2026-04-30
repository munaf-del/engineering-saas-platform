export const DRAFTING_TEXT_STANDARD_PROFILE_ID = 'AS1100' as const;

export const DRAFTING_TEXT_HEIGHT_PRESETS_MM = [2.5, 3.5, 5, 7] as const;

export const DRAFTING_EXTENDED_TEXT_HEIGHT_PRESETS_MM = [
  ...DRAFTING_TEXT_HEIGHT_PRESETS_MM,
  10,
  14,
] as const;

export const DRAFTING_TEXT_FONT_FAMILIES = [
  'ISOCP',
  'Arial',
  'Arial Narrow',
  'Inter',
  'monospace',
] as const;

export const DEFAULT_DRAFTING_TEXT_FONT_FAMILY = 'ISOCP';
export const DEFAULT_DRAFTING_TEXT_HEIGHT_MM = 2.5;

export type DraftingTextFontFamily = (typeof DRAFTING_TEXT_FONT_FAMILIES)[number];

export function toDraftingFontStack(fontFamily?: string) {
  const family = fontFamily?.trim() || DEFAULT_DRAFTING_TEXT_FONT_FAMILY;
  if (family === 'monospace') {
    return 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
  }

  return `${quoteFontFamily(family)}, "Arial Narrow", Arial, Helvetica, sans-serif`;
}

export function normalizeDraftingTextHeightMm(
  value: unknown,
  fallback = DEFAULT_DRAFTING_TEXT_HEIGHT_MM,
) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
}

function quoteFontFamily(fontFamily: string) {
  return /\s/.test(fontFamily) ? `"${fontFamily}"` : fontFamily;
}
