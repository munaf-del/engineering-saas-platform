import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DRAFTING_TEXT_FONT_FAMILY,
  DEFAULT_DRAFTING_TEXT_HEIGHT_MM,
  DRAFTING_EXTENDED_TEXT_HEIGHT_PRESETS_MM,
  DRAFTING_TEXT_FONT_FAMILIES,
  DRAFTING_TEXT_HEIGHT_PRESETS_MM,
  DRAFTING_TEXT_STANDARD_PROFILE_ID,
  normalizeDraftingTextHeightMm,
  toDraftingFontStack,
} from './drafting-text-style-presets';

describe('drafting text style presets', () => {
  it('provides one AS1100-informed text profile without bundling font files', () => {
    expect(DRAFTING_TEXT_STANDARD_PROFILE_ID).toBe('AS1100');
    expect(DRAFTING_TEXT_HEIGHT_PRESETS_MM).toEqual([2.5, 3.5, 5, 7, 10, 14, 20]);
    expect(DRAFTING_EXTENDED_TEXT_HEIGHT_PRESETS_MM).toEqual([2.5, 3.5, 5, 7, 10, 14, 20]);
    expect(DEFAULT_DRAFTING_TEXT_HEIGHT_MM).toBe(2.5);
    expect(DEFAULT_DRAFTING_TEXT_FONT_FAMILY).toBe('ISOCP');
    expect(DRAFTING_TEXT_FONT_FAMILIES).toEqual(
      expect.arrayContaining(['ISOCP', 'Arial', 'Arial Narrow', 'Inter', 'monospace']),
    );
    expect(toDraftingFontStack('ISOCP')).toContain('Arial Narrow');
    expect(toDraftingFontStack()).not.toMatch(/\.ttf|\.otf|\.woff/i);
  });

  it('normalizes custom text heights while keeping project-editable larger sizes', () => {
    expect(normalizeDraftingTextHeightMm(undefined)).toBe(DEFAULT_DRAFTING_TEXT_HEIGHT_MM);
    expect(normalizeDraftingTextHeightMm(-1, 5)).toBe(5);
    expect(normalizeDraftingTextHeightMm(14)).toBe(14);
  });
});
