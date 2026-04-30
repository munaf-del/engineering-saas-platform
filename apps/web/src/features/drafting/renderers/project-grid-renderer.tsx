import * as React from 'react';
import type {
  DraftingPoint,
  DraftingProjectGridLineDefinition,
  DraftingProjectGridObject,
} from '@eng/shared';
import { resolveDraftingTextStyle } from '../standards/drafting-style-resolver';
import {
  DRAFTING_SELECTION_STYLE,
  resolveRendererLineStyle,
  resolveRendererVectorEffect,
  resolveTechnicalStroke,
  type DraftingRendererProps,
} from './renderer-types';

export function ProjectGridRenderer(props: DraftingRendererProps<DraftingProjectGridObject>) {
  const { drawingSetup, isSelected, layer, object, onPointerDown, surface } = props;
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
    role: 'gridReference',
    setup: drawingSetup,
    surface,
  });
  const bubbleRadius = object.metadata.bubbleRadiusMm;
  const extents = object.geometry;

  return (
    <g
      data-drafting-object="true"
      data-drafting-object-id={object.id}
      data-project-grid-id={object.metadata.gridId}
      data-testid={`drafting-object-${object.id}`}
      onPointerDown={onPointerDown}
    >
      {isSelected ? <ProjectGridSelection object={object} vectorEffect={vectorEffect} /> : null}
      <g
        data-testid="drafting-project-grid"
        transform={`translate(${extents.origin.x} ${extents.origin.y}) rotate(${extents.rotationDeg})`}
      >
        {extents.xLines.filter(isVisibleProjectGridLine).map((line) => (
          <ProjectGridAxisLine
            bubbleRadius={bubbleRadius}
            key={line.id}
            labelAxis="x"
            line={line}
            lineEnd={extents.extentYPositiveMm}
            lineStart={-extents.extentYNegativeMm}
            moduleNotationEnabled={object.metadata.showModuleNotation ?? false}
            stroke={stroke}
            textStyle={textStyle}
            vectorEffect={vectorEffect}
          />
        ))}
        {extents.yLines.filter(isVisibleProjectGridLine).map((line) => (
          <ProjectGridAxisLine
            bubbleRadius={bubbleRadius}
            key={line.id}
            labelAxis="y"
            line={line}
            lineEnd={extents.extentXPositiveMm}
            lineStart={-extents.extentXNegativeMm}
            moduleNotationEnabled={object.metadata.showModuleNotation ?? false}
            stroke={stroke}
            textStyle={textStyle}
            vectorEffect={vectorEffect}
          />
        ))}
      </g>
    </g>
  );
}

function ProjectGridAxisLine({
  bubbleRadius,
  labelAxis,
  line,
  lineEnd,
  lineStart,
  moduleNotationEnabled,
  stroke,
  textStyle,
  vectorEffect,
}: {
  bubbleRadius: number;
  labelAxis: 'x' | 'y';
  line: DraftingProjectGridLineDefinition;
  lineEnd: number;
  lineStart: number;
  moduleNotationEnabled: boolean;
  stroke: string;
  textStyle: ReturnType<typeof resolveDraftingTextStyle>;
  vectorEffect: ReturnType<typeof resolveRendererVectorEffect>;
}) {
  const strokeWidth = projectGridStrokeWidth(line.lineRole);
  const startPoint =
    labelAxis === 'x' ? { x: line.offsetMm, y: lineStart } : { x: lineStart, y: line.offsetMm };
  const endPoint =
    labelAxis === 'x' ? { x: line.offsetMm, y: lineEnd } : { x: lineEnd, y: line.offsetMm };
  const bubbleOffset = bubbleRadius * 1.9;
  const startBubble =
    labelAxis === 'x'
      ? { x: startPoint.x, y: startPoint.y - bubbleOffset }
      : { x: startPoint.x - bubbleOffset, y: startPoint.y };
  const endBubble =
    labelAxis === 'x'
      ? { x: endPoint.x, y: endPoint.y + bubbleOffset }
      : { x: endPoint.x + bubbleOffset, y: endPoint.y };

  return (
    <g data-grid-axis={labelAxis} data-grid-line-id={line.id}>
      <line
        data-grid-line-role={line.lineRole}
        data-testid="drafting-project-grid-line"
        stroke={stroke}
        strokeDasharray={line.lineRole === 'axis' ? '260 120' : undefined}
        strokeOpacity={line.lineRole === 'minor' ? 0.55 : 0.88}
        strokeWidth={strokeWidth}
        vectorEffect={vectorEffect}
        x1={startPoint.x}
        x2={endPoint.x}
        y1={startPoint.y}
        y2={endPoint.y}
      />
      {line.bubbleStart ? (
        <ProjectGridBubble
          center={startBubble}
          label={line.label}
          moduleNotation={moduleNotationEnabled ? line.moduleNotation : undefined}
          radius={bubbleRadius}
          stroke={stroke}
          textStyle={textStyle}
          vectorEffect={vectorEffect}
        />
      ) : null}
      {line.bubbleEnd ? (
        <ProjectGridBubble
          center={endBubble}
          label={line.label}
          moduleNotation={moduleNotationEnabled ? line.moduleNotation : undefined}
          radius={bubbleRadius}
          stroke={stroke}
          textStyle={textStyle}
          vectorEffect={vectorEffect}
        />
      ) : null}
    </g>
  );
}

function ProjectGridBubble({
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
        fontSize={Math.max(120, Math.min(radius * 1.08, textStyle.fontSize))}
        fontWeight={textStyle.fontWeight}
        textAnchor="middle"
      >
        {label}
      </text>
      {moduleNotation ? (
        <text
          dominantBaseline="hanging"
          fill={stroke}
          fontSize={Math.max(70, radius * 0.42)}
          opacity={0.7}
          textAnchor="middle"
          y={radius + 32}
        >
          {moduleNotation}
        </text>
      ) : null}
    </g>
  );
}

function ProjectGridSelection({
  object,
  vectorEffect,
}: {
  object: DraftingProjectGridObject;
  vectorEffect: ReturnType<typeof resolveRendererVectorEffect>;
}) {
  const { geometry } = object;
  const width = geometry.extentXNegativeMm + geometry.extentXPositiveMm;
  const height = geometry.extentYNegativeMm + geometry.extentYPositiveMm;

  return (
    <rect
      fill={DRAFTING_SELECTION_STYLE.fill}
      height={height}
      stroke={DRAFTING_SELECTION_STYLE.stroke}
      strokeDasharray={DRAFTING_SELECTION_STYLE.strokeDasharray}
      strokeWidth={DRAFTING_SELECTION_STYLE.strokeWidth}
      transform={`translate(${geometry.origin.x} ${geometry.origin.y}) rotate(${geometry.rotationDeg})`}
      vectorEffect={vectorEffect}
      width={width}
      x={-geometry.extentXNegativeMm}
      y={-geometry.extentYNegativeMm}
    />
  );
}

function isVisibleProjectGridLine(line: DraftingProjectGridLineDefinition) {
  return line.visible !== false;
}

function projectGridStrokeWidth(role: DraftingProjectGridLineDefinition['lineRole']) {
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
