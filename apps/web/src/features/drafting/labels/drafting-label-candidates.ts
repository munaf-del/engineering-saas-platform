import type { DraftingModel, DraftingObject, DraftingPoint } from '@eng/shared';
import {
  calculateDimensionChainSegments,
  calculateDimensionChainTotal,
  formatDimensionDistance,
  getServiceRunMidpoint,
  resolveDimensionChainOffsetVector,
} from '../semantic-object-utils';
import {
  buildDraftingObjectLabelLines,
  type DraftingCanvasLabelMode,
} from '../renderers/label-policy';
import { resolveCanvasLabelSize } from '../renderers/renderer-types';
import {
  estimateDraftingLabelBounds,
  layoutDraftingLabels,
  type DraftingLabelCandidate,
  type DraftingLabelLayoutResult,
  type DraftingLabelMode,
  type DraftingLabelObstacle,
  type DraftingLabelPlacement,
  type DraftingLabelPosition,
  type DraftingLabelRect,
  type DraftingLabelSurface,
} from './drafting-label-layout';

export type DraftingResolvedLabelLayout = DraftingLabelLayoutResult & {
  placementByObjectId: Record<string, DraftingLabelPlacement | undefined>;
};

export function buildDraftingLabelLayout({
  labelMode,
  model,
  objects,
  selectedObjectId,
  surface,
  viewScale,
}: {
  labelMode: DraftingCanvasLabelMode;
  model: DraftingModel;
  objects: DraftingObject[];
  selectedObjectId: string | null;
  surface: DraftingLabelSurface;
  viewScale?: number;
}): DraftingResolvedLabelLayout {
  const candidates: DraftingLabelCandidate[] = [];
  const obstacles: DraftingLabelObstacle[] = [];

  for (const object of objects) {
    const isSelected = object.id === selectedObjectId;
    const textSize = resolveCanvasLabelSize(
      object.style?.textSize,
      defaultLabelSizeForObject(object),
    );
    const labelLines = buildDraftingObjectLabelLines({
      allObjects: model.objects,
      isSelected,
      labelMode,
      object,
      surface,
      viewScale,
    });
    const candidate = buildObjectLabelCandidate({
      isSelected,
      labelLines,
      labelMode,
      object,
      surface,
      textSize,
    });
    if (candidate) {
      candidates.push(candidate);
    }
    obstacles.push(...buildObjectLabelObstacles(object));
    candidates.push(
      ...buildReservedLabelCandidates({ isSelected, labelMode, object, surface, textSize }),
    );
  }

  const result = layoutDraftingLabels(candidates, {
    padding: surface === 'sheet' ? 90 : 120,
    staticObstacles: obstacles,
  });
  const placementByObjectId: Record<string, DraftingLabelPlacement | undefined> = {};
  for (const label of result.placed) {
    if (!label.id.includes(':')) {
      placementByObjectId[label.id] = label;
    }
  }
  for (const label of result.hidden) {
    if (!label.id.includes(':')) {
      placementByObjectId[label.id] = label;
    }
  }

  return {
    ...result,
    placementByObjectId,
  };
}

function buildObjectLabelCandidate({
  isSelected,
  labelLines,
  labelMode,
  object,
  surface,
  textSize,
}: {
  isSelected: boolean;
  labelLines: string[];
  labelMode: DraftingCanvasLabelMode;
  object: DraftingObject;
  surface: DraftingLabelSurface;
  textSize: number;
}): DraftingLabelCandidate | null {
  if (labelLines.length === 0) {
    return null;
  }

  const anchor = resolveLabelAnchor(object);
  if (!anchor) {
    return null;
  }

  const family = resolveLabelFamily(object);
  const priority = resolveLabelPriority(object, isSelected);
  const offset = resolveLabelOffset(object);

  return {
    allowedPositions: allowedPositionsForFamily(family, labelMode),
    anchor,
    approximateBounds: estimateDraftingLabelBounds({ lines: labelLines, textSize }),
    canHide: !isSelected && labelMode !== 'full' && canHideObjectLabel(object),
    canLeader: canLeaderObjectLabel(object),
    family,
    id: object.id,
    mode: labelMode as DraftingLabelMode,
    objectType: object.type,
    offset,
    preferredPosition: preferredPositionForObject(object),
    priority,
    selected: isSelected,
    surface,
  };
}

