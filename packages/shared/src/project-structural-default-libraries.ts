import { MULTI_PILE_MANUAL_STRUCTURAL_PROFILE_ID } from './project-structural-concrete.js';
import type {
  MultiPileProjectCoverDurabilityClass,
  MultiPileProjectReinforcementGrade,
  MultiPileProjectTendonGrade,
} from './types/multi-pile.js';

export const DEFAULT_PROJECT_STRUCTURAL_REINFORCEMENT_GRADE_ID = 'reo_d500n';
export const DEFAULT_PROJECT_STRUCTURAL_TENDON_GRADE_ID = 'tendon_strand_12_7';
export const DEFAULT_PROJECT_STRUCTURAL_COVER_CLASS_ID = 'cover_mild_100y';

const PROJECT_STRUCTURAL_REINFORCEMENT_NUMERIC_FIELDS = [
  'fsy_MPa',
  'esu',
  'Es_MPa',
  'thermalExpansionPerDegC',
] as const;
const PROJECT_STRUCTURAL_TENDON_NUMERIC_FIELDS = [
  'nominalDiameter_mm',
  'area_mm2',
  'fpb_MPa',
  'fpb_kN',
  'fpy_MPa',
  'Ep_MPa',
] as const;
const PROJECT_STRUCTURAL_COVER_NUMERIC_FIELDS = [
  'designLifeYears',
  'minCoverPrecast_mm',
  'minCoverCastInPlace_mm',
  'crackWidthLimit_mm',
  'nominalCover_mm',
] as const;

const TENDON_SEED_ROWS = [
  ['tendon_as_drawn_wire_5', 'As-drawn wire', 5.0, 19.6, 34.7, 1700],
  ['tendon_as_drawn_wire_7', 'As-drawn wire', 7.0, 38.5, 64.3, 1670],
  ['tendon_stress_relieved_wire_5', 'Stress-relieved wire', 5.0, 19.9, 33.8, 1700],
  ['tendon_stress_relieved_wire_7', 'Stress-relieved wire', 7.0, 38.5, 64.3, 1670],
  ['tendon_strand_9_5', '7-wire ordinary strand', 9.5, 55.0, 102, 1850],
  ['tendon_strand_12_7', '7-wire ordinary strand', 12.7, 98.6, 184, 1870],
  ['tendon_strand_15_2', '7-wire ordinary strand', 15.2, 143.0, 250, 1790],
  ['tendon_strand_15_7', '7-wire ordinary strand', 15.7, 150.0, 261, 1830],
  ['tendon_compacted_strand_15_2', '7-wire compacted strand', 15.2, 165.0, 300, 1820],
  ['tendon_compacted_strand_18_0', '7-wire compacted strand', 18.0, 223.0, 380, 1700],
  ['tendon_bar_26', 'Hot-rolled bars (super grade only)', 26.0, 562.0, 579, 1030],
  ['tendon_bar_29', 'Hot-rolled bars (super grade only)', 29.0, 693.0, 714, 1030],
  ['tendon_bar_32', 'Hot-rolled bars (super grade only)', 32.0, 840.0, 865, 1030],
  ['tendon_bar_36', 'Hot-rolled bars (super grade only)', 36.0, 995.0, 1025, 1030],
  ['tendon_bar_40', 'Hot-rolled bars (super grade only)', 40.0, 1252.0, 1291, 1030],
  ['tendon_bar_56', 'Hot-rolled bars (super grade only)', 56.0, 2428.0, 2501, 1030],
  ['tendon_bar_75', 'Hot-rolled bars (super grade only)', 75.0, 4371.0, 4502, 1030],
] as const;

export type ResolvedProjectTendonGrade = {
  row: MultiPileProjectTendonGrade;
  preset: MultiPileProjectTendonGrade | null;
  usesPreset: boolean;
  presetLocked: boolean;
  sourceMode: 'preset-driven' | 'preset-override' | 'manual';
};

export function defaultProjectReinforcementGrade(
  overrides: Partial<MultiPileProjectReinforcementGrade> = {},
): MultiPileProjectReinforcementGrade {
  return {
    id: 'reo_default',
    displayName: '',
    sourceStandard: 'AS 3600:2018 / AS/NZS 4671',
    sourceSection: 'Section 3.2',
    sourceClause: 'Clauses 3.2.1 to 3.2.4',
    sourceTable: 'Table 3.2.1',
    sourcePagesNote: '',
    active: true,
    designationGrade: 'D500N',
    fsy_MPa: 500,
    esu: 0.05,
    ductilityClass: 'N',
    Es_MPa: 200000,
    thermalExpansionPerDegC: 0.000012,
    stressStrainReferenceText: '',
    notes: '',
    ...overrides,
  };
}

