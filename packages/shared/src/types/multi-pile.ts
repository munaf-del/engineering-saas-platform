export const MULTI_PILE_PATTERN_TYPES = [
  'Permanent',
  'Imposed',
  'Wind',
  'Earthquake',
  'Groundwater',
  'Other',
] as const;
export type MultiPilePatternType = (typeof MULTI_PILE_PATTERN_TYPES)[number];

export const MULTI_PILE_PROJECT_STATUSES = [
  'In Progress',
  'For Review',
  'Issued',
  'Construction',
  'Hold',
] as const;
export type MultiPileProjectStatus = (typeof MULTI_PILE_PROJECT_STATUSES)[number];

export const MULTI_PILE_PROJECT_MAP_SOURCES = ['auto', 'address', 'coords'] as const;
export type MultiPileProjectMapSource = (typeof MULTI_PILE_PROJECT_MAP_SOURCES)[number];

export const MULTI_PILE_PROJECT_REFERENCE_DOCUMENT_TYPES = [
  'Geotechnical Report',
  'Structural Drawing',
  'Architectural Drawing',
  'Survey',
  'Standard / Code',
  'Calculation Note',
  'Other',
] as const;
export type MultiPileProjectReferenceDocumentType =
  (typeof MULTI_PILE_PROJECT_REFERENCE_DOCUMENT_TYPES)[number];

export const MULTI_PILE_PROJECT_GEO_UPLIFT_MODES = [
  'manual-entry',
  'ratio-to-compression',
] as const;
export type MultiPileProjectGeoUpliftMode = (typeof MULTI_PILE_PROJECT_GEO_UPLIFT_MODES)[number];

export const MULTI_PILE_PROJECT_GEO_TEMPLATE_STATES = [
  'empty',
  'manual',
  'seeded',
  'imported',
] as const;
export type MultiPileProjectGeoTemplateState =
  (typeof MULTI_PILE_PROJECT_GEO_TEMPLATE_STATES)[number];

export const MULTI_PILE_GEO_REDUNDANCY_LEVELS = ['LOW', 'HIGH'] as const;
export type MultiPileGeoRedundancyLevel = (typeof MULTI_PILE_GEO_REDUNDANCY_LEVELS)[number];

export const MULTI_PILE_GEO_USE_BASE_OPTIONS = ['YES', 'NO'] as const;
export type MultiPileGeoUseBaseOption = (typeof MULTI_PILE_GEO_USE_BASE_OPTIONS)[number];

export const MULTI_PILE_GEO_SOCKET_MODES = ['pending', 'auto', 'manual'] as const;
export type MultiPileGeoSocketMode = (typeof MULTI_PILE_GEO_SOCKET_MODES)[number];

export const MULTI_PILE_GEO_TEST_TYPES = [
  'NONE',
  'STATIC',
  'RAPID',
  'DYN_PREF',
  'DYN_OTHER',
  'BIDIR',
] as const;
export type MultiPileGeoTestType = (typeof MULTI_PILE_GEO_TEST_TYPES)[number];

export const MULTI_PILE_GEO_RESULT_STATUSES = ['resolved', 'pending'] as const;
export type MultiPileGeoResultStatus = (typeof MULTI_PILE_GEO_RESULT_STATUSES)[number];

export const MULTI_PILE_GEO_RESOLUTION_MODES = [
  'project-library',
  'migration-fallback',
  'missing',
] as const;
export type MultiPileGeoResolutionMode = (typeof MULTI_PILE_GEO_RESOLUTION_MODES)[number];

export const MULTI_PILE_STRUCTURAL_EC_MODES = ['auto', 'override'] as const;
export type MultiPileStructuralEcMode = (typeof MULTI_PILE_STRUCTURAL_EC_MODES)[number];

export const MULTI_PILE_COMBINATION_SOURCES = ['built-in', 'custom'] as const;
export type MultiPileCombinationSource = (typeof MULTI_PILE_COMBINATION_SOURCES)[number];

export const MULTI_PILE_COMBINATION_KINDS = ['linear', 'envelope'] as const;
export type MultiPileCombinationKind = (typeof MULTI_PILE_COMBINATION_KINDS)[number];

export const MULTI_PILE_COMBINATION_FAMILIES = ['strength', 'derived', 'custom'] as const;
export type MultiPileCombinationFamily = (typeof MULTI_PILE_COMBINATION_FAMILIES)[number];

