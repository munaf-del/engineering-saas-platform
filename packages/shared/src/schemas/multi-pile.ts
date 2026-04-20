import { z } from 'zod';
import {
  MULTI_PILE_COMBINATION_FAMILIES,
  MULTI_PILE_COMBINATION_KINDS,
  MULTI_PILE_COMBINATION_SOURCES,
  MULTI_PILE_GEO_REDUNDANCY_LEVELS,
  MULTI_PILE_GEO_RESOLUTION_MODES,
  MULTI_PILE_GEO_SOCKET_MODES,
  MULTI_PILE_GEO_RESULT_STATUSES,
  MULTI_PILE_JOINT_ASSIGNMENT_MODES,
  MULTI_PILE_GEO_TEST_TYPES,
  MULTI_PILE_GEO_USE_BASE_OPTIONS,
  MULTI_PILE_PATTERN_TYPES,
  MULTI_PILE_PROJECT_GEO_TEMPLATE_STATES,
  MULTI_PILE_PROJECT_GEO_UPLIFT_MODES,
  MULTI_PILE_PROJECT_MAP_SOURCES,
  MULTI_PILE_PROJECT_REFERENCE_DOCUMENT_TYPES,
  MULTI_PILE_PROJECT_STATUSES,
  MULTI_PILE_STRUCTURAL_EC_MODES,
  MULTI_PILE_STRUCT_RESULT_STATUSES,
} from '../types/multi-pile.js';
import { defaultMultiPileGeoArrSettings } from '../multi-pile-geo.js';

const NullableNumberSchema = z.number().nullable();

export const MultiPileProjectIdentitySchema = z.object({
  projectNumber: z.string(),
  projectName: z.string(),
  client: z.string(),
  status: z.enum(MULTI_PILE_PROJECT_STATUSES),
  address: z.string(),
  latitude: z.string(),
  longitude: z.string(),
  mapAddress: z.string(),
  notes: z.string(),
  archived: z.boolean(),
  projectLogo: z.string(),
  mapSource: z.enum(MULTI_PILE_PROJECT_MAP_SOURCES),
});

export const MultiPileProjectReportMetadataSchema = z.object({
  reportTitle: z.string(),
  reportRevision: z.string(),
  issueDate: z.string(),
  preparedBy: z.string(),
  checkedBy: z.string(),
  purpose: z.string(),
});

export const MultiPileProjectReferenceSchema = z.object({
  id: z.string().min(1),
  referenceId: z.string(),
  documentType: z.enum(MULTI_PILE_PROJECT_REFERENCE_DOCUMENT_TYPES),
  title: z.string(),
  documentNumber: z.string(),
  revision: z.string(),
  issueDate: z.string(),
  authorOrganisation: z.string(),
  notes: z.string(),
  includeInReport: z.boolean(),
  primaryGeotechnical: z.boolean(),
  primaryStructuralReference: z.boolean(),
  active: z.boolean(),
});

export const MultiPileProjectConcreteClassSchema = z.object({
  id: z.string().min(1),
  displayName: z.string(),
  standardProfileId: z.string(),
  overrideStandardValues: z.boolean(),
  sourceStandard: z.string(),
  sourceSection: z.string(),
  sourceClause: z.string(),
  sourceTable: z.string(),
  sourcePagesNote: z.string(),
  active: z.boolean(),
  fc_MPa: NullableNumberSchema,
  fc_cube_MPa: NullableNumberSchema,
  fcm_MPa: NullableNumberSchema,
  fcmi_MPa: NullableNumberSchema,
  fctf_MPa: NullableNumberSchema,
  fct_MPa: NullableNumberSchema,
  EcMode: z.enum(MULTI_PILE_STRUCTURAL_EC_MODES),
  Ec_MPa: NullableNumberSchema,
  density_kgm3: NullableNumberSchema,
  poissonsRatio: NullableNumberSchema,
  thermalExpansionPerDegC: NullableNumberSchema,
  shrinkageReferenceText: z.string(),
  shrinkageEnvironmentNotes: z.string(),
  creepReferenceText: z.string(),
  creepEnvironmentNotes: z.string(),
  notes: z.string(),
});

