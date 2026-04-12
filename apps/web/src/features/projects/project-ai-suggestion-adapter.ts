'use client';

import type { MultiPileProjectSpecifics } from '@eng/shared';
import type {
  AiAssistantSuggestedField,
  AiAssistantSuggestionApplyAdapter,
} from '@/features/ai/assistant-page-context';
import {
  createEmptyGeotechnicalMaterial,
  createEmptyProjectReference,
} from './project-specifics-utils';

const PROJECT_GEO_MATERIAL_NUMERIC_FIELDS = new Set([
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

const PROJECT_NOTES_FIELD_PATH = /^identity\.(notes)$/;
const PROJECT_REPORT_META_FIELD_PATH =
  /^reportMeta\.(reportTitle|reportRevision|issueDate|preparedBy|checkedBy|purpose)$/;
const PROJECT_GEOTECHNICAL_BASIS_FIELD_PATH =
  /^geotechnicalBasis\.(groundwaterDesignNotes|cfaUpliftMode|cfaUpliftFactor|defaultSocketAssumptions|foundingNotes|commentary)$/;
const PROJECT_REFERENCE_FIELD_PATH =
  /^references\[\d+\]\.(title|documentNumber|documentType|notes)$/;
const PROJECT_GEOTECHNICAL_MATERIAL_FIELD_PATH =
  /^geotechnicalMaterials\.materials\[\d+\]\.(unitCode|displayName|sourceDocument|sourceSite|sourceSection|sourceTable|notes|gamma_b|phi_prime|c_prime|cu|E_MPa|nu|Ka|Ko|Kp|pile_fms_comp_kPa|pile_fms_allow_kPa|pile_fms_tension_kPa|pile_fb_ult_kPa|pile_fb_allow_kPa|cfaUpliftTensionFactor)$/;

export function createProjectSuggestionApplyAdapter({
  projectSpecifics,
  onApply,
  canApplyField,
}: {
  projectSpecifics: MultiPileProjectSpecifics;
  onApply: (value: MultiPileProjectSpecifics) => void;
  canApplyField?: (fieldPath: string) => boolean;
}): AiAssistantSuggestionApplyAdapter {
  const canApplyProjectField = (fieldPath: string) =>
    isProjectSuggestionFieldPath(fieldPath) && (canApplyField ? canApplyField(fieldPath) : true);

  return {
    getCurrentValue: (fieldPath) => getProjectSuggestionFieldValue(projectSpecifics, fieldPath),
    canApplyField: canApplyProjectField,
    applySuggestions: (suggestions) => {
      const next = structuredClone(projectSpecifics);
      let appliedCount = 0;
      let skippedCount = 0;

      suggestions.forEach((suggestion) => {
        if (!canApplyProjectField(suggestion.fieldPath)) {
          skippedCount += 1;
          return;
        }

        const applied = applyProjectSuggestionField(next, suggestion);
        if (applied) {
          appliedCount += 1;
        } else {
          skippedCount += 1;
        }
      });

      if (appliedCount > 0) {
        onApply(next);
      }

      return {
        appliedCount,
        skippedCount,
      };
    },
  };
}

export function isProjectSuggestionFieldPath(fieldPath: string) {
  return (
    isProjectNotesSuggestionFieldPath(fieldPath) ||
    isProjectReportMetaSuggestionFieldPath(fieldPath) ||
    isProjectGeotechnicalBasisSuggestionFieldPath(fieldPath) ||
    isProjectReferenceSuggestionFieldPath(fieldPath) ||
    isProjectGeotechnicalMaterialSuggestionFieldPath(fieldPath)
  );
}

export function isProjectNotesSuggestionFieldPath(fieldPath: string) {
  return PROJECT_NOTES_FIELD_PATH.test(fieldPath);
}

export function isProjectReportMetaSuggestionFieldPath(fieldPath: string) {
  return PROJECT_REPORT_META_FIELD_PATH.test(fieldPath);
}

export function isProjectGeotechnicalBasisSuggestionFieldPath(fieldPath: string) {
  return PROJECT_GEOTECHNICAL_BASIS_FIELD_PATH.test(fieldPath);
}

export function isProjectReferenceSuggestionFieldPath(fieldPath: string) {
  return PROJECT_REFERENCE_FIELD_PATH.test(fieldPath);
}

export function isProjectGeotechnicalMaterialSuggestionFieldPath(fieldPath: string) {
  return PROJECT_GEOTECHNICAL_MATERIAL_FIELD_PATH.test(fieldPath);
}

export function isProjectPageSuggestionFieldPath(fieldPath: string) {
  return (
    isProjectNotesSuggestionFieldPath(fieldPath) ||
    isProjectReportMetaSuggestionFieldPath(fieldPath) ||
    isProjectReferenceSuggestionFieldPath(fieldPath)
  );
}

export function isProjectFoundationsSuggestionFieldPath(fieldPath: string) {
  return isProjectGeotechnicalBasisSuggestionFieldPath(fieldPath);
}

function getProjectSuggestionFieldValue(
  projectSpecifics: MultiPileProjectSpecifics,
  fieldPath: string,
) {
  if (fieldPath === 'identity.notes') {
    return formatProjectSuggestionValue(projectSpecifics.identity.notes);
  }

  if (fieldPath === 'reportMeta.reportTitle') {
    return formatProjectSuggestionValue(projectSpecifics.reportMeta.reportTitle);
  }
  if (fieldPath === 'reportMeta.reportRevision') {
    return formatProjectSuggestionValue(projectSpecifics.reportMeta.reportRevision);
  }
  if (fieldPath === 'reportMeta.issueDate') {
    return formatProjectSuggestionValue(projectSpecifics.reportMeta.issueDate);
  }
  if (fieldPath === 'reportMeta.preparedBy') {
    return formatProjectSuggestionValue(projectSpecifics.reportMeta.preparedBy);
  }
  if (fieldPath === 'reportMeta.checkedBy') {
    return formatProjectSuggestionValue(projectSpecifics.reportMeta.checkedBy);
  }
  if (fieldPath === 'reportMeta.purpose') {
    return formatProjectSuggestionValue(projectSpecifics.reportMeta.purpose);
  }

  if (fieldPath === 'geotechnicalBasis.groundwaterDesignNotes') {
    return formatProjectSuggestionValue(projectSpecifics.geotechnicalBasis.groundwaterDesignNotes);
  }
  if (fieldPath === 'geotechnicalBasis.cfaUpliftMode') {
    return formatProjectSuggestionValue(projectSpecifics.geotechnicalBasis.cfaUpliftMode);
  }
  if (fieldPath === 'geotechnicalBasis.cfaUpliftFactor') {
    return formatProjectSuggestionValue(projectSpecifics.geotechnicalBasis.cfaUpliftFactor);
  }
  if (fieldPath === 'geotechnicalBasis.defaultSocketAssumptions') {
    return formatProjectSuggestionValue(
      projectSpecifics.geotechnicalBasis.defaultSocketAssumptions,
    );
  }
  if (fieldPath === 'geotechnicalBasis.foundingNotes') {
    return formatProjectSuggestionValue(projectSpecifics.geotechnicalBasis.foundingNotes);
  }
  if (fieldPath === 'geotechnicalBasis.commentary') {
    return formatProjectSuggestionValue(projectSpecifics.geotechnicalBasis.commentary);
  }

  const referenceMatch = fieldPath.match(
    /^references\[(\d+)\]\.(title|documentNumber|documentType|notes)$/,
  );
  if (referenceMatch) {
    const reference = projectSpecifics.references[Number(referenceMatch[1])];
    if (!reference) {
      return null;
    }
    return formatProjectSuggestionValue(
      reference[referenceMatch[2] as 'title' | 'documentNumber' | 'documentType' | 'notes'],
    );
  }

  const materialMatch = fieldPath.match(
    /^geotechnicalMaterials\.materials\[(\d+)\]\.(unitCode|displayName|sourceDocument|sourceSite|sourceSection|sourceTable|notes|gamma_b|phi_prime|c_prime|cu|E_MPa|nu|Ka|Ko|Kp|pile_fms_comp_kPa|pile_fms_allow_kPa|pile_fms_tension_kPa|pile_fb_ult_kPa|pile_fb_allow_kPa|cfaUpliftTensionFactor)$/,
  );
  if (materialMatch) {
    const material = projectSpecifics.geotechnicalMaterials.materials[Number(materialMatch[1])];
    if (!material) {
      return null;
    }
    return formatProjectSuggestionValue(
      material[
        materialMatch[2] as
          | 'unitCode'
          | 'displayName'
          | 'sourceDocument'
          | 'sourceSite'
          | 'sourceSection'
          | 'sourceTable'
          | 'notes'
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
          | 'cfaUpliftTensionFactor'
      ],
    );
  }

  return null;
}

function applyProjectSuggestionField(
  projectSpecifics: MultiPileProjectSpecifics,
  suggestion: AiAssistantSuggestedField,
) {
  if (suggestion.fieldPath === 'identity.notes') {
    if (!shouldApplyProjectSuggestion(projectSpecifics.identity.notes, suggestion)) {
      return false;
    }
    projectSpecifics.identity.notes = suggestion.suggestedValue;
    return true;
  }

  if (suggestion.fieldPath === 'reportMeta.reportTitle') {
    if (!shouldApplyProjectSuggestion(projectSpecifics.reportMeta.reportTitle, suggestion)) {
      return false;
    }
    projectSpecifics.reportMeta.reportTitle = suggestion.suggestedValue;
    return true;
  }
  if (suggestion.fieldPath === 'reportMeta.reportRevision') {
    if (!shouldApplyProjectSuggestion(projectSpecifics.reportMeta.reportRevision, suggestion)) {
      return false;
    }
    projectSpecifics.reportMeta.reportRevision = suggestion.suggestedValue;
    return true;
  }
  if (suggestion.fieldPath === 'reportMeta.issueDate') {
    if (!shouldApplyProjectSuggestion(projectSpecifics.reportMeta.issueDate, suggestion)) {
      return false;
    }
    projectSpecifics.reportMeta.issueDate = suggestion.suggestedValue;
    return true;
  }
  if (suggestion.fieldPath === 'reportMeta.preparedBy') {
    if (!shouldApplyProjectSuggestion(projectSpecifics.reportMeta.preparedBy, suggestion)) {
      return false;
    }
    projectSpecifics.reportMeta.preparedBy = suggestion.suggestedValue;
    return true;
  }
  if (suggestion.fieldPath === 'reportMeta.checkedBy') {
    if (!shouldApplyProjectSuggestion(projectSpecifics.reportMeta.checkedBy, suggestion)) {
      return false;
    }
    projectSpecifics.reportMeta.checkedBy = suggestion.suggestedValue;
    return true;
  }
  if (suggestion.fieldPath === 'reportMeta.purpose') {
    if (!shouldApplyProjectSuggestion(projectSpecifics.reportMeta.purpose, suggestion)) {
      return false;
    }
    projectSpecifics.reportMeta.purpose = suggestion.suggestedValue;
    return true;
  }

  if (suggestion.fieldPath === 'geotechnicalBasis.groundwaterDesignNotes') {
    if (
      !shouldApplyProjectSuggestion(
        projectSpecifics.geotechnicalBasis.groundwaterDesignNotes,
        suggestion,
      )
    ) {
      return false;
    }
    projectSpecifics.geotechnicalBasis.groundwaterDesignNotes = suggestion.suggestedValue;
    return true;
  }
  if (suggestion.fieldPath === 'geotechnicalBasis.cfaUpliftMode') {
    if (
      !shouldApplyProjectSuggestion(projectSpecifics.geotechnicalBasis.cfaUpliftMode, suggestion)
    ) {
      return false;
    }
    if (
      suggestion.suggestedValue !== 'manual-entry' &&
      suggestion.suggestedValue !== 'ratio-to-compression'
    ) {
      return false;
    }
    projectSpecifics.geotechnicalBasis.cfaUpliftMode =
      suggestion.suggestedValue as MultiPileProjectSpecifics['geotechnicalBasis']['cfaUpliftMode'];
    return true;
  }
  if (suggestion.fieldPath === 'geotechnicalBasis.cfaUpliftFactor') {
    if (
      !shouldApplyProjectSuggestion(projectSpecifics.geotechnicalBasis.cfaUpliftFactor, suggestion)
    ) {
      return false;
    }
    const numericValue = Number(suggestion.suggestedValue);
    if (!Number.isFinite(numericValue)) {
      return false;
    }
    projectSpecifics.geotechnicalBasis.cfaUpliftFactor = numericValue;
    return true;
  }
  if (suggestion.fieldPath === 'geotechnicalBasis.defaultSocketAssumptions') {
    if (
      !shouldApplyProjectSuggestion(
        projectSpecifics.geotechnicalBasis.defaultSocketAssumptions,
        suggestion,
      )
    ) {
      return false;
    }
    projectSpecifics.geotechnicalBasis.defaultSocketAssumptions = suggestion.suggestedValue;
    return true;
  }
  if (suggestion.fieldPath === 'geotechnicalBasis.foundingNotes') {
    if (
      !shouldApplyProjectSuggestion(projectSpecifics.geotechnicalBasis.foundingNotes, suggestion)
    ) {
      return false;
    }
    projectSpecifics.geotechnicalBasis.foundingNotes = suggestion.suggestedValue;
    return true;
  }
  if (suggestion.fieldPath === 'geotechnicalBasis.commentary') {
    if (!shouldApplyProjectSuggestion(projectSpecifics.geotechnicalBasis.commentary, suggestion)) {
      return false;
    }
    projectSpecifics.geotechnicalBasis.commentary = suggestion.suggestedValue;
    return true;
  }

  const referenceMatch = suggestion.fieldPath.match(
    /^references\[(\d+)\]\.(title|documentNumber|documentType|notes)$/,
  );
  if (referenceMatch) {
    const index = Number(referenceMatch[1]);
    while (projectSpecifics.references.length <= index) {
      projectSpecifics.references.push(createEmptyProjectReference());
    }
    const reference = projectSpecifics.references[index];
    if (!reference) {
      return false;
    }
    const key = referenceMatch[2] as 'title' | 'documentNumber' | 'documentType' | 'notes';
    if (!shouldApplyProjectSuggestion(reference[key], suggestion)) {
      return false;
    }
    if (key === 'documentType') {
      reference.documentType =
        suggestion.suggestedValue as MultiPileProjectSpecifics['references'][number]['documentType'];
    } else {
      reference[key] = suggestion.suggestedValue;
    }
    return true;
  }

  const materialMatch = suggestion.fieldPath.match(
    /^geotechnicalMaterials\.materials\[(\d+)\]\.(unitCode|displayName|sourceDocument|sourceSite|sourceSection|sourceTable|notes|gamma_b|phi_prime|c_prime|cu|E_MPa|nu|Ka|Ko|Kp|pile_fms_comp_kPa|pile_fms_allow_kPa|pile_fms_tension_kPa|pile_fb_ult_kPa|pile_fb_allow_kPa|cfaUpliftTensionFactor)$/,
  );
  if (materialMatch) {
    const index = Number(materialMatch[1]);
    while (projectSpecifics.geotechnicalMaterials.materials.length <= index) {
      projectSpecifics.geotechnicalMaterials.materials.push({
        ...createEmptyGeotechnicalMaterial(),
        sourceReferenceId: projectSpecifics.geotechnicalMaterials.activeReferenceId,
      });
    }
    if (projectSpecifics.geotechnicalMaterials.templateState === 'empty') {
      projectSpecifics.geotechnicalMaterials.templateState = 'manual';
    }

    const material = projectSpecifics.geotechnicalMaterials.materials[index];
    if (!material) {
      return false;
    }
    const key = materialMatch[2] as
      | 'unitCode'
      | 'displayName'
      | 'sourceDocument'
      | 'sourceSite'
      | 'sourceSection'
      | 'sourceTable'
      | 'notes'
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
    const currentValue = material[key];
    if (!shouldApplyProjectSuggestion(currentValue, suggestion)) {
      return false;
    }

    if (PROJECT_GEO_MATERIAL_NUMERIC_FIELDS.has(key)) {
      const numericValue = Number(suggestion.suggestedValue);
      if (!Number.isFinite(numericValue)) {
        return false;
      }
      material[key as keyof typeof material] = numericValue as never;
      return true;
    }

    material[key as keyof typeof material] = suggestion.suggestedValue as never;
    return true;
  }

  return false;
}

function shouldApplyProjectSuggestion(
  currentValue: string | number | null | undefined,
  suggestion: AiAssistantSuggestedField,
) {
  if (suggestion.applyMode === 'replace') {
    return true;
  }
  if (typeof currentValue === 'number') {
    return !Number.isFinite(currentValue);
  }
  const normalized = currentValue?.toString().trim() ?? '';
  if (suggestion.fieldPath === 'reportMeta.reportTitle') {
    return isBlankOrDefaultProjectReportTitle(normalized);
  }
  if (/^references\[\d+\]\.documentType$/.test(suggestion.fieldPath)) {
    return normalized.length === 0 || normalized === 'Other';
  }
  return normalized.length === 0;
}

function formatProjectSuggestionValue(value: string | number | null | undefined) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : null;
  }
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : null;
}

function isBlankOrDefaultProjectReportTitle(value: string | null | undefined) {
  const normalized = value?.trim() ?? '';
  return normalized.length === 0 || normalized === 'Project Design Justification';
}
