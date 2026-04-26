import * as React from 'react';
import type {
  DraftingDimensionChainObject,
  DraftingObject,
  DraftingPoint,
  DraftingPointAnchorRef,
} from '@eng/shared';
import {
  calculateDimensionChainSegments,
  calculateDimensionChainTotal,
  formatDimensionDistance,
  resolveDimensionChainOffsetVector,
} from '../semantic-object-utils';
import {
  resolveCanvasLabelSize,
  resolveRendererLineStyle,
  resolveRendererVectorEffect,
  type DraftingDimensionChainRendererProps,
} from './renderer-types';
import { resolveEffectiveLabelMode } from './label-policy';

export function DimensionChainRenderer({
  drawingSetup,
  isSelected,
  layer,
  object,
  onPointerDown,
  allObjects = [],
  labelMode,
  surface,
  viewScale,
}: DraftingDimensionChainRendererProps) {
  const lineStyle = resolveRendererLineStyle({
    drawingSetup,
    layer,
    object,
    role: 'dimension',
    surface,
  });
  const stroke = object.style?.stroke ?? lineStyle.color ?? layer?.color ?? '#334155';
  const lineWeight =
    surface === 'sheet'
      ? lineStyle.editorStrokeWidth
      : Math.max(0.85, lineStyle.editorStrokeWidth * 0.8);
  const textSize = resolveCanvasLabelSize(object.style?.textSize, 150);
  const vectorEffect = resolveRendererVectorEffect(surface);
  const resolvedObject = resolveDimensionAnchoredObject(object, allObjects);
  const offsetPoints = buildDimensionChainOffsetPoints(resolvedObject);
  const offsetVector = resolveDimensionChainOffsetVector(resolvedObject);
  const offsetLength = Math.max(1, Math.hypot(offsetVector.x, offsetVector.y));
  const offsetUnit = { x: offsetVector.x / offsetLength, y: offsetVector.y / offsetLength };
  const extensionOvershoot = 180;
  const segmentTextGap = 340;
  const totalLineGap = 620;
  const totalTextGap = 420;
  const segments = calculateDimensionChainSegments(resolvedObject.geometry.points);
  const effectiveLabelMode = resolveEffectiveLabelMode({ labelMode, surface });
  const showSegmentLabels =
    resolvedObject.parameters.showSegments &&
    (surface === 'sheet' ||
      isSelected ||
      effectiveLabelMode !== 'minimal' ||
      (viewScale ?? 1) >= 0.12 ||
      segments.length === 1);
  const totalDistance = calculateDimensionChainTotal(resolvedObject.geometry.points);
  const totalLabel =
    resolvedObject.parameters.textOverride?.trim() ||
    formatDimensionDistance(
      totalDistance,
      resolvedObject.parameters.unit,
      resolvedObject.parameters.precision,
    );

  return (
    <g
      data-dimension-id={object.parameters.dimensionId}
      data-drafting-object="true"
      onPointerDown={onPointerDown}
    >
      {isSelected ? (
        <polyline
          fill="none"
          points={offsetPoints.map((point) => `${point.x},${point.y}`).join(' ')}
          stroke="#2563eb"
          strokeWidth={Math.max(2, lineWeight * 2)}
          vectorEffect={vectorEffect}
        />
      ) : null}

      {resolvedObject.geometry.points.map((point, index) => {
        const offsetPoint = offsetPoints[index];
        if (!offsetPoint) {
          return null;
        }
        const extended = {
          x: offsetPoint.x + (offsetVector.x / offsetLength) * extensionOvershoot,
          y: offsetPoint.y + (offsetVector.y / offsetLength) * extensionOvershoot,
        };

        return (
          <line
            key={`${object.id}-extension-${index}`}
            stroke={stroke}
            strokeWidth={lineWeight}
            vectorEffect={vectorEffect}
            x1={point.x}
            x2={extended.x}
            y1={point.y}
            y2={extended.y}
          />
        );
      })}

      {offsetPoints.length > 1 ? (
        <polyline
          fill="none"
          points={offsetPoints.map((point) => `${point.x},${point.y}`).join(' ')}
          stroke={stroke}
          strokeWidth={lineWeight}
          vectorEffect={vectorEffect}
        />
      ) : null}

      {offsetPoints.map((point, index) => {
        const previous = offsetPoints[index - 1];
        const next = offsetPoints[index + 1];
        const tangent = resolveLocalDimensionTangent(previous ?? null, point, next ?? null);
        return (
          <DimensionTick
            key={`${object.id}-tick-${index}`}
            point={point}
            stroke={stroke}
            strokeWidth={lineWeight}
            tangent={tangent}
            vectorEffect={vectorEffect}
          />
        );
      })}

      {offsetPoints.slice(1).map((end, index) => {
        const start = offsetPoints[index];
        if (!start) {
          return null;
        }
        const tangent = normaliseVector({ x: end.x - start.x, y: end.y - start.y });
        const segmentLength = segments[index] ?? 0;
        const labelPoint = resolveDimensionSegmentLabelPoint(
          start,
          end,
          tangent,
          offsetUnit,
          segmentTextGap,
          segmentLength,
        );
        return (
          <React.Fragment key={`${object.id}-dimension-segment-${index}`}>
            {showSegmentLabels ? (
              <DimensionLabel
                bold={false}
                label={formatDimensionDistance(
                  segmentLength,
                  resolvedObject.parameters.unit,
                  resolvedObject.parameters.precision,
                )}
                point={labelPoint}
                stroke={stroke}
                textSize={textSize}
              />
            ) : null}
          </React.Fragment>
        );
      })}

      {resolvedObject.parameters.showTotal &&
      segments.length > 1 &&
      offsetPoints[0] &&
      offsetPoints[offsetPoints.length - 1] ? (
        <g>
          {(() => {
            const totalStart = translatePoint(offsetPoints[0]!, offsetUnit, totalLineGap);
            const totalEnd = translatePoint(
              offsetPoints[offsetPoints.length - 1]!,
              offsetUnit,
              totalLineGap,
            );
            const totalLabelPoint = translatePoint(
              midpoint(totalStart, totalEnd),
              offsetUnit,
              totalTextGap,
            );
            return (
              <>
                <line
                  opacity={0.7}
                  stroke={stroke}
                  strokeDasharray="180 120"
                  strokeWidth={Math.max(0.6, lineWeight * 0.65)}
                  vectorEffect={vectorEffect}
                  x1={totalStart.x}
                  x2={totalEnd.x}
                  y1={totalStart.y}
                  y2={totalEnd.y}
                />
                <DimensionTick
                  point={totalStart}
                  stroke={stroke}
                  strokeWidth={Math.max(0.6, lineWeight * 0.65)}
                  tangent={normaliseVector({
                    x: totalEnd.x - totalStart.x,
                    y: totalEnd.y - totalStart.y,
                  })}
                  vectorEffect={vectorEffect}
                />
                <DimensionTick
                  point={totalEnd}
                  stroke={stroke}
                  strokeWidth={Math.max(0.6, lineWeight * 0.65)}
                  tangent={normaliseVector({
                    x: totalEnd.x - totalStart.x,
                    y: totalEnd.y - totalStart.y,
                  })}
                  vectorEffect={vectorEffect}
                />
                <DimensionLabel
                  bold
                  label={totalLabel}
                  point={totalLabelPoint}
                  stroke={stroke}
                  textSize={textSize}
                />
              </>
            );
          })()}
        </g>
      ) : null}
    </g>
  );
}

