import * as React from 'react';
import {
  resolveCanvasLabelSize,
  resolveRendererLineStyle,
  resolveRendererVectorEffect,
  type DraftingLeaderNoteRendererProps,
} from './renderer-types';

export function LeaderNoteRenderer({
  drawingSetup,
  isSelected,
  layer,
  object,
  onPointerDown,
  labelMode,
  surface,
  viewScale,
}: DraftingLeaderNoteRendererProps) {
  const lineStyle = resolveRendererLineStyle({
    drawingSetup,
    layer,
    object,
    role: 'leaderCallout',
    surface,
  });
  const stroke = object.style?.stroke ?? lineStyle.color;
  const textSize = resolveCanvasLabelSize(object.style?.textSize, 160);
  const vectorEffect = resolveRendererVectorEffect(surface);
  const { anchor, textPoint } = object.geometry;
  const compactAtScale =
    surface !== 'sheet' && !isSelected && labelMode !== 'full' && (viewScale ?? 1) < 0.08;

  return (
    <g data-drafting-object="true" onPointerDown={onPointerDown}>
      <line
        stroke={stroke}
        strokeWidth={lineStyle.editorStrokeWidth}
        vectorEffect={vectorEffect}
        x1={anchor.x}
        x2={textPoint.x}
        y1={anchor.y}
        y2={textPoint.y}
      />
      <circle cx={anchor.x} cy={anchor.y} fill={stroke} r={42} vectorEffect={vectorEffect} />
      {compactAtScale ? null : (
        <rect
          fill="rgba(255,255,255,0.82)"
          height={340}
          rx={18}
          stroke={isSelected ? '#2563eb' : stroke}
          strokeWidth={lineStyle.editorStrokeWidth}
          vectorEffect={vectorEffect}
          width={1450}
          x={textPoint.x}
          y={textPoint.y - 250}
        />
      )}
      <text fill={stroke} fontSize={textSize} x={textPoint.x + 100} y={textPoint.y - 45}>
        {object.metadata.text}
      </text>
    </g>
  );
}
