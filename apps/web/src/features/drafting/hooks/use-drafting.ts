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
  commitDraftingPrimitiveCommandPoint,
  getDraftingCommandPoints,
  getDraftingCommandPreviewPoints,
  getDraftingCommandTool,
  IDLE_DRAFTING_COMMAND_SESSION,
  isDraftingPrimitiveCommandTool,
  startDraftingPrimitiveCommand,
  updateDraftingPrimitiveCommandPreview,
  type DraftingPrimitiveCommandCommit,
  type DraftingPrimitiveCommandSession,
  type DraftingPrimitiveCommandTool,
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
  const [commandSession, setCommandSession] = useState<DraftingPrimitiveCommandSession>(
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
      isDraftingPrimitiveCommandTool(tool)
        ? startDraftingPrimitiveCommand(tool)
        : cancelDraftingCommandSession(),
    );
  }

  function commitPrimitiveCommandPoint(
    tool: DraftingPrimitiveCommandTool,
    point: DraftingPoint | null,
  ): DraftingPrimitiveCommandCommit {
    const result = commitDraftingPrimitiveCommandPoint(commandSession, tool, point);
    setCommandSession(result.session);
    return result;
  }

  function updatePrimitiveCommandPreview(point: DraftingPoint | null) {
    setCommandSession((current) => updateDraftingPrimitiveCommandPreview(current, point));
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
    commandPreviewTool: getDraftingCommandTool(commandSession),
    commandPreviewPoints: getDraftingCommandPreviewPoints(commandSession),
    commitPrimitiveCommandPoint,
    pendingLinePoints: isDraftingPrimitiveCommandTool(activeTool)
      ? getDraftingCommandPoints(commandSession)
      : pendingLinePoints,
    setActiveTab,
    setActiveTool: changeActiveTool,
    setPendingLinePoints,
    setSnapSettings,
    snapSettings,
    toggleSnapEnabled,
    toggleSnapMode,
    updatePrimitiveCommandPreview,
  };
}