export const MultiPileProjectReinforcementGradeSchema = z.object({
  id: z.string().min(1),
  displayName: z.string(),
  sourceStandard: z.string(),
  sourceSection: z.string(),
  sourceClause: z.string(),
  sourceTable: z.string(),
  sourcePagesNote: z.string(),
  active: z.boolean(),
  designationGrade: z.string(),
  fsy_MPa: NullableNumberSchema,
  esu: NullableNumberSchema,
  ductilityClass: z.string(),
  Es_MPa: NullableNumberSchema,
  thermalExpansionPerDegC: NullableNumberSchema,
  stressStrainReferenceText: z.string(),
  notes: z.string(),
});

export const MultiPileProjectTendonGradeSchema = z.object({
  id: z.string().min(1),
  displayName: z.string(),
  standardProfileId: z.string(),
  overrideStandardValues: z.boolean(),
  sourceStandard: z.string(),
  sourceSection: z.string(),
  sourceClause: z.string(),
  sourceTable: z.string(),
  sourcePagesNote: z.string(),
  active: z.boolean(),
  tendonType: z.string(),
  nominalDiameter_mm: NullableNumberSchema,
  area_mm2: NullableNumberSchema,
  fpb_kN: NullableNumberSchema,
  fpb_MPa: NullableNumberSchema,
  fpy_MPa: NullableNumberSchema,
  Ep_MPa: NullableNumberSchema,
  stressStrainReferenceText: z.string(),
  relaxationReferenceText: z.string(),
  notes: z.string(),
});

export const MultiPileProjectCoverDurabilityClassSchema = z.object({
  id: z.string().min(1),
  displayName: z.string(),
  sourceStandard: z.string(),
  sourceSection: z.string(),
  sourceClause: z.string(),
  sourceTable: z.string(),
  sourcePagesNote: z.string(),
  active: z.boolean(),
  designLifeYears: NullableNumberSchema,
  exposureClass: z.string(),
  exposureClassification: z.string(),
  minConcreteStrengthPrecast_MPa: z.string(),
  minConcreteStrengthCastInPlace_MPa: z.string(),
  minConcreteStrength_MPa: z.string(),
  minCoverPrecast_mm: NullableNumberSchema,
  minCoverCastInPlace_mm: NullableNumberSchema,
  nominalCover_mm: NullableNumberSchema,
  aggressivityNotes: z.string(),
  durabilityNotes: z.string(),
  crackWidthLimit_mm: NullableNumberSchema,
  notes: z.string(),
});

export const MultiPileProjectStructuralDefaultsSchema = z.object({
  concreteClasses: z.array(MultiPileProjectConcreteClassSchema),
  reinforcementGrades: z.array(MultiPileProjectReinforcementGradeSchema),
  tendonGrades: z.array(MultiPileProjectTendonGradeSchema),
  coverDurabilityClasses: z.array(MultiPileProjectCoverDurabilityClassSchema),
});

export const MultiPileProjectGeotechnicalMaterialSchema = z.object({
  id: z.string().min(1),
  unitCode: z.string(),
  displayName: z.string(),
  sourceReferenceId: z.string(),
  sourceDocument: z.string(),
  sourceProject: z.string(),
  sourceSite: z.string(),
  sourceSection: z.string(),
  sourceTable: z.string(),
  notes: z.string(),
  gamma_b: NullableNumberSchema,
  phi_prime: NullableNumberSchema,
  c_prime: NullableNumberSchema,
  cu: NullableNumberSchema,
  E_MPa: NullableNumberSchema,
  nu: NullableNumberSchema,
  Ka: NullableNumberSchema,
  Ko: NullableNumberSchema,
  Kp: NullableNumberSchema,
  wallInterfaceActive: NullableNumberSchema,
  wallInterfacePassive: NullableNumberSchema,
  pile_fms_comp_kPa: NullableNumberSchema,
  pile_fms_tension_kPa: NullableNumberSchema,
  pile_fb_ult_kPa: NullableNumberSchema,
  pile_fms_allow_kPa: NullableNumberSchema,
  pile_fb_allow_kPa: NullableNumberSchema,
  cfaUpliftTensionFactor: NullableNumberSchema,
  includeInProject: z.boolean(),
});

