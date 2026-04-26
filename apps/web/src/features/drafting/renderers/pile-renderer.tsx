import * as React from 'react';
import {
  DRAFTING_TECHNICAL_FILLS,
  resolveCanvasLabelSize,
  resolveRendererLineStyle,
  resolveRendererVectorEffect,
  resolveTechnicalFill,
  resolveTechnicalStroke,
  type DraftingPileRendererProps,
} from './renderer-types';
import { DraftingCanvasLabel } from './label-components';
import { buildDraftingObjectLabelLines } from './label-policy';

export function PileRenderer({
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
}: DraftingPileRendererProps) {
  const lineStyle = resolveRendererLineStyle({ drawingSetup, layer, object, surface });
  const centreStyle = resolveRendererLineStyle({
    drawingSetup,
    layer,
    object,
    role: 'pileCentreMark',
    surface,
  });
  const stroke = resolveTechnicalStroke(object.style?.stroke, lineStyle, ['#1d4ed8']);
  const fill = resolveTechnicalFill(object.style?.fill, DRAFTING_TECHNICAL_FILLS.pile);
  const radius = object.geometry.diameterMm / 2;
  const centreMark = Math.min(radius * 0.35, 120);
  const vectorEffect = resolveRendererVectorEffect(surface);
  const textSize = resolveCanvasLabelSize(object.style?.textSize);
  const isJointSource =
    object.sourceRef?.sourceType === 'foundation_pile' &&
    object.sourceRef.snapshot !== undefined &&
    'joint' in object.sourceRef.snapshot;
  const labelLines = buildDraftingObjectLabelLines({
    allObjects,
    isSelected,
    labelMode,
    object,
    surface,
    viewScale,
  });

  if (isJointSource) {
    return (
      <g data-drafting-object="true" onPointerDown={onPointerDown}>
        {isSelected ? (
          <circle
            cx={object.geometry.centre.x}
            cy={object.geometry.centre.y}
            fill="rgba(59, 130, 246, 0.08)"
            r={220}
            stroke="#2563eb"
            strokeDasharray="160 120"
            strokeWidth={2}
            vectorEffect={vectorEffect}
          />
        ) : null}
        <circle
          cx={object.geometry.centre.x}
          cy={object.geometry.centre.y}
          fill="none"
          r={115}
          stroke={stroke}
          strokeWidth={lineStyle.editorStrokeWidth}
          vectorEffect={vectorEffect}
        />
        <line
          stroke={stroke}
          strokeWidth={centreStyle.editorStrokeWidth}
          vectorEffect={vectorEffect}
          x1={object.geometry.centre.x - 190}
          x2={object.geometry.centre.x + 190}
          y1={object.geometry.centre.y}
          y2={object.geometry.centre.y}
        />
        <line
          stroke={stroke}
          strokeWidth={centreStyle.editorStrokeWidth}
          vectorEffect={vectorEffect}
          x1={object.geometry.centre.x}
          x2={object.geometry.centre.x}
          y1={object.geometry.centre.y - 190}
          y2={object.geometry.centre.y + 190}
        />
        <DraftingCanvasLabel
          anchorPoint={object.geometry.centre}
          leaderStroke={stroke}
          lines={labelLines}
          placement={labelPlacement}
          stroke={stroke}
          surface={surface}
          textSize={textSize}
          x={object.geometry.centre.x + 220}
          y={object.geometry.centre.y - 110}
        />
      </g>
    );
  }

  return (
    <g data-drafting-object="true" onPointerDown={onPointerDown}>
      {isSelected ? (
        <circle
          cx={object.geometry.centre.x}
          cy={object.geometry.centre.y}
          fill="rgba(59, 130, 246, 0.12)"
          r={radius + 140}
          stroke="#2563eb"
          strokeDasharray="160 120"
          strokeWidth={2}
          vectorEffect={vectorEffect}
        />
      ) : null}
      <circle
        cx={object.geometry.centre.x}
        cy={object.geometry.centre.y}
        fill={fill}
        r={radius}
        stroke={stroke}
        strokeWidth={lineStyle.editorStrokeWidth}
        vectorEffect={vectorEffect}
      />
      <line
        stroke={stroke}
        strokeDasharray={centreStyle.dashArray}
        strokeOpacity={0.75}
        strokeWidth={centreStyle.editorStrokeWidth}
        vectorEffect={vectorEffect}
        x1={object.geometry.centre.x - centreMark}
        x2={object.geometry.centre.x + centreMark}
        y1={object.geometry.centre.y}
        y2={object.geometry.centre.y}
      />
      <line
        stroke={stroke}
        strokeDasharray={centreStyle.dashArray}
        strokeOpacity={0.75}
        strokeWidth={centreStyle.editorStrokeWidth}
        vectorEffect={vectorEffect}
        x1={object.geometry.centre.x}
        x2={object.geometry.centre.x}
        y1={object.geometry.centre.y - centreMark}
        y2={object.geometry.centre.y + centreMark}
      />
      <DraftingCanvasLabel
        anchorPoint={object.geometry.centre}
        leaderStroke={stroke}
        lines={labelLines}
        placement={labelPlacement}
        stroke={stroke}
        surface={surface}
        textSize={textSize}
        x={object.geometry.centre.x + radius + 180}
        y={object.geometry.centre.y - 120}
      />
    </g>
  );
}
