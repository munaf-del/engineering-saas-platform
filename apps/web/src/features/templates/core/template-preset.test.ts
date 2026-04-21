import { describe, expect, it } from 'vitest';
import { getTemplateLayoutPreset, getTemplateSafeArea } from './template-preset';

describe('template presets', () => {
  it('returns compatibility defaults for custom mode', () => {
    expect(getTemplateLayoutPreset('custom')).toEqual({
      mode: 'custom',
      showLegend: true,
      showNotes: true,
      showSheetContext: true,
      titleBlockPosition: 'bottom_right',
    });
  });

  it('returns a generic safe area without depending on AS preset state', () => {
    expect(getTemplateSafeArea('a4', 'landscape')).toEqual({
      height: 190,
      margin: 10,
      width: 277,
      x: 10,
      y: 10,
    });
  });
});
