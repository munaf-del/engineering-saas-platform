import * as React from 'react';
import {
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
  const stroke = object.style?.stroke ?? lineStyle.color ?? layer?.color ?? '#334155';
  const dashArray = object.style?.lineStyle === 'solid' ? undefined : '320 180';
  const firstPoint = object.geometry.points[0];
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
      <polyline
        fill="none"
        points={object.geometry.points.map((point) => `${point.x},${point.y}`).join(' ')}
        stroke={isSelected ? '#991b1b' : stroke}
        strokeDasharray={dashArray}
        strokeWidth={lineStyle.editorStrokeWidth}
        vectorEffect={vectorEffect}
      />
      {firstPoint ? (
        <DraftingCanvasLabel
          lines={labelLines}
          stroke={stroke}
          textSize={textSize}
          x={firstPoint.x + 120}
          y={firstPoint.y - 160}
        />
      ) : null}
    </g>
  );
}
