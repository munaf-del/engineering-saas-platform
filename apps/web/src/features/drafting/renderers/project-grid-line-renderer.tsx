import * as React from 'react';
import type { DraftingPoint, DraftingProjectGridLineObject } from '@eng/shared';
import {
  applyDraftingTextCase,
  resolveDraftingTextStyle,
} from '../standards/drafting-style-resolver';
import {
  DRAFTING_SELECTION_STYLE,
  resolveRendererLineStyle,
  resolveRendererVectorEffect,
  resolveTechnicalStroke,
  type DraftingProjectGridLineRendererProps,
} from './renderer-types';

export function ProjectGridLineRenderer({
  drawingSetup,
  isSelected,
  layer,
  object,
  onPointerDown,
  surface,
}: DraftingProjectGridLineRendererProps) {
  const lineStyle = resolveRendererLineStyle({
    drawingSetup,
    layer,
    object,
    role: 'gridLine',
    surface,
  });
  const stroke = resolveTechnicalStroke(object.style?.stroke, lineStyle, []);
  const vectorEffect = resolveRendererVectorEffect(surface);
  const textStyle = resolveDraftingTextStyle({
    object,
    role: 'gridReference',
    setup: drawingSetup,
    surface,
  });
  const bubbleRadius = object.metadata.bubbleRadiusMm;
  const bubblePlacement = object.metadata.bubblePlacement;
  const bubblePoints = resolveProjectGridLineBubblePoints(object);

  return (
    <g
      data-drafting-object="true"
      data-drafting-object-id={object.id}
      data-project-grid-line-id={object.metadata.gridLineId}
      data-testid={`drafting-object-${object.id}`}
      onPointerDown={onPointerDown}
    >
      {isSelected ? (
        <line
          stroke={DRAFTING_SELECTION_STYLE.stroke}
          strokeDasharray={DRAFTING_SELECTION_STYLE.strokeDasharray}
          strokeWidth={DRAFTING_SELECTION_STYLE.strokeWidth}
          vectorEffect={vectorEffect}
          x1={object.geometry.start.x}
          x2={object.geometry.end.x}
          y1={object.geometry.start.y}
          y2={object.geometry.end.y}
        />
      ) : null}
      <line
        data-grid-line-role={object.metadata.lineRole}
        data-testid="drafting-project-grid-line"
        stroke={stroke}
        strokeDasharray={object.metadata.lineRole === 'axis' ? '260 120' : undefined}
        strokeOpacity={object.metadata.lineRole === 'minor' ? 0.55 : 0.9}
        strokeWidth={projectGridLineStrokeWidth(object.metadata.lineRole)}
        vectorEffect={vectorEffect}
        x1={object.geometry.start.x}
        x2={object.geometry.end.x}
        y1={object.geometry.start.y}
        y2={object.geometry.end.y}
      />
      {bubblePlacement === 'both' || bubblePlacement === 'start' ? (
        <ProjectGridLineBubble
          center={bubblePoints.start}
          label={object.metadata.label}
          moduleNotation={
            object.metadata.showModuleNotation ? object.metadata.moduleNotation : undefined
          }
          radius={bubbleRadius}
          stroke={stroke}
          textStyle={textStyle}
          vectorEffect={vectorEffect}
        />
      ) : null}
      {bubblePlacement === 'both' || bubblePlacement === 'end' ? (
        <ProjectGridLineBubble
          center={bubblePoints.end}
          label={object.metadata.label}
          moduleNotation={
            object.metadata.showModuleNotation ? object.metadata.moduleNotation : undefined
          }
          radius={bubbleRadius}
          stroke={stroke}
          textStyle={textStyle}
          vectorEffect={vectorEffect}
        />
      ) : null}
    </g>
  );
}

function ProjectGridLineBubble({
  center,
  label,
  moduleNotation,
  radius,
  stroke,
  textStyle,
  vectorEffect,
}: {
  center: DraftingPoint;
  label: string;
  moduleNotation?: string;
  radius: number;
  stroke: string;
  textStyle: ReturnType<typeof resolveDraftingTextStyle>;
  vectorEffect: ReturnType<typeof resolveRendererVectorEffect>;
}) {
  return (
    <g data-testid="drafting-project-grid-bubble" transform={`translate(${center.x} ${center.y})`}>
      <circle
        fill="#ffffff"
        r={radius}
        stroke={stroke}
        strokeWidth={Math.max(1, radius * 0.02)}
        vectorEffect={vectorEffect}
      />
      <text
        dominantBaseline="middle"
        fill={stroke}
        fontFamily={textStyle.fontFamily}
        fontSize={Math.max(120, Math.min(radius * 1.08, textStyle.fontSize))}
        fontStyle={textStyle.fontStyle}
        fontWeight={textStyle.fontWeight}
        textAnchor="middle"
      >
        {applyDraftingTextCase(label, textStyle)}
      </text>
      {moduleNotation ? (
        <text
          dominantBaseline="hanging"
          fill={stroke}
          fontFamily={textStyle.fontFamily}
          fontSize={Math.max(70, radius * 0.42)}
          fontStyle={textStyle.fontStyle}
          opacity={0.7}
          textAnchor="middle"
          y={radius + 32}
        >
          {applyDraftingTextCase(moduleNotation, textStyle)}
        </text>
      ) : null}
    </g>
  );
}

function resolveProjectGridLineBubblePoints(object: DraftingProjectGridLineObject) {
  const start = object.geometry.start;
  const end = object.geometry.end;
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const length = Math.max(1, Math.hypot(deltaX, deltaY));
  const unitX = deltaX / length;
  const unitY = deltaY / length;
  const offset = object.metadata.bubbleRadiusMm * 1.9;

  return {
    start: {
      x: start.x - unitX * offset,
      y: start.y - unitY * offset,
    },
    end: {
      x: end.x + unitX * offset,
      y: end.y + unitY * offset,
    },
  };
}

function projectGridLineStrokeWidth(role: DraftingProjectGridLineObject['metadata']['lineRole']) {
  switch (role) {
    case 'axis':
      return 1.6;
    case 'major':
      return 1.25;
    case 'custom':
      return 1;
    default:
      return 0.72;
  }
}
