import * as React from 'react';
import {
  DRAFTING_SELECTION_STYLE,
  DRAFTING_TECHNICAL_FILLS,
  resolveCanvasLabelSize,
  resolveRendererLineStyle,
  resolveRendererVectorEffect,
  resolveTechnicalFill,
  resolveTechnicalStroke,
  type DraftingMonitoringPointRendererProps,
} from './renderer-types';
import { DraftingCanvasLabel } from './label-components';
import { buildDraftingObjectLabelLines } from './label-policy';

export function MonitoringPointRenderer({
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
}: DraftingMonitoringPointRendererProps) {
  const lineStyle = resolveRendererLineStyle({
    drawingSetup,
    layer,
    object,
    role: 'monitoringPoint',
    surface,
  });
  const stroke = resolveTechnicalStroke(object.style?.stroke, lineStyle, ['#7c3aed']);
  const fill = resolveTechnicalFill(object.style?.fill, DRAFTING_TECHNICAL_FILLS.none);
  const { x, y } = object.geometry.point;
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
          cx={x}
          cy={y}
          fill={DRAFTING_SELECTION_STYLE.fill}
          r={420}
          stroke={DRAFTING_SELECTION_STYLE.stroke}
          strokeDasharray={DRAFTING_SELECTION_STYLE.strokeDasharray}
          strokeWidth={DRAFTING_SELECTION_STYLE.strokeWidth}
          vectorEffect={vectorEffect}
        />
      ) : null}
      <circle
        cx={x}
        cy={y}
        fill={fill}
        r={220}
        stroke={stroke}
        strokeWidth={lineStyle.editorStrokeWidth}
        vectorEffect={vectorEffect}
      />
      <line
        stroke={stroke}
        strokeWidth={lineStyle.editorStrokeWidth}
        vectorEffect={vectorEffect}
        x1={x - 300}
        x2={x + 300}
        y1={y}
        y2={y}
      />
      <line
        stroke={stroke}
        strokeWidth={lineStyle.editorStrokeWidth}
        vectorEffect={vectorEffect}
        x1={x}
        x2={x}
        y1={y - 300}
        y2={y + 300}
      />
      <DraftingCanvasLabel
        anchorPoint={object.geometry.point}
        leaderStroke={stroke}
        lines={labelLines}
        placement={labelPlacement}
        stroke={stroke}
        surface={surface}
        textSize={textSize}
        x={x + 320}
        y={y - 140}
      />
    </g>
  );
}
