'use client';

import type {
  MultiPileProjectConcreteClass,
  MultiPileProjectCoverDurabilityClass,
  MultiPileProjectGeotechnicalMaterial,
  MultiPileProjectIdentity,
  MultiPileProjectReference,
  MultiPileProjectReinforcementGrade,
  MultiPileProjectSpecifics,
  MultiPileProjectTendonGrade,
} from '@eng/shared';
import {
  defaultProjectConcreteClass,
  defaultProjectCoverClass,
  defaultProjectReinforcementGrade,
  defaultProjectTendonGrade,
  normalizeProjectCoverClass,
  normalizeProjectReinforcementGrade,
  normalizeProjectTendonGrade,
  resolveProjectConcreteClass,
  resolveProjectTendonGrade,
} from '@eng/shared';

type StructuralLibrarySummary = {
  totalRows: number;
  activeRows: number;
  previewLabels: string[];
};

type ProjectGeotechnicalSummary = {
  activeReferenceTitle: string;
  hasGeotechnicalReferences: boolean;
  totalMaterials: number;
  activeMaterials: number;
  templateState: string;
  materialPreviewLabels: string[];
  groundwaterSummary: string;
  cfaUpliftSummary: string;
  socketAssumptionsSummary: string;
  foundingSummary: string;
  commentarySummary: string;
  arrValueSummary: string;
  arrBandSummary: string;
  phiGLowSummary: string;
  phiGHighSummary: string;
  testingSummary: string;
};

export type ProjectAssistantPrecision = {
  currentStateFacts: string[];
  exactMissingItems: string[];
  exactNextEdits: string[];
  sectionGaps: {
    standards: string[];
    projectDetails: string[];
    projectReferences: string[];
    structuralDefaults: string[];
    projectGeotechnical: string[];
  };
};

export function nextId(prefix: string) {
  const randomPart =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${randomPart}`;
}

export function nullableNumberFromInput(value: string) {
  if (!value.trim()) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function nullableNumberToInput(value: number | null | undefined) {
  return value == null ? '' : String(value);
}

export function selectGeotechnicalReferences(projectSpecifics: MultiPileProjectSpecifics) {
  return projectSpecifics.references.filter(
    (reference) => reference.active && reference.documentType === 'Geotechnical Report',
  );
}

export function selectActiveProjectReferences(projectSpecifics: MultiPileProjectSpecifics) {
  return projectSpecifics.references.filter((reference) => reference.active);
}

export function resolveProjectReferenceLabel(reference: MultiPileProjectReference) {
  return (
    reference.title || reference.referenceId || reference.documentNumber || 'Untitled reference'
  );
}

export function summarizeProjectReferences(projectSpecifics: MultiPileProjectSpecifics) {
  const activeReferences = selectActiveProjectReferences(projectSpecifics);
  const includedInReportCount = activeReferences.filter(
    (reference) => reference.includeInReport,
  ).length;
  const primaryGeotechnicalReference = activeReferences.find(
    (reference) => reference.primaryGeotechnical,
  );
  const primaryStructuralReference = activeReferences.find(
    (reference) => reference.primaryStructuralReference,
  );

  return {
    totalReferences: activeReferences.length,
    inactiveReferences: projectSpecifics.references.length - activeReferences.length,
    includedInReportCount,
    primaryGeotechnicalTitle: primaryGeotechnicalReference
      ? resolveProjectReferenceLabel(primaryGeotechnicalReference)
      : 'Not set',
    primaryStructuralTitle: primaryStructuralReference
      ? resolveProjectReferenceLabel(primaryStructuralReference)
      : 'Not set',
  };
}

export function summarizeProjectStructuralDefaults(projectSpecifics: MultiPileProjectSpecifics) {
  const { structuralDefaults } = projectSpecifics;
  const resolvedConcreteClasses = structuralDefaults.concreteClasses.map((row) =>
    resolveProjectConcreteClass(row).row,
  );
  const concreteClasses = summarizeStructuralLibrary(
    resolvedConcreteClasses,
    (row) =>
      row.displayName.trim() ||
      (row.fc_MPa != null ? `f'c ${row.fc_MPa} MPa` : '') ||
      row.sourceStandard.trim() ||
      'Concrete class',
  );
  const reinforcementGrades = summarizeStructuralLibrary(
    structuralDefaults.reinforcementGrades.map((row) => normalizeProjectReinforcementGrade(row)),
    (row) =>
      row.displayName.trim() ||
      row.designationGrade.trim() ||
      row.sourceStandard.trim() ||
      'Reinforcement grade',
  );
  const tendonGrades = summarizeStructuralLibrary(
    structuralDefaults.tendonGrades.map((row) => resolveProjectTendonGrade(row).row),
    (row) =>
      row.displayName.trim() ||
      row.tendonType.trim() ||
      row.sourceStandard.trim() ||
      'Tendon grade',
  );
  const coverDurabilityClasses = summarizeStructuralLibrary(
    structuralDefaults.coverDurabilityClasses.map((row) => normalizeProjectCoverClass(row)),
    (row) =>
      row.displayName.trim() ||
      row.exposureClass.trim() ||
      (row.nominalCover_mm != null ? `Cover ${row.nominalCover_mm} mm` : '') ||
      row.sourceStandard.trim() ||
      'Cover / durability class',
  );

  return {
    totalRows:
      concreteClasses.totalRows +
      reinforcementGrades.totalRows +
      tendonGrades.totalRows +
      coverDurabilityClasses.totalRows,
    activeRows:
      concreteClasses.activeRows +
      reinforcementGrades.activeRows +
      tendonGrades.activeRows +
      coverDurabilityClasses.activeRows,
    configuredLibraries: [
      concreteClasses,
      reinforcementGrades,
      tendonGrades,
      coverDurabilityClasses,
    ].filter((library) => library.totalRows > 0).length,
    concreteClasses,
    reinforcementGrades,
    tendonGrades,
    coverDurabilityClasses,
  };
}