export const MULTI_PILE_STRUCT_RESULT_STATUSES = ['pass', 'fail', 'warning'] as const;
export type MultiPileStructResultStatus = (typeof MULTI_PILE_STRUCT_RESULT_STATUSES)[number];

export const MULTI_PILE_STANDARD_PILE_DIAMETERS_MM = [
  450, 500, 600, 750, 900, 1050, 1200, 1500, 1800,
] as const;
export type MultiPileStandardPileDiameterMm =
  (typeof MULTI_PILE_STANDARD_PILE_DIAMETERS_MM)[number];

export const MULTI_PILE_JOINT_ASSIGNMENT_MODES = ['manual', 'auto'] as const;
export type MultiPileJointAssignmentMode = (typeof MULTI_PILE_JOINT_ASSIGNMENT_MODES)[number];

export const MULTI_PILE_UNASSIGNED_PILE_TYPE_ID = 'UNASSIGNED';

export interface MultiPileProjectIdentity {
  projectNumber: string;
  projectName: string;
  client: string;
  status: MultiPileProjectStatus;
  address: string;
  latitude: string;
  longitude: string;
  mapAddress: string;
  notes: string;
  archived: boolean;
  projectLogo: string;
  mapSource: MultiPileProjectMapSource;
}

export interface MultiPileProjectReportMetadata {
  reportTitle: string;
  reportRevision: string;
  issueDate: string;
  preparedBy: string;
  checkedBy: string;
  purpose: string;
}

export interface MultiPileProjectReference {
  id: string;
  referenceId: string;
  documentType: MultiPileProjectReferenceDocumentType;
  title: string;
  documentNumber: string;
  revision: string;
  issueDate: string;
  authorOrganisation: string;
  notes: string;
  includeInReport: boolean;
  primaryGeotechnical: boolean;
  primaryStructuralReference: boolean;
  active: boolean;
}

export interface MultiPileProjectConcreteClass {
  id: string;
  displayName: string;
  standardProfileId: string;
  overrideStandardValues: boolean;
  sourceStandard: string;
  sourceSection: string;
  sourceClause: string;
  sourceTable: string;
  sourcePagesNote: string;
  active: boolean;
  fc_MPa: number | null;
  fc_cube_MPa: number | null;
  fcm_MPa: number | null;
  fcmi_MPa: number | null;
  fctf_MPa: number | null;
  fct_MPa: number | null;
  EcMode: MultiPileStructuralEcMode;
  Ec_MPa: number | null;
  density_kgm3: number | null;
  poissonsRatio: number | null;
  thermalExpansionPerDegC: number | null;
  shrinkageReferenceText: string;
  shrinkageEnvironmentNotes: string;
  creepReferenceText: string;
  creepEnvironmentNotes: string;
  notes: string;
}

export interface MultiPileProjectReinforcementGrade {
  id: string;
  displayName: string;
  sourceStandard: string;
  sourceSection: string;
  sourceClause: string;
  sourceTable: string;
  sourcePagesNote: string;
  active: boolean;
  designationGrade: string;
  fsy_MPa: number | null;
  esu: number | null;
  ductilityClass: string;
  Es_MPa: number | null;
  thermalExpansionPerDegC: number | null;
  stressStrainReferenceText: string;
  notes: string;
  fsyMPa?: number | null;
  esMPa?: number | null;
}

export interface MultiPileProjectTendonGrade {
  id: string;
  displayName: string;
  standardProfileId: string;
  overrideStandardValues: boolean;
  sourceStandard: string;
  sourceSection: string;
  sourceClause: string;
  sourceTable: string;
  sourcePagesNote: string;
  active: boolean;
  tendonType: string;
  nominalDiameter_mm: number | null;
  area_mm2: number | null;
  fpb_kN: number | null;
  fpb_MPa: number | null;
  fpy_MPa: number | null;
  Ep_MPa: number | null;
  stressStrainReferenceText: string;
  relaxationReferenceText: string;
  notes: string;
  fpbMPa?: number | null;
  fpyMPa?: number | null;
  epMPa?: number | null;
}

