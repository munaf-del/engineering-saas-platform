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
  const fill = resolvePileFill(object.style?.fill);
  const radius = object.geometry.diameterMm / 2;
  const centreMark = Math.min(radius * 0.35, 120);

  return (
    <g data-drafting-object="true" onPointerDown={onPointerDown}>
      {isSelected ? (
        <circle
          cx={object.geometry.centre.x}
          cy={object.geometry.centre.y}
          fill="rgba(59, 130, 246, 0.12)"
          r={radius + 140}
          stroke="#2563eb"
          strokeDasharray="160 120"
          strokeWidth={2}
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
      <line
        stroke={stroke}
        strokeOpacity={0.65}
        strokeWidth={Math.max(0.75, lineStyle.editorStrokeWidth * 0.65)}
        vectorEffect="non-scaling-stroke"
        x1={object.geometry.centre.x - centreMark}
        x2={object.geometry.centre.x + centreMark}
        y1={object.geometry.centre.y}
        y2={object.geometry.centre.y}
      />
      <line
        stroke={stroke}
        strokeOpacity={0.65}
        strokeWidth={Math.max(0.75, lineStyle.editorStrokeWidth * 0.65)}
        vectorEffect="non-scaling-stroke"
        x1={object.geometry.centre.x}
        x2={object.geometry.centre.x}
        y1={object.geometry.centre.y - centreMark}
        y2={object.geometry.centre.y + centreMark}
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

function resolvePileFill(fill?: string) {
  if (!fill || fill === '#ffffff') {
    return 'rgba(255, 255, 255, 0.04)';
  }

  if (fill === 'rgba(59, 130, 246, 0.2)') {
    return 'rgba(59, 130, 246, 0.06)';
  }

  return fill;
}
