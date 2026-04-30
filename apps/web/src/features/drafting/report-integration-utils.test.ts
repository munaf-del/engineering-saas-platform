import { describe, expect, it } from 'vitest';
import { createEmptyDraftingModel, type DraftingDrawing, type DraftingObject } from '@eng/shared';
import { buildDraftingReportIntegrationIndex } from './report-integration-utils';
import { createDraftingDrawingSheetDefinition } from './sheets/drafting-drawing-sheet-utils';
import {
  addDrawingSheetIssue,
  createDraftingDrawingSheetIssueSnapshot,
} from './sheets/drafting-drawing-sheet-issue-utils';

const NOW = '2026-04-30T00:00:00.000Z';

describe('drafting report integration utils', () => {
  it('lists drawing, sheet, issue, schedule, JSON export, and revision outputs for reports', () => {
    const drawing = createDrawing();
    const issue = createDraftingDrawingSheetIssueSnapshot(drawing.model, {
      id: 'issue-1',
      issueDate: NOW,
      issueNumber: 'ISS-001',
      purpose: 'For review',
      revision: 'B',
      sheetIds: ['sheet-1'],
    });
    drawing.model = addDrawingSheetIssue(drawing.model, issue);
    const sourceSnapshot = JSON.stringify(drawing);

    const index = buildDraftingReportIntegrationIndex({
      drawing,
      generatedAt: NOW,
    });

    expect(index).toMatchObject({
      schemaVersion: 'drafting.report-integration.v1',
      generatedAt: NOW,
      drawing: {
        id: 'drawing-1',
        projectId: 'project-1',
        title: 'Retention Wall General Arrangement',
        currentRevision: 'B',
        status: 'draft',
      },
      jsonExport: {
        filename: 'retention-wall-general-arrangement.json',
        schemaVersion: 'drafting.model-export.v2',
        binaryPolicy: 'metadata_only',
      },
    });
    expect(index.drawingSheets).toEqual([
      expect.objectContaining({
        id: 'sheet-1',
        includeUnderlays: true,
        previewHref: '/projects/project-1/drafting/drawing-1/sheets/preview?sheetId=sheet-1',
        sheetNumber: 'S-101',
      }),
    ]);
    expect(index.issueSnapshots).toEqual([
      expect.objectContaining({
        id: 'issue-1',
        issueNumber: 'ISS-001',
        previewHref: '/projects/project-1/drafting/drawing-1/sheets/preview?issueId=issue-1',
        revision: 'B',
        sheetCount: 1,
        status: 'issued',
      }),
    ]);
    expect(index.scheduleExports).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          csvFilename: 'retention-wall-general-arrangement-shoring_piles.csv',
          groupKey: 'shoring_piles',
          rowCount: 1,
        }),
        expect.objectContaining({
          csvFilename: 'retention-wall-general-arrangement-anchors.csv',
          groupKey: 'anchors',
          rowCount: 0,
        }),
      ]),
    );
    expect(index.revisionSnapshots).toEqual([
      {
        createdAt: NOW,
        id: 'revision-1',
        revisionNumber: 1,
        title: 'Revision B snapshot',
      },
    ]);
    expect(JSON.stringify(drawing)).toBe(sourceSnapshot);
  });
});

function createDrawing(): DraftingDrawing {
  const model = createEmptyDraftingModel('drawing-1');
  model.titleBlock = {
    drawingTitle: 'Retention Wall General Arrangement',
    drawingNumber: 'S-1001',
    status: 'for_review',
  };
  model.revisionBlock = {
    currentRevision: 'B',
    revisions: [
      {
        approvedBy: 'APR',
        checkedBy: 'CHK',
        date: '2026-04-30',
        description: 'Issued for review',
        drawnBy: 'DRN',
        id: 'revision-b',
        issuedFor: 'Review',
        revision: 'B',
        status: 'for_review',
      },
    ],
  };
  model.drawingSheets = [
    {
      ...createDraftingDrawingSheetDefinition({
        id: 'sheet-1',
        name: 'General Arrangement',
        sheetNumber: 'S-101',
        title: 'Retention Plan',
      }),
      includeUnderlays: true,
    },
  ];
  model.objects = [pileObject()];

  return {
    id: 'drawing-1',
    projectId: 'project-1',
    title: 'Drafting Geometry Sheet QA',
    kind: 'model',
    isProjectModel: true,
    isSketch: false,
    status: 'draft',
    currentRevision: 1,
    modelVersion: 1,
    objectCount: 1,
    createdById: null,
    updatedById: null,
    createdAt: NOW,
    updatedAt: NOW,
    model,
    revisions: [
      {
        id: 'revision-1',
        drawingId: 'drawing-1',
        projectId: 'project-1',
        revisionNumber: 1,
        title: 'Revision B snapshot',
        notes: null,
        modelJsonSnapshot: model,
        createdById: null,
        createdAt: NOW,
      },
    ],
  };
}

function pileObject(): DraftingObject {
  return {
    id: 'pile-1',
    type: 'pile',
    layerId: 'piles',
    name: 'Pile 1',
    visible: true,
    locked: false,
    geometry: {
      centre: { x: 0, y: 0 },
      diameterMm: 600,
    },
    metadata: {
      pileId: 'P1',
      pileType: 'bored',
    },
    createdAt: NOW,
    updatedAt: NOW,
  };
}
