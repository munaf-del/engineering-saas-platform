'use client';

import type { MultiPileProjectGeotechnicalMaterial, MultiPileProjectSpecifics } from '@eng/shared';
import type { AiAssistantSuggestedField } from '@/features/ai/assistant-page-context';
import {
  createEmptyGeotechnicalMaterial,
  resolveProjectGeotechnicalMaterialLabel,
} from './project-specifics-utils';

const PROJECT_GEO_MATERIAL_CANDIDATE_FIELD_NAMES = [
  'unitCode',
  'displayName',
  'sourceDocument',
  'sourceProject',
  'sourceSite',
  'sourceSection',
  'sourceTable',
  'notes',
  'gamma_b',
  'phi_prime',
  'c_prime',
  'cu',
  'E_MPa',
  'nu',
  'Ka',
  'Ko',
  'Kp',
  'pile_fms_comp_kPa',
  'pile_fms_allow_kPa',
  'pile_fms_tension_kPa',
  'pile_fb_ult_kPa',
  'pile_fb_allow_kPa',
  'cfaUpliftTensionFactor',
] as const;

type ProjectGeoMaterialCandidateFieldName =
  (typeof PROJECT_GEO_MATERIAL_CANDIDATE_FIELD_NAMES)[number];

type ProjectGeoMaterialCandidateNumericFieldName =
  | 'gamma_b'
  | 'phi_prime'
  | 'c_prime'
  | 'cu'
  | 'E_MPa'
  | 'nu'
  | 'Ka'
  | 'Ko'
  | 'Kp'
  | 'pile_fms_comp_kPa'
  | 'pile_fms_allow_kPa'
  | 'pile_fms_tension_kPa'
  | 'pile_fb_ult_kPa'
  | 'pile_fb_allow_kPa'
  | 'cfaUpliftTensionFactor';

const PROJECT_GEO_MATERIAL_CANDIDATE_NUMERIC_FIELDS =
  new Set<ProjectGeoMaterialCandidateNumericFieldName>([
    'gamma_b',
    'phi_prime',
    'c_prime',
    'cu',
    'E_MPa',
    'nu',
    'Ka',
    'Ko',
    'Kp',
    'pile_fms_comp_kPa',
    'pile_fms_allow_kPa',
    'pile_fms_tension_kPa',
    'pile_fb_ult_kPa',
    'pile_fb_allow_kPa',
    'cfaUpliftTensionFactor',
  ]);

const PROJECT_GEO_MATERIAL_CANDIDATE_PATTERN = new RegExp(
  `^geotechnicalMaterials\\.candidates\\[(\\d+)\\]\\.(${PROJECT_GEO_MATERIAL_CANDIDATE_FIELD_NAMES.join(
    '|',
  )})$`,
);

export type ProjectGeotechnicalMaterialCandidate = {
  id: string;
  index: number;
  unitCode: string;
  displayName: string;
  sourceDocument: string;
  sourceProject: string;
  sourceSite: string;
  sourceSection: string;
  sourceTable: string;
  notes: string;
  gamma_b: number | null;
  phi_prime: number | null;
  c_prime: number | null;
  cu: number | null;
  E_MPa: number | null;
  nu: number | null;
  Ka: number | null;
  Ko: number | null;
  Kp: number | null;
  pile_fms_comp_kPa: number | null;
  pile_fms_allow_kPa: number | null;
  pile_fms_tension_kPa: number | null;
  pile_fb_ult_kPa: number | null;
  pile_fb_allow_kPa: number | null;
  cfaUpliftTensionFactor: number | null;
  sourceSummary: string;
  confidence: number | null;
  suggestions: AiAssistantSuggestedField[];
};

export function isProjectGeotechnicalMaterialCandidateSuggestion(
  suggestion: AiAssistantSuggestedField,
) {
  return PROJECT_GEO_MATERIAL_CANDIDATE_PATTERN.test(suggestion.fieldPath);
}

