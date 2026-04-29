import * as React from 'react';
import type { DraftingPoint, DraftingUnderlay } from '@eng/shared';
import { usePdfPageRender, type PdfUnderlayPageMetrics } from '../hooks/use-pdf-underlay-render';
import { getDraftingUnderlayLocalRect } from '../model-utils';

type DraftingPdfUnderlayProps = {
  underlay: DraftingUnderlay;
  isSelected: boolean;
  interactionEnabled: boolean;
  cropPreview?: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  calibrationPoints?: {
    pointA?: DraftingPoint | null;
    pointB?: DraftingPoint | null;
  } | null;
  onPointerDown?: (event: React.PointerEvent<SVGElement>, metrics: PdfUnderlayPageMetrics) => void;
};

export function DraftingPdfUnderlay({
  underlay,
  isSelected,
  interactionEnabled,
  cropPreview,
  calibrationPoints,
  onPointerDown,
}: DraftingPdfUnderlayProps) {
  const render = usePdfPageRender(underlay.fileId, underlay.pageNumber);
  const clipPathId = React.useMemo(() => `drafting-underlay-clip-${underlay.id}`, [underlay.id]);
  const pageRender = render.data;

  if (!pageRender) {
    return null;
  }

  const localRect = getDraftingUnderlayLocalRect(
    pageRender.width,
    pageRender.height,
    underlay.crop,
  );
  const matrix = buildSvgMatrix(underlay);

  return (
    <>
      <defs>
        <clipPath id={clipPathId}>
          <rect x={localRect.x} y={localRect.y} width={localRect.width} height={localRect.height} />
        </clipPath>
      </defs>

      <g transform={matrix}>
        <image
          href={pageRender.imageUrl}
          x={0}
          y={0}
          width={pageRender.width}
          height={pageRender.height}
          opacity={underlay.opacity}
          preserveAspectRatio="none"
          clipPath={`url(#${clipPathId})`}
          pointerEvents="none"
        />

        <rect
          x={localRect.x}
          y={localRect.y}
          width={localRect.width}
          height={localRect.height}
          fill="transparent"
          clipPath={`url(#${clipPathId})`}
          data-drafting-underlay="true"
          onPointerDown={
            interactionEnabled && onPointerDown
              ? (event) => onPointerDown(event, pageRender)
              : undefined
          }
          pointerEvents={interactionEnabled ? 'all' : 'none'}
        />

        {isSelected ? (
          <rect
            x={localRect.x}
            y={localRect.y}
            width={localRect.width}
            height={localRect.height}
            fill="none"
            stroke="#0f766e"
            strokeDasharray="240 120"
            strokeWidth={24}
            vectorEffect="non-scaling-stroke"
            pointerEvents="none"
          />
        ) : null}

        {cropPreview ? (
          <rect
            x={cropPreview.x}
            y={cropPreview.y}
            width={cropPreview.width}
            height={cropPreview.height}
            fill="rgba(15, 118, 110, 0.08)"
            stroke="#0f766e"
            strokeDasharray="180 120"
            strokeWidth={20}
            vectorEffect="non-scaling-stroke"
            pointerEvents="none"
          />
        ) : null}

        {calibrationPoints?.pointA ? (
          <CalibrationMarker point={calibrationPoints.pointA} stroke="#0f766e" />
        ) : null}
        {calibrationPoints?.pointB ? (
          <CalibrationMarker point={calibrationPoints.pointB} stroke="#b91c1c" />
        ) : null}
      </g>
    </>
  );
}

function CalibrationMarker({ point, stroke }: { point: DraftingPoint; stroke: string }) {
  return (
    <g pointerEvents="none">
      <circle cx={point.x} cy={point.y} r={120} fill="white" stroke={stroke} strokeWidth={24} />
      <line
        x1={point.x - 180}
        x2={point.x + 180}
        y1={point.y}
        y2={point.y}
        stroke={stroke}
        strokeWidth={24}
      />
      <line
        x1={point.x}
        x2={point.x}
        y1={point.y - 180}
        y2={point.y + 180}
        stroke={stroke}
        strokeWidth={24}
      />
    </g>
  );
}

function buildSvgMatrix(underlay: DraftingUnderlay) {
  const angle = (underlay.transform.rotationDeg * Math.PI) / 180;
  const cos = Math.cos(angle) * underlay.transform.scale;
  const sin = Math.sin(angle) * underlay.transform.scale;

  return `matrix(${cos} ${sin} ${-sin} ${cos} ${underlay.transform.x} ${underlay.transform.y})`;
}
