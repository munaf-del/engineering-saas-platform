import type { DraftingPoint } from '@eng/shared';

export type DraftingPrimitiveCommandTool = 'draft_circle' | 'draft_line' | 'draft_rectangle';
export type DraftingSectionMarkerCommandTool = 'section_marker';
export type DraftingLeaderNoteCommandTool = 'leader_note';
export type DraftingCalloutCommandTool = 'callout';
export type DraftingMonitoringPointCommandTool = 'monitoring_point';
export type DraftingStructuralJointCommandTool = 'structural_joint';
export type DraftingServiceCrossingCommandTool = 'service_crossing';
export type DraftingBoreholeCommandTool = 'borehole';
export type DraftingPileCommandTool = 'pile';
export type DraftingDimensionCommandTool = 'dimension_chain';
export type DraftingPathCommandTool = 'draft_polyline' | 'draft_polygon';
export type DraftingCommandTool =
  | DraftingPrimitiveCommandTool
  | DraftingSectionMarkerCommandTool
  | DraftingLeaderNoteCommandTool
  | DraftingCalloutCommandTool
  | DraftingMonitoringPointCommandTool
  | DraftingStructuralJointCommandTool
  | DraftingServiceCrossingCommandTool
  | DraftingBoreholeCommandTool
  | DraftingPileCommandTool
  | DraftingDimensionCommandTool
  | DraftingPathCommandTool;

export const DRAFTING_PRIMITIVE_COMMAND_TOOLS = [
  'draft_line',
  'draft_rectangle',
  'draft_circle',
] as const satisfies DraftingPrimitiveCommandTool[];

export const DRAFTING_PATH_COMMAND_TOOLS = [
  'draft_polyline',
  'draft_polygon',
] as const satisfies DraftingPathCommandTool[];

export type DraftingCommandSession =
  | {
      tool: 'idle';
    }
  | {
      phase: 'waiting_first_point' | 'waiting_second_point';
      points: DraftingPoint[];
      previewPoint: DraftingPoint | null;
      tool: DraftingPrimitiveCommandTool;
    }
  | {
      phase: 'waiting_first_point' | 'waiting_second_point';
      points: DraftingPoint[];
      previewPoint: DraftingPoint | null;
      tool: DraftingSectionMarkerCommandTool;
    }
  | {
      phase: 'waiting_placement_point';
      points: DraftingPoint[];
      previewPoint: DraftingPoint | null;
      tool: DraftingLeaderNoteCommandTool;
    }
  | {
      phase: 'waiting_placement_point';
      points: DraftingPoint[];
      previewPoint: DraftingPoint | null;
      tool: DraftingCalloutCommandTool;
    }
  | {
      phase: 'waiting_placement_point';
      points: DraftingPoint[];
      previewPoint: DraftingPoint | null;
      tool: DraftingMonitoringPointCommandTool;
    }
  | {
      phase: 'waiting_placement_point';
      points: DraftingPoint[];
      previewPoint: DraftingPoint | null;
      tool: DraftingStructuralJointCommandTool;
    }
  | {
      phase: 'waiting_placement_point';
      points: DraftingPoint[];
      previewPoint: DraftingPoint | null;
      tool: DraftingServiceCrossingCommandTool;
    }
  | {
      phase: 'waiting_placement_point';
      points: DraftingPoint[];
      previewPoint: DraftingPoint | null;
      tool: DraftingBoreholeCommandTool;
    }
  | {
      phase: 'waiting_placement_point';
      points: DraftingPoint[];
      previewPoint: DraftingPoint | null;
      tool: DraftingPileCommandTool;
    }
  | {
      phase: 'waiting_first_witness' | 'waiting_second_witness' | 'waiting_offset';
      points: DraftingPoint[];
      previewPoint: DraftingPoint | null;
      tool: DraftingDimensionCommandTool;
    }
  | {
      phase: 'waiting_first_point' | 'collecting_points';
      points: DraftingPoint[];
      previewPoint: DraftingPoint | null;
      tool: DraftingPathCommandTool;
    };

export type DraftingPrimitiveCommandSession = DraftingCommandSession;
type ActiveDraftingPrimitiveCommandSession = Extract<
  DraftingCommandSession,
  { tool: DraftingPrimitiveCommandTool }
