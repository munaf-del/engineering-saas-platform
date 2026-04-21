import type * as React from 'react';
import type {
  DraftingExcavationLineObject,
  DraftingLayer,
  DraftingLeaderNoteObject,
  DraftingMonitoringPointObject,
  DraftingObject,
  DraftingPileObject,
} from '@eng/shared';

export type DraftingRendererProps<T extends DraftingObject = DraftingObject> = {
  isSelected: boolean;
  layer: DraftingLayer | null;
  object: T;
  onPointerDown: (event: React.PointerEvent) => void;
};

export type DraftingPileRendererProps = DraftingRendererProps<DraftingPileObject>;
export type DraftingExcavationLineRendererProps =
  DraftingRendererProps<DraftingExcavationLineObject>;
export type DraftingMonitoringPointRendererProps =
  DraftingRendererProps<DraftingMonitoringPointObject>;
export type DraftingLeaderNoteRendererProps = DraftingRendererProps<DraftingLeaderNoteObject>;
