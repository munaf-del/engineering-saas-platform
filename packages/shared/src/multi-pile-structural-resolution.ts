import {
  DEFAULT_PROJECT_STRUCTURAL_CONCRETE_CLASS_ID,
  concreteEcFromFc,
  projectConcretePresetMatchId,
  resolveProjectConcreteClass,
} from './project-structural-concrete.js';
import {
  DEFAULT_PROJECT_STRUCTURAL_COVER_CLASS_ID,
  DEFAULT_PROJECT_STRUCTURAL_REINFORCEMENT_GRADE_ID,
  normalizeProjectCoverClass,
  normalizeProjectReinforcementGrade,
  projectCoverClassMatchId,
  projectReinforcementGradeMatchId,
  projectTendonPresetMatchId,
  resolveProjectTendonGrade,
} from './project-structural-default-libraries.js';
import type {
  MultiPileProjectCoverDurabilityClass,
  MultiPileProjectConcreteClass,
  MultiPileProjectReinforcementGrade,
  MultiPileProjectSpecifics,
  MultiPileProjectTendonGrade,
} from './types/multi-pile.js';

const DEFAULT_STRUCTURAL_FC_MPA = 32;
const DEFAULT_STRUCTURAL_FSY_MPA = 500;
const DEFAULT_STRUCTURAL_ES_MPA = 200000;
const DEFAULT_STRUCTURAL_COVER_MM = 75;

type RawStructSettings = Record<string, unknown>;

export type MultiPileStructProjectAssignmentIds = {
  concreteClassId: string;
  reinforcementGradeId: string;
  tendonGradeId: string;
  coverDurabilityClassId: string;
};

type ResolvedRow<T extends { id: string; active: boolean; displayName: string }> = {
  row: T;
  canonicalId: string;
};

export function resolveMultiPileStructProjectAssignmentIds(
  rawSettings: unknown,
  projectSpecifics: Pick<MultiPileProjectSpecifics, 'structuralDefaults'> | null | undefined,
): MultiPileStructProjectAssignmentIds {
  const source = objectValue(rawSettings);
  const structuralDefaults = objectValue(projectSpecifics?.structuralDefaults);
  const concreteRows = (Array.isArray(structuralDefaults.concreteClasses)
    ? structuralDefaults.concreteClasses
    : []
  ).map((row) => {
    const resolved = resolveProjectConcreteClass(row).row;
    return {
      row: resolved,
      canonicalId:
        stringValue(resolved.standardProfileId) || projectConcretePresetMatchId(resolved) || '',
    };
  });
  const reinforcementRows = (Array.isArray(structuralDefaults.reinforcementGrades)
    ? structuralDefaults.reinforcementGrades
    : []
  ).map((row) => {
    const resolved = normalizeProjectReinforcementGrade(row);
    return {
      row: resolved,
      canonicalId: projectReinforcementGradeMatchId(resolved) || '',
    };
  });
  const tendonRows = (Array.isArray(structuralDefaults.tendonGrades)
    ? structuralDefaults.tendonGrades
    : []
  ).map((row) => {
    const resolved = resolveProjectTendonGrade(row).row;
    return {
      row: resolved,
      canonicalId:
        stringValue(resolved.standardProfileId) || projectTendonPresetMatchId(resolved) || '',
    };
  });
  const coverRows = (Array.isArray(structuralDefaults.coverDurabilityClasses)
    ? structuralDefaults.coverDurabilityClasses
    : []
  ).map((row) => {
    const resolved = normalizeProjectCoverClass(row);
    return {
      row: resolved,
      canonicalId: projectCoverClassMatchId(resolved) || '',
    };
  });

  const concreteClassId =
    matchConcreteClassId(source, concreteRows) ||
    preserveUnresolvedId(source.concreteClassId, DEFAULT_PROJECT_STRUCTURAL_CONCRETE_CLASS_ID);
  const reinforcementGradeId =
    matchReinforcementGradeId(source, reinforcementRows) ||
    preserveUnresolvedId(
      source.reinforcementGradeId,
      DEFAULT_PROJECT_STRUCTURAL_REINFORCEMENT_GRADE_ID,
    );
  const tendonGradeId =
    matchTendonGradeId(source, tendonRows) || preserveUnresolvedId(source.tendonGradeId);
  const coverDurabilityClassId =
    matchCoverClassId(source, coverRows) ||
    preserveUnresolvedId(
      source.coverDurabilityClassId ?? source.coverClassId,
      DEFAULT_PROJECT_STRUCTURAL_COVER_CLASS_ID,
    );

  return {
    concreteClassId,
    reinforcementGradeId,
    tendonGradeId,
    coverDurabilityClassId,
  };
}