export function projectReinforcementSeedGrades(): MultiPileProjectReinforcementGrade[] {
  return [
    defaultProjectReinforcementGrade({
      id: 'reo_r250n',
      displayName: 'R250N Plain Bar',
      sourcePagesNote: 'Yield strength, ductility, modulus, thermal expansion',
      designationGrade: 'R250N',
      fsy_MPa: 250,
      esu: 0.05,
      ductilityClass: 'N',
      stressStrainReferenceText: 'AS 3600:2018 Clause 3.2.3',
      notes: 'Seeded from the attached AS 3600 reinforcement table.',
    }),
    defaultProjectReinforcementGrade({
      id: 'reo_d500l',
      displayName: 'D500L Deformed Bar (fitments only)',
      sourcePagesNote: 'Yield strength, ductility, modulus, thermal expansion',
      designationGrade: 'D500L',
      fsy_MPa: 500,
      esu: 0.015,
      ductilityClass: 'L',
      stressStrainReferenceText: 'AS 3600:2018 Clause 3.2.3',
      notes: 'Fitments-only grade from the attached AS 3600 reinforcement table.',
    }),
    defaultProjectReinforcementGrade({
      id: 'reo_d500n',
      displayName: 'D500N Deformed Bar',
      sourcePagesNote: 'Yield strength, ductility, modulus, thermal expansion',
      designationGrade: 'D500N',
      fsy_MPa: 500,
      esu: 0.05,
      ductilityClass: 'N',
      stressStrainReferenceText: 'AS 3600:2018 Clause 3.2.3',
      notes: 'Seeded from the attached AS 3600 reinforcement table.',
    }),
    defaultProjectReinforcementGrade({
      id: 'reo_mesh_d500l',
      displayName: 'Welded Mesh D500L',
      sourcePagesNote: 'Yield strength, ductility, modulus, thermal expansion',
      designationGrade: 'D500L',
      fsy_MPa: 500,
      esu: 0.015,
      ductilityClass: 'L',
      stressStrainReferenceText: 'AS 3600:2018 Clause 3.2.3',
      notes: 'Welded mesh D500L from the attached AS 3600 reinforcement table.',
    }),
    defaultProjectReinforcementGrade({
      id: 'reo_mesh_d500n',
      displayName: 'Welded Mesh D500N',
      sourcePagesNote: 'Yield strength, ductility, modulus, thermal expansion',
      designationGrade: 'D500N',
      fsy_MPa: 500,
      esu: 0.05,
      ductilityClass: 'N',
      stressStrainReferenceText: 'AS 3600:2018 Clause 3.2.3',
      notes: 'Welded mesh D500N from the attached AS 3600 reinforcement table.',
    }),
    defaultProjectReinforcementGrade({
      id: 'reo_ss_plain_200',
      displayName: 'Stainless Plain Bar 200',
      sourcePagesNote: 'Yield strength, ductility, modulus, thermal expansion',
      designationGrade: '200',
      fsy_MPa: 200,
      esu: 0.05,
      ductilityClass: 'N or E',
      stressStrainReferenceText: 'AS 3600:2018 Clause 3.2.3',
      notes: 'Seeded from the attached AS 3600 reinforcement table.',
    }),
    defaultProjectReinforcementGrade({
      id: 'reo_ss_ribbed_500',
      displayName: 'Stainless Ribbed Bar 500',
      sourcePagesNote: 'Yield strength, ductility, modulus, thermal expansion',
      designationGrade: '500',
      fsy_MPa: 500,
      esu: 0.05,
      ductilityClass: 'N or E',
      stressStrainReferenceText: 'AS 3600:2018 Clause 3.2.3',
      notes: 'Seeded from the attached AS 3600 reinforcement table.',
    }),
  ].map((row, index) => normalizeProjectReinforcementGrade(row, index));
}

export function projectReinforcementGradeMatchId(raw: unknown) {
  const source = reinforcementSourceRecord(raw);
  const explicitId = [
    stringValue(source.standardProfileId),
    stringValue(source.profileId),
    stringValue(source.id),
  ].find((value) => value.length > 0);
  if (explicitId && projectReinforcementSeedGradeById(explicitId)) {
    return explicitId;
  }

  const displayName = stringValue(source.displayName).toLowerCase();
  if (displayName) {
    const displayMatch = projectReinforcementSeedGrades().find(
      (row) => row.displayName.trim().toLowerCase() === displayName,
    );
    if (displayMatch) {
      return displayMatch.id;
    }
  }

  const designationTokens = reinforcementDesignationTokens(source.designationGrade);
  const ductilityClass = stringValue(source.ductilityClass).toLowerCase();
  const numericMatch = projectReinforcementSeedGrades().find(
    (row) =>
      designationTokens.has(reinforcementDesignationKey(row.designationGrade)) &&
      matchesWhenPresent(source.fsy_MPa, row.fsy_MPa, 1e-3) &&
      matchesWhenPresent(source.esu, row.esu, 1e-6) &&
      (!ductilityClass || ductilityClass === row.ductilityClass.trim().toLowerCase()) &&
      matchesWhenPresent(source.Es_MPa, row.Es_MPa, 1) &&
      matchesWhenPresent(source.thermalExpansionPerDegC, row.thermalExpansionPerDegC, 1e-9),
  );

  return numericMatch?.id ?? '';
}