export function collectProjectGeotechnicalMaterialCandidates(
  suggestions: AiAssistantSuggestedField[],
) {
  const candidates = new Map<number, ProjectGeotechnicalMaterialCandidate>();

  suggestions.forEach((suggestion) => {
    const match = suggestion.fieldPath.match(PROJECT_GEO_MATERIAL_CANDIDATE_PATTERN);
    if (!match) {
      return;
    }

    const candidateIndex = Number(match[1]);
    const fieldName = match[2] as ProjectGeoMaterialCandidateFieldName;
    const candidate =
      candidates.get(candidateIndex) ??
      ({
        id: String(candidateIndex),
        index: candidateIndex,
        unitCode: '',
        displayName: '',
        sourceDocument: '',
        sourceProject: '',
        sourceSite: '',
        sourceSection: '',
        sourceTable: '',
        notes: '',
        gamma_b: null,
        phi_prime: null,
        c_prime: null,
        cu: null,
        E_MPa: null,
        nu: null,
        Ka: null,
        Ko: null,
        Kp: null,
        pile_fms_comp_kPa: null,
        pile_fms_allow_kPa: null,
        pile_fms_tension_kPa: null,
        pile_fb_ult_kPa: null,
        pile_fb_allow_kPa: null,
        cfaUpliftTensionFactor: null,
        sourceSummary: suggestion.sourceSummary,
        confidence: suggestion.confidence,
        suggestions: [],
      } satisfies ProjectGeotechnicalMaterialCandidate);

    candidate.suggestions.push(suggestion);
    if (!candidate.sourceSummary && suggestion.sourceSummary) {
      candidate.sourceSummary = suggestion.sourceSummary;
    }
    if (
      suggestion.confidence != null &&
      (candidate.confidence == null || suggestion.confidence > candidate.confidence)
    ) {
      candidate.confidence = suggestion.confidence;
    }

    if (PROJECT_GEO_MATERIAL_CANDIDATE_NUMERIC_FIELDS.has(fieldName as never)) {
      candidate[fieldName as ProjectGeoMaterialCandidateNumericFieldName] = parseNullableNumber(
        suggestion.suggestedValue,
      );
    } else {
      switch (fieldName) {
        case 'unitCode':
        case 'displayName':
        case 'sourceDocument':
        case 'sourceProject':
        case 'sourceSite':
        case 'sourceSection':
        case 'sourceTable':
        case 'notes':
          candidate[fieldName] = suggestion.suggestedValue;
          break;
        default:
          break;
      }
    }

    candidates.set(candidateIndex, candidate);
  });

  return Array.from(candidates.values()).sort((left, right) => left.index - right.index);
}

export function resolveProjectGeotechnicalMaterialCandidateLabel(
  candidate: Pick<ProjectGeotechnicalMaterialCandidate, 'unitCode' | 'displayName'>,
) {
  return (
    resolveProjectGeotechnicalMaterialLabel({
      id: '',
      unitCode: candidate.unitCode,
      displayName: candidate.displayName,
    }) || 'Extracted material candidate'
  );
}

export function resolveProjectGeotechnicalMaterialTargetLabel(
  material: MultiPileProjectGeotechnicalMaterial,
  index: number,
) {
  const label = resolveProjectGeotechnicalMaterialLabel(material);
  return label === 'Material row' ? `Material row ${index + 1}` : label;
}

export function addProjectGeotechnicalMaterialCandidateToDraft(
  projectSpecifics: MultiPileProjectSpecifics,
  candidate: ProjectGeotechnicalMaterialCandidate,
  options: { includeInProject: boolean },
) {
  const next = structuredClone(projectSpecifics);
  const material = buildProjectGeotechnicalMaterialFromCandidate(next, candidate, {
    includeInProject: options.includeInProject,
  });

  next.geotechnicalMaterials.materials.push(material);
  if (next.geotechnicalMaterials.templateState === 'empty') {
    next.geotechnicalMaterials.templateState = 'manual';
  }

  return next;
}