function buildDimensionChainOffsetPoints(object: DraftingDimensionChainObject) {
  const offsetVector = resolveDimensionChainOffsetVector(object);

  return object.geometry.points.map((point) => ({
    x: point.x + offsetVector.x,
    y: point.y + offsetVector.y,
  }));
}

function DimensionTick({
  point,
  start,
  tangent,
  stroke,
  strokeWidth,
  vectorEffect,
}: {
  point: DraftingPoint;
  start?: DraftingPoint;
  tangent?: DraftingPoint;
  stroke: string;
  strokeWidth: number;
  vectorEffect?: 'non-scaling-stroke';
}) {
  const baseTangent =
    tangent ??
    normaliseVector({ x: point.x - (start?.x ?? point.x - 1), y: point.y - (start?.y ?? point.y) });
  const angle = Math.atan2(baseTangent.y, baseTangent.x) + Math.PI / 4;
  const length = 210;
  const dx = Math.cos(angle) * length;
  const dy = Math.sin(angle) * length;
  return (
    <line
      stroke={stroke}
      strokeWidth={strokeWidth}
      vectorEffect={vectorEffect}
      x1={point.x - dx}
      x2={point.x + dx}
      y1={point.y - dy}
      y2={point.y + dy}
    />
  );
}

function DimensionLabel({
  bold,
  label,
  point,
  stroke,
  textSize,
}: {
  bold: boolean;
  label: string;
  point: DraftingPoint;
  stroke: string;
  textSize: number;
}) {
  return (
    <text
      dominantBaseline="middle"
      fill={stroke}
      fontSize={textSize}
      fontWeight={bold ? 700 : 600}
      paintOrder="stroke"
      stroke="#ffffff"
      strokeLinejoin="round"
      strokeWidth={Math.max(18, textSize * 0.1)}
      textAnchor="middle"
      x={point.x}
      y={point.y}
    >
      {label}
    </text>
  );
}

