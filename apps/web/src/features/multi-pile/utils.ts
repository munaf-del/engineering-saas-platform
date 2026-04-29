import {
  buildMultiPileEnvelopeInputSignature,
  DEFAULT_PROJECT_STRUCTURAL_CONCRETE_CLASS_ID,
  DEFAULT_PROJECT_STRUCTURAL_COVER_CLASS_ID,
  DEFAULT_PROJECT_STRUCTURAL_REINFORCEMENT_GRADE_ID,
  MULTI_PILE_STANDARD_PILE_DIAMETERS_MM,
  MULTI_PILE_UNASSIGNED_PILE_TYPE_ID,
  type MultiPileGeneratedPile,
  type MultiPileJoint,
  type MultiPileJointLoadRow,
  MultiPileCombinationRow,
  MultiPileEnvelopeRunSummary,
  MultiPileGeoTypeSettings,
  MultiPilePileTypeDefinition,
  MultiPileState,
} from '@eng/shared';

export type MultiPileDraftUpdater = (updater: (current: MultiPileState) => MultiPileState) => void;
export type MultiPileJointLoadField = keyof Omit<MultiPileJointLoadRow, 'jointId' | 'patternId'>;
export interface MultiPileDerivedPileRegisterRow {
  id: string;
  parentJointId: string;
  parentJointLabel: string;
  supportIndex: number;
  supportCount: number;
  pileTypeId: string;
  pileTypeLabel: string;
  includedInAnalysis: boolean;
  status: string;
}

export const MULTI_PILE_JOINT_LOAD_FIELDS = [
  'p',
  'vx',
  'vy',
  'mx',
  'my',
  'mz',
] as const satisfies readonly MultiPileJointLoadField[];

const DEFAULT_PILE_SIZE_PRESET = String(MULTI_PILE_STANDARD_PILE_DIAMETERS_MM[2] ?? 600);
const DEFAULT_PILE_DIAMETER_MM = Number(DEFAULT_PILE_SIZE_PRESET);
const DEFAULT_STRUCTURAL_FC_GRADE = '32';
const DEFAULT_STRUCTURAL_FC_MPA = 32;
const DEFAULT_STRUCTURAL_EC_MPA = 30100;
const DEFAULT_STRUCTURAL_FSY_MPA = 500;
const DEFAULT_STRUCTURAL_ES_MPA = 200000;
const BAR_DIA_OPTIONS = [16, 20, 24, 28, 32, 36, 40] as const;
const TIE_DIA_OPTIONS = [10, 12, 16] as const;

type StructHeadDetail = 'straight' | '90out' | '90in' | '180in' | '180out';
type StructTransverseSystem = 'ties' | 'spiral';
type StructAxialModel = 'reinforced' | 'partial' | 'plain';
type StructKMethod = 'all' | 'cfa' | 'drillfluid' | 'preformed';
type StructMinReoRule = 'other_embedded' | 'other_above' | 'precast';
type StructReoLoc = 'below3d' | 'within3d';
type StructReoLocDetail = 'above' | 'within3d' | 'below3d';
type StructUseBiax = 'YES' | 'NO';
type StructBrace = 'BRACED' | 'UNBRACED';
type MultiPileJointLoadBlankFieldMap = Partial<Record<MultiPileJointLoadField, true>>;
type MultiPileJointLoadAuthoringUiState = {
  blankFieldsByRowKey: Record<string, MultiPileJointLoadBlankFieldMap>;
  authoredZeroRowsByKey: Record<string, true>;
};

type StructReoDefaults = {
  barDia: number;
  nBars: number;
  tieDia: number;
  tieS: number;
  tieLegs: number;
  transverseSystem: StructTransverseSystem;
  spiralDia: number;
  spiralPitch: number;
};

const REO_DEFAULTS_BY_DIAMETER: Record<number, StructReoDefaults> = {
  450: {
    barDia: 20,
    nBars: 6,
    tieDia: 12,
    tieS: 200,
    tieLegs: 2,
    transverseSystem: 'ties',
    spiralDia: 12,
    spiralPitch: 200,
  },
  500: {
    barDia: 20,
    nBars: 6,
    tieDia: 12,
    tieS: 200,
    tieLegs: 2,
    transverseSystem: 'ties',
    spiralDia: 12,
    spiralPitch: 200,
  },
  600: {
    barDia: 20,
    nBars: 8,
    tieDia: 12,
    tieS: 200,
    tieLegs: 2,
    transverseSystem: 'ties',
    spiralDia: 12,
    spiralPitch: 200,
  },
  750: {
    barDia: 20,
    nBars: 10,
    tieDia: 12,
    tieS: 200,
    tieLegs: 2,
    transverseSystem: 'ties',
    spiralDia: 12,
    spiralPitch: 200,
  },
  900: {
    barDia: 20,
    nBars: 12,
    tieDia: 12,
    tieS: 200,
    tieLegs: 2,
    transverseSystem: 'ties',
    spiralDia: 12,
    spiralPitch: 200,
  },
  1050: {
    barDia: 20,
    nBars: 14,
    tieDia: 12,
    tieS: 200,
    tieLegs: 2,
    transverseSystem: 'ties',
    spiralDia: 12,
    spiralPitch: 200,
  },
  1200: {
    barDia: 20,
    nBars: 16,
    tieDia: 12,
    tieS: 200,
    tieLegs: 2,
    transverseSystem: 'ties',
    spiralDia: 12,
    spiralPitch: 200,
  },
  1500: {
    barDia: 24,
    nBars: 20,
    tieDia: 16,
    tieS: 200,
    tieLegs: 2,
    transverseSystem: 'ties',
    spiralDia: 16,
    spiralPitch: 200,
  },
  1800: {
    barDia: 24,
    nBars: 24,
    tieDia: 16,
    tieS: 200,
    tieLegs: 2,
    transverseSystem: 'ties',
    spiralDia: 16,
    spiralPitch: 200,
  },
};

export const MULTI_PILE_STRUCT_DESIGNER_UI_STATE_KEY = 'multiPileStructDesigner';
export const MULTI_PILE_JOINT_LOAD_AUTHORING_UI_STATE_KEY = 'multiPileJointLoadAuthoring';

export interface MultiPileStructTypeSettings {
  typeId: string;
  linkedDmm: number;
  concreteClassId: string;
  reinforcementGradeId: string;
  tendonGradeId: string;
  coverDurabilityClassId: string;
  fcGrade: string;
  fcCustom: number;
  fc: number;
  Ec: number;
  fsy: number;
  kPlace: '1.0' | '0.75';
  kMethod: StructKMethod;
  axModel: StructAxialModel;
  reoCutDepth: number;
  reoLd: number;
  minReoRule: StructMinReoRule;
  reoLoc: StructReoLoc;
  reoLocDetail: StructReoLocDetail;
  allowAsOver: boolean;
  phiOverride: boolean;
  phiC: number;
  phiT: number;
  barDia: number;
  nBars: number;
  cover: number;
  Es: number;
  useBiax: StructUseBiax;
  brace: StructBrace;
  Le: string;
  transverseSystem: StructTransverseSystem;
  tieDia: number;
  tieS: number;
  tieLegs: number;
  spiralDia: number;
  spiralPitch: number;
  dg: number;
  useCentralBar: boolean;
  centralBarDia: number;
  centralBarCount: number;
  centralBarDevelopedAtHead: boolean;
  perimHeadDetail: StructHeadDetail;
  centralHeadDetail: StructHeadDetail;
  perimProjectionAboveHead: number;
  centralProjectionAboveHead: number;
}

