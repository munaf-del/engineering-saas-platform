import { describe, expect, it } from 'vitest';
import { createEmptyDraftingModel, type DraftingObject } from '@eng/shared';
import { createDraftingDrawingSheetIssueSnapshot } from '../sheets/drafting-drawing-sheet-issue-utils';
import { createDraftingDrawingSheetDefinition } from '../sheets/drafting-drawing-sheet-utils';
import {
  addDrawingTransmittal,
  buildDraftingTransmittalManifest,
  buildDraftingTransmittalWarnings,
  createDraftingTransmittal,
  getDrawingTransmittals,
  getIssueCompletenessWarnings,
  updateDraftingTransmittal,
} from './drafting-transmittal-utils';

const now = '2026-04-24T00:00:00.000Z';

describe('drafting transmittal helpers', () => {
  it('creates a transmittal from frozen drawing sheet issue snapshots', () => {
    const model = createModelWithIssue();
    const transmittal = createDraftingTransmittal(model, {
      cc: ['cc@example.com'],
      id: 'transmittal-1',
      includedDrawingSheetIssueIds: ['issue-1'],
      issueDate: now,
      issuedBy: 'Avery Drafter',
      issuedTo: ['client@example.com'],
      purpose: 'For construction',
      status: 'issued',
      title: 'Drawing package 1',
      transmittalNumber: 'TRN-001',
    });

    expect(transmittal.includedDrawingSheetIssueIds).toEqual(['issue-1']);
    expect(transmittal.includedSheets).toEqual([
      expect.objectContaining({
        drawingSheetIssueId: 'issue-1',
        issueNumber: 'ISS-001',
        revision: 'B',
        sheetId: 'sheet-1',
        sheetName: 'Geometry Sheet 1',
        sheetNumber: 'S-101',
        snapshotLabel: 'ISS-001 Rev B - S-101 Geometry Sheet 1',
      }),
    ]);
  });

  it('rejects transmittals without frozen drawing sheet issue snapshots', () => {
    expect(() =>
      createDraftingTransmittal(createEmptyDraftingModel('drawing-empty'), {
        id: 'transmittal-1',
        includedDrawingSheetIssueIds: [],
        issueDate: now,
        purpose: 'For review',
        title: 'Empty package',
        transmittalNumber: 'TRN-001',
      }),
    ).toThrow('A transmittal requires at least one frozen drawing sheet issue snapshot.');
  });

  it('adds and updates transmittal metadata without mutating issue snapshots', () => {
    const model = createModelWithIssue();
    const transmittal = createDraftingTransmittal(model, {
      id: 'transmittal-1',
      includedDrawingSheetIssueIds: ['issue-1'],
      issueDate: now,
      purpose: 'For review',
      title: 'Draft package',
      transmittalNumber: 'TRN-001',
    });
    const withTransmittal = addDrawingTransmittal(model, transmittal);
    const updated = updateDraftingTransmittal(withTransmittal, 'transmittal-1', {
      cc: ['design@example.com'],
      includedDrawingSheetIssueIds: ['issue-1'],
      issueDate: now,
      issuedBy: 'Casey Checker',
      issuedTo: ['client@example.com'],
      notes: 'Reissued with distribution notes.',
      purpose: 'For information',
      status: 'issued',
      title: 'Updated package',
      transmittalNumber: 'TRN-001',
    });

    expect(getDrawingTransmittals(updated)[0]).toMatchObject({
      issuedBy: 'Casey Checker',
      issuedTo: ['client@example.com'],
      purpose: 'For information',
      status: 'issued',
      title: 'Updated package',
    });
    expect(updated.drawingSheetIssues[0]).toEqual(model.drawingSheetIssues[0]);
  });

  it('builds a manifest with snapshot references, title metadata, and provenance summaries', () => {
    const model = createModelWithIssue();
    const transmittal = createDraftingTransmittal(model, {
      id: 'transmittal-1',
      includedDrawingSheetIssueIds: ['issue-1'],
      issueDate: now,
      purpose: 'For review',
      title: 'Manifest package',
      transmittalNumber: 'TRN-001',
    });
    const manifest = buildDraftingTransmittalManifest({ model, transmittal });

    expect(manifest.transmittal).toMatchObject({
      id: 'transmittal-1',
      transmittalNumber: 'TRN-001',
    });
    expect(manifest.includedSheets[0]).toMatchObject({
      drawingSheetIssueId: 'issue-1',
      sheetNumber: 'S-101',
    });
    expect(manifest.issueManifests[0]?.titleRevision.lockedTitleBlock).toMatchObject({
      drawingTitle: 'Retention Plan',
      projectName: 'NORTH SYDNEY',
    });
    expect(manifest.issueManifests[0]?.objectProvenanceSummary[0]).toMatchObject({
      objectId: 'pile-1',
      provenance: {
        createdBy: 'Avery Drafter',
      },
    });
  });

  it('warns for legacy or incomplete issue snapshots and live-vs-issued drift', () => {
    const model = createModelWithIssue();
    const legacyIssue = {
      ...model.drawingSheetIssues[0]!,
      id: 'legacy-issue',
      lockedDrawingSheets: model.drawingSheetIssues[0]!.lockedDrawingSheets.map((sheet) => {
        const legacySheet = { ...sheet };
        delete legacySheet.templateSnapshot;
        return legacySheet;
      }),
      lockedObjects: model.drawingSheetIssues[0]!.lockedObjects.map((object) => ({
        ...object,
        renderedState: undefined,
      })),
    };
    const driftedModel = {
      ...model,
      drawingSheetIssues: [legacyIssue],
      titleBlock: {
        ...model.titleBlock,
        drawingTitle: 'Changed live title',
      },
    };
    const transmittal = createDraftingTransmittal(driftedModel, {
      id: 'transmittal-1',
      includedDrawingSheetIssueIds: ['legacy-issue'],
      issueDate: now,
      purpose: 'For review',
      title: 'Legacy package',
      transmittalNumber: 'TRN-001',
    });

    expect(getIssueCompletenessWarnings(legacyIssue)).toEqual([
      'Snapshot has legacy object records without rendered state.',
      'Snapshot has legacy sheet records without template metadata.',
    ]);
    expect(
      buildDraftingTransmittalWarnings({
        model: driftedModel,
        transmittal,
      })[0]?.messages,
    ).toContain('Current live drawing has drift since this issued snapshot.');
  });
});

