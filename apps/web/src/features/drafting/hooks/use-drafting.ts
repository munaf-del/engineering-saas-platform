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
  commitDraftingAnchorTiebackCommandPoint,
  commitDraftingBoreholeCommandPoint,
  commitDraftingCalloutCommandPoint,
  commitDraftingDimensionCommandPoint,
  commitDraftingLeaderNoteCommandPoint,
  commitDraftingMonitoringPointCommandPoint,
  commitDraftingPathCommandPoint,
  commitDraftingPileCommandPoint,
  commitDraftingPrimitiveCommandPoint,
  commitDraftingSectionMarkerCommandPoint,
  commitDraftingServiceCrossingCommandPoint,
  commitDraftingStructuralJointCommandPoint,
  commitDraftingTwoPointCommandPoint,
  finishDraftingPathCommand,
  getDraftingCommandPoints,
  getDraftingCommandPreviewPoints,
  getDraftingCommandTool,
  IDLE_DRAFTING_COMMAND_SESSION,
  isDraftingAnchorTiebackCommandTool,
  isDraftingBoreholeCommandTool,
  isDraftingCalloutCommandTool,
  isDraftingCommandTool,
  isDraftingDimensionCommandTool,
  isDraftingLeaderNoteCommandTool,
  isDraftingMonitoringPointCommandTool,
  isDraftingPathCommandTool,
  isDraftingPileCommandTool,
  isDraftingPrimitiveCommandTool,
  isDraftingSectionMarkerCommandTool,
  isDraftingServiceCrossingCommandTool,
  isDraftingStructuralJointCommandTool,
  isDraftingTwoPointCommandTool,
  startDraftingAnchorTiebackCommand,
  startDraftingBoreholeCommand,
  startDraftingCalloutCommand,
  startDraftingDimensionCommand,
  startDraftingLeaderNoteCommand,
  startDraftingMonitoringPointCommand,
  startDraftingPathCommand,
  startDraftingPileCommand,
  startDraftingPrimitiveCommand,
  startDraftingSectionMarkerCommand,
  startDraftingSecantPileWallCommand,
  startDraftingServiceCrossingCommand,
  startDraftingSoldierPileWallCommand,
  startDraftingStructuralJointCommand,
  startDraftingTwoPointCommand,
  updateDraftingAnchorTiebackCommandPreview,
  updateDraftingBoreholeCommandPreview,
  updateDraftingCalloutCommandPreview,
  updateDraftingDimensionCommandPreview,
  updateDraftingLeaderNoteCommandPreview,
  updateDraftingMonitoringPointCommandPreview,
  updateDraftingPathCommandPreview,
  updateDraftingPileCommandPreview,
  updateDraftingPrimitiveCommandPreview,
  updateDraftingSectionMarkerCommandPreview,
  updateDraftingServiceCrossingCommandPreview,
  updateDraftingStructuralJointCommandPreview,
  updateDraftingTwoPointCommandPreview,
  type DraftingAnchorTiebackCommandCommit,
  type DraftingBoreholeCommandCommit,
  type DraftingCommandSession,
  type DraftingCalloutCommandCommit,
  type DraftingDimensionCommandCommit,
  type DraftingLeaderNoteCommandCommit,
  type DraftingMonitoringPointCommandCommit,
  type DraftingPathCommandCommit,
  type DraftingPathCommandTool,
  type DraftingPileCommandCommit,
  type DraftingPrimitiveCommandCommit,
  type DraftingPrimitiveCommandTool,
  type DraftingSectionMarkerCommandCommit,
  type DraftingServiceCrossingCommandCommit,
  type DraftingStructuralJointCommandCommit,
  type DraftingTwoPointCommandCommit,
  type DraftingTwoPointCommandTool,
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
    if (isDraftingTwoPointCommandTool(tool)) {
      setCommandSession(startDraftingTwoPointCommand(tool));
      return;
    }
    if (isDraftingPathCommandTool(tool)) {
      if (tool === 'secant_pile_wall') {
        setCommandSession(startDraftingSecantPileWallCommand());
        return;
      }
      if (tool === 'soldier_pile_wall') {
        setCommandSession(startDraftingSoldierPileWallCommand());
        return;
      }
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
    if (isDraftingMonitoringPointCommandTool(tool)) {
      setCommandSession(startDraftingMonitoringPointCommand());
      return;
    }
    if (isDraftingStructuralJointCommandTool(tool)) {
      setCommandSession(startDraftingStructuralJointCommand());
      return;
    }
    if (isDraftingServiceCrossingCommandTool(tool)) {
      setCommandSession(startDraftingServiceCrossingCommand());
      return;
    }
    if (isDraftingBoreholeCommandTool(tool)) {
      setCommandSession(startDraftingBoreholeCommand());
      return;
    }
    if (isDraftingPileCommandTool(tool)) {
      setCommandSession(startDraftingPileCommand());
      return;
    }
    if (isDraftingAnchorTiebackCommandTool(tool)) {
      setCommandSession(startDraftingAnchorTiebackCommand());
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

  function commitMonitoringPointCommandPoint(
    point: DraftingPoint | null,
  ): DraftingMonitoringPointCommandCommit {
    const result = commitDraftingMonitoringPointCommandPoint(commandSession, point);
    setCommandSession(result.session);
    return result;
  }

  function updateMonitoringPointCommandPreview(point: DraftingPoint | null) {
    setCommandSession((current) => updateDraftingMonitoringPointCommandPreview(current, point));
  }

  function commitStructuralJointCommandPoint(
    point: DraftingPoint | null,
  ): DraftingStructuralJointCommandCommit {
    const result = commitDraftingStructuralJointCommandPoint(commandSession, point);
    setCommandSession(result.session);
    return result;
  }

  function updateStructuralJointCommandPreview(point: DraftingPoint | null) {
    setCommandSession((current) => updateDraftingStructuralJointCommandPreview(current, point));
  }

  function commitServiceCrossingCommandPoint(
    point: DraftingPoint | null,
  ): DraftingServiceCrossingCommandCommit {
    const result = commitDraftingServiceCrossingCommandPoint(commandSession, point);
    setCommandSession(result.session);
    return result;
  }

  function updateServiceCrossingCommandPreview(point: DraftingPoint | null) {
    setCommandSession((current) => updateDraftingServiceCrossingCommandPreview(current, point));
  }

  function commitBoreholeCommandPoint(point: DraftingPoint | null): DraftingBoreholeCommandCommit {
    const result = commitDraftingBoreholeCommandPoint(commandSession, point);
    setCommandSession(result.session);
    return result;
  }

  function updateBoreholeCommandPreview(point: DraftingPoint | null) {
    setCommandSession((current) => updateDraftingBoreholeCommandPreview(current, point));
  }

  function commitPileCommandPoint(point: DraftingPoint | null): DraftingPileCommandCommit {
    const result = commitDraftingPileCommandPoint(commandSession, point);
    setCommandSession(result.session);
    return result;
  }

  function updatePileCommandPreview(point: DraftingPoint | null) {
    setCommandSession((current) => updateDraftingPileCommandPreview(current, point));
  }

  function commitAnchorTiebackCommandPoint(
    point: DraftingPoint | null,
  ): DraftingAnchorTiebackCommandCommit {
    const result = commitDraftingAnchorTiebackCommandPoint(commandSession, point);
    setCommandSession(result.session);
    return result;
  }

  function updateAnchorTiebackCommandPreview(point: DraftingPoint | null) {
    setCommandSession((current) => updateDraftingAnchorTiebackCommandPreview(current, point));
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

  function commitTwoPointCommandPoint(
    tool: DraftingTwoPointCommandTool,
    point: DraftingPoint | null,
  ): DraftingTwoPointCommandCommit {
    const result = commitDraftingTwoPointCommandPoint(commandSession, tool, point);
    setCommandSession(result.session);
    return result;
  }

  function updateTwoPointCommandPreview(point: DraftingPoint | null) {
    setCommandSession((current) => updateDraftingTwoPointCommandPreview(current, point));
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
    commitAnchorTiebackCommandPoint,
    commitBoreholeCommandPoint,
    commitCalloutCommandPoint,
    commitDimensionCommandPoint,
    commitLeaderNoteCommandPoint,
    commitMonitoringPointCommandPoint,
    commitPathCommandPoint,
    commitPileCommandPoint,
    commitPrimitiveCommandPoint,
    commitSectionMarkerCommandPoint,
    commitServiceCrossingCommandPoint,
    commitStructuralJointCommandPoint,
    commitTwoPointCommandPoint,
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
    updateAnchorTiebackCommandPreview,
    updateBoreholeCommandPreview,
    updateCalloutCommandPreview,
    updateDimensionCommandPreview,
    updateLeaderNoteCommandPreview,
    updateMonitoringPointCommandPreview,
    updatePathCommandPreview,
    updatePileCommandPreview,
    updatePrimitiveCommandPreview,
    updateSectionMarkerCommandPreview,
    updateServiceCrossingCommandPreview,
    updateStructuralJointCommandPreview,
    updateTwoPointCommandPreview,
  };
}
