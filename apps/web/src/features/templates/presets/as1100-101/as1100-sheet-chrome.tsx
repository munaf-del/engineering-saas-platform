'use client';

import type { CSSProperties } from 'react';
import type { GenericTemplateChromeStyle } from '../../core/generic-template-document';
import {
  getTemplatePageLayout,
  type TemplatePageOrientation,
  type TemplatePaperSize,
} from '../../core/template-page';
import {
  getAs1100FormatLineThicknessSpec,
  getAs1100FrameSpec,
  getAs1100GridLabels,
  getAs1100GridSpec,
} from './as1100-spec';

export function As1100SheetChrome({
  lineStyle,
  orientation,
  paperSize,
}: {
  lineStyle: GenericTemplateChromeStyle;
  orientation: TemplatePageOrientation;
  paperSize: TemplatePaperSize;
}) {
  const pageLayout = getTemplatePageLayout(paperSize, orientation);
  const formatLineSpec = getAs1100FormatLineThicknessSpec(paperSize);
  const frameSpec = getAs1100FrameSpec(paperSize, orientation);
  const gridSpec = getAs1100GridSpec(paperSize, orientation);
  const pxPerMmX = pageLayout.widthPx / pageLayout.widthMm;
  const pxPerMmY = pageLayout.heightPx / pageLayout.heightMm;
  const pxPerMm = Math.min(pxPerMmX, pxPerMmY);
  const topLabels = getAs1100GridLabels(gridSpec.columnCount, 'numeric');
  const sideLabels = getAs1100GridLabels(gridSpec.rowCount, 'alpha');
  const frameLeftPx = frameSpec.frameXMm * pxPerMmX;
  const frameTopPx = frameSpec.frameYMm * pxPerMmY;
  const frameWidthPx = frameSpec.frameWidthMm * pxPerMmX;
  const frameHeightPx = frameSpec.frameHeightMm * pxPerMmY;
  const bandLeftPx = frameSpec.bandLeftMm * pxPerMmX;
  const bandRightPx = frameSpec.bandRightMm * pxPerMmX;
  const bandTopPx = frameSpec.bandTopMm * pxPerMmY;
  const bandBottomPx = frameSpec.bandBottomMm * pxPerMmY;
  const leftMarkLengthPx = bandLeftPx;
  const rightMarkLengthPx = bandRightPx;
  const horizontalMarkHeightPx = Math.max(4, 6 * pxPerMmY);
  const verticalMarkWidthPx = Math.max(4, 6 * pxPerMmX);
  const topMarkLengthPx = bandTopPx;
  const bottomMarkLengthPx = bandBottomPx;
  const cameraAlignmentMarkStrokePx = Math.max(
    1,
    formatLineSpec.cameraAlignmentMarkLineMm * pxPerMm,
  );

  if (!lineStyle.visible) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0">
      <div
        className="absolute"
        style={{
          ...getLineStyle(lineStyle),
          height: `${frameHeightPx}px`,
          left: `${frameLeftPx}px`,
          top: `${frameTopPx}px`,
          width: `${frameWidthPx}px`,
        }}
      />
      <BandLabels
        labels={topLabels}
        lineStyle={lineStyle}
        orientation="horizontal"
        leftPx={frameLeftPx}
        topPx={0}
        widthPx={frameWidthPx}
        heightPx={bandTopPx}
      />
      <BandLabels
        labels={topLabels}
        lineStyle={lineStyle}
        orientation="horizontal"
        leftPx={frameLeftPx}
        topPx={frameTopPx + frameHeightPx}
        widthPx={frameWidthPx}
        heightPx={bandBottomPx}
      />
      <BandLabels
        labels={sideLabels}
        lineStyle={lineStyle}
        orientation="vertical"
        leftPx={0}
        topPx={frameTopPx}
        widthPx={bandLeftPx}
        heightPx={frameHeightPx}
      />
      <BandLabels
        labels={sideLabels}
        lineStyle={lineStyle}
        orientation="vertical"
        leftPx={frameLeftPx + frameWidthPx}
        topPx={frameTopPx}
        widthPx={bandRightPx}
        heightPx={frameHeightPx}
      />
      <AlignmentMark
        lineStyle={lineStyle}
        lineWidthPx={cameraAlignmentMarkStrokePx}
        leftPx={frameLeftPx + frameWidthPx / 2 - verticalMarkWidthPx / 2}
        topPx={0}
        widthPx={verticalMarkWidthPx}
        heightPx={topMarkLengthPx}
        direction="up"
      />
      <AlignmentMark
        lineStyle={lineStyle}
        lineWidthPx={cameraAlignmentMarkStrokePx}
        leftPx={frameLeftPx + frameWidthPx / 2 - verticalMarkWidthPx / 2}
        topPx={frameTopPx + frameHeightPx}
        widthPx={verticalMarkWidthPx}
        heightPx={bottomMarkLengthPx}
        direction="down"
      />
      <AlignmentMark
        lineStyle={lineStyle}
        lineWidthPx={cameraAlignmentMarkStrokePx}
        leftPx={0}
        topPx={frameTopPx + frameHeightPx / 2 - horizontalMarkHeightPx / 2}
        widthPx={leftMarkLengthPx}
        heightPx={horizontalMarkHeightPx}
        direction="left"
      />
      <AlignmentMark
        lineStyle={lineStyle}
        lineWidthPx={cameraAlignmentMarkStrokePx}
        leftPx={frameLeftPx + frameWidthPx}
        topPx={frameTopPx + frameHeightPx / 2 - horizontalMarkHeightPx / 2}
        widthPx={rightMarkLengthPx}
        heightPx={horizontalMarkHeightPx}
        direction="right"
      />
    </div>
  );
}

