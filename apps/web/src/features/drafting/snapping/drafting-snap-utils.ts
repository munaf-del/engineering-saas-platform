import type {
  DraftingModel,
  DraftingObject,
  DraftingPoint,
  DraftingPointAnchorRef,
} from '@eng/shared';
import { buildDimensionChainOffsetPoints, getPolylineMidpoint } from '../semantic-object-utils';

export type DraftingSnapMode =
  | 'grid'
  | 'endpoint'
  | 'midpoint'
  | 'centre'
  | 'intersection'
  | 'nearest_path'
  | 'orthogonal';

export type DraftingSnapSettings = {
  enabled: boolean;
  modes: Record<DraftingSnapMode, boolean>;
  tolerancePx: number;
};

export type DraftingSnapCandidate = {
  id: string;
  point: DraftingPoint;
  label: string;
  mode: Exclude<DraftingSnapMode, 'orthogonal'> | 'origin';
  sourceObjectId?: string;
  anchorIndex?: number;
  anchorName?: string;
};

export type DraftingSnapResult = {
  candidate: DraftingSnapCandidate | null;
  distancePx: number;
  point: DraftingPoint;
};

export const DEFAULT_DRAFTING_SNAP_SETTINGS: DraftingSnapSettings = {
  enabled: true,
  modes: {
    grid: true,
    endpoint: true,
    midpoint: true,
    centre: true,
    intersection: true,
    nearest_path: true,
    orthogonal: false,
  },
  tolerancePx: 14,
};

export function resolveDraftingSnapPoint(args: {
  model: DraftingModel;
  objects: DraftingObject[];
  point: DraftingPoint;
  scale: number;
  settings: DraftingSnapSettings;
  gridStepMm: number;
  orthogonalOrigin?: DraftingPoint | null;
}): DraftingSnapResult {
  const { point, settings } = args;
  if (!settings.enabled) {
    return { candidate: null, distancePx: 0, point };
  }

  const candidates = collectDraftingSnapCandidates(
    args.model,
    args.objects,
    args.gridStepMm,
    point,
  );
  const toleranceMm = settings.tolerancePx / Math.max(args.scale, 0.0001);
  let best: DraftingSnapCandidate | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  let bestPriority = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    if (!isSnapCandidateModeEnabled(candidate, settings)) {
      continue;
    }
    const distance = distanceBetween(point, candidate.point);
    const priority = snapPriority(candidate);
    if (
      distance <= toleranceMm &&
      (distance < bestDistance - 1e-6 ||
        (Math.abs(distance - bestDistance) <= 1e-6 && priority < bestPriority))
    ) {
      best = candidate;
      bestDistance = distance;
      bestPriority = priority;
    }
  }

  let snappedPoint = best?.point ?? point;
  if (settings.modes.orthogonal && args.orthogonalOrigin) {
    snappedPoint = applyOrthogonalSnap(args.orthogonalOrigin, snappedPoint);
  }

  return {
    candidate: best,
    distancePx: Number.isFinite(bestDistance) ? bestDistance * Math.max(args.scale, 0.0001) : 0,
    point: withSnapRef(snappedPoint, best),
  };
}

export function collectDraftingSnapCandidates(
  model: DraftingModel,
  objects: DraftingObject[],
  gridStepMm: number,
  cursorPoint?: DraftingPoint,
): DraftingSnapCandidate[] {
  const candidates: DraftingSnapCandidate[] = [];
  const referencePoint = model.drawingSetup?.referencePoint.modelPoint;
  if (referencePoint) {
    candidates.push({
      id: 'origin',
      label: 'Origin',
      mode: 'origin',
      point: referencePoint,
      anchorName: model.drawingSetup?.referencePoint.label,
    });
  }
  if (cursorPoint && Number.isFinite(gridStepMm) && gridStepMm > 0) {
    candidates.push({
      id: 'grid',
      label: 'Grid',
      mode: 'grid',
      point: {
        x: Math.round(cursorPoint.x / gridStepMm) * gridStepMm,
        y: Math.round(cursorPoint.y / gridStepMm) * gridStepMm,
      },
    });
  }

  for (const object of objects) {
    candidates.push(...getObjectSnapCandidates(object));
  }

  candidates.push(...buildIntersectionCandidates(objects));
  return candidates;
}