export const MultiPileProjectGeotechnicalLibrarySchema = z.object({
  activeReferenceId: z.string(),
  templateState: z.enum(MULTI_PILE_PROJECT_GEO_TEMPLATE_STATES),
  materials: z.array(MultiPileProjectGeotechnicalMaterialSchema),
});

export const MultiPileGeoArrSettingsSchema = z.object({
  irrValues: z.array(z.number().min(1).max(5)),
  testType: z.enum(MULTI_PILE_GEO_TEST_TYPES),
  testPilePercentage: z.number().min(0).max(100),
  weightTotal: z.number().min(0),
  weightedScore: z.number().min(0),
  arrValue: z.number().min(0),
  arrBand: z.string(),
  phiTf: NullableNumberSchema,
  testBenefitK: z.number().min(0).max(1),
  phiGbLow: z.number().min(0),
  phiGbHigh: z.number().min(0),
  phiGLow: z.number().min(0),
  phiGHigh: z.number().min(0),
});

export const MultiPileProjectArrAssessmentSchema = MultiPileGeoArrSettingsSchema;

export const MultiPileProjectGeotechnicalBasisSchema = z.object({
  groundwaterDesignNotes: z.string(),
  cfaUpliftMode: z.enum(MULTI_PILE_PROJECT_GEO_UPLIFT_MODES),
  cfaUpliftFactor: z.number().min(0),
  defaultSocketAssumptions: z.string(),
  foundingNotes: z.string(),
  commentary: z.string(),
  arrAssessment: MultiPileProjectArrAssessmentSchema.default(defaultMultiPileGeoArrSettings()),
});

export const MultiPileProjectSpecificsSchema = z.object({
  identity: MultiPileProjectIdentitySchema,
  reportMeta: MultiPileProjectReportMetadataSchema,
  references: z.array(MultiPileProjectReferenceSchema),
  structuralDefaults: MultiPileProjectStructuralDefaultsSchema,
  geotechnicalMaterials: MultiPileProjectGeotechnicalLibrarySchema,
  geotechnicalBasis: MultiPileProjectGeotechnicalBasisSchema,
});

export const MultiPileGeoTypeSettingsSchema = z.object({
  typeId: z.string().min(1),
  linkedDmm: z.number().min(0),
  redundancy: z.enum(MULTI_PILE_GEO_REDUNDANCY_LEVELS),
  shaftRedComp: z.number().min(0),
  shaftRedTen: z.number().min(0),
  useNnf: z.boolean(),
  Nnf: z.number().min(0),
  s1H: z.number().min(0),
  s1qs: z.number().min(0),
  s1MaterialId: z.string(),
  s2H: z.number().min(0),
  s2qs: z.number().min(0),
  s2MaterialId: z.string(),
  s3H: z.number().min(0),
  s3qs: z.number().min(0),
  s3MaterialId: z.string(),
  Ls: z.number().min(0),
  useLsMinOverride: z.boolean(),
  LsMinOverride: z.number().min(0),
  qsRock: z.number().min(0),
  qbRock: z.number().min(0),
  foundingMaterialId: z.string(),
  useBase: z.enum(MULTI_PILE_GEO_USE_BASE_OPTIONS),
  LsMode: z.enum(MULTI_PILE_GEO_SOCKET_MODES),
  LsSolved: z.number().min(0),
  LsManual: z.number().min(0),
  LsAdopted: z.number().min(0),
  socketOverrideEnabled: z.boolean(),
});

