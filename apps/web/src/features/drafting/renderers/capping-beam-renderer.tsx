import * as React from 'react';
import {
  DRAFTING_SELECTION_STYLE,
  resolveRendererLineStyle,
  resolveTechnicalStroke,
  type DraftingCappingBeamRendererProps,
} from './renderer-types';

export function CappingBeamRenderer({
  drawingSetup,
  isSelected,
  layer,
  object,
  onPointerDown,
  surface,
}: DraftingCappingBeamRendererProps) {
  const lineStyle = resolveRendererLineStyle({
    drawingSetup,
    layer,
    object,
    role: 'beamWaler',
    surface,
  });
  const secondaryStyle = resolveRendererLineStyle({
    drawingSetup,
    layer,
    object,
    role: 'structuralSecondary',
    surface,
  });
  const stroke = resolveTechnicalStroke(object.style?.stroke, lineStyle, ['#7c2d12', '#b45309']);
  const firstPoint = object.geometry.points[0];
  const outlinePoints = buildOffsetPolyline(object.geometry.points, object.parameters.widthMm / 2);

  return (
    <g data-drafting-object="true" onPointerDown={onPointerDown}>
      {isSelected ? (
        <polyline
          fill="none"
          points={object.geometry.points.map((point) => `${point.x},${point.y}`).join(' ')}
          stroke={DRAFTING_SELECTION_STYLE.stroke}
          strokeDasharray={DRAFTING_SELECTION_STYLE.strokeDasharray}
          strokeWidth={DRAFTING_SELECTION_STYLE.strokeWidth}
          vectorEffect="non-scaling-stroke"
        />
      ) : null}
      <polyline
        fill="none"
        points={object.geometry.points.map((point) => `${point.x},${point.y}`).join(' ')}
        stroke={secondaryStyle.color}
        strokeDasharray={secondaryStyle.dashArray}
        strokeLinecap="square"
        strokeLinejoin="round"
        strokeWidth={Math.max(0.75, secondaryStyle.editorStrokeWidth * 0.8)}
        vectorEffect="non-scaling-stroke"
      />
      {outlinePoints.map((points, index) => (
        <polyline
          key={`${object.id}-edge-${index}`}
          fill="none"
          points={points.map((point) => `${point.x},${point.y}`).join(' ')}
          stroke={stroke}
          strokeLinecap="square"
          strokeLinejoin="round"
          strokeWidth={lineStyle.editorStrokeWidth}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {firstPoint ? (
        <text fill={stroke} fontSize={220} x={firstPoint.x + 180} y={firstPoint.y - 220}>
          {object.parameters.beamId}
        </text>
      ) : null}
    </g>
  );
}

function buildOffsetPolyline(points: Array<{ x: number; y: number }>, offset: number) {
  if (points.length < 2) {
    return [];
  }

  const first = points[0]!;
  const last = points[points.length - 1]!;
  const length = Math.hypot(last.x - first.x, last.y - first.y) || 1;
  const nx = -(last.y - first.y) / length;
  const ny = (last.x - first.x) / length;

  return [-offset, offset].map((side) =>
    points.map((point) => ({
      x: point.x + nx * side,
      y: point.y + ny * side,
    })),
  );
}