export interface MultiPileStructDesignerUiState {
  typeSettingsByTypeId?: Record<string, MultiPileStructTypeSettings>;
}

export function nextId(prefix: string) {
  const randomPart =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${randomPart}`;
}

export function numberFromInput(value: string, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function defaultGeoTypeSettings(
  pileType: Pick<MultiPilePileTypeDefinition, 'id' | 'nominalDiameterMm' | 'Dmm'>,
): MultiPileGeoTypeSettings {
  return {
    typeId: pileType.id,
    linkedDmm: Math.max(0, Number(pileType.Dmm || pileType.nominalDiameterMm || 0)),
    redundancy: 'LOW',
    shaftRedComp: 1,
    shaftRedTen: 0.5,
    useNnf: false,
    Nnf: 0,
    s1H: 0,
    s1qs: 0,
    s1MaterialId: '',
    s2H: 0,
    s2qs: 0,
    s2MaterialId: '',
    s3H: 0,
    s3qs: 0,
    s3MaterialId: '',
    Ls: 0,
    useLsMinOverride: false,
    LsMinOverride: 0,
    qsRock: 0,
    qbRock: 0,
    foundingMaterialId: '',
    useBase: 'YES',
    LsMode: 'pending',
    LsSolved: 0,
    LsManual: 0,
    LsAdopted: 0,
    socketOverrideEnabled: false,
  };
}

export function normalizeGeoTypeSettings(
  pileType: Pick<MultiPilePileTypeDefinition, 'id' | 'nominalDiameterMm' | 'Dmm'>,
  raw: unknown,
): MultiPileGeoTypeSettings {
  const base = defaultGeoTypeSettings(pileType);
  const candidate =
    raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const next: MultiPileGeoTypeSettings = {
    ...base,
    ...candidate,
    typeId: pileType.id,
    linkedDmm: Math.max(0, numberFromInput(String(candidate.linkedDmm ?? base.linkedDmm))),
    redundancy: candidate.redundancy === 'HIGH' ? 'HIGH' : 'LOW',
    shaftRedComp: Math.max(0, numberFromInput(String(candidate.shaftRedComp ?? base.shaftRedComp))),
    shaftRedTen: Math.max(0, numberFromInput(String(candidate.shaftRedTen ?? base.shaftRedTen))),
    useNnf: Boolean(candidate.useNnf),
    Nnf: Math.max(0, numberFromInput(String(candidate.Nnf ?? base.Nnf))),
    s1H: Math.max(0, numberFromInput(String(candidate.s1H ?? base.s1H))),
    s1qs: Math.max(0, numberFromInput(String(candidate.s1qs ?? base.s1qs))),
    s1MaterialId: String(candidate.s1MaterialId ?? '').trim(),
    s2H: Math.max(0, numberFromInput(String(candidate.s2H ?? base.s2H))),
    s2qs: Math.max(0, numberFromInput(String(candidate.s2qs ?? base.s2qs))),
    s2MaterialId: String(candidate.s2MaterialId ?? '').trim(),
    s3H: Math.max(0, numberFromInput(String(candidate.s3H ?? base.s3H))),
    s3qs: Math.max(0, numberFromInput(String(candidate.s3qs ?? base.s3qs))),
    s3MaterialId: String(candidate.s3MaterialId ?? '').trim(),
    Ls: Math.max(0, numberFromInput(String(candidate.Ls ?? base.Ls))),
    useLsMinOverride: Boolean(candidate.useLsMinOverride),
    LsMinOverride: Math.max(
      0,
      numberFromInput(String(candidate.LsMinOverride ?? base.LsMinOverride)),
    ),
    qsRock: Math.max(0, numberFromInput(String(candidate.qsRock ?? base.qsRock))),
    qbRock: Math.max(0, numberFromInput(String(candidate.qbRock ?? base.qbRock))),
    foundingMaterialId: String(candidate.foundingMaterialId ?? '').trim(),
    useBase: candidate.useBase === 'NO' ? 'NO' : 'YES',
    LsMode:
      candidate.LsMode === 'auto' || candidate.LsMode === 'manual' ? candidate.LsMode : 'pending',
    LsSolved: Math.max(0, numberFromInput(String(candidate.LsSolved ?? base.LsSolved))),
    LsManual: Math.max(0, numberFromInput(String(candidate.LsManual ?? base.LsManual))),
    LsAdopted: Math.max(0, numberFromInput(String(candidate.LsAdopted ?? base.LsAdopted))),
    socketOverrideEnabled: Boolean(candidate.socketOverrideEnabled),
  };

  return next;
}

function nearestStructReoDefaults(dmm: number): StructReoDefaults {
  const diameter = Math.max(50, Number(dmm || DEFAULT_PILE_DIAMETER_MM));
  const sizes = Object.keys(REO_DEFAULTS_BY_DIAMETER)
    .map(Number)
    .sort((left, right) => left - right);
  let nearest = sizes[0] ?? DEFAULT_PILE_DIAMETER_MM;

  sizes.forEach((size) => {
    if (Math.abs(size - diameter) < Math.abs(nearest - diameter)) {
      nearest = size;
    }
  });

  return (
    REO_DEFAULTS_BY_DIAMETER[nearest] ??
    REO_DEFAULTS_BY_DIAMETER[DEFAULT_PILE_DIAMETER_MM] ??
    REO_DEFAULTS_BY_DIAMETER[600]!
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function numberValue(raw: unknown, fallback: number, options?: { min?: number; max?: number }) {
  const numeric = Number(raw);
  const base = Number.isFinite(numeric) ? numeric : fallback;
  const lower = options?.min ?? -Infinity;
  const upper = options?.max ?? Infinity;
  return clamp(base, lower, upper);
}

function nullableNumberValue(raw: unknown, options?: { min?: number; max?: number }) {
  if (raw === null || raw === undefined || raw === '') {
    return null;
  }

  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) {
    return null;
  }

  const lower = options?.min ?? -Infinity;
  const upper = options?.max ?? Infinity;
  return clamp(numeric, lower, upper);
}

function stringValue(raw: unknown, fallback = '') {
  return String(raw ?? fallback).trim();
}

function oneOf<T extends string>(raw: unknown, allowed: readonly T[], fallback: T): T {
  const value = String(raw ?? '').trim() as T;
  return allowed.includes(value) ? value : fallback;
}

function oneOfNumber<T extends number>(raw: unknown, allowed: readonly T[], fallback: T): T {
  const numeric = Number(raw);
  return allowed.includes(numeric as T) ? (numeric as T) : fallback;
}

function objectValue(raw: unknown) {
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
}

function normalizeJointLoadBlankFieldsByRowKey(
  raw: unknown,
): Record<string, MultiPileJointLoadBlankFieldMap> {
  const candidate = objectValue(raw);
  const next = Object.fromEntries(
    Object.entries(candidate)
      .map(([rowKey, value]) => {
        const rowFields = objectValue(value);
        const blankFields = Object.fromEntries(
          MULTI_PILE_JOINT_LOAD_FIELDS.filter((field) => Boolean(rowFields[field])).map((field) => [
            field,
            true,
          ]),
        ) as MultiPileJointLoadBlankFieldMap;

        return Object.keys(blankFields).length > 0 ? [rowKey, blankFields] : null;
      })
      .filter((entry): entry is [string, MultiPileJointLoadBlankFieldMap] => Boolean(entry)),
  );

  return next;
}

function normalizeJointLoadAuthoredZeroRowsByKey(raw: unknown): Record<string, true> {
  const candidate = objectValue(raw);
  return Object.fromEntries(
    Object.entries(candidate)
      .filter(([, value]) => Boolean(value))
      .map(([rowKey]) => [rowKey, true]),
  );
}

function createAllBlankJointLoadFieldMap(): MultiPileJointLoadBlankFieldMap {
  return Object.fromEntries(
    MULTI_PILE_JOINT_LOAD_FIELDS.map((field) => [field, true]),
  ) as MultiPileJointLoadBlankFieldMap;
}

function areAllJointLoadFieldsBlank(blankFields: Partial<Record<MultiPileJointLoadField, true>>) {
  return MULTI_PILE_JOINT_LOAD_FIELDS.every((field) => Boolean(blankFields[field]));
}

function normalizedLeValue(raw: unknown) {
  const text = String(raw ?? '').trim();
  if (!text) {
    return '';
  }
  const numeric = Number(text);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return '';
  }
  return String(numeric);
}

export function defaultStructTypeSettings(
  pileType: Pick<MultiPilePileTypeDefinition, 'id' | 'nominalDiameterMm' | 'Dmm'>,
): MultiPileStructTypeSettings {
  const linkedDmm = Math.max(
    50,
    Number(pileType.Dmm || pileType.nominalDiameterMm || DEFAULT_PILE_DIAMETER_MM),
  );
  const reoDefaults = nearestStructReoDefaults(linkedDmm);

  return {
    typeId: pileType.id,
    linkedDmm,
    concreteClassId: DEFAULT_PROJECT_STRUCTURAL_CONCRETE_CLASS_ID,
    reinforcementGradeId: DEFAULT_PROJECT_STRUCTURAL_REINFORCEMENT_GRADE_ID,
    tendonGradeId: '',
    coverDurabilityClassId: DEFAULT_PROJECT_STRUCTURAL_COVER_CLASS_ID,
    fcGrade: DEFAULT_STRUCTURAL_FC_GRADE,
    fcCustom: DEFAULT_STRUCTURAL_FC_MPA,
    fc: DEFAULT_STRUCTURAL_FC_MPA,
    Ec: DEFAULT_STRUCTURAL_EC_MPA,
    fsy: DEFAULT_STRUCTURAL_FSY_MPA,
    kPlace: '1.0',
    kMethod: 'all',
    axModel: 'reinforced',
    reoCutDepth: 0,
    reoLd: 0,
    minReoRule: 'other_embedded',
    reoLoc: 'below3d',
    reoLocDetail: 'below3d',
    allowAsOver: false,
    phiOverride: false,
    phiC: 0.65,
    phiT: 0.85,
    barDia: reoDefaults.barDia,
    nBars: reoDefaults.nBars,
    cover: 75,
    Es: DEFAULT_STRUCTURAL_ES_MPA,
    useBiax: 'YES',
    brace: 'BRACED',
    Le: '',
    transverseSystem: reoDefaults.transverseSystem,
    tieDia: reoDefaults.tieDia,
    tieS: reoDefaults.tieS,
    tieLegs: reoDefaults.tieLegs,
    spiralDia: reoDefaults.spiralDia,
    spiralPitch: reoDefaults.spiralPitch,
    dg: 20,
    useCentralBar: false,
    centralBarDia: 24,
    centralBarCount: 0,
    centralBarDevelopedAtHead: false,
    perimHeadDetail: 'straight',
    centralHeadDetail: 'straight',
    perimProjectionAboveHead: 0,
    centralProjectionAboveHead: 0,
  };
}

export function normalizeStructTypeSettings(
  pileType: Pick<MultiPilePileTypeDefinition, 'id' | 'nominalDiameterMm' | 'Dmm'>,
  raw: unknown,
): MultiPileStructTypeSettings {
  const defaults = defaultStructTypeSettings(pileType);
  const rawCandidate =
    raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null;
  const candidate = objectValue(raw);
  const hasExplicitConcreteClassId = Boolean(
    rawCandidate && Object.prototype.hasOwnProperty.call(rawCandidate, 'concreteClassId'),
  );
  const hasExplicitReinforcementGradeId = Boolean(
    rawCandidate && Object.prototype.hasOwnProperty.call(rawCandidate, 'reinforcementGradeId'),
  );
  const hasExplicitTendonGradeId = Boolean(
    rawCandidate && Object.prototype.hasOwnProperty.call(rawCandidate, 'tendonGradeId'),
  );
  const hasExplicitCoverClassId = Boolean(
    rawCandidate && Object.prototype.hasOwnProperty.call(rawCandidate, 'coverDurabilityClassId'),
  );

  return {
    ...defaults,
    ...candidate,
    typeId: pileType.id,
    linkedDmm: Math.max(
      50,
      numberValue(candidate.linkedDmm ?? defaults.linkedDmm, defaults.linkedDmm),
    ),
    concreteClassId: hasExplicitConcreteClassId
      ? String(candidate.concreteClassId ?? '').trim()
      : stringValue(candidate.concreteClassId, defaults.concreteClassId),
    reinforcementGradeId: hasExplicitReinforcementGradeId
      ? String(candidate.reinforcementGradeId ?? '').trim()
      : stringValue(candidate.reinforcementGradeId, defaults.reinforcementGradeId),
    tendonGradeId: hasExplicitTendonGradeId
      ? String(candidate.tendonGradeId ?? '').trim()
      : stringValue(candidate.tendonGradeId, defaults.tendonGradeId),
    coverDurabilityClassId: hasExplicitCoverClassId
      ? String(candidate.coverDurabilityClassId ?? '').trim()
      : stringValue(candidate.coverDurabilityClassId, defaults.coverDurabilityClassId),
    fcGrade: stringValue(candidate.fcGrade, defaults.fcGrade) || defaults.fcGrade,
    fcCustom: Math.max(10, numberValue(candidate.fcCustom, defaults.fcCustom)),
    fc: Math.max(10, numberValue(candidate.fc, defaults.fc)),
    Ec: Math.max(1000, numberValue(candidate.Ec, defaults.Ec)),
    fsy: Math.max(250, numberValue(candidate.fsy, defaults.fsy)),
    kPlace: oneOf(candidate.kPlace, ['1.0', '0.75'] as const, defaults.kPlace),
    kMethod: oneOf(
      candidate.kMethod,
      ['all', 'cfa', 'drillfluid', 'preformed'] as const,
      defaults.kMethod,
    ),
    axModel: oneOf(
      candidate.axModel,
      ['reinforced', 'partial', 'plain'] as const,
      defaults.axModel,
    ),
    reoCutDepth: Math.max(0, numberValue(candidate.reoCutDepth, defaults.reoCutDepth)),
    reoLd: Math.max(0, numberValue(candidate.reoLd, defaults.reoLd)),
    minReoRule: oneOf(
      candidate.minReoRule,
      ['other_embedded', 'other_above', 'precast'] as const,
      defaults.minReoRule,
    ),
    reoLoc: oneOf(candidate.reoLoc, ['below3d', 'within3d'] as const, defaults.reoLoc),
    reoLocDetail: oneOf(
      candidate.reoLocDetail,
      ['above', 'within3d', 'below3d'] as const,
      defaults.reoLocDetail,
    ),
    allowAsOver: Boolean(candidate.allowAsOver),
    phiOverride: Boolean(candidate.phiOverride),
    phiC: clamp(numberValue(candidate.phiC, defaults.phiC), 0.4, 1.0),
    phiT: clamp(numberValue(candidate.phiT, defaults.phiT), 0.4, 1.0),
    barDia: oneOfNumber(candidate.barDia, BAR_DIA_OPTIONS, defaults.barDia),
    nBars: Math.max(0, Math.round(numberValue(candidate.nBars, defaults.nBars))),
    cover: Math.max(0, numberValue(candidate.cover, defaults.cover)),
    Es: Math.max(100000, numberValue(candidate.Es, defaults.Es)),
    useBiax: oneOf(candidate.useBiax, ['YES', 'NO'] as const, defaults.useBiax),
    brace: oneOf(candidate.brace, ['BRACED', 'UNBRACED'] as const, defaults.brace),
    Le: normalizedLeValue(candidate.Le ?? defaults.Le),
    transverseSystem: oneOf(
      candidate.transverseSystem,
      ['ties', 'spiral'] as const,
      defaults.transverseSystem,
    ),
    tieDia: oneOfNumber(candidate.tieDia, TIE_DIA_OPTIONS, defaults.tieDia),
    tieS: Math.max(50, numberValue(candidate.tieS, defaults.tieS)),
    tieLegs: Math.max(2, Math.round(numberValue(candidate.tieLegs, defaults.tieLegs))),
    spiralDia: oneOfNumber(candidate.spiralDia, TIE_DIA_OPTIONS, defaults.spiralDia),
    spiralPitch: Math.max(25, numberValue(candidate.spiralPitch, defaults.spiralPitch)),
    dg: Math.max(10, numberValue(candidate.dg, defaults.dg)),
    useCentralBar: Boolean(candidate.useCentralBar),
    centralBarDia: oneOfNumber(candidate.centralBarDia, BAR_DIA_OPTIONS, defaults.centralBarDia),
    centralBarCount: Math.max(
      0,
      Math.round(numberValue(candidate.centralBarCount, defaults.centralBarCount)),
    ),
    centralBarDevelopedAtHead: Boolean(candidate.centralBarDevelopedAtHead),
    perimHeadDetail: oneOf(
      candidate.perimHeadDetail,
      ['straight', '90out', '90in', '180in', '180out'] as const,
      defaults.perimHeadDetail,
    ),
    centralHeadDetail: oneOf(
      candidate.centralHeadDetail,
      ['straight', '90out', '90in', '180in', '180out'] as const,
      defaults.centralHeadDetail,
    ),
    perimProjectionAboveHead: Math.max(
      0,
      numberValue(candidate.perimProjectionAboveHead, defaults.perimProjectionAboveHead),
    ),
    centralProjectionAboveHead: Math.max(
      0,
      numberValue(candidate.centralProjectionAboveHead, defaults.centralProjectionAboveHead),
    ),
  };
}

export function getStructDesignerUiState(
  state: Pick<MultiPileState, 'uiState'>,
): MultiPileStructDesignerUiState {
  const uiState = objectValue(state.uiState);
  return objectValue(
    uiState[MULTI_PILE_STRUCT_DESIGNER_UI_STATE_KEY],
  ) as MultiPileStructDesignerUiState;
}

export function getStructTypeSettings(
  state: Pick<MultiPileState, 'uiState'>,
  pileType: Pick<MultiPilePileTypeDefinition, 'id' | 'nominalDiameterMm' | 'Dmm'>,
) {
  const structUiState = getStructDesignerUiState(state);
  return normalizeStructTypeSettings(pileType, structUiState.typeSettingsByTypeId?.[pileType.id]);
}

export function setStructTypeSettings(
  state: MultiPileState,
  pileType: Pick<MultiPilePileTypeDefinition, 'id' | 'nominalDiameterMm' | 'Dmm'>,
  settings: MultiPileStructTypeSettings,
): MultiPileState {
  const uiState = objectValue(state.uiState);
  const structUiState = getStructDesignerUiState(state);

  return {
    ...state,
    uiState: {
      ...uiState,
      [MULTI_PILE_STRUCT_DESIGNER_UI_STATE_KEY]: {
        ...structUiState,
        typeSettingsByTypeId: {
          ...(structUiState.typeSettingsByTypeId ?? {}),
          [pileType.id]: normalizeStructTypeSettings(pileType, settings),
        },
      },
    },
  };
}

export function clearGeoRuntimeState(state: MultiPileState): MultiPileState {
  return {
    ...state,
    geoTypeSettings: Object.fromEntries(
      Object.entries(state.geoTypeSettings).map(([typeId, settings]) => {
        const adopted =
          settings.socketOverrideEnabled && settings.LsManual > 0 ? settings.LsManual : 0;
        const mode = settings.socketOverrideEnabled && settings.LsManual > 0 ? 'manual' : 'pending';
        return [
          typeId,
          {
            ...settings,
            Ls: adopted,
            LsSolved: 0,
            LsAdopted: adopted,
            LsMode: mode,
          },
        ];
      }),
    ),
    geoResults: {},
  };
}

export function syncGeoTypeSettingsWithPileTypes(
  geoTypeSettings: Record<string, unknown> | undefined,
  pileTypes: MultiPilePileTypeDefinition[],
) {
  const source = geoTypeSettings ?? {};
  return Object.fromEntries(
    pileTypes.map((pileType) => [
      pileType.id,
      normalizeGeoTypeSettings(pileType, source[pileType.id]),
    ]),
  );
}

export function nullableNumberFromInput(value: string) {
  if (!value.trim()) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function nullableNumberToInput(value: number | null | undefined) {
  return value == null ? '' : String(value);
}

export function jointLoadRowKey(jointId: string, patternId: string) {
  return `${jointId}::${patternId}`;
}

export function emptyJointLoadRow(jointId: string, patternId: string): MultiPileJointLoadRow {
  return {
    jointId,
    patternId,
    p: 0,
    vx: 0,
    vy: 0,
    mx: 0,
    my: 0,
    mz: 0,
  };
}

export function isZeroJointLoadRow(
  row: Pick<MultiPileJointLoadRow, MultiPileJointLoadField>,
): boolean {
  return MULTI_PILE_JOINT_LOAD_FIELDS.every((field) => Math.abs(row[field]) <= 1e-9);
}

export function getJointLoadAuthoringUiState(
  state: Pick<MultiPileState, 'uiState'>,
): MultiPileJointLoadAuthoringUiState {
  const uiState = objectValue(state.uiState);
  const authoring = objectValue(uiState[MULTI_PILE_JOINT_LOAD_AUTHORING_UI_STATE_KEY]);
  return {
    blankFieldsByRowKey: normalizeJointLoadBlankFieldsByRowKey(authoring.blankFieldsByRowKey),
    authoredZeroRowsByKey: normalizeJointLoadAuthoredZeroRowsByKey(authoring.authoredZeroRowsByKey),
  };
}

export function setJointLoadAuthoringUiState(
  state: MultiPileState,
  authoringState: MultiPileJointLoadAuthoringUiState,
): MultiPileState {
  const uiState = objectValue(state.uiState);
  const authoring = objectValue(uiState[MULTI_PILE_JOINT_LOAD_AUTHORING_UI_STATE_KEY]);

  return {
    ...state,
    uiState: {
      ...uiState,
      [MULTI_PILE_JOINT_LOAD_AUTHORING_UI_STATE_KEY]: {
        ...authoring,
        blankFieldsByRowKey: authoringState.blankFieldsByRowKey,
        authoredZeroRowsByKey: authoringState.authoredZeroRowsByKey,
      },
    },
  };
}

export function isJointLoadFieldBlank(
  state: Pick<MultiPileState, 'uiState'>,
  jointId: string,
  patternId: string,
  field: MultiPileJointLoadField,
) {
  const authoring = getJointLoadAuthoringUiState(state);
  return Boolean(authoring.blankFieldsByRowKey[jointLoadRowKey(jointId, patternId)]?.[field]);
}

export function hasAuthoredZeroJointLoadRow(
  state: Pick<MultiPileState, 'uiState'>,
  jointId: string,
  patternId: string,
) {
  const authoring = getJointLoadAuthoringUiState(state);
  return Boolean(authoring.authoredZeroRowsByKey[jointLoadRowKey(jointId, patternId)]);
}

export function setJointLoadCellValue(
  state: MultiPileState,
  jointId: string,
  patternId: string,
  field: MultiPileJointLoadField,
  value: number | null,
): MultiPileState {
  return setJointLoadRowValues(state, jointId, patternId, { [field]: value });
}

export function setJointLoadRowValues(
  state: MultiPileState,
  jointId: string,
  patternId: string,
  values: Partial<Record<MultiPileJointLoadField, number | null>>,
): MultiPileState {
  const rowKey = jointLoadRowKey(jointId, patternId);
  const currentAuthoringState = getJointLoadAuthoringUiState(state);
  const currentBlankFieldsByRowKey = currentAuthoringState.blankFieldsByRowKey;
  const nextBlankFieldsByRowKey = Object.fromEntries(
    Object.entries(currentBlankFieldsByRowKey).map(([key, row]) => [key, { ...row }]),
  );
  const nextAuthoredZeroRowsByKey = { ...currentAuthoringState.authoredZeroRowsByKey };
  const storedRow = state.jointLoads.find(
    (row) => row.jointId === jointId && row.patternId === patternId,
  );
  const nextBlankFields =
    nextBlankFieldsByRowKey[rowKey] ??
    (storedRow || nextAuthoredZeroRowsByKey[rowKey] ? {} : createAllBlankJointLoadFieldMap());
  const currentRow = storedRow ?? emptyJointLoadRow(jointId, patternId);
  const nextRow: MultiPileJointLoadRow = { ...currentRow };

  MULTI_PILE_JOINT_LOAD_FIELDS.forEach((candidateField) => {
    if (!Object.prototype.hasOwnProperty.call(values, candidateField)) {
      return;
    }

    const nextValue = values[candidateField];
    if (nextValue == null) {
      nextRow[candidateField] = 0;
      nextBlankFields[candidateField] = true;
      return;
    }

    nextRow[candidateField] = nextValue;
    delete nextBlankFields[candidateField];
  });

  if (Object.keys(nextBlankFields).length > 0) {
    nextBlankFieldsByRowKey[rowKey] = nextBlankFields;
  } else {
    delete nextBlankFieldsByRowKey[rowKey];
  }

  const jointLoads = state.jointLoads.filter(
    (row) => row.jointId !== jointId || row.patternId !== patternId,
  );
  if (areAllJointLoadFieldsBlank(nextBlankFields)) {
    delete nextAuthoredZeroRowsByKey[rowKey];
  } else if (isZeroJointLoadRow(nextRow)) {
    nextAuthoredZeroRowsByKey[rowKey] = true;
  } else {
    jointLoads.push(nextRow);
    delete nextAuthoredZeroRowsByKey[rowKey];
  }
  jointLoads.sort((left, right) => {
    if (left.jointId !== right.jointId) {
      return left.jointId.localeCompare(right.jointId);
    }
    return left.patternId.localeCompare(right.patternId);
  });

  return setJointLoadAuthoringUiState(
    {
      ...state,
      jointLoads,
    },
    {
      blankFieldsByRowKey: nextBlankFieldsByRowKey,
      authoredZeroRowsByKey: nextAuthoredZeroRowsByKey,
    },
  );
}

export function removeJointLoadAuthoringRowsForJoint(
  state: MultiPileState,
  jointId: string,
): MultiPileState {
  const authoringState = getJointLoadAuthoringUiState(state);
  const blankFieldsByRowKey = Object.fromEntries(
    Object.entries(authoringState.blankFieldsByRowKey).filter(
      ([rowKey]) => !rowKey.startsWith(`${jointId}::`),
    ),
  );
  const authoredZeroRowsByKey = Object.fromEntries(
    Object.entries(authoringState.authoredZeroRowsByKey).filter(
      ([rowKey]) => !rowKey.startsWith(`${jointId}::`),
    ),
  );

  return setJointLoadAuthoringUiState(state, {
    blankFieldsByRowKey,
    authoredZeroRowsByKey,
  });
}

export function findCombinationFactor(row: MultiPileCombinationRow, patternId: string) {
  return row.terms?.find((term) => term.patternId === patternId)?.factor ?? 0;
}

export function summarizeCustomCombination(row: MultiPileCombinationRow) {
  if (!row.terms?.length) {
    return row.displayName;
  }

  return row.terms
    .slice()
    .sort((left, right) => left.patternId.localeCompare(right.patternId))
    .map((term) => `${formatFactor(term.factor)}${term.patternId}`)
    .join(' + ');
}

export function formatFactor(value: number) {
  if (Math.abs(value - Math.round(value)) < 1e-9) {
    return `${Math.round(value)}x`;
  }
  return `${value.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')}x`;
}

export function formatNumber(value: number) {
  if (!Number.isFinite(value)) return '-';
  return value.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
}

export function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export type MultiPileEnvelopeSnapshotState = 'ready' | 'missing' | 'stale' | 'failed';

export interface MultiPileEnvelopeSnapshotStatus {
  state: MultiPileEnvelopeSnapshotState;
  detail: string;
}

export interface MultiPileJointEnvelopeExtremes {
  maxCompression: number;
  maxTension: number;
}

export interface MultiPilePileTypeRangeSummary {
  participatesInAutoMatching: boolean;
  hasCompressionBounds: boolean;
  hasTensionBounds: boolean;
  label: string;
  detail: string;
}

export type MultiPilePileTypeRangeMatchStatus =
  | 'match'
  | 'outside-range'
  | 'no-range-data'
  | 'no-envelope-data'
  | 'stale-envelope'
  | 'missing-type';

function readEnvelopeRunContext(uiState: Record<string, unknown> | undefined) {
  const envelope = objectValue(objectValue(uiState).envelope);
  return {
    lastRunInputSignature: stringValue(envelope.lastRunInputSignature),
  };
}

export function deriveMultiPileEnvelopeSnapshotStatus(
  draft: Pick<
    MultiPileState,
    | 'combinationSettings'
    | 'pileTypes'
    | 'joints'
    | 'loadPatterns'
    | 'jointLoads'
    | 'combinationLibrary'
    | 'selectedCombinations'
    | 'uiState'
  >,
  latestRun: MultiPileEnvelopeRunSummary | null | undefined,
): MultiPileEnvelopeSnapshotStatus {
  if (!latestRun) {
    return {
      state: 'missing',
      detail: 'No persisted envelope snapshot exists for this pile group yet.',
    };
  }

  if (latestRun.status !== 'completed' || !latestRun.envelope) {
    return {
      state: 'failed',
      detail:
        latestRun.status === 'failed'
          ? 'The latest envelope run failed.'
          : 'A completed envelope snapshot is not available yet.',
    };
  }

  const currentInputSignature = buildMultiPileEnvelopeInputSignature(draft);
  const envelopeContext = readEnvelopeRunContext(draft.uiState);
  if (
    !envelopeContext.lastRunInputSignature ||
    envelopeContext.lastRunInputSignature !== currentInputSignature
  ) {
    return {
      state: 'stale',
      detail: 'The current Multi-Pile state differs from the latest completed envelope run.',
    };
  }

  return {
    state: 'ready',
    detail: `Snapshot matches the current saved Multi-Pile state from ${formatTimestamp(latestRun.createdAt)}.`,
  };
}

export function summarizePileTypeUltimateRange(
  pileType: Pick<
    MultiPilePileTypeDefinition,
    | 'compressionUltimateMin'
    | 'compressionUltimateMax'
    | 'tensionUltimateMin'
    | 'tensionUltimateMax'
  >,
): MultiPilePileTypeRangeSummary {
  const hasCompressionBounds =
    pileType.compressionUltimateMin != null || pileType.compressionUltimateMax != null;
  const hasTensionBounds =
    pileType.tensionUltimateMin != null || pileType.tensionUltimateMax != null;

  if (hasCompressionBounds && hasTensionBounds) {
    return {
      participatesInAutoMatching: true,
      hasCompressionBounds,
      hasTensionBounds,
      label: 'Ready',
      detail: 'Compression and uplift ranges can participate in auto-matching.',
    };
  }

  if (!hasCompressionBounds && !hasTensionBounds) {
    return {
      participatesInAutoMatching: false,
      hasCompressionBounds,
      hasTensionBounds,
      label: 'No range data',
      detail: 'Add at least one compression bound and one uplift bound for auto-matching.',
    };
  }

  return {
    participatesInAutoMatching: false,
    hasCompressionBounds,
    hasTensionBounds,
    label: hasCompressionBounds ? 'Tension range missing' : 'Compression range missing',
    detail: hasCompressionBounds
      ? 'Add at least one uplift bound for this type to participate in auto-matching.'
      : 'Add at least one compression bound for this type to participate in auto-matching.',
  };
}

export function deriveJointEnvelopeExtremes(
  latestRun: MultiPileEnvelopeRunSummary | null | undefined,
  jointId: string,
): MultiPileJointEnvelopeExtremes | null {
  const row = latestRun?.envelope?.jointResults.find((candidate) => candidate.jointId === jointId);
  if (!row) {
    return null;
  }

  return {
    maxCompression: Math.max(row.nMax.value, 0),
    maxTension: Math.abs(Math.min(row.nMin.value, 0)),
  };
}

function withinUltimateRange(value: number, min: number | null, max: number | null) {
  if (min != null && value < min) {
    return false;
  }
  if (max != null && value > max) {
    return false;
  }
  return true;
}

function pileTypeSizeForOrdering(
  pileType: Pick<
    MultiPilePileTypeDefinition,
    'sizePreset' | 'useCustom' | 'customMm' | 'nominalDiameterMm'
  >,
) {
  if (pileType.useCustom && pileType.customMm > 0) {
    return pileType.customMm;
  }

  const presetSize = Number(pileType.sizePreset);
  if (Number.isFinite(presetSize) && presetSize > 0) {
    return presetSize;
  }
  return pileType.customMm || pileType.nominalDiameterMm || 0;
}

export function findSuggestedPileTypeForEnvelopeExtremes(
  pileTypes: readonly MultiPilePileTypeDefinition[],
  extremes: MultiPileJointEnvelopeExtremes | null,
) {
  if (!extremes) {
    return null;
  }

  return (
    pileTypes
      .filter((pileType) => {
        if (!pileType.active) {
          return false;
        }

        const rangeSummary = summarizePileTypeUltimateRange(pileType);
        if (!rangeSummary.participatesInAutoMatching) {
          return false;
        }

        return (
          withinUltimateRange(
            extremes.maxCompression,
            pileType.compressionUltimateMin,
            pileType.compressionUltimateMax,
          ) &&
          withinUltimateRange(
            extremes.maxTension,
            pileType.tensionUltimateMin,
            pileType.tensionUltimateMax,
          )
        );
      })
      .slice()
      .sort((left, right) => {
        const sizeDelta = pileTypeSizeForOrdering(left) - pileTypeSizeForOrdering(right);
        if (Math.abs(sizeDelta) > 1e-9) {
          return sizeDelta;
        }

        const dDelta = left.Dmm - right.Dmm;
        if (Math.abs(dDelta) > 1e-9) {
          return dDelta;
        }

        const displayDelta = (left.displayName || left.id).localeCompare(
          right.displayName || right.id,
        );
        if (displayDelta !== 0) {
          return displayDelta;
        }

        return left.id.localeCompare(right.id);
      })[0] ?? null
  );
}

export function evaluatePileTypeRangeMatch(
  pileType: MultiPilePileTypeDefinition | null | undefined,
  extremes: MultiPileJointEnvelopeExtremes | null,
  envelopeStatus: MultiPileEnvelopeSnapshotState,
): MultiPilePileTypeRangeMatchStatus {
  if (!pileType) {
    return 'missing-type';
  }

  if (envelopeStatus === 'missing' || envelopeStatus === 'failed' || !extremes) {
    return 'no-envelope-data';
  }

  if (envelopeStatus === 'stale') {
    return 'stale-envelope';
  }

  if (!summarizePileTypeUltimateRange(pileType).participatesInAutoMatching) {
    return 'no-range-data';
  }

  return withinUltimateRange(
    extremes.maxCompression,
    pileType.compressionUltimateMin,
    pileType.compressionUltimateMax,
  ) &&
    withinUltimateRange(
      extremes.maxTension,
      pileType.tensionUltimateMin,
      pileType.tensionUltimateMax,
    )
    ? 'match'
    : 'outside-range';
}

function generateMultiPileGeneratedPiles(joints: MultiPileJoint[]): MultiPileGeneratedPile[] {
  const usedIds = new Set<string>();
  const piles: MultiPileGeneratedPile[] = [];

  joints.forEach((joint) => {
    if (joint.pileTypeId === MULTI_PILE_UNASSIGNED_PILE_TYPE_ID) {
      return;
    }

    for (let supportIndex = 1; supportIndex <= joint.supportCount; supportIndex += 1) {
      const baseId = `${joint.id}-P${supportIndex}`;
      let candidateId = baseId;
      let suffix = 2;
      while (usedIds.has(candidateId)) {
        candidateId = `${baseId}_${suffix++}`;
      }
      usedIds.add(candidateId);
      piles.push({
        id: candidateId,
        parentJointId: joint.id,
        supportIndex,
        supportCount: joint.supportCount,
        pileTypeId: joint.pileTypeId,
      });
    }
  });

  return piles;
}

export function materializeAutoAssignedPileTypes(
  draft: MultiPileState,
  latestRun: MultiPileEnvelopeRunSummary | null | undefined,
): MultiPileState {
  const envelopeStatus = deriveMultiPileEnvelopeSnapshotStatus(draft, latestRun);
  if (envelopeStatus.state !== 'ready') {
    return draft;
  }

  let didChange = false;
  const joints = draft.joints.map((joint) => {
    if (joint.assignmentMode !== 'auto') {
      return joint;
    }

    const suggestedPileType = findSuggestedPileTypeForEnvelopeExtremes(
      draft.pileTypes,
      deriveJointEnvelopeExtremes(latestRun, joint.id),
    );

    if (!suggestedPileType || joint.pileTypeId === suggestedPileType.id) {
      return joint;
    }

    didChange = true;
    return {
      ...joint,
      pileTypeId: suggestedPileType.id,
    };
  });

  if (!didChange) {
    return draft;
  }

  return {
    ...draft,
    joints,
    generatedPiles: generateMultiPileGeneratedPiles(joints),
  };
}

export function statusBadgeVariant(status: MultiPileEnvelopeRunSummary['status']) {
  if (status === 'completed') return 'success' as const;
  if (status === 'failed') return 'destructive' as const;
  if (status === 'running') return 'warning' as const;
  return 'outline' as const;
}

export function nextSequentialId(prefix: string, existingIds: string[]) {
  let index = 1;
  while (existingIds.includes(`${prefix}${index}`)) {
    index += 1;
  }
  return `${prefix}${index}`;
}

export function normalizePileTypeDefinition(
  pileType: Partial<MultiPilePileTypeDefinition>,
  options?: { fallbackId?: string; order?: number },
): MultiPilePileTypeDefinition {
  const raw = pileType as Partial<MultiPilePileTypeDefinition> & Record<string, unknown>;
  const fallbackId = options?.fallbackId ?? 'BP1';
  const id = String(raw.id ?? fallbackId).trim() || fallbackId;
  const presetOptions = MULTI_PILE_STANDARD_PILE_DIAMETERS_MM.map(String);
  const rawDiameter = Math.max(
    50,
    numberFromInput(
      String(raw.Dmm ?? raw.nominalDiameterMm ?? DEFAULT_PILE_DIAMETER_MM),
      DEFAULT_PILE_DIAMETER_MM,
    ),
  );
  let sizePreset =
    String(
      raw.sizePreset ?? raw.standardSizePreset ?? raw.presetSize ?? raw.standardSize ?? rawDiameter,
    ).trim() || DEFAULT_PILE_SIZE_PRESET;
  let useCustom =
    raw.useCustom === undefined
      ? Boolean(raw.useCustomDiameter ?? raw.customDiameterEnabled)
      : Boolean(raw.useCustom);

  if (!presetOptions.includes(sizePreset)) {
    sizePreset = presetOptions.includes(String(rawDiameter))
      ? String(rawDiameter)
      : DEFAULT_PILE_SIZE_PRESET;
  }
  if (!presetOptions.includes(String(rawDiameter)) && !useCustom) {
    useCustom = true;
  }

  const presetMm = Math.max(50, numberFromInput(sizePreset, DEFAULT_PILE_DIAMETER_MM));
  const customMm = Math.max(
    50,
    numberFromInput(
      String(raw.customMm ?? raw.customDiameterMm ?? rawDiameter ?? presetMm),
      presetMm,
    ),
  );
  const Dmm = useCustom ? customMm : presetMm;
  const eoop = Math.max(0, numberFromInput(String(raw.eoop ?? raw.eoopM ?? 0.075), 0.075));

  return {
    id,
    displayName: String(raw.displayName ?? raw.name ?? raw.label ?? id).trim() || id,
    description: stringFromInput(raw.description),
    sizePreset,
    useCustom,
    customMm,
    Dmm,
    nominalDiameterMm: Dmm,
    pileSystem: stringFromInput(raw.pileSystem ?? raw.system ?? raw.constructionMethod),
    concreteGrade: stringFromInput(raw.concreteGrade),
    socketLengthM: nullableNumberValue(raw.socketLengthM, { min: 0 }),
    socketLengthMm: nullableNumberValue(raw.socketLengthMm, { min: 0 }),
    foundingStratum: stringFromInput(raw.foundingStratum),
    foundingNote: stringFromInput(raw.foundingNote),
    designCompressionKn: nullableNumberValue(raw.designCompressionKn, { min: 0 }),
    designTensionKn: nullableNumberValue(raw.designTensionKn, { min: 0 }),
    designLateralKn: nullableNumberValue(raw.designLateralKn, { min: 0 }),
    durabilityExposureNote: stringFromInput(raw.durabilityExposureNote),
    constructionNote: stringFromInput(raw.constructionNote),
    status: normalizePileTypeStatus(raw.status),
    notes: stringFromInput(raw.notes),
    eoop,
    eoopM: eoop,
    compressionUltimateMin: nullableNumberValue(raw.compressionUltimateMin, { min: 0 }),
    compressionUltimateMax: nullableNumberValue(raw.compressionUltimateMax, { min: 0 }),
    tensionUltimateMin: nullableNumberValue(raw.tensionUltimateMin, { min: 0 }),
    tensionUltimateMax: nullableNumberValue(raw.tensionUltimateMax, { min: 0 }),
    active: raw.active === undefined ? true : Boolean(raw.active),
    order: options?.order ?? Math.max(0, Math.round(numberFromInput(String(raw.order ?? 0), 0))),
  };
}

function stringFromInput(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizePileTypeStatus(value: unknown): MultiPilePileTypeDefinition['status'] {
  return value === 'active' || value === 'superseded' || value === 'draft' ? value : 'draft';
}

export function normalizeJointDefinition(
  joint: Partial<MultiPileJoint>,
  options?: {
    fallbackId?: string;
    order?: number;
    defaultPileTypeId?: string;
    pileTypeIds?: string[];
  },
): MultiPileJoint {
  const raw = joint as Partial<MultiPileJoint> & Record<string, unknown>;
  const fallbackId = options?.fallbackId ?? 'J1';
  const id = String(raw.id ?? fallbackId).trim() || fallbackId;
  const label = String(
    raw.jointDisplayName ?? raw.displayName ?? raw.name ?? raw.label ?? '',
  ).trim();
  const supportCount = Math.max(
    1,
    Math.round(numberFromInput(String(raw.supportCount ?? raw.noOfSupports ?? 1), 1)),
  );
  const defaultPileTypeId = options?.defaultPileTypeId ?? 'BP1';
  const knownPileTypeIds = new Set(options?.pileTypeIds ?? []);
  const rawPileTypeId = String(
    raw.pileTypeId ?? raw.assignedPileTypeId ?? raw.typeId ?? raw.type ?? defaultPileTypeId,
  ).trim();
  const pileTypeId = !rawPileTypeId
    ? defaultPileTypeId
    : rawPileTypeId === MULTI_PILE_UNASSIGNED_PILE_TYPE_ID
      ? MULTI_PILE_UNASSIGNED_PILE_TYPE_ID
      : knownPileTypeIds.size > 0 && !knownPileTypeIds.has(rawPileTypeId)
        ? MULTI_PILE_UNASSIGNED_PILE_TYPE_ID
        : rawPileTypeId;

  return {
    id,
    ...(label ? { displayName: label, jointDisplayName: label } : {}),
    x: numberFromInput(String(raw.x ?? 0)),
    y: numberFromInput(String(raw.y ?? 0)),
    z: numberFromInput(String(raw.z ?? 0)),
    supportCount,
    noOfSupports: supportCount,
    pileTypeId,
    assignmentMode: raw.assignmentMode === 'auto' ? 'auto' : 'manual',
    active: raw.active === undefined ? true : Boolean(raw.active),
    order: options?.order ?? Math.max(0, Math.round(numberFromInput(String(raw.order ?? 0), 0))),
  };
}

export function renamePileTypeIdAcrossState(
  state: MultiPileState,
  oldId: string,
  newId: string,
): MultiPileState {
  if (!oldId || !newId || oldId === newId) {
    return state;
  }

  const nextGeoTypeSettings = { ...state.geoTypeSettings };
  if (nextGeoTypeSettings[oldId] && !nextGeoTypeSettings[newId]) {
    nextGeoTypeSettings[newId] = {
      ...nextGeoTypeSettings[oldId],
      typeId: newId,
    };
  }
  delete nextGeoTypeSettings[oldId];

  const uiState = objectValue(state.uiState);
  const structUiState = getStructDesignerUiState(state);
  const nextStructTypeSettings = { ...(structUiState.typeSettingsByTypeId ?? {}) };
  if (nextStructTypeSettings[oldId] && !nextStructTypeSettings[newId]) {
    nextStructTypeSettings[newId] = {
      ...nextStructTypeSettings[oldId],
      typeId: newId,
    };
  }
  delete nextStructTypeSettings[oldId];

  return {
    ...state,
    geoTypeSettings: nextGeoTypeSettings,
    uiState: {
      ...uiState,
      [MULTI_PILE_STRUCT_DESIGNER_UI_STATE_KEY]: {
        ...structUiState,
        typeSettingsByTypeId: nextStructTypeSettings,
      },
    },
    pileTypes: state.pileTypes.map((pileType) =>
      pileType.id === oldId ? { ...pileType, id: newId } : pileType,
    ),
    joints: state.joints.map((joint) =>
      joint.pileTypeId === oldId ? { ...joint, pileTypeId: newId } : joint,
    ),
  };
}

export function renameJointIdAcrossState(
  state: MultiPileState,
  oldId: string,
  newId: string,
): MultiPileState {
  if (!oldId || !newId || oldId === newId) {
    return state;
  }

  const renamedState = {
    ...state,
    joints: state.joints.map((joint) => (joint.id === oldId ? { ...joint, id: newId } : joint)),
    jointLoads: state.jointLoads.map((row) =>
      row.jointId === oldId ? { ...row, jointId: newId } : row,
    ),
  };

  const authoringState = getJointLoadAuthoringUiState(state);
  const blankFieldsByRowKey = Object.fromEntries(
    Object.entries(authoringState.blankFieldsByRowKey).map(([rowKey, blankFields]) => {
      if (!rowKey.startsWith(`${oldId}::`)) {
        return [rowKey, blankFields];
      }

      return [rowKey.replace(`${oldId}::`, `${newId}::`), blankFields];
    }),
  );
  const authoredZeroRowsByKey = Object.fromEntries(
    Object.entries(authoringState.authoredZeroRowsByKey).map(([rowKey, value]) => {
      if (!rowKey.startsWith(`${oldId}::`)) {
        return [rowKey, value];
      }

      return [rowKey.replace(`${oldId}::`, `${newId}::`), value];
    }),
  );

  return setJointLoadAuthoringUiState(renamedState, {
    blankFieldsByRowKey,
    authoredZeroRowsByKey,
  });
}

export function jointDisplayLabel(
  joint: Pick<MultiPileJoint, 'id' | 'displayName' | 'jointDisplayName'>,
) {
  return joint.jointDisplayName || joint.displayName || joint.id;
}

export function hasAssignedPileTypeId(pileTypeId: string) {
  return Boolean(pileTypeId) && pileTypeId !== MULTI_PILE_UNASSIGNED_PILE_TYPE_ID;
}

export function pileTypeSelectLabel(
  pileType: Pick<MultiPilePileTypeDefinition, 'id' | 'displayName'>,
) {
  return pileType.displayName && pileType.displayName !== pileType.id
    ? `${pileType.id} — ${pileType.displayName}`
    : pileType.id;
}

export function derivePileRegisterRows(
  draft: Pick<MultiPileState, 'joints' | 'pileTypes'> &
    Partial<Pick<MultiPileState, 'generatedPiles'>>,
): MultiPileDerivedPileRegisterRow[] {
  const pileTypesById = new Map(draft.pileTypes.map((pileType) => [pileType.id, pileType]));
  const generatedPilesByJointId = new Map<string, MultiPileState['generatedPiles']>();

  (draft.generatedPiles ?? []).forEach((pile) => {
    const jointPiles = generatedPilesByJointId.get(pile.parentJointId) ?? [];
    jointPiles.push(pile);
    generatedPilesByJointId.set(pile.parentJointId, jointPiles);
  });

  return draft.joints.flatMap((joint) => {
    const generatedPiles = (generatedPilesByJointId.get(joint.id) ?? [])
      .slice()
      .sort((left, right) => left.supportIndex - right.supportIndex);
    const supportCount = Math.max(
      1,
      joint.supportCount || joint.noOfSupports || generatedPiles.length || 1,
    );
    const pilesForJoint = generatedPiles.length
      ? generatedPiles
      : Array.from({ length: supportCount }, (_, supportIndexZeroBased) => ({
          id: `${joint.id}-P${supportIndexZeroBased + 1}`,
          parentJointId: joint.id,
          supportIndex: supportIndexZeroBased + 1,
          supportCount,
          pileTypeId: joint.pileTypeId,
        }));

    return pilesForJoint.map((pile) => {
      const supportIndex = pile.supportIndex;
      const pileType = pileTypesById.get(joint.pileTypeId) ?? null;
      const hasAssignedType = hasAssignedPileTypeId(joint.pileTypeId) && Boolean(pileType);
      const includedInAnalysis =
        Boolean(joint.active) && hasAssignedType && pileType?.active !== false;
      let status = 'Included';

      if (!joint.active) {
        status = 'Joint inactive';
      } else if (!hasAssignedPileTypeId(joint.pileTypeId)) {
        status = 'Needs pile type assignment';
      } else if (!pileType) {
        status = `Missing pile type (${joint.pileTypeId})`;
      } else if (!pileType.active) {
        status = 'Pile type inactive';
      }

      return {
        id: pile.id,
        parentJointId: joint.id,
        parentJointLabel: jointDisplayLabel(joint),
        supportIndex,
        supportCount,
        pileTypeId: joint.pileTypeId,
        pileTypeLabel: !hasAssignedPileTypeId(joint.pileTypeId)
          ? `${MULTI_PILE_UNASSIGNED_PILE_TYPE_ID} — Needs assignment`
          : pileType
            ? pileTypeSelectLabel(pileType)
            : `${joint.pileTypeId} — Missing type`,
        includedInAnalysis,
        status,
      };
    });
  });
}
