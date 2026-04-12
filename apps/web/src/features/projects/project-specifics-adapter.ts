import type { Project, MultiPileProjectSpecifics } from '@eng/shared';
import { defaultMultiPileGeoArrSettings, MultiPileProjectSpecificsSchema } from '@eng/shared';
import {
  summarizeProjectGeotechnical,
  summarizeProjectReferences,
  summarizeProjectStructuralDefaults,
} from './project-specifics-utils';

export function defaultProjectSpecifics(
  project?: Pick<Project, 'name' | 'code'>,
): MultiPileProjectSpecifics {
  return {
    identity: {
      projectNumber: project?.code ?? '',
      projectName: project?.name ?? '',
      client: '',
      status: 'In Progress',
      address: '',
      latitude: '',
      longitude: '',
      mapAddress: '',
      notes: '',
      archived: false,
      projectLogo: '',
      mapSource: 'auto',
    },
    reportMeta: {
      reportTitle: 'Project Design Justification',
      reportRevision: '',
      issueDate: '',
      preparedBy: '',
      checkedBy: '',
      purpose: '',
    },
    references: [],
    structuralDefaults: {
      concreteClasses: [],
      reinforcementGrades: [],
      tendonGrades: [],
      coverDurabilityClasses: [],
    },
    geotechnicalMaterials: {
      activeReferenceId: '',
      templateState: 'empty',
      materials: [],
    },
    geotechnicalBasis: {
      groundwaterDesignNotes: '',
      cfaUpliftMode: 'manual-entry',
      cfaUpliftFactor: 0.7,
      defaultSocketAssumptions: '',
      foundingNotes: '',
      commentary: '',
      arrAssessment: defaultMultiPileGeoArrSettings(),
    },
  };
}

export function extractProjectSpecifics(project?: Project | null): MultiPileProjectSpecifics {
  const metadata = project?.metadata;
  if (
    metadata &&
    typeof metadata === 'object' &&
    !Array.isArray(metadata) &&
    'projectSpecifics' in metadata
  ) {
    const rawProjectSpecifics =
      metadata.projectSpecifics &&
      typeof metadata.projectSpecifics === 'object' &&
      !Array.isArray(metadata.projectSpecifics) &&
      !('geotechnicalMaterials' in metadata.projectSpecifics) &&
      'geotechnical' in metadata.projectSpecifics
        ? {
            ...metadata.projectSpecifics,
            geotechnicalMaterials: metadata.projectSpecifics.geotechnical,
          }
        : metadata.projectSpecifics;
    const parsed = MultiPileProjectSpecificsSchema.safeParse(rawProjectSpecifics);
    if (parsed.success) {
      return parsed.data;
    }
  }

  return defaultProjectSpecifics(project ?? undefined);
}

export function buildProjectMetadataPatch(
  project: Project,
  projectSpecifics: MultiPileProjectSpecifics,
): Record<string, unknown> {
  const base =
    project.metadata && typeof project.metadata === 'object' && !Array.isArray(project.metadata)
      ? project.metadata
      : {};

  return {
    ...base,
    projectSpecifics,
  };
}

export function projectSpecificsSummary(project?: Project | null) {
  const projectSpecifics = extractProjectSpecifics(project);
  return {
    projectNumber: projectSpecifics.identity.projectNumber || project?.code || 'Not set',
    projectName: projectSpecifics.identity.projectName || project?.name || 'Untitled Project',
    client: projectSpecifics.identity.client || 'Not set',
    address: projectSpecifics.identity.address || 'Not set',
    status: projectSpecifics.identity.status || 'Not set',
  };
}

export function projectReferencesSummary(project?: Project | null) {
  return summarizeProjectReferences(extractProjectSpecifics(project));
}

export function projectStructuralDefaultsSummary(project?: Project | null) {
  return summarizeProjectStructuralDefaults(extractProjectSpecifics(project));
}

export function projectGeotechnicalSummary(project?: Project | null) {
  return summarizeProjectGeotechnical(extractProjectSpecifics(project));
}
