import * as React from 'react';
import type { DraftingPoint } from '@eng/shared';
import {
  DRAFTING_SELECTION_STYLE,
  DRAFTING_TECHNICAL_FILLS,
  resolveCanvasLabelSize,
  resolveRendererLineStyle,
  resolveRendererVectorEffect,
  type DraftingSectionMarkerRendererProps,
} from './renderer-types';
import { resolveEffectiveLabelMode, shouldShowSecondaryCanvasLabel } from './label-policy';

export function SectionMarkerRenderer({
  drawingSetup,
  isSelected,
  layer,
  object,
  onPointerDown,
  labelMode,
  surface,
  viewScale,
}: DraftingSectionMarkerRendererProps) {
  const lineStyle = resolveRendererLineStyle({
    drawingSetup,
    layer,
    object,
    role: 'sectionMarker',
    surface,
  });
  const stroke = object.style?.stroke ?? lineStyle.color;
  const fill = object.style?.fill ?? DRAFTING_TECHNICAL_FILLS.annotation;
  const textSize = resolveCanvasLabelSize(object.style?.textSize, 170, drawingSetup);
  const vectorEffect = resolveRendererVectorEffect(surface);
  const effectiveLabelMode = resolveEffectiveLabelMode({ labelMode, surface });
  const showSecondary = shouldShowSecondaryCanvasLabel({
    isSelected,
    labelMode,
    object,
    surface,
    viewScale,
  });
  const midpoint = {
    x: (object.geometry.startPoint.x + object.geometry.endPoint.x) / 2,
    y: (object.geometry.startPoint.y + object.geometry.endPoint.y) / 2,
  };

  return (
    <g data-drafting-object="true" onPointerDown={onPointerDown}>
      <line
        stroke={isSelected ? DRAFTING_SELECTION_STYLE.stroke : stroke}
        strokeDasharray="260 180"
        strokeWidth={lineStyle.editorStrokeWidth}
        vectorEffect={vectorEffect}
        x1={object.geometry.startPoint.x}
        x2={object.geometry.endPoint.x}
        y1={object.geometry.startPoint.y}
        y2={object.geometry.endPoint.y}
      />

      {object.parameters.arrowDirection === 'left' || object.parameters.arrowDirection === 'both'
        ? renderSectionArrow(
            object.geometry.endPoint,
            object.geometry.startPoint,
            stroke,
            lineStyle.editorStrokeWidth,
            vectorEffect,
          )
        : null}
      {object.parameters.arrowDirection === 'right' || object.parameters.arrowDirection === 'both'
        ? renderSectionArrow(
            object.geometry.startPoint,
            object.geometry.endPoint,
            stroke,
            lineStyle.editorStrokeWidth,
            vectorEffect,
          )
        : null}

      {[object.geometry.startPoint, object.geometry.endPoint].map((point, index) => (
        <g key={`${object.id}-bubble-${index}`}>
          <circle
            cx={point.x}
            cy={point.y}
            fill={fill}
            r={210}
            stroke={stroke}
            strokeWidth={lineStyle.editorStrokeWidth}
            vectorEffect={vectorEffect}
          />
          {index === 0 ? (
            <text
              dominantBaseline="middle"
              fill={stroke}
              fontSize={textSize * 0.8}
              fontWeight={600}
              textAnchor="middle"
              x={point.x}
              y={point.y + 8}
            >
              {object.parameters.sectionLabel}
            </text>
          ) : null}
        </g>
      ))}

      {effectiveLabelMode !== 'minimal' &&
      showSecondary &&
      object.parameters.sectionId !== object.parameters.sectionLabel ? (
        <text
          fill={stroke}
          fontSize={textSize * 0.75}
          opacity={0.7}
          textAnchor="middle"
          x={midpoint.x}
          y={midpoint.y - 240}
        >
          {object.parameters.sectionId}
        </text>
      ) : null}
      {showSecondary && object.parameters.sheetReference ? (
        <text
          fill={stroke}
          fontSize={textSize * 0.75}
          opacity={0.7}
          textAnchor="middle"
          x={midpoint.x}
          y={midpoint.y + 300}
        >
          {object.parameters.sheetReference}
        </text>
      ) : null}
    </g>
  );
}

function renderSectionArrow(
  fromPoint: DraftingPoint,
  toPoint: DraftingPoint,
  stroke: string,
  strokeWidth: number,
  vectorEffect?: string,
) {
  const deltaX = toPoint.x - fromPoint.x;
  const deltaY = toPoint.y - fromPoint.y;
  const magnitude = Math.hypot(deltaX, deltaY) || 1;
  const unitX = deltaX / magnitude;
  const unitY = deltaY / magnitude;
  const arrowTip = {
    x: toPoint.x + unitX * 320,
    y: toPoint.y + unitY * 320,
  };
  const basePoint = {
    x: arrowTip.x - unitX * 240,
    y: arrowTip.y - unitY * 240,
  };
  const normal = {
    x: -unitY,
    y: unitX,
  };

  return (
    <polygon
      fill="none"
      points={[
        `${basePoint.x + normal.x * 140},${basePoint.y + normal.y * 140}`,
        `${arrowTip.x},${arrowTip.y}`,
        `${basePoint.x - normal.x * 140},${basePoint.y - normal.y * 140}`,
      ].join(' ')}
      stroke={stroke}
      strokeWidth={strokeWidth}
      vectorEffect={vectorEffect}
    />
  );
}
