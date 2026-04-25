import * as React from 'react';
import { getServiceRunMidpoint } from '../semantic-object-utils';
import {
  DRAFTING_SELECTION_STYLE,
  resolveRendererLineStyle,
  resolveTechnicalStroke,
  type DraftingServiceRunRendererProps,
} from './renderer-types';

export function ServiceRunRenderer({
  drawingSetup,
  isSelected,
  layer,
  object,
  onPointerDown,
  surface,
}: DraftingServiceRunRendererProps) {
  const lineStyle = resolveRendererLineStyle({
    drawingSetup,
    layer,
    object,
    role: object.parameters.status === 'proposed' ? 'serviceProposed' : 'serviceExisting',
    surface,
  });
  const stroke = resolveTechnicalStroke(object.style?.stroke, lineStyle, ['#475569']);
  const textSize = object.style?.textSize ?? 220;
  const midpoint = getServiceRunMidpoint(object);
  const label = [
    object.parameters.serviceId,
    object.parameters.serviceType,
    object.parameters.status,
    object.parameters.diameterMm ? `Ø${object.parameters.diameterMm}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const dashArray =
    object.style?.lineStyle === 'dashed' || object.parameters.status === 'proposed'
      ? '320 180'
      : object.parameters.status === 'abandoned'
        ? '140 160'
        : undefined;

  return (
    <g data-drafting-object="true" onPointerDown={onPointerDown}>
      <polyline
        fill="none"
        points={object.geometry.path.map((point) => `${point.x},${point.y}`).join(' ')}
        stroke={isSelected ? DRAFTING_SELECTION_STYLE.stroke : stroke}
        strokeDasharray={dashArray}
        strokeLinecap="square"
        strokeLinejoin="round"
        strokeWidth={lineStyle.editorStrokeWidth}
        vectorEffect="non-scaling-stroke"
      />
      {object.parameters.diameterMm ? (
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
          vectorEffect="non-scaling-stroke"
        />
      ) : null}
      <text fill={stroke} fontSize={textSize} x={midpoint.x + 120} y={midpoint.y - 160}>
        {label}
      </text>
    </g>
  );
}
