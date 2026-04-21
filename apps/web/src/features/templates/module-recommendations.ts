export type ModuleRecommendationId =
  | 'spatial_annexures'
  | 'monitoring_report_annexures'
  | 'monitoring_plans'
  | 'context_plans';

export type ModuleRecommendation = {
  id: ModuleRecommendationId;
  label: string;
  shortLabel: string;
};

const MODULE_RECOMMENDATIONS: Record<ModuleRecommendationId, ModuleRecommendation> = {
  context_plans: {
    id: 'context_plans',
    label: 'Recommended for context plans',
    shortLabel: 'Context plans',
  },
  monitoring_plans: {
    id: 'monitoring_plans',
    label: 'Recommended for monitoring plans',
    shortLabel: 'Monitoring plans',
  },
  monitoring_report_annexures: {
    id: 'monitoring_report_annexures',
    label: 'Recommended for Monitoring Report Annexures',
    shortLabel: 'Monitoring Report Annexures',
  },
  spatial_annexures: {
    id: 'spatial_annexures',
    label: 'Recommended for spatial annexures',
    shortLabel: 'Spatial annexures',
  },
};

export function getModuleRecommendation(
  recommendationId: ModuleRecommendationId,
): ModuleRecommendation {
  return MODULE_RECOMMENDATIONS[recommendationId];
}

export function resolveModuleRecommendations(
  recommendationIds: ModuleRecommendationId[],
): ModuleRecommendation[] {
  return recommendationIds.map((recommendationId) => getModuleRecommendation(recommendationId));
}