>;
type ActiveDraftingSectionMarkerCommandSession = Extract<
  DraftingCommandSession,
  { tool: DraftingSectionMarkerCommandTool }
>;
type ActiveDraftingLeaderNoteCommandSession = Extract<
  DraftingCommandSession,
  { tool: DraftingLeaderNoteCommandTool }
>;
type ActiveDraftingCalloutCommandSession = Extract<
  DraftingCommandSession,
  { tool: DraftingCalloutCommandTool }
>;
type ActiveDraftingMonitoringPointCommandSession = Extract<
  DraftingCommandSession,
  { tool: DraftingMonitoringPointCommandTool }
>;
type ActiveDraftingStructuralJointCommandSession = Extract<
  DraftingCommandSession,
  { tool: DraftingStructuralJointCommandTool }
>;
type ActiveDraftingServiceCrossingCommandSession = Extract<
  DraftingCommandSession,
  { tool: DraftingServiceCrossingCommandTool }
>;
type ActiveDraftingBoreholeCommandSession = Extract<
  DraftingCommandSession,
  { tool: DraftingBoreholeCommandTool }
>;
type ActiveDraftingPileCommandSession = Extract<
  DraftingCommandSession,
  { tool: DraftingPileCommandTool }
>;
type ActiveDraftingDimensionCommandSession = Extract<
  DraftingCommandSession,
  { tool: DraftingDimensionCommandTool }
>;
type ActiveDraftingPathCommandSession = Extract<
  DraftingCommandSession,
  { tool: DraftingPathCommandTool }
>;

export type DraftingPrimitiveCommandCommit =
  | {
      committed: false;
      session: DraftingCommandSession;
    }
  | {
      committed: true;
      points: [DraftingPoint, DraftingPoint];
      session: DraftingCommandSession;
      tool: DraftingPrimitiveCommandTool;
    };

export type DraftingSectionMarkerCommandCommit =
  | {
      committed: false;
      session: DraftingCommandSession;
    }
  | {
      committed: true;
      points: [DraftingPoint, DraftingPoint];
      session: DraftingCommandSession;
      tool: DraftingSectionMarkerCommandTool;
    };

export type DraftingLeaderNoteCommandCommit =
  | {
      committed: false;
      session: DraftingCommandSession;
    }
  | {
      committed: true;
      point: DraftingPoint;
      session: DraftingCommandSession;
      tool: DraftingLeaderNoteCommandTool;
    };

export type DraftingCalloutCommandCommit =
  | {
      committed: false;
      session: DraftingCommandSession;
    }
  | {
      committed: true;
      point: DraftingPoint;
      session: DraftingCommandSession;
      tool: DraftingCalloutCommandTool;
    };

export type DraftingManualPointPlacement = {
  point: DraftingPoint;
  sourceMode: 'manual_sketch';
};

export type DraftingManualTwoPointEngineeringPlacement = {
  endPoint: DraftingPoint;
  sourceMode: 'manual_sketch';
  startPoint: DraftingPoint;
};

export type DraftingMonitoringPointCommandCommit =
  | {
      committed: false;
      session: DraftingCommandSession;
    }
  | {
      committed: true;
      placement: DraftingManualPointPlacement;
      session: DraftingCommandSession;
      tool: DraftingMonitoringPointCommandTool;
    };

export type DraftingStructuralJointCommandCommit =
  | {
      committed: false;
      session: DraftingCommandSession;
    }
  | {
      committed: true;
      placement: DraftingManualPointPlacement;
      session: DraftingCommandSession;
      tool: DraftingStructuralJointCommandTool;
    };

export type DraftingServiceCrossingCommandCommit =
  | {
      committed: false;
      session: DraftingCommandSession;
    }
  | {
      committed: true;
      placement: DraftingManualPointPlacement;
      session: DraftingCommandSession;
      tool: DraftingServiceCrossingCommandTool;
    };

export type DraftingBoreholeCommandCommit =
  | {
      committed: false;
      session: DraftingCommandSession;
    }
  | {
      committed: true;
      placement: DraftingManualPointPlacement;
      session: DraftingCommandSession;
      tool: DraftingBoreholeCommandTool;
    };

