import { describe, expect, it } from 'vitest';
import type { DraftingPoint } from '@eng/shared';
import {
  cancelDraftingCommandSession,
  commitDraftingBoreholeCommandPoint,
  commitDraftingCalloutCommandPoint,
  commitDraftingDimensionCommandPoint,
  commitDraftingLeaderNoteCommandPoint,
  commitDraftingLineCommandPoint,
  commitDraftingMonitoringPointCommandPoint,
  commitDraftingPathCommandPoint,
  commitDraftingPrimitiveCommandPoint,
  commitDraftingSectionMarkerCommandPoint,
  commitDraftingServiceCrossingCommandPoint,
  commitDraftingStructuralJointCommandPoint,
  finishDraftingPathCommand,
  getDraftingCommandPoints,
  getDraftingCommandPreviewPoints,
  getDraftingCommandTool,
  IDLE_DRAFTING_COMMAND_SESSION,
  startDraftingBoreholeCommand,
  startDraftingCalloutCommand,
  startDraftingDimensionCommand,
  startDraftingLeaderNoteCommand,
  startDraftingMonitoringPointCommand,
  startDraftingPathCommand,
  startDraftingPolylineCommand,
  startDraftingPrimitiveCommand,
  startDraftingSectionMarkerCommand,
  startDraftingServiceCrossingCommand,
  startDraftingStructuralJointCommand,
  startDraftingLineCommand,
  updateDraftingBoreholeCommandPreview,
  updateDraftingCalloutCommandPreview,
  updateDraftingDimensionCommandPreview,
  updateDraftingLeaderNoteCommandPreview,
  updateDraftingLineCommandPreview,
  updateDraftingMonitoringPointCommandPreview,
  updateDraftingPathCommandPreview,
  updateDraftingPrimitiveCommandPreview,
  updateDraftingSectionMarkerCommandPreview,
  updateDraftingServiceCrossingCommandPreview,
  updateDraftingStructuralJointCommandPreview,
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

  it('starts a section marker command waiting for the first point', () => {
    expect(startDraftingSectionMarkerCommand()).toEqual({
      phase: 'waiting_first_point',
      points: [],
      previewPoint: null,
      tool: 'section_marker',
    });
  });

  it('accepts, previews, and commits section marker endpoints', () => {
    const firstPoint = commitDraftingSectionMarkerCommandPoint(
      startDraftingSectionMarkerCommand(),
      { x: 0, y: 0 },
    );
    expect(firstPoint.committed).toBe(false);
    expect(firstPoint.session).toMatchObject({
      phase: 'waiting_second_point',
      points: [{ x: 0, y: 0 }],
      previewPoint: null,
      tool: 'section_marker',
    });

    const preview = updateDraftingSectionMarkerCommandPreview(firstPoint.session, {
      x: 2400,
      y: 800,
    });
    expect(getDraftingCommandPreviewPoints(preview)).toEqual([
      { x: 0, y: 0 },
      { x: 2400, y: 800 },
    ]);

    const result = commitDraftingSectionMarkerCommandPoint(preview, { x: 2400, y: 800 });
    expect(result.committed).toBe(true);
    if (result.committed) {
      expect(result.tool).toBe('section_marker');
      expect(result.points).toEqual([
        { x: 0, y: 0 },
        { x: 2400, y: 800 },
      ]);
      expect(result.session).toEqual(IDLE_DRAFTING_COMMAND_SESSION);
      expect(getDraftingCommandPreviewPoints(result.session)).toEqual([]);
    }
  });

  it('does not commit a section marker until the second endpoint is picked', () => {
    const firstPoint = commitDraftingSectionMarkerCommandPoint(
      startDraftingSectionMarkerCommand(),
      { x: 0, y: 0 },
    );

    expect(firstPoint.committed).toBe(false);
    expect(getDraftingCommandPoints(firstPoint.session)).toEqual([{ x: 0, y: 0 }]);
  });

  it('ignores duplicate/no-op section marker endpoints without crashing', () => {
    const firstPoint = commitDraftingSectionMarkerCommandPoint(
      startDraftingSectionMarkerCommand(),
      { x: 100, y: 100 },
    );
    const duplicate = commitDraftingSectionMarkerCommandPoint(firstPoint.session, {
      x: 100,
      y: 100,
    });

    expect(duplicate.committed).toBe(false);
    expect(getDraftingCommandPoints(duplicate.session)).toEqual([{ x: 100, y: 100 }]);
    expect(getDraftingCommandPreviewPoints(duplicate.session)).toEqual([{ x: 100, y: 100 }]);
  });

  it('cancels an incomplete section marker command without committing', () => {
    const firstPoint = commitDraftingSectionMarkerCommandPoint(
      startDraftingSectionMarkerCommand(),
      { x: 0, y: 0 },
    );
    const preview = updateDraftingSectionMarkerCommandPreview(firstPoint.session, {
      x: 1200,
      y: 0,
    });

    expect(getDraftingCommandPreviewPoints(preview)).toHaveLength(2);
    expect(cancelDraftingCommandSession()).toEqual(IDLE_DRAFTING_COMMAND_SESSION);
    expect(getDraftingCommandPreviewPoints(cancelDraftingCommandSession())).toEqual([]);
  });

  it('switches from an incomplete section marker command without committing', () => {
    const firstPoint = commitDraftingSectionMarkerCommandPoint(
      startDraftingSectionMarkerCommand(),
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

  it('preserves section marker snap refs and optional z and rl point metadata', () => {
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
    const firstPoint = commitDraftingSectionMarkerCommandPoint(
      startDraftingSectionMarkerCommand(),
      start,
    );
    const result = commitDraftingSectionMarkerCommandPoint(firstPoint.session, end);

    expect(result.committed).toBe(true);
    if (result.committed) {
      expect(result.points).toEqual([start, end]);
    }
  });

  it('starts a leader note command waiting for the placement point', () => {
    expect(startDraftingLeaderNoteCommand()).toEqual({
      phase: 'waiting_placement_point',
      points: [],
      previewPoint: null,
      tool: 'leader_note',
    });
  });

  it('updates leader note placement preview from the pointer point', () => {
    const preview = updateDraftingLeaderNoteCommandPreview(startDraftingLeaderNoteCommand(), {
      x: 1200,
      y: 1800,
    });

    expect(getDraftingCommandTool(preview)).toBe('leader_note');
    expect(getDraftingCommandPreviewPoints(preview)).toEqual([{ x: 1200, y: 1800 }]);
  });

  it('commits a leader note placement point', () => {
    const result = commitDraftingLeaderNoteCommandPoint(startDraftingLeaderNoteCommand(), {
      x: 1200,
      y: 1800,
    });

    expect(result.committed).toBe(true);
    if (result.committed) {
      expect(result.tool).toBe('leader_note');
      expect(result.point).toEqual({ x: 1200, y: 1800 });
      expect(result.session).toEqual(IDLE_DRAFTING_COMMAND_SESSION);
      expect(getDraftingCommandPreviewPoints(result.session)).toEqual([]);
    }
  });

  it('ignores invalid/no-op leader note placement without crashing', () => {
    const result = commitDraftingLeaderNoteCommandPoint(startDraftingLeaderNoteCommand(), null);

    expect(result.committed).toBe(false);
    expect(result.session).toMatchObject({
      phase: 'waiting_placement_point',
      points: [],
      previewPoint: null,
      tool: 'leader_note',
    });
  });

  it('cancels an incomplete leader note command without committing', () => {
    const preview = updateDraftingLeaderNoteCommandPreview(startDraftingLeaderNoteCommand(), {
      x: 1200,
      y: 1800,
    });

    expect(getDraftingCommandPreviewPoints(preview)).toHaveLength(1);
    expect(cancelDraftingCommandSession()).toEqual(IDLE_DRAFTING_COMMAND_SESSION);
    expect(getDraftingCommandPreviewPoints(cancelDraftingCommandSession())).toEqual([]);
  });

  it('switches from an incomplete leader note command to a primitive command without committing', () => {
    const preview = updateDraftingLeaderNoteCommandPreview(startDraftingLeaderNoteCommand(), {
      x: 1200,
      y: 1800,
    });
    const switched = commitDraftingPrimitiveCommandPoint(preview, 'draft_rectangle', {
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

  it('preserves leader note snap refs and optional z and rl point metadata', () => {
    const anchor: DraftingPoint = {
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
    const result = commitDraftingLeaderNoteCommandPoint(startDraftingLeaderNoteCommand(), anchor);

    expect(result.committed).toBe(true);
    if (result.committed) {
      expect(result.point).toEqual(anchor);
    }
  });

  it('starts a callout command waiting for the placement point', () => {
    expect(startDraftingCalloutCommand()).toEqual({
      phase: 'waiting_placement_point',
      points: [],
      previewPoint: null,
      tool: 'callout',
    });
  });

  it('updates callout placement preview from the pointer point', () => {
    const preview = updateDraftingCalloutCommandPreview(startDraftingCalloutCommand(), {
      x: 1500,
      y: 1900,
    });

    expect(getDraftingCommandTool(preview)).toBe('callout');
    expect(getDraftingCommandPreviewPoints(preview)).toEqual([{ x: 1500, y: 1900 }]);
  });

  it('commits a callout placement point', () => {
    const result = commitDraftingCalloutCommandPoint(startDraftingCalloutCommand(), {
      x: 1500,
      y: 1900,
    });

    expect(result.committed).toBe(true);
    if (result.committed) {
      expect(result.tool).toBe('callout');
      expect(result.point).toEqual({ x: 1500, y: 1900 });
      expect(result.session).toEqual(IDLE_DRAFTING_COMMAND_SESSION);
      expect(getDraftingCommandPreviewPoints(result.session)).toEqual([]);
    }
  });

  it('ignores invalid/no-op callout placement without crashing', () => {
    const result = commitDraftingCalloutCommandPoint(startDraftingCalloutCommand(), null);

    expect(result.committed).toBe(false);
    expect(result.session).toMatchObject({
      phase: 'waiting_placement_point',
      points: [],
      previewPoint: null,
      tool: 'callout',
    });
  });

  it('cancels an incomplete callout command without committing', () => {
    const preview = updateDraftingCalloutCommandPreview(startDraftingCalloutCommand(), {
      x: 1500,
      y: 1900,
    });

    expect(getDraftingCommandPreviewPoints(preview)).toHaveLength(1);
    expect(cancelDraftingCommandSession()).toEqual(IDLE_DRAFTING_COMMAND_SESSION);
    expect(getDraftingCommandPreviewPoints(cancelDraftingCommandSession())).toEqual([]);
  });

  it('switches from an incomplete callout command to a primitive command without committing', () => {
    const preview = updateDraftingCalloutCommandPreview(startDraftingCalloutCommand(), {
      x: 1500,
      y: 1900,
    });
    const switched = commitDraftingPrimitiveCommandPoint(preview, 'draft_rectangle', {
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

  it('preserves callout snap refs and optional z and rl point metadata', () => {
    const anchor: DraftingPoint = {
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
    const result = commitDraftingCalloutCommandPoint(startDraftingCalloutCommand(), anchor);

    expect(result.committed).toBe(true);
    if (result.committed) {
      expect(result.point).toEqual(anchor);
    }
  });

  it('starts a monitoring point command waiting for the placement point', () => {
    expect(startDraftingMonitoringPointCommand()).toEqual({
      phase: 'waiting_placement_point',
      points: [],
      previewPoint: null,
      tool: 'monitoring_point',
    });
  });

  it('updates monitoring point placement preview from the pointer point', () => {
    const preview = updateDraftingMonitoringPointCommandPreview(
      startDraftingMonitoringPointCommand(),
      {
        x: 1500,
        y: 1900,
      },
    );

    expect(getDraftingCommandTool(preview)).toBe('monitoring_point');
    expect(getDraftingCommandPreviewPoints(preview)).toEqual([{ x: 1500, y: 1900 }]);
  });

  it('commits a manual monitoring point placement', () => {
    const result = commitDraftingMonitoringPointCommandPoint(
      startDraftingMonitoringPointCommand(),
      {
        x: 1500,
        y: 1900,
      },
    );

    expect(result.committed).toBe(true);
    if (result.committed) {
      expect(result.tool).toBe('monitoring_point');
      expect(result.placement).toEqual({
        point: { x: 1500, y: 1900 },
        sourceMode: 'manual_sketch',
      });
      expect(result.session).toEqual(IDLE_DRAFTING_COMMAND_SESSION);
      expect(getDraftingCommandPreviewPoints(result.session)).toEqual([]);
    }
  });

  it('ignores invalid/no-op monitoring point placement without crashing', () => {
    const result = commitDraftingMonitoringPointCommandPoint(
      startDraftingMonitoringPointCommand(),
      null,
    );

    expect(result.committed).toBe(false);
    expect(result.session).toMatchObject({
      phase: 'waiting_placement_point',
      points: [],
      previewPoint: null,
      tool: 'monitoring_point',
    });
  });

  it('cancels an incomplete monitoring point command without committing', () => {
    const preview = updateDraftingMonitoringPointCommandPreview(
      startDraftingMonitoringPointCommand(),
      {
        x: 1500,
        y: 1900,
      },
    );

    expect(getDraftingCommandPreviewPoints(preview)).toHaveLength(1);
    expect(cancelDraftingCommandSession()).toEqual(IDLE_DRAFTING_COMMAND_SESSION);
    expect(getDraftingCommandPreviewPoints(cancelDraftingCommandSession())).toEqual([]);
  });

  it('switches from an incomplete monitoring point command without committing', () => {
    const preview = updateDraftingMonitoringPointCommandPreview(
      startDraftingMonitoringPointCommand(),
      {
        x: 1500,
        y: 1900,
      },
    );
    const switched = commitDraftingPrimitiveCommandPoint(preview, 'draft_rectangle', {
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

  it('preserves monitoring point snap refs and optional z and rl point metadata', () => {
    const point: DraftingPoint = {
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
    const result = commitDraftingMonitoringPointCommandPoint(
      startDraftingMonitoringPointCommand(),
      point,
    );

    expect(result.committed).toBe(true);
    if (result.committed) {
      expect(result.placement).toEqual({
        point,
        sourceMode: 'manual_sketch',
      });
    }
  });

  it('starts a structural joint command waiting for the placement point', () => {
    expect(startDraftingStructuralJointCommand()).toEqual({
      phase: 'waiting_placement_point',
      points: [],
      previewPoint: null,
      tool: 'structural_joint',
    });
  });

  it('updates structural joint placement preview from the pointer point', () => {
    const preview = updateDraftingStructuralJointCommandPreview(
      startDraftingStructuralJointCommand(),
      {
        x: 1500,
        y: 1900,
      },
    );

    expect(getDraftingCommandTool(preview)).toBe('structural_joint');
    expect(getDraftingCommandPreviewPoints(preview)).toEqual([{ x: 1500, y: 1900 }]);
  });

  it('commits a manual structural joint placement', () => {
    const result = commitDraftingStructuralJointCommandPoint(
      startDraftingStructuralJointCommand(),
      {
        x: 1500,
        y: 1900,
      },
    );

    expect(result.committed).toBe(true);
    if (result.committed) {
      expect(result.tool).toBe('structural_joint');
      expect(result.placement).toEqual({
        point: { x: 1500, y: 1900 },
        sourceMode: 'manual_sketch',
      });
      expect(result.session).toEqual(IDLE_DRAFTING_COMMAND_SESSION);
      expect(getDraftingCommandPreviewPoints(result.session)).toEqual([]);
    }
  });

  it('ignores invalid/no-op structural joint placement without crashing', () => {
    const result = commitDraftingStructuralJointCommandPoint(
      startDraftingStructuralJointCommand(),
      null,
    );

    expect(result.committed).toBe(false);
    expect(result.session).toMatchObject({
      phase: 'waiting_placement_point',
      points: [],
      previewPoint: null,
      tool: 'structural_joint',
    });
  });

  it('cancels an incomplete structural joint command without committing', () => {
    const preview = updateDraftingStructuralJointCommandPreview(
      startDraftingStructuralJointCommand(),
      {
        x: 1500,
        y: 1900,
      },
    );

    expect(getDraftingCommandPreviewPoints(preview)).toHaveLength(1);
    expect(cancelDraftingCommandSession()).toEqual(IDLE_DRAFTING_COMMAND_SESSION);
    expect(getDraftingCommandPreviewPoints(cancelDraftingCommandSession())).toEqual([]);
  });

  it('switches from an incomplete structural joint command without committing', () => {
    const preview = updateDraftingStructuralJointCommandPreview(
      startDraftingStructuralJointCommand(),
      {
        x: 1500,
        y: 1900,
      },
    );
    const switched = commitDraftingPrimitiveCommandPoint(preview, 'draft_rectangle', {
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

  it('preserves structural joint snap refs and optional z and rl point metadata', () => {
    const point: DraftingPoint = {
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
    const result = commitDraftingStructuralJointCommandPoint(
      startDraftingStructuralJointCommand(),
      point,
    );

    expect(result.committed).toBe(true);
    if (result.committed) {
      expect(result.placement).toEqual({
        point,
        sourceMode: 'manual_sketch',
      });
    }
  });

  it('starts a service crossing command waiting for the placement point', () => {
    expect(startDraftingServiceCrossingCommand()).toEqual({
      phase: 'waiting_placement_point',
      points: [],
      previewPoint: null,
      tool: 'service_crossing',
    });
  });

  it('updates service crossing placement preview from the pointer point', () => {
    const preview = updateDraftingServiceCrossingCommandPreview(
      startDraftingServiceCrossingCommand(),
      {
        x: 1500,
        y: 1900,
      },
    );

    expect(getDraftingCommandTool(preview)).toBe('service_crossing');
    expect(getDraftingCommandPreviewPoints(preview)).toEqual([{ x: 1500, y: 1900 }]);
  });

  it('commits a manual service crossing placement', () => {
    const result = commitDraftingServiceCrossingCommandPoint(
      startDraftingServiceCrossingCommand(),
      {
        x: 1500,
        y: 1900,
      },
    );

    expect(result.committed).toBe(true);
    if (result.committed) {
      expect(result.tool).toBe('service_crossing');
      expect(result.placement).toEqual({
        point: { x: 1500, y: 1900 },
        sourceMode: 'manual_sketch',
      });
      expect(result.session).toEqual(IDLE_DRAFTING_COMMAND_SESSION);
      expect(getDraftingCommandPreviewPoints(result.session)).toEqual([]);
    }
  });

  it('ignores invalid/no-op service crossing placement without crashing', () => {
    const result = commitDraftingServiceCrossingCommandPoint(
      startDraftingServiceCrossingCommand(),
      null,
    );

    expect(result.committed).toBe(false);
    expect(result.session).toMatchObject({
      phase: 'waiting_placement_point',
      points: [],
      previewPoint: null,
      tool: 'service_crossing',
    });
  });

  it('cancels an incomplete service crossing command without committing', () => {
    const preview = updateDraftingServiceCrossingCommandPreview(
      startDraftingServiceCrossingCommand(),
      {
        x: 1500,
        y: 1900,
      },
    );

    expect(getDraftingCommandPreviewPoints(preview)).toHaveLength(1);
    expect(cancelDraftingCommandSession()).toEqual(IDLE_DRAFTING_COMMAND_SESSION);
    expect(getDraftingCommandPreviewPoints(cancelDraftingCommandSession())).toEqual([]);
  });

  it('switches from an incomplete service crossing command without committing', () => {
    const preview = updateDraftingServiceCrossingCommandPreview(
      startDraftingServiceCrossingCommand(),
      {
        x: 1500,
        y: 1900,
      },
    );
    const switched = commitDraftingPrimitiveCommandPoint(preview, 'draft_rectangle', {
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

  it('preserves service crossing snap refs and optional z and rl point metadata', () => {
    const point: DraftingPoint = {
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
    const result = commitDraftingServiceCrossingCommandPoint(
      startDraftingServiceCrossingCommand(),
      point,
    );

    expect(result.committed).toBe(true);
    if (result.committed) {
      expect(result.placement).toEqual({
        point,
        sourceMode: 'manual_sketch',
      });
    }
  });

  it('starts a borehole command waiting for the placement point', () => {
    expect(startDraftingBoreholeCommand()).toEqual({
      phase: 'waiting_placement_point',
      points: [],
      previewPoint: null,
      tool: 'borehole',
    });
  });

  it('updates borehole placement preview from the pointer point', () => {
    const preview = updateDraftingBoreholeCommandPreview(startDraftingBoreholeCommand(), {
      x: 1500,
      y: 1900,
    });

    expect(getDraftingCommandTool(preview)).toBe('borehole');
    expect(getDraftingCommandPreviewPoints(preview)).toEqual([{ x: 1500, y: 1900 }]);
  });

  it('commits a manual borehole placement', () => {
    const result = commitDraftingBoreholeCommandPoint(startDraftingBoreholeCommand(), {
      x: 1500,
      y: 1900,
    });

    expect(result.committed).toBe(true);
    if (result.committed) {
      expect(result.tool).toBe('borehole');
      expect(result.placement).toEqual({
        point: { x: 1500, y: 1900 },
        sourceMode: 'manual_sketch',
      });
      expect(result.session).toEqual(IDLE_DRAFTING_COMMAND_SESSION);
      expect(getDraftingCommandPreviewPoints(result.session)).toEqual([]);
    }
  });

  it('ignores invalid/no-op borehole placement without crashing', () => {
    const result = commitDraftingBoreholeCommandPoint(startDraftingBoreholeCommand(), null);

    expect(result.committed).toBe(false);
    expect(result.session).toMatchObject({
      phase: 'waiting_placement_point',
      points: [],
      previewPoint: null,
      tool: 'borehole',
    });
  });

  it('cancels an incomplete borehole command without committing', () => {
    const preview = updateDraftingBoreholeCommandPreview(startDraftingBoreholeCommand(), {
      x: 1500,
      y: 1900,
    });

    expect(getDraftingCommandPreviewPoints(preview)).toHaveLength(1);
    expect(cancelDraftingCommandSession()).toEqual(IDLE_DRAFTING_COMMAND_SESSION);
    expect(getDraftingCommandPreviewPoints(cancelDraftingCommandSession())).toEqual([]);
  });

  it('switches from an incomplete borehole command without committing', () => {
    const preview = updateDraftingBoreholeCommandPreview(startDraftingBoreholeCommand(), {
      x: 1500,
      y: 1900,
    });
    const switched = commitDraftingPrimitiveCommandPoint(preview, 'draft_rectangle', {
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

  it('preserves borehole snap refs and optional z and rl point metadata', () => {
    const point: DraftingPoint = {
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
    const result = commitDraftingBoreholeCommandPoint(startDraftingBoreholeCommand(), point);

    expect(result.committed).toBe(true);
    if (result.committed) {
      expect(result.placement).toEqual({
        point,
        sourceMode: 'manual_sketch',
      });
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
