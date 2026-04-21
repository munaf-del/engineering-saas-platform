import {
  createDefaultProjectSpatialSheetObjects,
  type ProjectSpatialSheetObject,
} from '@/features/spatial/project-spatial-sheet-layout';
import type {
  ProjectSpatialPaperSize,
  ProjectSpatialSheetMode,
  ProjectSpatialSheetOrientation,
} from '@/features/spatial/project-spatial-sheet-config';
import {
  adaptLegacySpatialSheetTemplateToSharedDefinition,
  type LegacySpatialSheetTemplateSource,
} from '../adapters/legacy-spatial-sheet-render-model';
import type { SharedSheetDefinition } from '../core/shared-sheet-schema';

export type BuiltInSheetTemplateDefinition = {
  buildDefinition: () => SharedSheetDefinition;
  buildLegacySource: () => LegacySpatialSheetTemplateSource;
  builtIn: true;
  category: 'generic_spatial_sheet_fallback';
  definitionId: string;
  description: string;
  label: string;
  orientation: ProjectSpatialSheetOrientation;
  paperSize: ProjectSpatialPaperSize;
  presetId: ProjectSpatialSheetMode;
  versionId: string;
};

const BUILT_IN_SPATIAL_TEMPLATE_UPDATED_AT = '2026-04-17T23:10:00.000Z';

// Built-in Sheet Templates remain fallback-only generic layouts.
// They can be recommended by a module, but they do not define the durable Root Sheet Template library.
const BUILT_IN_GENERIC_SPATIAL_TEMPLATE_SOURCES: BuiltInSheetTemplateDefinition[] = [
  createBuiltInGenericSpatialTemplateDefinition({
    definitionId: 'builtin-spatial-annexure-a4-landscape',
    description: 'Compact AS1100-inspired landscape map sheet fallback.',
    label: 'A4 Landscape Map Sheet',
    orientation: 'landscape',
    paperSize: 'a4',
    presetId: 'as1100_inspired',
    versionId: 'builtin-spatial-annexure-a4-landscape@2026-04-19.1',
  }),
  createBuiltInGenericSpatialTemplateDefinition({
    definitionId: 'builtin-spatial-annexure-a3-landscape',
    description: 'Larger AS1100-inspired landscape map sheet fallback.',
    label: 'A3 Landscape Map Sheet',
    orientation: 'landscape',
    paperSize: 'a3',
    presetId: 'as1100_inspired',
    versionId: 'builtin-spatial-annexure-a3-landscape@2026-04-19.1',
  }),
];

export const BUILT_IN_GENERIC_SPATIAL_TEMPLATE_DEFINITIONS =
  BUILT_IN_GENERIC_SPATIAL_TEMPLATE_SOURCES;

const DEFAULT_GENERIC_SPATIAL_TEMPLATE_DEFINITION =
  BUILT_IN_GENERIC_SPATIAL_TEMPLATE_DEFINITIONS[0]!;

export function resolveBuiltInGenericSpatialTemplateDefinition(
  templateId: string | null | undefined,
) {
  return (
    BUILT_IN_GENERIC_SPATIAL_TEMPLATE_DEFINITIONS.find(
      (template) => template.definitionId === templateId,
    ) ?? DEFAULT_GENERIC_SPATIAL_TEMPLATE_DEFINITION
  );
}

function createBuiltInGenericSpatialTemplateDefinition(args: {
  definitionId: string;
  description: string;
  label: string;
  orientation: ProjectSpatialSheetOrientation;
  paperSize: ProjectSpatialPaperSize;
  presetId: ProjectSpatialSheetMode;
  versionId: string;
}): BuiltInSheetTemplateDefinition {
  const source = createLegacySpatialBuiltInSource({
    definitionId: args.definitionId,
    definitionVersionId: args.versionId,
    label: args.label,
    orientation: args.orientation,
    paperSize: args.paperSize,
    presetId: args.presetId,
  });

  return {
    buildDefinition: () => adaptLegacySpatialSheetTemplateToSharedDefinition(source),
    buildLegacySource: () => source,
    builtIn: true,
    category: 'generic_spatial_sheet_fallback',
    definitionId: args.definitionId,
    description: args.description,
    label: args.label,
    orientation: args.orientation,
    paperSize: args.paperSize,
    presetId: args.presetId,
    versionId: args.versionId,
  };
}

function createLegacySpatialBuiltInSource(args: {
  definitionId: string;
  definitionVersionId: string;
  label: string;
  orientation: ProjectSpatialSheetOrientation;
  paperSize: ProjectSpatialPaperSize;
  presetId: ProjectSpatialSheetMode;
}): LegacySpatialSheetTemplateSource {
  return {
    createdAt: BUILT_IN_SPATIAL_TEMPLATE_UPDATED_AT,
    definitionId: args.definitionId,
    definitionVersionId: args.definitionVersionId,
    id: args.definitionId,
    mode: args.presetId,
    name: `Built-in Spatial Sheet ${args.label}`,
    objects: createDefaultProjectSpatialSheetObjects({
      orientation: args.orientation,
      paperSize: args.paperSize,
    }) as ProjectSpatialSheetObject[],
    orientation: args.orientation,
    paperSize: args.paperSize,
    updatedAt: BUILT_IN_SPATIAL_TEMPLATE_UPDATED_AT,
  };
}
