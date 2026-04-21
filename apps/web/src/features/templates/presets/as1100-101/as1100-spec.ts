import {
  getTemplatePageLayout,
  type TemplatePageOrientation,
  type TemplatePaperSize,
} from '../../core/template-page';

export type As1100FrameSpec = {
  bandBottomMm: number;
  bandLeftMm: number;
  bandRightMm: number;
  bandTopMm: number;
  frameHeightMm: number;
  frameWidthMm: number;
  frameXMm: number;
  frameYMm: number;
};

export type As1100GridSpec = {
  columnCount: number;
  rowCount: number;
};

export type As1100FormatLineThicknessSpec = {
  borderLineMm: number;
  cameraAlignmentMarkLineMm: number;
};

export type As1100LetteringSpec = {
  bodyHeightMm: number;
  headingHeightMm: number;
  titleAndDrawingNumberHeightMm: number;
};

export type As1100TitleBlockSpec = {
  additionalBlockHeightMm: number;
  authorityBandHeightMm: number;
  authorityCodeStripWidthMm: number;
  drawingNumberCellWidthMm: number;
  footerBandHeightMm: number;
  heightMm: number;
  identBandHeightMm: number;
  recordPanelWidthMm: number;
  sheetSizeCellWidthMm: number;
  titleBandHeightMm: number;
  totalHeightMm: number;
  totalWidthMm: number;
  widthMm: number;
};

type As1100Margins = {
  bottom: number;
  left: number;
  right: number;
  top: number;
};

type As1100GridCounts = {
  longEdge: number;
  shortEdge: number;
};

type As1100TitleBlockBase = {
  additionalBlockHeightMm: number;
  authorityBandHeightMm: number;
  authorityCodeStripWidthMm: number;
  drawingNumberCellWidthMm: number;
  footerBandHeightMm: number;
  heightMm: number;
  identBandHeightMm: number;
  recordPanelWidthMm: number;
  sheetSizeCellWidthMm: number;
  titleBandHeightMm: number;
  totalHeightMm: number;
  totalWidthMm: number;
  widthMm: number;
};

// Source: Screenshot 2026-04-16 at 11.01.29 pm.png (Table 2.1)
// and Screenshot 2026-04-16 at 11.03.42 pm.png (Preferred series sheets boundary line offsets)
const AS1100_DRAWING_FRAME_MARGINS_MM: Record<TemplatePaperSize, As1100Margins> = {
  a0: { left: 20, right: 20, top: 20, bottom: 20 },
  a1: { left: 20, right: 20, top: 20, bottom: 20 },
  a2: { left: 10, right: 10, top: 10, bottom: 10 },
  a3: { left: 10, right: 10, top: 10, bottom: 10 },
  a4: { left: 10, right: 10, top: 10, bottom: 10 },
};

// Source: Screenshot 2026-04-16 at 11.06.56 pm.png (Table 2.6, Border lines row)
const AS1100_FORMAT_LINE_THICKNESS_MM: Record<TemplatePaperSize, As1100FormatLineThicknessSpec> =
  {
    a0: { borderLineMm: 1.4, cameraAlignmentMarkLineMm: 0.5 },
    a1: { borderLineMm: 1.0, cameraAlignmentMarkLineMm: 0.35 },
    a2: { borderLineMm: 0.7, cameraAlignmentMarkLineMm: 0.25 },
    a3: { borderLineMm: 0.7, cameraAlignmentMarkLineMm: 0.25 },
    a4: { borderLineMm: 0.7, cameraAlignmentMarkLineMm: 0.25 },
  };

// Source: Screenshot 2026-04-16 at 11.33.21 pm.png (Table 4.1)
const AS1100_LETTERING_HEIGHTS_MM: Record<TemplatePaperSize, As1100LetteringSpec> = {
  a0: {
    bodyHeightMm: 3.5,
    headingHeightMm: 5,
    titleAndDrawingNumberHeightMm: 7,
  },
  a1: {
    bodyHeightMm: 2.5,
    headingHeightMm: 3.5,
    titleAndDrawingNumberHeightMm: 5,
  },
  a2: {
    bodyHeightMm: 2.5,
    headingHeightMm: 3.5,
    titleAndDrawingNumberHeightMm: 5,
  },
  a3: {
    bodyHeightMm: 2.5,
    headingHeightMm: 3.5,
    titleAndDrawingNumberHeightMm: 5,
  },
  a4: {
    bodyHeightMm: 2.5,
    headingHeightMm: 3.5,
    titleAndDrawingNumberHeightMm: 5,
  },
};

// Source: Screenshot 2026-04-16 at 1.08.49 pm.png (Figure 2.5)
const AS1100_GRID_COUNTS: Record<TemplatePaperSize, As1100GridCounts> = {
  a0: { longEdge: 16, shortEdge: 12 },
  a1: { longEdge: 12, shortEdge: 8 },
  a2: { longEdge: 8, shortEdge: 6 },
  a3: { longEdge: 6, shortEdge: 4 },
  a4: { longEdge: 4, shortEdge: 4 },
};

