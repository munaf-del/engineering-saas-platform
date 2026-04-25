import * as React from 'react';
import { resolveDraftingLegacyLineWeight } from '../standards/drafting-style-resolver';
import { type DraftingMonitoringPointRendererProps } from './renderer-types';

export function MonitoringPointRenderer({
  drawingSetup,
  isSelected,
  layer,
  object,
  onPointerDown,
}: DraftingMonitoringPointRendererProps) {
  const stroke = object.style?.stroke ?? layer?.color ?? '#334155';
  const fill = object.style?.fill ?? 'transparent';
  const lineWeight = resolveDraftingLegacyLineWeight({ layer, object, setup: drawingSetup });
  const { x, y } = object.geometry.point;

  return (
    <g data-drafting-object="true" onPointerDown={onPointerDown}>
      {isSelected ? (
        <circle
          cx={x}
          cy={y}
          fill="rgba(124, 58, 237, 0.12)"
          r={420}
          stroke="#7c3aed"
          strokeWidth={50}
          vectorEffect="non-scaling-stroke"
        />
      ) : null}
      <circle
        cx={x}
        cy={y}
        fill={fill}
        r={220}
        stroke={stroke}
        strokeWidth={lineWeight * 30}
        vectorEffect="non-scaling-stroke"
      />
      <line
        stroke={stroke}
        strokeWidth={lineWeight * 30}
        vectorEffect="non-scaling-stroke"
        x1={x - 300}
        x2={x + 300}
        y1={y}
        y2={y}
      />
      <line
        stroke={stroke}
        strokeWidth={lineWeight * 30}
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
