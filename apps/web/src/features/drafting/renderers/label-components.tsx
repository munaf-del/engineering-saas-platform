import * as React from 'react';

export function DraftingCanvasLabel({
  lines,
  stroke,
  textAnchor = 'start',
  textSize,
  x,
  y,
}: {
  lines: string[];
  stroke: string;
  textAnchor?: 'start' | 'middle' | 'end';
  textSize: number;
  x: number;
  y: number;
}) {
  if (lines.length === 0) {
    return null;
  }

  return (
    <g data-drafting-label="true">
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
          x={x}
          y={y + index * textSize * 0.9}
        >
          {line}
        </text>
      ))}
    </g>
  );
}