export function getObjectSnapCandidates(object: DraftingObject): DraftingSnapCandidate[] {
  const candidates: DraftingSnapCandidate[] = [];
  const addPoint = (
    point: DraftingPoint,
    mode: DraftingSnapCandidate['mode'],
    label: string,
    anchorIndex?: number,
    anchorName?: string,
  ) => {
    candidates.push({
      id: `${object.id}:${mode}:${anchorIndex ?? candidates.length}`,
      point,
      label,
      mode,
      sourceObjectId: object.id,
      anchorIndex,
      anchorName,
    });
  };
  const addEndpointsAndMidpoints = (points: DraftingPoint[], label: string) => {
    points.forEach((point, index) => {
      const isEnd = index === 0 || index === points.length - 1;
      addPoint(
        point,
        isEnd ? 'endpoint' : 'endpoint',
        isEnd ? 'Endpoint' : `${label} vertex`,
        index,
      );
    });
    if (points.length >= 2) {
      addPoint(getPolylineMidpoint(points), 'midpoint', `${label} midpoint`);
    }
  };

  switch (object.type) {
    case 'pile':
      addPoint(object.geometry.centre, 'centre', 'Pile centre', 0, object.name);
      break;
    case 'secant_pile_wall':
      addEndpointsAndMidpoints(object.geometry.baselinePoints, 'Wall baseline');
      object.geometry.pileCentres.forEach((point, index) =>
        addPoint(point, 'centre', 'Pile centre', index, object.name),
      );
      break;
    case 'soldier_pile_wall':
      addEndpointsAndMidpoints(object.geometry.baselinePoints, 'Wall baseline');
      object.geometry.pilePositions.forEach((point, index) =>
        addPoint(point, 'centre', 'Soldier pile centre', index, object.name),
      );
      break;
    case 'anchor_tieback':
      addPoint(object.geometry.headPoint, 'endpoint', 'Anchor head', 0, object.name);
      addPoint(object.geometry.tailPoint, 'endpoint', 'Anchor tail', 1, object.name);
      addPoint(
        midpoint(object.geometry.headPoint, object.geometry.tailPoint),
        'midpoint',
        'Anchor midpoint',
      );
      break;
    case 'capping_beam':
    case 'waler':
    case 'excavation_line':
      addEndpointsAndMidpoints(object.geometry.points, object.name ?? object.type);
      break;
    case 'service_run':
      addEndpointsAndMidpoints(object.geometry.path, 'Service run');
      break;
    case 'service_crossing':
      addPoint(object.geometry.crossingPoint, 'centre', 'Service crossing', 0, object.name);
      break;
    case 'borehole':
    case 'monitoring_point':
      addPoint(
        object.geometry.point,
        'centre',
        object.type === 'borehole' ? 'Borehole' : 'Monitoring point',
      );
      break;
    case 'dimension_chain':
      object.geometry.points.forEach((point, index) =>
        addPoint(point, 'endpoint', 'Dimension witness', index),
      );
      buildDimensionChainOffsetPoints(object).forEach((point, index) =>
        addPoint(point, 'endpoint', 'Dimension line point', index),
      );
      break;
    case 'section_marker':
      addPoint(object.geometry.startPoint, 'endpoint', 'Section start', 0, object.name);
      addPoint(object.geometry.endPoint, 'endpoint', 'Section end', 1, object.name);
      break;
    case 'draft_line':
      addPoint(object.geometry.startPoint, 'endpoint', 'Line start', 0, object.name);
      addPoint(object.geometry.endPoint, 'endpoint', 'Line end', 1, object.name);
      addPoint(
        midpoint(object.geometry.startPoint, object.geometry.endPoint),
        'midpoint',
        'Line midpoint',
      );
      break;
    case 'draft_polyline':
    case 'draft_polygon':
      addEndpointsAndMidpoints(object.geometry.points, object.name ?? object.type);
      break;
    case 'draft_rectangle':
      rectanglePoints(object.geometry.cornerA, object.geometry.cornerB).forEach((point, index) =>
        addPoint(point, 'endpoint', 'Rectangle corner', index, object.name),
      );
      addPoint(
        midpoint(object.geometry.cornerA, object.geometry.cornerB),
        'centre',
        'Rectangle centre',
      );
      break;
    case 'draft_circle':
      addPoint(object.geometry.centre, 'centre', 'Circle centre', 0, object.name);
      break;
    case 'structural_joint':
      addPoint(object.geometry.point, 'centre', 'Joint', 0, object.parameters.label);
      break;
    case 'geotech_surface':
      object.geometry.points.forEach((point, index) =>
        addPoint(point, 'centre', 'Surface RL point', index, object.name),
      );
      break;
    default:
      break;
  }

  return candidates;
}

export function toDraftingPointAnchorRef(
  candidate: DraftingSnapCandidate | null,
): DraftingPointAnchorRef | undefined {
  if (!candidate) {
    return undefined;
  }

  const anchorKind = candidate.mode === 'origin' ? 'origin' : candidate.mode;
  return {
    ...(candidate.sourceObjectId ? { sourceObjectId: candidate.sourceObjectId } : {}),
    anchorKind,
    ...(candidate.anchorIndex !== undefined ? { anchorIndex: candidate.anchorIndex } : {}),
    ...(candidate.anchorName ? { anchorName: candidate.anchorName } : {}),
    capturedCoordinate: {
      x: candidate.point.x,
      y: candidate.point.y,
      ...(candidate.point.z !== undefined ? { z: candidate.point.z } : {}),
      ...(candidate.point.rl !== undefined ? { rl: candidate.point.rl } : {}),
    },
  };
}

