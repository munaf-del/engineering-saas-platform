import type {
  GenericTemplateDocument,
  GenericTemplateObject,
} from './core/generic-template-document';
import { getTemplateSafeArea } from './core/template-preset';

export type RootSheetTemplateSuitabilityCapability = 'spatial_ready' | 'general';

export type RootSheetTemplateSuitability = {
  capability: RootSheetTemplateSuitabilityCapability;
  hasMapFrame: boolean;
  imageFrameCount: number;
  largestReferenceImageFrame: GenericTemplateObject | null;
  largestReferenceImageFrameCoverageRatio: number;
  mapFrameCount: number;
  primaryMapFrame: GenericTemplateObject | null;
  primaryMapFrameCoverageRatio: number;
  primaryMapFrameUsesMostOfPage: boolean;
  warnings: string[];
};

export type SpatialSheetCapability = RootSheetTemplateSuitabilityCapability;

export function assessRootSheetTemplateSuitability(
  template: GenericTemplateDocument | null | undefined,
): RootSheetTemplateSuitability {
  if (!template) {
    return {
      capability: 'general',
      hasMapFrame: false,
      imageFrameCount: 0,
      largestReferenceImageFrame: null,
      largestReferenceImageFrameCoverageRatio: 0,
      mapFrameCount: 0,
      primaryMapFrame: null,
      primaryMapFrameCoverageRatio: 0,
      primaryMapFrameUsesMostOfPage: false,
      warnings: ['Template definition could not be loaded.'],
    };
  }

  const safeArea = getTemplateSafeArea(template.paperSize, template.orientation);
  const safeAreaMm2 = safeArea.width * safeArea.height;
  const mapFrames = template.objects.filter(
    (object): object is GenericTemplateObject => object.type === 'mapFrame' && object.visible,
  );
  const imageFrames = template.objects.filter(
    (object): object is GenericTemplateObject => object.type === 'imageFrame' && object.visible,
  );
  const primaryMapFrame =
    mapFrames
      .slice()
      .sort((left, right) => right.width * right.height - left.width * left.height)[0] ?? null;
  const primaryMapFrameCoverageRatio =
    primaryMapFrame && safeAreaMm2 > 0
      ? (primaryMapFrame.width * primaryMapFrame.height) / safeAreaMm2
      : 0;
  const largestReferenceImageFrame =
    imageFrames
      .slice()
      .sort((left, right) => right.width * right.height - left.width * left.height)[0] ?? null;
  const largestReferenceImageFrameCoverageRatio =
    largestReferenceImageFrame && safeAreaMm2 > 0
      ? (largestReferenceImageFrame.width * largestReferenceImageFrame.height) / safeAreaMm2
      : 0;
  const primaryMapFrameUsesMostOfPage = primaryMapFrameCoverageRatio >= 0.58;
  const warnings: string[] = [];

  if (mapFrames.length === 0) {
    warnings.push('Add a Map Frame to make this Root Sheet Template spatial-ready.');
    if (imageFrames.length > 0) {
      warnings.push(
        'Image Frame blocks do not auto-fill from a Project Spatial View. Use a Map Frame for spatial sheets.',
      );
    }
  }

  if (mapFrames.length > 1) {
    warnings.push(
      'Multiple Map Frame blocks were found. Spatial Sheets and Report Annexures will treat the largest one as the primary map frame.',
    );
  }

  if (
    primaryMapFrame &&
    (primaryMapFrame.width < safeArea.width * 0.45 ||
      primaryMapFrame.height < safeArea.height * 0.38 ||
      primaryMapFrameCoverageRatio < 0.5)
  ) {
    warnings.push(
      'The primary Map Frame is quite small for a spatial sheet. Consider giving the map more of the page.',
    );
  }

  if (
    primaryMapFrame &&
    largestReferenceImageFrame &&
    largestReferenceImageFrame.width * largestReferenceImageFrame.height >=
      primaryMapFrame.width * primaryMapFrame.height
  ) {
    warnings.push(
      'A reference Image Frame is larger than the primary Map Frame. Spatial sheets usually work best when the map remains the dominant block.',
    );
  }

  if (
    primaryMapFrame &&
    largestReferenceImageFrame &&
    largestReferenceImageFrameCoverageRatio > 0.16 &&
    largestReferenceImageFrameCoverageRatio >= primaryMapFrameCoverageRatio * 0.6
  ) {
    warnings.push(
      'The largest reference Image Frame is visually strong enough to compete with the map. Consider shrinking it or removing it from the default layout.',
    );
  }

  if (
    primaryMapFrame &&
    !primaryMapFrameUsesMostOfPage &&
    largestReferenceImageFrameCoverageRatio <= 0
  ) {
    warnings.push(
      'This Root Sheet Template is technically Spatial-ready, but the primary Map Frame still does not dominate the sheet. Spatial outputs usually work best when the map uses most of the safe area.',
    );
  }

  return {
    capability: mapFrames.length > 0 ? 'spatial_ready' : 'general',
    hasMapFrame: mapFrames.length > 0,
    imageFrameCount: imageFrames.length,
    largestReferenceImageFrame,
    largestReferenceImageFrameCoverageRatio,
    mapFrameCount: mapFrames.length,
    primaryMapFrame,
    primaryMapFrameCoverageRatio,
    primaryMapFrameUsesMostOfPage,
    warnings,
  };
}

export function getSpatialSheetCapabilityBadgeLabel(capability: SpatialSheetCapability) {
  switch (capability) {
    case 'spatial_ready':
      return 'Spatial-ready';
    default:
      return 'General';
  }
}

export function getSpatialSheetCapabilityBadgeVariant(capability: SpatialSheetCapability) {
  switch (capability) {
    case 'spatial_ready':
      return 'success' as const;
    default:
      return 'warning' as const;
  }
}