// Source: Screenshot 2026-04-16 at 1.08.13 pm.png (Figure 2.9)
const AS1100_TITLE_BLOCK_BASE: Record<TemplatePaperSize, As1100TitleBlockBase> = {
  a0: {
    additionalBlockHeightMm: 0,
    authorityBandHeightMm: 20,
    authorityCodeStripWidthMm: 16,
    drawingNumberCellWidthMm: 120,
    footerBandHeightMm: 9,
    heightMm: 80,
    identBandHeightMm: 21,
    recordPanelWidthMm: 110,
    sheetSizeCellWidthMm: 30,
    titleBandHeightMm: 30,
    totalHeightMm: 80,
    totalWidthMm: 310,
    widthMm: 200,
  },
  a1: {
    additionalBlockHeightMm: 20,
    authorityBandHeightMm: 15,
    authorityCodeStripWidthMm: 14,
    drawingNumberCellWidthMm: 120,
    footerBandHeightMm: 6,
    heightMm: 55,
    identBandHeightMm: 14,
    recordPanelWidthMm: 110,
    sheetSizeCellWidthMm: 20,
    titleBandHeightMm: 20,
    totalHeightMm: 75,
    totalWidthMm: 310,
    widthMm: 200,
  },
  a2: {
    additionalBlockHeightMm: 20,
    authorityBandHeightMm: 15,
    authorityCodeStripWidthMm: 14,
    drawingNumberCellWidthMm: 120,
    footerBandHeightMm: 6,
    heightMm: 55,
    identBandHeightMm: 14,
    recordPanelWidthMm: 110,
    sheetSizeCellWidthMm: 20,
    titleBandHeightMm: 20,
    totalHeightMm: 75,
    totalWidthMm: 310,
    widthMm: 200,
  },
  a3: {
    additionalBlockHeightMm: 20,
    authorityBandHeightMm: 15,
    authorityCodeStripWidthMm: 14,
    drawingNumberCellWidthMm: 120,
    footerBandHeightMm: 6,
    heightMm: 55,
    identBandHeightMm: 14,
    recordPanelWidthMm: 110,
    sheetSizeCellWidthMm: 20,
    titleBandHeightMm: 20,
    totalHeightMm: 75,
    totalWidthMm: 310,
    widthMm: 200,
  },
  a4: {
    additionalBlockHeightMm: 20,
    authorityBandHeightMm: 15,
    authorityCodeStripWidthMm: 35,
    drawingNumberCellWidthMm: 85,
    footerBandHeightMm: 6,
    heightMm: 55,
    identBandHeightMm: 14,
    recordPanelWidthMm: 70,
    sheetSizeCellWidthMm: 20,
    titleBandHeightMm: 20,
    totalHeightMm: 75,
    totalWidthMm: 210,
    widthMm: 140,
  },
};

export function getAs1100FrameSpec(
  paperSize: TemplatePaperSize,
  orientation: TemplatePageOrientation,
): As1100FrameSpec {
  const pageLayout = getTemplatePageLayout(paperSize, orientation);
  const margins = AS1100_DRAWING_FRAME_MARGINS_MM[paperSize];

  return {
    bandBottomMm: margins.bottom,
    bandLeftMm: margins.left,
    bandRightMm: margins.right,
    bandTopMm: margins.top,
    frameHeightMm: Math.max(0, pageLayout.heightMm - margins.top - margins.bottom),
    frameWidthMm: Math.max(0, pageLayout.widthMm - margins.left - margins.right),
    frameXMm: margins.left,
    frameYMm: margins.top,
  };
}

export function getAs1100GridSpec(
  paperSize: TemplatePaperSize,
  orientation: TemplatePageOrientation,
): As1100GridSpec {
  const counts = AS1100_GRID_COUNTS[paperSize];
  const isLandscape = orientation === 'landscape';

  return {
    columnCount: isLandscape ? counts.longEdge : counts.shortEdge,
    rowCount: isLandscape ? counts.shortEdge : counts.longEdge,
  };
}

export function getAs1100TitleBlockSpec(
  paperSize: TemplatePaperSize,
  _orientation: TemplatePageOrientation,
): As1100TitleBlockSpec {
  const base = AS1100_TITLE_BLOCK_BASE[paperSize];

  return {
    additionalBlockHeightMm: base.additionalBlockHeightMm,
    authorityBandHeightMm: base.authorityBandHeightMm,
    authorityCodeStripWidthMm: base.authorityCodeStripWidthMm,
    drawingNumberCellWidthMm: base.drawingNumberCellWidthMm,
    footerBandHeightMm: base.footerBandHeightMm,
    heightMm: base.heightMm,
    identBandHeightMm: base.identBandHeightMm,
    recordPanelWidthMm: base.recordPanelWidthMm,
    sheetSizeCellWidthMm: base.sheetSizeCellWidthMm,
    titleBandHeightMm: base.titleBandHeightMm,
    totalHeightMm: base.totalHeightMm,
    totalWidthMm: base.totalWidthMm,
    widthMm: base.widthMm,
  };
}

export function getAs1100FormatLineThicknessSpec(
  paperSize: TemplatePaperSize,
): As1100FormatLineThicknessSpec {
  return AS1100_FORMAT_LINE_THICKNESS_MM[paperSize];
}

export function getAs1100LetteringSpec(paperSize: TemplatePaperSize): As1100LetteringSpec {
  return AS1100_LETTERING_HEIGHTS_MM[paperSize];
}

export function getAs1100GridLabels(count: number, axis: 'alpha' | 'numeric') {
  return Array.from({ length: count }, (_, index) =>
    axis === 'numeric' ? String(index + 1) : String.fromCharCode(65 + index),
  );
}
