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

  return (
    <g data-drafting-object="true" onPointerDown={onPointerDown}>
      <polyline
        fill="none"
        opacity={object.parameters.laggingType ? 0.8 : 0.45}
        points={object.geometry.baselinePoints.map((point) => `${point.x},${point.y}`).join(' ')}
        stroke={stroke}
        strokeDasharray={object.parameters.laggingType ? undefined : '250 180'}
        strokeWidth={isSelected ? lineStyle.editorStrokeWidth * 1.8 : lineStyle.editorStrokeWidth}
        vectorEffect="non-scaling-stroke"
      />
      {object.geometry.pilePositions.map((point, index) => (
        <circle
          key={`${object.id}-pile-${index}`}
          cx={point.x}
          cy={point.y}
          fill="rgba(255, 251, 235, 0.28)"
          r={radius}
          stroke={stroke}
          strokeWidth={isSelected ? lineStyle.editorStrokeWidth * 1.6 : lineStyle.editorStrokeWidth}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {firstPile ? (
        <text fill={stroke} fontSize={220} x={firstPile.x + radius + 180} y={firstPile.y - 180}>
          {`${object.metadata.wallId} (${object.parameters.sectionLabel || `${diameterMm} dia`})`}
        </text>
      ) : null}
    </g>
  );
}
