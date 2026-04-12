import { z } from 'zod/v4';

const evidenceQuerySchema = z.string().min(1).max(240);
const engineeringReportDocumentFamilySchema = z.enum([
  'GEOTECHNICAL_REPORT',
  'PRELIMINARY_GEOTECHNICAL_INVESTIGATION',
  'GEOTECHNICAL_GROUNDWATER_REPORT',
  'PRELIMINARY_GEOTECHNICAL_GROUNDWATER_REPORT',
  'STRUCTURAL_REPORT',
  'COMBINED_ENGINEERING_REPORT',
  'OTHER_ENGINEERING_REPORT',
]);
const aiReportDocumentFamilySchema = z.enum([
  'geotechnical',
  'environmental',
  'structural',
  'hydrogeology_dewatering',
  'inspections',
  'temporary_works',
  'other',
]);
const aiReportTypeSchema = z.enum([
  'geotechnical_investigation',
  'geotechnical_comment',
  'dewatering_management_plan',
  'contamination_assessment',
  'structural_design_report',
  'inspection_report',
  'temporary_works_report',
  'other',
]);
const aiReportOwnerWorkspaceSchema = z.enum([
  'project',
  'project_geotechnical',
  'foundations',
  'structural',
  'environmental',
  'inspections',
  'other',
]);
const extractionProfileSchema = z
  .object({
    documentFamily: aiReportDocumentFamilySchema,
    reportType: aiReportTypeSchema,
    ownerWorkspace: aiReportOwnerWorkspaceSchema,
  })
  .strict();

const nullableDraftFindingSchema = z
  .object({
    value: z.string().min(1).max(1200).nullable(),
    evidenceQuery: evidenceQuerySchema.nullable(),
  })
  .strict();

const nullableDocumentFamilyDraftFindingSchema = z
  .object({
    value: engineeringReportDocumentFamilySchema.nullable(),
    evidenceQuery: evidenceQuerySchema.nullable(),
  })
  .strict();

const nullableNumericDraftFindingSchema = z
  .object({
    value: z.number().finite().nullable(),
    evidenceQuery: evidenceQuerySchema.nullable(),
  })
  .strict();

const draftFindingSchema = z
  .object({
    value: z.string().min(1).max(1200),
    evidenceQuery: evidenceQuerySchema,
  })
  .strict();

const snippetIdSchema = z.string().min(1).max(64);

const snippetBackedDraftFindingSchema = z
  .object({
    value: z.string().min(1).max(1200),
    sourceSnippetIds: z.array(snippetIdSchema).min(1).max(4),
  })
  .strict();

const snippetBackedNullableDraftFindingSchema = z
  .object({
    value: z.string().min(1).max(1200).nullable(),
    sourceSnippetIds: z.array(snippetIdSchema).max(4),
  })
  .strict();

const snippetBackedNullableNumericFindingSchema = z
  .object({
    value: z.number().finite().nullable(),
    sourceSnippetIds: z.array(snippetIdSchema).max(4),
  })
  .strict();

const groundModelDepthQualifierSchema = z.enum([
  'EXACT',
  'MINIMUM',
  'NOT_ENCOUNTERED',
  'UNKNOWN',
]);

const groundModelUnitDepthDraftSchema = z
  .object({
    unitName: z.string().min(1).max(240),
    weatheringNote: z.string().min(1).max(240).nullable(),
    depthToBaseMeters: z.number().finite().nonnegative().nullable(),
    depthQualifier: groundModelDepthQualifierSchema,
    rawDepthText: z.string().min(1).max(120),
    sourceSnippetIds: z.array(snippetIdSchema).min(1).max(4),
  })
  .strict();

const groundModelBoreholeDraftSchema = z
  .object({
    boreholeId: z.string().min(1).max(80),
    unitDepths: z.array(groundModelUnitDepthDraftSchema).max(16),
    sourceSnippetIds: z.array(snippetIdSchema).min(1).max(4),
  })
  .strict();

const batterSlopeRowDraftSchema = z
  .object({
    material: z.string().min(1).max(240).nullable(),
    temporarySlope: z.string().min(1).max(80).nullable(),
    permanentSlope: z.string().min(1).max(80).nullable(),
    notes: z.string().min(1).max(1200).nullable(),
    assumptions: z.string().min(1).max(1200).nullable(),
    sourceSnippetIds: z.array(snippetIdSchema).min(1).max(4),
  })
  .strict();