export function selectProjectGeotechnicalMaterials(
  projectSpecifics: MultiPileProjectSpecifics,
  opts?: { includeAll?: boolean; selectedId?: string },
) {
  const selectedId = opts?.selectedId ?? '';
  return projectSpecifics.geotechnicalMaterials.materials.filter((material) => {
    if (opts?.includeAll) {
      return true;
    }
    if (selectedId && material.id === selectedId) {
      return true;
    }
    return material.includeInProject !== false;
  });
}

export function resolveProjectGeotechnicalMaterialLabel(
  material: Pick<MultiPileProjectGeotechnicalMaterial, 'id' | 'unitCode' | 'displayName'> | null,
) {
  if (!material) {
    return 'No project geotechnical material selected';
  }

  const unitCode = sanitizeProjectMaterialIdentityPart(material.unitCode);
  const displayName = sanitizeProjectMaterialIdentityPart(material.displayName);
  if (unitCode && displayName) {
    return `${unitCode} — ${displayName}`;
  }
  return unitCode || displayName || 'Material row';
}

function sanitizeProjectMaterialIdentityPart(value: string | null | undefined) {
  const normalized = value?.trim() ?? '';
  if (!normalized) {
    return '';
  }
  if (/^geo_[a-z0-9]+$/i.test(normalized)) {
    return '';
  }
  return normalized;
}

export function summarizeProjectGeotechnical(
  projectSpecifics: MultiPileProjectSpecifics,
): ProjectGeotechnicalSummary {
  const geotechnicalReferences = selectGeotechnicalReferences(projectSpecifics);
  const activeReference =
    geotechnicalReferences.find(
      (reference) => reference.id === projectSpecifics.geotechnicalMaterials.activeReferenceId,
    ) ?? null;
  const activeMaterials = selectProjectGeotechnicalMaterials(projectSpecifics);
  const totalMaterials = projectSpecifics.geotechnicalMaterials.materials.length;
  const arrAssessment = projectSpecifics.geotechnicalBasis.arrAssessment;

  return {
    activeReferenceTitle: activeReference
      ? resolveProjectReferenceLabel(activeReference)
      : geotechnicalReferences.length > 0
        ? 'No active geotechnical report selected'
        : 'No geotechnical report references yet',
    hasGeotechnicalReferences: geotechnicalReferences.length > 0,
    totalMaterials,
    activeMaterials: activeMaterials.length,
    templateState: projectSpecifics.geotechnicalMaterials.templateState,
    materialPreviewLabels: activeMaterials
      .map((material) => resolveProjectGeotechnicalMaterialLabel(material))
      .filter((label) => label.trim().length > 0)
      .slice(0, 3),
    groundwaterSummary:
      projectSpecifics.geotechnicalBasis.groundwaterDesignNotes.trim() || 'Not recorded',
    cfaUpliftSummary:
      projectSpecifics.geotechnicalBasis.cfaUpliftMode === 'ratio-to-compression'
        ? `Ratio to compression (${projectSpecifics.geotechnicalBasis.cfaUpliftFactor})`
        : 'Manual per-material tension values',
    socketAssumptionsSummary:
      projectSpecifics.geotechnicalBasis.defaultSocketAssumptions.trim() || 'Not recorded',
    foundingSummary: projectSpecifics.geotechnicalBasis.foundingNotes.trim() || 'Not recorded',
    commentarySummary: projectSpecifics.geotechnicalBasis.commentary.trim() || 'Not recorded',
    arrValueSummary: arrAssessment.arrValue.toFixed(3),
    arrBandSummary: arrAssessment.arrBand || 'Not recorded',
    phiGLowSummary: arrAssessment.phiGLow.toFixed(3),
    phiGHighSummary: arrAssessment.phiGHigh.toFixed(3),
    testingSummary:
      arrAssessment.testType === 'NONE'
        ? 'No testing'
        : `${arrAssessment.testType} at ${arrAssessment.testPilePercentage.toFixed(1)}%`,
  };
}

