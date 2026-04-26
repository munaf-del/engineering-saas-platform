import * as React from 'react';
import {
  DRAFTING_TECHNICAL_FILLS,
  resolveCanvasLabelSize,
  resolveRendererLineStyle,
  resolveRendererVectorEffect,
  resolveTechnicalFill,
  resolveTechnicalStroke,
  type DraftingSecantPileWallRendererProps,
} from './renderer-types';
import { DraftingCanvasLabel } from './label-components';
import { buildDraftingObjectLabelLines } from './label-policy';

export function SecantPileWallRenderer({
  drawingSetup,
  isSelected,
  layer,
  object,
  onPointerDown,
  allObjects,
  labelMode,
  surface,
  viewScale,
}: DraftingSecantPileWallRendererProps) {
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
  const radius = object.parameters.pileDiameterMm / 2;
  const fill = resolveTechnicalFill(object.style?.fill, DRAFTING_TECHNICAL_FILLS.structural);
  const firstPile = object.geometry.pileCentres[0];
  const pattern = object.parameters.primarySecondaryPattern;
  const centreMark = Math.min(radius * 0.28, 120);
  const vectorEffect = resolveRendererVectorEffect(surface);
  const textSize = resolveCanvasLabelSize(object.style?.textSize);
  const labelLines = buildDraftingObjectLabelLines({
    allObjects,
    isSelected,
    labelMode,
    object,
    surface,
    viewScale,
  });

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
        opacity={0.55}
        points={object.geometry.baselinePoints.map((point) => `${point.x},${point.y}`).join(' ')}
        stroke={stroke}
        strokeDasharray={object.parameters.secantType === 'tangent' ? '300 200' : undefined}
        strokeWidth={baselineStyle.editorStrokeWidth}
        vectorEffect={vectorEffect}
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
              vectorEffect={vectorEffect}
            />
            <circle
              cx={point.x}
              cy={point.y}
              fill="none"
              r={Math.max(radius - 90, radius * 0.78)}
              stroke={stroke}
              strokeOpacity={0.35}
              strokeWidth={Math.max(0.75, lineStyle.editorStrokeWidth * 0.55)}
              vectorEffect={vectorEffect}
            />
            <line
              stroke={stroke}
              strokeDasharray={centreStyle.dashArray}
              strokeOpacity={0.55}
              strokeWidth={centreStyle.editorStrokeWidth}
              vectorEffect={vectorEffect}
              x1={point.x - centreMark}
              x2={point.x + centreMark}
              y1={point.y}
              y2={point.y}
            />
            <line
              stroke={stroke}
              strokeDasharray={centreStyle.dashArray}
              strokeOpacity={0.55}
              strokeWidth={centreStyle.editorStrokeWidth}
              vectorEffect={vectorEffect}
              x1={point.x}
              x2={point.x}
              y1={point.y - centreMark}
              y2={point.y + centreMark}
            />
          </g>
        );
      })}
      {firstPile ? (
        <DraftingCanvasLabel
          lines={labelLines}
          stroke={stroke}
          textSize={textSize}
          x={firstPile.x + radius + 180}
          y={firstPile.y - 180}
        />
      ) : null}
    </g>
  );
}
