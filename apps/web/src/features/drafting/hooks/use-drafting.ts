import { useState } from 'react';
import type { DraftingPoint } from '@eng/shared';
import {
  DEFAULT_DRAFTING_SNAP_SETTINGS,
  type DraftingSnapMode,
  type DraftingSnapSettings,
} from '../snapping/drafting-snap-utils';
import type { DraftingTool } from '../tools/drafting-tool-types';
import {
  cancelDraftingCommandSession,
  commitDraftingLineCommandPoint,
  getDraftingCommandPoints,
  getDraftingCommandPreviewPoints,
  IDLE_DRAFTING_COMMAND_SESSION,
  startDraftingLineCommand,
  updateDraftingLineCommandPreview,
  type DraftingLineCommandCommit,
  type DraftingLineCommandSession,
} from '../commands/drafting-command-session';

export type DraftingInspectorTab =
  | 'setup'
  | 'standards'
  | 'properties'
  | 'layers'
  | 'sources'
  | 'underlays'
  | 'schedules'
  | 'sheets'
  | 'transmittals';

export function useDrafting() {
  const [activeTool, setActiveTool] = useState<DraftingTool>('select');
  const [commandSession, setCommandSession] = useState<DraftingLineCommandSession>(
    IDLE_DRAFTING_COMMAND_SESSION,
  );
  const [pendingLinePoints, setPendingLinePoints] = useState<DraftingPoint[]>([]);
  const [snapSettings, setSnapSettings] = useState<DraftingSnapSettings>(
    DEFAULT_DRAFTING_SNAP_SETTINGS,
  );
  const [activeTab, setActiveTab] = useState<DraftingInspectorTab>('properties');

  function addPendingLinePoint(point: DraftingPoint) {
    setPendingLinePoints((current) => [...current, point]);
  }

  function clearPendingLine() {
    setPendingLinePoints([]);
    setCommandSession(cancelDraftingCommandSession());
  }

  function changeActiveTool(tool: DraftingTool) {
    setActiveTool(tool);
    setPendingLinePoints([]);
    setCommandSession(
      tool === 'draft_line' ? startDraftingLineCommand() : cancelDraftingCommandSession(),
    );
  }

  function commitLineCommandPoint(point: DraftingPoint | null): DraftingLineCommandCommit {
    const result = commitDraftingLineCommandPoint(commandSession, point);
    setCommandSession(result.session);
    return result;
  }

  function updateLineCommandPreview(point: DraftingPoint | null) {
    setCommandSession((current) => updateDraftingLineCommandPreview(current, point));
  }

  function toggleSnapEnabled() {
    setSnapSettings((current) => ({ ...current, enabled: !current.enabled }));
  }

  function toggleSnapMode(mode: DraftingSnapMode) {
    setSnapSettings((current) => ({
      ...current,
      modes: {
        ...current.modes,
        [mode]: !current.modes[mode],
      },
    }));
  }

  return {
    activeTab,
    activeTool,
    addPendingLinePoint,
    clearPendingLine,
    commandPreviewPoints: getDraftingCommandPreviewPoints(commandSession),
    commitLineCommandPoint,
    pendingLinePoints:
      activeTool === 'draft_line' ? getDraftingCommandPoints(commandSession) : pendingLinePoints,
    setActiveTab,
    setActiveTool: changeActiveTool,
    setPendingLinePoints,
    setSnapSettings,
    snapSettings,
    toggleSnapEnabled,
    toggleSnapMode,
    updateLineCommandPreview,
  };
}
