import * as React from 'react';
import { type DraftingExcavationLineRendererProps } from './renderer-types';

export function ExcavationLineRenderer({
  isSelected,
  layer,
  object,
  onPointerDown,
}: DraftingExcavationLineRendererProps) {
  const stroke = object.style?.stroke ?? layer?.color ?? '#334155';
  const lineWeight = object.style?.lineWeight ?? layer?.lineWeight ?? 1;
  const dashArray = object.style?.lineStyle === 'dashed' ? '300 180' : undefined;
  const firstPoint = object.geometry.points[0];

  return (
    <g data-drafting-object="true" onPointerDown={onPointerDown}>
      <polyline
        fill={object.geometry.closed ? 'rgba(185, 28, 28, 0.08)' : 'none'}
        points={object.geometry.points.map((point) => `${point.x},${point.y}`).join(' ')}
        stroke={isSelected ? '#991b1b' : stroke}
        strokeDasharray={dashArray}
        strokeWidth={lineWeight * 35}
        vectorEffect="non-scaling-stroke"
      />
      {firstPoint ? (
        <text fill={stroke} fontSize={220} x={firstPoint.x + 120} y={firstPoint.y - 160}>
          {object.metadata.excavationId || object.name || 'Excavation'}
        </text>
      ) : null}
    </g>
  );
}
