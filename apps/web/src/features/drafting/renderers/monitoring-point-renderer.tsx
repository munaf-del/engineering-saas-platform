import * as React from 'react';
import {
  DRAFTING_SELECTION_STYLE,
  DRAFTING_TECHNICAL_FILLS,
  resolveRendererLineStyle,
  resolveTechnicalFill,
  resolveTechnicalStroke,
  type DraftingMonitoringPointRendererProps,
} from './renderer-types';

export function MonitoringPointRenderer({
  drawingSetup,
  isSelected,
  layer,
  object,
  onPointerDown,
  surface,
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

  return (
    <g data-drafting-object="true" onPointerDown={onPointerDown}>
      {isSelected ? (
        <circle
          cx={x}
          cy={y}
          fill={DRAFTING_SELECTION_STYLE.fill}
          r={420}
          stroke={DRAFTING_SELECTION_STYLE.stroke}
          strokeDasharray={DRAFTING_SELECTION_STYLE.strokeDasharray}
          strokeWidth={DRAFTING_SELECTION_STYLE.strokeWidth}
          vectorEffect="non-scaling-stroke"
        />
      ) : null}
      <circle
        cx={x}
        cy={y}
        fill={fill}
        r={220}
        stroke={stroke}
        strokeWidth={lineStyle.editorStrokeWidth}
        vectorEffect="non-scaling-stroke"
      />
      <line
        stroke={stroke}
        strokeWidth={lineStyle.editorStrokeWidth}
        vectorEffect="non-scaling-stroke"
        x1={x - 300}
        x2={x + 300}
        y1={y}
        y2={y}
      />
      <line
        stroke={stroke}
        strokeWidth={lineStyle.editorStrokeWidth}
        vectorEffect="non-scaling-stroke"
        x1={x}
        x2={x}
        y1={y - 300}
        y2={y + 300}
      />
      <text fill={stroke} fontSize={220} x={x + 320} y={y - 140}>
        {object.metadata.pointId}
      </text>
    </g>
  );
}
