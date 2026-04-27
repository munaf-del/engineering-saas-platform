import type { DraftingPoint } from '@eng/shared';

export type DraftingPrimitiveCommandTool = 'draft_circle' | 'draft_line' | 'draft_rectangle';

export const DRAFTING_PRIMITIVE_COMMAND_TOOLS = [
  'draft_line',
  'draft_rectangle',
  'draft_circle',
] as const satisfies DraftingPrimitiveCommandTool[];

export type DraftingPrimitiveCommandSession =
  | {
      tool: 'idle';
    }
  | {
      phase: 'waiting_first_point' | 'waiting_second_point';
      points: DraftingPoint[];
      previewPoint: DraftingPoint | null;
      tool: DraftingPrimitiveCommandTool;
    };
type ActiveDraftingPrimitiveCommandSession = Extract<
  DraftingPrimitiveCommandSession,
  { tool: DraftingPrimitiveCommandTool }
>;

export type DraftingPrimitiveCommandCommit =
  | {
      committed: false;
      session: DraftingPrimitiveCommandSession;
    }
  | {
      committed: true;
      points: [DraftingPoint, DraftingPoint];
      session: DraftingPrimitiveCommandSession;
      tool: DraftingPrimitiveCommandTool;
    };

export const IDLE_DRAFTING_COMMAND_SESSION: DraftingPrimitiveCommandSession = { tool: 'idle' };

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

export function isDraftingPrimitiveCommandTool(tool: string): tool is DraftingPrimitiveCommandTool {
  return DRAFTING_PRIMITIVE_COMMAND_TOOLS.includes(tool as DraftingPrimitiveCommandTool);
}

export function ensureDraftingPrimitiveCommand(
  session: DraftingPrimitiveCommandSession,
  tool: DraftingPrimitiveCommandTool,
): ActiveDraftingPrimitiveCommandSession {
  return session.tool === tool ? session : startDraftingPrimitiveCommand(tool);
}

export function updateDraftingPrimitiveCommandPreview(
  session: DraftingPrimitiveCommandSession,
  point: DraftingPoint | null | undefined,
): DraftingPrimitiveCommandSession {
  if (session.tool === 'idle' || !point) {
    return session;
  }

  return {
    ...session,
    previewPoint: cloneDraftingPoint(point),
  };
}

export function updateDraftingLineCommandPreview(
  session: DraftingPrimitiveCommandSession,
  point: DraftingPoint | null | undefined,
): DraftingPrimitiveCommandSession {
  if (session.tool !== 'draft_line') {
    return session;
  }

  return updateDraftingPrimitiveCommandPreview(session, point);
}

export function commitDraftingPrimitiveCommandPoint(
  session: DraftingPrimitiveCommandSession,
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
  session: DraftingPrimitiveCommandSession,
  point: DraftingPoint | null | undefined,
): DraftingPrimitiveCommandCommit {
  return commitDraftingPrimitiveCommandPoint(session, 'draft_line', point);
}

export function cancelDraftingCommandSession(): DraftingPrimitiveCommandSession {
  return IDLE_DRAFTING_COMMAND_SESSION;
}

export function getDraftingCommandPoints(
  session: DraftingPrimitiveCommandSession,
): DraftingPoint[] {
  return session.tool !== 'idle' ? session.points : [];
}

export function getDraftingCommandPreviewPoints(
  session: DraftingPrimitiveCommandSession,
): DraftingPoint[] {
  if (session.tool === 'idle' || session.points.length === 0) {
    return [];
  }

  return session.previewPoint ? [...session.points, session.previewPoint] : session.points;
}

export function getDraftingCommandTool(
  session: DraftingPrimitiveCommandSession,
): DraftingPrimitiveCommandTool | null {
  return session.tool === 'idle' ? null : session.tool;
}

function areDraftingPointsCoincident(pointA: DraftingPoint, pointB: DraftingPoint) {
  return pointA.x === pointB.x && pointA.y === pointB.y;
}

function cloneDraftingPoint(point: DraftingPoint): DraftingPoint {
  return { ...point };
}
