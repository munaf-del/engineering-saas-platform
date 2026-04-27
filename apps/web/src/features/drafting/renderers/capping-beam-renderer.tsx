import * as React from 'react';
import {
  DRAFTING_SELECTION_STYLE,
  resolveCanvasLabelSize,
  resolveRendererLineStyle,
  resolveRendererVectorEffect,
  resolveTechnicalStroke,
  type DraftingCappingBeamRendererProps,
} from './renderer-types';
import { DraftingCanvasLabel } from './label-components';
import { buildDraftingObjectLabelLines } from './label-policy';

export function CappingBeamRenderer({
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
  const vectorEffect = resolveRendererVectorEffect(surface);
  const textSize = resolveCanvasLabelSize(object.style?.textSize, undefined, drawingSetup);
  const labelLines = buildDraftingObjectLabelLines({
    allObjects,
    isSelected,
    labelMode,
    object,
    surface,
    viewScale,
  });

  return (
    <g data-drafting-object="true" onPointerDown={onPointerDown}>
      {isSelected ? (
        <polyline
          fill="none"
          points={object.geometry.points.map((point) => `${point.x},${point.y}`).join(' ')}
          stroke={DRAFTING_SELECTION_STYLE.stroke}
          strokeDasharray={DRAFTING_SELECTION_STYLE.strokeDasharray}
          strokeWidth={DRAFTING_SELECTION_STYLE.strokeWidth}
          vectorEffect={vectorEffect}
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
        vectorEffect={vectorEffect}
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
          vectorEffect={vectorEffect}
        />
      ))}
      {firstPoint ? (
        <DraftingCanvasLabel
          anchorPoint={firstPoint}
          leaderStroke={stroke}
          lines={labelLines}
          placement={labelPlacement}
          stroke={stroke}
          surface={surface}
          textSize={textSize}
          x={firstPoint.x + 180}
          y={firstPoint.y - 220}
        />
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
