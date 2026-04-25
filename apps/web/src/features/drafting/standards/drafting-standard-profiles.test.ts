import { describe, expect, it } from 'vitest';
import { createEmptyDraftingModel } from '@eng/shared';
import {
  DRAFTING_OBJECT_LINE_ROLE_MAP,
  DRAFTING_SCALE_PRESETS,
  DRAFTING_STANDARD_PROFILES,
  getDraftingStandardProfile,
} from './drafting-standard-profiles';
import {
  resolveDraftingLegacyLineWeight,
  resolveDraftingLineStyle,
  resolveDraftingPaperLineStyle,
  resolveDraftingTextHeightMm,
} from './drafting-style-resolver';

describe('drafting standard profiles', () => {
  it('loads AS 1100-style general, structural, and survey profiles', () => {
    expect(DRAFTING_STANDARD_PROFILES.map((profile) => profile.id)).toEqual([
      'as1100-general',
      'as1100-structural',
      'as1100-survey',
    ]);
    expect(getDraftingStandardProfile('as1100-structural').sourceBasis).toEqual([
      'AS/NZS 1100.501',
      'AS 1100.101',
    ]);
    expect(DRAFTING_SCALE_PRESETS).toContain('1:100');
    expect(DRAFTING_SCALE_PRESETS).toContain('1:1000');
  });

  it('resolves verified AS 1100.101 character-height defaults by sheet size', () => {
    const model = createEmptyDraftingModel('profile-text');

    expect(
      resolveDraftingTextHeightMm({
        role: 'drawingTitle',
        setup: model.drawingSetup,
        sheetSize: 'A0',
      }),
    ).toBe(5);
    expect(
      resolveDraftingTextHeightMm({
        role: 'dimension',
        setup: { ...model.drawingSetup!, dimensionTextHeightMm: 3.5 },
        sheetSize: 'A0',
      }),
    ).toBe(3.5);
    expect(getDraftingStandardProfile('as1100-general').textStyles.drawingTitle.a0B1HeightMm).toBe(
      7,
    );
  });

  it('maps implemented drafting object types to profile line roles', () => {
    expect(DRAFTING_OBJECT_LINE_ROLE_MAP.pile).toBe('objectVisible');
    expect(DRAFTING_OBJECT_LINE_ROLE_MAP.dimension_chain).toBe('dimensionLine');
    expect(DRAFTING_OBJECT_LINE_ROLE_MAP.borehole).toBe('surveyControl');
    expect(DRAFTING_OBJECT_LINE_ROLE_MAP.service_crossing).toBe('objectHidden');
  });

  it('resolves editor and sheet line weights without coupling to canvas zoom', () => {
    const model = createEmptyDraftingModel('profile-lines');
    const editorLine = resolveDraftingLineStyle({
      role: 'surveyControl',
      setup: { ...model.drawingSetup!, activeStandardProfileId: 'as1100-survey' },
    });
    const paperLine = resolveDraftingPaperLineStyle({
      role: 'surveyControl',
      setup: { ...model.drawingSetup!, activeStandardProfileId: 'as1100-survey' },
    });

    expect(editorLine.lineWeightMm).toBe(0.5);
    expect(editorLine.editorStrokeWidth).toBeGreaterThan(paperLine.editorStrokeWidth);
    expect(paperLine.editorStrokeWidth).toBe(0.5);
  });

  it('preserves object-level line-weight overrides while defaulting through profile roles', () => {
    const model = createEmptyDraftingModel('profile-overrides');
    const profileDefault = resolveDraftingLegacyLineWeight({
      object: { type: 'pile', style: {} },
      setup: model.drawingSetup,
    });
    const override = resolveDraftingLegacyLineWeight({
      object: { type: 'pile', style: { lineWeightMm: 0.7 } },
      setup: model.drawingSetup,
    });

    expect(profileDefault).toBeCloseTo(0.35 / 0.18);
    expect(override).toBeCloseTo(0.7 / 0.18);
  });
});
