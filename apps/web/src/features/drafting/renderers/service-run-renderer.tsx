import * as React from 'react';
import { getServiceRunMidpoint } from '../semantic-object-utils';
import { resolveDraftingLegacyLineWeight } from '../standards/drafting-style-resolver';
import { type DraftingServiceRunRendererProps } from './renderer-types';

export function ServiceRunRenderer({
  drawingSetup,
  isSelected,
  layer,
  object,
  onPointerDown,
}: DraftingServiceRunRendererProps) {
  const stroke = object.style?.stroke ?? layer?.color ?? '#475569';
  const lineWeight = resolveDraftingLegacyLineWeight({ layer, object, setup: drawingSetup });
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
        stroke={isSelected ? '#2563eb' : stroke}
        strokeDasharray={dashArray}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={lineWeight * 35}
        vectorEffect="non-scaling-stroke"
      />
      <text fill={stroke} fontSize={textSize} x={midpoint.x + 120} y={midpoint.y - 160}>
        {label}
      </text>
    </g>
  );
}