export interface MultiPileProjectCoverDurabilityClass {
  id: string;
  displayName: string;
  sourceStandard: string;
  sourceSection: string;
  sourceClause: string;
  sourceTable: string;
  sourcePagesNote: string;
  active: boolean;
  designLifeYears: number | null;
  exposureClass: string;
  exposureClassification: string;
  minConcreteStrengthPrecast_MPa: string;
  minConcreteStrengthCastInPlace_MPa: string;
  minConcreteStrength_MPa: string;
  minCoverPrecast_mm: number | null;
  minCoverCastInPlace_mm: number | null;
  nominalCover_mm: number | null;
  aggressivityNotes: string;
  durabilityNotes: string;
  crackWidthLimit_mm: number | null;
  notes: string;
  minConcreteStrengthPrecastMPa?: string;
  minConcreteStrengthCastInPlaceMPa?: string;
  nominalCoverMm?: number | null;
  crackWidthLimitMm?: number | null;
}

export interface MultiPileProjectStructuralDefaults {
  concreteClasses: MultiPileProjectConcreteClass[];
  reinforcementGrades: MultiPileProjectReinforcementGrade[];
  tendonGrades: MultiPileProjectTendonGrade[];
  coverDurabilityClasses: MultiPileProjectCoverDurabilityClass[];
}

export interface MultiPileProjectGeotechnicalMaterial {
  id: string;
  unitCode: string;
  displayName: string;
  sourceReferenceId: string;
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
  wallInterfaceActive: number | null;
  wallInterfacePassive: number | null;
  pile_fms_comp_kPa: number | null;
  pile_fms_tension_kPa: number | null;
  pile_fb_ult_kPa: number | null;
  pile_fms_allow_kPa: number | null;
  pile_fb_allow_kPa: number | null;
  cfaUpliftTensionFactor: number | null;
  includeInProject: boolean;
}

export interface MultiPileProjectGeotechnicalLibrary {
  activeReferenceId: string;
  templateState: MultiPileProjectGeoTemplateState;
  materials: MultiPileProjectGeotechnicalMaterial[];
}

export interface MultiPileProjectGeotechnicalBasis {
  groundwaterDesignNotes: string;
  cfaUpliftMode: MultiPileProjectGeoUpliftMode;
  cfaUpliftFactor: number;
  defaultSocketAssumptions: string;
  foundingNotes: string;
  commentary: string;
  arrAssessment: MultiPileProjectArrAssessment;
}

export interface MultiPileProjectSpecifics {
  identity: MultiPileProjectIdentity;
  reportMeta: MultiPileProjectReportMetadata;
  references: MultiPileProjectReference[];
  structuralDefaults: MultiPileProjectStructuralDefaults;
  geotechnicalMaterials: MultiPileProjectGeotechnicalLibrary;
  geotechnicalBasis: MultiPileProjectGeotechnicalBasis;
}

export interface MultiPileGeoArrSettings {
  irrValues: number[];
  testType: MultiPileGeoTestType;
  testPilePercentage: number;
  weightTotal: number;
  weightedScore: number;
  arrValue: number;
  arrBand: string;
  phiTf: number | null;
  testBenefitK: number;
  phiGbLow: number;
  phiGbHigh: number;
  phiGLow: number;
  phiGHigh: number;
}

export interface MultiPileProjectArrAssessment extends MultiPileGeoArrSettings {}

export interface MultiPileGeoTypeSettings {
  typeId: string;
  linkedDmm: number;
  redundancy: MultiPileGeoRedundancyLevel;
  shaftRedComp: number;
  shaftRedTen: number;
  useNnf: boolean;
  Nnf: number;
  s1H: number;
  s1qs: number;
  s1MaterialId: string;
  s2H: number;
  s2qs: number;
  s2MaterialId: string;
  s3H: number;
  s3qs: number;
  s3MaterialId: string;
  Ls: number;
  useLsMinOverride: boolean;
  LsMinOverride: number;
  qsRock: number;
  qbRock: number;
  foundingMaterialId: string;
  useBase: MultiPileGeoUseBaseOption;
  LsMode: MultiPileGeoSocketMode;
  LsSolved: number;
  LsManual: number;
  LsAdopted: number;
  socketOverrideEnabled: boolean;
}