export function normalizeProjectReinforcementGrade(
  raw: unknown,
  index = 0,
): MultiPileProjectReinforcementGrade {
  const source = reinforcementSourceRecord(raw);
  const shouldApplyMatchedDefault = !reinforcementHasCanonicalShape(source);
  const matchedId = shouldApplyMatchedDefault ? projectReinforcementGradeMatchId(source) : '';
  const matchedDefault = matchedId ? projectReinforcementSeedGradeById(matchedId) : null;

  let row = defaultProjectReinforcementGrade();
  if (matchedDefault) {
    row = {
      ...matchedDefault,
      id: stringValue(source.id) || matchedDefault.id,
      active: source.active === undefined ? matchedDefault.active : Boolean(source.active),
    };
  } else {
    row = {
      ...row,
      ...source,
    };
  }

  row.id = stringValue(row.id) || `reo_${index + 1}`;
  row.displayName =
    stringValue(row.displayName) ||
    stringValue(row.designationGrade) ||
    `Reinforcement ${index + 1}`;
  row.sourceStandard = stringValue(row.sourceStandard);
  row.sourceSection = stringValue(row.sourceSection);
  row.sourceClause = stringValue(row.sourceClause);
  row.sourceTable = stringValue(row.sourceTable);
  row.sourcePagesNote = stringValue(row.sourcePagesNote);
  row.designationGrade = stringValue(row.designationGrade);
  row.ductilityClass = stringValue(row.ductilityClass);
  row.stressStrainReferenceText = stringValue(row.stressStrainReferenceText);
  row.notes = stringValue(row.notes);

  PROJECT_STRUCTURAL_REINFORCEMENT_NUMERIC_FIELDS.forEach((field) => {
    row[field] = nullableNumberValue(row[field]);
  });

  row.fsy_MPa = Math.max(250, numberOrFallback(row.fsy_MPa, 500));
  row.esu = Math.max(0, numberOrFallback(row.esu, 0));
  row.Es_MPa = Math.max(100000, numberOrFallback(row.Es_MPa, 200000));
  row.thermalExpansionPerDegC =
    row.thermalExpansionPerDegC == null ? 0.000012 : Number(row.thermalExpansionPerDegC);
  row.active = row.active !== false;

  return row;
}

export function defaultProjectTendonGrade(
  overrides: Partial<MultiPileProjectTendonGrade> = {},
): MultiPileProjectTendonGrade {
  return {
    id: 'tendon_default',
    displayName: '',
    standardProfileId: DEFAULT_PROJECT_STRUCTURAL_TENDON_GRADE_ID,
    overrideStandardValues: false,
    sourceStandard: 'AS 3600:2018 / AS/NZS 4672.1',
    sourceSection: 'Section 3.3',
    sourceClause: 'Clauses 3.3.1 to 3.3.4',
    sourceTable: 'Table 3.3.1',
    sourcePagesNote: '',
    active: true,
    tendonType: '',
    nominalDiameter_mm: null,
    area_mm2: null,
    fpb_kN: null,
    fpb_MPa: null,
    fpy_MPa: null,
    Ep_MPa: null,
    stressStrainReferenceText: '',
    relaxationReferenceText: '',
    notes: '',
    ...overrides,
  };
}

export function projectTendonPresetProfiles(): MultiPileProjectTendonGrade[] {
  return TENDON_SEED_ROWS.map(([id, tendonType, nominalDiameter, area, fpb_kN, fpb_MPa]) => ({
    id,
    displayName: `${tendonType} ${nominalDiameter} mm`,
    standardProfileId: id,
    overrideStandardValues: false,
    sourceStandard: 'AS 3600:2018 / AS/NZS 4672.1',
    sourceSection: 'Section 3.3',
    sourceClause: 'Clauses 3.3.1 to 3.3.4',
    sourceTable: 'Table 3.3.1',
    sourcePagesNote: 'Tendon strength and modulus',
    active: true,
    tendonType,
    nominalDiameter_mm: nominalDiameter,
    area_mm2: area,
    fpb_kN,
    fpb_MPa,
    fpy_MPa: tendonFpyValue(tendonType, fpb_MPa),
    Ep_MPa: tendonEpValue(tendonType),
    stressStrainReferenceText: 'AS 3600:2018 Clause 3.3.3',
    relaxationReferenceText: 'AS 3600:2018 Clause 3.3.4',
    notes: 'Preset sourced from the attached AS 3600 tendon table as editable project data.',
  }));
}

