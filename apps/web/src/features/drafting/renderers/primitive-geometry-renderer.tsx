import * as React from 'react';
import type {
  DraftingCircleObject,
  DraftingGeotechSurfaceObject,
  DraftingLineObject,
  DraftingPoint,
  DraftingPolygonObject,
  DraftingPolylineObject,
  DraftingRectangleObject,
  DraftingStructuralJointObject,
} from '@eng/shared';
import {
  DRAFTING_SELECTION_STYLE,
  DRAFTING_TECHNICAL_FILLS,
  resolveCanvasLabelSize,
  resolveRendererLineStyle,
  resolveRendererVectorEffect,
  resolveTechnicalFill,
  resolveTechnicalStroke,
  type DraftingRendererProps,
} from './renderer-types';
import { DraftingCanvasLabel } from './label-components';
import { buildDraftingObjectLabelLines } from './label-policy';

export function DraftLineRenderer(props: DraftingRendererProps<DraftingLineObject>) {
  const style = usePrimitiveStyle(props);
  const vectorEffect = resolveRendererVectorEffect(props.surface);
  const anchor = midpoint([props.object.geometry.startPoint, props.object.geometry.endPoint]);
  const startPoint = props.object.geometry.startPoint;
  const endPoint = props.object.geometry.endPoint;
  const hitPadding = Math.max(120, 12 / Math.max(props.viewScale ?? 1, 0.05));
  const hitX = Math.min(startPoint.x, endPoint.x) - hitPadding;
  const hitY = Math.min(startPoint.y, endPoint.y) - hitPadding;
  const hitWidth = Math.abs(endPoint.x - startPoint.x) + hitPadding * 2;
  const hitHeight = Math.abs(endPoint.y - startPoint.y) + hitPadding * 2;
  return (
    <g
      data-drafting-object="true"
      data-drafting-object-id={props.object.id}
      data-testid={`drafting-object-${props.object.id}`}
      onPointerDown={props.onPointerDown}
    >
      <rect
        aria-hidden="true"
        data-testid={`drafting-line-${props.object.id}-geometry`}
        fill="#2563eb"
        height={hitHeight}
        opacity={0.001}
        onPointerDown={(event) => {
          event.stopPropagation();
          props.onPointerDown(event);
        }}
        pointerEvents="all"
        width={hitWidth}
        x={hitX}
        y={hitY}
      />
      <line
        stroke={props.isSelected ? DRAFTING_SELECTION_STYLE.stroke : style.stroke}
        strokeWidth={style.strokeWidth}
        vectorEffect={vectorEffect}
        x1={startPoint.x}
        x2={endPoint.x}
        y1={startPoint.y}
        y2={endPoint.y}
      />
      <PrimitiveCanvasLabel anchor={anchor} props={props} stroke={style.stroke} />
    </g>
  );
}

export function DraftPolylineRenderer(props: DraftingRendererProps<DraftingPolylineObject>) {
  const style = usePrimitiveStyle(props);
  const vectorEffect = resolveRendererVectorEffect(props.surface);
  const anchor = midpoint(props.object.geometry.points);
  return (
    <g
      data-drafting-object="true"
      data-drafting-object-id={props.object.id}
      data-testid={`drafting-object-${props.object.id}`}
      onPointerDown={props.onPointerDown}
    >
      <polyline
        fill="none"
        points={pointsAttribute(props.object.geometry.points)}
        stroke={props.isSelected ? DRAFTING_SELECTION_STYLE.stroke : style.stroke}
        strokeLinejoin="round"
        strokeWidth={style.strokeWidth}
        vectorEffect={vectorEffect}
      />
      <PrimitiveCanvasLabel anchor={anchor} props={props} stroke={style.stroke} />
    </g>
  );
}

export function DraftRectangleRenderer(props: DraftingRendererProps<DraftingRectangleObject>) {
  const style = usePrimitiveStyle(props);
  const vectorEffect = resolveRendererVectorEffect(props.surface);
  const { cornerA, cornerB } = props.object.geometry;
  const x = Math.min(cornerA.x, cornerB.x);
  const y = Math.min(cornerA.y, cornerB.y);
  const width = Math.abs(cornerB.x - cornerA.x);
  const height = Math.abs(cornerB.y - cornerA.y);
  const anchor = midpoint([cornerA, cornerB]);

  return (
    <g
      data-drafting-object="true"
      data-drafting-object-id={props.object.id}
      data-testid={`drafting-object-${props.object.id}`}
      onPointerDown={props.onPointerDown}
    >
      <rect
        fill="none"
        height={height}
        stroke={props.isSelected ? DRAFTING_SELECTION_STYLE.stroke : style.stroke}
        strokeWidth={style.strokeWidth}
        vectorEffect={vectorEffect}
        width={width}
        x={x}
        y={y}
      />
      <PrimitiveCanvasLabel anchor={anchor} props={props} stroke={style.stroke} />
    </g>
  );
}

