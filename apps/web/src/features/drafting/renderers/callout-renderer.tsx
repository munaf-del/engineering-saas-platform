import * as React from 'react';
import type { DraftingCalloutArrowStyle, DraftingPoint } from '@eng/shared';
import {
  DRAFTING_SELECTION_STYLE,
  DRAFTING_TECHNICAL_FILLS,
  resolveRendererLineStyle,
  type DraftingCalloutRendererProps,
} from './renderer-types';

const BOX_WIDTH = 2200;

export function CalloutRenderer({
  drawingSetup,
  isSelected,
  layer,
  object,
  onPointerDown,
  surface,
}: DraftingCalloutRendererProps) {
  const lineStyle = resolveRendererLineStyle({
    drawingSetup,
    layer,
    object,
    role: 'leaderCallout',
    surface,
  });
  const stroke = object.style?.stroke ?? lineStyle.color;
  const fill = object.style?.fill ?? DRAFTING_TECHNICAL_FILLS.annotation;
  const textSize = object.style?.textSize ?? 220;
  const bodyLines = object.parameters.body.split('\n').filter(Boolean);
  const boxHeight = 760 + Math.max(bodyLines.length, 1) * 240;
  const boxX = object.geometry.labelPoint.x;
  const boxY = object.geometry.labelPoint.y;
  const connectOnLeft = object.geometry.anchorPoint.x <= boxX;
  const connectionPoint = {
    x: connectOnLeft ? boxX : boxX + BOX_WIDTH,
    y: boxY + boxHeight / 2,
  };
  const doglegPoint = {
    x: connectionPoint.x + (connectOnLeft ? -320 : 320),
    y: object.geometry.anchorPoint.y,
  };
  const leaderPoints =
    object.parameters.leaderStyle === 'dogleg'
      ? [object.geometry.anchorPoint, doglegPoint, connectionPoint]
      : [object.geometry.anchorPoint, connectionPoint];

  return (
    <g data-drafting-object="true" onPointerDown={onPointerDown}>
      <polyline
        fill="none"
        points={leaderPoints.map((point) => `${point.x},${point.y}`).join(' ')}
        stroke={stroke}
        strokeWidth={lineStyle.editorStrokeWidth}
        vectorEffect="non-scaling-stroke"
      />
      {renderCalloutArrow(
        object.parameters.arrowStyle,
        leaderPoints[1] ?? connectionPoint,
        object.geometry.anchorPoint,
        stroke,
        lineStyle.editorStrokeWidth,
      )}

      <rect
        fill={fill}
        height={boxHeight}
        stroke={isSelected ? DRAFTING_SELECTION_STYLE.stroke : stroke}
        strokeWidth={lineStyle.editorStrokeWidth}
        vectorEffect="non-scaling-stroke"
        width={BOX_WIDTH}
        x={boxX}
        y={boxY}
      />
      <text fill={stroke} fontSize={textSize} fontWeight={600} x={boxX + 140} y={boxY + 280}>
        {object.parameters.title}
      </text>
      <line
        stroke={stroke}
        strokeOpacity={0.3}
        strokeWidth={Math.max(0.75, lineStyle.editorStrokeWidth * 0.75)}
        vectorEffect="non-scaling-stroke"
        x1={boxX + 120}
        x2={boxX + BOX_WIDTH - 120}
        y1={boxY + 380}
        y2={boxY + 380}
      />
      {(bodyLines.length > 0 ? bodyLines : [' ']).map((line, index) => (
        <text
          key={`${object.id}-line-${index}`}
          fill={stroke}
          fontSize={textSize * 0.95}
          x={boxX + 140}
          y={boxY + 640 + index * 240}
        >
          {line}
        </text>
      ))}
      <text
        fill={stroke}
        fontSize={textSize * 0.85}
        x={boxX + BOX_WIDTH - 360}
        y={boxY + boxHeight - 120}
      >
        {object.parameters.calloutId}
      </text>
    </g>
  );
}

function renderCalloutArrow(
  arrowStyle: DraftingCalloutArrowStyle,
  fromPoint: DraftingPoint,
  toPoint: DraftingPoint,
  stroke: string,
  strokeWidth: number,
) {
  if (arrowStyle === 'dot') {
    return (
      <circle
        cx={toPoint.x}
        cy={toPoint.y}
        fill={stroke}
        r={80}
        vectorEffect="non-scaling-stroke"
      />
    );
  }

  const arrowPoints = buildArrowHeadPoints(fromPoint, toPoint, 220, 140);

  return (
    <polygon
      fill={arrowStyle === 'filled' ? stroke : 'none'}
      points={arrowPoints.map((point) => `${point.x},${point.y}`).join(' ')}
      stroke={stroke}
      strokeWidth={strokeWidth}
      vectorEffect="non-scaling-stroke"
    />
  );
}

function buildArrowHeadPoints(
  fromPoint: DraftingPoint,
  toPoint: DraftingPoint,
  length: number,
  width: number,
) {
  const deltaX = toPoint.x - fromPoint.x;
  const deltaY = toPoint.y - fromPoint.y;
  const magnitude = Math.hypot(deltaX, deltaY) || 1;
  const unitX = deltaX / magnitude;
  const unitY = deltaY / magnitude;
  const basePoint = {
    x: toPoint.x - unitX * length,
    y: toPoint.y - unitY * length,
  };
  const normal = {
    x: -unitY,
    y: unitX,
  };

  return [
    {
      x: basePoint.x + normal.x * width,
      y: basePoint.y + normal.y * width,
    },
    toPoint,
    {
      x: basePoint.x - normal.x * width,
      y: basePoint.y - normal.y * width,
    },
  ];
}