export const MultiPileGeoResolvedLayerRowSchema = z.object({
  slot: z.number().int().min(1),
  H: z.number().min(0),
  fmsComp: z.number().min(0),
  fmsTen: z.number().min(0),
  label: z.string(),
  unitCode: z.string(),
  displayName: z.string(),
  materialId: z.string(),
  sourceReferenceId: z.string(),
  sourceReferenceLabel: z.string(),
  usedLegacyFallback: z.boolean(),
  resolutionMode: z.enum(MULTI_PILE_GEO_RESOLUTION_MODES),
  missingSelection: z.boolean(),
  missingCapacity: z.boolean(),
});

export const MultiPileGeoSocketContributionRowSchema = z.object({
  label: z.string(),
  H: z.number().min(0),
  fms: z.number().min(0),
  fmsTension: z.number().min(0),
  fbUlt: NullableNumberSchema,
  Rs: z.number().min(0),
});

export const MultiPileGeoResultRowSchema = z.object({
  jointId: z.string().min(1),
  jointDisplayName: z.string().optional(),
  pileId: z.string().min(1),
  typeId: z.string().min(1),
  activePatternIds: z.array(z.string().min(1)),
  redundancy: z.enum(MULTI_PILE_GEO_REDUNDANCY_LEVELS),
  status: z.enum(MULTI_PILE_GEO_RESULT_STATUSES),
  pendingReason: z.string(),
  Nmax: NullableNumberSchema,
  Nmin: NullableNumberSchema,
  upliftAbs: NullableNumberSchema,
  Nnf: NullableNumberSchema,
  phi: NullableNumberSchema,
  phiRcomp: NullableNumberSchema,
  phiRten: NullableNumberSchema,
  utilComp: NullableNumberSchema,
  utilTen: NullableNumberSchema,
  ok: z.boolean().nullable(),
  diameter: z.number().min(0),
  Ls: NullableNumberSchema,
  LsSolved: NullableNumberSchema,
  LsAdopted: NullableNumberSchema,
  LsMode: z.enum(MULTI_PILE_GEO_SOCKET_MODES),
  socketMode: z.enum(MULTI_PILE_GEO_SOCKET_MODES),
  socketOverrideEnabled: z.boolean(),
  qsRock: NullableNumberSchema,
  qbRock: NullableNumberSchema,
  useBase: z.boolean(),
  shaftRedComp: z.number().min(0),
  shaftRedTen: z.number().min(0),
  LsMin: z.number().min(0),
  activeReferenceId: z.string(),
  activeReferenceLabel: z.string(),
  foundingMaterialId: z.string(),
  foundingMaterialLabel: z.string(),
  foundingLabel: z.string(),
  foundingSourceReferenceLabel: z.string(),
  foundingResolutionMode: z.enum(MULTI_PILE_GEO_RESOLUTION_MODES),
  foundingUsesLegacyFallback: z.boolean(),
  foundingMissingSelection: z.boolean(),
  foundingMissingCapacity: z.boolean(),
  foundingFmsComp: NullableNumberSchema,
  foundingFmsTen: NullableNumberSchema,
  foundingFbUlt: NullableNumberSchema,
  foundingFmsAllow: NullableNumberSchema,
  foundingFbAllow: NullableNumberSchema,
  resolvedFmSComp: NullableNumberSchema,
  resolvedFmSTen: NullableNumberSchema,
  resolvedFbUlt: NullableNumberSchema,
  resolvedFbAllow: NullableNumberSchema,
  inputWarnings: z.array(z.string()),
  socketAdoptionNote: z.string(),
  layerRows: z.array(MultiPileGeoResolvedLayerRowSchema),
  socketContributionBreakdown: z.array(MultiPileGeoSocketContributionRowSchema),
  updatedAt: z.string(),
});

export const MultiPilePileTypeDefinitionSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  sizePreset: z.string().min(1),
  useCustom: z.boolean(),
  customMm: z.number().positive(),
  Dmm: z.number().positive(),
  nominalDiameterMm: z.number().positive(),
  eoop: z.number().min(0),
  eoopM: z.number().min(0),
  compressionUltimateMin: z.number().min(0).nullable(),
  compressionUltimateMax: z.number().min(0).nullable(),
  tensionUltimateMin: z.number().min(0).nullable(),
  tensionUltimateMax: z.number().min(0).nullable(),
  active: z.boolean(),
  order: z.number().int().nonnegative(),
});