export function buildProjectAssistantPrecision({
  projectSpecifics,
  standardCount,
  isDirty,
}: {
  projectSpecifics: MultiPileProjectSpecifics;
  standardCount: number;
  isDirty: boolean;
}): ProjectAssistantPrecision {
  const standardsGaps =
    standardCount === 0 ? ['Standards: no standards are assigned to this project.'] : [];
  const projectDetailsGaps = buildProjectDetailsGapLines(projectSpecifics);
  const projectReferencesGaps = buildProjectReferenceGapLines(projectSpecifics);
  const structuralDefaultsGaps = buildStructuralDefaultGapLines(projectSpecifics);
  const projectGeotechnicalGaps = buildProjectGeotechnicalGapLines(projectSpecifics);
  const referencesSummary = summarizeProjectReferences(projectSpecifics);
  const structuralSummary = summarizeProjectStructuralDefaults(projectSpecifics);
  const geotechnicalSummary = summarizeProjectGeotechnical(projectSpecifics);

  const currentStateFacts = compactLines([
    'This page owns the project-wide details, references, structural default libraries, and geotechnical setup used across Multi-Pile.',
    `Project References: ${referencesSummary.totalReferences} active row${referencesSummary.totalReferences === 1 ? '' : 's'} on this page.`,
    `Project Structural Default Libraries: ${structuralSummary.configuredLibraries}/4 libraries are configured.`,
    `Project Geotechnical: ${geotechnicalSummary.activeMaterials} active material${geotechnicalSummary.activeMaterials === 1 ? '' : 's'} with active report ${geotechnicalSummary.activeReferenceTitle}.`,
    isDirty
      ? 'Edits on this page are currently draft-only until Save Project Details is used.'
      : 'This page is currently in a saved state until the next local edit.',
  ]);

  const exactMissingItems = compactLines([
    ...standardsGaps,
    ...projectDetailsGaps,
    ...projectReferencesGaps,
    ...structuralDefaultsGaps,
    ...projectGeotechnicalGaps,
  ]);

  const exactNextEdits = buildProjectAssistantNextEdits({
    projectSpecifics,
    isDirty,
    standardsGaps,
    projectDetailsGaps,
    projectReferencesGaps,
    structuralDefaultsGaps,
    projectGeotechnicalGaps,
  });

  return {
    currentStateFacts,
    exactMissingItems,
    exactNextEdits,
    sectionGaps: {
      standards: standardsGaps,
      projectDetails: projectDetailsGaps,
      projectReferences: projectReferencesGaps,
      structuralDefaults: structuralDefaultsGaps,
      projectGeotechnical: projectGeotechnicalGaps,
    },
  };
}

export function resolveSiteMapPreview(identity: MultiPileProjectIdentity) {
  const query = resolveSiteMapQuery(identity);
  const hasCoords = identity.latitude.trim().length > 0 && identity.longitude.trim().length > 0;

  return {
    label:
      identity.mapSource === 'coords'
        ? 'Using coordinates'
        : identity.mapSource === 'address'
          ? 'Using address'
          : hasCoords
            ? 'Auto-selected coordinates'
            : 'Auto-selected address',
    summary: query
      ? query
      : 'Add an address or latitude/longitude to create a site-map search target.',
    href: query
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
      : '',
    hasQuery: Boolean(query),
  };
}

