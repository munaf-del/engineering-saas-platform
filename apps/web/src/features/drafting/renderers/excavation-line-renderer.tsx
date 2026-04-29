import * as React from 'react';
import {
  DRAFTING_SELECTION_STYLE,
  resolveCanvasLabelSize,
  resolveRendererLineStyle,
  resolveRendererVectorEffect,
  type DraftingExcavationLineRendererProps,
} from './renderer-types';
import { DraftingCanvasLabel } from './label-components';
import { buildDraftingObjectLabelLines } from './label-policy';

export function ExcavationLineRenderer({
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
}: DraftingExcavationLineRendererProps) {
  const lineStyle = resolveRendererLineStyle({
    drawingSetup,
    layer,
    object,
    role: 'constructionSetout',
    surface,
  });
  const stroke = object.style?.stroke ?? lineStyle.color ?? layer?.color ?? lineStyle.color;
  const dashArray = object.style?.lineStyle === 'solid' ? undefined : '320 180';
  const firstPoint = object.geometry.points[0];
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
      <polyline
        fill="none"
        points={object.geometry.points.map((point) => `${point.x},${point.y}`).join(' ')}
        stroke={isSelected ? DRAFTING_SELECTION_STYLE.stroke : stroke}
        strokeDasharray={dashArray}
        strokeWidth={lineStyle.editorStrokeWidth}
        vectorEffect={vectorEffect}
      />
      {firstPoint ? (
        <DraftingCanvasLabel
          anchorPoint={firstPoint}
          leaderStroke={stroke}
          lines={labelLines}
          placement={labelPlacement}
          stroke={stroke}
          surface={surface}
          textSize={textSize}
          x={firstPoint.x + 120}
          y={firstPoint.y - 160}
        />
      ) : null}
    </g>
  );
}
