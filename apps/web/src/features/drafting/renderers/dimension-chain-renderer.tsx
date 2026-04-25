import * as React from 'react';
import {
  buildDimensionChainOffsetPoints,
  calculateDimensionChainSegments,
  calculateDimensionChainTotal,
  formatDimensionDistance,
  resolveDimensionChainOffsetVector,
} from '../semantic-object-utils';
import { resolveDraftingLegacyLineWeight } from '../standards/drafting-style-resolver';
import { type DraftingDimensionChainRendererProps } from './renderer-types';

export function DimensionChainRenderer({
  drawingSetup,
  isSelected,
  layer,
  object,
  onPointerDown,
}: DraftingDimensionChainRendererProps) {
  const stroke = object.style?.stroke ?? layer?.color ?? '#334155';
  const lineWeight = resolveDraftingLegacyLineWeight({ layer, object, setup: drawingSetup });
  const textSize = object.style?.textSize ?? 220;
  const offsetPoints = buildDimensionChainOffsetPoints(object);
  const offsetVector = resolveDimensionChainOffsetVector(object);
  const offsetLength = Math.max(1, Math.hypot(offsetVector.x, offsetVector.y));
  const extensionOvershoot = 160;
  const textGap = 180;
  const segments = calculateDimensionChainSegments(object.geometry.points);
  const totalDistance = calculateDimensionChainTotal(object.geometry.points);
  const totalLabel =
    object.parameters.textOverride?.trim() ||
    formatDimensionDistance(totalDistance, object.parameters.unit, object.parameters.precision);

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
          strokeWidth={90}
          vectorEffect="non-scaling-stroke"
        />
      ) : null}

      {object.geometry.points.map((point, index) => {
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
            strokeWidth={lineWeight * 20}
            vectorEffect="non-scaling-stroke"
            x1={point.x}
            x2={extended.x}
            y1={point.y}
            y2={extended.y}
          />
        );
      })}

      {offsetPoints.slice(1).map((end, index) => {
        const start = offsetPoints[index];
        if (!start) {
          return null;
        }
        return (
          <React.Fragment key={`${object.id}-dimension-segment-${index}`}>
            <line
              stroke={stroke}
              strokeWidth={lineWeight * 25}
              vectorEffect="non-scaling-stroke"
              x1={start.x}
              x2={end.x}
              y1={start.y}
              y2={end.y}
            />
            <DimensionTick end={end} start={start} stroke={stroke} strokeWidth={lineWeight * 25} />
            <DimensionTick end={start} start={end} stroke={stroke} strokeWidth={lineWeight * 25} />
          </React.Fragment>
        );
      })}

      {object.parameters.showSegments
        ? segments.map((segmentLength, index) => {
            const start = offsetPoints[index];
            const end = offsetPoints[index + 1];

            if (!start || !end) {
              return null;
            }

            return (
              <text
                key={`${object.id}-segment-${index}`}
                fill={stroke}
                fontSize={textSize}
                textAnchor="middle"
                x={(start.x + end.x) / 2}
                y={(start.y + end.y) / 2 - textGap}
              >
                {formatDimensionDistance(
                  segmentLength,
                  object.parameters.unit,
                  object.parameters.precision,
                )}
              </text>
            );
          })
        : null}

      {object.parameters.showTotal && offsetPoints[0] && offsetPoints[offsetPoints.length - 1] ? (
        <g>
          <line
            opacity={0.7}
            stroke={stroke}
            strokeDasharray="180 120"
            strokeWidth={lineWeight * 18}
            vectorEffect="non-scaling-stroke"
            x1={offsetPoints[0].x}
            x2={offsetPoints[offsetPoints.length - 1]!.x}
            y1={offsetPoints[0].y + textGap * 1.25}
            y2={offsetPoints[offsetPoints.length - 1]!.y + textGap * 1.25}
          />
          <text
            fill={stroke}
            fontSize={textSize}
            fontWeight={700}
            textAnchor="middle"
            x={(offsetPoints[0].x + offsetPoints[offsetPoints.length - 1]!.x) / 2}
            y={(offsetPoints[0].y + offsetPoints[offsetPoints.length - 1]!.y) / 2 + textGap * 2}
          >
            {totalLabel}
          </text>
        </g>
      ) : null}
    </g>
  );
}

function DimensionTick({
  end,
  start,
  stroke,
  strokeWidth,
}: {
  end: { x: number; y: number };
  start: { x: number; y: number };
  stroke: string;
  strokeWidth: number;
}) {
  const angle = Math.atan2(end.y - start.y, end.x - start.x) + Math.PI / 4;
  const length = 180;
  const dx = Math.cos(angle) * length;
  const dy = Math.sin(angle) * length;
  return (
    <line
      stroke={stroke}
      strokeWidth={strokeWidth}
      vectorEffect="non-scaling-stroke"
      x1={end.x - dx}
      x2={end.x + dx}
      y1={end.y - dy}
      y2={end.y + dy}
    />
  );
}