export const MultiPileJointSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().optional(),
  jointDisplayName: z.string().optional(),
  x: z.number(),
  y: z.number(),
  z: z.number(),
  supportCount: z.number().int().min(1),
  noOfSupports: z.number().int().min(1),
  pileTypeId: z.string().min(1),
  assignmentMode: z.enum(MULTI_PILE_JOINT_ASSIGNMENT_MODES).default('manual'),
  active: z.boolean(),
  order: z.number().int().nonnegative(),
});

export const MultiPileGeneratedPileSchema = z.object({
  id: z.string().min(1),
  parentJointId: z.string().min(1),
  supportIndex: z.number().int().min(1),
  supportCount: z.number().int().min(1),
  pileTypeId: z.string().min(1),
});

export const MultiPileLoadPatternSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  patternType: z.enum(MULTI_PILE_PATTERN_TYPES),
  reversible: z.boolean(),
  enabled: z.boolean(),
  order: z.number().int().nonnegative(),
});

export const MultiPileJointLoadRowSchema = z.object({
  jointId: z.string().min(1),
  patternId: z.string().min(1),
  p: z.number(),
  vx: z.number(),
  vy: z.number(),
  mx: z.number(),
  my: z.number(),
  mz: z.number(),
});

export const MultiPileCombinationTermSchema = z.object({
  patternId: z.string().min(1),
  factor: z.number(),
});

export const MultiPileCombinationSettingsSchema = z.object({
  alpha: z.number().min(0),
  psiC: z.number().min(0),
  psiE: z.number().min(0),
  psiL: z.number().min(0),
  groundwaterFactor: z.number().min(0),
  minPermanentFactor: z.number().min(0),
  reduceMinimumPermanentWithPointNine: z.boolean(),
});

export const MultiPileCombinationRowSchema = z.object({
  id: z.string().min(1),
  builtinKey: z.string().min(1).optional(),
  displayName: z.string().min(1),
  source: z.enum(MULTI_PILE_COMBINATION_SOURCES),
  kind: z.enum(MULTI_PILE_COMBINATION_KINDS),
  enabled: z.boolean(),
  includeInEnvelope: z.boolean(),
  reference: z.string().optional(),
  family: z.enum(MULTI_PILE_COMBINATION_FAMILIES).optional(),
  reversibleAware: z.boolean().optional(),
  terms: z.array(MultiPileCombinationTermSchema).optional(),
  childCombinationIds: z.array(z.string().min(1)).optional(),
  expressionSummary: z.string().optional(),
  order: z.number().int().nonnegative(),
});

export const MultiPileStateSchema = z.object({
  version: z.literal(1),
  combinationSettings: MultiPileCombinationSettingsSchema,
  pileTypes: z.array(MultiPilePileTypeDefinitionSchema),
  geoArrSettings: MultiPileGeoArrSettingsSchema,
  geoTypeSettings: z.record(z.string(), MultiPileGeoTypeSettingsSchema),
  geoResults: z.record(z.string(), MultiPileGeoResultRowSchema),
  joints: z.array(MultiPileJointSchema),
  generatedPiles: z.array(MultiPileGeneratedPileSchema),
  loadPatterns: z.array(MultiPileLoadPatternSchema),
  jointLoads: z.array(MultiPileJointLoadRowSchema),
  combinationLibrary: z.array(MultiPileCombinationRowSchema),
  selectedCombinations: z.array(z.string().min(1)),
  uiState: z.record(z.string(), z.unknown()).optional(),
});

export const MultiPileEnvelopeValueSchema = z.object({
  value: z.number(),
  combinationId: z.string(),
  combinationName: z.string(),
  source: z.enum(MULTI_PILE_COMBINATION_SOURCES),
  expressionSummary: z.string().optional(),
});

