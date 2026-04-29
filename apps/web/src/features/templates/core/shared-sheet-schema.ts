import type {
  GenericTemplateChromeStyle,
  GenericTemplateDetailRow,
  GenericTemplateLineStyle,
  GenericTemplateTypography,
} from './generic-template-document';
import type { TemplateDocument, TemplateObjectBase } from './template-document';
import type {
  TemplatePageOrientation,
  TemplatePaperSize,
  TemplatePresetId,
} from './template-preset';
import type { ProjectSpatialLegendFeatureEntry } from '@/features/spatial/project-spatial-legend';
import type { ProjectSpatialMapScaleBar } from '@/features/spatial/project-spatial-map';

export type SharedSheetDefinitionSource =
  | 'built_in_template_definition'
  | 'generic_template_adapter'
  | 'legacy_spatial_adapter';

export type SharedSheetBlockType =
  | 'titleBlock'
  | 'detailsBlock'
  | 'textBlock'
  | 'imageBlock'
  | 'tableBlock'
  | 'mapFrame'
  | 'legend'
  | 'northArrow'
  | 'scaleBar'
  | 'notesBlock';

export type SharedSheetBindingSlot =
  | 'titleBlock'
  | 'detailsBlock'
  | 'textBlock'
  | 'imageBlock'
  | 'tableBlock'
  | 'mapFrame'
  | 'legend'
  | 'northArrow'
  | 'scaleBar'
  | 'notesBlock';

export type SharedSheetDensity = 'compact' | 'normal';

export type SharedSheetContextRowKey =
  | 'basemap'
  | 'generated'
  | 'geoQuery'
  | 'geology'
  | 'layout'
  | 'paper'
  | 'purpose';

export type SharedSheetContextRowsVisibility = Record<SharedSheetContextRowKey, boolean>;

export type SharedSheetBindingReference<
  TSlot extends SharedSheetBindingSlot = SharedSheetBindingSlot,
> = {
  description?: string;
  required?: boolean;
  slot: TSlot;
};

type SharedSheetBlockCommon<TType extends SharedSheetBlockType> = TemplateObjectBase<TType> & {
  binding?: SharedSheetBindingReference | null;
  contentScale?: number;
  density?: SharedSheetDensity;
  lineStyle?: GenericTemplateLineStyle;
  name: string;
  paddingScale?: number;
};

export type SharedSheetTitleBlockDefinition = SharedSheetBlockCommon<'titleBlock'> & {
  binding?: SharedSheetBindingReference<'titleBlock'> | null;
  checkedBy?: string;
  generatedAtLabel?: string;
  preparedBy?: string;
  projectAddress?: string;
  projectCode?: string;
  projectName?: string;
  revision?: string;
  scaleLabel?: string;
  sheetNumber?: string;
  subtitle?: string;
  title?: string;
  typography?: GenericTemplateTypography;
  variant: 'generic' | 'as1100_drawing';
};

export type SharedSheetDetailsBlockDefinition = SharedSheetBlockCommon<'detailsBlock'> & {
  binding?: SharedSheetBindingReference<'detailsBlock'> | null;
  rows?: GenericTemplateDetailRow[];
  sheetContextRowsVisibility?: SharedSheetContextRowsVisibility;
  title?: string;
  variant: 'generic' | 'sheetContext';
};

export type SharedSheetTextBlockDefinition = SharedSheetBlockCommon<'textBlock'> & {
  binding?: SharedSheetBindingReference<'textBlock'> | null;
  body?: string;
  subtitle?: string;
  title?: string;
  variant: 'generic';
};

export type SharedSheetImageBlockDefinition = SharedSheetBlockCommon<'imageBlock'> & {
  binding?: SharedSheetBindingReference<'imageBlock'> | null;
  caption?: string;
  fitMode?: 'contain' | 'cover';
  imageUrl?: string;
  title?: string;
  variant: 'generic';
};

export type SharedSheetTableColumn = {
  id: string;
  label: string;
  widthRatio?: number;
};

export type SharedSheetTableBlockDefinition = SharedSheetBlockCommon<'tableBlock'> & {
  binding?: SharedSheetBindingReference<'tableBlock'> | null;
  columns?: SharedSheetTableColumn[];
  title?: string;
  variant: 'generic';
};

export type SharedSheetMapFrameDefinition = SharedSheetBlockCommon<'mapFrame'> & {
  binding?: SharedSheetBindingReference<'mapFrame'> | null;
  fitMode?: 'fit' | 'fill';
  variant: 'spatial_map';
};

export type SharedSheetLegendDefinition = SharedSheetBlockCommon<'legend'> & {
  binding?: SharedSheetBindingReference<'legend'> | null;
  columnCount?: number;
  showMapContext?: boolean;
  symbolScale?: number;
  title?: string;
  variant: 'spatial_legend';
};

export type SharedSheetNorthArrowDefinition = SharedSheetBlockCommon<'northArrow'> & {
  binding?: SharedSheetBindingReference<'northArrow'> | null;
  symbolScale?: number;
  variant: 'spatial_north_arrow';
};