const batterSlopeTableDraftSchema = z
  .object({
    tableLabel: z.string().min(1).max(240),
    pageLabel: z.string().min(1).max(64).nullable(),
    rows: z.array(batterSlopeRowDraftSchema).max(16),
  })
  .strict();

const soilNailBondStressRowDraftSchema = z
  .object({
    material: z.string().min(1).max(240).nullable(),
    allowableBondStressKPa: z.number().finite().nonnegative().nullable(),
    notes: z.string().min(1).max(1200).nullable(),
    assumptions: z.string().min(1).max(1200).nullable(),
    sourceSnippetIds: z.array(snippetIdSchema).min(1).max(4),
  })
  .strict();

const soilNailBondStressTableDraftSchema = z
  .object({
    tableLabel: z.string().min(1).max(240),
    pageLabel: z.string().min(1).max(64).nullable(),
    rows: z.array(soilNailBondStressRowDraftSchema).max(16),
  })
  .strict();

const geotechnicalParameterTableTypeSchema = z.enum([
  'GEOLOGICAL_UNIT_PARAMETERS',
  'PILE_FOUNDING_PARAMETERS',
  'OTHER_GEOTECHNICAL_PARAMETERS',
]);

const standardsUseTagSchema = z.enum([
  'compression',
  'uplift',
  'lateral',
  'durability',
  'testing',
]);

const geotechnicalParameterTableRowDraftSchema = z
  .object({
    rowLabel: z.string().min(1).max(240).nullable(),
    unitCode: z.string().min(1).max(40).nullable(),
    unitDescription: z.string().min(1).max(240).nullable(),
    foundingStrata: z.string().min(1).max(240).nullable(),
    endBearingUltimateKPa: z.number().finite().nonnegative().nullable(),
    endBearingAllowableKPa: z.number().finite().nonnegative().nullable(),
    shaftAdhesionCompressionUltimateKPa: z.number().finite().nonnegative().nullable(),
    shaftAdhesionCompressionAllowableKPa: z.number().finite().nonnegative().nullable(),
    shaftAdhesionTensionUltimateKPa: z.number().finite().nonnegative().nullable(),
    unitWeightBulkKNm3: z.number().finite().nonnegative().nullable(),
    frictionAngleDeg: z.number().finite().nonnegative().nullable(),
    cohesionKPa: z.number().finite().nonnegative().nullable(),
    undrainedShearStrengthKPa: z.number().finite().nonnegative().nullable(),
    modulusMPa: z.number().finite().nonnegative().nullable(),
    poissonRatio: z.number().finite().nonnegative().nullable(),
    wallInterfaceReduction: z.number().finite().nonnegative().nullable(),
    Ka: z.number().finite().nonnegative().nullable(),
    Ko: z.number().finite().nonnegative().nullable(),
    Kp: z.number().finite().nonnegative().nullable(),
    notes: z.string().min(1).max(1200).nullable(),
    rawRowText: z.string().min(1).max(2400),
    sourceSnippetIds: z.array(snippetIdSchema).min(1).max(4),
  })
  .strict();

const geotechnicalParameterTableDraftSchema = z
  .object({
    tableKey: z.string().min(1).max(120),
    tableLabel: z.string().min(1).max(240),
    pageLabel: z.string().min(1).max(64).nullable(),
    tableType: geotechnicalParameterTableTypeSchema,
    rows: z.array(geotechnicalParameterTableRowDraftSchema).max(40),
  })
  .strict();

const geotechnicalCommentProfileDraftSchema = z
  .object({
    changedItems: z.array(draftFindingSchema).max(12),
    unchangedItems: z.array(draftFindingSchema).max(12),
    revisedRecommendations: z.array(draftFindingSchema).max(12),
    affectedDrawingsRevisionsDates: z.array(draftFindingSchema).max(12),
    explicitNewDesignTablesOrParameters: z.array(draftFindingSchema).max(8),
  })
  .strict();

