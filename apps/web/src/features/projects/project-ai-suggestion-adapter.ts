'use client';

import {
  MULTI_PILE_PROJECT_MAP_SOURCES,
  MULTI_PILE_PROJECT_STATUSES,
  type MultiPileProjectSpecifics,
} from '@eng/shared';
import type {
  AiAssistantSuggestedField,
  AiAssistantSuggestionApplyAdapter,
} from '@/features/ai/assistant-page-context';
import { createEmptyGeotechnicalMaterial } from './project-specifics-utils';

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

const PROJECT_IDENTITY_TEXT_FIELD_PATH =
  /^identity\.(projectNumber|projectName|client|address|latitude|longitude|mapAddress|notes)$/;
const PROJECT_IDENTITY_SELECT_FIELD_PATH = /^identity\.(status|mapSource)$/;
const PROJECT_IDENTITY_BOOLEAN_FIELD_PATH = /^identity\.(archived)$/;
const PROJECT_REPORT_META_FIELD_PATH =
  /^reportMeta\.(reportTitle|reportRevision|issueDate|preparedBy|checkedBy|purpose)$/;
const PROJECT_GEOTECHNICAL_BASIS_FIELD_PATH =
  /^geotechnicalBasis\.(groundwaterDesignNotes|cfaUpliftMode|cfaUpliftFactor|defaultSocketAssumptions|foundingNotes|commentary)$/;
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
    isProjectIdentitySuggestionFieldPath(fieldPath) ||
    isProjectReportMetaSuggestionFieldPath(fieldPath) ||
    isProjectGeotechnicalBasisSuggestionFieldPath(fieldPath) ||
    isProjectGeotechnicalMaterialSuggestionFieldPath(fieldPath)
  );
}

export function isProjectIdentitySuggestionFieldPath(fieldPath: string) {
  return (
    PROJECT_IDENTITY_TEXT_FIELD_PATH.test(fieldPath) ||
    PROJECT_IDENTITY_SELECT_FIELD_PATH.test(fieldPath) ||
    PROJECT_IDENTITY_BOOLEAN_FIELD_PATH.test(fieldPath)
  );
}

export function isProjectReportMetaSuggestionFieldPath(fieldPath: string) {
  return PROJECT_REPORT_META_FIELD_PATH.test(fieldPath);
}

export function isProjectGeotechnicalBasisSuggestionFieldPath(fieldPath: string) {
  return PROJECT_GEOTECHNICAL_BASIS_FIELD_PATH.test(fieldPath);
}

export function isProjectGeotechnicalMaterialSuggestionFieldPath(fieldPath: string) {
  return PROJECT_GEOTECHNICAL_MATERIAL_FIELD_PATH.test(fieldPath);
}

export function isProjectPageSuggestionFieldPath(fieldPath: string) {
  return (
    isProjectIdentitySuggestionFieldPath(fieldPath) ||
    isProjectReportMetaSuggestionFieldPath(fieldPath)
  );
}

export function isProjectFoundationsSuggestionFieldPath(fieldPath: string) {
  return isProjectGeotechnicalBasisSuggestionFieldPath(fieldPath);
}