export function projectTendonPresetById(profileId: string | null | undefined) {
  if (!profileId || profileId === MULTI_PILE_MANUAL_STRUCTURAL_PROFILE_ID) {
    return null;
  }

  const preset = projectTendonPresetProfiles().find((row) => row.id === profileId) ?? null;
  return preset ? { ...preset } : null;
}

export function applyProjectTendonPresetToRow(
  row: Partial<MultiPileProjectTendonGrade> | null | undefined,
  profileId: string | null | undefined,
) {
  const preset = projectTendonPresetById(profileId);
  const next = { ...(row ?? {}) };

  if (!preset) {
    next.standardProfileId =
      profileId === MULTI_PILE_MANUAL_STRUCTURAL_PROFILE_ID
        ? MULTI_PILE_MANUAL_STRUCTURAL_PROFILE_ID
        : '';
    next.displayName = stringValue(next.displayName) || 'Custom / manual';
    return next;
  }

  return {
    ...next,
    ...preset,
    standardProfileId: preset.id,
    displayName: preset.displayName,
  };
}

export function projectTendonPresetMatchId(raw: unknown) {
  const source = tendonSourceRecord(raw);
  const explicitId = stringValue(source.standardProfileId);
  if (explicitId === MULTI_PILE_MANUAL_STRUCTURAL_PROFILE_ID) {
    return MULTI_PILE_MANUAL_STRUCTURAL_PROFILE_ID;
  }
  if (explicitId && projectTendonPresetById(explicitId)) {
    return explicitId;
  }

  const displayName = stringValue(source.displayName).toLowerCase();
  if (displayName) {
    const displayMatch = projectTendonPresetProfiles().find(
      (row) => row.displayName.trim().toLowerCase() === displayName,
    );
    if (displayMatch) {
      return displayMatch.id;
    }
  }

  const tendonType = stringValue(source.tendonType).toLowerCase();
  const numericMatch = projectTendonPresetProfiles().find(
    (row) =>
      tendonType === row.tendonType.trim().toLowerCase() &&
      approxEqual(source.nominalDiameter_mm, row.nominalDiameter_mm, 1e-3) &&
      approxEqual(source.area_mm2, row.area_mm2, 1e-3) &&
      approxEqual(source.fpb_kN, row.fpb_kN, 0.1) &&
      approxEqual(source.fpb_MPa, row.fpb_MPa, 0.1) &&
      approxEqual(source.fpy_MPa, row.fpy_MPa, 0.1) &&
      approxEqual(source.Ep_MPa, row.Ep_MPa, 1),
  );

  return numericMatch?.id ?? '';
}

export function normalizeProjectTendonGrade(raw: unknown, index = 0): MultiPileProjectTendonGrade {
  const source = tendonSourceRecord(raw);
  const hasRaw = raw !== null && typeof raw === 'object' && !Array.isArray(raw);
  const matchedPresetId = projectTendonPresetMatchId(source);
  let presetId = stringValue(source.standardProfileId || matchedPresetId);
  if (!presetId && !hasRaw) {
    presetId = DEFAULT_PROJECT_STRUCTURAL_TENDON_GRADE_ID;
  }
  if (!presetId) {
    presetId = MULTI_PILE_MANUAL_STRUCTURAL_PROFILE_ID;
  }

  const override = Object.prototype.hasOwnProperty.call(source, 'overrideStandardValues')
    ? Boolean(source.overrideStandardValues)
    : hasRaw;

  let row = defaultProjectTendonGrade();
  if (presetId !== MULTI_PILE_MANUAL_STRUCTURAL_PROFILE_ID) {
    row = applyProjectTendonPresetToRow(row, presetId) as MultiPileProjectTendonGrade;
  }

  row = {
    ...row,
    ...source,
    standardProfileId: presetId,
    overrideStandardValues: override,
  };

  if (
    !row.overrideStandardValues &&
    row.standardProfileId !== MULTI_PILE_MANUAL_STRUCTURAL_PROFILE_ID
  ) {
    row = {
      ...(applyProjectTendonPresetToRow({}, row.standardProfileId) as MultiPileProjectTendonGrade),
      id: row.id,
      active: row.active,
      overrideStandardValues: false,
      standardProfileId: presetId,
    };
  }

  row.id = stringValue(row.id) || `tendon_${index + 1}`;
  row.standardProfileId =
    stringValue(row.standardProfileId) || MULTI_PILE_MANUAL_STRUCTURAL_PROFILE_ID;
  row.overrideStandardValues = Boolean(row.overrideStandardValues);
  row.displayName =
    stringValue(row.displayName) ||
    (row.standardProfileId !== MULTI_PILE_MANUAL_STRUCTURAL_PROFILE_ID
      ? (projectTendonPresetById(row.standardProfileId)?.displayName ?? '')
      : 'Custom / manual') ||
    stringValue(row.tendonType) ||
    `Tendon ${index + 1}`;
  row.sourceStandard = stringValue(row.sourceStandard);
  row.sourceSection = stringValue(row.sourceSection);
  row.sourceClause = stringValue(row.sourceClause);
  row.sourceTable = stringValue(row.sourceTable);
  row.sourcePagesNote = stringValue(row.sourcePagesNote);
  row.tendonType = stringValue(row.tendonType);
  row.stressStrainReferenceText = stringValue(row.stressStrainReferenceText);
  row.relaxationReferenceText = stringValue(row.relaxationReferenceText);
  row.notes = stringValue(row.notes);

  PROJECT_STRUCTURAL_TENDON_NUMERIC_FIELDS.forEach((field) => {
    row[field] = nullableNumberValue(row[field]);
  });

  if (row.fpb_kN == null && row.area_mm2 != null && row.fpb_MPa != null) {
    row.fpb_kN = Number(((row.area_mm2 * row.fpb_MPa) / 1000).toFixed(1));
  }
  if (row.fpb_MPa != null && row.fpy_MPa == null) {
    row.fpy_MPa = tendonFpyValue(row.tendonType, row.fpb_MPa);
  }
  if (row.Ep_MPa == null) {
    row.Ep_MPa = tendonEpValue(row.tendonType);
  }
  row.active = row.active !== false;

  return row;
}