export type DraftingPileCommandCommit =
  | {
      committed: false;
      session: DraftingCommandSession;
    }
  | {
      committed: true;
      placement: DraftingManualPointPlacement;
      session: DraftingCommandSession;
      tool: DraftingPileCommandTool;
    };

export type DraftingDimensionCommandCommit =
  | {
      committed: false;
      session: DraftingCommandSession;
    }
  | {
      committed: true;
      points: [DraftingPoint, DraftingPoint, DraftingPoint];
      session: DraftingCommandSession;
      tool: DraftingDimensionCommandTool;
    };

export type DraftingPathCommandCommit =
  | {
      committed: false;
      session: DraftingCommandSession;
    }
  | {
      committed: true;
      points: DraftingPoint[];
      session: DraftingCommandSession;
      tool: DraftingPathCommandTool;
    };

export const IDLE_DRAFTING_COMMAND_SESSION: DraftingCommandSession = { tool: 'idle' };

export function startDraftingPrimitiveCommand(
  tool: DraftingPrimitiveCommandTool,
): ActiveDraftingPrimitiveCommandSession {
  return {
    phase: 'waiting_first_point',
    points: [],
    previewPoint: null,
    tool,
  };
}

export function startDraftingLineCommand(): ActiveDraftingPrimitiveCommandSession {
  return startDraftingPrimitiveCommand('draft_line');
}

export function startDraftingSectionMarkerCommand(): ActiveDraftingSectionMarkerCommandSession {
  return {
    phase: 'waiting_first_point',
    points: [],
    previewPoint: null,
    tool: 'section_marker',
  };
}

export function startDraftingLeaderNoteCommand(): ActiveDraftingLeaderNoteCommandSession {
  return {
    phase: 'waiting_placement_point',
    points: [],
    previewPoint: null,
    tool: 'leader_note',
  };
}

export function startDraftingCalloutCommand(): ActiveDraftingCalloutCommandSession {
  return {
    phase: 'waiting_placement_point',
    points: [],
    previewPoint: null,
    tool: 'callout',
  };
}

export function startDraftingMonitoringPointCommand(): ActiveDraftingMonitoringPointCommandSession {
  return {
    phase: 'waiting_placement_point',
    points: [],
    previewPoint: null,
    tool: 'monitoring_point',
  };
}

export function startDraftingStructuralJointCommand(): ActiveDraftingStructuralJointCommandSession {
  return {
    phase: 'waiting_placement_point',
    points: [],
    previewPoint: null,
    tool: 'structural_joint',
  };
}

export function startDraftingServiceCrossingCommand(): ActiveDraftingServiceCrossingCommandSession {
  return {
    phase: 'waiting_placement_point',
    points: [],
    previewPoint: null,
    tool: 'service_crossing',
  };
}

export function startDraftingBoreholeCommand(): ActiveDraftingBoreholeCommandSession {
  return {
    phase: 'waiting_placement_point',
    points: [],
    previewPoint: null,
    tool: 'borehole',
  };
}

export function startDraftingPileCommand(): ActiveDraftingPileCommandSession {
  return {
    phase: 'waiting_placement_point',
    points: [],
    previewPoint: null,
    tool: 'pile',
  };
}

export function startDraftingDimensionCommand(): ActiveDraftingDimensionCommandSession {
  return {
    phase: 'waiting_first_witness',
    points: [],
    previewPoint: null,
    tool: 'dimension_chain',
  };
}

export function startDraftingPathCommand(
  tool: DraftingPathCommandTool,
): ActiveDraftingPathCommandSession {
  return {
    phase: 'waiting_first_point',
    points: [],
    previewPoint: null,
    tool,
  };
}

export function startDraftingPolylineCommand(): ActiveDraftingPathCommandSession {
  return startDraftingPathCommand('draft_polyline');
}

export function isDraftingPrimitiveCommandTool(tool: string): tool is DraftingPrimitiveCommandTool {
  return DRAFTING_PRIMITIVE_COMMAND_TOOLS.includes(tool as DraftingPrimitiveCommandTool);
}