export function DraftCircleRenderer(props: DraftingRendererProps<DraftingCircleObject>) {
  const style = usePrimitiveStyle(props);
  const vectorEffect = resolveRendererVectorEffect(props.surface);
  return (
    <g
      data-drafting-object="true"
      data-drafting-object-id={props.object.id}
      data-testid={`drafting-object-${props.object.id}`}
      onPointerDown={props.onPointerDown}
    >
      <circle
        cx={props.object.geometry.centre.x}
        cy={props.object.geometry.centre.y}
        fill="none"
        r={props.object.geometry.radiusMm}
        stroke={props.isSelected ? DRAFTING_SELECTION_STYLE.stroke : style.stroke}
        strokeWidth={style.strokeWidth}
        vectorEffect={vectorEffect}
      />
      <line
        stroke={style.stroke}
        strokeDasharray="120 90"
        strokeWidth={Math.max(0.75, style.strokeWidth * 0.75)}
        vectorEffect={vectorEffect}
        x1={props.object.geometry.centre.x - props.object.geometry.radiusMm}
        x2={props.object.geometry.centre.x + props.object.geometry.radiusMm}
        y1={props.object.geometry.centre.y}
        y2={props.object.geometry.centre.y}
      />
      <PrimitiveCanvasLabel
        anchor={props.object.geometry.centre}
        props={props}
        stroke={style.stroke}
      />
    </g>
  );
}

export function DraftPolygonRenderer(props: DraftingRendererProps<DraftingPolygonObject>) {
  const style = usePrimitiveStyle(props);
  const vectorEffect = resolveRendererVectorEffect(props.surface);
  const anchor = midpoint(props.object.geometry.points);
  return (
    <g
      data-drafting-object="true"
      data-drafting-object-id={props.object.id}
      data-testid={`drafting-object-${props.object.id}`}
      onPointerDown={props.onPointerDown}
    >
      <polygon
        fill={resolveTechnicalFill(props.object.style?.fill, 'none')}
        points={pointsAttribute(props.object.geometry.points)}
        stroke={props.isSelected ? DRAFTING_SELECTION_STYLE.stroke : style.stroke}
        strokeLinejoin="round"
        strokeWidth={style.strokeWidth}
        vectorEffect={vectorEffect}
      />
      <PrimitiveCanvasLabel anchor={anchor} props={props} stroke={style.stroke} />
    </g>
  );
}

export function StructuralJointRenderer(
  props: DraftingRendererProps<DraftingStructuralJointObject>,
) {
  const lineStyle = resolveRendererLineStyle({ ...props, role: 'structuralPrimary' });
  const conflictStyle = resolveRendererLineStyle({ ...props, role: 'serviceConflict' });
  const stroke = resolveTechnicalStroke(props.object.style?.stroke, lineStyle);
  const point = props.object.geometry.point;
  const textSize = resolveCanvasLabelSize(props.object.style?.textSize, 170, props.drawingSetup);
  const vectorEffect = resolveRendererVectorEffect(props.surface);
  const labelLines = buildDraftingObjectLabelLines({
    allObjects: props.allObjects,
    isSelected: props.isSelected,
    labelMode: props.labelMode,
    object: props.object,
    surface: props.surface,
    viewScale: props.viewScale,
  });
  const hasLoad =
    props.object.parameters.loadEnabled &&
    [
      props.object.parameters.fxKn,
      props.object.parameters.fyKn,
      props.object.parameters.fzKn,
      props.object.parameters.verticalLoadKn,
    ].some((value) => Number.isFinite(value));

  return (
    <g
      data-drafting-object="true"
      data-drafting-object-id={props.object.id}
      data-testid={`drafting-object-${props.object.id}`}
      onPointerDown={props.onPointerDown}
    >
      <circle
        cx={point.x}
        cy={point.y}
        fill={DRAFTING_TECHNICAL_FILLS.annotation}
        r={120}
        stroke={props.isSelected ? DRAFTING_SELECTION_STYLE.stroke : stroke}
        strokeWidth={lineStyle.editorStrokeWidth}
        vectorEffect={vectorEffect}
      />
      <line
        stroke={stroke}
        strokeWidth={lineStyle.editorStrokeWidth}
        vectorEffect={vectorEffect}
        x1={point.x - 190}
        x2={point.x + 190}
        y1={point.y}
        y2={point.y}
      />
      <line
        stroke={stroke}
        strokeWidth={lineStyle.editorStrokeWidth}
        vectorEffect={vectorEffect}
        x1={point.x}
        x2={point.x}
        y1={point.y - 190}
        y2={point.y + 190}
      />
      {hasLoad ? (
        <g>
          <line
            markerEnd={`url(#${props.object.id}-joint-load-arrow)`}
            stroke={conflictStyle.color}
            strokeWidth={lineStyle.editorStrokeWidth}
            vectorEffect={vectorEffect}
            x1={point.x}
            x2={point.x}
            y1={point.y - 1200}
            y2={point.y - 260}
          />
          <defs>
            <marker
              id={`${props.object.id}-joint-load-arrow`}
              markerHeight="8"
              markerWidth="8"
              orient="auto"
              refX="7"
              refY="4"
              viewBox="0 0 8 8"
            >
              <path d="M0,0 L8,4 L0,8 z" fill={conflictStyle.color} />
            </marker>
          </defs>
        </g>
      ) : null}
      <DraftingCanvasLabel
        anchorPoint={point}
        leaderStroke={stroke}
        lines={labelLines}
        placement={props.labelPlacement}
        stroke={stroke}
        surface={props.surface}
        textSize={textSize}
        x={point.x + 220}
        y={point.y - 140}
      />
    </g>
  );
}