export function resolveProjectTendonGrade(row: unknown): ResolvedProjectTendonGrade {
  const normalized = normalizeProjectTendonGrade(row);
  const preset = projectTendonPresetById(normalized.standardProfileId);
  return {
    row: normalized,
    preset,
    usesPreset: Boolean(preset),
    presetLocked: Boolean(preset) && !normalized.overrideStandardValues,
    sourceMode: preset
      ? normalized.overrideStandardValues
        ? 'preset-override'
        : 'preset-driven'
      : 'manual',
  };
}

export function defaultProjectCoverClass(
  overrides: Partial<MultiPileProjectCoverDurabilityClass> = {},
): MultiPileProjectCoverDurabilityClass {
  return {
    id: 'cover_default',
    displayName: '',
    sourceStandard: '',
    sourceSection: '',
    sourceClause: '',
    sourceTable: '',
    sourcePagesNote: '',
    active: true,
    designLifeYears: null,
    exposureClass: '',
    exposureClassification: '',
    minConcreteStrengthPrecast_MPa: '',
    minConcreteStrengthCastInPlace_MPa: '',
    minConcreteStrength_MPa: '',
    minCoverPrecast_mm: null,
    minCoverCastInPlace_mm: null,
    nominalCover_mm: 75,
    aggressivityNotes: '',
    durabilityNotes: '',
    crackWidthLimit_mm: null,
    notes: '',
    ...overrides,
  };
}

