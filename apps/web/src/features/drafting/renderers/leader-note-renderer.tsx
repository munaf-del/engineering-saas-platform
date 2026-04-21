import * as React from 'react';
import { type DraftingLeaderNoteRendererProps } from './renderer-types';

export function LeaderNoteRenderer({
  isSelected,
  layer,
  object,
  onPointerDown,
}: DraftingLeaderNoteRendererProps) {
  const stroke = object.style?.stroke ?? layer?.color ?? '#334155';
  const lineWeight = object.style?.lineWeight ?? layer?.lineWeight ?? 1;
  const { anchor, textPoint } = object.geometry;

  return (
    <g data-drafting-object="true" onPointerDown={onPointerDown}>
      <line
        stroke={stroke}
        strokeWidth={lineWeight * 25}
        vectorEffect="non-scaling-stroke"
        x1={anchor.x}
        x2={textPoint.x}
        y1={anchor.y}
        y2={textPoint.y}
      />
      <circle cx={anchor.x} cy={anchor.y} fill={stroke} r={60} vectorEffect="non-scaling-stroke" />
      <rect
        fill="rgba(255,255,255,0.92)"
        height={420}
        rx={60}
        stroke={isSelected ? '#2563eb' : stroke}
        strokeWidth={lineWeight * 20}
        vectorEffect="non-scaling-stroke"
        width={1600}
        x={textPoint.x}
        y={textPoint.y - 300}
      />
      <text fill={stroke} fontSize={220} x={textPoint.x + 120} y={textPoint.y - 40}>
        {object.metadata.text}
      </text>
    </g>
  );
}
