import { describe, expect, it } from 'vitest';
import { createEmptyDraftingModel } from '@eng/shared';
import { createDraftingDrawingSheetDefinition } from '../sheets/drafting-drawing-sheet-utils';
import {
  buildDraftingSheetProfileAudit,
  DRAFTING_PROFILE_AUDIT_WARNING,
} from './drafting-profile-audit';

describe('drafting profile audit metadata', () => {
  it('resolves default profile values for export and sheet review', () => {
    const model = createEmptyDraftingModel('profile-audit-default');
    const audit = buildDraftingSheetProfileAudit({ model });

    expect(audit).toMatchObject({
      activeProfileId: 'as1100-general',
      disciplineProfileId: 'general',
      profileName: 'AS 1100 General',
      schemaVersion: 'drafting.profile-audit.v1',
      warning: DRAFTING_PROFILE_AUDIT_WARNING,
    });
    expect(audit.lineRoles.map((role) => role.role)).toContain('OBJECT_OUTLINE');
    expect(audit.textPresets.map((preset) => preset.preset)).toContain('DIMENSION');
    expect(audit.dimensionStyle.sheetLineWeightMm).toBeGreaterThan(0);
    expect(audit.leaderStyle.sheetLineWeightMm).toBeGreaterThan(0);
  });

  it('reflects drawing setup overrides and sheet scale metadata', () => {
    const model = createEmptyDraftingModel('profile-audit-overrides');
    model.drawingSetup = {
      ...model.drawingSetup!,
      activeStandardProfileId: 'as1100-structural',
      disciplineProfileId: 'structural',
      outputLineWeightScale: 1.5,
      graphics: {
        ...model.drawingSetup!.graphics,
        textScaleMode: 'screen_constant',
      },
    };
    const sheet = {
      ...createDraftingDrawingSheetDefinition({
        id: 'sheet-audit',
      }),
      pageSize: 'a3' as const,
      scaleLabel: '1:50',
    };

    const audit = buildDraftingSheetProfileAudit({ model, sheet });

    expect(audit).toMatchObject({
      activeProfileId: 'as1100-structural',
      disciplineProfileId: 'structural',
      lineWeightScale: 1.5,
      plottedScale: '1:50',
      sheetSize: 'A3',
      textScaleMode: 'screen_constant',
    });
    expect(audit.lineRoles.find((role) => role.role === 'OBJECT_OUTLINE')?.sheetLineWeightMm).toBe(
      0.525,
    );
  });
});
