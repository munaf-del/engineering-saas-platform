import type {
  DraftingDimensionChainObject,
  DraftingObject,
  DraftingPoint,
  DraftingPointAnchorRef,
} from '@eng/shared';

export type DraftingAnchorResolutionStatus = 'resolved' | 'fallback' | 'missing';

export type DraftingResolvedAnchor = {
  anchorRef?: DraftingPointAnchorRef;
  anchorIndex: number;
  point: DraftingPoint;
  status: DraftingAnchorResolutionStatus;
  sourceObjectId?: string;
  sourceObjectType?: DraftingObject['type'];
};

export function createManualDraftingPointAnchorRef(
  point: DraftingPoint,
  anchorName = 'Manual witness point',
): DraftingPointAnchorRef {
  return {
    anchorKind: 'reference',
    anchorName,
    capturedCoordinate: {
      x: point.x,
      y: point.y,
      ...(point.z !== undefined ? { z: point.z } : {}),
      ...(point.rl !== undefined ? { rl: point.rl } : {}),
    },
  };
}

export function resolveDraftingDimensionAnchoredObject(
  object: DraftingDimensionChainObject,
  allObjects: DraftingObject[],
): DraftingDimensionChainObject {
  const resolvedAnchors = resolveDraftingDimensionWitnessAnchors(object, allObjects);
  if (!resolvedAnchors.some((anchor) => anchor.anchorRef)) {
    return object;
  }

  return {
    ...object,
    geometry: {
      ...object.geometry,
      points: object.geometry.points.map((point, index) => resolvedAnchors[index]?.point ?? point),
    },
  };
}

export function resolveDraftingDimensionWitnessAnchors(
  object: DraftingDimensionChainObject,
  allObjects: DraftingObject[],
): DraftingResolvedAnchor[] {
  return object.geometry.points.map((point, index) => {
    const anchorRef = resolveWitnessAnchorRef(object, index);
    if (!anchorRef) {
      return {
        anchorIndex: index,
        point,
        status: 'fallback',
      };
    }

    return {
      ...resolveDraftingPointAnchor(anchorRef, allObjects),
      anchorIndex: index,
    };
  });
}

export function resolveDraftingPointAnchor(
  anchorRef: DraftingPointAnchorRef,
  allObjects: DraftingObject[],
): Omit<DraftingResolvedAnchor, 'anchorIndex'> {
  const fallbackPoint = anchorRef.capturedCoordinate;
  if (!anchorRef.sourceObjectId) {
    return {
      anchorRef,
      point: fallbackPoint,
      status: 'fallback',
    };
  }

  const sourceObject = allObjects.find((candidate) => candidate.id === anchorRef.sourceObjectId);
  if (!sourceObject) {
    return {
      anchorRef,
      point: fallbackPoint,
      status: 'missing',
      sourceObjectId: anchorRef.sourceObjectId,
    };
  }

  const livePoint = getDraftingObjectAnchorPoint(sourceObject, anchorRef);
  if (!livePoint) {
    return {
      anchorRef,
      point: fallbackPoint,
      status: 'fallback',
      sourceObjectId: sourceObject.id,
      sourceObjectType: sourceObject.type,
    };
  }

  return {
    anchorRef,
    point: livePoint,
    status: 'resolved',
    sourceObjectId: sourceObject.id,
    sourceObjectType: sourceObject.type,
  };
}

export function resolveWitnessAnchorRef(
  object: DraftingDimensionChainObject,
  pointIndex: number,
): DraftingPointAnchorRef | undefined {
  const pointSnapRef = object.geometry.points[pointIndex]?.snapRef;
  if (pointSnapRef) {
    return pointSnapRef;
  }

  const witnessAnchorRefs = object.metadata.witnessAnchorRefs;
  if (!witnessAnchorRefs?.length) {
    return undefined;
  }

  if (witnessAnchorRefs.length === object.geometry.points.length) {
    return witnessAnchorRefs[pointIndex];
  }

  return undefined;
}

