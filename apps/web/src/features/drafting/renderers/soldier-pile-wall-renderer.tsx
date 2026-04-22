import * as React from 'react';
import { defaultSoldierPileSymbolDiameterMm } from '../semantic-object-utils';
import { type DraftingSoldierPileWallRendererProps } from './renderer-types';

export function SoldierPileWallRenderer({
  isSelected,
  layer,
  object,
  onPointerDown,
}: DraftingSoldierPileWallRendererProps) {
  const stroke = object.style?.stroke ?? layer?.color ?? '#92400e';
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
        strokeWidth={isSelected ? 95 : 65}
      />
      {object.geometry.pilePositions.map((point, index) => (
        <circle
          key={`${object.id}-pile-${index}`}
          cx={point.x}
          cy={point.y}
          fill="#fffbeb"
          r={radius}
          stroke={stroke}
          strokeWidth={isSelected ? 80 : 45}
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
