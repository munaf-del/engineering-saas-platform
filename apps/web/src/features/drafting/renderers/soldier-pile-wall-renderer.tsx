import * as React from 'react';
import { defaultSoldierPileSymbolDiameterMm } from '../semantic-object-utils';
import {
  DRAFTING_SELECTION_STYLE,
  DRAFTING_TECHNICAL_FILLS,
  resolveCanvasLabelSize,
  resolveRendererLineStyle,
  resolveRendererVectorEffect,
  resolveTechnicalFill,
  resolveTechnicalStroke,
  type DraftingSoldierPileWallRendererProps,
} from './renderer-types';
import { DraftingCanvasLabel } from './label-components';
import { buildDraftingObjectLabelLines } from './label-policy';

export function SoldierPileWallRenderer({
  drawingSetup,
  isSelected,
  layer,
  object,
  onPointerDown,
  allObjects,
  labelMode,
  labelPlacement,
  surface,
  viewScale,
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
  const textSize = resolveCanvasLabelSize(object.style?.textSize, undefined, drawingSetup);
  const labelLines = buildDraftingObjectLabelLines({
    allObjects,
    isSelected,
    labelMode,
    object,
    surface,
    viewScale,
  });

  return (
    <g
      data-drafting-object="true"
      data-drafting-object-id={object.id}
      data-testid={`drafting-object-${object.id}`}
      onPointerDown={onPointerDown}
    >
      {isSelected ? (
        <polyline
          fill="none"
          points={object.geometry.baselinePoints.map((point) => `${point.x},${point.y}`).join(' ')}
          stroke={DRAFTING_SELECTION_STYLE.stroke}
          strokeDasharray={DRAFTING_SELECTION_STYLE.strokeDasharray}
          strokeWidth={DRAFTING_SELECTION_STYLE.strokeWidth}
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
        <DraftingCanvasLabel
          anchorPoint={firstPile}
          leaderStroke={stroke}
          lines={labelLines}
          placement={labelPlacement}
          stroke={stroke}
          surface={surface}
          textSize={textSize}
          x={firstPile.x + radius + 180}
          y={firstPile.y - 180}
        />
      ) : null}
    </g>
  );
}
