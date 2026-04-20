import { randomUUID } from 'crypto';
import {
  MultiPileCombinationFamily,
  MultiPilePatternType,
  ProjectLoadCase,
  ProjectLoadCombination,
  ProjectLoadCombinationSettings,
  ProjectLoadDefinition,
  ProjectLoadDefinitionSchema,
} from '@eng/shared';

type BuiltInTermMode = 'typeSum' | 'typeEach';

interface BuiltInSpecTerm {
  mode: BuiltInTermMode;
  patternType: MultiPilePatternType;
  factor: (settings: ProjectLoadCombinationSettings) => number;
  allowReverse?: boolean;
}

interface BuiltInSpec {
  key: string;
  displayName: string;
  reference: string;
  family: MultiPileCombinationFamily;
  terms: BuiltInSpecTerm[];
}

const ZERO_TOLERANCE = 1e-9;

const DEFAULT_COMBINATION_SETTINGS: ProjectLoadCombinationSettings = {
  alpha: 0.015,
  psiC: 0.4,
  psiE: 0.3,
  psiL: 0.4,
  groundwaterFactor: 1.5,
  minPermanentFactor: 0.7,
  reduceMinimumPermanentWithPointNine: false,
};

const DEFAULT_LOAD_CASES: ProjectLoadCase[] = [
  { id: 'G', name: 'G', type: 'Permanent', reversible: false, enabled: true, order: 0 },
  { id: 'Q', name: 'Q', type: 'Imposed', reversible: false, enabled: true, order: 1 },
  { id: 'W', name: 'W', type: 'Wind', reversible: true, enabled: true, order: 2 },
  { id: 'E', name: 'E', type: 'Earthquake', reversible: true, enabled: true, order: 3 },
  { id: 'GW', name: 'GW', type: 'Groundwater', reversible: false, enabled: true, order: 4 },
];

export function defaultProjectLoadDefinition(): ProjectLoadDefinition {
  return normalizeProjectLoadDefinition(undefined);
}

export function getProjectLoadDefinitionFromProjectMetadata(
  metadata: unknown,
): ProjectLoadDefinition | null {
  const record = objectValue(metadata);
  if (!record.projectLoadDefinition) {
    return null;
  }
  return normalizeProjectLoadDefinition(record.projectLoadDefinition);
}

export function getProjectLoadDefinitionFromLegacyPileGroups(
  pileGroups: Array<{ metadata: unknown }>,
): ProjectLoadDefinition | null {
  for (const pileGroup of pileGroups) {
    const loadDefinition = getProjectLoadDefinitionFromLegacyMultiPileMetadata(pileGroup.metadata);
    if (loadDefinition) {
      return loadDefinition;
    }
  }
  return null;
}

export function getProjectLoadDefinitionFromLegacyMultiPileMetadata(
  metadata: unknown,
): ProjectLoadDefinition | null {
  const base = objectValue(metadata);
  const multiPile = objectValue(base.multiPile);
  const hasLegacyLoadDefinition =
    'combinationSettings' in multiPile ||
    'loadPatterns' in multiPile ||
    'combinationLibrary' in multiPile;
  if (!hasLegacyLoadDefinition) {
    return null;
  }

  return normalizeProjectLoadDefinition({
    combinationSettings: multiPile.combinationSettings,
    loadCases: multiPile.loadPatterns,
    loadCombinations: multiPile.combinationLibrary,
  });
}

export function getHydratedProjectMetadataWithLoadDefinition(
  metadata: unknown,
  pileGroups: Array<{ metadata: unknown }>,
): Record<string, unknown> {
  const base = objectValue(metadata);
  const projectLoadDefinition =
    getProjectLoadDefinitionFromProjectMetadata(base) ??
    getProjectLoadDefinitionFromLegacyPileGroups(pileGroups) ??
    defaultProjectLoadDefinition();

  return {
    ...base,
    projectLoadDefinition,
  };
}

export function mergeProjectMetadataWithLoadDefinition(
  metadata: unknown,
  rawProjectLoadDefinition: unknown,
): Record<string, unknown> {
  const base = objectValue(metadata);
  return {
    ...base,
    projectLoadDefinition: normalizeProjectLoadDefinition(rawProjectLoadDefinition),
  };
}

export function stripLegacyProjectLoadDefinitionFromPileGroupMetadata(
  metadata: unknown,
): Record<string, unknown> {
  const base = objectValue(metadata);
  const multiPile = objectValue(base.multiPile);
  const {
    combinationSettings: _combinationSettings,
    loadPatterns: _loadPatterns,
    combinationLibrary: _combinationLibrary,
    ...remainingMultiPile
  } = multiPile;

  return {
    ...base,
    multiPile: remainingMultiPile,
  };
}

