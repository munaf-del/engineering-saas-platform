import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { DraftingProjectTransmittal } from '@eng/shared';
import {
  ProjectTransmittalProfileAuditCoverage,
  ProjectTransmittalRegisterAuditControls,
} from './project-drafting-transmittals-register';

describe('project drafting transmittal register profile audit coverage', () => {
  it('shows frozen, fallback, and missing coverage counts with a warning indicator', () => {
    const transmittal = createProjectTransmittal();
    const before = JSON.stringify(transmittal);

    const markup = renderToStaticMarkup(
      <ProjectTransmittalProfileAuditCoverage transmittal={transmittal} />,
    );

    expect(markup).toContain('Frozen: 1');
    expect(markup).toContain('Fallback: 1');
    expect(markup).toContain('Missing: 1');
    expect(markup).toContain('Review audit coverage');
    expect(markup).toContain(
      'Some included sheets rely on fallback-resolved or missing profile audit metadata. Open preview for details.',
    );
    expect(JSON.stringify(transmittal)).toBe(before);
  });

  it('renders legacy payloads as missing coverage without crashing', () => {
    const transmittal = createProjectTransmittal();
    transmittal.payload.includedItems = transmittal.payload.includedItems.map((item) => ({
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

    const markup = renderToStaticMarkup(
      <ProjectTransmittalProfileAuditCoverage transmittal={transmittal} />,
    );

    expect(markup).toContain('Frozen: 0');
    expect(markup).toContain('Fallback: 0');
    expect(markup).toContain('Missing: 3');
    expect(markup).toContain('Review audit coverage');
  });

  it('treats stored profileAudit without explicit provenance as frozen coverage', () => {
    const transmittal = createProjectTransmittal();
    const legacyProfileAudit = profileAuditFixture(false);
    transmittal.payload.includedItems = [
      {
        drawingId: 'drawing-legacy',
        drawingName: 'Legacy stored audit',
        drawingSheetIssueId: 'issue-legacy',
        issueDate: '2026-04-24T00:00:00.000Z',
        issueNumber: 'ISS-LEG',
        revision: 'A',
        sheetId: 'sheet-legacy',
        sheetNumber: 'S-LEG',
        sheetTitle: 'Legacy',
        snapshotLabel: 'ISS-LEG Rev A - S-LEG Legacy',
        status: 'issued',
        profileAudit: legacyProfileAudit,
      },
    ];

    const markup = renderToStaticMarkup(
      <ProjectTransmittalProfileAuditCoverage transmittal={transmittal} />,
    );

    expect(markup).toContain('Frozen: 1');
    expect(markup).toContain('Fallback: 0');
    expect(markup).toContain('Missing: 0');
    expect(markup).not.toContain('Review audit coverage');
  });

  it('renders compact audit filter and sort controls', () => {
    const markup = renderToStaticMarkup(
      <ProjectTransmittalRegisterAuditControls
        auditFilter="needs_review"
        onAuditFilterChange={() => undefined}
        onSortModeChange={() => undefined}
        sortMode="audit_review"
      />,
    );

    expect(markup).toContain('Audit filter');
    expect(markup).toContain('project-transmittal-audit-filter');
    expect(markup).toContain('Sort');
    expect(markup).toContain('project-transmittal-audit-sort');
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
          drawingSheetIssueId: 'issue-1',
          issueDate: '2026-04-24T00:00:00.000Z',
          issueNumber: 'ISS-001',
          revision: 'B',
          sheetId: 'sheet-1',
          sheetNumber: 'S-101',
          sheetTitle: 'Plan',
          snapshotLabel: 'ISS-001 Rev B - S-101 Plan',
          status: 'issued',
          profileAuditProvenance: {
            frozenAt: '2026-04-24T00:00:00.000Z',
            source: 'frozen',
            status: 'frozen',
            drawingId: 'drawing-1',
            sheetId: 'sheet-1',
            sourceIssueId: 'issue-1',
          },
        },
        {
          drawingId: 'drawing-2',
          drawingName: 'Retention details',
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
            source: 'fallback_resolved',
            status: 'fallback_resolved',
            drawingId: 'drawing-2',
            sheetId: 'sheet-2',
            sourceIssueId: 'issue-2',
          },
        },
        {
          drawingId: 'drawing-3',
          drawingName: 'Drainage details',
          drawingSheetIssueId: 'issue-3',
          issueDate: '2026-04-24T00:00:00.000Z',
          issueNumber: 'ISS-003',
          revision: 'A',
          sheetId: 'sheet-3',
          sheetNumber: 'S-301',
          sheetTitle: 'Drainage',
          snapshotLabel: 'ISS-003 Rev A - S-301 Drainage',
          status: 'issued',
          profileAuditProvenance: {
            source: 'missing',
            status: 'missing',
            drawingId: 'drawing-3',
            sheetId: 'sheet-3',
            sourceIssueId: 'issue-3',
          },
        },
      ],
      issuedAt: '2026-04-24T01:00:00.000Z',
      issuedBy: 'Avery Drafter',
      issuedTo: ['client@example.com'],
      manifestSignature: 'sig-12345678',
      provenanceSummary: {
        drawingCount: 3,
        frozenIssueCount: 3,
        sheetCount: 3,
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