function BandLabels({
  heightPx,
  labels,
  leftPx,
  lineStyle,
  orientation,
  topPx,
  widthPx,
}: {
  heightPx: number;
  labels: string[];
  leftPx: number;
  lineStyle: GenericTemplateChromeStyle;
  orientation: 'horizontal' | 'vertical';
  topPx: number;
  widthPx: number;
}) {
  const count = Math.max(labels.length, 1);
  const dividerWidth = Math.max(0.75, lineStyle.widthPx * 0.65);

  return (
    <div
      className="absolute grid"
      style={{
        color: lineStyle.color,
        gridTemplateColumns:
          orientation === 'horizontal' ? `repeat(${count}, minmax(0, 1fr))` : undefined,
        gridTemplateRows:
          orientation === 'vertical' ? `repeat(${count}, minmax(0, 1fr))` : undefined,
        height: `${heightPx}px`,
        left: `${leftPx}px`,
        top: `${topPx}px`,
        width: `${widthPx}px`,
      }}
    >
      {labels.map((label, index) => (
        <div
          key={`${orientation}-${label}-${index}`}
          className="flex items-center justify-center font-mono text-[10px]"
          style={
            orientation === 'horizontal'
              ? index < labels.length - 1
                ? {
                    borderColor: lineStyle.color,
                    borderRightStyle: 'solid',
                    borderRightWidth: `${dividerWidth}px`,
                  }
                : undefined
              : index < labels.length - 1
                ? {
                    borderBottomStyle: 'solid',
                    borderBottomWidth: `${dividerWidth}px`,
                    borderColor: lineStyle.color,
                  }
                : undefined
          }
        >
          {label}
        </div>
      ))}
    </div>
  );
}

function AlignmentMark({
  direction,
  heightPx,
  leftPx,
  lineStyle,
  lineWidthPx,
  topPx,
  widthPx,
}: {
  direction: 'down' | 'left' | 'right' | 'up';
  heightPx: number;
  leftPx: number;
  lineStyle: GenericTemplateChromeStyle;
  lineWidthPx: number;
  topPx: number;
  widthPx: number;
}) {
  const path = getAlignmentMarkPath(direction, widthPx, heightPx, lineWidthPx);

  return (
    <div
      className="absolute"
      style={{
        height: `${heightPx}px`,
        left: `${leftPx}px`,
        top: `${topPx}px`,
        width: `${widthPx}px`,
        zIndex: 2,
      }}
    >
      <svg
        viewBox={`0 0 ${widthPx} ${heightPx}`}
        preserveAspectRatio="none"
        className="h-full w-full overflow-visible"
      >
        <path
          d={path}
          fill="#ffffff"
          stroke={lineStyle.color}
          strokeLinejoin="round"
          strokeWidth={lineWidthPx}
        />
      </svg>
    </div>
  );
}

function getAlignmentMarkPath(
  direction: 'down' | 'left' | 'right' | 'up',
  widthPx: number,
  heightPx: number,
  lineWidthPx: number,
) {
  const inset = lineWidthPx / 2;
  const maxX = Math.max(inset, widthPx - inset);
  const maxY = Math.max(inset, heightPx - inset);
  const shoulderX = Math.max(inset, widthPx * 0.68);
  const shoulderY = Math.max(inset, heightPx * 0.68);
  const innerShoulderX = Math.min(maxX, widthPx - shoulderX);
  const innerShoulderY = Math.min(maxY, heightPx - shoulderY);
  const midX = widthPx / 2;
  const midY = heightPx / 2;

  if (direction === 'down') {
    return `M ${inset} ${inset} L ${maxX} ${inset} L ${maxX} ${shoulderY} L ${midX} ${maxY} L ${inset} ${shoulderY} Z`;
  }

  if (direction === 'up') {
    return `M ${inset} ${maxY} L ${maxX} ${maxY} L ${maxX} ${innerShoulderY} L ${midX} ${inset} L ${inset} ${innerShoulderY} Z`;
  }

  if (direction === 'left') {
    return `M ${maxX} ${inset} L ${innerShoulderX} ${inset} L ${inset} ${midY} L ${innerShoulderX} ${maxY} L ${maxX} ${maxY} Z`;
  }

  return `M ${inset} ${inset} L ${shoulderX} ${inset} L ${maxX} ${midY} L ${shoulderX} ${maxY} L ${inset} ${maxY} Z`;
}

function getLineStyle(lineStyle: GenericTemplateChromeStyle): CSSProperties {
  return {
    borderColor: lineStyle.color,
    borderStyle: 'solid',
    borderWidth: `${lineStyle.widthPx}px`,
  };
}
