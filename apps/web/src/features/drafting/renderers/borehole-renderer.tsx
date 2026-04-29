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
import { DraftingCanvasLabel } from './label-components';
import { buildDraftingObjectLabelLines } from './label-policy';

export function BoreholeRenderer({
  drawingSetup,
  isSelected,
  layer,
  object,
  onPointerDown,
  allObjects,
  labelMode,
  labelPlacement,
  surface,
  viewScale,
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
  const textSize = resolveCanvasLabelSize(object.style?.textSize, 170, drawingSetup);
  const vectorEffect = resolveRendererVectorEffect(surface);
  const labelLines = buildDraftingObjectLabelLines({
    allObjects,
    isSelected,
    labelMode,
    object,
    surface,
    viewScale,
  });

  return (
    <g
      data-drafting-object="true"
      data-drafting-object-id={object.id}
      data-testid={`drafting-object-${object.id}`}
      onPointerDown={onPointerDown}
    >
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
      <DraftingCanvasLabel
        anchorPoint={object.geometry.point}
        leaderStroke={stroke}
        lines={labelLines}
        placement={labelPlacement}
        stroke={stroke}
        surface={surface}
        textSize={textSize}
        x={object.geometry.point.x + 260}
        y={object.geometry.point.y - 80}
      />
    </g>
  );
}
