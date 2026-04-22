import * as React from 'react';
import {
  buildDimensionChainOffsetPoints,
  calculateDimensionChainSegments,
  calculateDimensionChainTotal,
  formatDimensionDistance,
} from '../semantic-object-utils';
import { type DraftingDimensionChainRendererProps } from './renderer-types';

export function DimensionChainRenderer({
  isSelected,
  layer,
  object,
  onPointerDown,
}: DraftingDimensionChainRendererProps) {
  const stroke = object.style?.stroke ?? layer?.color ?? '#334155';
  const lineWeight = object.style?.lineWeight ?? layer?.lineWeight ?? 1;
  const textSize = object.style?.textSize ?? 220;
  const offsetPoints = buildDimensionChainOffsetPoints(object);
  const segments = calculateDimensionChainSegments(object.geometry.points);
  const totalDistance = calculateDimensionChainTotal(object.geometry.points);
  const totalLabel =
    object.parameters.textOverride?.trim() ||
    formatDimensionDistance(totalDistance, object.parameters.unit, object.parameters.precision);

  return (
    <g data-drafting-object="true" onPointerDown={onPointerDown}>
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

        return (
          <line
            key={`${object.id}-extension-${index}`}
            stroke={stroke}
            strokeWidth={lineWeight * 20}
            vectorEffect="non-scaling-stroke"
            x1={point.x}
            x2={offsetPoint.x}
            y1={point.y}
            y2={offsetPoint.y}
          />
        );
      })}

      <polyline
        fill="none"
        points={offsetPoints.map((point) => `${point.x},${point.y}`).join(' ')}
        stroke={stroke}
        strokeWidth={lineWeight * 25}
        vectorEffect="non-scaling-stroke"
      />

      {offsetPoints.map((point, index) => (
        <circle
          key={`${object.id}-node-${index}`}
          cx={point.x}
          cy={point.y}
          fill="#ffffff"
          r={70}
          stroke={stroke}
          strokeWidth={lineWeight * 18}
          vectorEffect="non-scaling-stroke"
        />
      ))}

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
                y={(start.y + end.y) / 2 - 140}
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

      {offsetPoints[0] ? (
        <text fill={stroke} fontSize={textSize * 0.9} x={offsetPoints[0].x + 100} y={offsetPoints[0].y - 260}>
          {object.parameters.dimensionId}
        </text>
      ) : null}

      {object.parameters.showTotal && offsetPoints[0] && offsetPoints[offsetPoints.length - 1] ? (
        <text
          fill={stroke}
          fontSize={textSize}
          textAnchor="middle"
          x={(offsetPoints[0].x + offsetPoints[offsetPoints.length - 1]!.x) / 2}
          y={(offsetPoints[0].y + offsetPoints[offsetPoints.length - 1]!.y) / 2 + 260}
        >
          {totalLabel}
        </text>
      ) : null}
    </g>
  );
}
