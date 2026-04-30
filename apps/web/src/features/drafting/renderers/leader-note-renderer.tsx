import * as React from 'react';
import {
  DRAFTING_SELECTION_STYLE,
  DRAFTING_TECHNICAL_FILLS,
  resolveRendererLineStyle,
  resolveRendererVectorEffect,
  type DraftingLeaderNoteRendererProps,
} from './renderer-types';
import {
  applyDraftingTextCase,
  resolveDraftingTextStyle,
} from '../standards/drafting-style-resolver';

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
  const textStyle = resolveDraftingTextStyle({
    object,
    role: 'generalNote',
    setup: drawingSetup,
    surface,
  });
  const vectorEffect = resolveRendererVectorEffect(surface);
  const { anchor, textPoint } = object.geometry;
  const compactAtScale =
    surface !== 'sheet' && !isSelected && labelMode !== 'full' && (viewScale ?? 1) < 0.08;

  return (
    <g
      data-drafting-object="true"
      data-drafting-object-id={object.id}
      data-testid={`drafting-object-${object.id}`}
      onPointerDown={onPointerDown}
    >
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
          fill={DRAFTING_TECHNICAL_FILLS.annotation}
          height={340}
          rx={18}
          stroke={isSelected ? DRAFTING_SELECTION_STYLE.stroke : stroke}
          strokeWidth={lineStyle.editorStrokeWidth}
          vectorEffect={vectorEffect}
          width={1450}
          x={textPoint.x}
          y={textPoint.y - 250}
        />
      )}
      <text
        fill={stroke}
        fontFamily={textStyle.fontFamily}
        fontSize={textStyle.fontSize}
        fontStyle={textStyle.fontStyle}
        fontWeight={textStyle.fontWeight}
        x={textPoint.x + 100}
        y={textPoint.y - 45}
      >
        {applyDraftingTextCase(object.metadata.text, textStyle)}
      </text>
    </g>
  );
}