export interface MultiPileGeoResolvedLayerRow {
  slot: number;
  H: number;
  fmsComp: number;
  fmsTen: number;
  label: string;
  unitCode: string;
  displayName: string;
  materialId: string;
  sourceReferenceId: string;
  sourceReferenceLabel: string;
  usedLegacyFallback: boolean;
  resolutionMode: MultiPileGeoResolutionMode;
  missingSelection: boolean;
  missingCapacity: boolean;
}

export interface MultiPileGeoSocketContributionRow {
  label: string;
  H: number;
  fms: number;
  fmsTension: number;
  fbUlt: number | null;
  Rs: number;
}

export interface MultiPileGeoResultRow {
  jointId: string;
  jointDisplayName?: string;
  pileId: string;
  typeId: string;
  activePatternIds: string[];
  redundancy: MultiPileGeoRedundancyLevel;
  status: MultiPileGeoResultStatus;
  pendingReason: string;
  Nmax: number | null;
  Nmin: number | null;
  upliftAbs: number | null;
  Nnf: number | null;
  phi: number | null;
  phiRcomp: number | null;
  phiRten: number | null;
  utilComp: number | null;
  utilTen: number | null;
  ok: boolean | null;
  diameter: number;
  Ls: number | null;
  LsSolved: number | null;
  LsAdopted: number | null;
  LsMode: MultiPileGeoSocketMode;
  socketMode: MultiPileGeoSocketMode;
  socketOverrideEnabled: boolean;
  qsRock: number | null;
  qbRock: number | null;
  useBase: boolean;
  shaftRedComp: number;
  shaftRedTen: number;
  LsMin: number;
  activeReferenceId: string;
  activeReferenceLabel: string;
  foundingMaterialId: string;
  foundingMaterialLabel: string;
  foundingLabel: string;
  foundingSourceReferenceLabel: string;
  foundingResolutionMode: MultiPileGeoResolutionMode;
  foundingUsesLegacyFallback: boolean;
  foundingMissingSelection: boolean;
  foundingMissingCapacity: boolean;
  foundingFmsComp: number | null;
  foundingFmsTen: number | null;
  foundingFbUlt: number | null;
  foundingFmsAllow: number | null;
  foundingFbAllow: number | null;
  resolvedFmSComp: number | null;
  resolvedFmSTen: number | null;
  resolvedFbUlt: number | null;
  resolvedFbAllow: number | null;
  inputWarnings: string[];
  socketAdoptionNote: string;
  layerRows: MultiPileGeoResolvedLayerRow[];
  socketContributionBreakdown: MultiPileGeoSocketContributionRow[];
  updatedAt: string;
}

export interface MultiPilePileTypeDefinition {
  id: string;
  displayName: string;
  description?: string;
  sizePreset: string;
  useCustom: boolean;
  customMm: number;
  Dmm: number;
  nominalDiameterMm: number;
  pileSystem?: string;
  concreteGrade?: string;
  socketLengthM?: number | null;
  socketLengthMm?: number | null;
  foundingStratum?: string;
  foundingNote?: string;
  designCompressionKn?: number | null;
  designTensionKn?: number | null;
  designLateralKn?: number | null;
  durabilityExposureNote?: string;
  constructionNote?: string;
  status?: 'draft' | 'active' | 'superseded';
  notes?: string;
  eoop: number;
  eoopM: number;
  compressionUltimateMin: number | null;
  compressionUltimateMax: number | null;
  tensionUltimateMin: number | null;
  tensionUltimateMax: number | null;
  active: boolean;
  order: number;
}

export interface MultiPileJoint {
  id: string;
  displayName?: string;
  jointDisplayName?: string;
  x: number;
  y: number;
  z: number;
  supportCount: number;
  noOfSupports: number;
  pileTypeId: string;
  assignmentMode: MultiPileJointAssignmentMode;
  active: boolean;
  order: number;
}

export interface MultiPileGeneratedPile {
  id: string;
  parentJointId: string;
  supportIndex: number;
  supportCount: number;
  pileTypeId: string;
}

export interface MultiPileLoadPattern {
  id: string;
  displayName: string;
  patternType: MultiPilePatternType;
  reversible: boolean;
  enabled: boolean;
  order: number;
}

export interface MultiPileJointLoadRow {
  jointId: string;
  patternId: string;
  p: number;
  vx: number;
  vy: number;
  mx: number;
  my: number;
  mz: number;
}

export interface MultiPileCombinationTerm {
  patternId: string;
  factor: number;
}

