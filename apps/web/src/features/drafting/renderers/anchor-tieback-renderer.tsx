import * as React from 'react';
import {
  DRAFTING_SELECTION_STYLE,
  resolveRendererLineStyle,
  resolveTechnicalStroke,
  type DraftingAnchorTiebackRendererProps,
} from './renderer-types';

export function AnchorTiebackRenderer({
  drawingSetup,
  isSelected,
  layer,
  object,
  onPointerDown,
  surface,
}: DraftingAnchorTiebackRendererProps) {
  const lineStyle = resolveRendererLineStyle({
    drawingSetup,
    layer,
    object,
    role: 'anchorTieback',
    surface,
  });
  const stroke = resolveTechnicalStroke(object.style?.stroke, lineStyle, ['#0f766e']);
  const { headPoint, tailPoint } = object.geometry;
  const arrow = buildArrowPolygon(headPoint, tailPoint, 260);
  const labelX = (headPoint.x + tailPoint.x) / 2 + 120;
  const labelY = (headPoint.y + tailPoint.y) / 2 - 140;

  return (
    <g data-drafting-object="true" onPointerDown={onPointerDown}>
      {isSelected ? (
        <line
          stroke={DRAFTING_SELECTION_STYLE.stroke}
          strokeDasharray={DRAFTING_SELECTION_STYLE.strokeDasharray}
          strokeWidth={DRAFTING_SELECTION_STYLE.strokeWidth}
          vectorEffect="non-scaling-stroke"
          x1={headPoint.x}
          x2={tailPoint.x}
          y1={headPoint.y}
          y2={tailPoint.y}
        />
      ) : null}
      <line
        stroke={stroke}
        strokeWidth={lineStyle.editorStrokeWidth}
        vectorEffect="non-scaling-stroke"
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
        strokeWidth={lineStyle.editorStrokeWidth}
        vectorEffect="non-scaling-stroke"
      />
      <polygon
        fill="none"
        points={arrow}
        stroke={stroke}
        strokeWidth={lineStyle.editorStrokeWidth}
        vectorEffect="non-scaling-stroke"
      />
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