function createModelWithIssue() {
  const model = createEmptyDraftingModel('drawing-transmittal');
  model.titleBlock = {
    drawingNumber: 'S-1001',
    drawingTitle: 'Retention Plan',
    projectName: 'NORTH SYDNEY',
  };
  model.revisionBlock = {
    currentRevision: 'B',
    revisions: [
      {
        approvedBy: 'APR',
        checkedBy: 'CHK',
        date: '2026-04-24',
        description: 'Issued for review',
        drawnBy: 'DRN',
        id: 'revision-b',
        issuedFor: 'Review',
        revision: 'B',
        status: 'for_review',
      },
    ],
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
  model.objects.push(createPile());
  model.drawingSheetIssues.push(
    createDraftingDrawingSheetIssueSnapshot(model, {
      id: 'issue-1',
      issueDate: now,
      issueNumber: 'ISS-001',
      issuedBy: 'Avery Drafter',
      purpose: 'For review',
      revision: 'B',
      sheetIds: ['sheet-1'],
      status: 'issued',
    }),
  );
  return model;
}

function createPile(): DraftingObject {
  return {
    id: 'pile-1',
    type: 'pile',
    layerId: 'piles',
    geometry: {
      centre: { x: 1000, y: 1000 },
      diameterMm: 600,
    },
    metadata: {
      pileId: 'P1',
    },
    provenance: {
      createdAt: now,
      createdBy: 'Avery Drafter',
      lastAction: 'created',
    },
    createdAt: now,
    updatedAt: now,
  };
}