export interface MultiPileCombinationSettings {
  alpha: number;
  psiC: number;
  psiE: number;
  psiL: number;
  groundwaterFactor: number;
  minPermanentFactor: number;
  reduceMinimumPermanentWithPointNine: boolean;
}

export interface MultiPileCombinationRow {
  id: string;
  builtinKey?: string;
  displayName: string;
  source: MultiPileCombinationSource;
  kind: MultiPileCombinationKind;
  enabled: boolean;
  includeInEnvelope: boolean;
  reference?: string;
  family?: MultiPileCombinationFamily;
  reversibleAware?: boolean;
  terms?: MultiPileCombinationTerm[];
  childCombinationIds?: string[];
  expressionSummary?: string;
  order: number;
}

export interface MultiPileState {
  version: 1;
  combinationSettings: MultiPileCombinationSettings;
  pileTypes: MultiPilePileTypeDefinition[];
  geoArrSettings: MultiPileGeoArrSettings;
  geoTypeSettings: Record<string, MultiPileGeoTypeSettings>;
  geoResults: Record<string, MultiPileGeoResultRow>;
  joints: MultiPileJoint[];
  generatedPiles: MultiPileGeneratedPile[];
  loadPatterns: MultiPileLoadPattern[];
  jointLoads: MultiPileJointLoadRow[];
  combinationLibrary: MultiPileCombinationRow[];
  selectedCombinations: string[];
  uiState?: Record<string, unknown>;
}

export interface MultiPileEnvelopeValue {
  value: number;
  combinationId: string;
  combinationName: string;
  source: MultiPileCombinationSource;
  expressionSummary?: string;
}

export interface MultiPileJointEnvelopeSnapshot {
  jointId: string;
  jointDisplayName?: string;
  pileTypeId: string;
  representativePileId?: string;
  activePatternIds: string[];
  nMax: MultiPileEnvelopeValue;
  nMin: MultiPileEnvelopeValue;
  vx: MultiPileEnvelopeValue;
  vy: MultiPileEnvelopeValue;
  mx: MultiPileEnvelopeValue;
  my: MultiPileEnvelopeValue;
}

export interface MultiPileEnvelopeProjectSummary {
  jointCount: number;
  evaluatedCombinationCount: number;
  governingCombinationCount: number;
  activePatternCount: number;
}

export interface MultiPileStructInteractionPoint {
  N: number;
  M: number;
}

export interface MultiPileStructInteractionDemandPoint extends MultiPileStructInteractionPoint {
  jointId?: string;
  pileId?: string;
  label?: string;
  cls?: string;
}

export interface MultiPileStructSectionValues {
  phiPn: number;
  phiMn: number;
  phiVu: number;
  utilisation: number;
  pass: boolean;
}

export interface MultiPileStructAxialResult {
  N_capacity: number;
  N_tension_capacity: number;
  N_demand: number;
  N_tension_demand: number;
  compressionUtilisation: number;
  tensionUtilisation: number;
  utilisation: number;
  pass: boolean;
}

export interface MultiPileStructMomentResult {
  Mx_capacity: number;
  My_capacity: number;
  M_capacity: number;
  M_demand: number;
  Mx_demand: number;
  My_demand: number;
  phiMu0: number;
  phiNuo: number;
  phiN03Agfc: number;
  alphaN: number;
  utilisation: number;
  pass: boolean;
  biaxial: boolean;
}

export interface MultiPileStructShearDemandCase {
  jointId: string;
  pileId?: string;
  label: string;
  Vstar: number;
  pass: boolean;
}

export interface MultiPileStructShearResult {
  Vu_capacity: number;
  Vu_max_capacity: number;
  Vu_demand: number;
  Vx_demand: number;
  Vy_demand: number;
  Vuc: number;
  Vus: number;
  Vu: number;
  Vumax: number;
  okMinAsv: boolean;
  shearReoRequired: boolean;
  utilisation: number;
  webUtilisation: number;
  pass: boolean;
  demandCases: MultiPileStructShearDemandCase[];
}

export interface MultiPileStructInteractionResult {
  curve: MultiPileStructInteractionPoint[];
  demandPoint: MultiPileStructInteractionDemandPoint;
  demandPoints: MultiPileStructInteractionDemandPoint[];
}

