import { describe, expect, it } from 'vitest';
import type { DraftingProjectTransmittal } from '@eng/shared';
import {
  buildProjectDraftingTransmittalManifest,
  clearProjectTransmittalAuditViewPreference,
  countProjectTransmittalProfileAuditProvenance,
  DEFAULT_PROJECT_TRANSMITTAL_AUDIT_VIEW,
  filterProjectTransmittalsByAuditCoverage,
  getProjectTransmittalAuditViewStorageKey,
  hasProjectTransmittalProfileAuditCoverageWarning,
  nextProjectTransmittalNumber,
  readProjectTransmittalAuditViewPreference,
  resolveProjectTransmittalProfileAuditStatus,
  serializeProjectDraftingTransmittalManifestJson,
  sortProjectTransmittalsByAuditCoverage,
  writeProjectTransmittalAuditViewPreference,
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
    expect(manifest.includedItems[0]?.profileAuditProvenance).toMatchObject({
      source: 'frozen',
      status: 'frozen',
    });
    expect(manifest.includedItems[1]?.profileAuditProvenance).toMatchObject({
      source: 'missing',
      status: 'missing',
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

  it('summarises profile audit provenance without mutating included items', () => {
    const transmittal = createProjectTransmittal();
    const legacyProfileAudit = profileAuditFixture(false);
    transmittal.payload.includedItems.push({
      drawingId: 'drawing-3',
      drawingName: 'Legacy profile audit',
      drawingSheetIssueId: 'issue-3',
      issueDate: '2026-04-24T00:00:00.000Z',
      issueNumber: 'ISS-003',
      revision: 'A',
      sheetId: 'sheet-3',
      sheetNumber: 'S-301',
      sheetTitle: 'Legacy',
      snapshotLabel: 'ISS-003 Rev A - S-301 Legacy',
      status: 'issued',
      profileAudit: legacyProfileAudit,
    });
    const before = JSON.stringify(transmittal.payload.includedItems);

    expect(resolveProjectTransmittalProfileAuditStatus(transmittal.payload.includedItems[0]!)).toBe(
      'frozen',
    );
    expect(resolveProjectTransmittalProfileAuditStatus(transmittal.payload.includedItems[1]!)).toBe(
      'missing',
    );
    expect(resolveProjectTransmittalProfileAuditStatus(transmittal.payload.includedItems[2]!)).toBe(
      'frozen',
    );
    const summary = countProjectTransmittalProfileAuditProvenance(
      transmittal.payload.includedItems,
    );

    expect(summary).toEqual({
      fallbackResolved: 0,
      frozen: 2,
      missing: 1,
    });
    expect(hasProjectTransmittalProfileAuditCoverageWarning(summary)).toBe(true);
    expect(JSON.stringify(transmittal.payload.includedItems)).toBe(before);
  });

  it('filters project transmittals by profile audit coverage', () => {
    const transmittals = createCoverageTransmittals();

    expect(
      filterProjectTransmittalsByAuditCoverage(transmittals, 'all').map((item) => item.id),
    ).toEqual(['frozen', 'fallback', 'missing', 'mixed']);
    expect(
      filterProjectTransmittalsByAuditCoverage(transmittals, 'needs_review').map((item) => item.id),
    ).toEqual(['fallback', 'missing', 'mixed']);
    expect(
      filterProjectTransmittalsByAuditCoverage(transmittals, 'frozen_only').map((item) => item.id),
    ).toEqual(['frozen']);
    expect(
      filterProjectTransmittalsByAuditCoverage(transmittals, 'fallback_resolved').map(
        (item) => item.id,
      ),
    ).toEqual(['fallback', 'mixed']);
    expect(
      filterProjectTransmittalsByAuditCoverage(transmittals, 'missing_audit').map(
        (item) => item.id,
      ),
    ).toEqual(['missing', 'mixed']);
  });

  it('sorts project transmittals by date and audit review priority without mutating records', () => {
    const transmittals = createCoverageTransmittals();
    const before = JSON.stringify(transmittals);

    expect(
      sortProjectTransmittalsByAuditCoverage(transmittals, 'newest').map((item) => item.id),
    ).toEqual(['fallback', 'missing', 'frozen', 'mixed']);
    expect(
      sortProjectTransmittalsByAuditCoverage(transmittals, 'oldest').map((item) => item.id),
    ).toEqual(['mixed', 'frozen', 'missing', 'fallback']);
    expect(
      sortProjectTransmittalsByAuditCoverage(transmittals, 'audit_review').map((item) => item.id),
    ).toEqual(['mixed', 'missing', 'fallback', 'frozen']);
    expect(JSON.stringify(transmittals)).toBe(before);
    expect(sortProjectTransmittalsByAuditCoverage(transmittals, 'newest')).not.toBe(transmittals);
  });

  it('treats legacy project transmittal payloads as missing audit coverage for filters', () => {
    const legacy = createProjectTransmittal();
    legacy.id = 'legacy';
    legacy.payload.includedItems = legacy.payload.includedItems.map((item) => ({
      drawingId: item.drawingId,
      drawingName: item.drawingName,
      drawingNumber: item.drawingNumber,
      drawingSheetIssueId: item.drawingSheetIssueId,
      issueDate: item.issueDate,
      issueNumber: item.issueNumber,
      revision: item.revision,
      sheetId: item.sheetId,
      sheetNumber: item.sheetNumber,
      sheetTitle: item.sheetTitle,
      snapshotLabel: item.snapshotLabel,
      status: item.status,
    }));

    expect(filterProjectTransmittalsByAuditCoverage([legacy], 'missing_audit')).toHaveLength(1);
    expect(filterProjectTransmittalsByAuditCoverage([legacy], 'frozen_only')).toHaveLength(0);
  });

  it('uses default project transmittal audit view preference when none is stored', () => {
    const storage = createMemoryStorage();

    expect(readProjectTransmittalAuditViewPreference('project-1', storage)).toEqual(
      DEFAULT_PROJECT_TRANSMITTAL_AUDIT_VIEW,
    );
  });

  it('restores a stored project transmittal audit view preference', () => {
    const storage = createMemoryStorage();
    writeProjectTransmittalAuditViewPreference(
      'project-1',
      {
        auditFilter: 'needs_review',
        auditSort: 'audit_review',
      },
      storage,
    );

    expect(readProjectTransmittalAuditViewPreference('project-1', storage)).toEqual({
      auditFilter: 'needs_review',
      auditSort: 'audit_review',
    });
  });

  it('falls back safely when a stored project transmittal audit view preference is invalid', () => {
    const storage = createMemoryStorage();
    const storageKey = getProjectTransmittalAuditViewStorageKey('project-1');

    storage.setItem(
      storageKey,
      JSON.stringify({
        auditFilter: 'delete_records',
        auditSort: 'oldest',
        version: 1,
      }),
    );
    expect(readProjectTransmittalAuditViewPreference('project-1', storage)).toEqual(
      DEFAULT_PROJECT_TRANSMITTAL_AUDIT_VIEW,
    );

    storage.setItem(storageKey, '{not json');
    expect(readProjectTransmittalAuditViewPreference('project-1', storage)).toEqual(
      DEFAULT_PROJECT_TRANSMITTAL_AUDIT_VIEW,
    );
  });

  it('writes and clears project transmittal audit view preference without touching records', () => {
    const storage = createMemoryStorage();
    const transmittal = createProjectTransmittal();
    const before = JSON.stringify(transmittal);

    writeProjectTransmittalAuditViewPreference(
      'project-1',
      {
        auditFilter: 'missing_audit',
        auditSort: 'oldest',
      },
      storage,
    );

    expect(storage.getItem(getProjectTransmittalAuditViewStorageKey('project-1'))).toContain(
      'missing_audit',
    );
    expect(readProjectTransmittalAuditViewPreference('project-1', storage)).toEqual({
      auditFilter: 'missing_audit',
      auditSort: 'oldest',
    });

    clearProjectTransmittalAuditViewPreference('project-1', storage);
    expect(storage.getItem(getProjectTransmittalAuditViewStorageKey('project-1'))).toBeNull();
    expect(readProjectTransmittalAuditViewPreference('project-1', storage)).toEqual(
      DEFAULT_PROJECT_TRANSMITTAL_AUDIT_VIEW,
    );
    expect(JSON.stringify(transmittal)).toBe(before);
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
          profileAuditProvenance: {
            source: 'frozen',
            status: 'frozen',
            drawingId: 'drawing-1',
            sheetId: 'sheet-1',
            sourceIssueId: 'issue-1',
            frozenAt: '2026-04-24T00:00:00.000Z',
          },
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
          profileAuditProvenance: {
            source: 'missing',
            status: 'missing',
            drawingId: 'drawing-2',
            sheetId: 'sheet-2',
            sourceIssueId: 'issue-2',
            warning: 'No frozen profile audit metadata is stored on this issued sheet snapshot.',
          },
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

function createCoverageTransmittals(): DraftingProjectTransmittal[] {
  const source = createProjectTransmittal();
  const frozenItem = source.payload.includedItems[0]!;
  const missingItem = source.payload.includedItems[1]!;
  const fallbackItem = {
    ...missingItem,
    drawingId: 'drawing-fallback',
    drawingSheetIssueId: 'issue-fallback',
    profileAuditProvenance: {
      source: 'fallback_resolved' as const,
      status: 'fallback_resolved' as const,
      drawingId: 'drawing-fallback',
      sheetId: 'sheet-fallback',
      sourceIssueId: 'issue-fallback',
    },
    sheetId: 'sheet-fallback',
  };

  return [
    transmittalWithItems('frozen', 'TRN-001', '2026-04-24T01:00:00.000Z', [frozenItem]),
    transmittalWithItems('fallback', 'TRN-002', '2026-04-26T01:00:00.000Z', [fallbackItem]),
    transmittalWithItems('missing', 'TRN-003', '2026-04-25T01:00:00.000Z', [missingItem]),
    transmittalWithItems('mixed', 'TRN-004', '2026-04-23T01:00:00.000Z', [
      frozenItem,
      fallbackItem,
      missingItem,
    ]),
  ];
}

function transmittalWithItems(
  id: string,
  transmittalNumber: string,
  updatedAt: string,
  includedItems: DraftingProjectTransmittal['payload']['includedItems'],
): DraftingProjectTransmittal {
  const transmittal = createProjectTransmittal();
  transmittal.id = id;
  transmittal.transmittalNumber = transmittalNumber;
  transmittal.updatedAt = updatedAt;
  transmittal.payload = {
    ...transmittal.payload,
    includedItems: includedItems.map((item) => ({ ...item })),
  };
  return transmittal;
}

function createMemoryStorage(): Pick<Storage, 'getItem' | 'removeItem' | 'setItem'> {
  const values = new Map<string, string>();

  return {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    removeItem(key: string) {
      values.delete(key);
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
  };
}

function profileAuditFixture(includeProvenance = true) {
  return {
    schemaVersion: 'drafting.profile-audit.v1' as const,
    ...(includeProvenance
      ? {
          provenance: {
            source: 'frozen' as const,
            status: 'frozen' as const,
            drawingId: 'drawing-1',
            sheetId: 'sheet-1',
            sourceIssueId: 'issue-1',
            frozenAt: '2026-04-24T00:00:00.000Z',
          },
        }
      : {}),
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
