import * as React from 'react';
import { type DraftingSecantPileWallRendererProps } from './renderer-types';

export function SecantPileWallRenderer({
  isSelected,
  layer,
  object,
  onPointerDown,
}: DraftingSecantPileWallRendererProps) {
  const stroke = object.style?.stroke ?? layer?.color ?? '#9a3412';
  const radius = object.parameters.pileDiameterMm / 2;
  const fill = object.style?.fill ?? '#fdba74';
  const firstPile = object.geometry.pileCentres[0];
  const pattern = object.parameters.primarySecondaryPattern;

  return (
    <g data-drafting-object="true" onPointerDown={onPointerDown}>
      <polyline
        fill="none"
        opacity={0.45}
        points={object.geometry.baselinePoints.map((point) => `${point.x},${point.y}`).join(' ')}
        stroke={stroke}
        strokeDasharray={object.parameters.secantType === 'tangent' ? '300 200' : undefined}
        strokeWidth={70}
      />
      {object.geometry.pileCentres.map((point, index) => {
        const useAlternatingFill = pattern !== 'contiguous';
        const pileFill = useAlternatingFill && index % 2 === 1 ? '#fff7ed' : fill;

        return (
          <circle
            key={`${object.id}-pile-${index}`}
            cx={point.x}
            cy={point.y}
            fill={pileFill}
            r={radius}
            stroke={stroke}
            strokeWidth={isSelected ? 90 : 55}
          />
        );
      })}
      {firstPile ? (
        <text fill={stroke} fontSize={220} x={firstPile.x + radius + 180} y={firstPile.y - 180}>
          {`${object.metadata.wallId} (${object.metadata.pileCount} piles)`}
        </text>
      ) : null}
    </g>
  );
}
