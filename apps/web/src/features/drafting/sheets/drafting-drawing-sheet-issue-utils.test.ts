import { describe, expect, it } from 'vitest';
import { createEmptyDraftingModel, type DraftingObject } from '@eng/shared';
import { createDraftingDrawingSheetDefinition } from './drafting-drawing-sheet-utils';
import {
  addDrawingSheetIssue,
  buildDraftingDrawingSheetIssueManifest,
  buildIssuedDrawingModel,
  compareDraftingDrawingSheetIssue,
  createDraftingDrawingSheetIssueSnapshot,
} from './drafting-drawing-sheet-issue-utils';

const now = '2026-04-24T00:00:00.000Z';

describe('drafting drawing sheet issue snapshots', () => {
  it('creates a locked issue snapshot for title, revision, sheet, viewport, layer filter, objects, and underlays', () => {
    const model = createIssueModel();

    const issue = createDraftingDrawingSheetIssueSnapshot(model, {
      id: 'issue-1',
      issueDate: now,
      issueNumber: 'ISS-001',
      issuedBy: 'Avery Drafter',
      purpose: 'For construction',
      revision: 'B',
      sheetIds: ['sheet-1'],
      status: 'issued',
    });

    expect(issue.lockedTitleBlock).toMatchObject({
      drawingNumber: 'S-1001',
      drawingTitle: 'Retention Plan',
    });
    expect(issue.lockedRevisionBlock.currentRevision).toBe('B');
    expect(issue.lockedDrawingSheets).toHaveLength(1);
    expect(issue.lockedDrawingSheets[0]).toMatchObject({
      id: 'sheet-1',
      includeUnderlays: true,
      layerFilter: {
        hiddenLayerIds: ['notes'],
      },
      viewport: {
        center: { x: 1000, y: 1000 },
        fitMode: 'manual',
        scale: 0.05,
      },
    });
    expect(issue.lockedObjects.map((object) => object.objectId)).toEqual(['pile-1']);
    expect(issue.lockedObjects[0]?.renderedState).toMatchObject({
      id: 'pile-1',
      metadata: { pileId: 'P1' },
    });
    expect(issue.lockedUnderlays).toEqual([
      expect.objectContaining({
        fileId: 'document-1',
        fileName: 'survey.pdf',
        underlayId: 'underlay-1',
      }),
    ]);
  });

  it('builds an issued preview model from locked state while live preview stays live', () => {
    const model = createIssueModel();
    const issue = createDraftingDrawingSheetIssueSnapshot(model, {
      id: 'issue-1',
      issueDate: now,
      issueNumber: 'ISS-001',
      purpose: 'For review',
      revision: 'B',
      sheetIds: ['sheet-1'],
    });
    const withIssue = addDrawingSheetIssue(model, issue);
    const liveModel = {
      ...withIssue,
      titleBlock: {
        ...withIssue.titleBlock,
        drawingTitle: 'Changed Live Title',
      },
      drawingSheets: withIssue.drawingSheets.map((sheet) => ({
        ...sheet,
        viewport: {
          ...sheet.viewport,
          center: { x: 9999, y: 9999 },
        },
      })),
      objects: [...withIssue.objects, createPile('pile-2', 3000, 3000, 'P2')],
    };

    const issuedModel = buildIssuedDrawingModel(liveModel, issue);

    expect(liveModel.titleBlock?.drawingTitle).toBe('Changed Live Title');
    expect(liveModel.drawingSheets[0]?.viewport.center).toEqual({ x: 9999, y: 9999 });
    expect(liveModel.objects.map((object) => object.id)).toContain('pile-2');
    expect(issuedModel.titleBlock?.drawingTitle).toBe('Retention Plan');
    expect(issuedModel.drawingSheets[0]?.viewport.center).toEqual({ x: 1000, y: 1000 });
    expect(issuedModel.objects.map((object) => object.id)).toEqual(['pile-1']);
  });

  it('detects title, revision, viewport, object, and underlay drift', () => {
    const model = createIssueModel();
    const issue = createDraftingDrawingSheetIssueSnapshot(model, {
      id: 'issue-1',
      issueDate: now,
      issueNumber: 'ISS-001',
      purpose: 'For review',
      revision: 'B',
      sheetIds: ['sheet-1'],
    });
    const liveModel = {
      ...model,
      titleBlock: {
        ...model.titleBlock,
        drawingTitle: 'Changed Live Title',
      },
      revisionBlock: {
        ...model.revisionBlock,
        currentRevision: 'C',
        revisions: model.revisionBlock!.revisions,
      },
      drawingSheets: model.drawingSheets.map((sheet) => ({
        ...sheet,
        layerFilter: { hiddenLayerIds: ['dimensions' as const] },
        viewport: {
          ...sheet.viewport,
          center: { x: 4000, y: 5000 },
          fitMode: 'model_extents' as const,
          rotationDeg: 15,
          scale: 0.1,
        },
      })),
      objects: [
        {
          ...model.objects[0]!,
          geometry: { centre: { x: 1500, y: 1000 }, diameterMm: 600 },
          updatedAt: '2026-04-24T01:00:00.000Z',
        } as DraftingObject,
        createPile('pile-2', 3000, 3000, 'P2'),
      ],
      underlays: [
        {
          ...model.underlays[0]!,
          opacity: 0.3,
        },
      ],
    };

    const comparison = compareDraftingDrawingSheetIssue(liveModel, issue);

    expect(comparison.titleRevision.hasDrift).toBe(true);
    expect(comparison.sheets[0]?.viewport).toMatchObject({
      centerChanged: true,
      fitModeChanged: true,
      rotationChanged: true,
      scaleChanged: true,
    });
    expect(comparison.sheets[0]?.layerFilterChanged).toBe(true);
    expect(comparison.objects.added).toContain('P2 (pile-2)');
    expect(comparison.objects.changed).toContain('P1 (pile-1)');
    expect(comparison.underlays.changed).toEqual(['survey.pdf']);
  });

  it('detects removed objects and underlays', () => {
    const model = createIssueModel();
    const issue = createDraftingDrawingSheetIssueSnapshot(model, {
      id: 'issue-1',
      issueDate: now,
      issueNumber: 'ISS-001',
      purpose: 'For review',
      revision: 'B',
      sheetIds: ['sheet-1'],
    });

    const comparison = compareDraftingDrawingSheetIssue(
      {
        ...model,
        objects: [],
        underlays: [],
      },
      issue,
    );

    expect(comparison.objects.removed).toEqual(['P1 (pile-1)']);
    expect(comparison.underlays.removed).toEqual(['survey.pdf']);
  });

  it('exports a manifest with issue metadata, locked snapshots, and comparison summary', () => {
    const model = createIssueModel();
    const issue = createDraftingDrawingSheetIssueSnapshot(model, {
      id: 'issue-1',
      issueDate: now,
      issueNumber: 'ISS-001',
      notes: 'Issued from QA.',
      purpose: 'For review',
      revision: 'B',
      sheetIds: ['sheet-1'],
    });

    const manifest = buildDraftingDrawingSheetIssueManifest({
      issue,
      model,
    });

    expect(manifest.issue).toMatchObject({
      id: 'issue-1',
      issueNumber: 'ISS-001',
      notes: 'Issued from QA.',
      purpose: 'For review',
      revision: 'B',
    });
    expect(manifest.lockedDrawingSheets[0]).toMatchObject({ id: 'sheet-1' });
    expect(manifest.lockedObjects[0]).not.toHaveProperty('renderedState');
    expect(manifest.lockedUnderlays[0]).toMatchObject({ underlayId: 'underlay-1' });
    expect(manifest.comparison.hasDrift).toBe(false);
  });
});

