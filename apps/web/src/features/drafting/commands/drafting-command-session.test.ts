import { describe, expect, it } from 'vitest';
import type { DraftingPoint } from '@eng/shared';
import {
  cancelDraftingCommandSession,
  commitDraftingDimensionCommandPoint,
  commitDraftingLineCommandPoint,
  commitDraftingPathCommandPoint,
  commitDraftingPrimitiveCommandPoint,
  finishDraftingPathCommand,
  getDraftingCommandPoints,
  getDraftingCommandPreviewPoints,
  getDraftingCommandTool,
  IDLE_DRAFTING_COMMAND_SESSION,
  startDraftingDimensionCommand,
  startDraftingPathCommand,
  startDraftingPolylineCommand,
  startDraftingPrimitiveCommand,
  startDraftingLineCommand,
  updateDraftingDimensionCommandPreview,
  updateDraftingLineCommandPreview,
  updateDraftingPathCommandPreview,
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

  it('accepts, previews, and commits dimension witness and offset points', () => {
    const firstWitness = commitDraftingDimensionCommandPoint(startDraftingDimensionCommand(), {
      x: 0,
      y: 0,
    });
    expect(firstWitness.committed).toBe(false);
    expect(firstWitness.session).toMatchObject({
      phase: 'waiting_second_witness',
      points: [{ x: 0, y: 0 }],
      previewPoint: null,
      tool: 'dimension_chain',
    });

    const secondWitnessPreview = updateDraftingDimensionCommandPreview(firstWitness.session, {
      x: 3000,
      y: 0,
    });
    expect(getDraftingCommandPreviewPoints(secondWitnessPreview)).toEqual([
      { x: 0, y: 0 },
      { x: 3000, y: 0 },
    ]);

    const secondWitness = commitDraftingDimensionCommandPoint(secondWitnessPreview, {
      x: 3000,
      y: 0,
    });
    expect(secondWitness.committed).toBe(false);
    expect(secondWitness.session).toMatchObject({
      phase: 'waiting_offset',
      points: [
        { x: 0, y: 0 },
        { x: 3000, y: 0 },
      ],
      previewPoint: null,
      tool: 'dimension_chain',
    });

    const offsetPreview = updateDraftingDimensionCommandPreview(secondWitness.session, {
      x: 0,
      y: -900,
    });
    expect(getDraftingCommandPreviewPoints(offsetPreview)).toEqual([
      { x: 0, y: 0 },
      { x: 3000, y: 0 },
      { x: 0, y: -900 },
    ]);

    const result = commitDraftingDimensionCommandPoint(offsetPreview, { x: 0, y: -900 });
    expect(result.committed).toBe(true);
    if (result.committed) {
      expect(result.tool).toBe('dimension_chain');
      expect(result.points).toEqual([
        { x: 0, y: 0 },
        { x: 3000, y: 0 },
        { x: 0, y: -900 },
      ]);
      expect(getDraftingCommandPreviewPoints(result.session)).toEqual([]);
    }
  });

  it('preserves dimension witness snap refs and manual fallback coordinates', () => {
    const firstWitness: DraftingPoint = {
      x: 0,
      y: 0,
      snapRef: {
        sourceObjectId: 'line-1',
        anchorKind: 'endpoint',
        anchorIndex: 0,
        capturedCoordinate: { x: 0, y: 0 },
      },
    };
    const secondWitness: DraftingPoint = {
      x: 3000,
      y: 0,
      snapRef: {
        sourceObjectId: 'line-1',
        anchorKind: 'endpoint',
        anchorIndex: 1,
        capturedCoordinate: { x: 3000, y: 0 },
      },
    };
    const offset: DraftingPoint = { x: 0, y: -900 };

    const first = commitDraftingDimensionCommandPoint(
      startDraftingDimensionCommand(),
      firstWitness,
    );
    const second = commitDraftingDimensionCommandPoint(first.session, secondWitness);
    const result = commitDraftingDimensionCommandPoint(second.session, offset);

    expect(result.committed).toBe(true);
    if (result.committed) {
      expect(result.points).toEqual([firstWitness, secondWitness, offset]);
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

  it('cancels an incomplete dimension command without committing', () => {
    const firstWitness = commitDraftingDimensionCommandPoint(startDraftingDimensionCommand(), {
      x: 0,
      y: 0,
    });
    const preview = updateDraftingDimensionCommandPreview(firstWitness.session, { x: 3000, y: 0 });

    expect(getDraftingCommandPreviewPoints(preview)).toHaveLength(2);
    expect(cancelDraftingCommandSession()).toEqual(IDLE_DRAFTING_COMMAND_SESSION);
    expect(getDraftingCommandPreviewPoints(cancelDraftingCommandSession())).toEqual([]);
  });

  it('switches from an incomplete dimension command to a primitive command without committing', () => {
    const firstWitness = commitDraftingDimensionCommandPoint(startDraftingDimensionCommand(), {
      x: 0,
      y: 0,
    });
    const switched = commitDraftingPrimitiveCommandPoint(firstWitness.session, 'draft_rectangle', {
      x: 100,
      y: 100,
    });

    expect(switched.committed).toBe(false);
    expect(switched.session).toMatchObject({
      phase: 'waiting_second_point',
      points: [{ x: 100, y: 100 }],
      previewPoint: null,
      tool: 'draft_rectangle',
    });
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

  it('preserves optional z and rl point metadata for dimension witnesses', () => {
    const start: DraftingPoint = { x: 0, y: 0, z: 12.5, rl: 12.5 };
    const end: DraftingPoint = { x: 1000, y: 0, z: 12.6, rl: 12.6 };
    const offset: DraftingPoint = { x: 0, y: -500, z: 12.5, rl: 12.5 };
    const firstPoint = commitDraftingDimensionCommandPoint(startDraftingDimensionCommand(), start);
    const secondPoint = commitDraftingDimensionCommandPoint(firstPoint.session, end);
    const result = commitDraftingDimensionCommandPoint(secondPoint.session, offset);

    expect(result.committed).toBe(true);
    if (result.committed) {
      expect(result.points).toEqual([start, end, offset]);
    }
  });

  it('starts a polyline path command waiting for the first point', () => {
    expect(startDraftingPolylineCommand()).toEqual({
      phase: 'waiting_first_point',
      points: [],
      previewPoint: null,
      tool: 'draft_polyline',
    });
  });

  it('accepts multiple polyline vertices and keeps collecting points', () => {
    const firstPoint = commitDraftingPathCommandPoint(
      startDraftingPathCommand('draft_polyline'),
      'draft_polyline',
      { x: 0, y: 0 },
    );
    const secondPoint = commitDraftingPathCommandPoint(firstPoint.session, 'draft_polyline', {
      x: 1000,
      y: 0,
    });
    const thirdPoint = commitDraftingPathCommandPoint(secondPoint.session, 'draft_polyline', {
      x: 1500,
      y: 600,
    });

    expect(thirdPoint.committed).toBe(false);
    expect(thirdPoint.session).toMatchObject({
      phase: 'collecting_points',
      points: [
        { x: 0, y: 0 },
        { x: 1000, y: 0 },
        { x: 1500, y: 600 },
      ],
      previewPoint: null,
      tool: 'draft_polyline',
    });
  });

  it('updates polyline preview from the next pointer point', () => {
    const firstPoint = commitDraftingPathCommandPoint(
      startDraftingPolylineCommand(),
      'draft_polyline',
      { x: 0, y: 0 },
    );
    const preview = updateDraftingPathCommandPreview(firstPoint.session, { x: 900, y: 450 });

    expect(getDraftingCommandTool(preview)).toBe('draft_polyline');
    expect(getDraftingCommandPreviewPoints(preview)).toEqual([
      { x: 0, y: 0 },
      { x: 900, y: 450 },
    ]);
  });

  it('finishes a polyline command as an open path with captured vertices', () => {
    const firstPoint = commitDraftingPathCommandPoint(
      startDraftingPolylineCommand(),
      'draft_polyline',
      { x: 0, y: 0 },
    );
    const secondPoint = commitDraftingPathCommandPoint(firstPoint.session, 'draft_polyline', {
      x: 1000,
      y: 0,
    });
    const thirdPoint = commitDraftingPathCommandPoint(secondPoint.session, 'draft_polyline', {
      x: 1500,
      y: 600,
    });
    const result = finishDraftingPathCommand(thirdPoint.session);

    expect(result.committed).toBe(true);
    if (result.committed) {
      expect(result.tool).toBe('draft_polyline');
      expect(result.points).toEqual([
        { x: 0, y: 0 },
        { x: 1000, y: 0 },
        { x: 1500, y: 600 },
      ]);
      expect(result.session).toEqual(IDLE_DRAFTING_COMMAND_SESSION);
      expect(getDraftingCommandPreviewPoints(result.session)).toEqual([]);
    }
  });

  it('does not finish a polyline command until the existing two-point minimum is met', () => {
    const firstPoint = commitDraftingPathCommandPoint(
      startDraftingPolylineCommand(),
      'draft_polyline',
      { x: 0, y: 0 },
    );
    const result = finishDraftingPathCommand(firstPoint.session);

    expect(result.committed).toBe(false);
    expect(getDraftingCommandPoints(result.session)).toEqual([{ x: 0, y: 0 }]);
  });

  it('ignores duplicate/no-op polyline vertices without crashing', () => {
    const firstPoint = commitDraftingPathCommandPoint(
      startDraftingPolylineCommand(),
      'draft_polyline',
      { x: 100, y: 100 },
    );
    const duplicate = commitDraftingPathCommandPoint(firstPoint.session, 'draft_polyline', {
      x: 100,
      y: 100,
    });

    expect(duplicate.committed).toBe(false);
    expect(getDraftingCommandPoints(duplicate.session)).toEqual([{ x: 100, y: 100 }]);
    expect(getDraftingCommandPreviewPoints(duplicate.session)).toEqual([{ x: 100, y: 100 }]);
  });

  it('cancels an incomplete polyline command without committing', () => {
    const firstPoint = commitDraftingPathCommandPoint(
      startDraftingPolylineCommand(),
      'draft_polyline',
      { x: 0, y: 0 },
    );
    const preview = updateDraftingPathCommandPreview(firstPoint.session, { x: 1000, y: 0 });

    expect(getDraftingCommandPreviewPoints(preview)).toHaveLength(2);
    expect(cancelDraftingCommandSession()).toEqual(IDLE_DRAFTING_COMMAND_SESSION);
    expect(getDraftingCommandPreviewPoints(cancelDraftingCommandSession())).toEqual([]);
  });

  it('switches from an incomplete polyline command to a primitive command without committing', () => {
    const firstPoint = commitDraftingPathCommandPoint(
      startDraftingPolylineCommand(),
      'draft_polyline',
      { x: 0, y: 0 },
    );
    const switched = commitDraftingPrimitiveCommandPoint(firstPoint.session, 'draft_rectangle', {
      x: 300,
      y: 300,
    });

    expect(switched.committed).toBe(false);
    expect(switched.session).toMatchObject({
      phase: 'waiting_second_point',
      points: [{ x: 300, y: 300 }],
      previewPoint: null,
      tool: 'draft_rectangle',
    });
  });

  it('preserves polyline snap refs and optional z and rl point metadata', () => {
    const start: DraftingPoint = {
      x: 0,
      y: 0,
      z: 12.5,
      rl: 12.5,
      snapRef: {
        sourceObjectId: 'line-1',
        anchorKind: 'endpoint',
        anchorIndex: 0,
        capturedCoordinate: { x: 0, y: 0, z: 12.5, rl: 12.5 },
      },
    };
    const end: DraftingPoint = { x: 1000, y: 0, z: 12.6, rl: 12.6 };
    const firstPoint = commitDraftingPathCommandPoint(
      startDraftingPolylineCommand(),
      'draft_polyline',
      start,
    );
    const secondPoint = commitDraftingPathCommandPoint(firstPoint.session, 'draft_polyline', end);
    const result = finishDraftingPathCommand(secondPoint.session);

    expect(result.committed).toBe(true);
    if (result.committed) {
      expect(result.points).toEqual([start, end]);
    }
  });

  it('starts a polygon path command waiting for the first point', () => {
    expect(startDraftingPathCommand('draft_polygon')).toEqual({
      phase: 'waiting_first_point',
      points: [],
      previewPoint: null,
      tool: 'draft_polygon',
    });
  });

  it('accepts polygon vertices and keeps collecting points', () => {
    const firstPoint = commitDraftingPathCommandPoint(
      startDraftingPathCommand('draft_polygon'),
      'draft_polygon',
      { x: 0, y: 0 },
    );
    const secondPoint = commitDraftingPathCommandPoint(firstPoint.session, 'draft_polygon', {
      x: 1000,
      y: 0,
    });
    const thirdPoint = commitDraftingPathCommandPoint(secondPoint.session, 'draft_polygon', {
      x: 1500,
      y: 600,
    });

    expect(thirdPoint.committed).toBe(false);
    expect(thirdPoint.session).toMatchObject({
      phase: 'collecting_points',
      points: [
        { x: 0, y: 0 },
        { x: 1000, y: 0 },
        { x: 1500, y: 600 },
      ],
      previewPoint: null,
      tool: 'draft_polygon',
    });
  });

  it('updates polygon preview from the next pointer point', () => {
    const firstPoint = commitDraftingPathCommandPoint(
      startDraftingPathCommand('draft_polygon'),
      'draft_polygon',
      { x: 0, y: 0 },
    );
    const secondPoint = commitDraftingPathCommandPoint(firstPoint.session, 'draft_polygon', {
      x: 1000,
      y: 0,
    });
    const preview = updateDraftingPathCommandPreview(secondPoint.session, { x: 900, y: 450 });

    expect(getDraftingCommandTool(preview)).toBe('draft_polygon');
    expect(getDraftingCommandPreviewPoints(preview)).toEqual([
      { x: 0, y: 0 },
      { x: 1000, y: 0 },
      { x: 900, y: 450 },
    ]);
  });

  it('finishes a polygon command as a closed path with captured vertices', () => {
    const firstPoint = commitDraftingPathCommandPoint(
      startDraftingPathCommand('draft_polygon'),
      'draft_polygon',
      { x: 0, y: 0 },
    );
    const secondPoint = commitDraftingPathCommandPoint(firstPoint.session, 'draft_polygon', {
      x: 1000,
      y: 0,
    });
    const thirdPoint = commitDraftingPathCommandPoint(secondPoint.session, 'draft_polygon', {
      x: 1500,
      y: 600,
    });
    const result = finishDraftingPathCommand(thirdPoint.session);

    expect(result.committed).toBe(true);
    if (result.committed) {
      expect(result.tool).toBe('draft_polygon');
      expect(result.points).toEqual([
        { x: 0, y: 0 },
        { x: 1000, y: 0 },
        { x: 1500, y: 600 },
      ]);
      expect(result.session).toEqual(IDLE_DRAFTING_COMMAND_SESSION);
      expect(getDraftingCommandPreviewPoints(result.session)).toEqual([]);
    }
  });

  it('preserves the existing two-point polygon finish downgrade to polyline', () => {
    const firstPoint = commitDraftingPathCommandPoint(
      startDraftingPathCommand('draft_polygon'),
      'draft_polygon',
      { x: 0, y: 0 },
    );
    const secondPoint = commitDraftingPathCommandPoint(firstPoint.session, 'draft_polygon', {
      x: 1000,
      y: 0,
    });
    const result = finishDraftingPathCommand(secondPoint.session);

    expect(result.committed).toBe(true);
    if (result.committed) {
      expect(result.tool).toBe('draft_polyline');
      expect(result.points).toEqual([
        { x: 0, y: 0 },
        { x: 1000, y: 0 },
      ]);
    }
  });

  it('does not finish a polygon command until the existing two-point minimum is met', () => {
    const firstPoint = commitDraftingPathCommandPoint(
      startDraftingPathCommand('draft_polygon'),
      'draft_polygon',
      { x: 0, y: 0 },
    );
    const result = finishDraftingPathCommand(firstPoint.session);

    expect(result.committed).toBe(false);
    expect(getDraftingCommandPoints(result.session)).toEqual([{ x: 0, y: 0 }]);
  });

  it('ignores duplicate/no-op polygon vertices without crashing', () => {
    const firstPoint = commitDraftingPathCommandPoint(
      startDraftingPathCommand('draft_polygon'),
      'draft_polygon',
      { x: 100, y: 100 },
    );
    const duplicate = commitDraftingPathCommandPoint(firstPoint.session, 'draft_polygon', {
      x: 100,
      y: 100,
    });

    expect(duplicate.committed).toBe(false);
    expect(getDraftingCommandPoints(duplicate.session)).toEqual([{ x: 100, y: 100 }]);
    expect(getDraftingCommandPreviewPoints(duplicate.session)).toEqual([{ x: 100, y: 100 }]);
  });

  it('cancels an incomplete polygon command without committing', () => {
    const firstPoint = commitDraftingPathCommandPoint(
      startDraftingPathCommand('draft_polygon'),
      'draft_polygon',
      { x: 0, y: 0 },
    );
    const secondPoint = commitDraftingPathCommandPoint(firstPoint.session, 'draft_polygon', {
      x: 1000,
      y: 0,
    });
    const preview = updateDraftingPathCommandPreview(secondPoint.session, { x: 1000, y: 500 });

    expect(getDraftingCommandPreviewPoints(preview)).toHaveLength(3);
    expect(cancelDraftingCommandSession()).toEqual(IDLE_DRAFTING_COMMAND_SESSION);
    expect(getDraftingCommandPreviewPoints(cancelDraftingCommandSession())).toEqual([]);
  });

  it('switches from an incomplete polygon command to a primitive command without committing', () => {
    const firstPoint = commitDraftingPathCommandPoint(
      startDraftingPathCommand('draft_polygon'),
      'draft_polygon',
      { x: 0, y: 0 },
    );
    const switched = commitDraftingPrimitiveCommandPoint(firstPoint.session, 'draft_rectangle', {
      x: 300,
      y: 300,
    });

    expect(switched.committed).toBe(false);
    expect(switched.session).toMatchObject({
      phase: 'waiting_second_point',
      points: [{ x: 300, y: 300 }],
      previewPoint: null,
      tool: 'draft_rectangle',
    });
  });

  it('preserves polygon snap refs and optional z and rl point metadata', () => {
    const start: DraftingPoint = {
      x: 0,
      y: 0,
      z: 12.5,
      rl: 12.5,
      snapRef: {
        sourceObjectId: 'line-1',
        anchorKind: 'endpoint',
        anchorIndex: 0,
        capturedCoordinate: { x: 0, y: 0, z: 12.5, rl: 12.5 },
      },
    };
    const middle: DraftingPoint = { x: 1000, y: 0, z: 12.6, rl: 12.6 };
    const end: DraftingPoint = { x: 500, y: 800, z: 12.8, rl: 12.8 };
    const firstPoint = commitDraftingPathCommandPoint(
      startDraftingPathCommand('draft_polygon'),
      'draft_polygon',
      start,
    );
    const secondPoint = commitDraftingPathCommandPoint(firstPoint.session, 'draft_polygon', middle);
    const thirdPoint = commitDraftingPathCommandPoint(secondPoint.session, 'draft_polygon', end);
    const result = finishDraftingPathCommand(thirdPoint.session);

    expect(result.committed).toBe(true);
    if (result.committed) {
      expect(result.points).toEqual([start, middle, end]);
    }
  });
});