const dewateringProfileDraftSchema = z
  .object({
    groundwaterObservations: z.array(draftFindingSchema).max(12),
    groundwaterLevels: z.array(draftFindingSchema).max(12),
    permeabilityHydraulicConductivity: z.array(draftFindingSchema).max(12),
    inflowRates: z.array(draftFindingSchema).max(12),
    drawdownEstimates: z.array(draftFindingSchema).max(12),
    aquiferWaterNswAipComplianceNotes: z.array(draftFindingSchema).max(12),
    neighbouringPropertySettlementEffects: z.array(draftFindingSchema).max(12),
    monitoringReportingRequirements: z.array(draftFindingSchema).max(12),
    keyAssumptionsLimitations: z.array(draftFindingSchema).max(12),
    piezometerMonitoringNetwork: z.array(draftFindingSchema).max(12),
    settlementDrawdownTriggerLevels: z.array(draftFindingSchema).max(12),
    waterNswLicenceBoreRegistration: z.array(draftFindingSchema).max(12),
    constructionStageApplicability: z.array(draftFindingSchema).max(12),
  })
  .strict();

export const geotechnicalFocusedRefinementDraftSchema = z
  .object({
    geotechnicalParameterTables: z.array(geotechnicalParameterTableDraftSchema).max(8),
    foundingNotes: z.array(snippetBackedDraftFindingSchema).max(12),
    groundwaterNotes: z.array(snippetBackedDraftFindingSchema).max(12),
    groundwaterDesignAssumptions: z.array(snippetBackedDraftFindingSchema).max(12),
    hydrostaticAssumptions: z.array(snippetBackedDraftFindingSchema).max(12),
    rockStrataDesignParameters: z.array(snippetBackedDraftFindingSchema).max(12),
    pileRecommendations: z.array(snippetBackedDraftFindingSchema).max(12),
    aggressivityDurabilityNotes: z.array(snippetBackedDraftFindingSchema).max(12),
    furtherInvestigationNotes: z.array(snippetBackedDraftFindingSchema).max(12),
    groundModel: z
      .object({
        siteWideInterpretation: snippetBackedNullableDraftFindingSchema,
        boreholes: z.array(groundModelBoreholeDraftSchema).max(16),
      })
      .strict(),
    batterSlopeTable: batterSlopeTableDraftSchema.nullable(),
    soilNailBondStressTable: soilNailBondStressTableDraftSchema.nullable(),
  })
  .strict();

