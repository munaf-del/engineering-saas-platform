import { describe, expect, it } from 'vitest';
import { createEmptyDraftingModel, type DraftingModel } from '@eng/shared';
import { createDraftingObject } from '../model-utils';
import {
  addSchedulePackIssue,
  createDraftingSchedulePackIssueSnapshot,
  duplicateSchedulePackIssueSnapshot,
  markSchedulePackIssueIssued,
  supersedeSchedulePackIssue,
} from './drafting-schedule-pack-issue-utils';
import { createDraftingScheduleSheetDefinition } from './drafting-schedule-sheet-definition-utils';

describe('drafting schedule pack issue utils', () => {
  it('creates an issue snapshot from current schedule sheet definitions and derived rows', () => {
    const model = modelWithAnchor('A1');
    model.scheduleSheets = [
      createDraftingScheduleSheetDefinition({
        id: 'sheet-anchors',
        includedScheduleGroups: ['anchors'],
        name: 'Anchor Sheet',
      }),
    ];

    const issue = createDraftingSchedulePackIssueSnapshot(model, {
      id: 'issue-1',
      issuePurpose: 'For review',
      metadata: metadata(),
      name: 'Anchor Issue',
      revisionLabel: 'A',
    });

    expect(issue).toMatchObject({
      id: 'issue-1',
      includedScheduleSheetIds: ['sheet-anchors'],
      issuePurpose: 'For review',
      issueStatus: 'draft',
      pageCount: 1,
      revisionLabel: 'A',
    });
    expect(issue.lockedSheetDefinitions[0]).toMatchObject({
      id: 'sheet-anchors',
      includedScheduleGroups: ['anchors'],
    });
    expect(
      issue.lockedScheduleSummary.groups.find((group) => group.key === 'anchors')?.rows[0],
    ).toMatchObject({
      cells: {
        anchorId: 'A1',
      },
    });
  });

  it('duplicates, issues, and supersedes snapshots without changing locked data', () => {
    const model = modelWithAnchor('A1');
    model.scheduleSheets = [
      createDraftingScheduleSheetDefinition({
        id: 'sheet-anchors',
        includedScheduleGroups: ['anchors'],
        name: 'Anchor Sheet',
      }),
    ];
    const issue = createDraftingSchedulePackIssueSnapshot(model, {
      id: 'issue-1',
      issuePurpose: 'For review',
      metadata: metadata(),
      name: 'Anchor Issue',
      revisionLabel: 'A',
    });

    let nextModel = addSchedulePackIssue(model, issue);
    nextModel = duplicateSchedulePackIssueSnapshot(nextModel, 'issue-1', {
      id: 'issue-2',
      revisionLabel: 'B',
    });
    nextModel = markSchedulePackIssueIssued(nextModel, 'issue-2', {
      issuedAt: '2026-04-23T00:00:00.000Z',
    });
    nextModel = supersedeSchedulePackIssue(nextModel, 'issue-1');

    expect(nextModel.schedulePackIssues.map((candidate) => candidate.id)).toEqual([
      'issue-1',
      'issue-2',
    ]);
    expect(nextModel.schedulePackIssues[0]).toMatchObject({
      issueStatus: 'superseded',
      revisionLabel: 'A',
    });
    expect(nextModel.schedulePackIssues[1]).toMatchObject({
      issueStatus: 'issued',
      issuedAt: '2026-04-23T00:00:00.000Z',
      revisionLabel: 'B',
    });
    expect(
      nextModel.schedulePackIssues[1]?.lockedScheduleSummary.groups.find(
        (group) => group.key === 'anchors',
      )?.rows[0]?.cells.anchorId,
    ).toBe('A1');
  });
});

function modelWithAnchor(anchorId: string): DraftingModel {
  const model = createEmptyDraftingModel('drawing-issues');
  const anchor = createDraftingObject('anchor_tieback', { x: 1000, y: 2000 }, model);
  if (anchor.type !== 'anchor_tieback') {
    throw new Error('Expected anchor');
  }
  anchor.parameters.anchorId = anchorId;
  model.objects = [anchor];
  return model;
}

function metadata() {
  return {
    drawingId: 'drawing-issues',
    drawingStatus: 'draft',
    drawingTitle: 'Drafting Schedule Issue QA',
    generatedAtLabel: 'Updated 23 Apr 2026',
    projectCode: 'NSYD',
    projectName: 'NORTH SYDNEY',
    revision: 'R0',
  };
}