export interface MultiPileStructUtilisationResult {
  axial: number;
  moment: number;
  shear: number;
  web: number;
  governing: number;
}

export interface MultiPileStructChecks {
  axial: boolean;
  moment: boolean;
  shear: boolean;
  web: boolean;
  minShearReinforcement: boolean;
  struct: boolean;
}

export interface MultiPileStructReinforcementComplianceProvidedValues {
  As_perim: number;
  As_central: number;
  As_total: number;
  As_bending_effective: number;
  As_tension_effective: number;
  As_head_tension_effective: number;
  As_deep_tension_effective: number;
}

export interface MultiPileStructReinforcementComplianceRequiredValues {
  As_min: number;
  As_max: number;
  As_req_tension: number;
  rho_min: number;
  rho_max: number;
}

export interface MultiPileStructReinforcementComplianceChecks {
  okAsMin: boolean;
  okAsMax: boolean;
  asMaxExceeded: boolean;
  overrideOn: boolean;
  reoLimitsOk: boolean;
}

export interface MultiPileStructReinforcementComplianceContext {
  clauseRef: string;
  minReoRule: string;
  minReoRuleLabel: string;
  reoLoc: string;
  reoLocLabel: string;
  reoLocDetail: string;
  reoLocDetailLabel: string;
  reinforcementGradeId?: string;
  reinforcementGradeLabel?: string;
  barDia: number;
  nBars: number;
  useCentralBar: boolean;
  centralBarDia: number;
  centralBarCount: number;
  providedAreaBasis: 'perimeter';
  providedAreaBasisLabel: string;
}

export interface MultiPileStructReinforcementComplianceResult {
  status: MultiPileStructResultStatus;
  summaryText: string;
  detailText: string;
  titleText: string;
  minimumStatusText: string;
  maximumStatusText: string;
  provided: MultiPileStructReinforcementComplianceProvidedValues;
  required: MultiPileStructReinforcementComplianceRequiredValues;
  checks: MultiPileStructReinforcementComplianceChecks;
  context: MultiPileStructReinforcementComplianceContext;
}

export interface MultiPileStructResult {
  pileTypeId: string;
  linkedJointIds: string[];
  representativePileId?: string;
  worstJointId?: string;
  updatedAt: string;
  status: MultiPileStructResultStatus;
  overallOk: boolean;
  inputWarnings: string[];
  sectionValues: MultiPileStructSectionValues;
  axial: MultiPileStructAxialResult;
  moment: MultiPileStructMomentResult;
  shear: MultiPileStructShearResult;
  interaction: MultiPileStructInteractionResult;
  utilisation: MultiPileStructUtilisationResult;
  checks: MultiPileStructChecks;
  reinforcementCompliance?: MultiPileStructReinforcementComplianceResult;
}

export interface MultiPileEnvelopeSnapshot {
  version: 1;
  generatedAt: string;
  pileGroupId: string;
  jointResults: MultiPileJointEnvelopeSnapshot[];
  structResults?: Record<string, MultiPileStructResult>;
  projectSummary: MultiPileEnvelopeProjectSummary;
}

export interface MultiPileEngineMessage {
  code: string;
  message: string;
  clauseRef?: string;
}

export interface MultiPileEnvelopeRunSummary {
  runId: string;
  status: string;
  createdAt: string;
  durationMs?: number;
  envelope?: MultiPileEnvelopeSnapshot;
  warnings?: MultiPileEngineMessage[];
  errors?: MultiPileEngineMessage[];
}

export type PersistableMultiPileState = Pick<
  MultiPileState,
  | 'version'
  | 'combinationSettings'
  | 'pileTypes'
  | 'geoArrSettings'
  | 'geoTypeSettings'
  | 'joints'
  | 'loadPatterns'
  | 'jointLoads'
  | 'combinationLibrary'
  | 'selectedCombinations'
> & {
  uiState?: Record<string, unknown>;
};

export function defaultMultiPileSelectedCombinationIds(
  combinationLibrary: readonly Pick<
    MultiPileCombinationRow,
    'id' | 'enabled' | 'includeInEnvelope'
  >[],
): string[] {
  return combinationLibrary
    .filter((row) => row.enabled && row.includeInEnvelope)
    .map((row) => row.id);
}