export const engineeringReportExtractionDraftSchema = z
  .object({
    documentFamily: nullableDocumentFamilyDraftFindingSchema,
    reportTitle: nullableDraftFindingSchema,
    projectSummary: nullableDraftFindingSchema,
    reportMetadata: z
      .object({
        projectNumber: nullableDraftFindingSchema,
        filename: nullableDraftFindingSchema,
        documentTitle: nullableDraftFindingSchema,
        siteAddress: nullableDraftFindingSchema,
        preparedFor: nullableDraftFindingSchema,
        revision: nullableDraftFindingSchema,
        status: nullableDraftFindingSchema,
        preparedBy: nullableDraftFindingSchema,
        reviewedBy: nullableDraftFindingSchema,
        dateIssued: nullableDraftFindingSchema,
        distributionIssuedTo: nullableDraftFindingSchema,
        authorSignOffDate: nullableDraftFindingSchema,
        reviewerSignOffDate: nullableDraftFindingSchema,
      })
      .strict(),
    investigationBasis: z
      .object({
        purposeScope: nullableDraftFindingSchema,
        numberOfBoreholes: nullableDraftFindingSchema,
        testLocationSummary: nullableDraftFindingSchema,
        targetDepthRule: nullableDraftFindingSchema,
        fieldworkDates: nullableDraftFindingSchema,
        investigationMethods: z.array(draftFindingSchema).max(12),
        laboratoryTestingSummary: z.array(draftFindingSchema).max(12),
        coordinateDatumReferences: z.array(draftFindingSchema).max(12),
        confidenceLimitations: z.array(draftFindingSchema).max(12),
      })
      .strict(),
    groundwater: z
      .object({
        observedConditions: z.array(draftFindingSchema).max(12),
        uncertaintyAndMonitoring: z.array(draftFindingSchema).max(12),
        constructionImplications: z.array(draftFindingSchema).max(12),
      })
      .strict(),
    reportSections: z
      .object({
        excavations: z.array(draftFindingSchema).max(12),
        batterSlopes: z.array(draftFindingSchema).max(12),
        soilNails: z.array(draftFindingSchema).max(12),
        retainingWalls: z.array(draftFindingSchema).max(12),
        fillMaterials: z.array(draftFindingSchema).max(12),
        siteClassification: z.array(draftFindingSchema).max(12),
        aggressivityDurability: z.array(draftFindingSchema).max(12),
        shallowFoundations: z.array(draftFindingSchema).max(12),
        deepFoundations: z.array(draftFindingSchema).max(12),
        raftSlab: z.array(draftFindingSchema).max(12),
        subgradePreparation: z.array(draftFindingSchema).max(12),
        drainageServiceInstallationSiteMaintenance: z.array(draftFindingSchema).max(12),
        earthquakeSiteFactor: z.array(draftFindingSchema).max(12),
        workingPlatform: z.array(draftFindingSchema).max(12),
        existingConditionsSurvey: z.array(draftFindingSchema).max(12),
        limitations: z.array(draftFindingSchema).max(16),
      })
      .strict(),
    retainingWallPreliminaryParameters: z
      .object({
        Ka: nullableNumericDraftFindingSchema,
        Kp: nullableNumericDraftFindingSchema,
        K0: nullableNumericDraftFindingSchema,
        bulkDensityKNm3: nullableNumericDraftFindingSchema,
        triangularPressureDistributionNotes: z.array(draftFindingSchema).max(8),
        rectangularPressureExpression: nullableDraftFindingSchema,
        adjacentFootingPressureExpression: nullableDraftFindingSchema,
        hydrostaticDrainageNotes: z.array(draftFindingSchema).max(8),
        compactionPressureKPa: nullableNumericDraftFindingSchema,
      })
      .strict(),
    siteClassificationResult: z
      .object({
        classification: nullableDraftFindingSchema,
        estimatedGroundMovement: nullableDraftFindingSchema,
        notes: z.array(draftFindingSchema).max(8),
      })
      .strict(),
    earthquakeSiteFactor: z
      .object({
        siteSubsoilClass: nullableDraftFindingSchema,
        hazardFactorZ: nullableNumericDraftFindingSchema,
        notes: z.array(draftFindingSchema).max(8),
      })
      .strict(),
    pileConstruction: z
      .object({
        suitableMethods: z.array(draftFindingSchema).max(12),
        cautionsOrUnsuitableMethods: z.array(draftFindingSchema).max(12),
        designVerificationNotes: z.array(draftFindingSchema).max(12),
        constructionControls: z.array(draftFindingSchema).max(12),
        testingRecommendations: z.array(draftFindingSchema).max(12),
        upliftTensionNotes: z.array(draftFindingSchema).max(12),
        settlementExpectations: z.array(draftFindingSchema).max(12),
      })
      .strict(),
    structuralDefaults: z
      .object({
        concreteMentions: z.array(draftFindingSchema).max(12),
        coverDurabilityMentions: z.array(draftFindingSchema).max(12),
        reinforcementMentions: z.array(draftFindingSchema).max(12),
      })
      .strict(),
    geotechnicalBasis: z
      .object({
        foundingNotes: z.array(draftFindingSchema).max(12),
        groundwaterNotes: z.array(draftFindingSchema).max(12),
        groundwaterDesignAssumptions: z.array(draftFindingSchema).max(12),
        hydrostaticAssumptions: z.array(draftFindingSchema).max(12),
        materialMentions: z.array(draftFindingSchema).max(12),
        rockStrataDesignParameters: z.array(draftFindingSchema).max(12),
        pileRecommendations: z.array(draftFindingSchema).max(12),
        footingRecommendations: z.array(draftFindingSchema).max(12),
        raftRecommendations: z.array(draftFindingSchema).max(12),
        shoringRecommendations: z.array(draftFindingSchema).max(12),
        aggressivityDurabilityNotes: z.array(draftFindingSchema).max(12),
        furtherInvestigationNotes: z.array(draftFindingSchema).max(12),
      })
      .strict(),
    loadMentions: z
      .object({
        loadCases: z.array(draftFindingSchema).max(12),
        combinations: z.array(draftFindingSchema).max(12),
      })
      .strict(),
    geotechnicalCommentProfile: geotechnicalCommentProfileDraftSchema,
    dewateringProfile: dewateringProfileDraftSchema,
  })
  .strict();