export function resolveSiteMapQuery(identity: MultiPileProjectIdentity) {
  const trimmedAddress = identity.address.trim();
  const trimmedMapAddress = identity.mapAddress.trim();
  const trimmedLatitude = identity.latitude.trim();
  const trimmedLongitude = identity.longitude.trim();
  const hasCoords = trimmedLatitude.length > 0 && trimmedLongitude.length > 0;
  const addressQuery = trimmedMapAddress || trimmedAddress;
  const useCoords = identity.mapSource === 'coords' || (identity.mapSource === 'auto' && hasCoords);

  return useCoords ? `${trimmedLatitude}, ${trimmedLongitude}` : addressQuery;
}

export function resolveSiteMapEmbedUrl(identity: MultiPileProjectIdentity) {
  const query = resolveSiteMapQuery(identity);
  return query ? `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed` : '';
}

export function createEmptyProjectReference(): MultiPileProjectReference {
  return {
    id: nextId('ref'),
    referenceId: '',
    documentType: 'Other',
    title: '',
    documentNumber: '',
    revision: '',
    issueDate: '',
    authorOrganisation: '',
    notes: '',
    includeInReport: true,
    primaryGeotechnical: false,
    primaryStructuralReference: false,
    active: true,
  };
}

export function createEmptyConcreteClass(): MultiPileProjectConcreteClass {
  return defaultProjectConcreteClass({
    id: nextId('conc'),
  });
}

export function createEmptyReinforcementGrade(): MultiPileProjectReinforcementGrade {
  return normalizeProjectReinforcementGrade(
    defaultProjectReinforcementGrade({
      id: nextId('reo'),
    }),
  );
}

export function createEmptyTendonGrade(): MultiPileProjectTendonGrade {
  return normalizeProjectTendonGrade(
    defaultProjectTendonGrade({
      id: nextId('tendon'),
    }),
  );
}

export function createEmptyCoverClass(): MultiPileProjectCoverDurabilityClass {
  return normalizeProjectCoverClass(
    defaultProjectCoverClass({
      id: nextId('cover'),
    }),
  );
}

export function createEmptyGeotechnicalMaterial(): MultiPileProjectGeotechnicalMaterial {
  return {
    id: nextId('geo'),
    unitCode: '',
    displayName: '',
    sourceReferenceId: '',
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
    wallInterfaceActive: null,
    wallInterfacePassive: null,
    pile_fms_comp_kPa: null,
    pile_fms_tension_kPa: null,
    pile_fb_ult_kPa: null,
    pile_fms_allow_kPa: null,
    pile_fb_allow_kPa: null,
    cfaUpliftTensionFactor: null,
    includeInProject: true,
  };
}

function summarizeStructuralLibrary<T extends { active: boolean }>(
  rows: T[],
  resolveLabel: (row: T) => string,
): StructuralLibrarySummary {
  const activeRows = rows.filter((row) => row.active);
  const previewSource = activeRows.length > 0 ? activeRows : rows;
  const previewLabels = previewSource
    .map((row) => resolveLabel(row).trim())
    .filter((label) => label.length > 0)
    .slice(0, 3);

  return {
    totalRows: rows.length,
    activeRows: activeRows.length,
    previewLabels,
  };
}

