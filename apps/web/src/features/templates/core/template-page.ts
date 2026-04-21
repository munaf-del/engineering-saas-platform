export type TemplatePaperSize = 'a4' | 'a3' | 'a2' | 'a1' | 'a0';

export type TemplatePageOrientation = 'portrait' | 'landscape';

type TemplatePaperDimensions = {
  heightMm: number;
  label: string;
  scaleStep: number;
  widthMm: number;
};

export type TemplatePageLayout = {
  aspectRatio: number;
  heightMm: number;
  heightPx: number;
  isLandscape: boolean;
  orientation: TemplatePageOrientation;
  orientationLabel: string;
  paperSize: TemplatePaperSize;
  sizeLabel: string;
  widthMm: number;
  widthPx: number;
};

const TEMPLATE_PAPER_DIMENSIONS: Record<TemplatePaperSize, TemplatePaperDimensions> = {
  a0: { widthMm: 841, heightMm: 1189, label: 'A0', scaleStep: 4 },
  a1: { widthMm: 594, heightMm: 841, label: 'A1', scaleStep: 3 },
  a2: { widthMm: 420, heightMm: 594, label: 'A2', scaleStep: 2 },
  a3: { widthMm: 297, heightMm: 420, label: 'A3', scaleStep: 1 },
  a4: { widthMm: 210, heightMm: 297, label: 'A4', scaleStep: 0 },
};

export const TEMPLATE_PAPER_SIZE_OPTIONS: Array<{
  label: string;
  value: TemplatePaperSize;
}> = (['a4', 'a3', 'a2', 'a1', 'a0'] as const).map((value) => ({
  value,
  label: TEMPLATE_PAPER_DIMENSIONS[value].label,
}));

export const TEMPLATE_PAGE_ORIENTATION_OPTIONS: Array<{
  label: string;
  value: TemplatePageOrientation;
}> = [
  { value: 'landscape', label: 'Landscape' },
  { value: 'portrait', label: 'Portrait' },
];

export function getTemplatePageLayout(
  paperSize: TemplatePaperSize,
  orientation: TemplatePageOrientation,
): TemplatePageLayout {
  const baseDimensions = TEMPLATE_PAPER_DIMENSIONS[paperSize];
  const isLandscape = orientation === 'landscape';
  const widthMm = isLandscape
    ? Math.max(baseDimensions.widthMm, baseDimensions.heightMm)
    : Math.min(baseDimensions.widthMm, baseDimensions.heightMm);
  const heightMm = isLandscape
    ? Math.min(baseDimensions.widthMm, baseDimensions.heightMm)
    : Math.max(baseDimensions.widthMm, baseDimensions.heightMm);
  const aspectRatio = widthMm / heightMm;
  const pxPerMm = 2.1;
  const widthPx = Math.round(widthMm * pxPerMm);
  const heightPx = Math.round(heightMm * pxPerMm);

  return {
    aspectRatio,
    heightMm,
    heightPx,
    isLandscape,
    orientation,
    orientationLabel: isLandscape ? 'Landscape' : 'Portrait',
    paperSize,
    sizeLabel: baseDimensions.label,
    widthMm,
    widthPx,
  };
}
