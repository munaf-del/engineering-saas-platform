import * as React from 'react';
import {
  DRAFTING_SELECTION_STYLE,
  DRAFTING_TECHNICAL_FILLS,
  resolveCanvasLabelSize,
  resolveRendererLineStyle,
  resolveRendererVectorEffect,
  resolveTechnicalFill,
  resolveTechnicalStroke,
  type DraftingShaftRendererProps,
} from './renderer-types';
import { DraftingCanvasLabel } from './label-components';
import { buildDraftingObjectLabelLines } from './label-policy';
import { calculateShaftPileMarkerCount } from '../tools/shaft-tool';

export function ShaftRenderer({
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
}: DraftingShaftRendererProps) {
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
  const stroke = resolveTechnicalStroke(object.style?.stroke, lineStyle, ['#b45309', '#1d4ed8']);
  const fill = resolveTechnicalFill(object.style?.fill, DRAFTING_TECHNICAL_FILLS.structural);
  const vectorEffect = resolveRendererVectorEffect(surface);
  const pileRadius = object.parameters.pileDiameterMm / 2;
  const pileMarkers = buildShaftPileMarkers(object);
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
        <circle
          cx={object.geometry.centre.x}
          cy={object.geometry.centre.y}
          fill={DRAFTING_SELECTION_STYLE.fill}
          r={object.geometry.radiusMm + pileRadius}
          stroke={DRAFTING_SELECTION_STYLE.stroke}
          strokeDasharray={DRAFTING_SELECTION_STYLE.strokeDasharray}
          strokeWidth={DRAFTING_SELECTION_STYLE.strokeWidth}
          vectorEffect={vectorEffect}
        />
      ) : null}
      <circle
        cx={object.geometry.centre.x}
        cy={object.geometry.centre.y}
        data-testid="drafting-shaft"
        fill="none"
        opacity={0.58}
        r={object.geometry.radiusMm}
        stroke={stroke}
        strokeDasharray={baselineStyle.dashArray}
        strokeWidth={baselineStyle.editorStrokeWidth}
        vectorEffect={vectorEffect}
      />
      {pileMarkers.map((marker, index) => (
        <circle
          cx={marker.x}
          cy={marker.y}
          data-testid="drafting-shaft-pile-marker"
          fill={
            object.parameters.constructionType === 'secant_piles' && index % 2 === 1
              ? DRAFTING_TECHNICAL_FILLS.structural
              : fill
          }
          key={`${object.id}-shaft-pile-${index}`}
          opacity={object.parameters.constructionType === 'secant_piles' ? 0.92 : 0.78}
          r={pileRadius}
          stroke={stroke}
          strokeWidth={lineStyle.editorStrokeWidth}
          vectorEffect={vectorEffect}
        />
      ))}
      {labelLines.length ? (
        <DraftingCanvasLabel
          anchorPoint={object.geometry.centre}
          leaderStroke={stroke}
          lines={labelLines}
          placement={labelPlacement}
          stroke={stroke}
          surface={surface}
          textSize={textSize}
          x={object.geometry.centre.x + object.geometry.radiusMm + pileRadius + 220}
          y={object.geometry.centre.y - object.geometry.radiusMm}
        />
      ) : null}
    </g>
  );
}

function buildShaftPileMarkers(object: DraftingShaftRendererProps['object']) {
  const count = calculateShaftPileMarkerCount(object);
  const rotationRad = ((object.geometry.rotationDeg ?? 0) * Math.PI) / 180;

  return Array.from({ length: count }, (_, index) => {
    const angle = rotationRad + (index / count) * Math.PI * 2;
    return {
      x: object.geometry.centre.x + Math.cos(angle) * object.geometry.radiusMm,
      y: object.geometry.centre.y + Math.sin(angle) * object.geometry.radiusMm,
    };
  });
}