export const MultiPileJointEnvelopeSnapshotSchema = z.object({
  jointId: z.string().min(1),
  jointDisplayName: z.string().optional(),
  pileTypeId: z.string().min(1),
  representativePileId: z.string().optional(),
  activePatternIds: z.array(z.string().min(1)),
  nMax: MultiPileEnvelopeValueSchema,
  nMin: MultiPileEnvelopeValueSchema,
  vx: MultiPileEnvelopeValueSchema,
  vy: MultiPileEnvelopeValueSchema,
  mx: MultiPileEnvelopeValueSchema,
  my: MultiPileEnvelopeValueSchema,
});

export const MultiPileEnvelopeProjectSummarySchema = z.object({
  jointCount: z.number().int().nonnegative(),
  evaluatedCombinationCount: z.number().int().nonnegative(),
  governingCombinationCount: z.number().int().nonnegative(),
  activePatternCount: z.number().int().nonnegative(),
});

export const MultiPileStructInteractionPointSchema = z.object({
  N: z.number(),
  M: z.number(),
});

export const MultiPileStructInteractionDemandPointSchema =
  MultiPileStructInteractionPointSchema.extend({
    jointId: z.string().optional(),
    pileId: z.string().optional(),
    label: z.string().optional(),
    cls: z.string().optional(),
  });

export const MultiPileStructSectionValuesSchema = z.object({
  phiPn: z.number(),
  phiMn: z.number(),
  phiVu: z.number(),
  utilisation: z.number(),
  pass: z.boolean(),
});

export const MultiPileStructAxialResultSchema = z.object({
  N_capacity: z.number(),
  N_tension_capacity: z.number(),
  N_demand: z.number(),
  N_tension_demand: z.number(),
  compressionUtilisation: z.number(),
  tensionUtilisation: z.number(),
  utilisation: z.number(),
  pass: z.boolean(),
});

export const MultiPileStructMomentResultSchema = z.object({
  Mx_capacity: z.number(),
  My_capacity: z.number(),
  M_capacity: z.number(),
  M_demand: z.number(),
  Mx_demand: z.number(),
  My_demand: z.number(),
  phiMu0: z.number(),
  phiNuo: z.number(),
  phiN03Agfc: z.number(),
  alphaN: z.number(),
  utilisation: z.number(),
  pass: z.boolean(),
  biaxial: z.boolean(),
});

export const MultiPileStructShearDemandCaseSchema = z.object({
  jointId: z.string().min(1),
  pileId: z.string().optional(),
  label: z.string(),
  Vstar: z.number(),
  pass: z.boolean(),
});

export const MultiPileStructShearResultSchema = z.object({
  Vu_capacity: z.number(),
  Vu_max_capacity: z.number(),
  Vu_demand: z.number(),
  Vx_demand: z.number(),
  Vy_demand: z.number(),
  Vuc: z.number(),
  Vus: z.number(),
  Vu: z.number(),
  Vumax: z.number(),
  okMinAsv: z.boolean(),
  shearReoRequired: z.boolean(),
  utilisation: z.number(),
  webUtilisation: z.number(),
  pass: z.boolean(),
  demandCases: z.array(MultiPileStructShearDemandCaseSchema),
});

export const MultiPileStructInteractionResultSchema = z.object({
  curve: z.array(MultiPileStructInteractionPointSchema),
  demandPoint: MultiPileStructInteractionDemandPointSchema,
  demandPoints: z.array(MultiPileStructInteractionDemandPointSchema),
});

export const MultiPileStructUtilisationResultSchema = z.object({
  axial: z.number(),
  moment: z.number(),
  shear: z.number(),
  web: z.number(),
  governing: z.number(),
});

export const MultiPileStructChecksSchema = z.object({
  axial: z.boolean(),
  moment: z.boolean(),
  shear: z.boolean(),
  web: z.boolean(),
  minShearReinforcement: z.boolean(),
  struct: z.boolean(),
});

