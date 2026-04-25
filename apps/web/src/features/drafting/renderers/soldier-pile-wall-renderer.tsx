import * as React from 'react';
import { defaultSoldierPileSymbolDiameterMm } from '../semantic-object-utils';
import {
  resolveRendererLineStyle,
  type DraftingSoldierPileWallRendererProps,
} from './renderer-types';

export function SoldierPileWallRenderer({
  drawingSetup,
  isSelected,
  layer,
  object,
  onPointerDown,
  surface,
}: DraftingSoldierPileWallRendererProps) {
  const lineStyle = resolveRendererLineStyle({ drawingSetup, layer, object, surface });
  const stroke = object.style?.stroke ?? lineStyle.color;
  const diameterMm = defaultSoldierPileSymbolDiameterMm(object);
  const radius = diameterMm / 2;
  const firstPile = object.geometry.pilePositions[0];
  const centreMark = Math.min(radius * 0.35, 110);

  return (
    <g data-drafting-object="true" onPointerDown={onPointerDown}>
      {isSelected ? (
        <polyline
          fill="none"
          points={object.geometry.baselinePoints.map((point) => `${point.x},${point.y}`).join(' ')}
          stroke="#2563eb"
          strokeDasharray="180 120"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
      ) : null}
      <polyline
        fill="none"
        opacity={object.parameters.laggingType ? 0.8 : 0.45}
        points={object.geometry.baselinePoints.map((point) => `${point.x},${point.y}`).join(' ')}
        stroke={stroke}
        strokeDasharray={object.parameters.laggingType ? undefined : '250 180'}
        strokeWidth={Math.max(0.75, lineStyle.editorStrokeWidth * 0.8)}
        vectorEffect="non-scaling-stroke"
      />
      {object.geometry.pilePositions.map((point, index) => (
        <g key={`${object.id}-pile-${index}`}>
          <circle
            cx={point.x}
            cy={point.y}
            fill="rgba(255, 251, 235, 0.06)"
            r={radius}
            stroke={stroke}
            strokeWidth={lineStyle.editorStrokeWidth}
            vectorEffect="non-scaling-stroke"
          />
          <line
            stroke={stroke}
            strokeOpacity={0.6}
            strokeWidth={Math.max(0.75, lineStyle.editorStrokeWidth * 0.55)}
            vectorEffect="non-scaling-stroke"
            x1={point.x - centreMark}
            x2={point.x + centreMark}
            y1={point.y}
            y2={point.y}
          />
          <line
            stroke={stroke}
            strokeOpacity={0.6}
            strokeWidth={Math.max(0.75, lineStyle.editorStrokeWidth * 0.55)}
            vectorEffect="non-scaling-stroke"
            x1={point.x}
            x2={point.x}
            y1={point.y - centreMark}
            y2={point.y + centreMark}
          />
        </g>
      ))}
      {firstPile ? (
        <text fill={stroke} fontSize={220} x={firstPile.x + radius + 180} y={firstPile.y - 180}>
          {`${object.metadata.wallId} (${object.parameters.sectionLabel || `${diameterMm} dia`})`}
        </text>
      ) : null}
    </g>
  );
}
