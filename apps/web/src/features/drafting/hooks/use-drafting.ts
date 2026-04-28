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
  commitDraftingCalloutCommandPoint,
  commitDraftingDimensionCommandPoint,
  commitDraftingLeaderNoteCommandPoint,
  commitDraftingPathCommandPoint,
  commitDraftingPrimitiveCommandPoint,
  commitDraftingSectionMarkerCommandPoint,
  finishDraftingPathCommand,
  getDraftingCommandPoints,
  getDraftingCommandPreviewPoints,
  getDraftingCommandTool,
  IDLE_DRAFTING_COMMAND_SESSION,
  isDraftingCalloutCommandTool,
  isDraftingCommandTool,
  isDraftingDimensionCommandTool,
  isDraftingLeaderNoteCommandTool,
  isDraftingPathCommandTool,
  isDraftingPrimitiveCommandTool,
  isDraftingSectionMarkerCommandTool,
  startDraftingCalloutCommand,
  startDraftingDimensionCommand,
  startDraftingLeaderNoteCommand,
  startDraftingPathCommand,
  startDraftingPrimitiveCommand,
  startDraftingSectionMarkerCommand,
  updateDraftingCalloutCommandPreview,
  updateDraftingDimensionCommandPreview,
  updateDraftingLeaderNoteCommandPreview,
  updateDraftingPathCommandPreview,
  updateDraftingPrimitiveCommandPreview,
  updateDraftingSectionMarkerCommandPreview,
  type DraftingCommandSession,
  type DraftingCalloutCommandCommit,
  type DraftingDimensionCommandCommit,
  type DraftingLeaderNoteCommandCommit,
  type DraftingPathCommandCommit,
  type DraftingPathCommandTool,
  type DraftingPrimitiveCommandCommit,
  type DraftingPrimitiveCommandTool,
  type DraftingSectionMarkerCommandCommit,
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
  const [commandSession, setCommandSession] = useState<DraftingCommandSession>(
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
    if (isDraftingPrimitiveCommandTool(tool)) {
      setCommandSession(startDraftingPrimitiveCommand(tool));
      return;
    }
    if (isDraftingDimensionCommandTool(tool)) {
      setCommandSession(startDraftingDimensionCommand());
      return;
    }
    if (isDraftingPathCommandTool(tool)) {
      setCommandSession(startDraftingPathCommand(tool));
      return;
    }
    if (isDraftingSectionMarkerCommandTool(tool)) {
      setCommandSession(startDraftingSectionMarkerCommand());
      return;
    }
    if (isDraftingLeaderNoteCommandTool(tool)) {
      setCommandSession(startDraftingLeaderNoteCommand());
      return;
    }
    if (isDraftingCalloutCommandTool(tool)) {
      setCommandSession(startDraftingCalloutCommand());
      return;
    }
    setCommandSession(cancelDraftingCommandSession());
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

  function commitSectionMarkerCommandPoint(
    point: DraftingPoint | null,
  ): DraftingSectionMarkerCommandCommit {
    const result = commitDraftingSectionMarkerCommandPoint(commandSession, point);
    setCommandSession(result.session);
    return result;
  }

  function updateSectionMarkerCommandPreview(point: DraftingPoint | null) {
    setCommandSession((current) => updateDraftingSectionMarkerCommandPreview(current, point));
  }

  function commitLeaderNoteCommandPoint(
    point: DraftingPoint | null,
  ): DraftingLeaderNoteCommandCommit {
    const result = commitDraftingLeaderNoteCommandPoint(commandSession, point);
    setCommandSession(result.session);
    return result;
  }

  function updateLeaderNoteCommandPreview(point: DraftingPoint | null) {
    setCommandSession((current) => updateDraftingLeaderNoteCommandPreview(current, point));
  }

  function commitCalloutCommandPoint(point: DraftingPoint | null): DraftingCalloutCommandCommit {
    const result = commitDraftingCalloutCommandPoint(commandSession, point);
    setCommandSession(result.session);
    return result;
  }

  function updateCalloutCommandPreview(point: DraftingPoint | null) {
    setCommandSession((current) => updateDraftingCalloutCommandPreview(current, point));
  }

  function commitDimensionCommandPoint(
    point: DraftingPoint | null,
  ): DraftingDimensionCommandCommit {
    const result = commitDraftingDimensionCommandPoint(commandSession, point);
    setCommandSession(result.session);
    return result;
  }

  function updateDimensionCommandPreview(point: DraftingPoint | null) {
    setCommandSession((current) => updateDraftingDimensionCommandPreview(current, point));
  }

  function commitPathCommandPoint(
    tool: DraftingPathCommandTool,
    point: DraftingPoint | null,
  ): DraftingPathCommandCommit {
    const result = commitDraftingPathCommandPoint(commandSession, tool, point);
    setCommandSession(result.session);
    return result;
  }

  function finishPathCommand(): DraftingPathCommandCommit {
    const result = finishDraftingPathCommand(commandSession);
    setCommandSession(result.session);
    return result;
  }

  function updatePathCommandPreview(point: DraftingPoint | null) {
    setCommandSession((current) => updateDraftingPathCommandPreview(current, point));
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
    commitCalloutCommandPoint,
    commitDimensionCommandPoint,
    commitLeaderNoteCommandPoint,
    commitPathCommandPoint,
    commitPrimitiveCommandPoint,
    commitSectionMarkerCommandPoint,
    finishPathCommand,
    pendingLinePoints: isDraftingCommandTool(activeTool)
      ? getDraftingCommandPoints(commandSession)
      : pendingLinePoints,
    setActiveTab,
    setActiveTool: changeActiveTool,
    setPendingLinePoints,
    setSnapSettings,
    snapSettings,
    toggleSnapEnabled,
    toggleSnapMode,
    updateCalloutCommandPreview,
    updateDimensionCommandPreview,
    updateLeaderNoteCommandPreview,
    updatePathCommandPreview,
    updatePrimitiveCommandPreview,
    updateSectionMarkerCommandPreview,
  };
}
