import { describe, expect, it } from 'vitest';
import {
  getAs1100FormatLineThicknessSpec,
  getAs1100FrameSpec,
  getAs1100GridSpec,
  getAs1100LetteringSpec,
  getAs1100TitleBlockSpec,
} from './as1100-spec';

describe('as1100 spec helpers', () => {
  it('returns figure-backed preferred-sheet boundary offsets for A3 landscape sheets', () => {
    expect(getAs1100FrameSpec('a3', 'landscape')).toEqual({
      bandBottomMm: 10,
      bandLeftMm: 10,
      bandRightMm: 10,
      bandTopMm: 10,
      frameHeightMm: 277,
      frameWidthMm: 400,
      frameXMm: 10,
      frameYMm: 10,
    });
  });

  it('returns the expected grid counts for A3 landscape sheets', () => {
    expect(getAs1100GridSpec('a3', 'landscape')).toEqual({
      columnCount: 6,
      rowCount: 4,
    });
  });

  it('keeps the A4 title-block envelope within the evidence-led figure dimensions', () => {
    expect(getAs1100TitleBlockSpec('a4', 'landscape')).toEqual({
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
    });
  });

  it('includes the 20 mm top strip for A1/A2/A3 title blocks', () => {
    expect(getAs1100TitleBlockSpec('a3', 'landscape')).toMatchObject({
      additionalBlockHeightMm: 20,
      authorityBandHeightMm: 15,
      titleBandHeightMm: 20,
      totalHeightMm: 75,
    });
  });

  it('returns the Table 2.6 border-line thickness for each preferred sheet series bucket', () => {
    expect(getAs1100FormatLineThicknessSpec('a0').borderLineMm).toBe(1.4);
    expect(getAs1100FormatLineThicknessSpec('a1').borderLineMm).toBe(1.0);
    expect(getAs1100FormatLineThicknessSpec('a2').borderLineMm).toBe(0.7);
    expect(getAs1100FormatLineThicknessSpec('a4').borderLineMm).toBe(0.7);
    expect(getAs1100FormatLineThicknessSpec('a0').cameraAlignmentMarkLineMm).toBe(0.5);
    expect(getAs1100FormatLineThicknessSpec('a1').cameraAlignmentMarkLineMm).toBe(0.35);
    expect(getAs1100FormatLineThicknessSpec('a4').cameraAlignmentMarkLineMm).toBe(0.25);
  });

  it('returns the Table 4.1 lettering heights for title, heading, and body text', () => {
    expect(getAs1100LetteringSpec('a0')).toEqual({
      bodyHeightMm: 3.5,
      headingHeightMm: 5,
      titleAndDrawingNumberHeightMm: 7,
    });
    expect(getAs1100LetteringSpec('a3')).toEqual({
      bodyHeightMm: 2.5,
      headingHeightMm: 3.5,
      titleAndDrawingNumberHeightMm: 5,
    });
  });
});