export function hydrateMultiPileStructTypeSettingsWithProjectAssignments(
  rawSettings: unknown,
  projectSpecifics: Pick<MultiPileProjectSpecifics, 'structuralDefaults'> | null | undefined,
): Record<string, unknown> {
  const source = objectValue(rawSettings);
  const assignments = resolveMultiPileStructProjectAssignmentIds(source, projectSpecifics);
  return {
    ...source,
    concreteClassId: assignments.concreteClassId,
    reinforcementGradeId: assignments.reinforcementGradeId,
    tendonGradeId: assignments.tendonGradeId,
    coverDurabilityClassId: assignments.coverDurabilityClassId,
  };
}

function matchConcreteClassId(
  source: RawStructSettings,
  rows: Array<ResolvedRow<MultiPileProjectConcreteClass>>,
) {
  if (rows.length === 0) {
    return '';
  }

  const selectedIdMatch = exactRowIdMatch(rows, source.concreteClassId);
  if (selectedIdMatch) {
    return selectedIdMatch.id;
  }

  const exactHints = uniqueStrings([
    source.concreteClassId,
    source.standardProfileId,
    source.profileId,
    source.designClassId,
    source.projectStructuralMaterialId,
  ]);
  const displayHints = uniqueStrings([source.concreteClassLabel, source.displayName]);
  const fc = concreteStrengthValue(source);
  const ec = concreteEcValue(source, fc);
  const canonicalHint =
    projectConcretePresetMatchId({
      id: exactHints[0],
      standardProfileId: exactHints[0],
      displayName: displayHints[0],
      fc_MPa: fc,
      Ec_MPa: ec,
    }) || '';

  for (const hint of exactHints) {
    const exactMatch = uniqueMatch(
      rows,
      hint,
      (row, value) =>
        row.id === value ||
        stringValue(row.standardProfileId) === value ||
        row.id === `conc_${value}` ||
        stringValue(row.standardProfileId) === `conc_${value}`,
      { allowInactive: true },
    );
    if (exactMatch) {
      return exactMatch.id;
    }
  }

  for (const hint of displayHints) {
    const displayMatch = uniqueMatch(rows, hint, (row, value) => normalizedText(row.displayName) === normalizedText(value));
    if (displayMatch) {
      return displayMatch.id;
    }
  }

  if (canonicalHint) {
    const canonicalMatch = uniqueMatch(
      rows,
      canonicalHint,
      (row, value, candidate) =>
        row.id === value ||
        stringValue(row.standardProfileId) === value ||
        candidate.canonicalId === value,
    );
    if (canonicalMatch) {
      return canonicalMatch.id;
    }
  }

  const numericStrict = uniqueMatch(
    rows,
    '',
    (row) => approxEqual(row.fc_MPa, fc, 1e-3) && approxEqual(row.Ec_MPa, ec, 1),
  );
  if (numericStrict) {
    return numericStrict.id;
  }

  const numericFcOnly = uniqueMatch(rows, '', (row) => approxEqual(row.fc_MPa, fc, 1e-3));
  return numericFcOnly?.id ?? '';
}

function matchReinforcementGradeId(
  source: RawStructSettings,
  rows: Array<ResolvedRow<MultiPileProjectReinforcementGrade>>,
) {
  if (rows.length === 0) {
    return '';
  }

  const selectedIdMatch = exactRowIdMatch(rows, source.reinforcementGradeId);
  if (selectedIdMatch) {
    return selectedIdMatch.id;
  }

  const exactHints = uniqueStrings([
    source.reinforcementGradeId,
    source.designationGrade,
    source.displayName,
    source.designClassId,
    source.projectStructuralMaterialId,
  ]);
  const fsy = numberValue(source.fsy, DEFAULT_STRUCTURAL_FSY_MPA, 250);
  const es = numberValue(source.Es, DEFAULT_STRUCTURAL_ES_MPA, 100000);
  const canonicalHint =
    projectReinforcementGradeMatchId({
      id: source.reinforcementGradeId ?? source.designClassId ?? source.projectStructuralMaterialId,
      displayName: source.displayName,
      designationGrade:
        source.designationGrade ??
        reinforcementDesignationFromHint(
          source.reinforcementGradeId ?? source.designClassId ?? source.projectStructuralMaterialId,
        ),
      fsy_MPa: fsy,
      Es_MPa: es,
      esu: source.esu,
      ductilityClass: source.ductilityClass,
      thermalExpansionPerDegC: source.thermalExpansionPerDegC,
    }) ||
    (approxEqual(fsy, DEFAULT_STRUCTURAL_FSY_MPA, 1e-3) &&
    approxEqual(es, DEFAULT_STRUCTURAL_ES_MPA, 1)
      ? DEFAULT_PROJECT_STRUCTURAL_REINFORCEMENT_GRADE_ID
      : '');

  for (const hint of exactHints) {
    const exactMatch = uniqueMatch(
      rows,
      hint,
      (row, value, candidate) =>
        row.id === value ||
        row.id === `reo_${value}` ||
        candidate.canonicalId === value ||
        normalizedText(row.displayName) === normalizedText(value) ||
        designationKey(row.designationGrade) === designationKey(value),
      { allowInactive: true },
    );
    if (exactMatch) {
      return exactMatch.id;
    }
  }

  if (canonicalHint) {
    const canonicalMatch = uniqueMatch(
      rows,
      canonicalHint,
      (row, value, candidate) =>
        row.id === value || candidate.canonicalId === value,
    );
    if (canonicalMatch) {
      return canonicalMatch.id;
    }
  }

  const numericStrict = uniqueMatch(
    rows,
    '',
    (row) => approxEqual(row.fsy_MPa, fsy, 1e-3) && approxEqual(row.Es_MPa, es, 1),
  );
  return numericStrict?.id ?? '';
}

