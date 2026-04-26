import type * as React from 'react';
import type {
  DraftingAnchorTiebackObject,
  DraftingBoreholeObject,
  DraftingCalloutObject,
  DraftingCappingBeamObject,
  DraftingCircleObject,
  DraftingDimensionChainObject,
  DraftingDrawingSetup,
  DraftingExcavationLineObject,
  DraftingGeotechSurfaceObject,
  DraftingLayer,
  DraftingLeaderNoteObject,
  DraftingLineObject,
  DraftingMonitoringPointObject,
  DraftingObject,
  DraftingPileObject,
  DraftingPolygonObject,
  DraftingPolylineObject,
  DraftingRectangleObject,
  DraftingSecantPileWallObject,
  DraftingSectionMarkerObject,
  DraftingServiceCrossingObject,
  DraftingServiceRunObject,
  DraftingSoldierPileWallObject,
  DraftingStructuralJointObject,
  DraftingWalerObject,
} from '@eng/shared';
import {
  resolveDraftingLineStyle,
  resolveDraftingPaperLineStyle,
  type ResolvedDraftingLineStyle,
} from '../standards/drafting-style-resolver';
import type { DraftingLineRole } from '../standards/drafting-standard-profiles';

export type DraftingRendererProps<T extends DraftingObject = DraftingObject> = {
  drawingSetup?: DraftingDrawingSetup;
  isSelected: boolean;
  layer: DraftingLayer | null;
  object: T;
  onPointerDown: (event: React.PointerEvent) => void;
  allObjects?: DraftingObject[];
  surface?: 'editor' | 'sheet';
};

export function resolveRendererLineStyle(
  props: Pick<DraftingRendererProps, 'drawingSetup' | 'layer' | 'object' | 'surface'> & {
    role?: DraftingLineRole;
  },
): ResolvedDraftingLineStyle {
  const resolver =
    props.surface === 'sheet' ? resolveDraftingPaperLineStyle : resolveDraftingLineStyle;
  return resolver({
    layer: props.layer,
    object: props.object,
    role: props.role,
    setup: props.drawingSetup,
  });
}

export const DRAFTING_SELECTION_STYLE = {
  fill: 'rgba(37, 99, 235, 0.08)',
  stroke: '#2563eb',
  strokeDasharray: '160 120',
  strokeWidth: 2,
} as const;

export const DRAFTING_TECHNICAL_FILLS = {
  none: 'none',
  pile: 'rgba(15, 23, 42, 0.025)',
  structural: 'rgba(15, 23, 42, 0.035)',
  serviceConflict: 'rgba(127, 29, 29, 0.04)',
  survey: 'rgba(15, 23, 42, 0.025)',
  annotation: 'rgba(255, 255, 255, 0.92)',
} as const;

export function resolveTechnicalStroke(
  stroke: string | undefined,
  lineStyle: ResolvedDraftingLineStyle,
  legacyPalette: string[] = [],
) {
  if (!stroke || legacyPalette.includes(stroke.toLowerCase())) {
    return lineStyle.color;
  }

  return stroke;
}

export function resolveTechnicalFill(fill: string | undefined, fallback: string) {
  if (!fill || fill === '#ffffff' || fill === 'transparent') {
    return fallback;
  }

  const lowerFill = fill.toLowerCase();
  if (
    lowerFill === '#fdba74' ||
    lowerFill === '#dcfce7' ||
    lowerFill === '#fee2e2' ||
    lowerFill === 'rgba(59, 130, 246, 0.2)'
  ) {
    return fallback;
  }

  return fill;
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
export type DraftingLineRendererProps = DraftingRendererProps<DraftingLineObject>;
export type DraftingPolylineRendererProps = DraftingRendererProps<DraftingPolylineObject>;
export type DraftingRectangleRendererProps = DraftingRendererProps<DraftingRectangleObject>;
export type DraftingCircleRendererProps = DraftingRendererProps<DraftingCircleObject>;
export type DraftingPolygonRendererProps = DraftingRendererProps<DraftingPolygonObject>;
export type DraftingStructuralJointRendererProps =
  DraftingRendererProps<DraftingStructuralJointObject>;
export type DraftingGeotechSurfaceRendererProps =
  DraftingRendererProps<DraftingGeotechSurfaceObject>;