export function applyProjectGeotechnicalMaterialCandidateToExistingRow(
  projectSpecifics: MultiPileProjectSpecifics,
  candidate: ProjectGeotechnicalMaterialCandidate,
  targetIndex: number,
) {
  const next = structuredClone(projectSpecifics);
  const targetMaterial = next.geotechnicalMaterials.materials[targetIndex];
  if (!targetMaterial) {
    return projectSpecifics;
  }

  mergeCandidateIntoMaterial(targetMaterial, candidate);
  if (!targetMaterial.sourceReferenceId) {
    targetMaterial.sourceReferenceId = next.geotechnicalMaterials.activeReferenceId;
  }
  if (next.geotechnicalMaterials.templateState === 'empty') {
    next.geotechnicalMaterials.templateState = 'manual';
  }

  return next;
}

export function findStrongProjectGeotechnicalMaterialCandidateMatchIndex(
  projectSpecifics: MultiPileProjectSpecifics,
  candidate: ProjectGeotechnicalMaterialCandidate,
) {
  let bestMatch: { index: number; score: number } | null = null;

  for (const [index, material] of projectSpecifics.geotechnicalMaterials.materials.entries()) {
    if (isBlankMaterial(material)) {
      continue;
    }

    const score = scoreProjectGeotechnicalMaterialCandidateMatch(material, candidate);
    if (score < 72) {
      continue;
    }
    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { index, score };
    }
  }

  return bestMatch?.index ?? null;
}

function buildProjectGeotechnicalMaterialFromCandidate(
  projectSpecifics: MultiPileProjectSpecifics,
  candidate: ProjectGeotechnicalMaterialCandidate,
  options: { includeInProject: boolean },
) {
  const material = createEmptyGeotechnicalMaterial();
  material.sourceReferenceId = projectSpecifics.geotechnicalMaterials.activeReferenceId;
  material.includeInProject = options.includeInProject;
  mergeCandidateIntoMaterial(material, candidate);
  return material;
}

function mergeCandidateIntoMaterial(
  material: MultiPileProjectGeotechnicalMaterial,
  candidate: ProjectGeotechnicalMaterialCandidate,
) {
  if (candidate.unitCode.trim()) {
    material.unitCode = candidate.unitCode.trim();
  }
  if (candidate.displayName.trim()) {
    material.displayName = candidate.displayName.trim();
  }
  if (candidate.sourceDocument.trim()) {
    material.sourceDocument = candidate.sourceDocument.trim();
  }
  if (candidate.sourceProject.trim()) {
    material.sourceProject = candidate.sourceProject.trim();
  }
  if (candidate.sourceSite.trim()) {
    material.sourceSite = candidate.sourceSite.trim();
  }
  if (candidate.sourceSection.trim()) {
    material.sourceSection = candidate.sourceSection.trim();
  }
  if (candidate.sourceTable.trim()) {
    material.sourceTable = candidate.sourceTable.trim();
  }
  if (candidate.notes.trim()) {
    material.notes = candidate.notes.trim();
  }
  if (candidate.gamma_b != null) {
    material.gamma_b = candidate.gamma_b;
  }
  if (candidate.phi_prime != null) {
    material.phi_prime = candidate.phi_prime;
  }
  if (candidate.c_prime != null) {
    material.c_prime = candidate.c_prime;
  }
  if (candidate.cu != null) {
    material.cu = candidate.cu;
  }
  if (candidate.E_MPa != null) {
    material.E_MPa = candidate.E_MPa;
  }
  if (candidate.nu != null) {
    material.nu = candidate.nu;
  }
  if (candidate.Ka != null) {
    material.Ka = candidate.Ka;
  }
  if (candidate.Ko != null) {
    material.Ko = candidate.Ko;
  }
  if (candidate.Kp != null) {
    material.Kp = candidate.Kp;
  }
  if (candidate.pile_fms_comp_kPa != null) {
    material.pile_fms_comp_kPa = candidate.pile_fms_comp_kPa;
  }
  if (candidate.pile_fms_allow_kPa != null) {
    material.pile_fms_allow_kPa = candidate.pile_fms_allow_kPa;
  }
  if (candidate.pile_fms_tension_kPa != null) {
    material.pile_fms_tension_kPa = candidate.pile_fms_tension_kPa;
  }
  if (candidate.pile_fb_ult_kPa != null) {
    material.pile_fb_ult_kPa = candidate.pile_fb_ult_kPa;
  }
  if (candidate.pile_fb_allow_kPa != null) {
    material.pile_fb_allow_kPa = candidate.pile_fb_allow_kPa;
  }
  if (candidate.cfaUpliftTensionFactor != null) {
    material.cfaUpliftTensionFactor = candidate.cfaUpliftTensionFactor;
  }
}