function resolveDimensionSegmentLabelPoint(
  start: DraftingPoint,
  end: DraftingPoint,
  tangent: DraftingPoint,
  offsetUnit: DraftingPoint,
  textGap: number,
  segmentLength: number,
) {
  const basePoint = translatePoint(midpoint(start, end), offsetUnit, textGap);
  if (segmentLength >= 1800) {
    return basePoint;
  }

  return translatePoint(basePoint, tangent, 520);
}

function resolveLocalDimensionTangent(
  previous: DraftingPoint | null,
  point: DraftingPoint,
  next: DraftingPoint | null,
) {
  if (previous && next) {
    return normaliseVector({ x: next.x - previous.x, y: next.y - previous.y });
  }
  if (next) {
    return normaliseVector({ x: next.x - point.x, y: next.y - point.y });
  }
  if (previous) {
    return normaliseVector({ x: point.x - previous.x, y: point.y - previous.y });
  }
  return { x: 1, y: 0 };
}

function resolveDimensionAnchoredObject(
  object: DraftingDimensionChainObject,
  allObjects: DraftingObject[],
): DraftingDimensionChainObject {
  const witnessAnchorRefs = object.metadata.witnessAnchorRefs;
  if (!witnessAnchorRefs?.length || !allObjects.length) {
    return object;
  }

  const points = object.geometry.points.map((point, index) => {
    const anchor = witnessAnchorRefs[index];
    if (!anchor) {
      return point;
    }
    return resolveAnchorPoint(anchor, allObjects) ?? point;
  });

  return {
    ...object,
    geometry: {
      ...object.geometry,
      points,
    },
  };
}

function resolveAnchorPoint(anchor: DraftingPointAnchorRef, allObjects: DraftingObject[]) {
  if (!anchor.sourceObjectId) {
    return anchor.capturedCoordinate;
  }

  const source = allObjects.find((candidate) => candidate.id === anchor.sourceObjectId);
  if (!source) {
    return anchor.capturedCoordinate;
  }

  return getObjectAnchorPoint(source, anchor) ?? anchor.capturedCoordinate;
}

function getObjectAnchorPoint(object: DraftingObject, anchor: DraftingPointAnchorRef) {
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
      return anchor.anchorIndex === 1 ? object.geometry.endPoint : object.geometry.startPoint;
    case 'anchor_tieback':
      return anchor.anchorIndex === 1 ? object.geometry.tailPoint : object.geometry.headPoint;
    case 'section_marker':
      return anchor.anchorIndex === 1 ? object.geometry.endPoint : object.geometry.startPoint;
    case 'secant_pile_wall':
      return resolvePointFromArray(object.geometry.baselinePoints, anchor);
    case 'soldier_pile_wall':
      return resolvePointFromArray(object.geometry.baselinePoints, anchor);
    case 'capping_beam':
    case 'waler':
    case 'excavation_line':
    case 'draft_polyline':
    case 'draft_polygon':
      return resolvePointFromArray(object.geometry.points, anchor);
    case 'service_run':
      return resolvePointFromArray(object.geometry.path, anchor);
    case 'draft_rectangle': {
      const corners = [
        object.geometry.cornerA,
        { x: object.geometry.cornerB.x, y: object.geometry.cornerA.y },
        object.geometry.cornerB,
        { x: object.geometry.cornerA.x, y: object.geometry.cornerB.y },
      ];
      return resolvePointFromArray(corners, anchor);
    }
    case 'dimension_chain':
      return resolvePointFromArray(object.geometry.points, anchor);
    default:
      return undefined;
  }
}

function resolvePointFromArray(points: DraftingPoint[], anchor: DraftingPointAnchorRef) {
  if (anchor.anchorKind === 'midpoint' && anchor.anchorIndex !== undefined) {
    const start = points[anchor.anchorIndex];
    const end = points[anchor.anchorIndex + 1];
    return start && end ? midpoint(start, end) : undefined;
  }

  if (anchor.anchorKind === 'centre') {
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    return {
      x: (Math.min(...xs) + Math.max(...xs)) / 2,
      y: (Math.min(...ys) + Math.max(...ys)) / 2,
    };
  }

  return anchor.anchorIndex !== undefined ? points[anchor.anchorIndex] : undefined;
}

function midpoint(start: DraftingPoint, end: DraftingPoint) {
  return { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
}

function translatePoint(point: DraftingPoint, vector: DraftingPoint, distance: number) {
  return {
    x: point.x + vector.x * distance,
    y: point.y + vector.y * distance,
  };
}

function normaliseVector(vector: DraftingPoint) {
  const length = Math.hypot(vector.x, vector.y);
  if (length <= 1e-6) {
    return { x: 1, y: 0 };
  }
  return { x: vector.x / length, y: vector.y / length };
}
