import * as React from 'react';
import { getServiceRunMidpoint } from '../semantic-object-utils';
import {
  DRAFTING_SELECTION_STYLE,
  resolveCanvasLabelSize,
  resolveRendererLineStyle,
  resolveRendererVectorEffect,
  resolveTechnicalStroke,
  type DraftingServiceRunRendererProps,
} from './renderer-types';
import { DraftingCanvasLabel } from './label-components';
import { buildDraftingObjectLabelLines } from './label-policy';

export function ServiceRunRenderer({
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
}: DraftingServiceRunRendererProps) {
  const lineStyle = resolveRendererLineStyle({
    drawingSetup,
    layer,
    object,
    role: object.parameters.status === 'proposed' ? 'serviceProposed' : 'serviceExisting',
    surface,
  });
  const stroke = resolveTechnicalStroke(object.style?.stroke, lineStyle, ['#475569']);
  const textSize = resolveCanvasLabelSize(object.style?.textSize);
  const midpoint = getServiceRunMidpoint(object);
  const isDegeneratePath = serviceRunPathLength(object.geometry.path) < 1;
  const vectorEffect = resolveRendererVectorEffect(surface);
  const labelLines =
    isDegeneratePath && !isSelected
      ? []
      : buildDraftingObjectLabelLines({
          allObjects,
          isSelected,
          labelMode,
          object,
          surface,
          viewScale,
        });
  const dashArray =
    object.style?.lineStyle === 'dashed' || object.parameters.status === 'proposed'
      ? '320 180'
      : object.parameters.status === 'abandoned'
        ? '140 160'
        : undefined;

  return (
    <g data-drafting-object="true" onPointerDown={onPointerDown}>
      {isDegeneratePath ? (
        <g>
          <circle
            cx={midpoint.x}
            cy={midpoint.y}
            fill="none"
            r={110}
            stroke={isSelected ? DRAFTING_SELECTION_STYLE.stroke : stroke}
            strokeDasharray="90 70"
            strokeWidth={lineStyle.editorStrokeWidth}
            vectorEffect={vectorEffect}
          />
          <line
            stroke={isSelected ? DRAFTING_SELECTION_STYLE.stroke : stroke}
            strokeWidth={Math.max(0.75, lineStyle.editorStrokeWidth * 0.75)}
            vectorEffect={vectorEffect}
            x1={midpoint.x - 150}
            x2={midpoint.x + 150}
            y1={midpoint.y}
            y2={midpoint.y}
          />
        </g>
      ) : (
        <polyline
          fill="none"
          points={object.geometry.path.map((point) => `${point.x},${point.y}`).join(' ')}
          stroke={isSelected ? DRAFTING_SELECTION_STYLE.stroke : stroke}
          strokeDasharray={dashArray}
          strokeLinecap="square"
          strokeLinejoin="round"
          strokeWidth={lineStyle.editorStrokeWidth}
          vectorEffect={vectorEffect}
        />
      )}
      {!isDegeneratePath && object.parameters.diameterMm ? (
        <polyline
          fill="none"
          opacity={0.45}
          points={object.geometry.path.map((point) => `${point.x},${point.y}`).join(' ')}
          stroke={stroke}
          strokeDasharray={dashArray}
          strokeLinecap="square"
          strokeLinejoin="round"
          strokeWidth={Math.max(0.75, lineStyle.editorStrokeWidth * 0.5)}
          transform={`translate(0 ${Math.min(object.parameters.diameterMm / 2, 180)})`}
          vectorEffect={vectorEffect}
        />
      ) : null}
      <DraftingCanvasLabel
        anchorPoint={midpoint}
        leaderStroke={stroke}
        lines={labelLines}
        placement={labelPlacement}
        stroke={stroke}
        surface={surface}
        textSize={textSize}
        x={midpoint.x + 120}
        y={midpoint.y - 160}
      />
    </g>
  );
}

function serviceRunPathLength(path: Array<{ x: number; y: number }>) {
  return path.slice(1).reduce((total, point, index) => {
    const previous = path[index];
    if (!previous) {
      return total;
    }
    return total + Math.hypot(point.x - previous.x, point.y - previous.y);
  }, 0);
}
