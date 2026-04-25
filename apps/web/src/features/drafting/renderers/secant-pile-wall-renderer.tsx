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
  const fill = resolveSecantWallFill(object.style?.fill);
  const firstPile = object.geometry.pileCentres[0];
  const pattern = object.parameters.primarySecondaryPattern;
  const centreMark = Math.min(radius * 0.28, 120);

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
        opacity={0.55}
        points={object.geometry.baselinePoints.map((point) => `${point.x},${point.y}`).join(' ')}
        stroke={stroke}
        strokeDasharray={object.parameters.secantType === 'tangent' ? '300 200' : undefined}
        strokeWidth={Math.max(0.75, lineStyle.editorStrokeWidth * 0.7)}
        vectorEffect="non-scaling-stroke"
      />
      {object.geometry.pileCentres.map((point, index) => {
        const useAlternatingFill = pattern !== 'contiguous';
        const pileFill = useAlternatingFill && index % 2 === 1 ? 'rgba(255, 247, 237, 0.08)' : fill;

        return (
          <g key={`${object.id}-pile-${index}`}>
            <circle
              cx={point.x}
              cy={point.y}
              fill={pileFill}
              r={radius}
              stroke={stroke}
              strokeWidth={lineStyle.editorStrokeWidth}
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={point.x}
              cy={point.y}
              fill="none"
              r={Math.max(radius - 90, radius * 0.78)}
              stroke={stroke}
              strokeOpacity={0.35}
              strokeWidth={Math.max(0.75, lineStyle.editorStrokeWidth * 0.55)}
              vectorEffect="non-scaling-stroke"
            />
            <line
              stroke={stroke}
              strokeOpacity={0.55}
              strokeWidth={Math.max(0.75, lineStyle.editorStrokeWidth * 0.55)}
              vectorEffect="non-scaling-stroke"
              x1={point.x - centreMark}
              x2={point.x + centreMark}
              y1={point.y}
              y2={point.y}
            />
            <line
              stroke={stroke}
              strokeOpacity={0.55}
              strokeWidth={Math.max(0.75, lineStyle.editorStrokeWidth * 0.55)}
              vectorEffect="non-scaling-stroke"
              x1={point.x}
              x2={point.x}
              y1={point.y - centreMark}
              y2={point.y + centreMark}
            />
          </g>
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

function resolveSecantWallFill(fill?: string) {
  if (!fill || fill === '#fdba74') {
    return 'rgba(253, 186, 116, 0.06)';
  }

  return fill;
}
