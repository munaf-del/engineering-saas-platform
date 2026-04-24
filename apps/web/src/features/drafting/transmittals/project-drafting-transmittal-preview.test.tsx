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
      issuedAt: status === 'issued' ? '2026-04-24T01:00:00.000Z' : undefined,
      issuedBy: 'Avery Drafter',
      issuedTo: ['client@example.com'],
      manifestSignature: status === 'issued' ? 'sig-12345678' : undefined,
      provenanceSummary: {
        drawingCount: 2,
        frozenIssueCount: 2,
        sheetCount: 2,
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
