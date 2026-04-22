import * as React from 'react';
import { type DraftingWalerRendererProps } from './renderer-types';

export function WalerRenderer({
  isSelected,
  layer,
  object,
  onPointerDown,
}: DraftingWalerRendererProps) {
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
        strokeWidth={260}
      />
      <polyline
        fill="none"
        opacity={0.8}
        points={object.geometry.points.map((point) => `${point.x},${point.y}`).join(' ')}
        stroke="#ffedd5"
        strokeDasharray="300 180"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={90}
      />
      {firstPoint ? (
        <text fill={stroke} fontSize={220} x={firstPoint.x + 180} y={firstPoint.y - 180}>
          {`${object.parameters.walerId} ${object.parameters.sectionLabel}`}
        </text>
      ) : null}
    </g>
  );
}
