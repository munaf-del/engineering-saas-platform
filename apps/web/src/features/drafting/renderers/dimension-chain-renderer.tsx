import * as React from 'react';
import type { DraftingDimensionChainObject, DraftingPoint } from '@eng/shared';
import { resolveDraftingDimensionAnchoredObject } from '../anchors/drafting-anchor-resolution';
import {
  calculateDimensionChainSegments,
  calculateDimensionChainTotal,
  formatDimensionDistance,
  resolveDimensionChainOffsetVector,
} from '../semantic-object-utils';
import {
  DRAFTING_SELECTION_STYLE,
  resolveRendererLineStyle,
  resolveRendererVectorEffect,
  type DraftingDimensionChainRendererProps,
} from './renderer-types';
import { resolveEffectiveLabelMode } from './label-policy';
import {
  applyDraftingTextCase,
  resolveDraftingDimensionStyle,
} from '../standards/drafting-style-resolver';

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
  const dimensionStyle = resolveDraftingDimensionStyle({
    object,
    setup: drawingSetup,
    surface,
  });
  const lineStyle = resolveRendererLineStyle({
    drawingSetup,
    layer,
    object,
    role: dimensionStyle.lineRole,
    surface,
  });
  const extensionStyle = resolveRendererLineStyle({
    drawingSetup,
    layer,
    object,
    role: dimensionStyle.extensionRole,
    surface,
  });
  const stroke = object.style?.stroke ?? lineStyle.color ?? layer?.color ?? lineStyle.color;
  const lineWeight =
    surface === 'sheet'
      ? lineStyle.editorStrokeWidth
      : Math.max(0.85, lineStyle.editorStrokeWidth * 0.8);
  const extensionLineWeight =
    surface === 'sheet'
      ? extensionStyle.editorStrokeWidth
      : Math.max(0.6, extensionStyle.editorStrokeWidth * 0.65);
  const textSize =
    surface === 'sheet'
      ? dimensionStyle.textStyle.fontSize
      : Math.min(object.style?.textSize ?? dimensionStyle.textStyle.fontSize, 180);
  const vectorEffect = resolveRendererVectorEffect(surface);
  const resolvedObject = resolveDraftingDimensionAnchoredObject(object, allObjects);
  const offsetPoints = buildDimensionChainOffsetPoints(resolvedObject);
  const offsetVector = resolveDimensionChainOffsetVector(resolvedObject);
  const offsetLength = Math.max(1, Math.hypot(offsetVector.x, offsetVector.y));
  const offsetUnit = { x: offsetVector.x / offsetLength, y: offsetVector.y / offsetLength };
  const extensionOvershoot = dimensionStyle.extensionOvershootModelUnits;
  const segmentTextGap = dimensionStyle.labelGapModelUnits;
  const totalLineGap = dimensionStyle.totalLineGapModelUnits;
  const totalTextGap = dimensionStyle.totalTextGapModelUnits;
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
      data-drafting-object-id={object.id}
      data-testid={`drafting-object-${object.id}`}
      onPointerDown={onPointerDown}
    >
      {isSelected ? (
        <polyline
          fill="none"
          points={offsetPoints.map((point) => `${point.x},${point.y}`).join(' ')}
          stroke={DRAFTING_SELECTION_STYLE.stroke}
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
            stroke={extensionStyle.color ?? stroke}
            strokeWidth={extensionLineWeight}
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
            length={dimensionStyle.tickLengthModelUnits}
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
                testId={`drafting-dimension-label-${object.id}-segment-${index}`}
                textSize={textSize}
                textStyle={dimensionStyle.textStyle}
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
                  length={dimensionStyle.tickLengthModelUnits}
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
                  length={dimensionStyle.tickLengthModelUnits}
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
                  testId={`drafting-dimension-label-${object.id}-total`}
                  textSize={textSize}
                  textStyle={dimensionStyle.textStyle}
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
  length = 210,
  stroke,
  strokeWidth,
  vectorEffect,
}: {
  length?: number;
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
  testId,
  textSize,
  textStyle,
}: {
  bold: boolean;
  label: string;
  point: DraftingPoint;
  stroke: string;
  testId?: string;
  textSize: number;
  textStyle: ReturnType<typeof resolveDraftingDimensionStyle>['textStyle'];
}) {
  return (
    <text
      data-testid={testId}
      dominantBaseline="middle"
      fill={stroke}
      fontFamily={textStyle.fontFamily}
      fontSize={textSize}
      fontStyle={textStyle.fontStyle}
      fontWeight={bold ? 700 : textStyle.fontWeight}
      paintOrder="stroke"
      stroke={textStyle.haloColor}
      strokeLinejoin="round"
      strokeWidth={Math.max(textStyle.haloStrokeWidth, textSize * 0.1)}
      textAnchor="middle"
      x={point.x}
      y={point.y}
    >
      {applyDraftingTextCase(label, textStyle)}
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