export type EngineeringReportExtractionDraft = z.infer<
  typeof engineeringReportExtractionDraftSchema
>;

export type EngineeringReportDocumentFamily = z.infer<
  typeof engineeringReportDocumentFamilySchema
>;

export type EngineeringReportExtractionProfile = z.infer<typeof extractionProfileSchema>;

export type GeotechnicalFocusedRefinementDraft = z.infer<
  typeof geotechnicalFocusedRefinementDraftSchema
>;

export type GeotechnicalParameterTableType = z.infer<
  typeof geotechnicalParameterTableTypeSchema
>;

export type StandardsUseTag = z.infer<typeof standardsUseTagSchema>;

export type ExtractionCitation = {
  id: string;
  fileId: string;
  filename: string;
  snippet: string;
  score: number;
  query: string | null;
  pageLabel: string | null;
};

export type ExtractionFinding = {
  value: string;
  citations: ExtractionCitation[];
};

export type GeotechnicalParameterTableRow = {
  rowLabel: string | null;
  unitCode: string | null;
  unitDescription: string | null;
  foundingStrata: string | null;
  endBearingUltimateKPa: number | null;
  endBearingAllowableKPa: number | null;
  shaftAdhesionCompressionUltimateKPa: number | null;
  shaftAdhesionCompressionAllowableKPa: number | null;
  shaftAdhesionTensionUltimateKPa: number | null;
  unitWeightBulkKNm3: number | null;
  frictionAngleDeg: number | null;
  cohesionKPa: number | null;
  undrainedShearStrengthKPa: number | null;
  modulusMPa: number | null;
  poissonRatio: number | null;
  wallInterfaceReduction: number | null;
  Ka: number | null;
  Ko: number | null;
  Kp: number | null;
  notes: string | null;
  rawRowText: string;
  citations: ExtractionCitation[];
};

export type GeotechnicalParameterTable = {
  tableKey: string;
  tableLabel: string;
  pageLabel: string | null;
  tableType: GeotechnicalParameterTableType;
  rows: GeotechnicalParameterTableRow[];
};

export type StandardsClauseReference = {
  clause: string;
  title: string;
  summary: string;
};

export type StandardsParameterMapping = {
  extractedFieldPath: string;
  extractedValueLabel: string;
  possibleAs2159Concept: string;
  possibleAs2159Use: StandardsUseTag[];
  relatedClauses: string[];
  rationale: string;
  confidence: number;
};

export type StandardsMapping = {
  standard: 'AS2159_2009';
  relevantClauses: StandardsClauseReference[];
  parameterMappings: StandardsParameterMapping[];
  notes: string[];
};

export type NullableExtractionFinding = {
  value: string | null;
  citations: ExtractionCitation[];
};

export type NullableDocumentFamilyExtractionFinding = {
  value: EngineeringReportDocumentFamily | null;
  citations: ExtractionCitation[];
};

export type NullableNumericExtractionFinding = {
  value: number | null;
  citations: ExtractionCitation[];
};

export type ReportMetadataExtraction = {
  projectNumber: NullableExtractionFinding;
  filename: NullableExtractionFinding;
  documentTitle: NullableExtractionFinding;
  siteAddress: NullableExtractionFinding;
  preparedFor: NullableExtractionFinding;
  revision: NullableExtractionFinding;
  status: NullableExtractionFinding;
  preparedBy: NullableExtractionFinding;
  reviewedBy: NullableExtractionFinding;
  dateIssued: NullableExtractionFinding;
  distributionIssuedTo: NullableExtractionFinding;
  authorSignOffDate: NullableExtractionFinding;
  reviewerSignOffDate: NullableExtractionFinding;
};