function buildReservedLabelCandidates({
  isSelected,
  labelMode,
  object,
  surface,
  textSize,
}: {
  isSelected: boolean;
  labelMode: DraftingCanvasLabelMode;
  object: DraftingObject;
  surface: DraftingLabelSurface;
  textSize: number;
}): DraftingLabelCandidate[] {
  if (object.type === 'dimension_chain') {
    return buildDimensionLabelReservations(object, isSelected, labelMode, surface, textSize);
  }

  if (object.type === 'callout') {
    const bodyLines =
      labelMode === 'minimal' && !isSelected
        ? []
        : object.parameters.body.split('\n').filter(Boolean);
    const height =
      labelMode === 'minimal' && !isSelected ? 360 : 560 + Math.max(bodyLines.length, 1) * 190;
    return [
      {
        allowedPositions: ['offset'],
        anchor: object.geometry.anchorPoint,
        approximateBounds: { height, width: 1900 },
        canHide: false,
        canLeader: false,
        family: 'annotation',
        id: `${object.id}:callout-box`,
        mode: labelMode,
        objectType: object.type,
        offset: {
          x: object.geometry.labelPoint.x - object.geometry.anchorPoint.x,
          y: object.geometry.labelPoint.y - object.geometry.anchorPoint.y + height / 2,
        },
        preferredPosition: 'offset',
        priority: resolveLabelPriority(object, isSelected),
        selected: isSelected,
        surface,
      },
    ];
  }

  if (object.type === 'leader_note') {
    return [
      {
        allowedPositions: ['offset'],
        anchor: object.geometry.anchor,
        approximateBounds: {
          height: 360,
          width: Math.max(1450, object.metadata.text.length * textSize * 0.55),
        },
        canHide: false,
        canLeader: false,
        family: 'annotation',
        id: `${object.id}:leader-note`,
        mode: labelMode,
        objectType: object.type,
        offset: {
          x: object.geometry.textPoint.x - object.geometry.anchor.x,
          y: object.geometry.textPoint.y - object.geometry.anchor.y - 70,
        },
        preferredPosition: 'offset',
        priority: resolveLabelPriority(object, isSelected),
        selected: isSelected,
        surface,
      },
    ];
  }

  if (object.type === 'section_marker') {
    const midpoint = midpointOf([object.geometry.startPoint, object.geometry.endPoint]);
    return [
      {
        allowedPositions: ['top'],
        anchor: midpoint,
        approximateBounds: { height: 520, width: 980 },
        canHide: false,
        canLeader: false,
        family: 'annotation',
        id: `${object.id}:section-marker`,
        mode: labelMode,
        objectType: object.type,
        offset: { x: 0, y: 280 },
        preferredPosition: 'top',
        priority: resolveLabelPriority(object, isSelected),
        selected: isSelected,
        surface,
      },
    ];
  }

  return [];
}

function buildDimensionLabelReservations(
  object: Extract<DraftingObject, { type: 'dimension_chain' }>,
  isSelected: boolean,
  labelMode: DraftingCanvasLabelMode,
  surface: DraftingLabelSurface,
  textSize: number,
): DraftingLabelCandidate[] {
  const offsetVector = resolveDimensionChainOffsetVector(object);
  const offsetLength = Math.max(1, Math.hypot(offsetVector.x, offsetVector.y));
  const offsetUnit = { x: offsetVector.x / offsetLength, y: offsetVector.y / offsetLength };
  const offsetDistance = object.geometry.offsetDistanceMm ?? 900;
  const offsetPoints = object.geometry.points.map((point) => ({
    x: point.x + offsetUnit.x * offsetDistance,
    y: point.y + offsetUnit.y * offsetDistance,
  }));
  const segments = calculateDimensionChainSegments(object.geometry.points);
  const candidates: DraftingLabelCandidate[] = [];

  if (object.parameters.showSegments) {
    offsetPoints.slice(1).forEach((point, index) => {
      const start = offsetPoints[index];
      if (!start) {
        return;
      }
      const label = formatDimensionDistance(
        segments[index] ?? 0,
        object.parameters.unit,
        object.parameters.precision,
      );
      const mid = {
        x: (start.x + point.x) / 2 + offsetUnit.x * 340,
        y: (start.y + point.y) / 2 + offsetUnit.y * 340,
      };
      candidates.push(
        buildDimensionReservation(
          object,
          `${object.id}:segment-${index}`,
          label,
          mid,
          isSelected,
          labelMode,
          surface,
          textSize,
        ),
      );
    });
  }

  if (
    object.parameters.showTotal &&
    segments.length > 1 &&
    offsetPoints[0] &&
    offsetPoints.at(-1)
  ) {
    const totalLabel =
      object.parameters.textOverride?.trim() ||
      formatDimensionDistance(
        calculateDimensionChainTotal(object.geometry.points),
        object.parameters.unit,
        object.parameters.precision,
      );
    const start = offsetPoints[0]!;
    const end = offsetPoints.at(-1)!;
    const mid = {
      x: (start.x + end.x) / 2 + offsetUnit.x * 1040,
      y: (start.y + end.y) / 2 + offsetUnit.y * 1040,
    };
    candidates.push(
      buildDimensionReservation(
        object,
        `${object.id}:total`,
        totalLabel,
        mid,
        isSelected,
        labelMode,
        surface,
        textSize * 1.05,
      ),
    );
  }

  return candidates;
}