export const MultiPileStructReinforcementComplianceProvidedValuesSchema = z.object({
  As_perim: z.number(),
  As_central: z.number(),
  As_total: z.number(),
  As_bending_effective: z.number(),
  As_tension_effective: z.number(),
  As_head_tension_effective: z.number(),
  As_deep_tension_effective: z.number(),
});

export const MultiPileStructReinforcementComplianceRequiredValuesSchema = z.object({
  As_min: z.number(),
  As_max: z.number(),
  As_req_tension: z.number(),
  rho_min: z.number(),
  rho_max: z.number(),
});

export const MultiPileStructReinforcementComplianceChecksSchema = z.object({
  okAsMin: z.boolean(),
  okAsMax: z.boolean(),
  asMaxExceeded: z.boolean(),
  overrideOn: z.boolean(),
  reoLimitsOk: z.boolean(),
});

export const MultiPileStructReinforcementComplianceContextSchema = z.object({
  clauseRef: z.string(),
  minReoRule: z.string(),
  minReoRuleLabel: z.string(),
  reoLoc: z.string(),
  reoLocLabel: z.string(),
  reoLocDetail: z.string(),
  reoLocDetailLabel: z.string(),
  reinforcementGradeId: z.string().optional(),
  reinforcementGradeLabel: z.string().optional(),
  barDia: z.number(),
  nBars: z.number(),
  useCentralBar: z.boolean(),
  centralBarDia: z.number(),
  centralBarCount: z.number(),
  providedAreaBasis: z.literal('perimeter'),
  providedAreaBasisLabel: z.string(),
});

export const MultiPileStructReinforcementComplianceResultSchema = z.object({
  status: z.enum(MULTI_PILE_STRUCT_RESULT_STATUSES),
  summaryText: z.string(),
  detailText: z.string(),
  titleText: z.string(),
  minimumStatusText: z.string(),
  maximumStatusText: z.string(),
  provided: MultiPileStructReinforcementComplianceProvidedValuesSchema,
  required: MultiPileStructReinforcementComplianceRequiredValuesSchema,
  checks: MultiPileStructReinforcementComplianceChecksSchema,
  context: MultiPileStructReinforcementComplianceContextSchema,
});

export const MultiPileStructResultSchema = z.object({
  pileTypeId: z.string().min(1),
  linkedJointIds: z.array(z.string().min(1)),
  representativePileId: z.string().optional(),
  worstJointId: z.string().optional(),
  updatedAt: z.string(),
  status: z.enum(MULTI_PILE_STRUCT_RESULT_STATUSES),
  overallOk: z.boolean(),
  inputWarnings: z.array(z.string()),
  sectionValues: MultiPileStructSectionValuesSchema,
  axial: MultiPileStructAxialResultSchema,
  moment: MultiPileStructMomentResultSchema,
  shear: MultiPileStructShearResultSchema,
  interaction: MultiPileStructInteractionResultSchema,
  utilisation: MultiPileStructUtilisationResultSchema,
  checks: MultiPileStructChecksSchema,
  reinforcementCompliance: MultiPileStructReinforcementComplianceResultSchema.optional(),
});

export const MultiPileEnvelopeSnapshotSchema = z.object({
  version: z.literal(1),
  generatedAt: z.string(),
  pileGroupId: z.string().min(1),
  jointResults: z.array(MultiPileJointEnvelopeSnapshotSchema),
  structResults: z.record(z.string(), MultiPileStructResultSchema).optional(),
  projectSummary: MultiPileEnvelopeProjectSummarySchema,
});

export const MultiPileEngineMessageSchema = z.object({
  code: z.string(),
  message: z.string(),
  clauseRef: z.string().optional(),
});

export const MultiPileEnvelopeRunSummarySchema = z.object({
  runId: z.string(),
  status: z.string(),
  createdAt: z.string(),
  durationMs: z.number().optional(),
  envelope: MultiPileEnvelopeSnapshotSchema.optional(),
  warnings: z.array(MultiPileEngineMessageSchema).optional(),
  errors: z.array(MultiPileEngineMessageSchema).optional(),
});