export type InvestigationBasisExtraction = {
  purposeScope: NullableExtractionFinding;
  numberOfBoreholes: NullableExtractionFinding;
  testLocationSummary: NullableExtractionFinding;
  targetDepthRule: NullableExtractionFinding;
  fieldworkDates: NullableExtractionFinding;
  investigationMethods: ExtractionFinding[];
  laboratoryTestingSummary: ExtractionFinding[];
  coordinateDatumReferences: ExtractionFinding[];
  confidenceLimitations: ExtractionFinding[];
};

export type GroundwaterExtraction = {
  observedConditions: ExtractionFinding[];
  uncertaintyAndMonitoring: ExtractionFinding[];
  constructionImplications: ExtractionFinding[];
};

export type GeotechnicalCommentProfileExtraction = {
  changedItems: ExtractionFinding[];
  unchangedItems: ExtractionFinding[];
  revisedRecommendations: ExtractionFinding[];
  affectedDrawingsRevisionsDates: ExtractionFinding[];
  explicitNewDesignTablesOrParameters: ExtractionFinding[];
};

export type DewateringProfileExtraction = {
  groundwaterObservations: ExtractionFinding[];
  groundwaterLevels: ExtractionFinding[];
  permeabilityHydraulicConductivity: ExtractionFinding[];
  inflowRates: ExtractionFinding[];
  drawdownEstimates: ExtractionFinding[];
  aquiferWaterNswAipComplianceNotes: ExtractionFinding[];
  neighbouringPropertySettlementEffects: ExtractionFinding[];
  monitoringReportingRequirements: ExtractionFinding[];
  keyAssumptionsLimitations: ExtractionFinding[];
  piezometerMonitoringNetwork: ExtractionFinding[];
  settlementDrawdownTriggerLevels: ExtractionFinding[];
  waterNswLicenceBoreRegistration: ExtractionFinding[];
  constructionStageApplicability: ExtractionFinding[];
};

export type ReportSectionExtraction = {
  excavations: ExtractionFinding[];
  batterSlopes: ExtractionFinding[];
  soilNails: ExtractionFinding[];
  retainingWalls: ExtractionFinding[];
  fillMaterials: ExtractionFinding[];
  siteClassification: ExtractionFinding[];
  aggressivityDurability: ExtractionFinding[];
  shallowFoundations: ExtractionFinding[];
  deepFoundations: ExtractionFinding[];
  raftSlab: ExtractionFinding[];
  subgradePreparation: ExtractionFinding[];
  drainageServiceInstallationSiteMaintenance: ExtractionFinding[];
  earthquakeSiteFactor: ExtractionFinding[];
  workingPlatform: ExtractionFinding[];
  existingConditionsSurvey: ExtractionFinding[];
  limitations: ExtractionFinding[];
};

export type GroundModelDepthQualifier = z.infer<typeof groundModelDepthQualifierSchema>;

export type GroundModelUnitDepth = {
  unitName: string;
  weatheringNote: string | null;
  depthToBaseMeters: number | null;
  depthQualifier: GroundModelDepthQualifier;
  rawDepthText: string;
  citations: ExtractionCitation[];
};

export type GroundModelBorehole = {
  boreholeId: string;
  unitDepths: GroundModelUnitDepth[];
  citations: ExtractionCitation[];
};

export type GroundModelExtraction = {
  siteWideInterpretation: NullableExtractionFinding;
  boreholes: GroundModelBorehole[];
};

export type BatterSlopeTable = {
  tableLabel: string;
  pageLabel: string | null;
  rows: Array<{
    material: string | null;
    temporarySlope: string | null;
    permanentSlope: string | null;
    notes: string | null;
    assumptions: string | null;
    citations: ExtractionCitation[];
  }>;
};

export type SoilNailBondStressTable = {
  tableLabel: string;
  pageLabel: string | null;
  rows: Array<{
    material: string | null;
    allowableBondStressKPa: number | null;
    notes: string | null;
    assumptions: string | null;
    citations: ExtractionCitation[];
  }>;
};

export type RetainingWallPreliminaryParameters = {
  Ka: NullableNumericExtractionFinding;
  Kp: NullableNumericExtractionFinding;
  K0: NullableNumericExtractionFinding;
  bulkDensityKNm3: NullableNumericExtractionFinding;
  triangularPressureDistributionNotes: ExtractionFinding[];
  rectangularPressureExpression: NullableExtractionFinding;
  adjacentFootingPressureExpression: NullableExtractionFinding;
  hydrostaticDrainageNotes: ExtractionFinding[];
  compactionPressureKPa: NullableNumericExtractionFinding;
};