function getProjectSuggestionFieldValue(
  projectSpecifics: MultiPileProjectSpecifics,
  fieldPath: string,
) {
  if (fieldPath === 'identity.projectNumber') {
    return formatProjectSuggestionValue(projectSpecifics.identity.projectNumber);
  }
  if (fieldPath === 'identity.projectName') {
    return formatProjectSuggestionValue(projectSpecifics.identity.projectName);
  }
  if (fieldPath === 'identity.client') {
    return formatProjectSuggestionValue(projectSpecifics.identity.client);
  }
  if (fieldPath === 'identity.status') {
    return formatProjectSuggestionValue(projectSpecifics.identity.status);
  }
  if (fieldPath === 'identity.address') {
    return formatProjectSuggestionValue(projectSpecifics.identity.address);
  }
  if (fieldPath === 'identity.latitude') {
    return formatProjectSuggestionValue(projectSpecifics.identity.latitude);
  }
  if (fieldPath === 'identity.longitude') {
    return formatProjectSuggestionValue(projectSpecifics.identity.longitude);
  }
  if (fieldPath === 'identity.mapAddress') {
    return formatProjectSuggestionValue(projectSpecifics.identity.mapAddress);
  }
  if (fieldPath === 'identity.notes') {
    return formatProjectSuggestionValue(projectSpecifics.identity.notes);
  }
  if (fieldPath === 'identity.archived') {
    return projectSpecifics.identity.archived ? 'Yes' : 'No';
  }
  if (fieldPath === 'identity.mapSource') {
    return formatProjectSuggestionValue(projectSpecifics.identity.mapSource);
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
  if (suggestion.fieldPath === 'identity.projectNumber') {
    if (!shouldApplyProjectSuggestion(projectSpecifics.identity.projectNumber, suggestion)) {
      return false;
    }
    projectSpecifics.identity.projectNumber = suggestion.suggestedValue;
    return true;
  }
  if (suggestion.fieldPath === 'identity.projectName') {
    if (!shouldApplyProjectSuggestion(projectSpecifics.identity.projectName, suggestion)) {
      return false;
    }
    projectSpecifics.identity.projectName = suggestion.suggestedValue;
    return true;
  }
  if (suggestion.fieldPath === 'identity.client') {
    if (!shouldApplyProjectSuggestion(projectSpecifics.identity.client, suggestion)) {
      return false;
    }
    projectSpecifics.identity.client = suggestion.suggestedValue;
    return true;
  }
  if (suggestion.fieldPath === 'identity.status') {
    if (!shouldApplyProjectSuggestion(projectSpecifics.identity.status, suggestion)) {
      return false;
    }
    if (!(MULTI_PILE_PROJECT_STATUSES as readonly string[]).includes(suggestion.suggestedValue)) {
      return false;
    }
    projectSpecifics.identity.status =
      suggestion.suggestedValue as MultiPileProjectSpecifics['identity']['status'];
    return true;
  }
  if (suggestion.fieldPath === 'identity.address') {
    if (!shouldApplyProjectSuggestion(projectSpecifics.identity.address, suggestion)) {
      return false;
    }
    projectSpecifics.identity.address = suggestion.suggestedValue;
    return true;
  }
  if (suggestion.fieldPath === 'identity.latitude') {
    if (!shouldApplyProjectSuggestion(projectSpecifics.identity.latitude, suggestion)) {
      return false;
    }
    projectSpecifics.identity.latitude = suggestion.suggestedValue;
    return true;
  }
  if (suggestion.fieldPath === 'identity.longitude') {
    if (!shouldApplyProjectSuggestion(projectSpecifics.identity.longitude, suggestion)) {
      return false;
    }
    projectSpecifics.identity.longitude = suggestion.suggestedValue;
    return true;
  }
  if (suggestion.fieldPath === 'identity.mapAddress') {
    if (!shouldApplyProjectSuggestion(projectSpecifics.identity.mapAddress, suggestion)) {
      return false;
    }
    projectSpecifics.identity.mapAddress = suggestion.suggestedValue;
    return true;
  }
  if (suggestion.fieldPath === 'identity.notes') {
    if (!shouldApplyProjectSuggestion(projectSpecifics.identity.notes, suggestion)) {
      return false;
    }
    projectSpecifics.identity.notes = suggestion.suggestedValue;
    return true;
  }
  if (suggestion.fieldPath === 'identity.archived') {
    if (!shouldApplyProjectSuggestion(projectSpecifics.identity.archived, suggestion)) {
      return false;
    }
    const booleanValue = parseProjectSuggestionBooleanValue(suggestion.suggestedValue);
    if (booleanValue == null) {
      return false;
    }
    projectSpecifics.identity.archived = booleanValue;
    return true;
  }
  if (suggestion.fieldPath === 'identity.mapSource') {
    if (!shouldApplyProjectSuggestion(projectSpecifics.identity.mapSource, suggestion)) {
      return false;
    }
    if (
      !(MULTI_PILE_PROJECT_MAP_SOURCES as readonly string[]).includes(suggestion.suggestedValue)
    ) {
      return false;
    }
    projectSpecifics.identity.mapSource =
      suggestion.suggestedValue as MultiPileProjectSpecifics['identity']['mapSource'];
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
  currentValue: string | number | boolean | null | undefined,
  suggestion: AiAssistantSuggestedField,
) {
  if (suggestion.applyMode === 'replace') {
    return true;
  }
  if (typeof currentValue === 'number') {
    return !Number.isFinite(currentValue);
  }
  if (typeof currentValue === 'boolean') {
    return false;
  }
  const normalized = currentValue?.toString().trim() ?? '';
  if (suggestion.fieldPath === 'reportMeta.reportTitle') {
    return isBlankOrDefaultProjectReportTitle(normalized);
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

function parseProjectSuggestionBooleanValue(value: string) {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === 'yes' || normalized === 'archived') {
    return true;
  }
  if (
    normalized === 'false' ||
    normalized === 'no' ||
    normalized === 'not archived' ||
    normalized === 'active'
  ) {
    return false;
  }

  return null;
}