function matchTendonGradeId(
  source: RawStructSettings,
  rows: Array<ResolvedRow<MultiPileProjectTendonGrade>>,
) {
  if (rows.length === 0) {
    return '';
  }

  const selectedIdMatch = exactRowIdMatch(rows, source.tendonGradeId);
  if (selectedIdMatch) {
    return selectedIdMatch.id;
  }

  const exactHints = uniqueStrings([source.tendonGradeId, source.displayName, source.standardProfileId]);
  const canonicalHint =
    projectTendonPresetMatchId({
      id: source.tendonGradeId,
      standardProfileId: source.standardProfileId,
      displayName: source.displayName,
      tendonType: source.tendonType,
      nominalDiameter_mm: source.nominalDiameter_mm,
      area_mm2: source.area_mm2,
      fpb_kN: source.fpb_kN,
      fpb_MPa: source.fpb_MPa,
      fpy_MPa: source.fpy_MPa,
      Ep_MPa: source.Ep_MPa,
    }) || '';

  for (const hint of exactHints) {
    const exactMatch = uniqueMatch(
      rows,
      hint,
      (row, value, candidate) =>
        row.id === value ||
        stringValue(row.standardProfileId) === value ||
        candidate.canonicalId === value ||
        normalizedText(row.displayName) === normalizedText(value),
      { allowInactive: true },
    );
    if (exactMatch) {
      return exactMatch.id;
    }
  }

  if (canonicalHint) {
    const canonicalMatch = uniqueMatch(
      rows,
      canonicalHint,
      (row, value, candidate) =>
        row.id === value ||
        stringValue(row.standardProfileId) === value ||
        candidate.canonicalId === value,
    );
    if (canonicalMatch) {
      return canonicalMatch.id;
    }
  }

  return '';
}

