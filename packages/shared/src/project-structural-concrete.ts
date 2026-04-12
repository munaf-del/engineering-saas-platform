import type {
  MultiPileProjectConcreteClass,
  MultiPileStructuralEcMode,
} from './types/multi-pile.js';

export const MULTI_PILE_MANUAL_STRUCTURAL_PROFILE_ID = '__custom__';
export const DEFAULT_PROJECT_STRUCTURAL_CONCRETE_CLASS_ID = 'conc_32';

const CONCRETE_CUBE_MAP: Record<number, number> = {
  20: 25,
  25: 32,
  32: 40,
  40: 50,
  50: 60,
  65: 80,
  80: 95,
  100: 120,
  120: 150,
};

const CONCRETE_MEAN_STRENGTH_MAP: Record<number, number> = {
  20: 25,
  25: 31,
  32: 39,
  40: 48,
  50: 59,
  65: 75,
  80: 91,
  100: 110,
  120: 128,
};

const CONCRETE_IN_SITU_STRENGTH_MAP: Record<number, number> = {
  20: 22,
  25: 28,
  32: 35,
  40: 43,
  50: 53,
  65: 68,
  80: 82,
  100: 99,
  120: 115,
};

const CONCRETE_EC_MAP: Record<number, number> = {
  20: 24000,
  25: 26700,
  32: 30100,
  40: 32800,
  50: 34800,
  65: 37400,
  80: 39600,
  100: 42200,
  120: 44400,
};

const CONCRETE_PRESET_ROWS = [
  {
    id: 'conc_20',
    displayName: '20 MPa Concrete',
    fc_MPa: 20,
    fc_cube_MPa: 25,
    fcm_MPa: 25,
    fcmi_MPa: 22,
    Ec_MPa: 24000,
    density_kgm3: 2400,
    poissonsRatio: 0.2,
    thermalExpansionPerDegC: 0.00001,
    fctf_MPa: 2.683,
    fct_MPa: 1.61,
  },
  {
    id: 'conc_25',
    displayName: '25 MPa Concrete',
    fc_MPa: 25,
    fc_cube_MPa: 32,
    fcm_MPa: 31,
    fcmi_MPa: 28,
    Ec_MPa: 26700,
    density_kgm3: 2400,
    poissonsRatio: 0.2,
    thermalExpansionPerDegC: 0.00001,
    fctf_MPa: 3,
    fct_MPa: 1.8,
  },
  {
    id: 'conc_32',
    displayName: '32 MPa Concrete',
    fc_MPa: 32,
    fc_cube_MPa: 40,
    fcm_MPa: 39,
    fcmi_MPa: 35,
    Ec_MPa: 30100,
    density_kgm3: 2400,
    poissonsRatio: 0.2,
    thermalExpansionPerDegC: 0.00001,
    fctf_MPa: 3.394,
    fct_MPa: 2.036,
  },
  {
    id: 'conc_40',
    displayName: '40 MPa Concrete',
    fc_MPa: 40,
    fc_cube_MPa: 50,
    fcm_MPa: 48,
    fcmi_MPa: 43,
    Ec_MPa: 32800,
    density_kgm3: 2400,
    poissonsRatio: 0.2,
    thermalExpansionPerDegC: 0.00001,
    fctf_MPa: 3.795,
    fct_MPa: 2.277,
  },
  {
    id: 'conc_50',
    displayName: '50 MPa Concrete',
    fc_MPa: 50,
    fc_cube_MPa: 60,
    fcm_MPa: 59,
    fcmi_MPa: 53,
    Ec_MPa: 34800,
    density_kgm3: 2400,
    poissonsRatio: 0.2,
    thermalExpansionPerDegC: 0.00001,
    fctf_MPa: 4.243,
    fct_MPa: 2.546,
  },
  {
    id: 'conc_65',
    displayName: '65 MPa Concrete',
    fc_MPa: 65,
    fc_cube_MPa: 80,
    fcm_MPa: 75,
    fcmi_MPa: 68,
    Ec_MPa: 37400,
    density_kgm3: 2400,
    poissonsRatio: 0.2,
    thermalExpansionPerDegC: 0.00001,
    fctf_MPa: 4.837,
    fct_MPa: 2.902,
  },
  {
    id: 'conc_80',
    displayName: '80 MPa Concrete',
    fc_MPa: 80,
    fc_cube_MPa: 95,
    fcm_MPa: 91,
    fcmi_MPa: 82,
    Ec_MPa: 39600,
    density_kgm3: 2400,
    poissonsRatio: 0.2,
    thermalExpansionPerDegC: 0.00001,
    fctf_MPa: 5.367,
    fct_MPa: 3.22,
  },
  {
    id: 'conc_100',
    displayName: '100 MPa Concrete',
    fc_MPa: 100,
    fc_cube_MPa: 120,
    fcm_MPa: 110,
    fcmi_MPa: 99,
    Ec_MPa: 42200,
    density_kgm3: 2400,
    poissonsRatio: 0.2,
    thermalExpansionPerDegC: 0.00001,
    fctf_MPa: 6,
    fct_MPa: 3.6,
  },
  {
    id: 'conc_120',
    displayName: '120 MPa Concrete',
    fc_MPa: 120,
    fc_cube_MPa: 150,
    fcm_MPa: 128,
    fcmi_MPa: 115,
    Ec_MPa: 44400,
    density_kgm3: 2400,
    poissonsRatio: 0.2,
    thermalExpansionPerDegC: 0.00001,
    fctf_MPa: 6.573,
    fct_MPa: 3.944,
  },
] as const;