function createIssueModel() {
  const model = createEmptyDraftingModel('drawing-sheet-issue');
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
  model.drawingSheets.push({
    ...createDraftingDrawingSheetDefinition({
      id: 'sheet-1',
      name: 'Geometry Sheet 1',
      now,
      sheetNumber: 'S-101',
      title: 'Retention Plan',
      viewport: {
        center: { x: 1000, y: 1000 },
        fitMode: 'manual',
        scale: 0.05,
      },
    }),
    includeUnderlays: true,
    layerFilter: {
      hiddenLayerIds: ['notes'],
    },
  });
  model.objects.push(createPile('pile-1', 1000, 1000, 'P1'), {
    ...createPile('note-1', 2000, 2000, 'NOTE'),
    layerId: 'notes',
  });
  model.underlays.push({
    id: 'underlay-1',
    name: 'Survey underlay',
    fileId: 'document-1',
    fileName: 'survey.pdf',
    pageNumber: 1,
    visible: true,
    opacity: 0.65,
    locked: true,
    transform: { x: 10, y: 20, scale: 1, rotationDeg: 0 },
    crop: null,
    calibration: null,
    createdAt: now,
    updatedAt: now,
  });

  return model;
}

function createPile(id: string, x: number, y: number, pileId: string): DraftingObject {
  return {
    id,
    type: 'pile',
    layerId: 'piles',
    geometry: {
      centre: { x, y },
      diameterMm: 600,
    },
    metadata: {
      pileId,
    },
    createdAt: now,
    updatedAt: now,
  };
}
