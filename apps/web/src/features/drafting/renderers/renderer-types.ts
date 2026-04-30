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
  DraftingProjectGridLineObject,
  DraftingProjectGridObject,
  DraftingRectangleObject,
  DraftingSecantPileWallObject,
  DraftingSectionMarkerObject,
  DraftingServiceCrossingObject,
  DraftingServiceRunObject,
  DraftingShaftObject,
  DraftingSoldierPileWallObject,
  DraftingStructuralJointObject,
  DraftingWalerObject,
} from '@eng/shared';
import {
  resolveDraftingLeaderStyle,
  resolveDraftingLineStyle,
  resolveDraftingPaperLineStyle,
  resolveDraftingTextStyle,
  type ResolvedDraftingLineStyle,
  type ResolvedDraftingTextStyle,
} from '../standards/drafting-style-resolver';
import { getDraftingStandardProfile } from '../standards/drafting-standard-profiles';
import type { DraftingLineRole } from '../standards/drafting-standard-profiles';
import type { DraftingCanvasLabelMode } from './label-policy';
import type { DraftingLabelPlacement } from '../labels/drafting-label-layout';

export type DraftingRendererSurface = 'editor' | 'sheet' | 'export' | 'preview' | 'read_only';

export type DraftingRendererStyleSurface = 'editor' | 'sheet';

export type DraftingRendererContext = {
  interactionEnabled: boolean;
  labelMode?: DraftingCanvasLabelMode;
  readOnly: boolean;
  selectedObjectId: string | null;
  styleSurface: DraftingRendererStyleSurface;
  surface: DraftingRendererSurface;
  viewScale?: number;
};

export type DraftingRendererProps<T extends DraftingObject = DraftingObject> = {
  context?: DraftingRendererContext;
  drawingSetup?: DraftingDrawingSetup;
  isSelected: boolean;
  layer: DraftingLayer | null;
  object: T;
  onPointerDown: (event: React.PointerEvent) => void;
  allObjects?: DraftingObject[];
  labelMode?: DraftingCanvasLabelMode;
  labelPlacement?: DraftingLabelPlacement;
  surface?: DraftingRendererStyleSurface;
  viewScale?: number;
};

export type DraftingNormalizedRendererProps<T extends DraftingObject = DraftingObject> =
  DraftingRendererProps<T> & {
    context: DraftingRendererContext;
    labelMode?: DraftingCanvasLabelMode;
    surface: DraftingRendererStyleSurface;
    viewScale?: number;
  };

export function createDraftingRendererContext(args: {
  interactionEnabled?: boolean;
  labelMode?: DraftingCanvasLabelMode;
  readOnly?: boolean;
  selectedObjectId?: string | null;
  styleSurface?: DraftingRendererStyleSurface;
  surface?: DraftingRendererSurface;
  viewScale?: number;
}): DraftingRendererContext {
  const surface = args.surface ?? 'editor';
  const readOnly = args.readOnly ?? surface === 'read_only';
  const styleSurface = args.styleSurface ?? toDraftingRendererStyleSurface(surface);

  return {
    interactionEnabled: args.interactionEnabled ?? (surface === 'editor' && !readOnly),
    labelMode: args.labelMode,
    readOnly,
    selectedObjectId: args.selectedObjectId ?? null,
    styleSurface,
    surface,
    viewScale: args.viewScale,
  };
}

export function normalizeDraftingRendererProps<T extends DraftingObject>(
  props: DraftingRendererProps<T>,
): DraftingNormalizedRendererProps<T> {
  const context =
    props.context ??
    createDraftingRendererContext({
      labelMode: props.labelMode,
      selectedObjectId: props.isSelected ? props.object.id : null,
      styleSurface: props.surface,
      surface: props.surface ?? 'editor',
      viewScale: props.viewScale,
    });
  const surface = props.surface ?? context.styleSurface;
  const labelMode = props.labelMode ?? context.labelMode;
  const viewScale = props.viewScale ?? context.viewScale;

  return {
    ...props,
    context,
    isSelected: props.isSelected || context.selectedObjectId === props.object.id,
    labelMode,
    surface,
    viewScale,
  };
}

export function toDraftingRendererStyleSurface(
  surface?: DraftingRendererSurface,
): DraftingRendererStyleSurface {
  return surface === 'editor' ? 'editor' : 'sheet';
}

export function isDraftingRendererContextInteractive(context: DraftingRendererContext) {
  return context.surface === 'editor' && !context.readOnly && context.interactionEnabled;
}

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
  fill: getDraftingStandardProfile().palette.selectionFill,
  stroke: getDraftingStandardProfile().palette.selectionStroke,
  strokeDasharray: '160 120',
  strokeWidth: 2,
} as const;

export const DRAFTING_TECHNICAL_FILLS = {
  none: 'none',
  pile: 'none',
  structural: 'none',
  serviceConflict: 'rgba(127, 29, 29, 0.025)',
  survey: 'none',
  annotation: 'rgba(255, 255, 255, 0.92)',
} as const;

export function resolveRendererVectorEffect(surface?: DraftingRendererStyleSurface) {
  return surface === 'sheet' ? undefined : 'non-scaling-stroke';
}

export function resolveCanvasLabelSize(
  textSize: number | undefined,
  fallback = 170,
  drawingSetup?: DraftingDrawingSetup,
) {
  const profileDefault = resolveDraftingTextStyle({
    role: 'ANNOTATION',
    setup: drawingSetup,
    surface: 'editor',
  }).fontSize;
  return Math.min(textSize ?? fallback ?? profileDefault, 180);
}

export function resolveCanvasLabelStyle(args: {
  drawingSetup?: DraftingDrawingSetup;
  fallback?: number;
  surface?: DraftingRendererStyleSurface;
  textSize?: number;
}): ResolvedDraftingTextStyle {
  const resolved = resolveDraftingTextStyle({
    role: 'ANNOTATION',
    setup: args.drawingSetup,
    surface: args.surface,
  });
  const fontSize =
    args.surface === 'sheet'
      ? resolved.fontSize
      : resolveCanvasLabelSize(args.textSize, args.fallback, args.drawingSetup);

  return {
    ...resolved,
    fontSize,
    haloStrokeWidth: Math.max(args.surface === 'sheet' ? 0.18 : 14, fontSize * 0.08),
    secondaryFontSize: fontSize * 0.74,
  };
}

export function resolveCanvasLeaderStyle(args: {
  drawingSetup?: DraftingDrawingSetup;
  surface?: DraftingRendererStyleSurface;
}) {
  return resolveDraftingLeaderStyle({
    setup: args.drawingSetup,
    surface: args.surface,
  });
}

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
export type DraftingProjectGridRendererProps = DraftingRendererProps<DraftingProjectGridObject>;
export type DraftingProjectGridLineRendererProps =
  DraftingRendererProps<DraftingProjectGridLineObject>;
export type DraftingShaftRendererProps = DraftingRendererProps<DraftingShaftObject>;