function matchCoverClassId(
  source: RawStructSettings,
  rows: Array<ResolvedRow<MultiPileProjectCoverDurabilityClass>>,
) {
  if (rows.length === 0) {
    return '';
  }

  const selectedIdMatch =
    exactRowIdMatch(rows, source.coverDurabilityClassId) ?? exactRowIdMatch(rows, source.coverClassId);
  if (selectedIdMatch) {
    return selectedIdMatch.id;
  }

  const explicitIdHints = uniqueStrings([
    source.coverDurabilityClassId,
    source.coverClassId,
  ]);
  const legacyIdHints = uniqueStrings([
    source.standardProfileId,
    source.profileId,
    source.designClassId,
    source.projectStructuralMaterialId,
  ]);
  const labelHints = uniqueStrings([
    source.displayName,
    source.coverClassLabel,
    source.defaultCoverClass,
    source.label,
  ]);
  const cover = numberValue(source.cover, DEFAULT_STRUCTURAL_COVER_MM, 0);
  const canonicalHint =
    projectCoverClassMatchId({
      id:
        source.coverDurabilityClassId ??
        source.coverClassId ??
        source.standardProfileId ??
        source.profileId ??
        source.designClassId ??
        source.projectStructuralMaterialId,
      displayName:
        source.displayName ??
        source.coverClassLabel ??
        source.defaultCoverClass ??
        source.label,
      designLifeYears: source.designLifeYears,
      exposureClass: source.exposureClass ?? source.exposureClassification,
      minCoverCastInPlace_mm: source.minCoverCastInPlace_mm ?? source.nominalCover_mm ?? cover,
      nominalCover_mm: source.nominalCover_mm ?? cover,
      crackWidthLimit_mm: source.crackWidthLimit_mm,
      minConcreteStrengthCastInPlace_MPa:
        source.minConcreteStrengthCastInPlace_MPa ?? source.minConcreteStrength_MPa,
      minConcreteStrengthPrecast_MPa:
        source.minConcreteStrengthPrecast_MPa ?? source.minConcreteStrength_MPa,
    }) ||
    (approxEqual(cover, DEFAULT_STRUCTURAL_COVER_MM, 1e-3)
      ? DEFAULT_PROJECT_STRUCTURAL_COVER_CLASS_ID
      : '');

  for (const hint of explicitIdHints) {
    const exactMatch = uniqueMatch(
      rows,
      hint,
      (row, value, candidate) =>
        row.id === value ||
        row.id === `cover_${value}` ||
        candidate.canonicalId === value,
      { allowInactive: true },
    );
    if (exactMatch) {
      return exactMatch.id;
    }
  }

  for (const hint of legacyIdHints) {
    const legacyMatch = uniqueMatch(
      rows,
      hint,
      (row, value, candidate) =>
        row.id === value ||
        row.id === `cover_${value}` ||
        candidate.canonicalId === value,
      { allowInactive: true },
    );
    if (legacyMatch) {
      return legacyMatch.id;
    }
  }

  for (const hint of labelHints) {
    const labelMatch = uniqueMatch(
      rows,
      hint,
      (row, value) => normalizedText(row.displayName) === normalizedText(value),
    );
    if (labelMatch) {
      return labelMatch.id;
    }
  }

  if (canonicalHint) {
    const canonicalMatch = uniqueMatch(
      rows,
      canonicalHint,
      (row, value, candidate) => row.id === value || candidate.canonicalId === value,
    );
    if (canonicalMatch) {
      return canonicalMatch.id;
    }
  }

  const fieldComboMatch = uniqueMatch(rows, '', (row) =>
    coverClassMatchesSourceFields(row, source),
  );
  if (fieldComboMatch) {
    return fieldComboMatch.id;
  }

  const coverMatch = uniqueMatch(
    rows,
    '',
    (row) =>
      approxEqual(
        row.minCoverCastInPlace_mm ?? row.nominalCover_mm,
        cover,
        1e-3,
      ) || approxEqual(row.nominalCover_mm, cover, 1e-3),
  );
  return coverMatch?.id ?? '';
}

function coverClassMatchesSourceFields(
  row: MultiPileProjectCoverDurabilityClass,
  source: RawStructSettings,
) {
  const designLifeYears = numericCandidate(source.designLifeYears);
  const exposureClass = normalizedText(source.exposureClass ?? source.exposureClassification);
  const minConcreteStrengthPrecast = strengthText(
    source.minConcreteStrengthPrecast_MPa ?? source.minConcreteStrengthPrecastMPa,
  );
  const minConcreteStrengthCastInPlace = strengthText(
    source.minConcreteStrengthCastInPlace_MPa ??
      source.minConcreteStrengthCastInPlaceMPa ??
      source.minConcreteStrength_MPa,
  );
  const minCoverPrecast = numericCandidate(source.minCoverPrecast_mm);
  const nominalCover = numericCandidate(
    source.minCoverCastInPlace_mm ?? source.nominalCover_mm ?? source.nominalCoverMm,
  );
  const crackWidthLimit = numericCandidate(
    source.crackWidthLimit_mm ?? source.crackWidthLimitMm,
  );

  const hasFieldComboHint =
    designLifeYears != null ||
    exposureClass.length > 0 ||
    minConcreteStrengthPrecast.length > 0 ||
    minConcreteStrengthCastInPlace.length > 0 ||
    minCoverPrecast != null ||
    nominalCover != null ||
    crackWidthLimit != null;

  if (!hasFieldComboHint) {
    return false;
  }

  if (
    designLifeYears != null &&
    !approxEqual(row.designLifeYears, designLifeYears, 1e-3)
  ) {
    return false;
  }

  if (
    exposureClass &&
    normalizedText(row.exposureClass || row.exposureClassification) !== exposureClass
  ) {
    return false;
  }

  if (
    minConcreteStrengthPrecast &&
    strengthText(row.minConcreteStrengthPrecast_MPa || row.minConcreteStrength_MPa) !==
      minConcreteStrengthPrecast
  ) {
    return false;
  }

  if (
    minConcreteStrengthCastInPlace &&
    strengthText(row.minConcreteStrengthCastInPlace_MPa || row.minConcreteStrength_MPa) !==
      minConcreteStrengthCastInPlace
  ) {
    return false;
  }

  if (
    minCoverPrecast != null &&
    !approxEqual(row.minCoverPrecast_mm, minCoverPrecast, 1e-3)
  ) {
    return false;
  }

  if (
    nominalCover != null &&
    !approxEqual(row.minCoverCastInPlace_mm ?? row.nominalCover_mm, nominalCover, 1e-3) &&
    !approxEqual(row.nominalCover_mm, nominalCover, 1e-3)
  ) {
    return false;
  }

  if (
    crackWidthLimit != null &&
    !approxEqual(row.crackWidthLimit_mm, crackWidthLimit, 1e-3)
  ) {
    return false;
  }

  return true;
}