export type ResolvedProjectConcreteClass = {
  row: MultiPileProjectConcreteClass;
  preset: MultiPileProjectConcreteClass | null;
  usesPreset: boolean;
  presetLocked: boolean;
  sourceMode: 'preset-driven' | 'preset-override' | 'manual';
};

export function concreteFlexuralTensile(fcValue: number | null | undefined) {
  return Number((0.6 * Math.sqrt(Math.max(0, Number(fcValue || 0)))).toFixed(3));
}

export function concreteUniaxialTensile(fcValue: number | null | undefined) {
  return Number((0.36 * Math.sqrt(Math.max(0, Number(fcValue || 0)))).toFixed(3));
}

export function concreteEcFromFc(fcValue: number | null | undefined): number {
  const fc = Number(fcValue || 32);
  const exact = CONCRETE_EC_MAP[fc];
  if (exact) {
    return exact;
  }

  const grades = Object.keys(CONCRETE_EC_MAP)
    .map(Number)
    .sort((left, right) => left - right);
  let nearest = grades[0] ?? 32;
  grades.forEach((grade) => {
    if (Math.abs(grade - fc) < Math.abs(nearest - fc)) {
      nearest = grade;
    }
  });
  return CONCRETE_EC_MAP[nearest] ?? 30100;
}

export function projectConcretePresetProfiles(): MultiPileProjectConcreteClass[] {
  return CONCRETE_PRESET_ROWS.map((row) => ({
    id: row.id,
    displayName: row.displayName,
    standardProfileId: row.id,
    overrideStandardValues: false,
    sourceStandard: 'AS 3600:2018',
    sourceSection: 'Section 3.1',
    sourceClause: 'Clauses 3.1.1 to 3.1.8',
    sourceTable: 'Tables 3.1.1 and 3.1.2',
    sourcePagesNote:
      'Concrete properties, tensile strength, modulus, Poisson’s ratio, thermal expansion',
    active: true,
    fc_MPa: row.fc_MPa,
    fc_cube_MPa: row.fc_cube_MPa,
    fcm_MPa: row.fcm_MPa,
    fcmi_MPa: row.fcmi_MPa,
    fctf_MPa: row.fctf_MPa,
    fct_MPa: row.fct_MPa,
    EcMode: 'auto',
    Ec_MPa: row.Ec_MPa,
    density_kgm3: row.density_kgm3,
    poissonsRatio: row.poissonsRatio,
    thermalExpansionPerDegC: row.thermalExpansionPerDegC,
    shrinkageReferenceText: 'AS 3600:2018 Clause 3.1.7, Figure 3.1.7.2, Table 3.1.7.2',
    shrinkageEnvironmentNotes:
      'Typical final design shrinkage strains after 30 years are read by environment and notional size h = 50, 100, 200, 400 mm.',
    creepReferenceText: 'AS 3600:2018 Clause 3.1.8, Figure 3.1.8.3, Table 3.1.8.3',
    creepEnvironmentNotes:
      'Basic creep and final creep coefficients vary by environment, notional size, and concrete strength class.',
    notes: 'Preset sourced from the attached AS 3600 material-property pages as editable project data.',
  }));
}

