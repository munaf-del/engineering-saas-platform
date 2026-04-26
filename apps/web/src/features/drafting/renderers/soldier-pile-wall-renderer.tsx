import * as React from 'react';
import { defaultSoldierPileSymbolDiameterMm } from '../semantic-object-utils';
import {
  DRAFTING_TECHNICAL_FILLS,
  resolveCanvasLabelSize,
  resolveRendererLineStyle,
  resolveRendererVectorEffect,
  resolveTechnicalFill,
  resolveTechnicalStroke,
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
  const lineStyle = resolveRendererLineStyle({
    drawingSetup,
    layer,
    object,
    role: 'pileOutline',
    surface,
  });
  const baselineStyle = resolveRendererLineStyle({
    drawingSetup,
    layer,
    object,
    role: 'wallBaseline',
    surface,
  });
  const centreStyle = resolveRendererLineStyle({
    drawingSetup,
    layer,
    object,
    role: 'pileCentreMark',
    surface,
  });
  const stroke = resolveTechnicalStroke(object.style?.stroke, lineStyle, ['#b45309', '#1d4ed8']);
  const fill = resolveTechnicalFill(object.style?.fill, DRAFTING_TECHNICAL_FILLS.structural);
  const diameterMm = defaultSoldierPileSymbolDiameterMm(object);
  const radius = diameterMm / 2;
  const firstPile = object.geometry.pilePositions[0];
  const centreMark = Math.min(radius * 0.35, 110);
  const vectorEffect = resolveRendererVectorEffect(surface);
  const textSize = resolveCanvasLabelSize(object.style?.textSize);

  return (
    <g data-drafting-object="true" onPointerDown={onPointerDown}>
      {isSelected ? (
        <polyline
          fill="none"
          points={object.geometry.baselinePoints.map((point) => `${point.x},${point.y}`).join(' ')}
          stroke="#2563eb"
          strokeDasharray="180 120"
          strokeWidth={2}
          vectorEffect={vectorEffect}
        />
      ) : null}
      <polyline
        fill="none"
        opacity={object.parameters.laggingType ? 0.8 : 0.45}
        points={object.geometry.baselinePoints.map((point) => `${point.x},${point.y}`).join(' ')}
        stroke={stroke}
        strokeDasharray={object.parameters.laggingType ? undefined : '250 180'}
        strokeWidth={baselineStyle.editorStrokeWidth}
        vectorEffect={vectorEffect}
      />
      {object.geometry.pilePositions.map((point, index) => (
        <g key={`${object.id}-pile-${index}`}>
          <circle
            cx={point.x}
            cy={point.y}
            fill={fill}
            r={radius}
            stroke={stroke}
            strokeWidth={lineStyle.editorStrokeWidth}
            vectorEffect={vectorEffect}
          />
          <line
            stroke={stroke}
            strokeOpacity={0.6}
            strokeDasharray={centreStyle.dashArray}
            strokeWidth={centreStyle.editorStrokeWidth}
            vectorEffect={vectorEffect}
            x1={point.x - centreMark}
            x2={point.x + centreMark}
            y1={point.y}
            y2={point.y}
          />
          <line
            stroke={stroke}
            strokeOpacity={0.6}
            strokeDasharray={centreStyle.dashArray}
            strokeWidth={centreStyle.editorStrokeWidth}
            vectorEffect={vectorEffect}
            x1={point.x}
            x2={point.x}
            y1={point.y - centreMark}
            y2={point.y + centreMark}
          />
        </g>
      ))}
      {firstPile ? (
        <text
          fill={stroke}
          fontSize={textSize}
          paintOrder="stroke"
          stroke="#ffffff"
          strokeLinejoin="round"
          strokeWidth={Math.max(28, textSize * 0.16)}
          x={firstPile.x + radius + 180}
          y={firstPile.y - 180}
        >
          {object.metadata.wallId}
        </text>
      ) : null}
    </g>
  );
}