export function isDraftingDimensionCommandTool(tool: string): tool is DraftingDimensionCommandTool {
  return tool === 'dimension_chain';
}

export function isDraftingSectionMarkerCommandTool(
  tool: string,
): tool is DraftingSectionMarkerCommandTool {
  return tool === 'section_marker';
}

export function isDraftingLeaderNoteCommandTool(
  tool: string,
): tool is DraftingLeaderNoteCommandTool {
  return tool === 'leader_note';
}

export function isDraftingCalloutCommandTool(tool: string): tool is DraftingCalloutCommandTool {
  return tool === 'callout';
}

export function isDraftingMonitoringPointCommandTool(
  tool: string,
): tool is DraftingMonitoringPointCommandTool {
  return tool === 'monitoring_point';
}

export function isDraftingStructuralJointCommandTool(
  tool: string,
): tool is DraftingStructuralJointCommandTool {
  return tool === 'structural_joint';
}

export function isDraftingServiceCrossingCommandTool(
  tool: string,
): tool is DraftingServiceCrossingCommandTool {
  return tool === 'service_crossing';
}

export function isDraftingBoreholeCommandTool(tool: string): tool is DraftingBoreholeCommandTool {
  return tool === 'borehole';
}

export function isDraftingPileCommandTool(tool: string): tool is DraftingPileCommandTool {
  return tool === 'pile';
}

export function isDraftingPathCommandTool(tool: string): tool is DraftingPathCommandTool {
  return DRAFTING_PATH_COMMAND_TOOLS.includes(tool as DraftingPathCommandTool);
}

export function isDraftingCommandTool(tool: string): tool is DraftingCommandTool {
  return (
    isDraftingPrimitiveCommandTool(tool) ||
    isDraftingSectionMarkerCommandTool(tool) ||
    isDraftingLeaderNoteCommandTool(tool) ||
    isDraftingCalloutCommandTool(tool) ||
    isDraftingMonitoringPointCommandTool(tool) ||
    isDraftingStructuralJointCommandTool(tool) ||
    isDraftingServiceCrossingCommandTool(tool) ||
    isDraftingBoreholeCommandTool(tool) ||
    isDraftingPileCommandTool(tool) ||
    isDraftingDimensionCommandTool(tool) ||
    isDraftingPathCommandTool(tool)
  );
}

export function ensureDraftingPrimitiveCommand(
  session: DraftingCommandSession,
  tool: DraftingPrimitiveCommandTool,
): ActiveDraftingPrimitiveCommandSession {
  return session.tool === tool ? session : startDraftingPrimitiveCommand(tool);
}

export function ensureDraftingDimensionCommand(
  session: DraftingCommandSession,
): ActiveDraftingDimensionCommandSession {
  return session.tool === 'dimension_chain' ? session : startDraftingDimensionCommand();
}

export function ensureDraftingSectionMarkerCommand(
  session: DraftingCommandSession,
): ActiveDraftingSectionMarkerCommandSession {
  return session.tool === 'section_marker' ? session : startDraftingSectionMarkerCommand();
}

export function ensureDraftingLeaderNoteCommand(
  session: DraftingCommandSession,
): ActiveDraftingLeaderNoteCommandSession {
  return session.tool === 'leader_note' ? session : startDraftingLeaderNoteCommand();
}

export function ensureDraftingCalloutCommand(
  session: DraftingCommandSession,
): ActiveDraftingCalloutCommandSession {
  return session.tool === 'callout' ? session : startDraftingCalloutCommand();
}

export function ensureDraftingMonitoringPointCommand(
  session: DraftingCommandSession,
): ActiveDraftingMonitoringPointCommandSession {
  return session.tool === 'monitoring_point' ? session : startDraftingMonitoringPointCommand();
}

export function ensureDraftingStructuralJointCommand(
  session: DraftingCommandSession,
): ActiveDraftingStructuralJointCommandSession {
  return session.tool === 'structural_joint' ? session : startDraftingStructuralJointCommand();
}

export function ensureDraftingServiceCrossingCommand(
  session: DraftingCommandSession,
): ActiveDraftingServiceCrossingCommandSession {
  return session.tool === 'service_crossing' ? session : startDraftingServiceCrossingCommand();
}