function buildDimensionReservation(
  object: Extract<DraftingObject, { type: 'dimension_chain' }>,
  id: string,
  label: string,
  anchor: DraftingPoint,
  isSelected: boolean,
  labelMode: DraftingCanvasLabelMode,
  surface: DraftingLabelSurface,
  textSize: number,
): DraftingLabelCandidate {
  return {
    allowedPositions: ['offset'],
    anchor,
    approximateBounds: estimateDraftingLabelBounds({ lines: [label], textSize }),
    canHide: false,
    canLeader: false,
    family: 'dimension',
    id,
    mode: labelMode,
    objectType: object.type,
    offset: { x: 0, y: 0 },
    preferredPosition: 'offset',
    priority: resolveLabelPriority(object, isSelected),
    selected: isSelected,
    surface,
  };
}

function resolveLabelAnchor(object: DraftingObject): DraftingPoint | null {
  switch (object.type) {
    case 'pile':
      return object.geometry.centre;
    case 'secant_pile_wall':
      return object.geometry.pileCentres[0] ?? midpointOf(object.geometry.baselinePoints);
    case 'soldier_pile_wall':
      return object.geometry.pilePositions[0] ?? midpointOf(object.geometry.baselinePoints);
    case 'service_run':
      return getServiceRunMidpoint(object);
    case 'service_crossing':
      return object.geometry.crossingPoint;
    case 'borehole':
    case 'monitoring_point':
      return object.geometry.point;
    case 'anchor_tieback':
      return midpointOf([object.geometry.headPoint, object.geometry.tailPoint]);
    case 'capping_beam':
    case 'waler':
    case 'excavation_line':
      return object.geometry.points[0] ?? null;
    case 'structural_joint':
      return object.geometry.point;
    case 'geotech_surface':
      return object.geometry.points[0] ?? null;
    case 'draft_line':
      return midpointOf([object.geometry.startPoint, object.geometry.endPoint]);
    case 'draft_polyline':
    case 'draft_polygon':
      return midpointOf(object.geometry.points);
    case 'draft_rectangle':
      return midpointOf([object.geometry.cornerA, object.geometry.cornerB]);
    case 'draft_circle':
      return object.geometry.centre;
    default:
      return null;
  }
}

function buildObjectLabelObstacles(object: DraftingObject): DraftingLabelObstacle[] {
  const bounds = resolveObjectObstacleBounds(object);
  return bounds ? [{ id: `${object.id}:symbol`, bounds }] : [];
}

function resolveObjectObstacleBounds(object: DraftingObject): DraftingLabelRect | null {
  switch (object.type) {
    case 'pile': {
      const radius = object.geometry.diameterMm / 2 + 120;
      return rectAroundPoint(object.geometry.centre, radius * 2, radius * 2);
    }
    case 'service_crossing':
      return rectAroundPoint(object.geometry.crossingPoint, 620, 620);
    case 'borehole':
      return rectAroundPoint(object.geometry.point, 560, 560);
    case 'monitoring_point':
      return rectAroundPoint(object.geometry.point, 720, 720);
    case 'structural_joint':
      return rectAroundPoint(object.geometry.point, 520, 520);
    case 'secant_pile_wall':
      return rectAroundPoints(object.geometry.pileCentres, object.parameters.pileDiameterMm + 160);
    case 'soldier_pile_wall':
      return rectAroundPoints(
        object.geometry.pilePositions,
        (object.parameters.pileDiameterMm ?? 600) + 160,
      );
    case 'service_run':
      return rectAroundPoints(object.geometry.path, 360);
    case 'anchor_tieback':
      return rectAroundPoints([object.geometry.headPoint, object.geometry.tailPoint], 360);
    case 'capping_beam':
    case 'waler':
    case 'excavation_line':
      return rectAroundPoints(object.geometry.points, 360);
    default:
      return null;
  }
}