function buildProjectDetailsGapLines(projectSpecifics: MultiPileProjectSpecifics) {
  const identityBlanks: string[] = [];
  if (isBlank(projectSpecifics.identity.client)) {
    identityBlanks.push('Client');
  }
  if (isBlank(projectSpecifics.identity.notes)) {
    identityBlanks.push('Project Notes');
  }

  const reportMetaBlanks: string[] = [];
  if (isBlankOrDefaultProjectReportTitle(projectSpecifics.reportMeta.reportTitle)) {
    reportMetaBlanks.push(
      projectSpecifics.reportMeta.reportTitle.trim() === 'Project Design Justification'
        ? 'Report Title (still on the default placeholder)'
        : 'Report Title',
    );
  }
  if (isBlank(projectSpecifics.reportMeta.reportRevision)) {
    reportMetaBlanks.push('Revision');
  }
  if (isBlank(projectSpecifics.reportMeta.issueDate)) {
    reportMetaBlanks.push('Issue Date');
  }
  if (isBlank(projectSpecifics.reportMeta.preparedBy)) {
    reportMetaBlanks.push('Prepared By');
  }
  if (isBlank(projectSpecifics.reportMeta.checkedBy)) {
    reportMetaBlanks.push('Checked By');
  }
  if (isBlank(projectSpecifics.reportMeta.purpose)) {
    reportMetaBlanks.push('Purpose');
  }

  return compactLines([
    identityBlanks.length > 0
      ? `Project Details: ${formatLabelList(identityBlanks)} ${identityBlanks.length === 1 ? 'is' : 'are'} blank.`
      : null,
    reportMetaBlanks.length > 0
      ? `Project Details: ${formatLabelList(reportMetaBlanks)} ${reportMetaBlanks.length === 1 ? 'is' : 'are'} blank.`
      : null,
  ]);
}

function buildProjectReferenceGapLines(projectSpecifics: MultiPileProjectSpecifics) {
  const activeReferences = selectActiveProjectReferences(projectSpecifics);
  if (activeReferences.length === 0) {
    return ['Project References: no active reference rows are recorded yet.'];
  }

  const rowGapLines = activeReferences
    .map((reference, index) => {
      const missingFields: string[] = [];
      if (isBlank(reference.title)) {
        missingFields.push('Title');
      }
      if (isBlank(reference.documentNumber)) {
        missingFields.push('Document Number / Filename');
      }
      if (isBlank(reference.revision)) {
        missingFields.push('Revision');
      }
      if (isBlank(reference.issueDate)) {
        missingFields.push('Issue Date');
      }
      if (isBlank(reference.authorOrganisation)) {
        missingFields.push('Author / Organisation');
      }
      if (
        (reference.primaryGeotechnical || reference.primaryStructuralReference || reference.includeInReport) &&
        isBlank(reference.notes)
      ) {
        missingFields.push('Notes');
      }

      if (missingFields.length === 0) {
        return null;
      }

      return `Project References: ${describeReferenceRow(reference, index)} is missing ${formatLabelList(
        missingFields,
        5,
      )}.`;
    })
    .filter((line): line is string => line !== null);

  const activeGeotechnicalReferences = activeReferences.filter(
    (reference) => reference.documentType === 'Geotechnical Report',
  );
  const activeStructuralReferences = activeReferences.filter(
    (reference) => reference.documentType === 'Structural Drawing',
  );

  return compactLines([
    ...rowGapLines.slice(0, 3),
    rowGapLines.length > 3
      ? `Project References: ${rowGapLines.length - 3} more active reference row${rowGapLines.length - 3 === 1 ? '' : 's'} still have blank fields.`
      : null,
    activeGeotechnicalReferences.length === 0
      ? 'Project References: no active Geotechnical Report row is recorded yet.'
      : activeGeotechnicalReferences.some((reference) => reference.primaryGeotechnical)
        ? null
        : 'Project References: Primary geotechnical reference is not selected.'
      ,
    activeStructuralReferences.length === 0
      ? 'Project References: no active Structural Drawing row is recorded yet.'
      : activeStructuralReferences.some((reference) => reference.primaryStructuralReference)
        ? null
        : 'Project References: Primary structural reference is not selected.'
      ,
  ]);
}

function buildStructuralDefaultGapLines(projectSpecifics: MultiPileProjectSpecifics) {
  const summary = summarizeProjectStructuralDefaults(projectSpecifics);
  const noRows: string[] = [];
  const noActiveRows: string[] = [];

  collectStructuralLibraryGap(summary.concreteClasses, 'Concrete Classes', noRows, noActiveRows);
  collectStructuralLibraryGap(
    summary.reinforcementGrades,
    'Reinforcement Grades',
    noRows,
    noActiveRows,
  );
  collectStructuralLibraryGap(summary.tendonGrades, 'Tendon Grades', noRows, noActiveRows);
  collectStructuralLibraryGap(
    summary.coverDurabilityClasses,
    'Cover / Durability Classes',
    noRows,
    noActiveRows,
  );

  return compactLines([
    noRows.length > 0
      ? `Project Structural Default Libraries: ${formatLabelList(noRows)} ${noRows.length === 1 ? 'has' : 'have'} no rows.`
      : null,
    noActiveRows.length > 0
      ? `Project Structural Default Libraries: ${formatLabelList(noActiveRows)} ${noActiveRows.length === 1 ? 'has' : 'have'} rows but none are active.`
      : null,
  ]);
}