export type SiteClassificationExtraction = {
  classification: NullableExtractionFinding;
  estimatedGroundMovement: NullableExtractionFinding;
  notes: ExtractionFinding[];
};

export type EarthquakeSiteFactorExtraction = {
  siteSubsoilClass: NullableExtractionFinding;
  hazardFactorZ: NullableNumericExtractionFinding;
  notes: ExtractionFinding[];
};

export type PileConstructionExtraction = {
  suitableMethods: ExtractionFinding[];
  cautionsOrUnsuitableMethods: ExtractionFinding[];
  designVerificationNotes: ExtractionFinding[];
  constructionControls: ExtractionFinding[];
  testingRecommendations: ExtractionFinding[];
  upliftTensionNotes: ExtractionFinding[];
  settlementExpectations: ExtractionFinding[];
};

export type ShallowFoundationBearingTable = {
  tableLabel: string;
  pageLabel: string | null;
  rows: Array<{
    foundingMaterial: string | null;
    padOrSquareOrCircularAllowableKPa: number | null;
    stripAllowableKPa: number | null;
    notes: string | null;
    assumptions: string | null;
    factorOfSafety: number | null;
    minimumFoundingWidthM: number | null;
    minimumFoundingDepthM: number | null;
    toeOfCuttingGeometryAssumption: string | null;
    citations: ExtractionCitation[];
  }>;
  expectedSettlementRange: NullableExtractionFinding;
  differentialSettlementAssumption: NullableExtractionFinding;
  engineeredFillBearingPressures: {
    padOrSquareOrCircularAllowableKPa: number | null;
    stripAllowableKPa: number | null;
    notes: string | null;
    citations: ExtractionCitation[];
  } | null;
  footingInspectionRequirement: NullableExtractionFinding;
};

export type EngineeringReportExtractionResult = {
  extractionProfile: EngineeringReportExtractionProfile;
  documentFamily: NullableDocumentFamilyExtractionFinding;
  reportTitle: NullableExtractionFinding;
  projectSummary: NullableExtractionFinding;
  reportMetadata: ReportMetadataExtraction;
  investigationBasis: InvestigationBasisExtraction;
  groundwater: GroundwaterExtraction;
  reportSections: ReportSectionExtraction;
  groundModel: GroundModelExtraction;
  shallowFoundationBearingTable: ShallowFoundationBearingTable | null;
  batterSlopeTable: BatterSlopeTable | null;
  soilNailBondStressTable: SoilNailBondStressTable | null;
  retainingWallPreliminaryParameters: RetainingWallPreliminaryParameters;
  siteClassificationResult: SiteClassificationExtraction;
  earthquakeSiteFactor: EarthquakeSiteFactorExtraction;
  pileConstruction: PileConstructionExtraction;
  structuralDefaults: {
    concreteMentions: ExtractionFinding[];
    coverDurabilityMentions: ExtractionFinding[];
    reinforcementMentions: ExtractionFinding[];
  };
  geotechnicalBasis: {
    foundingNotes: ExtractionFinding[];
    groundwaterNotes: ExtractionFinding[];
    groundwaterDesignAssumptions: ExtractionFinding[];
    hydrostaticAssumptions: ExtractionFinding[];
    materialMentions: ExtractionFinding[];
    rockStrataDesignParameters: ExtractionFinding[];
    pileRecommendations: ExtractionFinding[];
    footingRecommendations: ExtractionFinding[];
    raftRecommendations: ExtractionFinding[];
    shoringRecommendations: ExtractionFinding[];
    aggressivityDurabilityNotes: ExtractionFinding[];
    furtherInvestigationNotes: ExtractionFinding[];
  };
  loadMentions: {
    loadCases: ExtractionFinding[];
    combinations: ExtractionFinding[];
  };
  geotechnicalCommentProfile: GeotechnicalCommentProfileExtraction;
  dewateringProfile: DewateringProfileExtraction;
  geotechnicalParameterTables: GeotechnicalParameterTable[];
  standardsMapping: StandardsMapping | null;
  citations: ExtractionCitation[];
};