function scoreProjectGeotechnicalMaterialCandidateMatch(
  material: MultiPileProjectGeotechnicalMaterial,
  candidate: ProjectGeotechnicalMaterialCandidate,
) {
  let score = 0;
  const existingVariants = materialIdentityVariants(material.unitCode, material.displayName);
  const candidateVariants = materialIdentityVariants(candidate.unitCode, candidate.displayName);

  existingVariants.forEach((existingVariant) => {
    candidateVariants.forEach((candidateVariant) => {
      if (!existingVariant || !candidateVariant) {
        return;
      }
      if (existingVariant === candidateVariant) {
        score = Math.max(score, 100);
        return;
      }
      if (
        existingVariant.length >= 8 &&
        candidateVariant.length >= 8 &&
        (existingVariant.includes(candidateVariant) || candidateVariant.includes(existingVariant))
      ) {
        score = Math.max(score, 72);
      }

      const overlap = countTokenOverlap(existingVariant, candidateVariant);
      if (overlap >= 3) {
        score = Math.max(score, overlap * 18);
      }
    });
  });

  if (
    material.pile_fms_comp_kPa != null &&
    candidate.pile_fms_comp_kPa != null &&
    material.pile_fms_comp_kPa === candidate.pile_fms_comp_kPa
  ) {
    score += 20;
  }
  if (
    material.pile_fb_ult_kPa != null &&
    candidate.pile_fb_ult_kPa != null &&
    material.pile_fb_ult_kPa === candidate.pile_fb_ult_kPa
  ) {
    score += 20;
  }

  return score;
}

function isBlankMaterial(material: MultiPileProjectGeotechnicalMaterial) {
  return (
    !material.unitCode.trim() &&
    !material.displayName.trim() &&
    !material.sourceDocument.trim() &&
    !material.sourceProject.trim() &&
    !material.sourceSite.trim() &&
    !material.sourceSection.trim() &&
    !material.sourceTable.trim() &&
    !material.notes.trim() &&
    material.gamma_b == null &&
    material.phi_prime == null &&
    material.c_prime == null &&
    material.cu == null &&
    material.E_MPa == null &&
    material.nu == null &&
    material.Ka == null &&
    material.Ko == null &&
    material.Kp == null &&
    material.pile_fms_comp_kPa == null &&
    material.pile_fms_allow_kPa == null &&
    material.pile_fms_tension_kPa == null &&
    material.pile_fb_ult_kPa == null &&
    material.pile_fb_allow_kPa == null &&
    material.cfaUpliftTensionFactor == null
  );
}

function materialIdentityVariants(...values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => normalizeMaterialIdentity(value))
        .filter((value): value is string => (value?.length ?? 0) > 0),
    ),
  );
}

function normalizeMaterialIdentity(value: string | null | undefined) {
  return value
    ?.trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function countTokenOverlap(left: string, right: string) {
  const leftTokens = new Set(left.split(' ').filter((token) => token.length > 2));
  const rightTokens = new Set(right.split(' ').filter((token) => token.length > 2));
  let overlap = 0;

  leftTokens.forEach((token) => {
    if (rightTokens.has(token)) {
      overlap += 1;
    }
  });

  return overlap;
}

function parseNullableNumber(value: string | null | undefined) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}