function strengthText(value: unknown) {
  return stringValue(value).replace(/\s+/g, ' ').trim().toLowerCase();
}

function uniqueMatch<T extends { id: string; active: boolean; displayName: string }>(
  rows: Array<ResolvedRow<T>>,
  hint: string,
  predicate: (row: T, hint: string, candidate: ResolvedRow<T>) => boolean,
  options?: { allowInactive?: boolean },
) {
  const sourceRows =
    options?.allowInactive
      ? rows
      : activeRows(rows);
  const matches = sourceRows.filter((candidate) => predicate(candidate.row, hint, candidate));
  return matches.length === 1 ? (matches[0]?.row ?? null) : null;
}

function activeRows<T extends { active: boolean; id: string; displayName: string }>(
  rows: Array<ResolvedRow<T>>,
) {
  const preferred = rows.filter((candidate) => candidate.row.active !== false);
  return preferred.length > 0 ? preferred : rows;
}

function exactRowIdMatch<T extends { active: boolean; id: string; displayName: string }>(
  rows: Array<ResolvedRow<T>>,
  value: unknown,
) {
  const id = stringValue(value);
  if (!id) {
    return null;
  }
  return rows.find((candidate) => candidate.row.id === id)?.row ?? null;
}

function preserveUnresolvedId(value: unknown, defaultId?: string) {
  const id = stringValue(value);
  if (!id) {
    return '';
  }
  if (defaultId && id === defaultId) {
    return '';
  }
  return id;
}

function concreteStrengthValue(source: RawStructSettings) {
  const direct = numericCandidate(source.fc);
  if (direct != null) {
    return Math.max(10, direct);
  }

  const fcGrade = stringValue(source.fcGrade);
  if (fcGrade.toLowerCase() === 'custom') {
    return Math.max(10, numberValue(source.fcCustom, DEFAULT_STRUCTURAL_FC_MPA, 10));
  }

  return Math.max(10, numberValue(fcGrade, DEFAULT_STRUCTURAL_FC_MPA, 10));
}

function concreteEcValue(source: RawStructSettings, fc: number) {
  const direct = numericCandidate(source.Ec);
  if (direct != null) {
    return Math.max(1000, direct);
  }
  return Math.max(1000, concreteEcFromFc(fc));
}

function reinforcementDesignationFromHint(value: unknown) {
  const text = stringValue(value).toUpperCase();
  if (text.includes('D500N')) return 'D500N';
  if (text.includes('D500L')) return 'D500L';
  if (text.includes('R250N')) return 'R250N';
  if (text === '500') return '500';
  return '';
}

function designationKey(value: unknown) {
  return stringValue(value).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

function uniqueStrings(values: unknown[]) {
  return Array.from(
    new Set(values.map((value) => stringValue(value)).filter((value) => value.length > 0)),
  );
}

function normalizedText(value: unknown) {
  return stringValue(value).replace(/\s+/g, ' ').trim().toLowerCase();
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown) {
  return String(value ?? '').trim();
}

function numericCandidate(value: unknown) {
  if (value === '' || value == null) {
    return null;
  }
  const candidate = Number(value);
  return Number.isFinite(candidate) ? candidate : null;
}

function numberValue(value: unknown, fallback: number, min?: number) {
  const candidate = numericCandidate(value);
  const resolved = candidate == null ? fallback : candidate;
  return min == null ? resolved : Math.max(min, resolved);
}

function approxEqual(left: unknown, right: unknown, tolerance = 1e-6) {
  const leftValue = numericCandidate(left);
  const rightValue = numericCandidate(right);
  if (leftValue == null || rightValue == null) {
    return false;
  }
  return Math.abs(leftValue - rightValue) <= tolerance;
}