function withSnapRef(point: DraftingPoint, candidate: DraftingSnapCandidate | null): DraftingPoint {
  const snapRef = toDraftingPointAnchorRef(candidate);
  return snapRef ? { ...point, snapRef } : point;
}

function isSnapCandidateModeEnabled(
  candidate: DraftingSnapCandidate,
  settings: DraftingSnapSettings,
) {
  if (candidate.mode === 'origin') {
    return settings.modes.centre || settings.modes.endpoint;
  }
  return settings.modes[candidate.mode];
}

function snapPriority(candidate: DraftingSnapCandidate) {
  switch (candidate.mode) {
    case 'centre':
    case 'endpoint':
      return 1;
    case 'intersection':
      return 2;
    case 'midpoint':
      return 3;
    case 'nearest_path':
      return 4;
    case 'origin':
      return 5;
    case 'grid':
      return 6;
    default:
      return 10;
  }
}

function buildIntersectionCandidates(objects: DraftingObject[]): DraftingSnapCandidate[] {
  const segments = objects.flatMap((object) => getObjectPathSegments(object));
  const candidates: DraftingSnapCandidate[] = [];
  for (let a = 0; a < segments.length; a += 1) {
    for (let b = a + 1; b < segments.length; b += 1) {
      const intersection = lineSegmentIntersection(
        segments[a]!.start,
        segments[a]!.end,
        segments[b]!.start,
        segments[b]!.end,
      );
      if (intersection) {
        candidates.push({
          id: `intersection:${segments[a]!.objectId}:${segments[b]!.objectId}:${candidates.length}`,
          label: 'Intersection',
          mode: 'intersection',
          point: intersection,
          sourceObjectId: segments[a]!.objectId,
          anchorName: `${segments[a]!.label} / ${segments[b]!.label}`,
        });
      }
    }
  }
  return candidates;
}

function getObjectPathSegments(object: DraftingObject) {
  const points =
    object.type === 'service_run'
      ? object.geometry.path
      : object.type === 'excavation_line' ||
          object.type === 'capping_beam' ||
          object.type === 'waler' ||
          object.type === 'draft_polyline' ||
          object.type === 'draft_polygon'
        ? object.geometry.points
        : object.type === 'secant_pile_wall' || object.type === 'soldier_pile_wall'
          ? object.geometry.baselinePoints
          : object.type === 'draft_line'
            ? [object.geometry.startPoint, object.geometry.endPoint]
            : object.type === 'section_marker'
              ? [object.geometry.startPoint, object.geometry.endPoint]
              : [];
  return points.slice(1).map((point, index) => ({
    start: points[index]!,
    end: point,
    objectId: object.id,
    label: object.name ?? object.type,
  }));
}

function lineSegmentIntersection(
  a1: DraftingPoint,
  a2: DraftingPoint,
  b1: DraftingPoint,
  b2: DraftingPoint,
) {
  const denominator = (a1.x - a2.x) * (b1.y - b2.y) - (a1.y - a2.y) * (b1.x - b2.x);
  if (Math.abs(denominator) < 1e-9) {
    return null;
  }
  const determinantA = a1.x * a2.y - a1.y * a2.x;
  const determinantB = b1.x * b2.y - b1.y * b2.x;
  const x = (determinantA * (b1.x - b2.x) - (a1.x - a2.x) * determinantB) / denominator;
  const y = (determinantA * (b1.y - b2.y) - (a1.y - a2.y) * determinantB) / denominator;
  if (
    !isBetween(x, a1.x, a2.x) ||
    !isBetween(y, a1.y, a2.y) ||
    !isBetween(x, b1.x, b2.x) ||
    !isBetween(y, b1.y, b2.y)
  ) {
    return null;
  }
  return { x, y };
}

function applyOrthogonalSnap(origin: DraftingPoint, point: DraftingPoint): DraftingPoint {
  return Math.abs(point.x - origin.x) >= Math.abs(point.y - origin.y)
    ? { ...point, y: origin.y }
    : { ...point, x: origin.x };
}

function midpoint(a: DraftingPoint, b: DraftingPoint): DraftingPoint {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function rectanglePoints(a: DraftingPoint, b: DraftingPoint) {
  return [a, { x: b.x, y: a.y }, b, { x: a.x, y: b.y }];
}

function distanceBetween(a: DraftingPoint, b: DraftingPoint) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function isBetween(value: number, a: number, b: number) {
  return value >= Math.min(a, b) - 1e-6 && value <= Math.max(a, b) + 1e-6;
}
