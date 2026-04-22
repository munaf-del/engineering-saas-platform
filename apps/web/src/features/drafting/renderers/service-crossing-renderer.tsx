import * as React from 'react';
import { type DraftingServiceCrossingRendererProps } from './renderer-types';

export function ServiceCrossingRenderer({
  isSelected,
  layer,
  object,
  onPointerDown,
}: DraftingServiceCrossingRendererProps) {
  const stroke =
    object.style?.stroke ??
    (object.parameters.riskStatus === 'resolved'
      ? '#15803d'
      : object.parameters.riskStatus === 'reviewed'
        ? '#c2410c'
        : layer?.color ?? '#b91c1c');
  const fill = object.style?.fill ?? '#fee2e2';
  const lineWeight = object.style?.lineWeight ?? layer?.lineWeight ?? 1;
  const textSize = object.style?.textSize ?? 220;
  const { crossingPoint } = object.geometry;

  return (
    <g data-drafting-object="true" onPointerDown={onPointerDown}>
      {isSelected ? (
        <circle
          cx={crossingPoint.x}
          cy={crossingPoint.y}
          fill="rgba(37, 99, 235, 0.12)"
          r={360}
          stroke="#2563eb"
          strokeWidth={50}
          vectorEffect="non-scaling-stroke"
        />
      ) : null}
      <polygon
        fill={fill}
        points={[
          `${crossingPoint.x},${crossingPoint.y - 220}`,
          `${crossingPoint.x + 220},${crossingPoint.y}`,
          `${crossingPoint.x},${crossingPoint.y + 220}`,
          `${crossingPoint.x - 220},${crossingPoint.y}`,
        ].join(' ')}
        stroke={stroke}
        strokeWidth={lineWeight * 20}
        vectorEffect="non-scaling-stroke"
      />
      <line
        stroke={stroke}
        strokeWidth={lineWeight * 18}
        vectorEffect="non-scaling-stroke"
        x1={crossingPoint.x - 110}
        x2={crossingPoint.x + 110}
        y1={crossingPoint.y - 110}
        y2={crossingPoint.y + 110}
      />
      <line
        stroke={stroke}
        strokeWidth={lineWeight * 18}
        vectorEffect="non-scaling-stroke"
        x1={crossingPoint.x - 110}
        x2={crossingPoint.x + 110}
        y1={crossingPoint.y + 110}
        y2={crossingPoint.y - 110}
      />
      <text fill={stroke} fontSize={textSize} x={crossingPoint.x + 280} y={crossingPoint.y - 80}>
        {object.parameters.crossingId}
      </text>
      <text
        fill={stroke}
        fontSize={textSize * 0.9}
        x={crossingPoint.x + 280}
        y={crossingPoint.y + 180}
      >
        {[object.parameters.serviceType, object.parameters.conflictType, object.parameters.riskStatus]
          .filter(Boolean)
          .join(' · ')}
      </text>
    </g>
  );
}