export function normalizeMultiPileSelectedCombinationIds(
  selectedCombinationIds: readonly string[] | null | undefined,
  combinationLibrary: readonly Pick<
    MultiPileCombinationRow,
    'id' | 'enabled' | 'includeInEnvelope'
  >[],
): string[] {
  const validIds = new Set(combinationLibrary.map((row) => row.id));
  const selectedIds = Array.isArray(selectedCombinationIds)
    ? selectedCombinationIds.map((value) => String(value)).filter((value) => validIds.has(value))
    : [];

  if (selectedIds.length === 0) {
    return defaultMultiPileSelectedCombinationIds(combinationLibrary);
  }

  return Array.from(new Set(selectedIds));
}

export function buildPersistableMultiPileState(state: MultiPileState): PersistableMultiPileState {
  const uiState = stripRuntimeMultiPileUiState(state.uiState);

  return {
    version: state.version,
    combinationSettings: state.combinationSettings,
    pileTypes: state.pileTypes,
    geoArrSettings: state.geoArrSettings,
    geoTypeSettings: state.geoTypeSettings,
    joints: state.joints,
    loadPatterns: state.loadPatterns,
    jointLoads: state.jointLoads,
    combinationLibrary: state.combinationLibrary,
    selectedCombinations: state.selectedCombinations,
    ...(uiState ? { uiState } : {}),
  };
}

function stripRuntimeMultiPileUiState(uiState: Record<string, unknown> | undefined) {
  if (!uiState || typeof uiState !== 'object' || Array.isArray(uiState)) {
    return undefined;
  }

  const { envelope: _envelope, ...persistableUiState } = uiState;
  return Object.keys(persistableUiState).length > 0 ? persistableUiState : undefined;
}

export function buildMultiPileEnvelopeInputSignature(
  state: Pick<
    MultiPileState,
    | 'combinationSettings'
    | 'pileTypes'
    | 'joints'
    | 'loadPatterns'
    | 'jointLoads'
    | 'combinationLibrary'
    | 'selectedCombinations'
  >,
): string {
  const selectedCombinations = normalizeMultiPileSelectedCombinationIds(
    state.selectedCombinations,
    state.combinationLibrary,
  );

  return JSON.stringify({
    combinationSettings: state.combinationSettings,
    pileTypes: state.pileTypes.map((row) => ({
      id: row.id,
      displayName: row.displayName,
      active: row.active,
      Dmm: row.Dmm,
      nominalDiameterMm: row.nominalDiameterMm,
      eoop: row.eoop,
      eoopM: row.eoopM,
    })),
    joints: state.joints.map((row) => ({
      id: row.id,
      displayName: row.displayName ?? row.jointDisplayName ?? '',
      active: row.active,
      supportCount: row.supportCount,
      pileTypeId: row.pileTypeId,
      x: row.x,
      y: row.y,
      z: row.z,
    })),
    loadPatterns: state.loadPatterns.map((row) => ({
      id: row.id,
      displayName: row.displayName,
      patternType: row.patternType,
      reversible: row.reversible,
      enabled: row.enabled,
    })),
    jointLoads: state.jointLoads
      .filter(
        (row) =>
          Math.abs(row.p) > 1e-9 ||
          Math.abs(row.vx) > 1e-9 ||
          Math.abs(row.vy) > 1e-9 ||
          Math.abs(row.mx) > 1e-9 ||
          Math.abs(row.my) > 1e-9 ||
          Math.abs(row.mz) > 1e-9,
      )
      .map((row) => ({
        jointId: row.jointId,
        patternId: row.patternId,
        p: row.p,
        vx: row.vx,
        vy: row.vy,
        mx: row.mx,
        my: row.my,
        mz: row.mz,
      }))
      .sort((left, right) => {
        if (left.jointId !== right.jointId) {
          return left.jointId.localeCompare(right.jointId);
        }
        return left.patternId.localeCompare(right.patternId);
      }),
    combinationLibrary: state.combinationLibrary.map((row) => ({
      id: row.id,
      displayName: row.displayName,
      source: row.source,
      kind: row.kind,
      enabled: row.enabled,
      includeInEnvelope: row.includeInEnvelope,
      family: row.family ?? '',
      reference: row.reference ?? '',
      expressionSummary: row.expressionSummary ?? '',
    })),
    selectedCombinations,
  });
}
