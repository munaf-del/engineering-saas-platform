import * as React from 'react';
import { type DraftingPileRendererProps } from './renderer-types';

export function PileRenderer({ isSelected, layer, object, onPointerDown }: DraftingPileRendererProps) {
  const stroke = object.style?.stroke ?? layer?.color ?? '#334155';
  const fill = object.style?.fill ?? 'transparent';
  const lineWeight = object.style?.lineWeight ?? layer?.lineWeight ?? 1;
  const radius = object.geometry.diameterMm / 2;

  return (
    <g data-drafting-object="true" onPointerDown={onPointerDown}>
      {isSelected ? (
        <circle
          cx={object.geometry.centre.x}
          cy={object.geometry.centre.y}
          fill="rgba(59, 130, 246, 0.12)"
          r={radius + 180}
          stroke="#2563eb"
          strokeWidth={50}
          vectorEffect="non-scaling-stroke"
        />
      ) : null}
      <circle
        cx={object.geometry.centre.x}
        cy={object.geometry.centre.y}
        fill={fill}
        r={radius}
        stroke={stroke}
        strokeWidth={lineWeight * 30}
        vectorEffect="non-scaling-stroke"
      />
      <text
        fill={stroke}
        fontSize={220}
        x={object.geometry.centre.x + radius + 180}
        y={object.geometry.centre.y - 120}
      >
        {object.metadata.pileId}
      </text>
    </g>
  );
}