export function projectConcretePresetById(profileId: string | null | undefined) {
  if (!profileId || profileId === MULTI_PILE_MANUAL_STRUCTURAL_PROFILE_ID) {
    return null;
  }
  const preset = projectConcretePresetProfiles().find((row) => row.id === profileId) ?? null;
  return preset ? { ...preset } : null;
}

export function defaultProjectConcreteClass(
  overrides: Partial<MultiPileProjectConcreteClass> = {},
): MultiPileProjectConcreteClass {
  return {
    id: 'conc_default',
    displayName: '',
    standardProfileId: DEFAULT_PROJECT_STRUCTURAL_CONCRETE_CLASS_ID,
    overrideStandardValues: false,
    sourceStandard: 'AS 3600:2018',
    sourceSection: 'Section 3.1',
    sourceClause: 'Clauses 3.1.1 to 3.1.8',
    sourceTable: 'Tables 3.1.1 and 3.1.2',
    sourcePagesNote: '',
    active: true,
    fc_MPa: 32,
    fc_cube_MPa: 40,
    fcm_MPa: 39,
    fcmi_MPa: 35,
    fctf_MPa: concreteFlexuralTensile(32),
    fct_MPa: concreteUniaxialTensile(32),
    EcMode: 'auto',
    Ec_MPa: concreteEcFromFc(32),
    density_kgm3: 2400,
    poissonsRatio: 0.2,
    thermalExpansionPerDegC: 0.00001,
    shrinkageReferenceText: '',
    shrinkageEnvironmentNotes: '',
    creepReferenceText: '',
    creepEnvironmentNotes: '',
    notes: '',
    ...overrides,
  };
}

export function applyProjectConcretePresetToRow(
  row: Partial<MultiPileProjectConcreteClass> | null | undefined,
  profileId: string | null | undefined,
) {
  const preset = projectConcretePresetById(profileId);
  const next = { ...(row ?? {}) };

  if (!preset) {
    next.standardProfileId =
      profileId === MULTI_PILE_MANUAL_STRUCTURAL_PROFILE_ID
        ? MULTI_PILE_MANUAL_STRUCTURAL_PROFILE_ID
        : '';
    next.displayName = String(next.displayName || '').trim() || 'Custom / manual';
    return next;
  }

  return {
    ...next,
    ...preset,
    standardProfileId: preset.id,
    displayName: preset.displayName,
  };
}

export function projectConcretePresetMatchId(raw: unknown) {
  const source = toConcretePresetComparisonSource(raw);
  const explicitId = stringValue(source.standardProfileId);
  if (explicitId === MULTI_PILE_MANUAL_STRUCTURAL_PROFILE_ID) {
    return MULTI_PILE_MANUAL_STRUCTURAL_PROFILE_ID;
  }
  if (explicitId && projectConcretePresetById(explicitId)) {
    return explicitId;
  }

  const displayName = stringValue(source.displayName).toLowerCase();
  if (displayName) {
    const displayMatch = projectConcretePresetProfiles().find(
      (row) => row.displayName.trim().toLowerCase() === displayName,
    );
    if (displayMatch) {
      return displayMatch.id;
    }
  }

  const numericMatch = projectConcretePresetProfiles().find(
    (row) =>
      approxEqual(source.fc_MPa, row.fc_MPa, 1e-3) &&
      approxEqual(source.fc_cube_MPa, row.fc_cube_MPa, 1e-3) &&
      approxEqual(source.fcm_MPa, row.fcm_MPa, 1e-3) &&
      approxEqual(source.fcmi_MPa, row.fcmi_MPa, 1e-3) &&
      approxEqual(source.fctf_MPa, row.fctf_MPa, 1e-3) &&
      approxEqual(source.fct_MPa, row.fct_MPa, 1e-3) &&
      approxEqual(source.Ec_MPa, row.Ec_MPa, 1),
  );

  return numericMatch?.id ?? '';
}

