import type {
  DraftingAnchorTiebackObject,
  DraftingDimensionChainObject,
  DraftingPoint,
  DraftingSecantPileWallObject,
  DraftingServiceRunObject,
  DraftingSoldierPileWallObject,
} from '@eng/shared';

const EPSILON = 1e-6;

export function createDefaultBaselinePoints(
  startPoint: DraftingPoint,
  lengthMm = 6000,
): DraftingPoint[] {
  return [startPoint, { x: startPoint.x + lengthMm, y: startPoint.y }];
}

export function calculatePolylineLength(points: DraftingPoint[]) {
  let length = 0;

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]!;
    const current = points[index]!;
    length += Math.hypot(current.x - previous.x, current.y - previous.y);
  }

  return length;
}

export function calculateDimensionChainSegments(points: DraftingPoint[]) {
  const segments: number[] = [];

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]!;
    const current = points[index]!;
    segments.push(Math.hypot(current.x - previous.x, current.y - previous.y));
  }

  return segments;
}

export function calculateDimensionChainTotal(points: DraftingPoint[]) {
  return calculateDimensionChainSegments(points).reduce(
    (totalLength, segmentLength) => totalLength + segmentLength,
    0,
  );
}

export function resolveDimensionChainOffsetVector(object: DraftingDimensionChainObject) {
  if (object.geometry.offsetVector) {
    return object.geometry.offsetVector;
  }

  const startPoint = object.geometry.points[0];
  const endPoint = object.geometry.points[object.geometry.points.length - 1];
  const offsetDistanceMm = object.geometry.offsetDistanceMm ?? 0;

  if (!startPoint || !endPoint) {
    return { x: 0, y: -offsetDistanceMm };
  }

  const deltaX = endPoint.x - startPoint.x;
  const deltaY = endPoint.y - startPoint.y;
  const length = Math.hypot(deltaX, deltaY);

  if (length <= EPSILON) {
    return { x: 0, y: -offsetDistanceMm };
  }

  return {
    x: (deltaY / length) * offsetDistanceMm,
    y: (-deltaX / length) * offsetDistanceMm,
  };
}

export function buildDimensionChainOffsetPoints(object: DraftingDimensionChainObject) {
  const offsetVector = resolveDimensionChainOffsetVector(object);

  return object.geometry.points.map((point) => ({
    x: point.x + offsetVector.x,
    y: point.y + offsetVector.y,
  }));
}

export function formatDimensionDistance(
  distanceMm: number,
  unit: DraftingDimensionChainObject['parameters']['unit'],
  precision: number,
) {
  const convertedValue = unit === 'm' ? distanceMm / 1000 : distanceMm;
  return `${convertedValue.toFixed(precision)} ${unit}`;
}

export function generatePilePositionsAlongBaseline(points: DraftingPoint[], spacingMm: number) {
  if (points.length < 2 || spacingMm <= 0) {
    return points.slice(0, 1);
  }

  const totalLength = calculatePolylineLength(points);
  if (totalLength <= EPSILON) {
    return [points[0]!];
  }

  const distances = [0];
  for (let distance = spacingMm; distance < totalLength - EPSILON; distance += spacingMm) {
    distances.push(distance);
  }

  if (Math.abs(distances[distances.length - 1]! - totalLength) > EPSILON) {
    distances.push(totalLength);
  }

  return distances.map((distance) => pointAlongPolyline(points, distance));
}

export function rebuildSecantPileWallObject(
  object: DraftingSecantPileWallObject,
): DraftingSecantPileWallObject {
  const pileCentres = generatePilePositionsAlongBaseline(
    object.geometry.baselinePoints,
    object.parameters.spacingMm,
  );

  return {
    ...object,
    geometry: {
      ...object.geometry,
      pileCentres,
    },
    metadata: {
      ...object.metadata,
      pileCount: pileCentres.length,
    },
  };
}

export function rebuildSoldierPileWallObject(
  object: DraftingSoldierPileWallObject,
): DraftingSoldierPileWallObject {
  const pilePositions = generatePilePositionsAlongBaseline(
    object.geometry.baselinePoints,
    object.parameters.spacingMm,
  );

  return {
    ...object,
    geometry: {
      ...object.geometry,
      pilePositions,
    },
    metadata: {
      ...object.metadata,
      pileCount: pilePositions.length,
    },
  };
}

export function buildAnchorTailPoint(
  headPoint: DraftingPoint,
  angleDeg: number,
  planLengthMm: number,
): DraftingPoint {
  const angleRad = (angleDeg * Math.PI) / 180;

  return {
    x: headPoint.x + Math.cos(angleRad) * planLengthMm,
    y: headPoint.y + Math.sin(angleRad) * planLengthMm,
  };
}

export function rebuildAnchorTiebackObject(
  object: DraftingAnchorTiebackObject,
): DraftingAnchorTiebackObject {
  return {
    ...object,
    geometry: {
      ...object.geometry,
      tailPoint: buildAnchorTailPoint(
        object.geometry.headPoint,
        object.parameters.angleDeg,
        object.parameters.planLengthMm,
      ),
    },
  };
}

export function calculateAnchorAngleDeg(headPoint: DraftingPoint, tailPoint: DraftingPoint) {
  return (Math.atan2(tailPoint.y - headPoint.y, tailPoint.x - headPoint.x) * 180) / Math.PI;
}

export function calculateAnchorPlanLengthMm(headPoint: DraftingPoint, tailPoint: DraftingPoint) {
  return Math.hypot(tailPoint.x - headPoint.x, tailPoint.y - headPoint.y);
}

export function defaultSoldierPileSymbolDiameterMm(object: DraftingSoldierPileWallObject) {
  return object.parameters.pileDiameterMm ?? 450;
}

export function getPolylineMidpoint(points: DraftingPoint[]) {
  return pointAlongPolyline(points, calculatePolylineLength(points) / 2);
}

export function getServiceRunMidpoint(object: DraftingServiceRunObject) {
  return getPolylineMidpoint(object.geometry.path);
}

export function pointAlongPolyline(points: DraftingPoint[], distanceMm: number) {
  if (distanceMm <= 0) {
    return points[0]!;
  }

  let traversed = 0;

  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1]!;
    const end = points[index]!;
    const segmentLength = Math.hypot(end.x - start.x, end.y - start.y);

    if (segmentLength <= EPSILON) {
      continue;
    }

    if (traversed + segmentLength >= distanceMm - EPSILON) {
      const remaining = distanceMm - traversed;
      const ratio = remaining / segmentLength;
      return {
        x: start.x + (end.x - start.x) * ratio,
        y: start.y + (end.y - start.y) * ratio,
      };
    }

    traversed += segmentLength;
  }

  return points[points.length - 1]!;
}