export function ensureDraftingBoreholeCommand(
  session: DraftingCommandSession,
): ActiveDraftingBoreholeCommandSession {
  return session.tool === 'borehole' ? session : startDraftingBoreholeCommand();
}

export function ensureDraftingPileCommand(
  session: DraftingCommandSession,
): ActiveDraftingPileCommandSession {
  return session.tool === 'pile' ? session : startDraftingPileCommand();
}

export function ensureDraftingPathCommand(
  session: DraftingCommandSession,
  tool: DraftingPathCommandTool,
): ActiveDraftingPathCommandSession {
  return session.tool === tool ? session : startDraftingPathCommand(tool);
}

export function updateDraftingPrimitiveCommandPreview(
  session: DraftingCommandSession,
  point: DraftingPoint | null | undefined,
): DraftingCommandSession {
  if (
    session.tool === 'idle' ||
    session.tool === 'dimension_chain' ||
    session.tool === 'section_marker' ||
    session.tool === 'leader_note' ||
    session.tool === 'callout' ||
    session.tool === 'monitoring_point' ||
    session.tool === 'structural_joint' ||
    session.tool === 'service_crossing' ||
    session.tool === 'borehole' ||
    session.tool === 'pile' ||
    isDraftingPathCommandTool(session.tool) ||
    !point
  ) {
    return session;
  }

  return {
    ...session,
    previewPoint: cloneDraftingPoint(point),
  };
}

export function updateDraftingLineCommandPreview(
  session: DraftingCommandSession,
  point: DraftingPoint | null | undefined,
): DraftingCommandSession {
  if (session.tool !== 'draft_line') {
    return session;
  }

  return updateDraftingPrimitiveCommandPreview(session, point);
}

export function updateDraftingSectionMarkerCommandPreview(
  session: DraftingCommandSession,
  point: DraftingPoint | null | undefined,
): DraftingCommandSession {
  if (session.tool !== 'section_marker' || !point) {
    return session;
  }

  return {
    ...session,
    previewPoint: cloneDraftingPoint(point),
  };
}

export function updateDraftingDimensionCommandPreview(
  session: DraftingCommandSession,
  point: DraftingPoint | null | undefined,
): DraftingCommandSession {
  if (session.tool !== 'dimension_chain' || session.points.length === 0 || !point) {
    return session;
  }

  return {
    ...session,
    previewPoint: cloneDraftingPoint(point),
  };
}

export function updateDraftingLeaderNoteCommandPreview(
  session: DraftingCommandSession,
  point: DraftingPoint | null | undefined,
): DraftingCommandSession {
  if (session.tool !== 'leader_note' || !point) {
    return session;
  }

  return {
    ...session,
    previewPoint: cloneDraftingPoint(point),
  };
}

export function updateDraftingCalloutCommandPreview(
  session: DraftingCommandSession,
  point: DraftingPoint | null | undefined,
): DraftingCommandSession {
  if (session.tool !== 'callout' || !point) {
    return session;
  }

  return {
    ...session,
    previewPoint: cloneDraftingPoint(point),
  };
}

export function updateDraftingMonitoringPointCommandPreview(
  session: DraftingCommandSession,
  point: DraftingPoint | null | undefined,
): DraftingCommandSession {
  if (session.tool !== 'monitoring_point' || !point) {
    return session;
  }

  return {
    ...session,
    previewPoint: cloneDraftingPoint(point),
  };
}

export function updateDraftingStructuralJointCommandPreview(
  session: DraftingCommandSession,
  point: DraftingPoint | null | undefined,
): DraftingCommandSession {
  if (session.tool !== 'structural_joint' || !point) {
    return session;
  }

  return {
    ...session,
    previewPoint: cloneDraftingPoint(point),
  };
}

export function updateDraftingServiceCrossingCommandPreview(
  session: DraftingCommandSession,
  point: DraftingPoint | null | undefined,
): DraftingCommandSession {
  if (session.tool !== 'service_crossing' || !point) {
    return session;
  }

  return {
    ...session,
    previewPoint: cloneDraftingPoint(point),
  };
}

