import type * as React from 'react';
import type {
  DraftingAnchorTiebackObject,
  DraftingCappingBeamObject,
  DraftingExcavationLineObject,
  DraftingLayer,
  DraftingLeaderNoteObject,
  DraftingMonitoringPointObject,
  DraftingObject,
  DraftingPileObject,
  DraftingSecantPileWallObject,
  DraftingSoldierPileWallObject,
  DraftingWalerObject,
} from '@eng/shared';

export type DraftingRendererProps<T extends DraftingObject = DraftingObject> = {
  isSelected: boolean;
  layer: DraftingLayer | null;
  object: T;
  onPointerDown: (event: React.PointerEvent) => void;
};

export type DraftingPileRendererProps = DraftingRendererProps<DraftingPileObject>;
export type DraftingSecantPileWallRendererProps =
  DraftingRendererProps<DraftingSecantPileWallObject>;
export type DraftingSoldierPileWallRendererProps =
  DraftingRendererProps<DraftingSoldierPileWallObject>;
export type DraftingAnchorTiebackRendererProps = DraftingRendererProps<DraftingAnchorTiebackObject>;
export type DraftingCappingBeamRendererProps = DraftingRendererProps<DraftingCappingBeamObject>;
export type DraftingWalerRendererProps = DraftingRendererProps<DraftingWalerObject>;
export type DraftingExcavationLineRendererProps =
  DraftingRendererProps<DraftingExcavationLineObject>;
export type DraftingMonitoringPointRendererProps =
  DraftingRendererProps<DraftingMonitoringPointObject>;
export type DraftingLeaderNoteRendererProps = DraftingRendererProps<DraftingLeaderNoteObject>;
