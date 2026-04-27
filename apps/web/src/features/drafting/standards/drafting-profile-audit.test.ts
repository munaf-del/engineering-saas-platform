import { describe, expect, it } from 'vitest';
import { createEmptyDraftingModel } from '@eng/shared';
import { createDraftingDrawingSheetDefinition } from '../sheets/drafting-drawing-sheet-utils';
import {
  buildDraftingSheetProfileAudit,
  DRAFTING_PROFILE_AUDIT_FALLBACK_WARNING,
  DRAFTING_PROFILE_AUDIT_WARNING,
  resolveDraftingSheetProfileAuditForIssue,
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
    expect(audit.provenance).toMatchObject({
      source: 'fallback_resolved',
      status: 'fallback_resolved',
    });
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

  it('marks stored issue audits as frozen provenance', () => {
    const model = createEmptyDraftingModel('profile-audit-frozen');
    const sheet = createDraftingDrawingSheetDefinition({ id: 'sheet-audit' });
    const lockedProfileAudit = buildDraftingSheetProfileAudit({ model, sheet });

    const audit = resolveDraftingSheetProfileAuditForIssue({
      issue: {
        createdAt: '2026-04-24T00:00:00.000Z',
        id: 'issue-1',
        issueDate: '2026-04-24T00:00:00.000Z',
      },
      lockedProfileAudit,
      model,
      sheet,
    });

    expect(audit.provenance).toMatchObject({
      frozenAt: '2026-04-24T00:00:00.000Z',
      sheetId: 'sheet-audit',
      source: 'frozen',
      sourceIssueId: 'issue-1',
      status: 'frozen',
    });
  });

  it('marks legacy issue audits as fallback resolved provenance without mutating the issue', () => {
    const model = createEmptyDraftingModel('profile-audit-legacy');
    const sheet = createDraftingDrawingSheetDefinition({ id: 'legacy-sheet' });

    const audit = resolveDraftingSheetProfileAuditForIssue({
      issue: {
        id: 'legacy-issue',
        issueDate: '2026-04-24T00:00:00.000Z',
      },
      model,
      sheet,
    });

    expect(audit.provenance).toMatchObject({
      sheetId: 'legacy-sheet',
      source: 'fallback_resolved',
      sourceIssueId: 'legacy-issue',
      status: 'fallback_resolved',
      warning: DRAFTING_PROFILE_AUDIT_FALLBACK_WARNING,
    });
  });
});