export function normalizeProjectConcreteClass(raw: unknown, index = 0): MultiPileProjectConcreteClass {
  const source = concreteSourceRecord(raw);
  const hasRaw = raw !== null && typeof raw === 'object' && !Array.isArray(raw);
  const matchedPresetId = projectConcretePresetMatchId(source);
  let presetId = stringValue(source.standardProfileId || matchedPresetId);
  if (!presetId && !hasRaw) {
    presetId = DEFAULT_PROJECT_STRUCTURAL_CONCRETE_CLASS_ID;
  }
  if (!presetId) {
    presetId = MULTI_PILE_MANUAL_STRUCTURAL_PROFILE_ID;
  }

  const override = Object.prototype.hasOwnProperty.call(source, 'overrideStandardValues')
    ? Boolean(source.overrideStandardValues)
    : hasRaw;

  let row = defaultProjectConcreteClass();
  if (presetId !== MULTI_PILE_MANUAL_STRUCTURAL_PROFILE_ID) {
    row = applyProjectConcretePresetToRow(row, presetId) as MultiPileProjectConcreteClass;
  }

  row = {
    ...row,
    ...source,
    standardProfileId: presetId,
    overrideStandardValues: override,
  };

  if (!row.overrideStandardValues && row.standardProfileId !== MULTI_PILE_MANUAL_STRUCTURAL_PROFILE_ID) {
    row = {
      ...row,
      ...(applyProjectConcretePresetToRow({}, row.standardProfileId) as MultiPileProjectConcreteClass),
      id: row.id,
      active: row.active,
      overrideStandardValues: false,
      standardProfileId: presetId,
    };
  }

  row.id = stringValue(row.id) || `conc_${index + 1}`;
  row.standardProfileId =
    stringValue(row.standardProfileId) || MULTI_PILE_MANUAL_STRUCTURAL_PROFILE_ID;
  row.overrideStandardValues = Boolean(row.overrideStandardValues);
  row.displayName =
    stringValue(row.displayName) ||
    (row.standardProfileId !== MULTI_PILE_MANUAL_STRUCTURAL_PROFILE_ID
      ? (projectConcretePresetById(row.standardProfileId)?.displayName ?? '')
      : 'Custom / manual') ||
    `${Math.round(Number(row.fc_MPa || 32))} MPa Concrete`;
  row.sourceStandard = stringValue(row.sourceStandard);
  row.sourceSection = stringValue(row.sourceSection);
  row.sourceClause = stringValue(row.sourceClause);
  row.sourceTable = stringValue(row.sourceTable);
  row.sourcePagesNote = stringValue(row.sourcePagesNote);
  row.EcMode = structuralEcModeValue(row.EcMode);
  row.shrinkageReferenceText = stringValue(row.shrinkageReferenceText);
  row.shrinkageEnvironmentNotes = stringValue(row.shrinkageEnvironmentNotes);
  row.creepReferenceText = stringValue(row.creepReferenceText);
  row.creepEnvironmentNotes = stringValue(row.creepEnvironmentNotes);
  row.notes = stringValue(row.notes);
  row.fc_MPa = Math.max(10, numberOrFallback(row.fc_MPa, 32));
  row.fc_cube_MPa = numberOrFallback(row.fc_cube_MPa, CONCRETE_CUBE_MAP[row.fc_MPa] ?? row.fc_MPa);
  row.fcm_MPa = numberOrFallback(row.fcm_MPa, CONCRETE_MEAN_STRENGTH_MAP[row.fc_MPa] ?? row.fc_MPa);
  row.fcmi_MPa = numberOrFallback(
    row.fcmi_MPa,
    CONCRETE_IN_SITU_STRENGTH_MAP[row.fc_MPa] ?? row.fc_MPa,
  );
  row.fctf_MPa = numberOrFallback(row.fctf_MPa, concreteFlexuralTensile(row.fc_MPa));
  row.fct_MPa = numberOrFallback(row.fct_MPa, concreteUniaxialTensile(row.fc_MPa));
  row.Ec_MPa =
    row.EcMode === 'override'
      ? Math.max(1000, numberOrFallback(row.Ec_MPa, concreteEcFromFc(row.fc_MPa)))
      : Math.max(1000, concreteEcFromFc(row.fc_MPa));
  row.density_kgm3 = Math.max(0, numberOrFallback(row.density_kgm3, 2400));
  row.poissonsRatio = row.poissonsRatio == null ? 0.2 : Number(row.poissonsRatio);
  row.thermalExpansionPerDegC =
    row.thermalExpansionPerDegC == null ? 0.00001 : Number(row.thermalExpansionPerDegC);
  row.active = row.active !== false;
  return row;
}

