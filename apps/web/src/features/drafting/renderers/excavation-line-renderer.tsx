import * as React from 'react';
import {
  resolveCanvasLabelSize,
  resolveRendererLineStyle,
  resolveRendererVectorEffect,
  type DraftingExcavationLineRendererProps,
} from './renderer-types';

export function ExcavationLineRenderer({
  drawingSetup,
  isSelected,
  layer,
  object,
  onPointerDown,
  surface,
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
        <text
          fill={stroke}
          fontSize={textSize}
          paintOrder="stroke"
          stroke="#ffffff"
          strokeLinejoin="round"
          strokeWidth={Math.max(28, textSize * 0.16)}
          x={firstPoint.x + 120}
          y={firstPoint.y - 160}
        >
          {object.metadata.excavationId || object.name || 'Excavation'}
        </text>
      ) : null}
    </g>
  );
}
