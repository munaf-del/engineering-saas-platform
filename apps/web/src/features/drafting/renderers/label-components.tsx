import * as React from 'react';
import type { DraftingLabelPlacement } from '../labels/drafting-label-layout';

export function DraftingCanvasLabel({
  anchorPoint,
  leaderStroke,
  leaderStrokeWidth = 1,
  lines,
  placement,
  stroke,
  surface = 'editor',
  textAnchor = 'start',
  textSize,
  x,
  y,
}: {
  anchorPoint?: { x: number; y: number };
  leaderStroke?: string;
  leaderStrokeWidth?: number;
  lines: string[];
  placement?: DraftingLabelPlacement;
  stroke: string;
  surface?: 'editor' | 'sheet';
  textAnchor?: 'start' | 'middle' | 'end';
  textSize: number;
  x: number;
  y: number;
}) {
  if (lines.length === 0 || placement?.hidden) {
    return null;
  }

  const labelX = placement?.hidden === false ? placement.x : x;
  const labelY = placement?.hidden === false ? placement.y : y;
  const leader = placement?.hidden === false ? placement.leader : undefined;
  const resolvedLeaderStroke = leaderStroke ?? stroke;
  const resolvedLeaderWidth =
    surface === 'sheet'
      ? Math.max(0.35, leaderStrokeWidth * 0.55)
      : Math.max(0.75, leaderStrokeWidth);

  return (
    <g data-drafting-label="true">
      {leader && anchorPoint ? (
        <line
          opacity={0.68}
          stroke={resolvedLeaderStroke}
          strokeWidth={resolvedLeaderWidth}
          vectorEffect={surface === 'sheet' ? undefined : 'non-scaling-stroke'}
          x1={leader.start.x}
          x2={leader.end.x}
          y1={leader.start.y}
          y2={leader.end.y}
        />
      ) : null}
      {lines.map((line, index) => (
        <text
          dominantBaseline="middle"
          fill={index === 0 ? stroke : '#475569'}
          fontSize={index === 0 ? textSize : textSize * 0.74}
          fontWeight={index === 0 ? 650 : 500}
          key={`${line}-${index}`}
          paintOrder="stroke"
          stroke="#ffffff"
          strokeLinejoin="round"
          strokeWidth={Math.max(14, textSize * 0.08)}
          textAnchor={textAnchor}
          x={labelX}
          y={labelY + index * textSize * 0.9}
        >
          {line}
        </text>
      ))}
    </g>
  );
}