export function normalizeProjectLoadDefinition(raw: unknown): ProjectLoadDefinition {
  const record = objectValue(raw);
  const combinationSettings = normalizeCombinationSettings(record.combinationSettings);
  const loadCases = normalizeLoadCases(record.loadCases ?? record.patterns);
  const loadCombinations = normalizeLoadCombinations(
    record.loadCombinations ?? record.combinations,
    loadCases,
    combinationSettings,
  );

  return ProjectLoadDefinitionSchema.parse({
    version: 1,
    standardSet: 'eng-default-v1',
    combinationSettings,
    loadCases,
    loadCombinations,
    metadata: objectValue(record.metadata),
  });
}

function normalizeCombinationSettings(raw: unknown): ProjectLoadCombinationSettings {
  const record = objectValue(raw);
  return {
    alpha: numberValue(record.alpha, DEFAULT_COMBINATION_SETTINGS.alpha, { min: 0 }),
    psiC: numberValue(record.psiC, DEFAULT_COMBINATION_SETTINGS.psiC, { min: 0 }),
    psiE: numberValue(record.psiE, DEFAULT_COMBINATION_SETTINGS.psiE, { min: 0 }),
    psiL: numberValue(record.psiL, DEFAULT_COMBINATION_SETTINGS.psiL, { min: 0 }),
    groundwaterFactor: numberValue(
      record.groundwaterFactor,
      DEFAULT_COMBINATION_SETTINGS.groundwaterFactor,
      { min: 0 },
    ),
    minPermanentFactor: numberValue(
      record.minPermanentFactor,
      DEFAULT_COMBINATION_SETTINGS.minPermanentFactor,
      { min: 0 },
    ),
    reduceMinimumPermanentWithPointNine:
      record.reduceMinimumPermanentWithPointNine === undefined
        ? DEFAULT_COMBINATION_SETTINGS.reduceMinimumPermanentWithPointNine
        : Boolean(record.reduceMinimumPermanentWithPointNine),
  };
}

function normalizeLoadCases(raw: unknown): ProjectLoadCase[] {
  const rows = Array.isArray(raw) ? raw : [];
  const seen = new Set<string>();
  const source = rows.length ? rows : DEFAULT_LOAD_CASES;

  return source.map((value, index) => {
    const row = objectValue(value);
    const fallback = DEFAULT_LOAD_CASES[index] ?? {
      id: `LC${index + 1}`,
      name: `LC${index + 1}`,
      type: 'Other' as const,
      reversible: false,
      enabled: true,
      order: index,
    };
    const id = uniqueId(seen, stringValue(row.id, fallback.id));
    const type = patternTypeValue(row.type ?? row.patternType, fallback.type);
    const metadata = objectValue(row.metadata);

    return {
      id,
      name: stringValue(row.name ?? row.displayName, id),
      type,
      reversible: row.reversible === undefined ? fallback.reversible : Boolean(row.reversible),
      enabled: row.enabled === undefined ? true : Boolean(row.enabled),
      order: index,
      ...(Object.keys(metadata).length ? { metadata } : {}),
    };
  });
}