export function GeotechSurfaceRenderer(props: DraftingRendererProps<DraftingGeotechSurfaceObject>) {
  const lineStyle = resolveRendererLineStyle({ ...props, role: 'constructionSetout' });
  const stroke = resolveTechnicalStroke(props.object.style?.stroke, lineStyle);
  const textSize = resolveCanvasLabelSize(props.object.style?.textSize, 150, props.drawingSetup);
  const vectorEffect = resolveRendererVectorEffect(props.surface);
  const labelLines = buildDraftingObjectLabelLines({
    allObjects: props.allObjects,
    isSelected: props.isSelected,
    labelMode: props.labelMode,
    object: props.object,
    surface: props.surface,
    viewScale: props.viewScale,
  });

  return (
    <g
      data-drafting-object="true"
      data-drafting-object-id={props.object.id}
      data-testid={`drafting-object-${props.object.id}`}
      onPointerDown={props.onPointerDown}
    >
      {props.object.geometry.breaklines?.map((line, index) => (
        <polyline
          fill="none"
          key={`${props.object.id}-breakline-${index}`}
          points={pointsAttribute(line)}
          stroke={stroke}
          strokeDasharray="240 160"
          strokeWidth={lineStyle.editorStrokeWidth}
          vectorEffect={vectorEffect}
        />
      ))}
      {props.object.geometry.boundary ? (
        <polygon
          fill="none"
          points={pointsAttribute(props.object.geometry.boundary)}
          stroke={stroke}
          strokeDasharray="300 180"
          strokeWidth={lineStyle.editorStrokeWidth}
          vectorEffect={vectorEffect}
        />
      ) : null}
      {props.object.geometry.points.map((point, index) => (
        <g key={`${props.object.id}-surface-point-${index}`}>
          <circle
            cx={point.x}
            cy={point.y}
            fill={DRAFTING_TECHNICAL_FILLS.annotation}
            r={90}
            stroke={props.isSelected ? DRAFTING_SELECTION_STYLE.stroke : stroke}
            strokeWidth={lineStyle.editorStrokeWidth}
            vectorEffect={vectorEffect}
          />
          {props.object.parameters.showPointLabels !== false ? (
            <text
              fill={stroke}
              fontSize={textSize}
              paintOrder="stroke"
              stroke={DRAFTING_TECHNICAL_FILLS.annotation}
              strokeWidth={28}
              x={point.x + 130}
              y={point.y - 80}
            >
              RL {point.z.toFixed(2)}
            </text>
          ) : null}
        </g>
      ))}
      <DraftingCanvasLabel
        anchorPoint={props.object.geometry.points[0] ?? undefined}
        leaderStroke={stroke}
        lines={labelLines}
        placement={props.labelPlacement}
        stroke={stroke}
        surface={props.surface}
        textSize={textSize}
        x={props.object.geometry.points[0]?.x ?? 0}
        y={(props.object.geometry.points[0]?.y ?? 0) - 180}
      />
    </g>
  );
}

function usePrimitiveStyle(props: DraftingRendererProps) {
  const lineStyle = resolveRendererLineStyle({ ...props, role: 'objectVisible' });
  return {
    stroke: resolveTechnicalStroke(props.object.style?.stroke, lineStyle),
    strokeWidth: lineStyle.editorStrokeWidth,
  };
}

function PrimitiveCanvasLabel({
  anchor,
  props,
  stroke,
}: {
  anchor: DraftingPoint;
  props: DraftingRendererProps;
  stroke: string;
}) {
  const textSize = resolveCanvasLabelSize(props.object.style?.textSize, 150, props.drawingSetup);
  const labelLines = buildDraftingObjectLabelLines({
    allObjects: props.allObjects,
    isSelected: props.isSelected,
    labelMode: props.labelMode,
    object: props.object,
    surface: props.surface,
    viewScale: props.viewScale,
  });

  return (
    <DraftingCanvasLabel
      anchorPoint={anchor}
      leaderStroke={stroke}
      lines={labelLines}
      placement={props.labelPlacement}
      stroke={stroke}
      surface={props.surface}
      textSize={textSize}
      x={anchor.x + 180}
      y={anchor.y - 180}
    />
  );
}

function midpoint(points: DraftingPoint[]) {
  if (points.length === 0) {
    return { x: 0, y: 0 };
  }
  return {
    x: points.reduce((total, point) => total + point.x, 0) / points.length,
    y: points.reduce((total, point) => total + point.y, 0) / points.length,
  };
}

function pointsAttribute(points: DraftingPoint[]) {
  return points.map((point) => `${point.x},${point.y}`).join(' ');
}
