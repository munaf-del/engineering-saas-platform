import * as React from 'react';
import type { DraftingPoint, DraftingUnderlay } from '@eng/shared';
import {
  getPdfUnderlayRenderErrorMessage,
  getPdfUnderlayRenderLoadingMessage,
  usePdfPageRender,
  type PdfUnderlayPageMetrics,
  type PdfUnderlayRenderErrorKind,
} from '../hooks/use-pdf-underlay-render';
import { getDraftingUnderlayLocalRect } from '../model-utils';

const FALLBACK_PLACEHOLDER_WIDTH = 1600;
const FALLBACK_PLACEHOLDER_HEIGHT = 720;

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
    if (render.isLoading) {
      return (
        <PdfUnderlayRenderFallback
          isLoading
          errorKind={null}
          isSelected={isSelected}
          underlay={underlay}
        />
      );
    }

    if (render.error) {
      return (
        <PdfUnderlayRenderFallback
          errorKind={render.errorKind}
          isSelected={isSelected}
          underlay={underlay}
        />
      );
    }

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

function PdfUnderlayRenderFallback({
  underlay,
  isSelected,
  errorKind,
  isLoading = false,
}: {
  underlay: DraftingUnderlay;
  isSelected: boolean;
  errorKind: PdfUnderlayRenderErrorKind | null;
  isLoading?: boolean;
}) {
  const matrix = buildSvgMatrix(underlay);
  const title = isLoading ? 'Loading PDF underlay' : 'PDF underlay unavailable';
  const message = isLoading
    ? getPdfUnderlayRenderLoadingMessage('page_render_loading', {
        pageNumber: underlay.pageNumber,
      })
    : getPdfUnderlayRenderErrorMessage(errorKind, {
        fallback: 'The selected PDF page could not be rendered.',
        pageNumber: underlay.pageNumber,
      });

  return (
    <g data-testid="drafting-pdf-underlay-render-fallback" pointerEvents="none" transform={matrix}>
      <rect
        fill="#f8fafc"
        height={FALLBACK_PLACEHOLDER_HEIGHT}
        opacity={0.9}
        stroke="#94a3b8"
        strokeDasharray="120 80"
        strokeWidth={24}
        vectorEffect="non-scaling-stroke"
        width={FALLBACK_PLACEHOLDER_WIDTH}
        x={0}
        y={0}
      />
      <text
        fill="#475569"
        fontSize={120}
        fontWeight={600}
        paintOrder="stroke"
        stroke="#f8fafc"
        strokeWidth={18}
        x={120}
        y={280}
      >
        {title}
      </text>
      <text fill="#64748b" fontSize={88} x={120} y={420}>
        {underlay.fileName} · page {underlay.pageNumber}
      </text>
      <text fill="#64748b" fontSize={72} x={120} y={540}>
        {message}
      </text>

      {isSelected ? (
        <rect
          fill="none"
          height={FALLBACK_PLACEHOLDER_HEIGHT}
          stroke="#0f766e"
          strokeDasharray="240 120"
          strokeWidth={24}
          vectorEffect="non-scaling-stroke"
          width={FALLBACK_PLACEHOLDER_WIDTH}
          x={0}
          y={0}
        />
      ) : null}
    </g>
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