function buildProjectGeotechnicalGapLines(projectSpecifics: MultiPileProjectSpecifics) {
  const summary = summarizeProjectGeotechnical(projectSpecifics);
  const noteBlanks: string[] = [];
  if (isBlank(projectSpecifics.geotechnicalBasis.groundwaterDesignNotes)) {
    noteBlanks.push('Groundwater Design Notes');
  }
  if (isBlank(projectSpecifics.geotechnicalBasis.defaultSocketAssumptions)) {
    noteBlanks.push('Default Socket Design Assumptions');
  }
  if (isBlank(projectSpecifics.geotechnicalBasis.foundingNotes)) {
    noteBlanks.push('Project-Level Founding Notes');
  }
  if (isBlank(projectSpecifics.geotechnicalBasis.commentary)) {
    noteBlanks.push('Project Geotechnical Commentary');
  }

  const incompleteMaterialLines = projectSpecifics.geotechnicalMaterials.materials
    .map((material, index) => buildIncompleteMaterialGapLine(material, index))
    .filter((line): line is string => line !== null);

  return compactLines([
    !summary.hasGeotechnicalReferences
      ? 'Project Geotechnical: no geotechnical report reference is available yet.'
      : summary.activeReferenceTitle === 'No active geotechnical report selected'
        ? 'Project Geotechnical: Active Geotechnical Report is not selected.'
        : null,
    projectSpecifics.geotechnicalMaterials.materials.length === 0
      ? 'Project Geotechnical: no project geotechnical material rows exist yet.'
      : null,
    ...incompleteMaterialLines.slice(0, 2),
    incompleteMaterialLines.length > 2
      ? `Project Geotechnical: ${incompleteMaterialLines.length - 2} more material row${incompleteMaterialLines.length - 2 === 1 ? '' : 's'} still have blank fields.`
      : null,
    noteBlanks.length > 0
      ? `Project Geotechnical: ${formatLabelList(noteBlanks)} ${noteBlanks.length === 1 ? 'is' : 'are'} blank.`
      : null,
  ]);
}

function buildIncompleteMaterialGapLine(
  material: MultiPileProjectGeotechnicalMaterial,
  index: number,
) {
  const missingIdentityAndProvenance: string[] = [];
  if (isBlank(material.unitCode)) {
    missingIdentityAndProvenance.push('Material / Unit Code');
  }
  if (isBlank(material.displayName)) {
    missingIdentityAndProvenance.push('Material / Unit Name');
  }
  if (isBlank(material.sourceDocument)) {
    missingIdentityAndProvenance.push('Source Document');
  }
  if (isBlank(material.sourceSection)) {
    missingIdentityAndProvenance.push('Source Section');
  }
  if (isBlank(material.sourceTable)) {
    missingIdentityAndProvenance.push('Source Table');
  }

  const missingParameters = [
    material.gamma_b == null ? 'gamma_b' : null,
    material.phi_prime == null ? "phi'" : null,
    material.c_prime == null ? "c'" : null,
    material.cu == null ? 'c_u' : null,
    material.E_MPa == null ? 'E' : null,
    material.nu == null ? 'nu' : null,
    material.Ka == null ? 'K_a' : null,
    material.Ko == null ? 'K_o' : null,
    material.Kp == null ? 'K_p' : null,
    material.pile_fms_comp_kPa == null ? 'f_m,s comp.' : null,
    material.pile_fms_tension_kPa == null ? 'f_m,s tension' : null,
    material.pile_fb_ult_kPa == null ? 'f_b ult.' : null,
  ].filter((label): label is string => label !== null);

  if (missingIdentityAndProvenance.length === 0 && missingParameters.length === 0) {
    return null;
  }

  const rowLabel = `Material ${index + 1} (${resolveProjectGeotechnicalMaterialLabel(material)})`;
  const segments = [
    missingIdentityAndProvenance.length > 0
      ? `identity / provenance blanks: ${formatLabelList(missingIdentityAndProvenance, 5)}`
      : null,
    missingParameters.length > 0
      ? `parameter blanks: ${formatLabelList(missingParameters, 6)}`
      : null,
  ].filter((segment): segment is string => segment !== null);

  return `Project Geotechnical: ${rowLabel} has ${segments.join('; ')}.`;
}

