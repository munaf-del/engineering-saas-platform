import {
  createDefaultGenericTemplateChromeStyleForDocument,
  type GenericTemplateDetailRow,
} from '../core/generic-template-document';
import type {
  SharedSheetBlockContent,
  SharedSheetContextRowsVisibility,
  SharedSheetDefinition,
  SharedSheetDetailsBlockDefinition,
  SharedSheetRenderModel,
  SharedSheetTitleBlockContent,
} from '../core/shared-sheet-schema';
import type {
  ProjectSpatialLegendFeatureEntry,
} from '@/features/spatial/project-spatial-legend';
import type { ProjectSpatialMapScaleBar } from '@/features/spatial/project-spatial-map';
import type {
  ProjectSpatialPaperSize,
  ProjectSpatialSheetMode,
  ProjectSpatialSheetOrientation,
} from '@/features/spatial/project-spatial-sheet-config';
import type { ProjectSpatialSheetObject } from '@/features/spatial/project-spatial-sheet-layout';

export type LegacySpatialSheetTemplateSource = {
  createdAt?: string;
  definitionId?: string;
  definitionVersionId?: string;
  id: string;
  mode: ProjectSpatialSheetMode;
  name: string;
  objects: ProjectSpatialSheetObject[];
  orientation: ProjectSpatialSheetOrientation;
  paperSize: ProjectSpatialPaperSize;
  updatedAt?: string;
};

export type LegacySpatialSheetRenderModelArgs = {
  activeBasemapLabel: string;
  checkedBy?: string;
  generatedAtLabel: string;
  geologyQueryLocation: [number, number] | null;
  legendEntries: ProjectSpatialLegendFeatureEntry[];
  mapFrameSavedViewLabel?: string | null;
  mapImageDataUrl: string;
  mapImageHeight: number;
  mapImageWidth: number;
  notes: string;
  preparedBy?: string;
  projectAddress: string | null;
  projectCode: string;
  projectName: string;
  revision?: string;
  scaleBar: ProjectSpatialMapScaleBar;
  sheetNumber?: string;
  sheetTitle: string;
  showGeologyOverlay: boolean;
  subtitle?: string;
  template: LegacySpatialSheetTemplateSource;
};

export function adaptLegacySpatialSheetTemplateToSharedDefinition(
  template: LegacySpatialSheetTemplateSource,
): SharedSheetDefinition {
  const now = new Date().toISOString();

  return {
    chromeStyle: createDefaultGenericTemplateChromeStyleForDocument({
      orientation: template.orientation,
      paperSize: template.paperSize,
      presetId: template.mode,
    }),
    createdAt: template.createdAt ?? now,
    definitionId: template.definitionId,
    definitionVersionId: template.definitionVersionId,
    id: template.id,
    kind: 'shared_sheet',
    name: template.name,
    objects: template.objects.map((object) => adaptLegacySpatialBlock(object, template.mode)),
    orientation: template.orientation,
    paperSize: template.paperSize,
    presetId: template.mode,
    source: template.definitionId ? 'built_in_template_definition' : 'legacy_spatial_adapter',
    updatedAt: template.updatedAt ?? now,
  };
}

export function buildLegacySpatialSharedSheetRenderModel(
  args: LegacySpatialSheetRenderModelArgs,
): SharedSheetRenderModel {
  const definition = adaptLegacySpatialSheetTemplateToSharedDefinition(args.template);
  const titleBlockContent = buildLegacySpatialTitleBlockContent(args);
  const contentByBlockId = Object.fromEntries(
    definition.objects.map((block) => [block.id, buildLegacySpatialBlockContent(block, args, titleBlockContent)]),
  ) as Record<string, SharedSheetBlockContent | undefined>;

  return {
    contentByBlockId,
    definition,
  };
}

