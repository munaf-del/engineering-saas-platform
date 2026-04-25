import * as React from 'react';
import { resolveRendererLineStyle, type DraftingPileRendererProps } from './renderer-types';

export function PileRenderer({
  drawingSetup,
  isSelected,
  layer,
  object,
  onPointerDown,
  surface,
}: DraftingPileRendererProps) {
  const lineStyle = resolveRendererLineStyle({ drawingSetup, layer, object, surface });
  const stroke = object.style?.stroke ?? lineStyle.color;
  const fill = object.style?.fill ?? 'rgba(255,255,255,0.18)';
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
        strokeWidth={lineStyle.editorStrokeWidth}
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
