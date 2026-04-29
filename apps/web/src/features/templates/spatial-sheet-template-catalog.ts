'use client';

import { useCallback, useMemo } from 'react';
import type { GenericTemplateDocument } from './core/generic-template-document';
import {
  resolveModuleRecommendations,
  type ModuleRecommendation,
  type ModuleRecommendationId,
} from './module-recommendations';
import {
  coerceRootSheetTemplateDocument,
  type RootSheetTemplate,
} from './root-sheet-template-types';
import {
  assessRootSheetTemplateSuitability,
  getSpatialSheetCapabilityBadgeLabel,
  type RootSheetTemplateSuitability,
  type SpatialSheetCapability,
} from './root-sheet-template-suitability';
import { formatOperatorFacingSheetLabel } from './sheet-display-labels';
import { useRootSheetTemplates } from '@/hooks/use-root-sheet-templates';

export type SpatialSheetTemplateSourceKind = 'root_sheet_template';

export type RootSheetTemplateSnapshot = {
  id: string;
  label: string;
  templateDocument: GenericTemplateDocument;
  versionId: string;
};

export type SpatialSheetTemplateOption = {
  capability: SpatialSheetCapability;
  description: string;
  hiddenFromSpatialPickers: boolean;
  helperText: string | null;
  isSelectableForSpatial: boolean;
  label: string;
  moduleRecommendations: ModuleRecommendation[];
  orientation: GenericTemplateDocument['orientation'];
  paperSize: GenericTemplateDocument['paperSize'];
  rootSheetTemplate: GenericTemplateDocument | null;
  rootSheetTemplateRecord: RootSheetTemplate | null;
  sourceKind: SpatialSheetTemplateSourceKind;
  suitability: RootSheetTemplateSuitability | null;
  templateId: string;
  templateLabel: string;
  templateVersionId: string;
  value: string;
};

export function useSpatialSheetTemplateCatalog() {
  const { data: rootTemplates = [], refetch, isLoading } = useRootSheetTemplates();

  const templateOptions = useMemo(
    () =>
      rootTemplates
        .map((template) => createRootSheetTemplateOption(template))
        .filter((option): option is SpatialSheetTemplateOption => option !== null)
        .sort(compareSpatialSheetTemplateOptions),
    [rootTemplates],
  );

  const selectableTemplateOptions = useMemo(
    () => templateOptions.filter((templateOption) => !templateOption.hiddenFromSpatialPickers),
    [templateOptions],
  );

  const generalTemplateCount = useMemo(
    () =>
      templateOptions.filter((templateOption) => templateOption.capability === 'general').length,
    [templateOptions],
  );

  const refreshTemplateOptions = useCallback(() => {
    void refetch();
  }, [refetch]);

  return {
    isLoading,
    generalTemplateCount,
    refreshTemplateOptions,
    selectableTemplateOptions,
    templateOptions,
  };
}

export function resolveSpatialSheetTemplateOption(
  templateId: string | null | undefined,
  templateOptions: SpatialSheetTemplateOption[],
) {
  const normalizedTemplateId = templateId?.trim();
  return (
    templateOptions.find((templateOption) => templateOption.value === normalizedTemplateId) ??
    templateOptions[0] ??
    null
  );
}

export function createRootSheetTemplateSnapshot(
  templateOption: SpatialSheetTemplateOption | null | undefined,
): RootSheetTemplateSnapshot | null {
  if (
    !templateOption ||
    templateOption.sourceKind !== 'root_sheet_template' ||
    !templateOption.rootSheetTemplate
  ) {
    return null;
  }

  return {
    id: templateOption.templateId,
    label: templateOption.templateLabel,
    templateDocument: templateOption.rootSheetTemplate,
    versionId: templateOption.templateVersionId,
  };
}

export function isSpatiallyCompatibleRootSheetTemplate(template: GenericTemplateDocument) {
  return template.objects.some((object) => object.type === 'mapFrame');
}

function createRootSheetTemplateOption(
  template: RootSheetTemplate,
): SpatialSheetTemplateOption | null {
  const document = coerceRootSheetTemplateDocument(template);
  if (!document || !template.currentVersion) {
    return null;
  }

  const suitability = assessRootSheetTemplateSuitability(document);
  const cleanLabel = formatOperatorFacingSheetLabel(template.label);
  const capabilityLabel = getSpatialSheetCapabilityBadgeLabel(suitability.capability);

  return {
    capability: suitability.capability,
    description:
      suitability.capability === 'spatial_ready'
        ? `Root Sheet Template · ${document.paperSize.toUpperCase()} ${document.orientation}`
        : `Root Sheet Template · ${capabilityLabel} · add a Map Frame to use it for spatial sheets`,
    hiddenFromSpatialPickers: !suitability.hasMapFrame,
    helperText: suitability.warnings[0] ?? null,
    isSelectableForSpatial: suitability.hasMapFrame,
    label: cleanLabel,
    moduleRecommendations: resolveModuleRecommendationsForTemplate({
      capability: suitability.capability,
      orientation: document.orientation,
      paperSize: document.paperSize,
    }),
    orientation: document.orientation,
    paperSize: document.paperSize,
    rootSheetTemplate: document,
    rootSheetTemplateRecord: template,
    sourceKind: 'root_sheet_template',
    suitability,
    templateId: template.id,
    templateLabel: cleanLabel,
    templateVersionId: template.currentVersion.id,
    value: template.id,
  };
}

function resolveModuleRecommendationsForTemplate(args: {
  capability: SpatialSheetCapability;
  orientation: GenericTemplateDocument['orientation'];
  paperSize: GenericTemplateDocument['paperSize'];
}) {
  const recommendationIds = new Set<ModuleRecommendationId>();

  if (args.capability === 'spatial_ready') {
    recommendationIds.add('spatial_annexures');
  }

  if (
    args.capability === 'spatial_ready' &&
    args.orientation === 'landscape' &&
    (args.paperSize === 'a3' || args.paperSize === 'a4')
  ) {
    recommendationIds.add('monitoring_report_annexures');
  }

  if (
    args.capability === 'spatial_ready' &&
    args.orientation === 'landscape' &&
    args.paperSize === 'a3'
  ) {
    recommendationIds.add('monitoring_plans');
  }

  return resolveModuleRecommendations([...recommendationIds]);
}

function compareSpatialSheetTemplateOptions(
  left: SpatialSheetTemplateOption,
  right: SpatialSheetTemplateOption,
) {
  return (
    capabilitySortRank(left.capability) - capabilitySortRank(right.capability) ||
    right.moduleRecommendations.length - left.moduleRecommendations.length ||
    left.templateLabel.localeCompare(right.templateLabel)
  );
}

function capabilitySortRank(capability: SpatialSheetCapability) {
  switch (capability) {
    case 'spatial_ready':
      return 0;
    case 'general':
      return 1;
    default:
      return 2;
  }
}
