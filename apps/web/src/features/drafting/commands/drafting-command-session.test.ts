import { describe, expect, it } from 'vitest';
import type { DraftingPoint } from '@eng/shared';
import {
  cancelDraftingCommandSession,
  commitDraftingAnchorTiebackCommandPoint,
  commitDraftingBoreholeCommandPoint,
  commitDraftingCalloutCommandPoint,
  commitDraftingDimensionCommandPoint,
  commitDraftingLeaderNoteCommandPoint,
  commitDraftingLineCommandPoint,
  commitDraftingMonitoringPointCommandPoint,
  commitDraftingPathCommandPoint,
  commitDraftingPileCommandPoint,
  commitDraftingPrimitiveCommandPoint,
  commitDraftingSectionMarkerCommandPoint,
  commitDraftingServiceCrossingCommandPoint,
  commitDraftingStructuralJointCommandPoint,
  createManualDraftingPointPlacement,
  createManualGeneratedWallBaselinePlacement,
  createManualPathEngineeringPlacement,
  createManualServiceRunPlacement,
  createManualTwoPointEngineeringPlacement,
  finishDraftingPathCommand,
  getDraftingCommandPoints,
  getDraftingCommandPreviewPoints,
  getDraftingCommandTool,
  IDLE_DRAFTING_COMMAND_SESSION,
  startDraftingAnchorTiebackCommand,
  startDraftingBoreholeCommand,
  startDraftingCappingBeamCommand,
  startDraftingCalloutCommand,
  startDraftingDimensionCommand,
  startDraftingExcavationLineCommand,
  startDraftingLeaderNoteCommand,
  startDraftingMonitoringPointCommand,
  startDraftingPathCommand,
  startDraftingPileCommand,
  startDraftingPolylineCommand,
  startDraftingPrimitiveCommand,
  startDraftingSectionMarkerCommand,
  startDraftingServiceCrossingCommand,
  startDraftingServiceRunCommand,
  startDraftingStructuralJointCommand,
  startDraftingLineCommand,
  startDraftingWalerCommand,
  updateDraftingAnchorTiebackCommandPreview,
  updateDraftingBoreholeCommandPreview,
  updateDraftingCalloutCommandPreview,
  updateDraftingDimensionCommandPreview,
  updateDraftingLeaderNoteCommandPreview,
  updateDraftingLineCommandPreview,
  updateDraftingMonitoringPointCommandPreview,
  updateDraftingPathCommandPreview,
  updateDraftingPileCommandPreview,
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

  it('starts a pile command waiting for the placement point', () => {
    expect(startDraftingPileCommand()).toEqual({
      phase: 'waiting_placement_point',
      points: [],
      previewPoint: null,
      tool: 'pile',
    });
  });

  it('updates pile placement preview from the pointer point', () => {
    const preview = updateDraftingPileCommandPreview(startDraftingPileCommand(), {
      x: 1500,
      y: 1900,
    });

    expect(getDraftingCommandTool(preview)).toBe('pile');
    expect(getDraftingCommandPreviewPoints(preview)).toEqual([{ x: 1500, y: 1900 }]);
  });

  it('commits a manual pile placement', () => {
    const result = commitDraftingPileCommandPoint(startDraftingPileCommand(), {
      x: 1500,
      y: 1900,
    });

    expect(result.committed).toBe(true);
    if (result.committed) {
      expect(result.tool).toBe('pile');
      expect(result.placement).toEqual({
        point: { x: 1500, y: 1900 },
        sourceMode: 'manual_sketch',
      });
      expect(result.session).toEqual(IDLE_DRAFTING_COMMAND_SESSION);
      expect(getDraftingCommandPreviewPoints(result.session)).toEqual([]);
    }
  });

  it('ignores invalid/no-op pile placement without crashing', () => {
    const result = commitDraftingPileCommandPoint(startDraftingPileCommand(), null);

    expect(result.committed).toBe(false);
    expect(result.session).toMatchObject({
      phase: 'waiting_placement_point',
      points: [],
      previewPoint: null,
      tool: 'pile',
    });
  });

  it('cancels an incomplete pile command without committing', () => {
    const preview = updateDraftingPileCommandPreview(startDraftingPileCommand(), {
      x: 1500,
      y: 1900,
    });

    expect(getDraftingCommandPreviewPoints(preview)).toHaveLength(1);
    expect(cancelDraftingCommandSession()).toEqual(IDLE_DRAFTING_COMMAND_SESSION);
    expect(getDraftingCommandPreviewPoints(cancelDraftingCommandSession())).toEqual([]);
  });

  it('switches from an incomplete pile command without committing', () => {
    const preview = updateDraftingPileCommandPreview(startDraftingPileCommand(), {
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

  it('preserves pile snap refs and optional z and rl point metadata', () => {
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
    const result = commitDraftingPileCommandPoint(startDraftingPileCommand(), point);

    expect(result.committed).toBe(true);
    if (result.committed) {
      expect(result.placement).toEqual({
        point,
        sourceMode: 'manual_sketch',
      });
    }
  });

  it('starts an anchor tieback command waiting for the head point', () => {
    expect(startDraftingAnchorTiebackCommand()).toEqual({
      phase: 'waiting_first_point',
      points: [],
      previewPoint: null,
      tool: 'anchor_tieback',
    });
  });

  it('captures the anchor tieback head point and waits for the tail point', () => {
    const result = commitDraftingAnchorTiebackCommandPoint(startDraftingAnchorTiebackCommand(), {
      x: 1000,
      y: 2000,
    });

    expect(result.committed).toBe(false);
    expect(result.session).toMatchObject({
      phase: 'waiting_second_point',
      points: [{ x: 1000, y: 2000 }],
      previewPoint: null,
      tool: 'anchor_tieback',
    });
  });

  it('updates anchor tieback preview after the head point is captured', () => {
    const firstPoint = commitDraftingAnchorTiebackCommandPoint(
      startDraftingAnchorTiebackCommand(),
      { x: 1000, y: 2000 },
    );
    const preview = updateDraftingAnchorTiebackCommandPreview(firstPoint.session, {
      x: 4200,
      y: 1500,
    });

    expect(getDraftingCommandTool(preview)).toBe('anchor_tieback');
    expect(getDraftingCommandPreviewPoints(preview)).toEqual([
      { x: 1000, y: 2000 },
      { x: 4200, y: 1500 },
    ]);
  });

  it('does not show an anchor tieback preview before the head point is captured', () => {
    const preview = updateDraftingAnchorTiebackCommandPreview(startDraftingAnchorTiebackCommand(), {
      x: 4200,
      y: 1500,
    });

    expect(getDraftingCommandPreviewPoints(preview)).toEqual([]);
  });

  it('commits a manual anchor tieback placement through the two-point boundary', () => {
    const firstPoint = commitDraftingAnchorTiebackCommandPoint(
      startDraftingAnchorTiebackCommand(),
      { x: 1000, y: 2000 },
    );
    const result = commitDraftingAnchorTiebackCommandPoint(firstPoint.session, {
      x: 4200,
      y: 1500,
    });

    expect(result.committed).toBe(true);
    if (result.committed) {
      expect(result.tool).toBe('anchor_tieback');
      expect(result.placement).toEqual({
        startPoint: { x: 1000, y: 2000 },
        endPoint: { x: 4200, y: 1500 },
        sourceMode: 'manual_sketch',
      });
      expect(result.placement).not.toHaveProperty('angleDeg');
      expect(result.placement).not.toHaveProperty('planLengthMm');
      expect(result.placement).not.toHaveProperty('inclinationDeg');
      expect(result.placement).not.toHaveProperty('bondLengthMm');
      expect(result.placement).not.toHaveProperty('designLoadKn');
      expect(result.placement).not.toHaveProperty('capacity');
      expect(result.placement).not.toHaveProperty('sourceRef');
      expect(result.session).toEqual(IDLE_DRAFTING_COMMAND_SESSION);
      expect(getDraftingCommandPreviewPoints(result.session)).toEqual([]);
    }
  });

  it('ignores invalid/no-op anchor tieback placement without crashing', () => {
    const missing = commitDraftingAnchorTiebackCommandPoint(
      startDraftingAnchorTiebackCommand(),
      null,
    );
    expect(missing.committed).toBe(false);
    expect(missing.session).toMatchObject({
      phase: 'waiting_first_point',
      points: [],
      previewPoint: null,
      tool: 'anchor_tieback',
    });

    const firstPoint = commitDraftingAnchorTiebackCommandPoint(
      startDraftingAnchorTiebackCommand(),
      { x: 1000, y: 2000 },
    );
    const duplicate = commitDraftingAnchorTiebackCommandPoint(firstPoint.session, {
      x: 1000,
      y: 2000,
    });

    expect(duplicate.committed).toBe(false);
    expect(duplicate.session).toMatchObject({
      phase: 'waiting_second_point',
      points: [{ x: 1000, y: 2000 }],
      previewPoint: null,
      tool: 'anchor_tieback',
    });
  });

  it('cancels an incomplete anchor tieback command without committing', () => {
    const firstPoint = commitDraftingAnchorTiebackCommandPoint(
      startDraftingAnchorTiebackCommand(),
      { x: 1000, y: 2000 },
    );
    const preview = updateDraftingAnchorTiebackCommandPreview(firstPoint.session, {
      x: 4200,
      y: 1500,
    });

    expect(getDraftingCommandPreviewPoints(preview)).toHaveLength(2);
    expect(cancelDraftingCommandSession()).toEqual(IDLE_DRAFTING_COMMAND_SESSION);
    expect(getDraftingCommandPreviewPoints(cancelDraftingCommandSession())).toEqual([]);
  });

  it('switches from an incomplete anchor tieback command without committing', () => {
    const firstPoint = commitDraftingAnchorTiebackCommandPoint(
      startDraftingAnchorTiebackCommand(),
      { x: 1000, y: 2000 },
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

  it('preserves anchor tieback snap refs and optional z and rl point metadata', () => {
    const start: DraftingPoint = {
      x: 1000,
      y: 2000,
      z: 12.5,
      rl: 12.5,
      snapRef: {
        sourceObjectId: 'wall-1',
        anchorKind: 'endpoint',
        anchorIndex: 0,
        capturedCoordinate: { x: 1000, y: 2000, z: 12.5, rl: 12.5 },
      },
    };
    const end: DraftingPoint = {
      x: 4200,
      y: 1500,
      z: 12.1,
      rl: 12.1,
      snapRef: {
        sourceObjectId: 'wall-1',
        anchorKind: 'endpoint',
        anchorIndex: 1,
        capturedCoordinate: { x: 4200, y: 1500, z: 12.1, rl: 12.1 },
      },
    };
    const firstPoint = commitDraftingAnchorTiebackCommandPoint(
      startDraftingAnchorTiebackCommand(),
      start,
    );
    const result = commitDraftingAnchorTiebackCommandPoint(firstPoint.session, end);

    expect(result.committed).toBe(true);
    if (result.committed) {
      expect(result.placement).toEqual({
        startPoint: start,
        endPoint: end,
        sourceMode: 'manual_sketch',
      });
    }
  });

  it('clones one-point manual placements so later input mutations do not leak into the placement boundary', () => {
    const point: DraftingPoint = {
      x: 1200,
      y: 1800,
      z: 12.5,
      rl: 12.5,
      snapRef: {
        sourceObjectId: 'line-1',
        anchorKind: 'endpoint',
        anchorIndex: 0,
        capturedCoordinate: { x: 1200, y: 1800, z: 12.5, rl: 12.5 },
      },
    };

    const placement = createManualDraftingPointPlacement(point);

    point.x = 0;
    point.y = 0;
    point.z = 0;
    point.rl = 0;
    point.snapRef = {
      sourceObjectId: 'line-2',
      anchorKind: 'endpoint',
      anchorIndex: 1,
      capturedCoordinate: { x: 0, y: 0, z: 0, rl: 0 },
    };

    expect(placement).toEqual({
      point: {
        x: 1200,
        y: 1800,
        z: 12.5,
        rl: 12.5,
        snapRef: {
          sourceObjectId: 'line-1',
          anchorKind: 'endpoint',
          anchorIndex: 0,
          capturedCoordinate: { x: 1200, y: 1800, z: 12.5, rl: 12.5 },
        },
      },
      sourceMode: 'manual_sketch',
    });
  });

  it('creates a manual two-point engineering placement without deriving engineering values', () => {
    const start: DraftingPoint = {
      x: 1000,
      y: 2000,
      z: 12.4,
      rl: 12.4,
      snapRef: {
        sourceObjectId: 'wall-1',
        anchorKind: 'vertex',
        anchorIndex: 0,
        capturedCoordinate: { x: 1000, y: 2000, z: 12.4, rl: 12.4 },
      },
    };
    const end: DraftingPoint = {
      x: 4600,
      y: 1200,
      z: 11.8,
      rl: 11.8,
      snapRef: {
        sourceObjectId: 'wall-1',
        anchorKind: 'vertex',
        anchorIndex: 1,
        capturedCoordinate: { x: 4600, y: 1200, z: 11.8, rl: 11.8 },
      },
    };

    const placement = createManualTwoPointEngineeringPlacement(start, end);

    expect(placement).toEqual({
      startPoint: start,
      endPoint: end,
      sourceMode: 'manual_sketch',
    });
    expect(placement).not.toHaveProperty('angleDeg');
    expect(placement).not.toHaveProperty('planLengthMm');
    expect(placement).not.toHaveProperty('bondLengthMm');
    expect(placement).not.toHaveProperty('designLoadKn');
    expect(placement).not.toHaveProperty('capacity');
    expect(placement).not.toHaveProperty('sourceRef');
  });

  it('clones both points for manual two-point engineering placements', () => {
    const start: DraftingPoint = {
      x: 1500,
      y: 2500,
      z: 13.2,
      rl: 13.2,
      snapRef: {
        sourceObjectId: 'service-1',
        anchorKind: 'endpoint',
        anchorIndex: 0,
        capturedCoordinate: { x: 1500, y: 2500, z: 13.2, rl: 13.2 },
      },
    };
    const end: DraftingPoint = {
      x: 4200,
      y: 2100,
      z: 12.9,
      rl: 12.9,
      snapRef: {
        sourceObjectId: 'service-1',
        anchorKind: 'endpoint',
        anchorIndex: 1,
        capturedCoordinate: { x: 4200, y: 2100, z: 12.9, rl: 12.9 },
      },
    };

    const placement = createManualTwoPointEngineeringPlacement(start, end);

    start.x = -1;
    start.y = -1;
    start.z = -1;
    start.rl = -1;
    start.snapRef = {
      sourceObjectId: 'mutated-start',
      anchorKind: 'endpoint',
      anchorIndex: 9,
      capturedCoordinate: { x: -1, y: -1, z: -1, rl: -1 },
    };

    end.x = -2;
    end.y = -2;
    end.z = -2;
    end.rl = -2;
    end.snapRef = {
      sourceObjectId: 'mutated-end',
      anchorKind: 'endpoint',
      anchorIndex: 8,
      capturedCoordinate: { x: -2, y: -2, z: -2, rl: -2 },
    };

    expect(placement).toEqual({
      startPoint: {
        x: 1500,
        y: 2500,
        z: 13.2,
        rl: 13.2,
        snapRef: {
          sourceObjectId: 'service-1',
          anchorKind: 'endpoint',
          anchorIndex: 0,
          capturedCoordinate: { x: 1500, y: 2500, z: 13.2, rl: 13.2 },
        },
      },
      endPoint: {
        x: 4200,
        y: 2100,
        z: 12.9,
        rl: 12.9,
        snapRef: {
          sourceObjectId: 'service-1',
          anchorKind: 'endpoint',
          anchorIndex: 1,
          capturedCoordinate: { x: 4200, y: 2100, z: 12.9, rl: 12.9 },
        },
      },
      sourceMode: 'manual_sketch',
    });
  });

  it('creates a manual path engineering placement without deriving path or engineering values', () => {
    const points: DraftingPoint[] = [
      {
        x: 0,
        y: 0,
        z: 12.5,
        rl: 12.5,
        snapRef: {
          sourceObjectId: 'path-source-1',
          anchorKind: 'vertex',
          anchorIndex: 0,
          capturedCoordinate: { x: 0, y: 0, z: 12.5, rl: 12.5 },
        },
      },
      {
        x: 1800,
        y: 450,
        z: 12.2,
        rl: 12.2,
        snapRef: {
          sourceObjectId: 'path-source-1',
          anchorKind: 'vertex',
          anchorIndex: 1,
          capturedCoordinate: { x: 1800, y: 450, z: 12.2, rl: 12.2 },
        },
      },
      {
        x: 3600,
        y: 900,
        z: 12,
        rl: 12,
        snapRef: {
          sourceObjectId: 'path-source-1',
          anchorKind: 'vertex',
          anchorIndex: 2,
          capturedCoordinate: { x: 3600, y: 900, z: 12, rl: 12 },
        },
      },
    ];

    const placement = createManualPathEngineeringPlacement(points);

    expect(placement).toEqual({
      points,
      sourceMode: 'manual_sketch',
    });
    expect(placement).not.toHaveProperty('lengthMm');
    expect(placement).not.toHaveProperty('areaMm2');
    expect(placement).not.toHaveProperty('levelRl');
    expect(placement).not.toHaveProperty('widthMm');
    expect(placement).not.toHaveProperty('material');
    expect(placement).not.toHaveProperty('serviceDepthMm');
    expect(placement).not.toHaveProperty('designLoadKn');
    expect(placement).not.toHaveProperty('capacity');
    expect(placement).not.toHaveProperty('sourceRef');
  });

  it('clones every manual path engineering placement vertex', () => {
    const points: DraftingPoint[] = [
      {
        x: 100,
        y: 200,
        z: 10.1,
        rl: 10.1,
        snapRef: {
          sourceObjectId: 'path-a',
          anchorKind: 'vertex',
          anchorIndex: 0,
          capturedCoordinate: { x: 100, y: 200, z: 10.1, rl: 10.1 },
        },
      },
      {
        x: 900,
        y: 1200,
        z: 10.4,
        rl: 10.4,
        snapRef: {
          sourceObjectId: 'path-a',
          anchorKind: 'vertex',
          anchorIndex: 1,
          capturedCoordinate: { x: 900, y: 1200, z: 10.4, rl: 10.4 },
        },
      },
    ];

    const placement = createManualPathEngineeringPlacement(points);
    const firstPoint = points[0]!;
    const secondPoint = points[1]!;

    firstPoint.x = -1;
    firstPoint.y = -1;
    firstPoint.z = -1;
    firstPoint.rl = -1;
    firstPoint.snapRef = {
      sourceObjectId: 'mutated-start',
      anchorKind: 'vertex',
      anchorIndex: 8,
      capturedCoordinate: { x: -1, y: -1, z: -1, rl: -1 },
    };
    secondPoint.x = -2;
    secondPoint.y = -2;
    secondPoint.z = -2;
    secondPoint.rl = -2;
    secondPoint.snapRef = {
      sourceObjectId: 'mutated-end',
      anchorKind: 'vertex',
      anchorIndex: 9,
      capturedCoordinate: { x: -2, y: -2, z: -2, rl: -2 },
    };

    expect(placement).toEqual({
      points: [
        {
          x: 100,
          y: 200,
          z: 10.1,
          rl: 10.1,
          snapRef: {
            sourceObjectId: 'path-a',
            anchorKind: 'vertex',
            anchorIndex: 0,
            capturedCoordinate: { x: 100, y: 200, z: 10.1, rl: 10.1 },
          },
        },
        {
          x: 900,
          y: 1200,
          z: 10.4,
          rl: 10.4,
          snapRef: {
            sourceObjectId: 'path-a',
            anchorKind: 'vertex',
            anchorIndex: 1,
            capturedCoordinate: { x: 900, y: 1200, z: 10.4, rl: 10.4 },
          },
        },
      ],
      sourceMode: 'manual_sketch',
    });
  });

  it('keeps path placement vertex collection separate from path validation semantics', () => {
    expect(createManualPathEngineeringPlacement([])).toEqual({
      points: [],
      sourceMode: 'manual_sketch',
    });

    expect(createManualPathEngineeringPlacement([{ x: 250, y: 500 }])).toEqual({
      points: [{ x: 250, y: 500 }],
      sourceMode: 'manual_sketch',
    });
  });

  it('creates a manual service-run placement without deriving service or source values', () => {
    const vertices: DraftingPoint[] = [
      {
        x: 0,
        y: 0,
        z: 9.8,
        rl: 9.8,
        snapRef: {
          sourceObjectId: 'draft-path-1',
          anchorKind: 'vertex',
          anchorIndex: 0,
          capturedCoordinate: { x: 0, y: 0, z: 9.8, rl: 9.8 },
        },
      },
      {
        x: 1400,
        y: 350,
        z: 9.7,
        rl: 9.7,
        snapRef: {
          sourceObjectId: 'draft-path-1',
          anchorKind: 'vertex',
          anchorIndex: 1,
          capturedCoordinate: { x: 1400, y: 350, z: 9.7, rl: 9.7 },
        },
      },
      {
        x: 2900,
        y: 700,
        z: 9.6,
        rl: 9.6,
        snapRef: {
          sourceObjectId: 'draft-path-1',
          anchorKind: 'vertex',
          anchorIndex: 2,
          capturedCoordinate: { x: 2900, y: 700, z: 9.6, rl: 9.6 },
        },
      },
    ];

    const placement = createManualServiceRunPlacement(vertices);

    expect(placement).toEqual({
      vertices,
      sourceMode: 'manual_sketch',
    });
    expect(placement.vertices).toHaveLength(3);
    expect(placement).not.toHaveProperty('geometry');
    expect(placement).not.toHaveProperty('path');
    expect(placement).not.toHaveProperty('lengthMm');
    expect(placement).not.toHaveProperty('depthM');
    expect(placement).not.toHaveProperty('levelRl');
    expect(placement).not.toHaveProperty('clearanceMm');
    expect(placement).not.toHaveProperty('conflictType');
    expect(placement).not.toHaveProperty('riskStatus');
    expect(placement).not.toHaveProperty('authority');
    expect(placement).not.toHaveProperty('serviceType');
    expect(placement).not.toHaveProperty('status');
    expect(placement).not.toHaveProperty('sourceRef');
    expect(placement).not.toHaveProperty('compliance');
  });

  it('clones every manual service-run vertex and preserves point metadata', () => {
    const vertices: DraftingPoint[] = [
      {
        x: 100,
        y: 300,
        z: 8.4,
        rl: 8.4,
        snapRef: {
          sourceObjectId: 'draft-path-2',
          anchorKind: 'vertex',
          anchorIndex: 0,
          capturedCoordinate: { x: 100, y: 300, z: 8.4, rl: 8.4 },
        },
      },
      {
        x: 900,
        y: 1100,
        z: 8.2,
        rl: 8.2,
        snapRef: {
          sourceObjectId: 'draft-path-2',
          anchorKind: 'vertex',
          anchorIndex: 1,
          capturedCoordinate: { x: 900, y: 1100, z: 8.2, rl: 8.2 },
        },
      },
    ];

    const placement = createManualServiceRunPlacement(vertices);
    const firstVertex = vertices[0]!;
    const secondVertex = vertices[1]!;

    firstVertex.x = -1;
    firstVertex.y = -1;
    firstVertex.z = -1;
    firstVertex.rl = -1;
    firstVertex.snapRef = {
      sourceObjectId: 'mutated-start',
      anchorKind: 'vertex',
      anchorIndex: 8,
      capturedCoordinate: { x: -1, y: -1, z: -1, rl: -1 },
    };
    secondVertex.x = -2;
    secondVertex.y = -2;
    secondVertex.z = -2;
    secondVertex.rl = -2;
    secondVertex.snapRef = {
      sourceObjectId: 'mutated-end',
      anchorKind: 'vertex',
      anchorIndex: 9,
      capturedCoordinate: { x: -2, y: -2, z: -2, rl: -2 },
    };

    expect(placement).toEqual({
      vertices: [
        {
          x: 100,
          y: 300,
          z: 8.4,
          rl: 8.4,
          snapRef: {
            sourceObjectId: 'draft-path-2',
            anchorKind: 'vertex',
            anchorIndex: 0,
            capturedCoordinate: { x: 100, y: 300, z: 8.4, rl: 8.4 },
          },
        },
        {
          x: 900,
          y: 1100,
          z: 8.2,
          rl: 8.2,
          snapRef: {
            sourceObjectId: 'draft-path-2',
            anchorKind: 'vertex',
            anchorIndex: 1,
            capturedCoordinate: { x: 900, y: 1100, z: 8.2, rl: 8.2 },
          },
        },
      ],
      sourceMode: 'manual_sketch',
    });
    expect(placement.vertices[0]).not.toBe(firstVertex);
    expect(placement.vertices[1]).not.toBe(secondVertex);
  });

  it('keeps service-run vertex collection separate from service-run validation semantics', () => {
    expect(createManualServiceRunPlacement([])).toEqual({
      vertices: [],
      sourceMode: 'manual_sketch',
    });

    expect(createManualServiceRunPlacement([{ x: 250, y: 500 }])).toEqual({
      vertices: [{ x: 250, y: 500 }],
      sourceMode: 'manual_sketch',
    });
  });

  it('packages future manual service-run vertices without creating a service-run object', () => {
    const placement = createManualServiceRunPlacement([
      { x: 0, y: 300 },
      { x: 1000, y: 300 },
      { x: 1500, y: 600 },
    ]);

    expect(placement.sourceMode).toBe('manual_sketch');
    expect(placement.vertices).toEqual([
      { x: 0, y: 300 },
      { x: 1000, y: 300 },
      { x: 1500, y: 600 },
    ]);
    expect(placement).not.toHaveProperty('type');
    expect(placement).not.toHaveProperty('tool');
    expect(placement).not.toHaveProperty('serviceId');
    expect(placement).not.toHaveProperty('serviceType');
    expect(placement).not.toHaveProperty('depthM');
    expect(placement).not.toHaveProperty('sourceRef');
  });

  it('creates a manual generated-wall baseline placement without generating pile arrays or wall values', () => {
    const baselinePoints: DraftingPoint[] = [
      {
        x: 0,
        y: 0,
        z: 7.5,
        rl: 7.5,
        snapRef: {
          sourceObjectId: 'baseline-setout-1',
          anchorKind: 'vertex',
          anchorIndex: 0,
          capturedCoordinate: { x: 0, y: 0, z: 7.5, rl: 7.5 },
        },
      },
      {
        x: 1600,
        y: 200,
        z: 7.4,
        rl: 7.4,
        snapRef: {
          sourceObjectId: 'baseline-setout-1',
          anchorKind: 'vertex',
          anchorIndex: 1,
          capturedCoordinate: { x: 1600, y: 200, z: 7.4, rl: 7.4 },
        },
      },
      {
        x: 3200,
        y: 500,
        z: 7.3,
        rl: 7.3,
        snapRef: {
          sourceObjectId: 'baseline-setout-1',
          anchorKind: 'vertex',
          anchorIndex: 2,
          capturedCoordinate: { x: 3200, y: 500, z: 7.3, rl: 7.3 },
        },
      },
    ];

    const placement = createManualGeneratedWallBaselinePlacement(baselinePoints);

    expect(placement).toEqual({
      baselinePoints,
      sourceMode: 'manual_sketch',
    });
    expect(placement.baselinePoints).toHaveLength(3);
    expect(placement).not.toHaveProperty('geometry');
    expect(placement).not.toHaveProperty('pileCentres');
    expect(placement).not.toHaveProperty('pilePositions');
    expect(placement).not.toHaveProperty('pileCount');
    expect(placement).not.toHaveProperty('pileIds');
    expect(placement).not.toHaveProperty('wallLengthMm');
    expect(placement).not.toHaveProperty('spacingMm');
    expect(placement).not.toHaveProperty('overlapMm');
    expect(placement).not.toHaveProperty('pileDiameterMm');
    expect(placement).not.toHaveProperty('sectionLabel');
    expect(placement).not.toHaveProperty('lagging');
    expect(placement).not.toHaveProperty('sourceRef');
    expect(placement).not.toHaveProperty('compliance');
  });

  it('clones every manual generated-wall baseline vertex and preserves point metadata', () => {
    const baselinePoints: DraftingPoint[] = [
      {
        x: 100,
        y: 400,
        z: 6.2,
        rl: 6.2,
        snapRef: {
          sourceObjectId: 'baseline-setout-2',
          anchorKind: 'vertex',
          anchorIndex: 0,
          capturedCoordinate: { x: 100, y: 400, z: 6.2, rl: 6.2 },
        },
      },
      {
        x: 900,
        y: 900,
        z: 6.1,
        rl: 6.1,
        snapRef: {
          sourceObjectId: 'baseline-setout-2',
          anchorKind: 'vertex',
          anchorIndex: 1,
          capturedCoordinate: { x: 900, y: 900, z: 6.1, rl: 6.1 },
        },
      },
    ];

    const placement = createManualGeneratedWallBaselinePlacement(baselinePoints);
    const firstBaselinePoint = baselinePoints[0]!;
    const secondBaselinePoint = baselinePoints[1]!;

    firstBaselinePoint.x = -1;
    firstBaselinePoint.y = -1;
    firstBaselinePoint.z = -1;
    firstBaselinePoint.rl = -1;
    firstBaselinePoint.snapRef = {
      sourceObjectId: 'mutated-start',
      anchorKind: 'vertex',
      anchorIndex: 8,
      capturedCoordinate: { x: -1, y: -1, z: -1, rl: -1 },
    };
    secondBaselinePoint.x = -2;
    secondBaselinePoint.y = -2;
    secondBaselinePoint.z = -2;
    secondBaselinePoint.rl = -2;
    secondBaselinePoint.snapRef = {
      sourceObjectId: 'mutated-end',
      anchorKind: 'vertex',
      anchorIndex: 9,
      capturedCoordinate: { x: -2, y: -2, z: -2, rl: -2 },
    };

    expect(placement).toEqual({
      baselinePoints: [
        {
          x: 100,
          y: 400,
          z: 6.2,
          rl: 6.2,
          snapRef: {
            sourceObjectId: 'baseline-setout-2',
            anchorKind: 'vertex',
            anchorIndex: 0,
            capturedCoordinate: { x: 100, y: 400, z: 6.2, rl: 6.2 },
          },
        },
        {
          x: 900,
          y: 900,
          z: 6.1,
          rl: 6.1,
          snapRef: {
            sourceObjectId: 'baseline-setout-2',
            anchorKind: 'vertex',
            anchorIndex: 1,
            capturedCoordinate: { x: 900, y: 900, z: 6.1, rl: 6.1 },
          },
        },
      ],
      sourceMode: 'manual_sketch',
    });
    expect(placement.baselinePoints[0]).not.toBe(firstBaselinePoint);
    expect(placement.baselinePoints[1]).not.toBe(secondBaselinePoint);
  });

  it('keeps generated-wall baseline collection separate from generated-wall validation semantics', () => {
    expect(createManualGeneratedWallBaselinePlacement([])).toEqual({
      baselinePoints: [],
      sourceMode: 'manual_sketch',
    });

    expect(createManualGeneratedWallBaselinePlacement([{ x: 250, y: 500 }])).toEqual({
      baselinePoints: [{ x: 250, y: 500 }],
      sourceMode: 'manual_sketch',
    });
  });

  it('packages future generated-wall baseline inputs without creating generated-wall objects', () => {
    const futureGeneratedWallBaselineInputs = [
      {
        label: 'secant_pile_wall',
        baselinePoints: [
          { x: 0, y: 0 },
          { x: 1000, y: 0 },
        ],
      },
      {
        label: 'soldier_pile_wall',
        baselinePoints: [
          { x: 0, y: 100 },
          { x: 1000, y: 100 },
        ],
      },
    ] as const satisfies ReadonlyArray<{
      baselinePoints: readonly DraftingPoint[];
      label: 'secant_pile_wall' | 'soldier_pile_wall';
    }>;

    for (const input of futureGeneratedWallBaselineInputs) {
      const placement = createManualGeneratedWallBaselinePlacement(input.baselinePoints);

      expect(placement.sourceMode).toBe('manual_sketch');
      expect(placement.baselinePoints).toEqual(input.baselinePoints);
      expect(placement.baselinePoints).toHaveLength(input.baselinePoints.length);
      expect(placement).not.toHaveProperty('type');
      expect(placement).not.toHaveProperty('tool');
      expect(placement).not.toHaveProperty('pileCentres');
      expect(placement).not.toHaveProperty('pilePositions');
      expect(placement).not.toHaveProperty('pileCount');
      expect(placement).not.toHaveProperty('spacingMm');
      expect(placement).not.toHaveProperty('overlapMm');
      expect(placement).not.toHaveProperty('pileDiameterMm');
      expect(placement).not.toHaveProperty('sourceRef');
    }
  });

  it('packages future path-family placement points without creating tool objects', () => {
    const futureManualPathInputs = [
      {
        label: 'excavation_line',
        points: [
          { x: 0, y: 0 },
          { x: 1000, y: 0 },
        ],
      },
      {
        label: 'capping_beam',
        points: [
          { x: 0, y: 100 },
          { x: 1000, y: 100 },
        ],
      },
      {
        label: 'waler',
        points: [
          { x: 0, y: 200 },
          { x: 1000, y: 200 },
        ],
      },
      {
        label: 'service_run',
        points: [
          { x: 0, y: 300 },
          { x: 1000, y: 300 },
          { x: 1500, y: 600 },
        ],
      },
    ] as const satisfies ReadonlyArray<{
      label: 'capping_beam' | 'excavation_line' | 'service_run' | 'waler';
      points: readonly DraftingPoint[];
    }>;

    for (const input of futureManualPathInputs) {
      const placement = createManualPathEngineeringPlacement(input.points);

      expect(placement.sourceMode).toBe('manual_sketch');
      expect(placement.points).toEqual(input.points);
      expect(placement.points).toHaveLength(input.points.length);
      expect(placement).not.toHaveProperty('tool');
      expect(placement).not.toHaveProperty('lengthMm');
      expect(placement).not.toHaveProperty('widthMm');
      expect(placement).not.toHaveProperty('levelRl');
      expect(placement).not.toHaveProperty('serviceType');
      expect(placement).not.toHaveProperty('sourceRef');
    }
  });

  it('starts a service run path command waiting for the first service vertex', () => {
    expect(startDraftingServiceRunCommand()).toEqual({
      phase: 'waiting_first_point',
      points: [],
      previewPoint: null,
      tool: 'service_run',
    });
  });

  it('captures service run vertices and keeps collecting points', () => {
    const firstPoint = commitDraftingPathCommandPoint(
      startDraftingServiceRunCommand(),
      'service_run',
      { x: 0, y: 0 },
    );
    const secondPoint = commitDraftingPathCommandPoint(firstPoint.session, 'service_run', {
      x: 1200,
      y: 0,
    });
    const thirdPoint = commitDraftingPathCommandPoint(secondPoint.session, 'service_run', {
      x: 1800,
      y: 450,
    });

    expect(thirdPoint.committed).toBe(false);
    expect(thirdPoint.session).toMatchObject({
      phase: 'collecting_points',
      points: [
        { x: 0, y: 0 },
        { x: 1200, y: 0 },
        { x: 1800, y: 450 },
      ],
      previewPoint: null,
      tool: 'service_run',
    });
  });

  it('updates service run preview from the next pointer vertex', () => {
    const firstPoint = commitDraftingPathCommandPoint(
      startDraftingServiceRunCommand(),
      'service_run',
      { x: 0, y: 0 },
    );
    const preview = updateDraftingPathCommandPreview(firstPoint.session, { x: 900, y: 450 });

    expect(getDraftingCommandTool(preview)).toBe('service_run');
    expect(getDraftingCommandPreviewPoints(preview)).toEqual([
      { x: 0, y: 0 },
      { x: 900, y: 450 },
    ]);
  });

  it('finishes a service run through the manual service-run placement boundary', () => {
    const firstPoint = commitDraftingPathCommandPoint(
      startDraftingServiceRunCommand(),
      'service_run',
      { x: 0, y: 0 },
    );
    const secondPoint = commitDraftingPathCommandPoint(firstPoint.session, 'service_run', {
      x: 1200,
      y: 0,
    });
    const thirdPoint = commitDraftingPathCommandPoint(secondPoint.session, 'service_run', {
      x: 1800,
      y: 450,
    });
    const result = finishDraftingPathCommand(thirdPoint.session);

    expect(result.committed).toBe(true);
    if (result.committed && result.tool === 'service_run') {
      expect(result.tool).toBe('service_run');
      expect(result.placement).toEqual({
        vertices: [
          { x: 0, y: 0 },
          { x: 1200, y: 0 },
          { x: 1800, y: 450 },
        ],
        sourceMode: 'manual_sketch',
      });
      expect(result.placement).not.toHaveProperty('lengthMm');
      expect(result.placement).not.toHaveProperty('depthM');
      expect(result.placement).not.toHaveProperty('levelRl');
      expect(result.placement).not.toHaveProperty('clearanceMm');
      expect(result.placement).not.toHaveProperty('riskStatus');
      expect(result.placement).not.toHaveProperty('authority');
      expect(result.placement).not.toHaveProperty('serviceType');
      expect(result.placement).not.toHaveProperty('status');
      expect(result.placement).not.toHaveProperty('sourceRef');
      expect(result.points).toEqual(result.placement.vertices);
      expect(result.session).toEqual(IDLE_DRAFTING_COMMAND_SESSION);
      expect(getDraftingCommandPreviewPoints(result.session)).toEqual([]);
    }
  });

  it('does not finish a service run until the existing two-point minimum is met', () => {
    const firstPoint = commitDraftingPathCommandPoint(
      startDraftingServiceRunCommand(),
      'service_run',
      { x: 0, y: 0 },
    );
    const result = finishDraftingPathCommand(firstPoint.session);

    expect(result.committed).toBe(false);
    expect(getDraftingCommandPoints(result.session)).toEqual([{ x: 0, y: 0 }]);
  });

  it('ignores duplicate/no-op service run vertices without crashing', () => {
    const firstPoint = commitDraftingPathCommandPoint(
      startDraftingServiceRunCommand(),
      'service_run',
      { x: 100, y: 100 },
    );
    const duplicate = commitDraftingPathCommandPoint(firstPoint.session, 'service_run', {
      x: 100,
      y: 100,
    });

    expect(duplicate.committed).toBe(false);
    expect(getDraftingCommandPoints(duplicate.session)).toEqual([{ x: 100, y: 100 }]);
    expect(getDraftingCommandPreviewPoints(duplicate.session)).toEqual([{ x: 100, y: 100 }]);
  });

  it('cancels an incomplete service run command without committing', () => {
    const firstPoint = commitDraftingPathCommandPoint(
      startDraftingServiceRunCommand(),
      'service_run',
      { x: 0, y: 0 },
    );
    const preview = updateDraftingPathCommandPreview(firstPoint.session, { x: 1000, y: 0 });

    expect(getDraftingCommandPreviewPoints(preview)).toHaveLength(2);
    expect(cancelDraftingCommandSession()).toEqual(IDLE_DRAFTING_COMMAND_SESSION);
    expect(getDraftingCommandPreviewPoints(cancelDraftingCommandSession())).toEqual([]);
  });

  it('switches from an incomplete service run command to a primitive command without committing', () => {
    const firstPoint = commitDraftingPathCommandPoint(
      startDraftingServiceRunCommand(),
      'service_run',
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

  it('preserves service run snap refs and optional z and rl vertex metadata', () => {
    const start: DraftingPoint = {
      x: 0,
      y: 0,
      z: 12.5,
      rl: 12.5,
      snapRef: {
        sourceObjectId: 'run-setout-1',
        anchorKind: 'endpoint',
        anchorIndex: 0,
        capturedCoordinate: { x: 0, y: 0, z: 12.5, rl: 12.5 },
      },
    };
    const end: DraftingPoint = {
      x: 1000,
      y: 0,
      z: 12.6,
      rl: 12.6,
      snapRef: {
        sourceObjectId: 'run-setout-1',
        anchorKind: 'endpoint',
        anchorIndex: 1,
        capturedCoordinate: { x: 1000, y: 0, z: 12.6, rl: 12.6 },
      },
    };
    const firstPoint = commitDraftingPathCommandPoint(
      startDraftingServiceRunCommand(),
      'service_run',
      start,
    );
    const secondPoint = commitDraftingPathCommandPoint(firstPoint.session, 'service_run', end);
    const result = finishDraftingPathCommand(secondPoint.session);

    expect(result.committed).toBe(true);
    if (result.committed && result.tool === 'service_run') {
      expect(result.placement).toEqual({
        vertices: [start, end],
        sourceMode: 'manual_sketch',
      });
    }
  });

  it('starts a capping beam path command waiting for the first vertex', () => {
    expect(startDraftingCappingBeamCommand()).toEqual({
      phase: 'waiting_first_point',
      points: [],
      previewPoint: null,
      tool: 'capping_beam',
    });
  });

  it('captures capping beam vertices and keeps collecting points', () => {
    const firstPoint = commitDraftingPathCommandPoint(
      startDraftingCappingBeamCommand(),
      'capping_beam',
      { x: 0, y: 0 },
    );
    const secondPoint = commitDraftingPathCommandPoint(firstPoint.session, 'capping_beam', {
      x: 1200,
      y: 0,
    });
    const thirdPoint = commitDraftingPathCommandPoint(secondPoint.session, 'capping_beam', {
      x: 1800,
      y: 300,
    });

    expect(thirdPoint.committed).toBe(false);
    expect(thirdPoint.session).toMatchObject({
      phase: 'collecting_points',
      points: [
        { x: 0, y: 0 },
        { x: 1200, y: 0 },
        { x: 1800, y: 300 },
      ],
      previewPoint: null,
      tool: 'capping_beam',
    });
  });

  it('updates capping beam preview from the next pointer vertex', () => {
    const firstPoint = commitDraftingPathCommandPoint(
      startDraftingCappingBeamCommand(),
      'capping_beam',
      { x: 0, y: 0 },
    );
    const preview = updateDraftingPathCommandPreview(firstPoint.session, { x: 900, y: 450 });

    expect(getDraftingCommandTool(preview)).toBe('capping_beam');
    expect(getDraftingCommandPreviewPoints(preview)).toEqual([
      { x: 0, y: 0 },
      { x: 900, y: 450 },
    ]);
  });

  it('finishes a capping beam through the manual path placement boundary', () => {
    const firstPoint = commitDraftingPathCommandPoint(
      startDraftingCappingBeamCommand(),
      'capping_beam',
      { x: 0, y: 0 },
    );
    const secondPoint = commitDraftingPathCommandPoint(firstPoint.session, 'capping_beam', {
      x: 1200,
      y: 0,
    });
    const thirdPoint = commitDraftingPathCommandPoint(secondPoint.session, 'capping_beam', {
      x: 1800,
      y: 300,
    });
    const result = finishDraftingPathCommand(thirdPoint.session);

    expect(result.committed).toBe(true);
    if (result.committed && result.tool === 'capping_beam') {
      expect(result.tool).toBe('capping_beam');
      expect(result.placement).toEqual({
        points: [
          { x: 0, y: 0 },
          { x: 1200, y: 0 },
          { x: 1800, y: 300 },
        ],
        sourceMode: 'manual_sketch',
      });
      expect(result.placement).not.toHaveProperty('lengthMm');
      expect(result.placement).not.toHaveProperty('widthMm');
      expect(result.placement).not.toHaveProperty('levelRl');
      expect(result.placement).not.toHaveProperty('concreteGrade');
      expect(result.placement).not.toHaveProperty('sourceRef');
      expect(result.points).toEqual(result.placement.points);
      expect(result.session).toEqual(IDLE_DRAFTING_COMMAND_SESSION);
      expect(getDraftingCommandPreviewPoints(result.session)).toEqual([]);
    }
  });

  it('does not finish a capping beam until the existing two-point minimum is met', () => {
    const firstPoint = commitDraftingPathCommandPoint(
      startDraftingCappingBeamCommand(),
      'capping_beam',
      { x: 0, y: 0 },
    );
    const result = finishDraftingPathCommand(firstPoint.session);

    expect(result.committed).toBe(false);
    expect(getDraftingCommandPoints(result.session)).toEqual([{ x: 0, y: 0 }]);
  });

  it('ignores duplicate/no-op capping beam vertices without crashing', () => {
    const firstPoint = commitDraftingPathCommandPoint(
      startDraftingCappingBeamCommand(),
      'capping_beam',
      { x: 100, y: 100 },
    );
    const duplicate = commitDraftingPathCommandPoint(firstPoint.session, 'capping_beam', {
      x: 100,
      y: 100,
    });

    expect(duplicate.committed).toBe(false);
    expect(getDraftingCommandPoints(duplicate.session)).toEqual([{ x: 100, y: 100 }]);
    expect(getDraftingCommandPreviewPoints(duplicate.session)).toEqual([{ x: 100, y: 100 }]);
  });

  it('cancels an incomplete capping beam command without committing', () => {
    const firstPoint = commitDraftingPathCommandPoint(
      startDraftingCappingBeamCommand(),
      'capping_beam',
      { x: 0, y: 0 },
    );
    const preview = updateDraftingPathCommandPreview(firstPoint.session, { x: 1000, y: 0 });

    expect(getDraftingCommandPreviewPoints(preview)).toHaveLength(2);
    expect(cancelDraftingCommandSession()).toEqual(IDLE_DRAFTING_COMMAND_SESSION);
    expect(getDraftingCommandPreviewPoints(cancelDraftingCommandSession())).toEqual([]);
  });

  it('switches from an incomplete capping beam command to a primitive command without committing', () => {
    const firstPoint = commitDraftingPathCommandPoint(
      startDraftingCappingBeamCommand(),
      'capping_beam',
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

  it('preserves capping beam snap refs and optional z and rl vertex metadata', () => {
    const start: DraftingPoint = {
      x: 0,
      y: 0,
      z: 12.5,
      rl: 12.5,
      snapRef: {
        sourceObjectId: 'beam-setout-1',
        anchorKind: 'endpoint',
        anchorIndex: 0,
        capturedCoordinate: { x: 0, y: 0, z: 12.5, rl: 12.5 },
      },
    };
    const end: DraftingPoint = {
      x: 1000,
      y: 0,
      z: 12.6,
      rl: 12.6,
      snapRef: {
        sourceObjectId: 'beam-setout-1',
        anchorKind: 'endpoint',
        anchorIndex: 1,
        capturedCoordinate: { x: 1000, y: 0, z: 12.6, rl: 12.6 },
      },
    };
    const firstPoint = commitDraftingPathCommandPoint(
      startDraftingCappingBeamCommand(),
      'capping_beam',
      start,
    );
    const secondPoint = commitDraftingPathCommandPoint(firstPoint.session, 'capping_beam', end);
    const result = finishDraftingPathCommand(secondPoint.session);

    expect(result.committed).toBe(true);
    if (result.committed && result.tool === 'capping_beam') {
      expect(result.placement).toEqual({
        points: [start, end],
        sourceMode: 'manual_sketch',
      });
    }
  });

  it('starts a waler path command waiting for the first vertex', () => {
    expect(startDraftingWalerCommand()).toEqual({
      phase: 'waiting_first_point',
      points: [],
      previewPoint: null,
      tool: 'waler',
    });
  });

  it('captures waler vertices and keeps collecting points', () => {
    const firstPoint = commitDraftingPathCommandPoint(startDraftingWalerCommand(), 'waler', {
      x: 0,
      y: 0,
    });
    const secondPoint = commitDraftingPathCommandPoint(firstPoint.session, 'waler', {
      x: 1200,
      y: 0,
    });
    const thirdPoint = commitDraftingPathCommandPoint(secondPoint.session, 'waler', {
      x: 1800,
      y: 300,
    });

    expect(thirdPoint.committed).toBe(false);
    expect(thirdPoint.session).toMatchObject({
      phase: 'collecting_points',
      points: [
        { x: 0, y: 0 },
        { x: 1200, y: 0 },
        { x: 1800, y: 300 },
      ],
      previewPoint: null,
      tool: 'waler',
    });
  });

  it('updates waler preview from the next pointer vertex', () => {
    const firstPoint = commitDraftingPathCommandPoint(startDraftingWalerCommand(), 'waler', {
      x: 0,
      y: 0,
    });
    const preview = updateDraftingPathCommandPreview(firstPoint.session, { x: 900, y: 450 });

    expect(getDraftingCommandTool(preview)).toBe('waler');
    expect(getDraftingCommandPreviewPoints(preview)).toEqual([
      { x: 0, y: 0 },
      { x: 900, y: 450 },
    ]);
  });

  it('finishes a waler through the manual path placement boundary', () => {
    const firstPoint = commitDraftingPathCommandPoint(startDraftingWalerCommand(), 'waler', {
      x: 0,
      y: 0,
    });
    const secondPoint = commitDraftingPathCommandPoint(firstPoint.session, 'waler', {
      x: 1200,
      y: 0,
    });
    const thirdPoint = commitDraftingPathCommandPoint(secondPoint.session, 'waler', {
      x: 1800,
      y: 300,
    });
    const result = finishDraftingPathCommand(thirdPoint.session);

    expect(result.committed).toBe(true);
    if (result.committed && result.tool === 'waler') {
      expect(result.tool).toBe('waler');
      expect(result.placement).toEqual({
        points: [
          { x: 0, y: 0 },
          { x: 1200, y: 0 },
          { x: 1800, y: 300 },
        ],
        sourceMode: 'manual_sketch',
      });
      expect(result.placement).not.toHaveProperty('lengthMm');
      expect(result.placement).not.toHaveProperty('widthMm');
      expect(result.placement).not.toHaveProperty('levelRl');
      expect(result.placement).not.toHaveProperty('sectionLabel');
      expect(result.placement).not.toHaveProperty('sourceRef');
      expect(result.points).toEqual(result.placement.points);
      expect(result.session).toEqual(IDLE_DRAFTING_COMMAND_SESSION);
      expect(getDraftingCommandPreviewPoints(result.session)).toEqual([]);
    }
  });

  it('does not finish a waler until the existing two-point minimum is met', () => {
    const firstPoint = commitDraftingPathCommandPoint(startDraftingWalerCommand(), 'waler', {
      x: 0,
      y: 0,
    });
    const result = finishDraftingPathCommand(firstPoint.session);

    expect(result.committed).toBe(false);
    expect(getDraftingCommandPoints(result.session)).toEqual([{ x: 0, y: 0 }]);
  });

  it('ignores duplicate/no-op waler vertices without crashing', () => {
    const firstPoint = commitDraftingPathCommandPoint(startDraftingWalerCommand(), 'waler', {
      x: 100,
      y: 100,
    });
    const duplicate = commitDraftingPathCommandPoint(firstPoint.session, 'waler', {
      x: 100,
      y: 100,
    });

    expect(duplicate.committed).toBe(false);
    expect(getDraftingCommandPoints(duplicate.session)).toEqual([{ x: 100, y: 100 }]);
    expect(getDraftingCommandPreviewPoints(duplicate.session)).toEqual([{ x: 100, y: 100 }]);
  });

  it('cancels an incomplete waler command without committing', () => {
    const firstPoint = commitDraftingPathCommandPoint(startDraftingWalerCommand(), 'waler', {
      x: 0,
      y: 0,
    });
    const preview = updateDraftingPathCommandPreview(firstPoint.session, { x: 1000, y: 0 });

    expect(getDraftingCommandPreviewPoints(preview)).toHaveLength(2);
    expect(cancelDraftingCommandSession()).toEqual(IDLE_DRAFTING_COMMAND_SESSION);
    expect(getDraftingCommandPreviewPoints(cancelDraftingCommandSession())).toEqual([]);
  });

  it('switches from an incomplete waler command to a primitive command without committing', () => {
    const firstPoint = commitDraftingPathCommandPoint(startDraftingWalerCommand(), 'waler', {
      x: 0,
      y: 0,
    });
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

  it('preserves waler snap refs and optional z and rl vertex metadata', () => {
    const start: DraftingPoint = {
      x: 0,
      y: 0,
      z: 12.5,
      rl: 12.5,
      snapRef: {
        sourceObjectId: 'waler-setout-1',
        anchorKind: 'endpoint',
        anchorIndex: 0,
        capturedCoordinate: { x: 0, y: 0, z: 12.5, rl: 12.5 },
      },
    };
    const end: DraftingPoint = {
      x: 1000,
      y: 0,
      z: 12.6,
      rl: 12.6,
      snapRef: {
        sourceObjectId: 'waler-setout-1',
        anchorKind: 'endpoint',
        anchorIndex: 1,
        capturedCoordinate: { x: 1000, y: 0, z: 12.6, rl: 12.6 },
      },
    };
    const firstPoint = commitDraftingPathCommandPoint(startDraftingWalerCommand(), 'waler', start);
    const secondPoint = commitDraftingPathCommandPoint(firstPoint.session, 'waler', end);
    const result = finishDraftingPathCommand(secondPoint.session);

    expect(result.committed).toBe(true);
    if (result.committed && result.tool === 'waler') {
      expect(result.placement).toEqual({
        points: [start, end],
        sourceMode: 'manual_sketch',
      });
    }
  });

  it('starts an excavation line path command waiting for the first vertex', () => {
    expect(startDraftingExcavationLineCommand()).toEqual({
      phase: 'waiting_first_point',
      points: [],
      previewPoint: null,
      tool: 'excavation_line',
    });
  });

  it('captures excavation line vertices and keeps collecting points', () => {
    const firstPoint = commitDraftingPathCommandPoint(
      startDraftingExcavationLineCommand(),
      'excavation_line',
      { x: 0, y: 0 },
    );
    const secondPoint = commitDraftingPathCommandPoint(firstPoint.session, 'excavation_line', {
      x: 1200,
      y: 0,
    });
    const thirdPoint = commitDraftingPathCommandPoint(secondPoint.session, 'excavation_line', {
      x: 1800,
      y: 600,
    });

    expect(thirdPoint.committed).toBe(false);
    expect(thirdPoint.session).toMatchObject({
      phase: 'collecting_points',
      points: [
        { x: 0, y: 0 },
        { x: 1200, y: 0 },
        { x: 1800, y: 600 },
      ],
      previewPoint: null,
      tool: 'excavation_line',
    });
  });

  it('updates excavation line preview from the next pointer vertex', () => {
    const firstPoint = commitDraftingPathCommandPoint(
      startDraftingExcavationLineCommand(),
      'excavation_line',
      { x: 0, y: 0 },
    );
    const preview = updateDraftingPathCommandPreview(firstPoint.session, { x: 900, y: 450 });

    expect(getDraftingCommandTool(preview)).toBe('excavation_line');
    expect(getDraftingCommandPreviewPoints(preview)).toEqual([
      { x: 0, y: 0 },
      { x: 900, y: 450 },
    ]);
  });

  it('finishes an excavation line through the manual path placement boundary', () => {
    const firstPoint = commitDraftingPathCommandPoint(
      startDraftingExcavationLineCommand(),
      'excavation_line',
      { x: 0, y: 0 },
    );
    const secondPoint = commitDraftingPathCommandPoint(firstPoint.session, 'excavation_line', {
      x: 1200,
      y: 0,
    });
    const thirdPoint = commitDraftingPathCommandPoint(secondPoint.session, 'excavation_line', {
      x: 1800,
      y: 600,
    });
    const result = finishDraftingPathCommand(thirdPoint.session);

    expect(result.committed).toBe(true);
    if (result.committed && result.tool === 'excavation_line') {
      expect(result.tool).toBe('excavation_line');
      expect(result.placement).toEqual({
        points: [
          { x: 0, y: 0 },
          { x: 1200, y: 0 },
          { x: 1800, y: 600 },
        ],
        sourceMode: 'manual_sketch',
      });
      expect(result.placement).not.toHaveProperty('lengthMm');
      expect(result.placement).not.toHaveProperty('areaMm2');
      expect(result.placement).not.toHaveProperty('stage');
      expect(result.placement).not.toHaveProperty('designLevel');
      expect(result.placement).not.toHaveProperty('sourceRef');
      expect(result.points).toEqual(result.placement.points);
      expect(result.session).toEqual(IDLE_DRAFTING_COMMAND_SESSION);
      expect(getDraftingCommandPreviewPoints(result.session)).toEqual([]);
    }
  });

  it('does not finish an excavation line until the existing two-point minimum is met', () => {
    const firstPoint = commitDraftingPathCommandPoint(
      startDraftingExcavationLineCommand(),
      'excavation_line',
      { x: 0, y: 0 },
    );
    const result = finishDraftingPathCommand(firstPoint.session);

    expect(result.committed).toBe(false);
    expect(getDraftingCommandPoints(result.session)).toEqual([{ x: 0, y: 0 }]);
  });

  it('ignores duplicate/no-op excavation line vertices without crashing', () => {
    const firstPoint = commitDraftingPathCommandPoint(
      startDraftingExcavationLineCommand(),
      'excavation_line',
      { x: 100, y: 100 },
    );
    const duplicate = commitDraftingPathCommandPoint(firstPoint.session, 'excavation_line', {
      x: 100,
      y: 100,
    });

    expect(duplicate.committed).toBe(false);
    expect(getDraftingCommandPoints(duplicate.session)).toEqual([{ x: 100, y: 100 }]);
    expect(getDraftingCommandPreviewPoints(duplicate.session)).toEqual([{ x: 100, y: 100 }]);
  });

  it('cancels an incomplete excavation line command without committing', () => {
    const firstPoint = commitDraftingPathCommandPoint(
      startDraftingExcavationLineCommand(),
      'excavation_line',
      { x: 0, y: 0 },
    );
    const preview = updateDraftingPathCommandPreview(firstPoint.session, { x: 1000, y: 0 });

    expect(getDraftingCommandPreviewPoints(preview)).toHaveLength(2);
    expect(cancelDraftingCommandSession()).toEqual(IDLE_DRAFTING_COMMAND_SESSION);
    expect(getDraftingCommandPreviewPoints(cancelDraftingCommandSession())).toEqual([]);
  });

  it('switches from an incomplete excavation line command to a primitive command without committing', () => {
    const firstPoint = commitDraftingPathCommandPoint(
      startDraftingExcavationLineCommand(),
      'excavation_line',
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

  it('preserves excavation line snap refs and optional z and rl vertex metadata', () => {
    const start: DraftingPoint = {
      x: 0,
      y: 0,
      z: 12.5,
      rl: 12.5,
      snapRef: {
        sourceObjectId: 'setout-line-1',
        anchorKind: 'endpoint',
        anchorIndex: 0,
        capturedCoordinate: { x: 0, y: 0, z: 12.5, rl: 12.5 },
      },
    };
    const end: DraftingPoint = {
      x: 1000,
      y: 0,
      z: 12.6,
      rl: 12.6,
      snapRef: {
        sourceObjectId: 'setout-line-1',
        anchorKind: 'endpoint',
        anchorIndex: 1,
        capturedCoordinate: { x: 1000, y: 0, z: 12.6, rl: 12.6 },
      },
    };
    const firstPoint = commitDraftingPathCommandPoint(
      startDraftingExcavationLineCommand(),
      'excavation_line',
      start,
    );
    const secondPoint = commitDraftingPathCommandPoint(firstPoint.session, 'excavation_line', end);
    const result = finishDraftingPathCommand(secondPoint.session);

    expect(result.committed).toBe(true);
    if (result.committed && result.tool === 'excavation_line') {
      expect(result.placement).toEqual({
        points: [start, end],
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
