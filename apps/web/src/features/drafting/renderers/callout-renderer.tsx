import * as React from 'react';
import type { DraftingCalloutArrowStyle, DraftingPoint } from '@eng/shared';
import {
  DRAFTING_SELECTION_STYLE,
  DRAFTING_TECHNICAL_FILLS,
  resolveCanvasLabelSize,
  resolveRendererLineStyle,
  resolveRendererVectorEffect,
  type DraftingCalloutRendererProps,
} from './renderer-types';
import { buildFullAnnotationFooter, resolveEffectiveLabelMode } from './label-policy';

const BOX_WIDTH = 1900;

export function CalloutRenderer({
  drawingSetup,
  isSelected,
  layer,
  object,
  onPointerDown,
  labelMode,
  surface,
  viewScale,
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
  const textSize = resolveCanvasLabelSize(object.style?.textSize, 160, drawingSetup);
  const vectorEffect = resolveRendererVectorEffect(surface);
  const effectiveLabelMode = resolveEffectiveLabelMode({ labelMode, surface });
  const compactAtScale = surface !== 'sheet' && !isSelected && (viewScale ?? 1) < 0.08;
  const showBody = effectiveLabelMode !== 'minimal' && !compactAtScale;
  const footer =
    effectiveLabelMode === 'full'
      ? (buildFullAnnotationFooter({ isSelected, labelMode, object, surface, viewScale }) ??
        object.parameters.calloutId)
      : null;
  const bodyLines = object.parameters.body.split('\n').filter(Boolean);
  const visibleBodyLines = showBody ? bodyLines : [];
  const boxHeight = showBody ? 560 + Math.max(bodyLines.length, 1) * 190 : 360;
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
        vectorEffect={vectorEffect}
      />
      {renderCalloutArrow(
        object.parameters.arrowStyle,
        leaderPoints[1] ?? connectionPoint,
        object.geometry.anchorPoint,
        stroke,
        lineStyle.editorStrokeWidth,
        vectorEffect,
      )}

      <rect
        fill={fill}
        height={boxHeight}
        stroke={isSelected ? DRAFTING_SELECTION_STYLE.stroke : stroke}
        strokeWidth={lineStyle.editorStrokeWidth}
        vectorEffect={vectorEffect}
        width={BOX_WIDTH}
        x={boxX}
        y={boxY}
      />
      <text fill={stroke} fontSize={textSize} fontWeight={600} x={boxX + 120} y={boxY + 220}>
        {object.parameters.title}
      </text>
      <line
        stroke={stroke}
        strokeOpacity={0.3}
        strokeWidth={Math.max(0.75, lineStyle.editorStrokeWidth * 0.75)}
        vectorEffect={vectorEffect}
        x1={boxX + 100}
        x2={boxX + BOX_WIDTH - 100}
        y1={boxY + 300}
        y2={boxY + 300}
      />
      {(visibleBodyLines.length > 0 ? visibleBodyLines : []).map((line, index) => (
        <text
          key={`${object.id}-line-${index}`}
          fill={stroke}
          fontSize={textSize * 0.95}
          x={boxX + 120}
          y={boxY + 500 + index * 190}
        >
          {line}
        </text>
      ))}
      {footer ? (
        <text
          fill={stroke}
          fontSize={textSize * 0.7}
          opacity={0.62}
          x={boxX + BOX_WIDTH - 520}
          y={boxY + boxHeight - 90}
        >
          {footer}
        </text>
      ) : null}
    </g>
  );
}

function renderCalloutArrow(
  arrowStyle: DraftingCalloutArrowStyle,
  fromPoint: DraftingPoint,
  toPoint: DraftingPoint,
  stroke: string,
  strokeWidth: number,
  vectorEffect?: string,
) {
  if (arrowStyle === 'dot') {
    return (
      <circle cx={toPoint.x} cy={toPoint.y} fill={stroke} r={48} vectorEffect={vectorEffect} />
    );
  }

  const arrowPoints = buildArrowHeadPoints(fromPoint, toPoint, 160, 90);

  return (
    <polygon
      fill={arrowStyle === 'filled' ? DRAFTING_TECHNICAL_FILLS.annotation : 'none'}
      points={arrowPoints.map((point) => `${point.x},${point.y}`).join(' ')}
      stroke={stroke}
      strokeWidth={strokeWidth}
      vectorEffect={vectorEffect}
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
