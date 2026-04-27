import { describe, expect, it } from 'vitest';
import type { DraftingProjectTransmittal } from '@eng/shared';
import {
  buildProjectDraftingTransmittalManifest,
  nextProjectTransmittalNumber,
  serializeProjectDraftingTransmittalManifestJson,
} from './project-drafting-transmittal-utils';

describe('project drafting transmittal helpers', () => {
  it('builds a metadata-only manifest with multi-drawing references', () => {
    const manifest = buildProjectDraftingTransmittalManifest(createProjectTransmittal());

    expect(manifest.manifestSchemaVersion).toBe('drafting.project-transmittal.manifest.v1');
    expect(manifest.includedItems).toEqual([
      expect.objectContaining({
        drawingId: 'drawing-1',
        drawingName: 'Basement shoring',
        drawingSheetIssueId: 'issue-1',
        sheetId: 'sheet-1',
      }),
      expect.objectContaining({
        drawingId: 'drawing-2',
        drawingName: 'Retention details',
        drawingSheetIssueId: 'issue-2',
        sheetId: 'sheet-2',
      }),
    ]);
    expect(manifest.provenanceSummary).toMatchObject({
      drawingCount: 2,
      frozenIssueCount: 2,
      sheetCount: 2,
    });
    expect(manifest.includedItems[0]?.profileAudit).toMatchObject({
      activeProfileId: 'as1100-structural',
      schemaVersion: 'drafting.profile-audit.v1',
    });
  });

  it('manifest JSON excludes sensitive and binary-like fields', () => {
    const transmittal = createProjectTransmittal();
    const item = transmittal.payload.includedItems[0] as Record<string, unknown>;
    item.storagePath = '/private/project/evidence.pdf';
    item.rawPdfBytes = 'JVBERi0xLjQ=';
    item.omnidotsToken = 'secret-token';

    const json = serializeProjectDraftingTransmittalManifestJson(
      buildProjectDraftingTransmittalManifest(transmittal),
    );

    expect(json).toContain('drawing-1');
    expect(json).not.toContain('storagePath');
    expect(json).not.toContain('rawPdfBytes');
    expect(json).not.toContain('secret-token');
  });

  it('suggests the next project transmittal number', () => {
    expect(nextProjectTransmittalNumber([createProjectTransmittal()])).toBe('TRN-002');
  });
});

function createProjectTransmittal(): DraftingProjectTransmittal {
  return {
    id: 'transmittal-1',
    projectId: 'project-1',
    organisationId: 'org-1',
    transmittalNumber: 'TRN-001',
    status: 'issued',
    payload: {
      cc: [],
      includedItems: [
        {
          drawingId: 'drawing-1',
          drawingName: 'Basement shoring',
          drawingNumber: 'DR-101',
          drawingSheetIssueId: 'issue-1',
          issueDate: '2026-04-24T00:00:00.000Z',
          issueNumber: 'ISS-001',
          revision: 'B',
          sheetId: 'sheet-1',
          sheetNumber: 'S-101',
          sheetTitle: 'Plan',
          snapshotLabel: 'ISS-001 Rev B - S-101 Plan',
          status: 'issued',
          profileAudit: profileAuditFixture(),
        },
        {
          drawingId: 'drawing-2',
          drawingName: 'Retention details',
          drawingNumber: 'DR-201',
          drawingSheetIssueId: 'issue-2',
          issueDate: '2026-04-24T00:00:00.000Z',
          issueNumber: 'ISS-002',
          revision: 'A',
          sheetId: 'sheet-2',
          sheetNumber: 'S-201',
          sheetTitle: 'Details',
          snapshotLabel: 'ISS-002 Rev A - S-201 Details',
          status: 'issued',
        },
      ],
      issuedAt: '2026-04-24T01:00:00.000Z',
      issuedBy: 'Avery Drafter',
      issuedTo: ['client@example.com'],
      manifestSignature: 'sig-12345678',
      provenanceSummary: {
        drawingCount: 2,
        frozenIssueCount: 2,
        sheetCount: 2,
        source: 'drafting_drawing_sheet_issue_snapshots',
      },
      purpose: 'For information',
      status: 'issued',
      title: 'Multi drawing package',
      warningSummary: [],
    },
    createdById: 'user-1',
    createdAt: '2026-04-24T00:00:00.000Z',
    updatedAt: '2026-04-24T01:00:00.000Z',
  };
}

function profileAuditFixture() {
  return {
    schemaVersion: 'drafting.profile-audit.v1' as const,
    warning: 'AS1100-informed profile; not a certification or full compliance claim.',
    activeProfileId: 'as1100-structural' as const,
    profileName: 'AS/NZS 1100 Structural',
    profileVersion: '2026-04-as1100-style-v1',
    disciplineProfileId: 'structural' as const,
    lineWeightTableId: 'as1100-style-lineweights-v1',
    lineStyleTableId: 'as1100-style-lines-v1',
    sheetSize: 'A3',
    plottedScale: '1:100',
    lineWeightScale: 1,
    textScaleMode: 'model' as const,
    lineRoles: [
      {
        role: 'OBJECT_OUTLINE',
        resolvedRole: 'objectVisible',
        lineType: 'solid',
        editorStrokeWidthPx: 1.4,
        sheetLineWeightMm: 0.35,
      },
    ],
    textPresets: [
      {
        preset: 'DIMENSION',
        textRole: 'dimension',
        paperHeightMm: 2.5,
        editorFontSizeModelUnits: 175,
        sheetFontSizeMm: 2.5,
      },
    ],
    dimensionStyle: {
      extensionRole: 'dimension',
      labelGapModelUnits: 340,
      lineRole: 'dimensionLine',
      sheetLineWeightMm: 0.18,
      textHeightMm: 2.5,
      textPreset: 'DIMENSION',
      tickLengthModelUnits: 210,
    },
    leaderStyle: {
      colorRole: 'leaderLine',
      lineRole: 'leaderLine',
      maxLeaderOpacity: 0.68,
      sheetLineWeightMm: 0.18,
      textHeightMm: 2.5,
      textPreset: 'ANNOTATION',
    },
  };
}
