import * as React from 'react';
import {
  resolveRendererLineStyle,
  type DraftingSecantPileWallRendererProps,
} from './renderer-types';

export function SecantPileWallRenderer({
  drawingSetup,
  isSelected,
  layer,
  object,
  onPointerDown,
  surface,
}: DraftingSecantPileWallRendererProps) {
  const lineStyle = resolveRendererLineStyle({ drawingSetup, layer, object, surface });
  const stroke = object.style?.stroke ?? lineStyle.color;
  const radius = object.parameters.pileDiameterMm / 2;
  const fill =
    object.style?.fill && object.style.fill !== '#fdba74'
      ? object.style.fill
      : 'rgba(253, 186, 116, 0.18)';
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
        strokeWidth={lineStyle.editorStrokeWidth}
        vectorEffect="non-scaling-stroke"
      />
      {object.geometry.pileCentres.map((point, index) => {
        const useAlternatingFill = pattern !== 'contiguous';
        const pileFill = useAlternatingFill && index % 2 === 1 ? 'rgba(255, 247, 237, 0.28)' : fill;

        return (
          <circle
            key={`${object.id}-pile-${index}`}
            cx={point.x}
            cy={point.y}
            fill={pileFill}
            r={radius}
            stroke={stroke}
            strokeWidth={
              isSelected ? lineStyle.editorStrokeWidth * 1.8 : lineStyle.editorStrokeWidth
            }
            vectorEffect="non-scaling-stroke"
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
