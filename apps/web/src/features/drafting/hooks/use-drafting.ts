import { useState } from 'react';
import type { DraftingPoint } from '@eng/shared';
import type { DraftingTool } from '../tools/drafting-tool-types';

export type DraftingInspectorTab =
  | 'setup'
  | 'properties'
  | 'layers'
  | 'underlays'
  | 'schedules'
  | 'sheets'
  | 'transmittals';

export function useDrafting() {
  const [activeTool, setActiveTool] = useState<DraftingTool>('select');
  const [pendingLinePoints, setPendingLinePoints] = useState<DraftingPoint[]>([]);
  const [activeTab, setActiveTab] = useState<DraftingInspectorTab>('properties');

  function addPendingLinePoint(point: DraftingPoint) {
    setPendingLinePoints((current) => [...current, point]);
  }

  function clearPendingLine() {
    setPendingLinePoints([]);
  }

  return {
    activeTab,
    activeTool,
    addPendingLinePoint,
    clearPendingLine,
    pendingLinePoints,
    setActiveTab,
    setActiveTool,
    setPendingLinePoints,
  };
}