function resolveLabelFamily(object: DraftingObject) {
  switch (object.type) {
    case 'dimension_chain':
      return 'dimension';
    case 'callout':
    case 'leader_note':
    case 'section_marker':
      return 'annotation';
    case 'pile':
    case 'secant_pile_wall':
    case 'soldier_pile_wall':
    case 'capping_beam':
    case 'waler':
    case 'anchor_tieback':
    case 'excavation_line':
    case 'structural_joint':
      return 'engineering';
    case 'borehole':
    case 'monitoring_point':
      return 'survey';
    case 'service_run':
    case 'service_crossing':
      return 'service';
    default:
      return 'reference';
  }
}

function resolveLabelPriority(object: DraftingObject, selected: boolean) {
  if (selected) {
    return 1000;
  }
  switch (object.type) {
    case 'dimension_chain':
      return 900;
    case 'callout':
    case 'leader_note':
    case 'section_marker':
      return 800;
    case 'pile':
    case 'secant_pile_wall':
    case 'soldier_pile_wall':
    case 'capping_beam':
    case 'waler':
    case 'anchor_tieback':
    case 'excavation_line':
    case 'structural_joint':
      return 700;
    case 'borehole':
    case 'monitoring_point':
      return 600;
    case 'service_run':
    case 'service_crossing':
      return 500;
    default:
      return 250;
  }
}

function allowedPositionsForFamily(
  family: string,
  labelMode: DraftingCanvasLabelMode,
): DraftingLabelPosition[] {
  const all: DraftingLabelPosition[] = [
    'top-right',
    'bottom-right',
    'right',
    'top-left',
    'bottom-left',
    'left',
    'top',
    'bottom',
  ];
  if (labelMode === 'minimal') {
    return family === 'service' ? ['top-right', 'bottom-right', 'right'] : all.slice(0, 5);
  }
  return all;
}

function preferredPositionForObject(object: DraftingObject): DraftingLabelPosition {
  switch (object.type) {
    case 'service_run':
    case 'anchor_tieback':
      return 'top';
    case 'capping_beam':
    case 'waler':
    case 'excavation_line':
      return 'top-right';
    default:
      return 'top-right';
  }
}

function resolveLabelOffset(object: DraftingObject) {
  switch (object.type) {
    case 'pile':
      return {
        x: object.geometry.diameterMm / 2 + 180,
        y: Math.max(240, object.geometry.diameterMm / 2),
      };
    case 'secant_pile_wall':
      return { x: object.parameters.pileDiameterMm / 2 + 180, y: 300 };
    case 'soldier_pile_wall':
      return { x: (object.parameters.pileDiameterMm ?? 600) / 2 + 180, y: 300 };
    case 'borehole':
      return { x: 280, y: 220 };
    case 'monitoring_point':
      return { x: 340, y: 280 };
    case 'service_crossing':
      return { x: 300, y: 220 };
    case 'service_run':
      return { x: 240, y: 280 };
    default:
      return { x: 320, y: 280 };
  }
}

function canHideObjectLabel(object: DraftingObject) {
  return !['dimension_chain', 'callout', 'leader_note', 'section_marker'].includes(object.type);
}

function canLeaderObjectLabel(object: DraftingObject) {
  return !['dimension_chain', 'callout', 'leader_note', 'section_marker'].includes(object.type);
}

function defaultLabelSizeForObject(object: DraftingObject) {
  return object.type === 'dimension_chain' ? 150 : 170;
}

function midpointOf(points: DraftingPoint[]) {
  if (points.length === 0) {
    return { x: 0, y: 0 };
  }
  return {
    x: points.reduce((total, point) => total + point.x, 0) / points.length,
    y: points.reduce((total, point) => total + point.y, 0) / points.length,
  };
}

function rectAroundPoint(point: DraftingPoint, width: number, height: number): DraftingLabelRect {
  return {
    height,
    width,
    x: point.x - width / 2,
    y: point.y - height / 2,
  };
}

function rectAroundPoints(points: DraftingPoint[], padding: number): DraftingLabelRect | null {
  if (points.length === 0) {
    return null;
  }
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    height: maxY - minY + padding,
    width: maxX - minX + padding,
    x: minX - padding / 2,
    y: minY - padding / 2,
  };
}