export type SharedSheetScaleBarDefinition = SharedSheetBlockCommon<'scaleBar'> & {
  binding?: SharedSheetBindingReference<'scaleBar'> | null;
  showLabel?: boolean;
  symbolScale?: number;
  variant: 'spatial_scale_bar';
};

export type SharedSheetNotesBlockDefinition = SharedSheetBlockCommon<'notesBlock'> & {
  binding?: SharedSheetBindingReference<'notesBlock'> | null;
  body?: string;
  title?: string;
  variant: 'sheetNotes';
};

export type SharedSheetBlockDefinition =
  | SharedSheetTitleBlockDefinition
  | SharedSheetDetailsBlockDefinition
  | SharedSheetTextBlockDefinition
  | SharedSheetImageBlockDefinition
  | SharedSheetTableBlockDefinition
  | SharedSheetMapFrameDefinition
  | SharedSheetLegendDefinition
  | SharedSheetNorthArrowDefinition
  | SharedSheetScaleBarDefinition
  | SharedSheetNotesBlockDefinition;

export type SharedSheetTitleBlockContent = {
  activeBasemapLabel?: string;
  checkedBy?: string;
  generatedAtLabel?: string;
  geologyQueryLabel?: string;
  geologyStatusLabel?: string;
  paperLabel?: string;
  preparedBy?: string;
  projectAddress?: string;
  projectCode?: string;
  projectName?: string;
  revision?: string;
  scaleLabel?: string;
  sheetModeLabel?: string;
  sheetNumber?: string;
  sheetTitle?: string;
  subtitle?: string;
  type: 'titleBlock';
};

export type SharedSheetDetailsBlockContent = {
  rows?: GenericTemplateDetailRow[];
  title?: string;
  type: 'detailsBlock';
};

export type SharedSheetTextBlockContent = {
  body?: string;
  subtitle?: string;
  title?: string;
  type: 'textBlock';
};

export type SharedSheetImageBlockContent = {
  caption?: string;
  fitMode?: 'contain' | 'cover';
  imageUrl?: string;
  title?: string;
  type: 'imageBlock';
};

export type SharedSheetTableBlockContent = {
  columns?: SharedSheetTableColumn[];
  placeholder?: string;
  rows?: Array<Record<string, string | number | null>>;
  title?: string;
  type: 'tableBlock';
};

export type SharedSheetMapFrameContent = {
  fitMode?: 'fit' | 'fill';
  imageDataUrl?: string;
  imageHeight?: number;
  imageWidth?: number;
  sourceLabel?: string | null;
  type: 'mapFrame';
};

export type SharedSheetLegendContent = {
  entries: ProjectSpatialLegendFeatureEntry[];
  geologyQueryLocation: [number, number] | null;
  showGeologyOverlay: boolean;
  type: 'legend';
};

export type SharedSheetNorthArrowContent = {
  type: 'northArrow';
};

export type SharedSheetScaleBarContent = {
  scaleBar: ProjectSpatialMapScaleBar;
  type: 'scaleBar';
};

export type SharedSheetNotesBlockContent = {
  body?: string;
  title?: string;
  type: 'notesBlock';
};

export type SharedSheetBlockContent =
  | SharedSheetTitleBlockContent
  | SharedSheetDetailsBlockContent
  | SharedSheetTextBlockContent
  | SharedSheetImageBlockContent
  | SharedSheetTableBlockContent
  | SharedSheetMapFrameContent
  | SharedSheetLegendContent
  | SharedSheetNorthArrowContent
  | SharedSheetScaleBarContent
  | SharedSheetNotesBlockContent;

export type SharedSheetDefinition = TemplateDocument<SharedSheetBlockDefinition> & {
  chromeStyle: GenericTemplateChromeStyle;
  createdAt: string;
  definitionId?: string;
  definitionVersionId?: string;
  kind: 'shared_sheet';
  orientation: TemplatePageOrientation;
  paperSize: TemplatePaperSize;
  presetId: TemplatePresetId;
  source: SharedSheetDefinitionSource;
};

export type SharedSheetRenderModel = {
  contentByBlockId: Record<string, SharedSheetBlockContent | undefined>;
  definition: SharedSheetDefinition;
};

export function getSharedSheetBlockLabel(type: SharedSheetBlockType) {
  switch (type) {
    case 'titleBlock':
      return 'Title Block';
    case 'detailsBlock':
      return 'Details Block';
    case 'textBlock':
      return 'Text Block';
    case 'imageBlock':
      return 'Image Block';
    case 'tableBlock':
      return 'Table Block';
    case 'mapFrame':
      return 'Map Frame';
    case 'legend':
      return 'Legend';
    case 'northArrow':
      return 'North Arrow';
    case 'scaleBar':
      return 'Scale Bar';
    case 'notesBlock':
      return 'Notes Block';
  }
}
