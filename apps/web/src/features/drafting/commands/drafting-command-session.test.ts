import { describe, expect, it } from 'vitest';
import type { DraftingPoint } from '@eng/shared';
import {
  cancelDraftingCommandSession,
  commitDraftingLineCommandPoint,
  commitDraftingPrimitiveCommandPoint,
  getDraftingCommandPoints,
  getDraftingCommandPreviewPoints,
  getDraftingCommandTool,
  IDLE_DRAFTING_COMMAND_SESSION,
  startDraftingPrimitiveCommand,
  startDraftingLineCommand,
  updateDraftingLineCommandPreview,
  updateDraftingPrimitiveCommandPreview,
} from './drafting-command-session';

describe('drafting command session', () => {
  it('starts in idle state', () => {
    expect(IDLE_DRAFTING_COMMAND_SESSION).toEqual({ tool: 'idle' });
    expect(getDraftingCommandPoints(IDLE_DRAFTING_COMMAND_SESSION)).toEqual([]);
  });

  it('starts a line command waiting for the first point', () => {
    expect(startDraftingLineCommand()).toEqual({
      phase: 'waiting_first_point',
      points: [],
      previewPoint: null,
      tool: 'draft_line',
    });
  });

  it('accepts the first line point and waits for the next point', () => {
    const result = commitDraftingLineCommandPoint(startDraftingLineCommand(), { x: 100, y: 200 });

    expect(result.committed).toBe(false);
    expect(result.session).toMatchObject({
      phase: 'waiting_second_point',
      points: [{ x: 100, y: 200 }],
      previewPoint: null,
      tool: 'draft_line',
    });
  });

  it('updates the preview point during pointer move', () => {
    const firstPoint = commitDraftingLineCommandPoint(startDraftingLineCommand(), { x: 0, y: 0 });
    const preview = updateDraftingLineCommandPreview(firstPoint.session, { x: 1500, y: 0 });

    expect(getDraftingCommandPreviewPoints(preview)).toEqual([
      { x: 0, y: 0 },
      { x: 1500, y: 0 },
    ]);
  });

  it('commits a two-point line', () => {
    const firstPoint = commitDraftingLineCommandPoint(startDraftingLineCommand(), { x: 0, y: 0 });
    const result = commitDraftingLineCommandPoint(firstPoint.session, { x: 2400, y: 0 });

    expect(result.committed).toBe(true);
    if (result.committed) {
      expect(result.points).toEqual([
        { x: 0, y: 0 },
        { x: 2400, y: 0 },
      ]);
      expect(result.session).toEqual(IDLE_DRAFTING_COMMAND_SESSION);
      expect(result.tool).toBe('draft_line');
    }
  });

  it('accepts, previews, and commits rectangle points', () => {
    const firstPoint = commitDraftingPrimitiveCommandPoint(
      startDraftingPrimitiveCommand('draft_rectangle'),
      'draft_rectangle',
      { x: 0, y: 0 },
    );
    const preview = updateDraftingPrimitiveCommandPreview(firstPoint.session, { x: 2000, y: 1200 });
    expect(getDraftingCommandTool(preview)).toBe('draft_rectangle');
    expect(getDraftingCommandPreviewPoints(preview)).toEqual([
      { x: 0, y: 0 },
      { x: 2000, y: 1200 },
    ]);

    const result = commitDraftingPrimitiveCommandPoint(preview, 'draft_rectangle', {
      x: 2000,
      y: 1200,
    });

    expect(result.committed).toBe(true);
    if (result.committed) {
      expect(result.tool).toBe('draft_rectangle');
      expect(result.points).toEqual([
        { x: 0, y: 0 },
        { x: 2000, y: 1200 },
      ]);
      expect(getDraftingCommandPreviewPoints(result.session)).toEqual([]);
    }
  });

  it('accepts, previews, and commits circle centre/radius points', () => {
    const firstPoint = commitDraftingPrimitiveCommandPoint(
      startDraftingPrimitiveCommand('draft_circle'),
      'draft_circle',
      { x: 100, y: 100 },
    );
    const preview = updateDraftingPrimitiveCommandPreview(firstPoint.session, { x: 1600, y: 100 });

    expect(getDraftingCommandTool(preview)).toBe('draft_circle');
    expect(getDraftingCommandPreviewPoints(preview)).toEqual([
      { x: 100, y: 100 },
      { x: 1600, y: 100 },
    ]);

    const result = commitDraftingPrimitiveCommandPoint(preview, 'draft_circle', {
      x: 1600,
      y: 100,
    });

    expect(result.committed).toBe(true);
    if (result.committed) {
      expect(result.tool).toBe('draft_circle');
      expect(result.points).toEqual([
        { x: 100, y: 100 },
        { x: 1600, y: 100 },
      ]);
    }
  });

  it('switches primitive tools by cancelling the incomplete command', () => {
    const firstPoint = commitDraftingPrimitiveCommandPoint(
      startDraftingPrimitiveCommand('draft_rectangle'),
      'draft_rectangle',
      { x: 0, y: 0 },
    );
    const switched = commitDraftingPrimitiveCommandPoint(firstPoint.session, 'draft_circle', {
      x: 300,
      y: 300,
    });

    expect(switched.committed).toBe(false);
    expect(switched.session).toMatchObject({
      phase: 'waiting_second_point',
      points: [{ x: 300, y: 300 }],
      previewPoint: null,
      tool: 'draft_circle',
    });
  });

  it('cancels without committing', () => {
    const firstPoint = commitDraftingLineCommandPoint(startDraftingLineCommand(), { x: 0, y: 0 });

    expect(cancelDraftingCommandSession()).toEqual(IDLE_DRAFTING_COMMAND_SESSION);
    expect(getDraftingCommandPoints(firstPoint.session)).toHaveLength(1);
    expect(getDraftingCommandPreviewPoints(cancelDraftingCommandSession())).toEqual([]);
  });

  it('ignores invalid/no-op pointer commits without crashing', () => {
    const noPoint = commitDraftingLineCommandPoint(startDraftingLineCommand(), null);
    expect(noPoint.committed).toBe(false);
    expect(noPoint.session.tool).toBe('draft_line');

    const firstPoint = commitDraftingLineCommandPoint(noPoint.session, { x: 100, y: 100 });
    const duplicate = commitDraftingLineCommandPoint(firstPoint.session, { x: 100, y: 100 });

    expect(duplicate.committed).toBe(false);
    expect(getDraftingCommandPoints(duplicate.session)).toEqual([{ x: 100, y: 100 }]);
    expect(getDraftingCommandPreviewPoints(duplicate.session)).toEqual([{ x: 100, y: 100 }]);
  });

  it('preserves optional z and rl point metadata', () => {
    const start: DraftingPoint = { x: 0, y: 0, z: 12.5, rl: 12.5 };
    const end: DraftingPoint = { x: 1000, y: 0, z: 12.6, rl: 12.6 };
    const firstPoint = commitDraftingLineCommandPoint(startDraftingLineCommand(), start);
    const result = commitDraftingLineCommandPoint(firstPoint.session, end);

    expect(result.committed).toBe(true);
    if (result.committed) {
      expect(result.points).toEqual([start, end]);
    }
  });
});