export function projectCoverDurabilitySeedClasses(): MultiPileProjectCoverDurabilityClass[] {
  const common = {
    sourceStandard: 'AS 2159:2009',
    sourceSection: 'Section 6.4',
    sourceClause: 'Clauses 6.4.1 to 6.4.3',
    sourceTable: 'Table 6.4.3',
    sourcePagesNote: 'Concrete pile durability, exposure and minimum cover',
    active: true,
    crackWidthLimit_mm: 0.3,
  };
  const commonNotes =
    'AS 2159 Section 5.3 governs reinforcement/ties/helices; Section 6.4 governs cover/durability.';

  return [
    defaultProjectCoverClass({
      ...common,
      id: 'cover_non_aggressive_50y',
      displayName: 'Non-aggressive 50y',
      designLifeYears: 50,
      exposureClass: 'Non-aggressive',
      minConcreteStrengthPrecast_MPa: '50',
      minConcreteStrengthCastInPlace_MPa: '25 (use 32 for reinforced cast-in-place)',
      minCoverPrecast_mm: 20,
      minCoverCastInPlace_mm: 45,
      aggressivityNotes: '50-year design life.',
      durabilityNotes: 'Use 32 MPa for reinforced cast-in-place piles where applicable.',
      notes: commonNotes,
    }),
    defaultProjectCoverClass({
      ...common,
      id: 'cover_mild_50y',
      displayName: 'Mild 50y',
      designLifeYears: 50,
      exposureClass: 'Mild',
      minConcreteStrengthPrecast_MPa: '50',
      minConcreteStrengthCastInPlace_MPa: '32',
      minCoverPrecast_mm: 20,
      minCoverCastInPlace_mm: 60,
      aggressivityNotes: '50-year design life.',
      durabilityNotes: 'Mild exposure minimum concrete strengths and cover.',
      notes: commonNotes,
    }),
    defaultProjectCoverClass({
      ...common,
      id: 'cover_moderate_50y',
      displayName: 'Moderate 50y',
      designLifeYears: 50,
      exposureClass: 'Moderate',
      minConcreteStrengthPrecast_MPa: '50',
      minConcreteStrengthCastInPlace_MPa: '40',
      minCoverPrecast_mm: 25,
      minCoverCastInPlace_mm: 65,
      aggressivityNotes: '50-year design life.',
      durabilityNotes: 'Moderate exposure minimum concrete strengths and cover.',
      notes: commonNotes,
    }),
    defaultProjectCoverClass({
      ...common,
      id: 'cover_severe_50y',
      displayName: 'Severe 50y',
      designLifeYears: 50,
      exposureClass: 'Severe',
      minConcreteStrengthPrecast_MPa: '50',
      minConcreteStrengthCastInPlace_MPa: '50',
      minCoverPrecast_mm: 40,
      minCoverCastInPlace_mm: 70,
      aggressivityNotes: '50-year design life.',
      durabilityNotes: 'Severe exposure minimum concrete strengths and cover.',
      notes: commonNotes,
    }),
    defaultProjectCoverClass({
      ...common,
      id: 'cover_very_severe_50y',
      displayName: 'Very severe 50y',
      designLifeYears: 50,
      exposureClass: 'Very severe',
      minConcreteStrengthPrecast_MPa: '>50 preferably >60',
      minConcreteStrengthCastInPlace_MPa: '>50 preferably >60',
      minCoverPrecast_mm: 40,
      minCoverCastInPlace_mm: 75,
      aggressivityNotes: '50-year design life.',
      durabilityNotes:
        'Very severe exposure. AS 2159 notes a preference for concrete strengths above 60 MPa.',
      notes: commonNotes,
    }),
    defaultProjectCoverClass({
      ...common,
      id: 'cover_non_aggressive_100y',
      displayName: 'Non-aggressive 100y',
      designLifeYears: 100,
      exposureClass: 'Non-aggressive',
      minConcreteStrengthPrecast_MPa: '50',
      minConcreteStrengthCastInPlace_MPa: '25 (use 32 for reinforced cast-in-place)',
      minCoverPrecast_mm: 25,
      minCoverCastInPlace_mm: 65,
      aggressivityNotes: '100-year design life.',
      durabilityNotes: 'Use 32 MPa for reinforced cast-in-place piles where applicable.',
      notes: commonNotes,
    }),
    defaultProjectCoverClass({
      ...common,
      id: 'cover_mild_100y',
      displayName: 'Mild 100y',
      designLifeYears: 100,
      exposureClass: 'Mild',
      minConcreteStrengthPrecast_MPa: '50',
      minConcreteStrengthCastInPlace_MPa: '32',
      minCoverPrecast_mm: 30,
      minCoverCastInPlace_mm: 75,
      aggressivityNotes: '100-year design life.',
      durabilityNotes: 'Mild exposure minimum concrete strengths and cover.',
      notes: commonNotes,
    }),
    defaultProjectCoverClass({
      ...common,
      id: 'cover_moderate_100y',
      displayName: 'Moderate 100y',
      designLifeYears: 100,
      exposureClass: 'Moderate',
      minConcreteStrengthPrecast_MPa: '50',
      minConcreteStrengthCastInPlace_MPa: '40',
      minCoverPrecast_mm: 40,
      minCoverCastInPlace_mm: 85,
      aggressivityNotes: '100-year design life.',
      durabilityNotes: 'Moderate exposure minimum concrete strengths and cover.',
      notes: commonNotes,
    }),
    defaultProjectCoverClass({
      ...common,
      id: 'cover_severe_100y',
      displayName: 'Severe 100y',
      designLifeYears: 100,
      exposureClass: 'Severe',
      minConcreteStrengthPrecast_MPa: '50',
      minConcreteStrengthCastInPlace_MPa: '50',
      minCoverPrecast_mm: 50,
      minCoverCastInPlace_mm: 100,
      aggressivityNotes: '100-year design life.',
      durabilityNotes: 'Severe exposure minimum concrete strengths and cover.',
      notes: commonNotes,
    }),
    defaultProjectCoverClass({
      ...common,
      id: 'cover_very_severe_100y',
      displayName: 'Very severe 100y',
      designLifeYears: 100,
      exposureClass: 'Very severe',
      minConcreteStrengthPrecast_MPa: '>50 preferably >60',
      minConcreteStrengthCastInPlace_MPa: '>50 preferably >60',
      minCoverPrecast_mm: 50,
      minCoverCastInPlace_mm: 120,
      aggressivityNotes: '100-year design life.',
      durabilityNotes:
        'Very severe exposure. AS 2159 notes a preference for concrete strengths above 60 MPa.',
      notes: commonNotes,
    }),
  ].map((row, index) => normalizeProjectCoverClass(row, index));
}

