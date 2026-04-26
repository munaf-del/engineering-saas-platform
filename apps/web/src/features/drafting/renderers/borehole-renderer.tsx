import * as React from 'react';
import {
  DRAFTING_SELECTION_STYLE,
  DRAFTING_TECHNICAL_FILLS,
  resolveCanvasLabelSize,
  resolveRendererLineStyle,
  resolveRendererVectorEffect,
  resolveTechnicalFill,
  resolveTechnicalStroke,
  type DraftingBoreholeRendererProps,
} from './renderer-types';

export function BoreholeRenderer({
  drawingSetup,
  isSelected,
  layer,
  object,
  onPointerDown,
  surface,
}: DraftingBoreholeRendererProps) {
  const lineStyle = resolveRendererLineStyle({
    drawingSetup,
    layer,
    object,
    role: 'borehole',
    surface,
  });
  const stroke = resolveTechnicalStroke(object.style?.stroke, lineStyle, ['#0f766e']);
  const fill = resolveTechnicalFill(object.style?.fill, DRAFTING_TECHNICAL_FILLS.survey);
  const textSize = resolveCanvasLabelSize(object.style?.textSize, 170);
  const vectorEffect = resolveRendererVectorEffect(surface);
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
          fill={DRAFTING_SELECTION_STYLE.fill}
          r={320}
          stroke={DRAFTING_SELECTION_STYLE.stroke}
          strokeDasharray={DRAFTING_SELECTION_STYLE.strokeDasharray}
          strokeWidth={DRAFTING_SELECTION_STYLE.strokeWidth}
          vectorEffect={vectorEffect}
        />
      ) : null}
      <circle
        cx={object.geometry.point.x}
        cy={object.geometry.point.y}
        fill={fill}
        r={160}
        stroke={stroke}
        strokeWidth={lineStyle.editorStrokeWidth}
        vectorEffect={vectorEffect}
      />
      <line
        stroke={stroke}
        strokeWidth={Math.max(0.75, lineStyle.editorStrokeWidth * 0.75)}
        vectorEffect={vectorEffect}
        x1={object.geometry.point.x}
        x2={object.geometry.point.x}
        y1={object.geometry.point.y - 220}
        y2={object.geometry.point.y + 220}
      />
      <line
        stroke={stroke}
        strokeWidth={Math.max(0.75, lineStyle.editorStrokeWidth * 0.75)}
        vectorEffect={vectorEffect}
        x1={object.geometry.point.x - 220}
        x2={object.geometry.point.x + 220}
        y1={object.geometry.point.y}
        y2={object.geometry.point.y}
      />
      <text
        fill={stroke}
        fontSize={textSize}
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth={36}
        x={object.geometry.point.x + 260}
        y={object.geometry.point.y - 80}
      >
        {object.parameters.label}
      </text>
      {detailParts.length > 0 ? (
        <text
          fill={stroke}
          fontSize={textSize * 0.9}
          paintOrder="stroke"
          stroke="#ffffff"
          strokeWidth={32}
          x={object.geometry.point.x + 260}
          y={object.geometry.point.y + 180}
        >
          {detailParts.join(' · ')}
        </text>
      ) : null}
    </g>
  );
}
