import * as React from 'react';
import { type DraftingCappingBeamRendererProps } from './renderer-types';

export function CappingBeamRenderer({
  isSelected,
  layer,
  object,
  onPointerDown,
}: DraftingCappingBeamRendererProps) {
  const stroke = object.style?.stroke ?? layer?.color ?? '#7c2d12';
  const firstPoint = object.geometry.points[0];

  return (
    <g data-drafting-object="true" onPointerDown={onPointerDown}>
      <polyline
        fill="none"
        points={object.geometry.points.map((point) => `${point.x},${point.y}`).join(' ')}
        stroke={isSelected ? '#9a3412' : stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={object.parameters.widthMm}
      />
      <polyline
        fill="none"
        opacity={0.9}
        points={object.geometry.points.map((point) => `${point.x},${point.y}`).join(' ')}
        stroke="#fff7ed"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={Math.max(object.parameters.widthMm * 0.18, 120)}
      />
      {firstPoint ? (
        <text fill={stroke} fontSize={220} x={firstPoint.x + 180} y={firstPoint.y - 220}>
          {object.parameters.beamId}
        </text>
      ) : null}
    </g>
  );
}
