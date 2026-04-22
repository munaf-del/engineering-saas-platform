import * as React from 'react';
import type { DraftingPoint } from '@eng/shared';
import { type DraftingSectionMarkerRendererProps } from './renderer-types';

export function SectionMarkerRenderer({
  isSelected,
  layer,
  object,
  onPointerDown,
}: DraftingSectionMarkerRendererProps) {
  const stroke = object.style?.stroke ?? layer?.color ?? '#1e293b';
  const fill = object.style?.fill ?? '#ffffff';
  const lineWeight = object.style?.lineWeight ?? layer?.lineWeight ?? 1;
  const textSize = object.style?.textSize ?? 220;
  const midpoint = {
    x: (object.geometry.startPoint.x + object.geometry.endPoint.x) / 2,
    y: (object.geometry.startPoint.y + object.geometry.endPoint.y) / 2,
  };

  return (
    <g data-drafting-object="true" onPointerDown={onPointerDown}>
      <line
        stroke={isSelected ? '#2563eb' : stroke}
        strokeDasharray="260 180"
        strokeWidth={lineWeight * 28}
        vectorEffect="non-scaling-stroke"
        x1={object.geometry.startPoint.x}
        x2={object.geometry.endPoint.x}
        y1={object.geometry.startPoint.y}
        y2={object.geometry.endPoint.y}
      />

      {object.parameters.arrowDirection === 'left' || object.parameters.arrowDirection === 'both'
        ? renderSectionArrow(object.geometry.endPoint, object.geometry.startPoint, stroke, lineWeight)
        : null}
      {object.parameters.arrowDirection === 'right' || object.parameters.arrowDirection === 'both'
        ? renderSectionArrow(object.geometry.startPoint, object.geometry.endPoint, stroke, lineWeight)
        : null}

      {[object.geometry.startPoint, object.geometry.endPoint].map((point, index) => (
        <g key={`${object.id}-bubble-${index}`}>
          <circle
            cx={point.x}
            cy={point.y}
            fill={fill}
            r={250}
            stroke={stroke}
            strokeWidth={lineWeight * 20}
            vectorEffect="non-scaling-stroke"
          />
          <text
            dominantBaseline="middle"
            fill={stroke}
            fontSize={textSize * 0.8}
            textAnchor="middle"
            x={point.x}
            y={point.y + 10}
          >
            {object.parameters.sectionLabel}
          </text>
        </g>
      ))}

      <text fill={stroke} fontSize={textSize} textAnchor="middle" x={midpoint.x} y={midpoint.y - 260}>
        {object.parameters.sectionId}
      </text>
      {object.parameters.sheetReference ? (
        <text
          fill={stroke}
          fontSize={textSize * 0.9}
          textAnchor="middle"
          x={midpoint.x}
          y={midpoint.y + 300}
        >
          {object.parameters.sheetReference}
        </text>
      ) : null}
    </g>
  );
}

function renderSectionArrow(
  fromPoint: DraftingPoint,
  toPoint: DraftingPoint,
  stroke: string,
  lineWeight: number,
) {
  const deltaX = toPoint.x - fromPoint.x;
  const deltaY = toPoint.y - fromPoint.y;
  const magnitude = Math.hypot(deltaX, deltaY) || 1;
  const unitX = deltaX / magnitude;
  const unitY = deltaY / magnitude;
  const arrowTip = {
    x: toPoint.x + unitX * 320,
    y: toPoint.y + unitY * 320,
  };
  const basePoint = {
    x: arrowTip.x - unitX * 240,
    y: arrowTip.y - unitY * 240,
  };
  const normal = {
    x: -unitY,
    y: unitX,
  };

  return (
    <polygon
      fill={stroke}
      points={[
        `${basePoint.x + normal.x * 140},${basePoint.y + normal.y * 140}`,
        `${arrowTip.x},${arrowTip.y}`,
        `${basePoint.x - normal.x * 140},${basePoint.y - normal.y * 140}`,
      ].join(' ')}
      stroke={stroke}
      strokeWidth={lineWeight * 18}
      vectorEffect="non-scaling-stroke"
    />
  );
}
