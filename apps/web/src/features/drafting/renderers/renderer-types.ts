import type * as React from 'react';
import type {
  DraftingAnchorTiebackObject,
  DraftingBoreholeObject,
  DraftingCalloutObject,
  DraftingCappingBeamObject,
  DraftingDimensionChainObject,
  DraftingDrawingSetup,
  DraftingExcavationLineObject,
  DraftingLayer,
  DraftingLeaderNoteObject,
  DraftingMonitoringPointObject,
  DraftingObject,
  DraftingPileObject,
  DraftingSecantPileWallObject,
  DraftingSectionMarkerObject,
  DraftingServiceCrossingObject,
  DraftingServiceRunObject,
  DraftingSoldierPileWallObject,
  DraftingWalerObject,
} from '@eng/shared';
import {
  resolveDraftingLineStyle,
  resolveDraftingPaperLineStyle,
  type ResolvedDraftingLineStyle,
} from '../standards/drafting-style-resolver';

export type DraftingRendererProps<T extends DraftingObject = DraftingObject> = {
  drawingSetup?: DraftingDrawingSetup;
  isSelected: boolean;
  layer: DraftingLayer | null;
  object: T;
  onPointerDown: (event: React.PointerEvent) => void;
  surface?: 'editor' | 'sheet';
};

export function resolveRendererLineStyle(
  props: Pick<DraftingRendererProps, 'drawingSetup' | 'layer' | 'object' | 'surface'>,
): ResolvedDraftingLineStyle {
  const resolver =
    props.surface === 'sheet' ? resolveDraftingPaperLineStyle : resolveDraftingLineStyle;
  return resolver({
    layer: props.layer,
    object: props.object,
    setup: props.drawingSetup,
  });
}

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
export type DraftingDimensionChainRendererProps =
  DraftingRendererProps<DraftingDimensionChainObject>;
export type DraftingCalloutRendererProps = DraftingRendererProps<DraftingCalloutObject>;
export type DraftingSectionMarkerRendererProps = DraftingRendererProps<DraftingSectionMarkerObject>;
export type DraftingBoreholeRendererProps = DraftingRendererProps<DraftingBoreholeObject>;
export type DraftingServiceRunRendererProps = DraftingRendererProps<DraftingServiceRunObject>;
export type DraftingServiceCrossingRendererProps =
  DraftingRendererProps<DraftingServiceCrossingObject>;
