import * as React from 'react';
import { type DraftingAnchorTiebackRendererProps } from './renderer-types';

export function AnchorTiebackRenderer({
  isSelected,
  layer,
  object,
  onPointerDown,
}: DraftingAnchorTiebackRendererProps) {
  const stroke = object.style?.stroke ?? layer?.color ?? '#0f766e';
  const lineWeight = object.style?.lineWeight ?? layer?.lineWeight ?? 1;
  const { headPoint, tailPoint } = object.geometry;
  const arrow = buildArrowPolygon(headPoint, tailPoint, 260);
  const labelX = (headPoint.x + tailPoint.x) / 2 + 120;
  const labelY = (headPoint.y + tailPoint.y) / 2 - 140;

  return (
    <g data-drafting-object="true" onPointerDown={onPointerDown}>
      <line
        stroke={isSelected ? '#0d9488' : stroke}
        strokeWidth={lineWeight * 70}
        x1={headPoint.x}
        x2={tailPoint.x}
        y1={headPoint.y}
        y2={tailPoint.y}
      />
      <circle
        cx={headPoint.x}
        cy={headPoint.y}
        fill="#ffffff"
        r={160}
        stroke={stroke}
        strokeWidth={60}
      />
      <polygon fill={stroke} points={arrow} />
      <text fill={stroke} fontSize={220} x={labelX} y={labelY}>
        {object.parameters.anchorId}
      </text>
    </g>
  );
}

function buildArrowPolygon(
  startPoint: { x: number; y: number },
  endPoint: { x: number; y: number },
  length: number,
) {
  const angle = Math.atan2(endPoint.y - startPoint.y, endPoint.x - startPoint.x);
  const leftAngle = angle + Math.PI * 0.85;
  const rightAngle = angle - Math.PI * 0.85;
  const leftPoint = {
    x: endPoint.x + Math.cos(leftAngle) * length,
    y: endPoint.y + Math.sin(leftAngle) * length,
  };
  const rightPoint = {
    x: endPoint.x + Math.cos(rightAngle) * length,
    y: endPoint.y + Math.sin(rightAngle) * length,
  };

  return `${endPoint.x},${endPoint.y} ${leftPoint.x},${leftPoint.y} ${rightPoint.x},${rightPoint.y}`;
}