export function resolveProjectConcreteClass(row: unknown): ResolvedProjectConcreteClass {
  const normalized = normalizeProjectConcreteClass(row);
  const preset = projectConcretePresetById(normalized.standardProfileId);
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

function toConcretePresetComparisonSource(raw: unknown) {
  const source = concreteSourceRecord(raw);
  const fc_MPa = nullableNumberValue(source.fc_MPa);
  const EcMode = structuralEcModeValue(source.EcMode);
  return {
    standardProfileId: stringValue(source.standardProfileId),
    displayName: stringValue(source.displayName),
    fc_MPa,
    fc_cube_MPa: nullableNumberValue(source.fc_cube_MPa) ?? fallbackMappedValue(fc_MPa, CONCRETE_CUBE_MAP),
    fcm_MPa: nullableNumberValue(source.fcm_MPa) ?? fallbackMappedValue(fc_MPa, CONCRETE_MEAN_STRENGTH_MAP),
    fcmi_MPa:
      nullableNumberValue(source.fcmi_MPa) ?? fallbackMappedValue(fc_MPa, CONCRETE_IN_SITU_STRENGTH_MAP),
    fctf_MPa: nullableNumberValue(source.fctf_MPa) ?? concreteFlexuralTensile(fc_MPa),
    fct_MPa: nullableNumberValue(source.fct_MPa) ?? concreteUniaxialTensile(fc_MPa),
    Ec_MPa:
      nullableNumberValue(source.Ec_MPa) ??
      (EcMode === 'override' ? concreteEcFromFc(fc_MPa) : concreteEcFromFc(fc_MPa)),
  };
}

function concreteSourceRecord(raw: unknown) {
  const source =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? ({ ...raw } as Record<string, unknown>)
      : {};

  if (!('fc_MPa' in source) && 'fcMPa' in source) {
    source.fc_MPa = source.fcMPa;
  }
  if (!('EcMode' in source) && 'ecMode' in source) {
    source.EcMode = source.ecMode;
  }
  if (!('Ec_MPa' in source) && 'ecMPa' in source) {
    source.Ec_MPa = source.ecMPa;
  }

  return source;
}

function fallbackMappedValue(
  fcValue: number | null,
  map: Record<number, number>,
): number | null {
  if (fcValue == null) {
    return null;
  }
  return map[fcValue] ?? fcValue;
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

function stringValue(value: unknown) {
  return String(value ?? '').trim();
}

function nullableNumberValue(value: unknown): number | null {
  if (value === '' || value == null) {
    return null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function numberOrFallback(value: unknown, fallback: number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function structuralEcModeValue(value: unknown): MultiPileStructuralEcMode {
  return String(value ?? '') === 'override' ? 'override' : 'auto';
}
