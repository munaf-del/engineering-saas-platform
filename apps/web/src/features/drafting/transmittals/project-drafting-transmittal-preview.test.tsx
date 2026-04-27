import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { DraftingProjectTransmittal, Project } from '@eng/shared';
import { ProjectDraftingTransmittalPreview } from './project-drafting-transmittal-preview';

describe('project drafting transmittal preview', () => {
  it('lists multiple drawings and marks issued transmittals read-only', () => {
    const markup = renderToStaticMarkup(
      <ProjectDraftingTransmittalPreview
        project={createProject()}
        projectId="project-1"
        transmittal={createProjectTransmittal('issued')}
      />,
    );

    expect(markup).toContain('data-testid="project-drafting-transmittal-preview"');
    expect(markup).toContain('Project Drawing Transmittal');
    expect(markup).toContain('TRN-001');
    expect(markup).toContain('Basement shoring');
    expect(markup).toContain('Retention details');
    expect(markup).toContain('S-101');
    expect(markup).toContain('S-201');
    expect(markup).toContain('read-only locked');
    expect(markup).toContain('sig-12345678');
    expect(markup).toContain('Profile Audit');
    expect(markup).toContain('Frozen profile audit');
    expect(markup).toContain('Fallback resolved profile audit');
    expect(markup).toContain('Missing profile audit');
    expect(markup).toContain('Frozen: 1');
    expect(markup).toContain('Fallback: 1');
    expect(markup).toContain('Missing: 1');
    expect(markup).toContain('fallback-resolved profile audit metadata');
  });

  it('shows draft project transmittals as editable', () => {
    const markup = renderToStaticMarkup(
      <ProjectDraftingTransmittalPreview
        project={createProject()}
        projectId="project-1"
        transmittal={createProjectTransmittal('draft')}
      />,
    );

    expect(markup).toContain('draft / editable draft');
    expect(markup).toContain('can still be edited from the register');
  });

  it('renders legacy project transmittal payloads without profile audit provenance', () => {
    const transmittal = createProjectTransmittal('issued');
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
      <ProjectDraftingTransmittalPreview
        project={createProject()}
        projectId="project-1"
        transmittal={transmittal}
      />,
    );

    expect(markup).toContain('Missing profile audit');
    expect(markup).toContain('Frozen: 0');
    expect(markup).toContain('Fallback: 0');
    expect(markup).toContain('Missing: 3');
  });
});

function createProject(): Project {
  return {
    id: 'project-1',
    organisationId: 'org-1',
    name: 'NORTH SYDNEY',
    code: 'NSW-001',
    description: undefined,
    status: 'active',
    standardsProfileId: undefined,
    metadata: {},
    createdAt: '2026-04-24T00:00:00.000Z',
    updatedAt: '2026-04-24T00:00:00.000Z',
  };
}

function createProjectTransmittal(status: 'draft' | 'issued'): DraftingProjectTransmittal {
  return {
    id: 'transmittal-1',
    projectId: 'project-1',
    organisationId: 'org-1',
    transmittalNumber: 'TRN-001',
    status,
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
            source: 'fallback_resolved',
            status: 'fallback_resolved',
            drawingId: 'drawing-2',
            sheetId: 'sheet-2',
            sourceIssueId: 'issue-2',
            warning: 'Fallback-resolved profile audit may differ from the original issued output.',
          },
        },
        {
          drawingId: 'drawing-3',
          drawingName: 'Drainage details',
          drawingNumber: 'DR-301',
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
            warning: 'No frozen profile audit metadata is stored on this issued sheet snapshot.',
          },
        },
      ],
      issuedAt: status === 'issued' ? '2026-04-24T01:00:00.000Z' : undefined,
      issuedBy: 'Avery Drafter',
      issuedTo: ['client@example.com'],
      manifestSignature: status === 'issued' ? 'sig-12345678' : undefined,
      provenanceSummary: {
        drawingCount: 3,
        frozenIssueCount: 3,
        sheetCount: 3,
        source: 'drafting_drawing_sheet_issue_snapshots',
      },
      purpose: 'For information',
      status,
      title: 'Multi drawing package',
      warningSummary: [],
    },
    createdById: 'user-1',
    createdAt: '2026-04-24T00:00:00.000Z',
    updatedAt: '2026-04-24T01:00:00.000Z',
  };
}