export function projectCoverClassMatchId(raw: unknown) {
  const source = coverSourceRecord(raw);
  const explicitId = [
    stringValue(source.standardProfileId),
    stringValue(source.profileId),
    stringValue(source.id),
  ].find((value) => value.length > 0);
  if (explicitId && projectCoverClassById(explicitId)) {
    return explicitId;
  }

  const displayName = stringValue(source.displayName).toLowerCase();
  if (displayName) {
    const displayMatch = projectCoverDurabilitySeedClasses().find(
      (row) => row.displayName.trim().toLowerCase() === displayName,
    );
    if (displayMatch) {
      return displayMatch.id;
    }
  }

  const exposureClass = stringValue(
    source.exposureClass || source.exposureClassification,
  ).toLowerCase();
  const comparisonMinCast =
    stringValue(source.minConcreteStrengthCastInPlace_MPa) ||
    stringValue(source.minConcreteStrength_MPa);
  const comparisonMinPrecast =
    stringValue(source.minConcreteStrengthPrecast_MPa) ||
    stringValue(source.minConcreteStrength_MPa);
  const numericMatch = projectCoverDurabilitySeedClasses().find(
    (row) =>
      approxEqual(source.designLifeYears, row.designLifeYears, 1e-3) &&
      exposureClass === row.exposureClass.trim().toLowerCase() &&
      comparisonMinPrecast === row.minConcreteStrengthPrecast_MPa &&
      comparisonMinCast === row.minConcreteStrengthCastInPlace_MPa &&
      approxEqual(source.minCoverPrecast_mm, row.minCoverPrecast_mm, 1e-3) &&
      approxEqual(
        source.minCoverCastInPlace_mm ?? source.nominalCover_mm,
        row.minCoverCastInPlace_mm,
        1e-3,
      ) &&
      approxEqual(source.crackWidthLimit_mm, row.crackWidthLimit_mm, 1e-3),
  );

  return numericMatch?.id ?? '';
}

export function normalizeProjectCoverClass(
  raw: unknown,
  index = 0,
): MultiPileProjectCoverDurabilityClass {
  const source = coverSourceRecord(raw);
  const shouldApplyMatchedDefault = !coverHasCanonicalShape(source);
  const matchedId = shouldApplyMatchedDefault ? projectCoverClassMatchId(source) : '';
  const matchedDefault = matchedId ? projectCoverClassById(matchedId) : null;

  let row = defaultProjectCoverClass();
  if (matchedDefault) {
    row = {
      ...matchedDefault,
      id: stringValue(source.id) || matchedDefault.id,
      active: source.active === undefined ? matchedDefault.active : Boolean(source.active),
    };
  } else {
    row = {
      ...row,
      ...source,
    };
  }

  row.id = stringValue(row.id) || `cover_${index + 1}`;
  row.displayName =
    stringValue(row.displayName) ||
    `Cover ${Math.round(numberOrFallback(row.nominalCover_mm, 75))} mm`;
  row.sourceStandard = stringValue(row.sourceStandard);
  row.sourceSection = stringValue(row.sourceSection);
  row.sourceClause = stringValue(row.sourceClause);
  row.sourceTable = stringValue(row.sourceTable);
  row.sourcePagesNote = stringValue(row.sourcePagesNote);
  row.exposureClass = stringValue(row.exposureClass || row.exposureClassification);
  row.exposureClassification = row.exposureClass;
  row.minConcreteStrengthPrecast_MPa = stringValue(row.minConcreteStrengthPrecast_MPa);
  row.minConcreteStrengthCastInPlace_MPa =
    stringValue(row.minConcreteStrengthCastInPlace_MPa) || stringValue(row.minConcreteStrength_MPa);
  row.minConcreteStrength_MPa =
    row.minConcreteStrengthCastInPlace_MPa || row.minConcreteStrengthPrecast_MPa || '';
  row.aggressivityNotes = stringValue(row.aggressivityNotes);
  row.durabilityNotes = stringValue(row.durabilityNotes);
  row.notes = stringValue(row.notes);

  PROJECT_STRUCTURAL_COVER_NUMERIC_FIELDS.forEach((field) => {
    row[field] = nullableNumberValue(row[field]);
  });

  row.minCoverPrecast_mm =
    row.minCoverPrecast_mm == null ? null : Math.max(0, Number(row.minCoverPrecast_mm));
  row.minCoverCastInPlace_mm =
    row.minCoverCastInPlace_mm == null ? null : Math.max(0, Number(row.minCoverCastInPlace_mm));
  row.nominalCover_mm = Math.max(
    0,
    Number(
      row.minCoverCastInPlace_mm != null ? row.minCoverCastInPlace_mm : row.nominalCover_mm || 0,
    ),
  );
  row.active = row.active !== false;

  return row;
}

function projectReinforcementSeedGradeById(profileId: string | null | undefined) {
  if (!profileId) {
    return null;
  }
  const seed = projectReinforcementSeedGrades().find((row) => row.id === profileId) ?? null;
  return seed ? { ...seed } : null;
}

function projectCoverClassById(profileId: string | null | undefined) {
  if (!profileId) {
    return null;
  }
  const seed = projectCoverDurabilitySeedClasses().find((row) => row.id === profileId) ?? null;
  return seed ? { ...seed } : null;
}