function normalizeLoadCombinations(
  raw: unknown,
  loadCases: ProjectLoadCase[],
  settings: ProjectLoadCombinationSettings,
): ProjectLoadCombination[] {
  const rows = Array.isArray(raw) ? raw : [];
  const loadCaseIds = new Set(loadCases.map((loadCase) => loadCase.id));
  const builtInByKey = new Map<string, ProjectLoadCombination>();
  const customRows: ProjectLoadCombination[] = [];

  rows.forEach((value, index) => {
    const row = objectValue(value);
    const source = row.source === 'built-in' ? 'built-in' : 'custom';
    const kind = row.kind === 'envelope' ? 'envelope' : 'linear';
    const name = stringValue(
      row.name ?? row.displayName,
      source === 'custom' ? `Custom ${index + 1}` : '',
    );
    const enabled = row.enabled === undefined ? true : Boolean(row.enabled);
    const includeInEnvelope =
      row.includeInEnvelope === undefined ? true : Boolean(row.includeInEnvelope);
    const metadata = objectValue(row.metadata);

    if (source === 'built-in') {
      const builtinKey = stringValue(row.builtinKey, '');
      if (!builtinKey) return;
      builtInByKey.set(builtinKey, {
        id: stringValue(row.id, builtInId(builtinKey)),
        builtinKey,
        name: name || builtinKey,
        source: 'built-in',
        kind,
        enabled,
        includeInEnvelope,
        reference: optionalStringValue(row.reference),
        family: familyValue(row.family),
        reversibleAware:
          row.reversibleAware === undefined ? undefined : Boolean(row.reversibleAware),
        factors: undefined,
        childCombinationIds: undefined,
        expressionSummary: optionalStringValue(row.expressionSummary),
        order: index,
        ...(Object.keys(metadata).length ? { metadata } : {}),
      });
      return;
    }

    const rawFactors = Array.isArray(row.factors)
      ? row.factors
      : Array.isArray(row.terms)
        ? row.terms
        : [];

    const factors = rawFactors
      .map((termValue) => {
        const term = objectValue(termValue);
        const loadCaseId = stringValue(term.loadCaseId ?? term.patternId, '');
        if (!loadCaseIds.has(loadCaseId)) return null;
        const factor = numberValue(term.factor, 0);
        if (Math.abs(factor) <= ZERO_TOLERANCE) return null;
        return { loadCaseId, factor };
      })
      .filter(Boolean) as ProjectLoadCombination['factors'];

    customRows.push({
      id: stringValue(row.id, randomUUID()),
      name,
      source: 'custom',
      kind,
      enabled,
      includeInEnvelope,
      reference: optionalStringValue(row.reference),
      family: familyValue(row.family) ?? 'custom',
      reversibleAware: row.reversibleAware === undefined ? undefined : Boolean(row.reversibleAware),
      factors,
      childCombinationIds: Array.isArray(row.childCombinationIds)
        ? row.childCombinationIds.map((item) => String(item)).filter(Boolean)
        : undefined,
      expressionSummary: optionalStringValue(row.expressionSummary),
      order: customRows.length,
      ...(Object.keys(metadata).length ? { metadata } : {}),
    });
  });

  const builtIns = getBuiltInSpecs(settings).map((spec, index) => {
    const existing = builtInByKey.get(spec.key);
    return {
      id: existing?.id ?? builtInId(spec.key),
      builtinKey: spec.key,
      name: spec.displayName,
      source: 'built-in' as const,
      kind: 'linear' as const,
      enabled: existing?.enabled ?? true,
      includeInEnvelope: existing?.includeInEnvelope ?? true,
      reference: spec.reference,
      family: spec.family,
      reversibleAware: spec.terms.some((term) => term.allowReverse),
      factors: undefined,
      childCombinationIds: undefined,
      expressionSummary: builtInExpressionSummary(spec, settings),
      order: index,
      ...(existing?.metadata ? { metadata: existing.metadata } : {}),
    };
  });

  return [
    ...builtIns,
    ...customRows.map((row, index) => ({
      ...row,
      order: builtIns.length + index,
      expressionSummary: row.expressionSummary || customExpressionSummary(row),
    })),
  ];
}