export function updateDraftingBoreholeCommandPreview(
  session: DraftingCommandSession,
  point: DraftingPoint | null | undefined,
): DraftingCommandSession {
  if (session.tool !== 'borehole' || !point) {
    return session;
  }

  return {
    ...session,
    previewPoint: cloneDraftingPoint(point),
  };
}

export function updateDraftingPileCommandPreview(
  session: DraftingCommandSession,
  point: DraftingPoint | null | undefined,
): DraftingCommandSession {
  if (session.tool !== 'pile' || !point) {
    return session;
  }

  return {
    ...session,
    previewPoint: cloneDraftingPoint(point),
  };
}

export function updateDraftingPathCommandPreview(
  session: DraftingCommandSession,
  point: DraftingPoint | null | undefined,
): DraftingCommandSession {
  if (
    session.tool === 'idle' ||
    session.tool === 'dimension_chain' ||
    session.tool === 'section_marker' ||
    session.tool === 'leader_note' ||
    session.tool === 'callout' ||
    session.tool === 'monitoring_point' ||
    session.tool === 'structural_joint' ||
    session.tool === 'service_crossing' ||
    session.tool === 'borehole' ||
    session.tool === 'pile' ||
    isDraftingPrimitiveCommandTool(session.tool) ||
    session.points.length === 0 ||
    !point
  ) {
    return session;
  }

  return {
    ...session,
    previewPoint: cloneDraftingPoint(point),
  };
}

export function commitDraftingPrimitiveCommandPoint(
  session: DraftingCommandSession,
  tool: DraftingPrimitiveCommandTool,
  point: DraftingPoint | null | undefined,
): DraftingPrimitiveCommandCommit {
  const activeSession = ensureDraftingPrimitiveCommand(session, tool);
  if (!point) {
    return { committed: false, session: activeSession };
  }

  const nextPoint = cloneDraftingPoint(point);
  if (activeSession.points.length === 0) {
    return {
      committed: false,
      session: {
        ...activeSession,
        phase: 'waiting_second_point',
        points: [nextPoint],
        previewPoint: null,
      },
    };
  }

  const startPoint = activeSession.points[0]!;
  if (areDraftingPointsCoincident(startPoint, nextPoint)) {
    return {
      committed: false,
      session: {
        ...activeSession,
        previewPoint: null,
      },
    };
  }

  return {
    committed: true,
    points: [startPoint, nextPoint],
    session: IDLE_DRAFTING_COMMAND_SESSION,
    tool: activeSession.tool,
  };
}

export function commitDraftingLineCommandPoint(
  session: DraftingCommandSession,
  point: DraftingPoint | null | undefined,
): DraftingPrimitiveCommandCommit {
  return commitDraftingPrimitiveCommandPoint(session, 'draft_line', point);
}

export function commitDraftingSectionMarkerCommandPoint(
  session: DraftingCommandSession,
  point: DraftingPoint | null | undefined,
): DraftingSectionMarkerCommandCommit {
  const activeSession = ensureDraftingSectionMarkerCommand(session);
  if (!point) {
    return { committed: false, session: activeSession };
  }

  const nextPoint = cloneDraftingPoint(point);
  if (activeSession.points.length === 0) {
    return {
      committed: false,
      session: {
        ...activeSession,
        phase: 'waiting_second_point',
        points: [nextPoint],
        previewPoint: null,
      },
    };
  }

  const startPoint = activeSession.points[0]!;
  if (areDraftingPointsCoincident(startPoint, nextPoint)) {
    return {
      committed: false,
      session: {
        ...activeSession,
        previewPoint: null,
      },
    };
  }

  return {
    committed: true,
    points: [startPoint, nextPoint],
    session: IDLE_DRAFTING_COMMAND_SESSION,
    tool: 'section_marker',
  };
}

export function commitDraftingLeaderNoteCommandPoint(
  session: DraftingCommandSession,
  point: DraftingPoint | null | undefined,
): DraftingLeaderNoteCommandCommit {
  const activeSession = ensureDraftingLeaderNoteCommand(session);
  if (!point) {
    return { committed: false, session: activeSession };
  }

  return {
    committed: true,
    point: cloneDraftingPoint(point),
    session: IDLE_DRAFTING_COMMAND_SESSION,
    tool: 'leader_note',
  };
}