function buildProjectAssistantNextEdits({
  projectSpecifics,
  isDirty,
  standardsGaps,
  projectDetailsGaps,
  projectReferencesGaps,
  structuralDefaultsGaps,
  projectGeotechnicalGaps,
}: {
  projectSpecifics: MultiPileProjectSpecifics;
  isDirty: boolean;
  standardsGaps: string[];
  projectDetailsGaps: string[];
  projectReferencesGaps: string[];
  structuralDefaultsGaps: string[];
  projectGeotechnicalGaps: string[];
}) {
  const detailsTargets: string[] = [];
  if (isBlank(projectSpecifics.identity.client)) {
    detailsTargets.push('Client');
  }
  if (isBlank(projectSpecifics.identity.notes)) {
    detailsTargets.push('Project Notes');
  }
  if (isBlankOrDefaultProjectReportTitle(projectSpecifics.reportMeta.reportTitle)) {
    detailsTargets.push('Report Title');
  }
  if (isBlank(projectSpecifics.reportMeta.reportRevision)) {
    detailsTargets.push('Revision');
  }
  if (isBlank(projectSpecifics.reportMeta.issueDate)) {
    detailsTargets.push('Issue Date');
  }
  if (isBlank(projectSpecifics.reportMeta.preparedBy)) {
    detailsTargets.push('Prepared By');
  }
  if (isBlank(projectSpecifics.reportMeta.checkedBy)) {
    detailsTargets.push('Checked By');
  }
  if (isBlank(projectSpecifics.reportMeta.purpose)) {
    detailsTargets.push('Purpose');
  }

  const activeReferences = selectActiveProjectReferences(projectSpecifics);
  const activeGeotechnicalReferences = activeReferences.filter(
    (reference) => reference.documentType === 'Geotechnical Report',
  );
  const activeStructuralReferences = activeReferences.filter(
    (reference) => reference.documentType === 'Structural Drawing',
  );
  const referenceEditLine =
    activeReferences.length === 0
      ? 'Project References: add the first geotechnical and structural reference rows.'
      : activeGeotechnicalReferences.length === 0 || activeStructuralReferences.length === 0
        ? 'Project References: add the missing geotechnical or structural reference rows, then mark the primary references.'
        : 'Project References: complete the blank reference fields, then mark the primary geotechnical and structural references.';

  const structuralTargets: string[] = [];
  const structuralSummary = summarizeProjectStructuralDefaults(projectSpecifics);
  if (structuralSummary.concreteClasses.totalRows === 0) {
    structuralTargets.push('add Concrete Classes');
  } else if (structuralSummary.concreteClasses.activeRows === 0) {
    structuralTargets.push('activate a Concrete Classes row');
  }
  if (structuralSummary.reinforcementGrades.totalRows === 0) {
    structuralTargets.push('add Reinforcement Grades');
  } else if (structuralSummary.reinforcementGrades.activeRows === 0) {
    structuralTargets.push('activate a Reinforcement Grades row');
  }
  if (structuralSummary.tendonGrades.totalRows === 0) {
    structuralTargets.push('add Tendon Grades');
  } else if (structuralSummary.tendonGrades.activeRows === 0) {
    structuralTargets.push('activate a Tendon Grades row');
  }
  if (structuralSummary.coverDurabilityClasses.totalRows === 0) {
    structuralTargets.push('add Cover / Durability Classes');
  } else if (structuralSummary.coverDurabilityClasses.activeRows === 0) {
    structuralTargets.push('activate a Cover / Durability Classes row');
  }

  const geotechnicalTargets: string[] = [];
  const geotechnicalSummary = summarizeProjectGeotechnical(projectSpecifics);
  if (!geotechnicalSummary.hasGeotechnicalReferences) {
    geotechnicalTargets.push('add a geotechnical report row in Project References');
  } else if (geotechnicalSummary.activeReferenceTitle === 'No active geotechnical report selected') {
    geotechnicalTargets.push('select the Active Geotechnical Report');
  }
  if (isBlank(projectSpecifics.geotechnicalBasis.groundwaterDesignNotes)) {
    geotechnicalTargets.push('fill Groundwater Design Notes');
  }
  if (isBlank(projectSpecifics.geotechnicalBasis.defaultSocketAssumptions)) {
    geotechnicalTargets.push('fill Default Socket Design Assumptions');
  }
  if (isBlank(projectSpecifics.geotechnicalBasis.foundingNotes)) {
    geotechnicalTargets.push('fill Project-Level Founding Notes');
  }
  if (isBlank(projectSpecifics.geotechnicalBasis.commentary)) {
    geotechnicalTargets.push('fill Project Geotechnical Commentary');
  }
  const firstIncompleteMaterial = projectSpecifics.geotechnicalMaterials.materials.find(
    (material, index) => buildIncompleteMaterialGapLine(material, index) !== null,
  );
  if (firstIncompleteMaterial) {
    geotechnicalTargets.push(
      `complete ${resolveProjectGeotechnicalMaterialLabel(firstIncompleteMaterial)} provenance and parameter fields`,
    );
  } else if (projectSpecifics.geotechnicalMaterials.materials.length === 0) {
    geotechnicalTargets.push('add the first project geotechnical material row');
  }

  return compactLines([
    isDirty ? 'Save Project Details after reviewing the current draft edits.' : null,
    standardsGaps.length > 0
      ? 'Open Standards and assign the governing standards for this project before relying on project defaults downstream.'
      : null,
    projectDetailsGaps.length > 0
      ? `Project Details: fill ${formatLabelList(detailsTargets, 6)}.`
      : null,
    projectReferencesGaps.length > 0 ? referenceEditLine : null,
    structuralDefaultsGaps.length > 0
      ? `Project Structural Default Libraries: ${formatActionList(structuralTargets, 4)}.`
      : null,
    projectGeotechnicalGaps.length > 0
      ? `Project Geotechnical: ${formatActionList(geotechnicalTargets, 4)}.`
      : null,
  ]);
}