function getBuiltInSpecs(settings: ProjectLoadCombinationSettings): BuiltInSpec[] {
  return [
    {
      key: 'STR-4.2.2(a)',
      displayName: 'AS/NZS 1170.0 Cl 4.2.2(a)',
      reference: 'AS/NZS 1170.0 Cl 4.2.2(a)',
      family: 'strength',
      terms: [{ mode: 'typeSum', patternType: 'Permanent', factor: () => 1.35 }],
    },
    {
      key: 'STR-4.2.2(b)',
      displayName: 'AS/NZS 1170.0 Cl 4.2.2(b)',
      reference: 'AS/NZS 1170.0 Cl 4.2.2(b)',
      family: 'strength',
      terms: [
        { mode: 'typeSum', patternType: 'Permanent', factor: () => 1.2 },
        { mode: 'typeSum', patternType: 'Imposed', factor: () => 1.5 },
      ],
    },
    {
      key: 'STR-4.2.2(c)',
      displayName: 'AS/NZS 1170.0 Cl 4.2.2(c)',
      reference: 'AS/NZS 1170.0 Cl 4.2.2(c)',
      family: 'strength',
      terms: [
        { mode: 'typeSum', patternType: 'Permanent', factor: () => 1.2 },
        { mode: 'typeSum', patternType: 'Imposed', factor: (current) => 1.5 * current.psiL },
      ],
    },
    {
      key: 'STR-4.2.2(d)',
      displayName: 'AS/NZS 1170.0 Cl 4.2.2(d)',
      reference: 'AS/NZS 1170.0 Cl 4.2.2(d)',
      family: 'strength',
      terms: [
        { mode: 'typeSum', patternType: 'Permanent', factor: () => 1.2 },
        { mode: 'typeEach', patternType: 'Wind', factor: () => 1.0, allowReverse: true },
        { mode: 'typeSum', patternType: 'Imposed', factor: (current) => current.psiC },
      ],
    },
    {
      key: 'STR-4.2.2(e)',
      displayName: 'AS/NZS 1170.0 Cl 4.2.2(e)',
      reference: 'AS/NZS 1170.0 Cl 4.2.2(e)',
      family: 'strength',
      terms: [
        { mode: 'typeSum', patternType: 'Permanent', factor: () => 0.9 },
        { mode: 'typeEach', patternType: 'Wind', factor: () => 1.0, allowReverse: true },
      ],
    },
    {
      key: 'STR-4.2.2(f)',
      displayName: 'AS/NZS 1170.0 Cl 4.2.2(f)',
      reference: 'AS/NZS 1170.0 Cl 4.2.2(f)',
      family: 'strength',
      terms: [
        { mode: 'typeSum', patternType: 'Permanent', factor: () => 1.0 },
        { mode: 'typeEach', patternType: 'Earthquake', factor: () => 1.0, allowReverse: true },
        { mode: 'typeSum', patternType: 'Imposed', factor: (current) => current.psiE },
      ],
    },
    {
      key: 'STR-4.2.2(g)+4.2.3(e)',
      displayName: 'AS/NZS 1170.0 Cl 4.2.2(g) + 4.2.3(e)',
      reference: 'AS/NZS 1170.0 Cl 4.2.2(g) + 4.2.3(e)',
      family: 'strength',
      terms: [
        { mode: 'typeSum', patternType: 'Permanent', factor: () => 1.2 },
        {
          mode: 'typeSum',
          patternType: 'Groundwater',
          factor: (current) => current.groundwaterFactor,
        },
        { mode: 'typeSum', patternType: 'Imposed', factor: (current) => current.psiC },
      ],
    },
    {
      key: 'DERIVED-STB-4.2.1(a)+4.2.3(e)',
      displayName: 'Derived from AS/NZS 1170.0 Cl 4.2.1(a) + 4.2.3(e)',
      reference: 'Derived from AS/NZS 1170.0 Cl 4.2.1(a) + 4.2.3(e)',
      family: 'derived',
      terms: [
        { mode: 'typeSum', patternType: 'Permanent', factor: () => 0.9 },
        {
          mode: 'typeSum',
          patternType: 'Groundwater',
          factor: (current) => current.groundwaterFactor,
        },
      ],
    },
    {
      key: 'CUSTOM-DWSTOP',
      displayName: 'Custom dewatering stop case',
      reference: 'Custom construction stage / dewatering stop case',
      family: 'custom',
      terms: [
        {
          mode: 'typeSum',
          patternType: 'Permanent',
          factor: (current) =>
            current.minPermanentFactor * (current.reduceMinimumPermanentWithPointNine ? 0.9 : 1),
        },
        {
          mode: 'typeSum',
          patternType: 'Groundwater',
          factor: (current) => current.groundwaterFactor,
        },
      ],
    },
  ];
}

function builtInId(key: string): string {
  return `builtin_${key.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
}

function builtInExpressionSummary(
  spec: BuiltInSpec,
  settings: ProjectLoadCombinationSettings,
): string {
  return spec.terms
    .map((term) => {
      const factor = term.factor(settings);
      const suffix = term.mode === 'typeEach' && term.allowReverse ? ' (each, reversible)' : '';
      return `${formatFactor(factor)}${term.patternType}${suffix}`;
    })
    .join(' + ');
}

function customExpressionSummary(row: ProjectLoadCombination): string {
  if (!row.factors?.length) return row.name;
  return row.factors.map((term) => `${formatFactor(term.factor)}${term.loadCaseId}`).join(' + ');
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown, fallback: string): string {
  const candidate = String(value ?? '').trim();
  return candidate || fallback;
}

function optionalStringValue(value: unknown): string | undefined {
  const candidate = String(value ?? '').trim();
  return candidate || undefined;
}

function numberValue(value: unknown, fallback: number, opts?: { min?: number }): number {
  const candidate = Number(value);
  if (!Number.isFinite(candidate)) {
    return fallback;
  }
  if (opts?.min !== undefined && candidate < opts.min) {
    return opts.min;
  }
  return candidate;
}

function uniqueId(seen: Set<string>, base: string): string {
  let candidate = base || randomUUID();
  let suffix = 2;
  while (seen.has(candidate)) {
    candidate = `${base}_${suffix++}`;
  }
  seen.add(candidate);
  return candidate;
}

function patternTypeValue(value: unknown, fallback: MultiPilePatternType): MultiPilePatternType {
  const candidate = String(value ?? '');
  return (
    ['Permanent', 'Imposed', 'Wind', 'Earthquake', 'Groundwater', 'Other'].includes(candidate)
      ? candidate
      : fallback
  ) as MultiPilePatternType;
}

function familyValue(value: unknown): MultiPileCombinationFamily | undefined {
  const candidate = String(value ?? '');
  if (candidate === 'strength' || candidate === 'derived' || candidate === 'custom') {
    return candidate;
  }
  return undefined;
}

function formatFactor(value: number): string {
  if (Math.abs(value - Math.round(value)) < 1e-9) {
    return `${Math.round(value)}×`;
  }
  return `${value.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')}×`;
}