export function commitDraftingCalloutCommandPoint(
  session: DraftingCommandSession,
  point: DraftingPoint | null | undefined,
): DraftingCalloutCommandCommit {
  const activeSession = ensureDraftingCalloutCommand(session);
  if (!point) {
    return { committed: false, session: activeSession };
  }

  return {
    committed: true,
    point: cloneDraftingPoint(point),
    session: IDLE_DRAFTING_COMMAND_SESSION,
    tool: 'callout',
  };
}

export function commitDraftingMonitoringPointCommandPoint(
  session: DraftingCommandSession,
  point: DraftingPoint | null | undefined,
): DraftingMonitoringPointCommandCommit {
  const activeSession = ensureDraftingMonitoringPointCommand(session);
  if (!point) {
    return { committed: false, session: activeSession };
  }

  return {
    committed: true,
    placement: createManualDraftingPointPlacement(point),
    session: IDLE_DRAFTING_COMMAND_SESSION,
    tool: 'monitoring_point',
  };
}

export function commitDraftingStructuralJointCommandPoint(
  session: DraftingCommandSession,
  point: DraftingPoint | null | undefined,
): DraftingStructuralJointCommandCommit {
  const activeSession = ensureDraftingStructuralJointCommand(session);
  if (!point) {
    return { committed: false, session: activeSession };
  }

  return {
    committed: true,
    placement: createManualDraftingPointPlacement(point),
    session: IDLE_DRAFTING_COMMAND_SESSION,
    tool: 'structural_joint',
  };
}

export function commitDraftingServiceCrossingCommandPoint(
  session: DraftingCommandSession,
  point: DraftingPoint | null | undefined,
): DraftingServiceCrossingCommandCommit {
  const activeSession = ensureDraftingServiceCrossingCommand(session);
  if (!point) {
    return { committed: false, session: activeSession };
  }

  return {
    committed: true,
    placement: createManualDraftingPointPlacement(point),
    session: IDLE_DRAFTING_COMMAND_SESSION,
    tool: 'service_crossing',
  };
}

export function commitDraftingBoreholeCommandPoint(
  session: DraftingCommandSession,
  point: DraftingPoint | null | undefined,
): DraftingBoreholeCommandCommit {
  const activeSession = ensureDraftingBoreholeCommand(session);
  if (!point) {
    return { committed: false, session: activeSession };
  }

  return {
    committed: true,
    placement: createManualDraftingPointPlacement(point),
    session: IDLE_DRAFTING_COMMAND_SESSION,
    tool: 'borehole',
  };
}

export function commitDraftingPileCommandPoint(
  session: DraftingCommandSession,
  point: DraftingPoint | null | undefined,
): DraftingPileCommandCommit {
  const activeSession = ensureDraftingPileCommand(session);
  if (!point) {
    return { committed: false, session: activeSession };
  }

  return {
    committed: true,
    placement: createManualDraftingPointPlacement(point),
    session: IDLE_DRAFTING_COMMAND_SESSION,
    tool: 'pile',
  };
}

export function commitDraftingDimensionCommandPoint(
  session: DraftingCommandSession,
  point: DraftingPoint | null | undefined,
): DraftingDimensionCommandCommit {
  const activeSession = ensureDraftingDimensionCommand(session);
  if (!point) {
    return { committed: false, session: activeSession };
  }

  const nextPoint = cloneDraftingPoint(point);
  if (activeSession.points.length === 0) {
    return {
      committed: false,
      session: {
        ...activeSession,
        phase: 'waiting_second_witness',
        points: [nextPoint],
        previewPoint: null,
      },
    };
  }

  if (activeSession.points.length === 1) {
    const firstWitnessPoint = activeSession.points[0]!;
    if (areDraftingPointsCoincident(firstWitnessPoint, nextPoint)) {
      return {
        committed: false,
        session: {
          ...activeSession,
          previewPoint: null,
        },
      };
    }

    return {
      committed: false,
      session: {
        ...activeSession,
        phase: 'waiting_offset',
        points: [firstWitnessPoint, nextPoint],
        previewPoint: null,
      },
    };
  }

  const [firstWitnessPoint, secondWitnessPoint] = activeSession.points;
  return {
    committed: true,
    points: [firstWitnessPoint!, secondWitnessPoint!, nextPoint],
    session: IDLE_DRAFTING_COMMAND_SESSION,
    tool: 'dimension_chain',
  };
}

