import { useState } from 'react';
import type { DraftingPoint } from '@eng/shared';
import {
  DEFAULT_DRAFTING_SNAP_SETTINGS,
  type DraftingSnapMode,
  type DraftingSnapSettings,
} from '../snapping/drafting-snap-utils';
import type { DraftingTool } from '../tools/drafting-tool-types';

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
  }

  function changeActiveTool(tool: DraftingTool) {
    setActiveTool(tool);
    setPendingLinePoints([]);
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
    pendingLinePoints,
    setActiveTab,
    setActiveTool: changeActiveTool,
    setPendingLinePoints,
    setSnapSettings,
    snapSettings,
    toggleSnapEnabled,
    toggleSnapMode,
  };
}
