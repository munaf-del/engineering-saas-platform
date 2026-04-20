import type { Project, ProjectLoadDefinition } from '@eng/shared';
import { ProjectLoadDefinitionSchema } from '@eng/shared';

export function defaultProjectLoadDefinition(): ProjectLoadDefinition {
  return {
    version: 1,
    standardSet: 'eng-default-v1',
    combinationSettings: {
      alpha: 0.015,
      psiC: 0.4,
      psiE: 0.3,
      psiL: 0.4,
      groundwaterFactor: 1.5,
      minPermanentFactor: 0.7,
      reduceMinimumPermanentWithPointNine: false,
    },
    loadCases: [
      { id: 'G', name: 'G', type: 'Permanent', reversible: false, enabled: true, order: 0 },
      { id: 'Q', name: 'Q', type: 'Imposed', reversible: false, enabled: true, order: 1 },
      { id: 'W', name: 'W', type: 'Wind', reversible: true, enabled: true, order: 2 },
      { id: 'E', name: 'E', type: 'Earthquake', reversible: true, enabled: true, order: 3 },
      { id: 'GW', name: 'GW', type: 'Groundwater', reversible: false, enabled: true, order: 4 },
    ],
    loadCombinations: [],
    metadata: {},
  };
}

export function extractProjectLoadDefinition(project?: Project | null): ProjectLoadDefinition {
  const metadata = project?.metadata;
  if (
    metadata &&
    typeof metadata === 'object' &&
    !Array.isArray(metadata) &&
    'projectLoadDefinition' in metadata
  ) {
    const parsed = ProjectLoadDefinitionSchema.safeParse(metadata.projectLoadDefinition);
    if (parsed.success) {
      return parsed.data;
    }
  }

  return defaultProjectLoadDefinition();
}

export function buildProjectLoadDefinitionMetadataPatch(
  project: Project,
  projectLoadDefinition: ProjectLoadDefinition,
): Record<string, unknown> {
  const base =
    project.metadata && typeof project.metadata === 'object' && !Array.isArray(project.metadata)
      ? project.metadata
      : {};

  return {
    ...base,
    projectLoadDefinition,
  };
}