function tendonFpyValue(tendonType: string | null | undefined, fpb_MPa: number | null | undefined) {
  const type = stringValue(tendonType).toLowerCase();
  let ratio = 0.82;
  if (type.includes('as-drawn')) {
    ratio = 0.8;
  } else if (type.includes('stress-relieved wire')) {
    ratio = 0.83;
  } else if (type.includes('hot-rolled') && type.includes('ribbed')) {
    ratio = 0.89;
  } else if (type.includes('hot-rolled')) {
    ratio = 0.81;
  }
  return Number((numberOrFallback(fpb_MPa, 0) * ratio).toFixed(1));
}

function tendonEpValue(tendonType: string | null | undefined) {
  const type = stringValue(tendonType).toLowerCase();
  return type.includes('strand') ? 200000 : 205000;
}

function reinforcementSourceRecord(raw: unknown) {
  const source =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? ({ ...raw } as Record<string, unknown>)
      : {};

  if (!('fsy_MPa' in source) && 'fsyMPa' in source) {
    source.fsy_MPa = source.fsyMPa;
  }
  if (!('Es_MPa' in source) && 'esMPa' in source) {
    source.Es_MPa = source.esMPa;
  }

  return source;
}

function tendonSourceRecord(raw: unknown) {
  const source =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? ({ ...raw } as Record<string, unknown>)
      : {};

  if (!('fpb_MPa' in source) && 'fpbMPa' in source) {
    source.fpb_MPa = source.fpbMPa;
  }
  if (!('fpy_MPa' in source) && 'fpyMPa' in source) {
    source.fpy_MPa = source.fpyMPa;
  }
  if (!('Ep_MPa' in source) && 'epMPa' in source) {
    source.Ep_MPa = source.epMPa;
  }

  return source;
}

function coverSourceRecord(raw: unknown) {
  const source =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? ({ ...raw } as Record<string, unknown>)
      : {};

  if (!('minConcreteStrengthPrecast_MPa' in source) && 'minConcreteStrengthPrecastMPa' in source) {
    source.minConcreteStrengthPrecast_MPa = source.minConcreteStrengthPrecastMPa;
  }
  if (
    !('minConcreteStrengthCastInPlace_MPa' in source) &&
    'minConcreteStrengthCastInPlaceMPa' in source
  ) {
    source.minConcreteStrengthCastInPlace_MPa = source.minConcreteStrengthCastInPlaceMPa;
  }
  if (!('nominalCover_mm' in source) && 'nominalCoverMm' in source) {
    source.nominalCover_mm = source.nominalCoverMm;
  }
  if (!('crackWidthLimit_mm' in source) && 'crackWidthLimitMm' in source) {
    source.crackWidthLimit_mm = source.crackWidthLimitMm;
  }

  return source;
}

function reinforcementHasCanonicalShape(source: Record<string, unknown>) {
  return (
    'esu' in source ||
    'ductilityClass' in source ||
    'thermalExpansionPerDegC' in source ||
    'stressStrainReferenceText' in source
  );
}

function coverHasCanonicalShape(source: Record<string, unknown>) {
  return (
    'exposureClassification' in source ||
    'minConcreteStrength_MPa' in source ||
    'minCoverPrecast_mm' in source ||
    'minCoverCastInPlace_mm' in source ||
    'aggressivityNotes' in source
  );
}

function reinforcementDesignationTokens(value: unknown) {
  const base = reinforcementDesignationKey(value);
  const tokens = new Set<string>();
  if (!base) {
    return tokens;
  }

  tokens.add(base);
  if (/^\d+[A-Z]*$/.test(base)) {
    tokens.add(`D${base}`);
    tokens.add(`R${base}`);
  }
  return tokens;
}

function reinforcementDesignationKey(value: unknown) {
  return stringValue(value)
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase();
}

function stringValue(value: unknown) {
  return String(value ?? '').trim();
}

function nullableNumberValue(value: unknown): number | null {
  if (value === '' || value == null) {
    return null;
  }
  const candidate = Number(value);
  return Number.isFinite(candidate) ? candidate : null;
}

function numberOrFallback(value: unknown, fallback: number) {
  const candidate = Number(value);
  return Number.isFinite(candidate) ? candidate : fallback;
}

function approxEqual(a: unknown, b: unknown, tolerance = 1e-6) {
  if (a == null || b == null) {
    return false;
  }
  const left = Number(a);
  const right = Number(b);
  if (!Number.isFinite(left) || !Number.isFinite(right)) {
    return false;
  }
  return Math.abs(left - right) <= tolerance;
}

function matchesWhenPresent(a: unknown, b: unknown, tolerance = 1e-6) {
  if (a == null || a === '') {
    return true;
  }
  return approxEqual(a, b, tolerance);
}
