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
  resolveRendererLineStyle,
  resolveTechnicalFill,
  resolveTechnicalStroke,
  type DraftingRendererProps,
} from './renderer-types';

export function DraftLineRenderer(props: DraftingRendererProps<DraftingLineObject>) {
  const style = usePrimitiveStyle(props);
  return (
    <g data-drafting-object="true" onPointerDown={props.onPointerDown}>
      <line
        stroke={props.isSelected ? DRAFTING_SELECTION_STYLE.stroke : style.stroke}
        strokeWidth={style.strokeWidth}
        vectorEffect="non-scaling-stroke"
        x1={props.object.geometry.startPoint.x}
        x2={props.object.geometry.endPoint.x}
        y1={props.object.geometry.startPoint.y}
        y2={props.object.geometry.endPoint.y}
      />
    </g>
  );
}

export function DraftPolylineRenderer(props: DraftingRendererProps<DraftingPolylineObject>) {
  const style = usePrimitiveStyle(props);
  return (
    <g data-drafting-object="true" onPointerDown={props.onPointerDown}>
      <polyline
        fill="none"
        points={pointsAttribute(props.object.geometry.points)}
        stroke={props.isSelected ? DRAFTING_SELECTION_STYLE.stroke : style.stroke}
        strokeLinejoin="round"
        strokeWidth={style.strokeWidth}
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

export function DraftRectangleRenderer(props: DraftingRendererProps<DraftingRectangleObject>) {
  const style = usePrimitiveStyle(props);
  const { cornerA, cornerB } = props.object.geometry;
  const x = Math.min(cornerA.x, cornerB.x);
  const y = Math.min(cornerA.y, cornerB.y);
  const width = Math.abs(cornerB.x - cornerA.x);
  const height = Math.abs(cornerB.y - cornerA.y);

  return (
    <g data-drafting-object="true" onPointerDown={props.onPointerDown}>
      <rect
        fill="none"
        height={height}
        stroke={props.isSelected ? DRAFTING_SELECTION_STYLE.stroke : style.stroke}
        strokeWidth={style.strokeWidth}
        vectorEffect="non-scaling-stroke"
        width={width}
        x={x}
        y={y}
      />
    </g>
  );
}

export function DraftCircleRenderer(props: DraftingRendererProps<DraftingCircleObject>) {
  const style = usePrimitiveStyle(props);
  return (
    <g data-drafting-object="true" onPointerDown={props.onPointerDown}>
      <circle
        cx={props.object.geometry.centre.x}
        cy={props.object.geometry.centre.y}
        fill="none"
        r={props.object.geometry.radiusMm}
        stroke={props.isSelected ? DRAFTING_SELECTION_STYLE.stroke : style.stroke}
        strokeWidth={style.strokeWidth}
        vectorEffect="non-scaling-stroke"
      />
      <line
        stroke={style.stroke}
        strokeDasharray="120 90"
        strokeWidth={Math.max(0.75, style.strokeWidth * 0.75)}
        vectorEffect="non-scaling-stroke"
        x1={props.object.geometry.centre.x - props.object.geometry.radiusMm}
        x2={props.object.geometry.centre.x + props.object.geometry.radiusMm}
        y1={props.object.geometry.centre.y}
        y2={props.object.geometry.centre.y}
      />
    </g>
  );
}

export function DraftPolygonRenderer(props: DraftingRendererProps<DraftingPolygonObject>) {
  const style = usePrimitiveStyle(props);
  return (
    <g data-drafting-object="true" onPointerDown={props.onPointerDown}>
      <polygon
        fill={resolveTechnicalFill(props.object.style?.fill, 'none')}
        points={pointsAttribute(props.object.geometry.points)}
        stroke={props.isSelected ? DRAFTING_SELECTION_STYLE.stroke : style.stroke}
        strokeLinejoin="round"
        strokeWidth={style.strokeWidth}
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

export function StructuralJointRenderer(
  props: DraftingRendererProps<DraftingStructuralJointObject>,
) {
  const lineStyle = resolveRendererLineStyle({ ...props, role: 'structuralPrimary' });
  const stroke = resolveTechnicalStroke(props.object.style?.stroke, lineStyle);
  const point = props.object.geometry.point;
  const textSize = props.object.style?.textSize ?? 220;
  const hasLoad =
    props.object.parameters.loadEnabled &&
    [
      props.object.parameters.fxKn,
      props.object.parameters.fyKn,
      props.object.parameters.fzKn,
      props.object.parameters.verticalLoadKn,
    ].some((value) => Number.isFinite(value));

  return (
    <g data-drafting-object="true" onPointerDown={props.onPointerDown}>
      <circle
        cx={point.x}
        cy={point.y}
        fill="#ffffff"
        r={160}
        stroke={props.isSelected ? DRAFTING_SELECTION_STYLE.stroke : stroke}
        strokeWidth={lineStyle.editorStrokeWidth}
        vectorEffect="non-scaling-stroke"
      />
      <line
        stroke={stroke}
        strokeWidth={lineStyle.editorStrokeWidth}
        vectorEffect="non-scaling-stroke"
        x1={point.x - 240}
        x2={point.x + 240}
        y1={point.y}
        y2={point.y}
      />
      <line
        stroke={stroke}
        strokeWidth={lineStyle.editorStrokeWidth}
        vectorEffect="non-scaling-stroke"
        x1={point.x}
        x2={point.x}
        y1={point.y - 240}
        y2={point.y + 240}
      />
      {hasLoad ? (
        <g>
          <line
            markerEnd={`url(#${props.object.id}-joint-load-arrow)`}
            stroke="#7f1d1d"
            strokeWidth={lineStyle.editorStrokeWidth}
            vectorEffect="non-scaling-stroke"
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
              <path d="M0,0 L8,4 L0,8 z" fill="#7f1d1d" />
            </marker>
          </defs>
        </g>
      ) : null}
      <text fill={stroke} fontSize={textSize} fontWeight={700} x={point.x + 260} y={point.y - 180}>
        {props.object.parameters.label}
      </text>
      {point.rl !== undefined || point.z !== undefined ? (
        <text fill="#475569" fontSize={textSize * 0.75} x={point.x + 260} y={point.y + 70}>
          RL {(point.rl ?? point.z)?.toFixed(2)}
        </text>
      ) : null}
    </g>
  );
}

export function GeotechSurfaceRenderer(props: DraftingRendererProps<DraftingGeotechSurfaceObject>) {
  const lineStyle = resolveRendererLineStyle({ ...props, role: 'constructionSetout' });
  const stroke = resolveTechnicalStroke(props.object.style?.stroke, lineStyle);
  const textSize = props.object.style?.textSize ?? 200;

  return (
    <g data-drafting-object="true" onPointerDown={props.onPointerDown}>
      {props.object.geometry.breaklines?.map((line, index) => (
        <polyline
          fill="none"
          key={`${props.object.id}-breakline-${index}`}
          points={pointsAttribute(line)}
          stroke={stroke}
          strokeDasharray="240 160"
          strokeWidth={lineStyle.editorStrokeWidth}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {props.object.geometry.boundary ? (
        <polygon
          fill="none"
          points={pointsAttribute(props.object.geometry.boundary)}
          stroke={stroke}
          strokeDasharray="300 180"
          strokeWidth={lineStyle.editorStrokeWidth}
          vectorEffect="non-scaling-stroke"
        />
      ) : null}
      {props.object.geometry.points.map((point, index) => (
        <g key={`${props.object.id}-surface-point-${index}`}>
          <circle
            cx={point.x}
            cy={point.y}
            fill="#ffffff"
            r={90}
            stroke={props.isSelected ? DRAFTING_SELECTION_STYLE.stroke : stroke}
            strokeWidth={lineStyle.editorStrokeWidth}
            vectorEffect="non-scaling-stroke"
          />
          {props.object.parameters.showPointLabels !== false ? (
            <text fill={stroke} fontSize={textSize} x={point.x + 130} y={point.y - 80}>
              RL {point.z.toFixed(2)}
            </text>
          ) : null}
        </g>
      ))}
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

function pointsAttribute(points: DraftingPoint[]) {
  return points.map((point) => `${point.x},${point.y}`).join(' ');
}