function adaptLegacySpatialBlock(
  object: ProjectSpatialSheetObject,
  mode: ProjectSpatialSheetMode,
): SharedSheetDefinition['objects'][number] {
  const common = {
    contentScale: object.contentScale,
    density: object.density,
    height: object.height,
    id: object.id,
    locked: object.locked,
    name: object.name,
    order: object.order,
    paddingScale: object.paddingScale,
    visible: object.visible,
    width: object.width,
    x: object.x,
    y: object.y,
  } satisfies Pick<
    SharedSheetDefinition['objects'][number],
    | 'contentScale'
    | 'density'
    | 'height'
    | 'id'
    | 'locked'
    | 'name'
    | 'order'
    | 'paddingScale'
    | 'visible'
    | 'width'
    | 'x'
    | 'y'
  >;

  switch (object.type) {
    case 'mapFrame':
      return {
        ...common,
        binding: {
          description: 'Map snapshot content imported from a spatial view binding.',
          required: true,
          slot: 'mapFrame',
        },
        fitMode: object.mapFitMode ?? 'fit',
        type: 'mapFrame',
        variant: 'spatial_map',
      };
    case 'titleBlock':
      return {
        ...common,
        binding: {
          description: 'Sheet/report metadata bound into the drawing title block.',
          required: true,
          slot: 'titleBlock',
        },
        type: 'titleBlock',
        variant: mode === 'as1100_inspired' ? 'as1100_drawing' : 'generic',
      };
    case 'legend':
      return {
        ...common,
        binding: {
          description: 'Legend entries derived from visible spatial features and map context.',
          required: true,
          slot: 'legend',
        },
        columnCount: object.legendColumns ?? 1,
        showMapContext: object.legendShowMapContext ?? true,
        symbolScale: object.symbolScale,
        title: mode === 'as1100_inspired' ? 'Legend / Symbols' : 'Legend',
        type: 'legend',
        variant: 'spatial_legend',
      };
    case 'notes':
      return {
        ...common,
        binding: {
          description: 'Author notes bound onto the issued sheet instance.',
          required: false,
          slot: 'notesBlock',
        },
        title: 'Notes',
        type: 'notesBlock',
        variant: 'sheetNotes',
      };
    case 'sheetContext':
      return {
        ...common,
        binding: {
          description: 'Derived map/sheet context rows such as paper, basemap, and generated time.',
          required: true,
          slot: 'detailsBlock',
        },
        sheetContextRowsVisibility: object.sheetContextRowsVisibility,
        title: mode === 'as1100_inspired' ? 'Sheet Data' : 'Sheet Context',
        type: 'detailsBlock',
        variant: 'sheetContext',
      } satisfies SharedSheetDetailsBlockDefinition;
    case 'northArrow':
      return {
        ...common,
        binding: {
          description: 'Static north-arrow block.',
          required: false,
          slot: 'northArrow',
        },
        symbolScale: object.symbolScale,
        type: 'northArrow',
        variant: 'spatial_north_arrow',
      };
    case 'scaleBar':
      return {
        ...common,
        binding: {
          description: 'Scale bar generated from the captured map snapshot.',
          required: true,
          slot: 'scaleBar',
        },
        showLabel: object.scaleBarShowLabel ?? true,
        symbolScale: object.symbolScale,
        type: 'scaleBar',
        variant: 'spatial_scale_bar',
      };
  }
}

function buildLegacySpatialBlockContent(
  block: SharedSheetDefinition['objects'][number],
  args: LegacySpatialSheetRenderModelArgs,
  titleBlockContent: SharedSheetTitleBlockContent,
): SharedSheetBlockContent | undefined {
  switch (block.type) {
    case 'titleBlock':
      return titleBlockContent;
    case 'detailsBlock':
      return {
        rows: buildLegacySpatialSheetContextRows(
          titleBlockContent,
          block.sheetContextRowsVisibility,
        ),
        title: block.title,
        type: 'detailsBlock',
      };
    case 'notesBlock':
      return {
        body: args.notes,
        title: block.title,
        type: 'notesBlock',
      };
    case 'mapFrame':
      return {
        fitMode: block.fitMode,
        imageDataUrl: args.mapImageDataUrl,
        imageHeight: args.mapImageHeight,
        imageWidth: args.mapImageWidth,
        sourceLabel: args.mapFrameSavedViewLabel ?? null,
        type: 'mapFrame',
      };
    case 'legend':
      return {
        entries: args.legendEntries,
        geologyQueryLocation: args.geologyQueryLocation,
        showGeologyOverlay: args.showGeologyOverlay,
        type: 'legend',
      };
    case 'northArrow':
      return { type: 'northArrow' };
    case 'scaleBar':
      return {
        scaleBar: args.scaleBar,
        type: 'scaleBar',
      };
    default:
      return undefined;
  }
}

