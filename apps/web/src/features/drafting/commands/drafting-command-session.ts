import type { DraftingPoint } from '@eng/shared';

export type DraftingLineCommandSession =
  | {
      tool: 'idle';
    }
  | {
      phase: 'waiting_first_point' | 'waiting_next_point';
      points: DraftingPoint[];
      previewPoint: DraftingPoint | null;
      tool: 'draft_line';
    };
type ActiveDraftingLineCommandSession = Extract<DraftingLineCommandSession, { tool: 'draft_line' }>;

export type DraftingLineCommandCommit =
  | {
      committed: false;
      session: DraftingLineCommandSession;
    }
  | {
      committed: true;
      points: [DraftingPoint, DraftingPoint];
      session: DraftingLineCommandSession;
    };

export const IDLE_DRAFTING_COMMAND_SESSION: DraftingLineCommandSession = { tool: 'idle' };

export function startDraftingLineCommand(): ActiveDraftingLineCommandSession {
  return {
    phase: 'waiting_first_point',
    points: [],
    previewPoint: null,
    tool: 'draft_line',
  };
}

export function ensureDraftingLineCommand(
  session: DraftingLineCommandSession,
): ActiveDraftingLineCommandSession {
  return session.tool === 'draft_line' ? session : startDraftingLineCommand();
}

export function updateDraftingLineCommandPreview(
  session: DraftingLineCommandSession,
  point: DraftingPoint | null | undefined,
): DraftingLineCommandSession {
  if (session.tool !== 'draft_line' || !point) {
    return session;
  }

  return {
    ...session,
    previewPoint: cloneDraftingPoint(point),
  };
}

export function commitDraftingLineCommandPoint(
  session: DraftingLineCommandSession,
  point: DraftingPoint | null | undefined,
): DraftingLineCommandCommit {
  const activeSession = ensureDraftingLineCommand(session);
  if (!point) {
    return { committed: false, session: activeSession };
  }

  const nextPoint = cloneDraftingPoint(point);
  if (activeSession.points.length === 0) {
    return {
      committed: false,
      session: {
        ...activeSession,
        phase: 'waiting_next_point',
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
  };
}

export function cancelDraftingCommandSession(): DraftingLineCommandSession {
  return IDLE_DRAFTING_COMMAND_SESSION;
}

export function getDraftingCommandPoints(session: DraftingLineCommandSession): DraftingPoint[] {
  return session.tool === 'draft_line' ? session.points : [];
}

export function getDraftingCommandPreviewPoints(
  session: DraftingLineCommandSession,
): DraftingPoint[] {
  if (session.tool !== 'draft_line' || session.points.length === 0) {
    return [];
  }

  return session.previewPoint ? [...session.points, session.previewPoint] : session.points;
}

function areDraftingPointsCoincident(pointA: DraftingPoint, pointB: DraftingPoint) {
  return pointA.x === pointB.x && pointA.y === pointB.y;
}

function cloneDraftingPoint(point: DraftingPoint): DraftingPoint {
  return { ...point };
}
