import * as React from 'react';
import {
  DRAFTING_SELECTION_STYLE,
  DRAFTING_TECHNICAL_FILLS,
  resolveRendererLineStyle,
  resolveTechnicalFill,
  resolveTechnicalStroke,
  type DraftingServiceCrossingRendererProps,
} from './renderer-types';

export function ServiceCrossingRenderer({
  drawingSetup,
  isSelected,
  layer,
  object,
  onPointerDown,
  surface,
}: DraftingServiceCrossingRendererProps) {
  const conflictStyle = resolveRendererLineStyle({
    drawingSetup,
    layer,
    object,
    role: 'serviceConflict',
    surface,
  });
  const existingStyle = resolveRendererLineStyle({
    drawingSetup,
    layer,
    object,
    role: 'serviceExisting',
    surface,
  });
  const statusStroke =
    object.parameters.riskStatus === 'resolved'
      ? existingStyle.color
      : object.parameters.riskStatus === 'reviewed'
        ? '#854d0e'
        : conflictStyle.color;
  const stroke = resolveTechnicalStroke(
    object.style?.stroke,
    { ...conflictStyle, color: statusStroke },
    ['#b91c1c'],
  );
  const fill = resolveTechnicalFill(
    object.style?.fill,
    object.parameters.riskStatus === 'open'
      ? DRAFTING_TECHNICAL_FILLS.serviceConflict
      : DRAFTING_TECHNICAL_FILLS.none,
  );
  const textSize = object.style?.textSize ?? 220;
  const { crossingPoint } = object.geometry;

  return (
    <g data-drafting-object="true" onPointerDown={onPointerDown}>
      {isSelected ? (
        <circle
          cx={crossingPoint.x}
          cy={crossingPoint.y}
          fill={DRAFTING_SELECTION_STYLE.fill}
          r={360}
          stroke={DRAFTING_SELECTION_STYLE.stroke}
          strokeDasharray={DRAFTING_SELECTION_STYLE.strokeDasharray}
          strokeWidth={DRAFTING_SELECTION_STYLE.strokeWidth}
          vectorEffect="non-scaling-stroke"
        />
      ) : null}
      <polygon
        fill={fill}
        points={[
          `${crossingPoint.x},${crossingPoint.y - 220}`,
          `${crossingPoint.x + 220},${crossingPoint.y}`,
          `${crossingPoint.x},${crossingPoint.y + 220}`,
          `${crossingPoint.x - 220},${crossingPoint.y}`,
        ].join(' ')}
        stroke={stroke}
        strokeWidth={conflictStyle.editorStrokeWidth}
        vectorEffect="non-scaling-stroke"
      />
      <line
        stroke={stroke}
        strokeWidth={Math.max(0.75, conflictStyle.editorStrokeWidth * 0.75)}
        vectorEffect="non-scaling-stroke"
        x1={crossingPoint.x - 110}
        x2={crossingPoint.x + 110}
        y1={crossingPoint.y - 110}
        y2={crossingPoint.y + 110}
      />
      <line
        stroke={stroke}
        strokeWidth={Math.max(0.75, conflictStyle.editorStrokeWidth * 0.75)}
        vectorEffect="non-scaling-stroke"
        x1={crossingPoint.x - 110}
        x2={crossingPoint.x + 110}
        y1={crossingPoint.y + 110}
        y2={crossingPoint.y - 110}
      />
      <text fill={stroke} fontSize={textSize} x={crossingPoint.x + 280} y={crossingPoint.y - 80}>
        {object.parameters.crossingId}
      </text>
      <text
        fill={stroke}
        fontSize={textSize * 0.9}
        x={crossingPoint.x + 280}
        y={crossingPoint.y + 180}
      >
        {[
          object.parameters.serviceType,
          object.parameters.conflictType,
          object.parameters.riskStatus,
        ]
          .filter(Boolean)
          .join(' · ')}
      </text>
    </g>
  );
}
