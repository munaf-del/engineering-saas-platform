import * as React from 'react';
import { type DraftingBoreholeRendererProps } from './renderer-types';

export function BoreholeRenderer({
  isSelected,
  layer,
  object,
  onPointerDown,
}: DraftingBoreholeRendererProps) {
  const stroke = object.style?.stroke ?? layer?.color ?? '#0f766e';
  const fill = object.style?.fill ?? '#dcfce7';
  const lineWeight = object.style?.lineWeight ?? layer?.lineWeight ?? 1;
  const textSize = object.style?.textSize ?? 220;
  const detailParts = [
    object.parameters.groundLevelRl !== undefined ? `GL ${object.parameters.groundLevelRl}` : null,
    object.parameters.terminationDepthM !== undefined
      ? `TD ${object.parameters.terminationDepthM}m`
      : null,
  ].filter(Boolean);

  return (
    <g data-drafting-object="true" onPointerDown={onPointerDown}>
      {isSelected ? (
        <circle
          cx={object.geometry.point.x}
          cy={object.geometry.point.y}
          fill="rgba(14, 165, 233, 0.12)"
          r={320}
          stroke="#2563eb"
          strokeWidth={50}
          vectorEffect="non-scaling-stroke"
        />
      ) : null}
      <circle
        cx={object.geometry.point.x}
        cy={object.geometry.point.y}
        fill={fill}
        r={160}
        stroke={stroke}
        strokeWidth={lineWeight * 22}
        vectorEffect="non-scaling-stroke"
      />
      <line
        stroke={stroke}
        strokeWidth={lineWeight * 20}
        vectorEffect="non-scaling-stroke"
        x1={object.geometry.point.x}
        x2={object.geometry.point.x}
        y1={object.geometry.point.y - 220}
        y2={object.geometry.point.y + 220}
      />
      <line
        stroke={stroke}
        strokeWidth={lineWeight * 20}
        vectorEffect="non-scaling-stroke"
        x1={object.geometry.point.x - 220}
        x2={object.geometry.point.x + 220}
        y1={object.geometry.point.y}
        y2={object.geometry.point.y}
      />
      <text
        fill={stroke}
        fontSize={textSize}
        x={object.geometry.point.x + 260}
        y={object.geometry.point.y - 80}
      >
        {object.parameters.label}
      </text>
      {detailParts.length > 0 ? (
        <text
          fill={stroke}
          fontSize={textSize * 0.9}
          x={object.geometry.point.x + 260}
          y={object.geometry.point.y + 180}
        >
          {detailParts.join(' · ')}
        </text>
      ) : null}
    </g>
  );
}
