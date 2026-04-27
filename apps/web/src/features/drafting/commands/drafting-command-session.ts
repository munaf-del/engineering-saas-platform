import type { DraftingPoint } from '@eng/shared';

export type DraftingPrimitiveCommandTool = 'draft_circle' | 'draft_line' | 'draft_rectangle';
export type DraftingDimensionCommandTool = 'dimension_chain';
export type DraftingCommandTool = DraftingPrimitiveCommandTool | DraftingDimensionCommandTool;

export const DRAFTING_PRIMITIVE_COMMAND_TOOLS = [
  'draft_line',
  'draft_rectangle',
  'draft_circle',
] as const satisfies DraftingPrimitiveCommandTool[];

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
      phase: 'waiting_first_witness' | 'waiting_second_witness' | 'waiting_offset';
      points: DraftingPoint[];
      previewPoint: DraftingPoint | null;
      tool: DraftingDimensionCommandTool;
    };

export type DraftingPrimitiveCommandSession = DraftingCommandSession;
type ActiveDraftingPrimitiveCommandSession = Extract<
  DraftingCommandSession,
  { tool: DraftingPrimitiveCommandTool }
>;
type ActiveDraftingDimensionCommandSession = Extract<
  DraftingCommandSession,
  { tool: DraftingDimensionCommandTool }
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

export function startDraftingDimensionCommand(): ActiveDraftingDimensionCommandSession {
  return {
    phase: 'waiting_first_witness',
    points: [],
    previewPoint: null,
    tool: 'dimension_chain',
  };
}

export function isDraftingPrimitiveCommandTool(tool: string): tool is DraftingPrimitiveCommandTool {
  return DRAFTING_PRIMITIVE_COMMAND_TOOLS.includes(tool as DraftingPrimitiveCommandTool);
}

export function isDraftingDimensionCommandTool(tool: string): tool is DraftingDimensionCommandTool {
  return tool === 'dimension_chain';
}

export function isDraftingCommandTool(tool: string): tool is DraftingCommandTool {
  return isDraftingPrimitiveCommandTool(tool) || isDraftingDimensionCommandTool(tool);
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

export function updateDraftingPrimitiveCommandPreview(
  session: DraftingCommandSession,
  point: DraftingPoint | null | undefined,
): DraftingCommandSession {
  if (session.tool === 'idle' || session.tool === 'dimension_chain' || !point) {
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

export function cancelDraftingCommandSession(): DraftingCommandSession {
  return IDLE_DRAFTING_COMMAND_SESSION;
}

export function getDraftingCommandPoints(session: DraftingCommandSession): DraftingPoint[] {
  return session.tool !== 'idle' ? session.points : [];
}

export function getDraftingCommandPreviewPoints(session: DraftingCommandSession): DraftingPoint[] {
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