export function commitDraftingPathCommandPoint(
  session: DraftingCommandSession,
  tool: DraftingPathCommandTool,
  point: DraftingPoint | null | undefined,
): DraftingPathCommandCommit {
  const activeSession = ensureDraftingPathCommand(session, tool);
  if (!point) {
    return { committed: false, session: activeSession };
  }

  const nextPoint = cloneDraftingPoint(point);
  const previousPoint = activeSession.points.at(-1);
  if (previousPoint && areDraftingPointsCoincident(previousPoint, nextPoint)) {
    return {
      committed: false,
      session: {
        ...activeSession,
        previewPoint: null,
      },
    };
  }

  return {
    committed: false,
    session: {
      ...activeSession,
      phase: 'collecting_points',
      points: [...activeSession.points, nextPoint],
      previewPoint: null,
    },
  };
}

export function finishDraftingPathCommand(
  session: DraftingCommandSession,
): DraftingPathCommandCommit {
  switch (session.tool) {
    case 'draft_polyline':
    case 'draft_polygon': {
      if (session.points.length < 2) {
        return { committed: false, session };
      }

      return {
        committed: true,
        points: session.points.map(cloneDraftingPoint),
        session: IDLE_DRAFTING_COMMAND_SESSION,
        tool:
          session.tool === 'draft_polygon' && session.points.length < 3
            ? 'draft_polyline'
            : session.tool,
      };
    }
    default:
      return { committed: false, session };
  }
}

export function cancelDraftingCommandSession(): DraftingCommandSession {
  return IDLE_DRAFTING_COMMAND_SESSION;
}

export function getDraftingCommandPoints(session: DraftingCommandSession): DraftingPoint[] {
  return session.tool !== 'idle' ? session.points : [];
}

export function getDraftingCommandPreviewPoints(session: DraftingCommandSession): DraftingPoint[] {
  if (session.tool === 'leader_note') {
    return session.previewPoint ? [session.previewPoint] : [];
  }

  if (session.tool === 'callout') {
    return session.previewPoint ? [session.previewPoint] : [];
  }

  if (session.tool === 'monitoring_point') {
    return session.previewPoint ? [session.previewPoint] : [];
  }

  if (session.tool === 'structural_joint') {
    return session.previewPoint ? [session.previewPoint] : [];
  }

  if (session.tool === 'service_crossing') {
    return session.previewPoint ? [session.previewPoint] : [];
  }

  if (session.tool === 'borehole') {
    return session.previewPoint ? [session.previewPoint] : [];
  }

  if (session.tool === 'pile') {
    return session.previewPoint ? [session.previewPoint] : [];
  }

  if (session.tool === 'idle' || session.points.length === 0) {
    return [];
  }

  return session.previewPoint ? [...session.points, session.previewPoint] : session.points;
}

export function getDraftingCommandTool(
  session: DraftingCommandSession,
): DraftingCommandTool | null {
  return session.tool === 'idle' ? null : session.tool;
}

function areDraftingPointsCoincident(pointA: DraftingPoint, pointB: DraftingPoint) {
  return pointA.x === pointB.x && pointA.y === pointB.y;
}

function cloneDraftingPoint(point: DraftingPoint): DraftingPoint {
  return { ...point };
}

export function createManualDraftingPointPlacement(
  point: DraftingPoint,
): DraftingManualPointPlacement {
  return {
    point: cloneDraftingPoint(point),
    sourceMode: 'manual_sketch',
  };
}

// Two-point engineering commands capture manual/sketch placement only.
// Derived engineering and source-linked fields stay factory-owned or source-owned.
export function createManualTwoPointEngineeringPlacement(
  startPoint: DraftingPoint,
  endPoint: DraftingPoint,
): DraftingManualTwoPointEngineeringPlacement {
  return {
    endPoint: cloneDraftingPoint(endPoint),
    sourceMode: 'manual_sketch',
    startPoint: cloneDraftingPoint(startPoint),
  };
}