export function getDraftingObjectAnchorPoint(
  object: DraftingObject,
  anchorRef: DraftingPointAnchorRef,
): DraftingPoint | undefined {
  switch (object.type) {
    case 'pile':
      return object.geometry.centre;
    case 'monitoring_point':
    case 'borehole':
      return object.geometry.point;
    case 'service_crossing':
      return object.geometry.crossingPoint;
    case 'structural_joint':
      return object.geometry.point;
    case 'draft_circle':
      return object.geometry.centre;
    case 'draft_line':
      return anchorRef.anchorIndex === 1 ? object.geometry.endPoint : object.geometry.startPoint;
    case 'anchor_tieback':
      return anchorRef.anchorIndex === 1 ? object.geometry.tailPoint : object.geometry.headPoint;
    case 'section_marker':
      return anchorRef.anchorIndex === 1 ? object.geometry.endPoint : object.geometry.startPoint;
    case 'secant_pile_wall':
      return resolvePointFromArray(object.geometry.baselinePoints, anchorRef);
    case 'soldier_pile_wall':
      return resolvePointFromArray(object.geometry.baselinePoints, anchorRef);
    case 'capping_beam':
    case 'waler':
    case 'excavation_line':
    case 'draft_polyline':
    case 'draft_polygon':
      return resolvePointFromArray(object.geometry.points, anchorRef);
    case 'service_run':
      return resolvePointFromArray(object.geometry.path, anchorRef);
    case 'draft_rectangle':
      return resolvePointFromArray(
        rectanglePoints(object.geometry.cornerA, object.geometry.cornerB),
        anchorRef,
      );
    case 'dimension_chain':
      return resolvePointFromArray(object.geometry.points, anchorRef);
    case 'callout':
      return object.geometry.anchorPoint;
    case 'leader_note':
      return object.geometry.anchor;
    case 'geotech_surface':
      return resolvePointFromArray(object.geometry.points, anchorRef);
    default:
      return undefined;
  }
}

function resolvePointFromArray(
  points: DraftingPoint[],
  anchorRef: DraftingPointAnchorRef,
): DraftingPoint | undefined {
  if (!points.length) {
    return undefined;
  }

  if (anchorRef.anchorKind === 'midpoint') {
    if (anchorRef.anchorIndex !== undefined) {
      const start = points[anchorRef.anchorIndex];
      const end = points[anchorRef.anchorIndex + 1];
      return start && end ? midpoint(start, end) : undefined;
    }
    return getPolylineMidpoint(points);
  }

  if (anchorRef.anchorKind === 'centre') {
    return getPointCloudCentre(points);
  }

  return anchorRef.anchorIndex !== undefined ? points[anchorRef.anchorIndex] : undefined;
}

function rectanglePoints(cornerA: DraftingPoint, cornerB: DraftingPoint): DraftingPoint[] {
  return [cornerA, { x: cornerB.x, y: cornerA.y }, cornerB, { x: cornerA.x, y: cornerB.y }];
}

function getPointCloudCentre(points: DraftingPoint[]): DraftingPoint {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return {
    x: (Math.min(...xs) + Math.max(...xs)) / 2,
    y: (Math.min(...ys) + Math.max(...ys)) / 2,
  };
}

function getPolylineMidpoint(points: DraftingPoint[]): DraftingPoint | undefined {
  if (points.length === 1) {
    return points[0];
  }

  const segments = points.slice(1).map((point, index) => ({
    start: points[index]!,
    end: point,
    length: Math.hypot(point.x - points[index]!.x, point.y - points[index]!.y),
  }));
  const totalLength = segments.reduce((sum, segment) => sum + segment.length, 0);
  if (totalLength <= 1e-6) {
    return points[0];
  }

  let travelled = 0;
  const target = totalLength / 2;
  for (const segment of segments) {
    if (travelled + segment.length >= target) {
      const ratio = (target - travelled) / Math.max(segment.length, 1e-6);
      return {
        x: segment.start.x + (segment.end.x - segment.start.x) * ratio,
        y: segment.start.y + (segment.end.y - segment.start.y) * ratio,
      };
    }
    travelled += segment.length;
  }

  return points[points.length - 1];
}

function midpoint(start: DraftingPoint, end: DraftingPoint): DraftingPoint {
  return {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2,
  };
}