function buildLegacySpatialTitleBlockContent(
  args: LegacySpatialSheetRenderModelArgs,
): SharedSheetTitleBlockContent {
  return {
    activeBasemapLabel: args.activeBasemapLabel,
    checkedBy: normalizeText(args.checkedBy) || 'Not set',
    generatedAtLabel: normalizeText(args.generatedAtLabel) || 'Not set',
    geologyQueryLabel: args.geologyQueryLocation ? 'Shown on map' : 'Not shown',
    geologyStatusLabel: args.showGeologyOverlay ? 'Visible' : 'Hidden',
    paperLabel: `${args.template.paperSize.toUpperCase()} ${capitalize(args.template.orientation)}`,
    preparedBy: normalizeText(args.preparedBy) || 'Not set',
    projectAddress: normalizeText(args.projectAddress) || 'No site address available',
    projectCode: normalizeText(args.projectCode) || 'Project',
    projectName: normalizeText(args.projectName) || 'Project',
    revision: normalizeText(args.revision) || 'Not set',
    scaleLabel: normalizeText(args.scaleBar.label) || 'Refer to scale bar',
    sheetModeLabel: formatSheetModeLabel(args.template.mode),
    sheetNumber: normalizeText(args.sheetNumber) || 'Not set',
    sheetTitle: normalizeText(args.sheetTitle) || 'Spatial Workspace Map Sheet',
    subtitle: normalizeText(args.subtitle) || 'Spatial workspace export',
    type: 'titleBlock',
  };
}

function buildLegacySpatialSheetContextRows(
  titleBlockContent: SharedSheetTitleBlockContent,
  rowsVisibility?: SharedSheetContextRowsVisibility,
): GenericTemplateDetailRow[] {
  const visibility = rowsVisibility ?? DEFAULT_SHEET_CONTEXT_ROWS_VISIBILITY;
  const rows = [
    visibility.purpose ? { label: 'Purpose', value: titleBlockContent.subtitle } : null,
    visibility.layout ? { label: 'Layout', value: titleBlockContent.sheetModeLabel } : null,
    visibility.paper ? { label: 'Paper', value: titleBlockContent.paperLabel } : null,
    visibility.basemap ? { label: 'Basemap', value: titleBlockContent.activeBasemapLabel } : null,
    visibility.geology ? { label: 'Geology', value: titleBlockContent.geologyStatusLabel } : null,
    visibility.geoQuery ? { label: 'Geo Query', value: titleBlockContent.geologyQueryLabel } : null,
    visibility.generated
      ? { label: 'Generated', value: titleBlockContent.generatedAtLabel }
      : null,
  ].filter(Boolean) as Array<{ label: string | undefined; value: string | undefined }>;

  return rows.map((row, index) => ({
    id: `sheet-context-row-${index + 1}`,
    label: row.label ?? '',
    value: row.value ?? '',
  }));
}

const DEFAULT_SHEET_CONTEXT_ROWS_VISIBILITY: SharedSheetContextRowsVisibility = {
  basemap: true,
  generated: true,
  geoQuery: true,
  geology: true,
  layout: true,
  paper: true,
  purpose: true,
};

function formatSheetModeLabel(mode: ProjectSpatialSheetMode) {
  if (mode === 'system_default') {
    return 'System Default';
  }

  if (mode === 'as1100_inspired') {
    return 'AS 1100-inspired';
  }

  return 'Custom Layout';
}

function normalizeText(value: string | null | undefined) {
  return typeof value === 'string' ? value.trim() : '';
}

function capitalize(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}