function collectStructuralLibraryGap(
  library: StructuralLibrarySummary,
  label: string,
  noRows: string[],
  noActiveRows: string[],
) {
  if (library.totalRows === 0) {
    noRows.push(label);
    return;
  }

  if (library.activeRows === 0) {
    noActiveRows.push(label);
  }
}

function describeReferenceRow(reference: MultiPileProjectReference, index: number) {
  const label = resolveProjectReferenceLabel(reference);
  return label === 'Untitled reference'
    ? `Reference ${index + 1}`
    : `Reference ${index + 1} (${label})`;
}

function formatLabelList(labels: string[], limit = labels.length) {
  const visibleLabels = labels.slice(0, limit);
  const remainder = labels.length - visibleLabels.length;
  if (visibleLabels.length === 0) {
    return '';
  }
  if (visibleLabels.length === 1) {
    return remainder > 0
      ? `${visibleLabels[0]} (+${remainder} more)`
      : visibleLabels[0];
  }
  if (visibleLabels.length === 2) {
    return remainder > 0
      ? `${visibleLabels[0]}, ${visibleLabels[1]} (+${remainder} more)`
      : `${visibleLabels[0]} and ${visibleLabels[1]}`;
  }

  const head = visibleLabels.slice(0, -1).join(', ');
  const tail = visibleLabels[visibleLabels.length - 1];
  return remainder > 0 ? `${head}, ${tail} (+${remainder} more)` : `${head}, and ${tail}`;
}

function formatActionList(actions: string[], limit = actions.length) {
  const visibleActions = actions.slice(0, limit);
  if (visibleActions.length === 0) {
    return 'review the remaining blank fields';
  }
  if (visibleActions.length === 1) {
    return visibleActions[0];
  }
  if (visibleActions.length === 2) {
    return `${visibleActions[0]} and ${visibleActions[1]}`;
  }
  return `${visibleActions.slice(0, -1).join(', ')}, and ${visibleActions[visibleActions.length - 1]}`;
}

function compactLines(values: Array<string | null | undefined>) {
  return values.filter((value): value is string => Boolean(value && value.trim()));
}

function isBlank(value: string | null | undefined) {
  return (value?.trim() ?? '').length === 0;
}

function isBlankOrDefaultProjectReportTitle(value: string | null | undefined) {
  const normalized = value?.trim() ?? '';
  return normalized.length === 0 || normalized === 'Project Design Justification';
}
