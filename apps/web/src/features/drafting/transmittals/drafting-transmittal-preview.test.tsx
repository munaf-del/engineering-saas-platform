import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createEmptyDraftingModel, type DraftingDrawing, type Project } from '@eng/shared';
import { createDraftingDrawingSheetIssueSnapshot } from '../sheets/drafting-drawing-sheet-issue-utils';
import { createDraftingDrawingSheetDefinition } from '../sheets/drafting-drawing-sheet-utils';
import {
  addDrawingTransmittal,
  attachDraftingTransmittalPdfEvidence,
  createDraftingTransmittal,
  issueDraftingTransmittal,
} from './drafting-transmittal-utils';
import { DraftingTransmittalPreview } from './drafting-transmittal-preview';

const now = '2026-04-24T00:00:00.000Z';

describe('drafting transmittal preview', () => {
  it('maps a transmittal to a print-friendly cover sheet manifest', () => {
    const model = createEmptyDraftingModel('drawing-1');
    model.titleBlock = {
      drawingTitle: 'Retention Plan',
      projectName: 'NORTH SYDNEY',
    };
    model.revisionBlock = {
      currentRevision: 'B',
      revisions: [],
    };
    model.drawingSheets.push(
      createDraftingDrawingSheetDefinition({
        id: 'sheet-1',
        name: 'Geometry Sheet 1',
        now,
        sheetNumber: 'S-101',
        title: 'Retention Plan',
      }),
    );
    const issue = createDraftingDrawingSheetIssueSnapshot(model, {
      id: 'issue-1',
      issueDate: now,
      issueNumber: 'ISS-001',
      purpose: 'For review',
      revision: 'B',
      sheetIds: ['sheet-1'],
      status: 'issued',
    });
    model.drawingSheetIssues.push(issue);
    model.drawingTransmittals = [];
    const draft = createDraftingTransmittal(model, {
      id: 'transmittal-1',
      includedDrawingSheetIssueIds: ['issue-1'],
      issueDate: now,
      issuedBy: 'Avery Drafter',
      issuedTo: ['client@example.com'],
      purpose: 'For information',
      title: 'Drawing package',
      transmittalNumber: 'TRN-001',
    });
    const issuedModel = issueDraftingTransmittal({
      issuedAt: '2026-04-24T01:00:00.000Z',
      issuedBy: 'Avery Drafter',
      model: addDrawingTransmittal(model, draft),
      transmittalId: 'transmittal-1',
    });
    const withEvidence = attachDraftingTransmittalPdfEvidence({
      attachedAt: '2026-04-24T02:00:00.000Z',
      attachedBy: 'Avery Drafter',
      evidence: {
        artifactDocumentId: 'document-1',
        artifactFileName: 'TRN-001.pdf',
        artifactMimeType: 'application/pdf',
        artifactNotes: 'Saved from browser print.',
        artifactSizeBytes: 12345,
        artifactSource: 'browser_print_pdf',
        artifactUploadedAt: '2026-04-24T01:30:00.000Z',
        artifactUploadedBy: 'user-1',
      },
      model: issuedModel,
      transmittalId: 'transmittal-1',
    });
    const transmittal = withEvidence.drawingTransmittals[0]!;

    const markup = renderToStaticMarkup(
      <DraftingTransmittalPreview
        drawing={createDrawing(withEvidence)}
        project={createProject()}
        projectId="project-1"
        rootTemplates={[]}
        transmittal={transmittal}
      />,
    );

    expect(markup).toContain('data-testid="drafting-transmittal-preview"');
    expect(markup).toContain('TRN-001');
    expect(markup).toContain('NORTH SYDNEY');
    expect(markup).toContain('S-101');
    expect(markup).toContain('ISS-001 Rev B - S-101 Geometry Sheet 1');
    expect(markup).toContain('Browser Print / Save PDF');
    expect(markup).toContain('read-only locked');
    expect(markup).toContain('issue-transmittal-1-20260424T010000000Z');
    expect(markup).toContain('sig-');
    expect(markup).toContain('ev-');
    expect(markup).toContain('TRN-001.pdf');
    expect(markup).toContain('application/pdf');
    expect(markup).toContain('Evidence events');
  });

  it('warns when previewing a draft transmittal', () => {
    const model = createEmptyDraftingModel('drawing-1');
    model.drawingSheets.push(
      createDraftingDrawingSheetDefinition({
        id: 'sheet-1',
        name: 'Geometry Sheet 1',
        now,
        sheetNumber: 'S-101',
        title: 'Retention Plan',
      }),
    );
    model.drawingSheetIssues.push(
      createDraftingDrawingSheetIssueSnapshot(model, {
        id: 'issue-1',
        issueDate: now,
        issueNumber: 'ISS-001',
        purpose: 'For review',
        revision: 'B',
        sheetIds: ['sheet-1'],
        status: 'issued',
      }),
    );
    const transmittal = createDraftingTransmittal(model, {
      id: 'transmittal-1',
      includedDrawingSheetIssueIds: ['issue-1'],
      issueDate: now,
      purpose: 'For information',
      title: 'Draft package',
      transmittalNumber: 'TRN-001',
    });
    model.drawingTransmittals.push(transmittal);

    const markup = renderToStaticMarkup(
      <DraftingTransmittalPreview
        drawing={createDrawing(model)}
        project={createProject()}
        projectId="project-1"
        rootTemplates={[]}
        transmittal={transmittal}
      />,
    );

    expect(markup).toContain('draft / editable draft');
    expect(markup).toContain('This transmittal is draft and is not issued evidence.');
  });

  it('warns when an issued transmittal has no PDF evidence attached', () => {
    const model = createEmptyDraftingModel('drawing-1');
    model.drawingSheets.push(
      createDraftingDrawingSheetDefinition({
        id: 'sheet-1',
        name: 'Geometry Sheet 1',
        now,
        sheetNumber: 'S-101',
        title: 'Retention Plan',
      }),
    );
    model.drawingSheetIssues.push(
      createDraftingDrawingSheetIssueSnapshot(model, {
        id: 'issue-1',
        issueDate: now,
        issueNumber: 'ISS-001',
        purpose: 'For review',
        revision: 'B',
        sheetIds: ['sheet-1'],
        status: 'issued',
      }),
    );
    const draft = createDraftingTransmittal(model, {
      id: 'transmittal-1',
      includedDrawingSheetIssueIds: ['issue-1'],
      issueDate: now,
      purpose: 'For information',
      title: 'Draft package',
      transmittalNumber: 'TRN-001',
    });
    const issuedModel = issueDraftingTransmittal({
      issuedAt: '2026-04-24T01:00:00.000Z',
      issuedBy: 'Avery Drafter',
      model: addDrawingTransmittal(model, draft),
      transmittalId: 'transmittal-1',
    });

    const markup = renderToStaticMarkup(
      <DraftingTransmittalPreview
        drawing={createDrawing(issuedModel)}
        project={createProject()}
        projectId="project-1"
        rootTemplates={[]}
        transmittal={issuedModel.drawingTransmittals[0]!}
      />,
    );

    expect(markup).toContain('No PDF evidence attached');
    expect(markup).toContain('Evidence status');
    expect(markup).toContain('missing');
  });
});

function createDrawing(model: ReturnType<typeof createEmptyDraftingModel>): DraftingDrawing {
  return {
    id: model.drawingId,
    projectId: 'project-1',
    title: 'Retention Plan',
    status: 'draft',
    currentRevision: 0,
    modelVersion: 1,
    objectCount: 0,
    createdById: null,
    updatedById: null,
    createdAt: now,
    updatedAt: now,
    model,
    revisions: [],
  };
}

function createProject(): Project {
  return {
    id: 'project-1',
    organisationId: 'org-1',
    name: 'NORTH SYDNEY',
    code: 'NSW-001',
    status: 'active',
    location: undefined,
    description: undefined,
    metadata: {},
    createdById: null,
    createdAt: now,
    updatedAt: now,
  } as Project;
}
