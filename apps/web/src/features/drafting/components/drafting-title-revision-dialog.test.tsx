import { describe, expect, it } from 'vitest';
import { createEmptyDraftingModel } from '@eng/shared';
import {
  addDraftingRevisionBlockRow,
  deleteDraftingRevisionBlockRow,
  markDraftingRevisionBlockCurrent,
  updateDraftingRevisionBlockRow,
  updateDraftingTitleBlockField,
  updateDraftingTitleBlockStatus,
} from './drafting-title-revision-dialog';

describe('drafting title/revision metadata updates', () => {
  it('edits title block metadata through the DraftingModel', () => {
    let model = createEmptyDraftingModel('drawing-title-revision');

    model = updateDraftingTitleBlockField(
      model,
      'drawingTitle',
      'Retention Wall General Arrangement',
    );
    model = updateDraftingTitleBlockField(model, 'drawingNumber', 'S-1001');
    model = updateDraftingTitleBlockField(model, 'clientName', 'North Client');
    model = updateDraftingTitleBlockStatus(model, 'for_review');

    expect(model.titleBlock).toMatchObject({
      clientName: 'North Client',
      drawingNumber: 'S-1001',
      drawingTitle: 'Retention Wall General Arrangement',
      status: 'for_review',
    });
  });

  it('adds, edits, marks, and deletes revision rows through the DraftingModel', () => {
    let model = createEmptyDraftingModel('drawing-title-revision');

    model = addDraftingRevisionBlockRow(model, 'revision-a', '2026-04-24');

    expect(model.revisionBlock?.currentRevision).toBe('A');
    expect(model.revisionBlock?.revisions).toHaveLength(1);

    model = updateDraftingRevisionBlockRow(model, 'revision-a', 'description', 'Issued for review');
    model = updateDraftingRevisionBlockRow(model, 'revision-a', 'revision', 'B');

    expect(model.revisionBlock?.currentRevision).toBe('B');
    expect(model.revisionBlock?.revisions[0]).toMatchObject({
      date: '2026-04-24',
      description: 'Issued for review',
      revision: 'B',
    });

    model = addDraftingRevisionBlockRow(model, 'revision-c', '2026-04-25');
    model = markDraftingRevisionBlockCurrent(model, 'revision-c');

    expect(model.revisionBlock?.currentRevision).toBe('C');

    model = deleteDraftingRevisionBlockRow(model, 'revision-c');

    expect(model.revisionBlock?.currentRevision).toBe('B');
    expect(model.revisionBlock?.revisions.map((row) => row.revision)).toEqual(['B']);
  });
});
