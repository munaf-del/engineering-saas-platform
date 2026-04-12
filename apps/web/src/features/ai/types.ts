export type AiDocumentKind = 'engineering_report';

export type AiDocumentFamily =
  | 'GEOTECHNICAL_REPORT'
  | 'PRELIMINARY_GEOTECHNICAL_INVESTIGATION'
  | 'GEOTECHNICAL_GROUNDWATER_REPORT'
  | 'PRELIMINARY_GEOTECHNICAL_GROUNDWATER_REPORT'
  | 'STRUCTURAL_REPORT'
  | 'COMBINED_ENGINEERING_REPORT'
  | 'OTHER_ENGINEERING_REPORT';

export type AiDocumentStatus =
  | 'uploaded_local'
  | 'indexing'
  | 'indexed'
  | 'extracting'
  | 'extracted'
  | 'index_failed'
  | 'extraction_failed';

export type AiExtractionRunStatus = 'pending' | 'completed' | 'failed';

export type AiReportDocumentFamily =
  | 'geotechnical'
  | 'environmental'
  | 'structural'
  | 'hydrogeology_dewatering'
  | 'inspections'
  | 'temporary_works'
  | 'other';

export type AiReportType =
  | 'geotechnical_investigation'
  | 'geotechnical_comment'
  | 'dewatering_management_plan'
  | 'contamination_assessment'
  | 'structural_design_report'
  | 'inspection_report'
  | 'temporary_works_report'
  | 'other';

export type AiReportOwnerWorkspace =
  | 'project'
  | 'project_geotechnical'
  | 'foundations'
  | 'structural'
  | 'environmental'
  | 'inspections'
  | 'other';

export type AiReportClassification = {
  documentFamily: AiReportDocumentFamily;
  reportType: AiReportType;
  ownerWorkspace: AiReportOwnerWorkspace;
};

export const AI_REPORT_DOCUMENT_FAMILY_OPTIONS = [
  { value: 'geotechnical', label: 'Geotechnical' },
  { value: 'hydrogeology_dewatering', label: 'Hydrogeology / Dewatering' },
  { value: 'environmental', label: 'Environmental' },
  { value: 'structural', label: 'Structural' },
  { value: 'inspections', label: 'Inspections' },
  { value: 'temporary_works', label: 'Temporary Works' },
  { value: 'other', label: 'Other' },
] as const satisfies ReadonlyArray<{ value: AiReportDocumentFamily; label: string }>;

export const AI_REPORT_TYPE_OPTIONS = [
  { value: 'geotechnical_investigation', label: 'Geotechnical Investigation' },
  { value: 'geotechnical_comment', label: 'Geotechnical Comment' },
  { value: 'dewatering_management_plan', label: 'Dewatering Management Plan' },
  { value: 'contamination_assessment', label: 'Contamination Assessment' },
  { value: 'structural_design_report', label: 'Structural Design Report' },
  { value: 'inspection_report', label: 'Inspection Report' },
  { value: 'temporary_works_report', label: 'Temporary Works Report' },
  { value: 'other', label: 'Other' },
] as const satisfies ReadonlyArray<{ value: AiReportType; label: string }>;

export const AI_REPORT_OWNER_WORKSPACE_OPTIONS = [
  { value: 'project', label: 'Project' },
  { value: 'project_geotechnical', label: 'Project Geotechnical' },
  { value: 'foundations', label: 'Foundations' },
  { value: 'structural', label: 'Structural' },
  { value: 'environmental', label: 'Environmental' },
  { value: 'inspections', label: 'Inspections' },
  { value: 'other', label: 'Other' },
] as const satisfies ReadonlyArray<{ value: AiReportOwnerWorkspace; label: string }>;

export const DEFAULT_AI_REPORT_CLASSIFICATION: AiReportClassification = {
  documentFamily: 'geotechnical',
  reportType: 'geotechnical_investigation',
  ownerWorkspace: 'project_geotechnical',
};

export type AiExtractionCitation = {
  id: string;
  fileId: string;
  filename: string;
  snippet: string;
  score: number;
  query: string | null;
  pageLabel: string | null;
};

export type AiExtractionFinding = {
  value: string;
  citations: AiExtractionCitation[];
};

export type AiGeotechnicalParameterTableType =
  | 'GEOLOGICAL_UNIT_PARAMETERS'
  | 'PILE_FOUNDING_PARAMETERS'
  | 'OTHER_GEOTECHNICAL_PARAMETERS';

export type AiStandardsUseTag =
  | 'compression'
  | 'uplift'
  | 'lateral'
  | 'durability'
  | 'testing';

export type AiGeotechnicalParameterTableRow = {
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
  citations: AiExtractionCitation[];
};

export type AiGeotechnicalParameterTable = {
  tableKey: string;
  tableLabel: string;
  pageLabel: string | null;
  tableType: AiGeotechnicalParameterTableType;
  rows: AiGeotechnicalParameterTableRow[];
};

export type AiStandardsClauseReference = {
  clause: string;
  title: string;
  summary: string;
};

export type AiStandardsParameterMapping = {
  extractedFieldPath: string;
  extractedValueLabel: string;
  possibleAs2159Concept: string;
  possibleAs2159Use: AiStandardsUseTag[];
  relatedClauses: string[];
  rationale: string;
  confidence: number;
};

export type AiStandardsMapping = {
  standard: 'AS2159_2009';
  relevantClauses: AiStandardsClauseReference[];
  parameterMappings: AiStandardsParameterMapping[];
  notes: string[];
};

export type AiNullableExtractionFinding = {
  value: string | null;
  citations: AiExtractionCitation[];
};

export type AiNullableNumericFinding = {
  value: number | null;
  citations: AiExtractionCitation[];
};

export type AiNullableDocumentFamilyFinding = {
  value: AiDocumentFamily | null;
  citations: AiExtractionCitation[];
};

export type AiReportMetadataExtraction = {
  projectNumber: AiNullableExtractionFinding;
  filename: AiNullableExtractionFinding;
  documentTitle: AiNullableExtractionFinding;
  siteAddress: AiNullableExtractionFinding;
  preparedFor: AiNullableExtractionFinding;
  revision: AiNullableExtractionFinding;
  status: AiNullableExtractionFinding;
  preparedBy: AiNullableExtractionFinding;
  reviewedBy: AiNullableExtractionFinding;
  dateIssued: AiNullableExtractionFinding;
  distributionIssuedTo: AiNullableExtractionFinding;
  authorSignOffDate: AiNullableExtractionFinding;
  reviewerSignOffDate: AiNullableExtractionFinding;
};

export type AiInvestigationBasisExtraction = {
  purposeScope: AiNullableExtractionFinding;
  numberOfBoreholes: AiNullableExtractionFinding;
  testLocationSummary: AiNullableExtractionFinding;
  targetDepthRule: AiNullableExtractionFinding;
  fieldworkDates: AiNullableExtractionFinding;
  investigationMethods: AiExtractionFinding[];
  laboratoryTestingSummary: AiExtractionFinding[];
  coordinateDatumReferences: AiExtractionFinding[];
  confidenceLimitations: AiExtractionFinding[];
};

export type AiGroundwaterExtraction = {
  observedConditions: AiExtractionFinding[];
  uncertaintyAndMonitoring: AiExtractionFinding[];
  constructionImplications: AiExtractionFinding[];
};

export type AiGeotechnicalCommentProfileExtraction = {
  changedItems: AiExtractionFinding[];
  unchangedItems: AiExtractionFinding[];
  revisedRecommendations: AiExtractionFinding[];
  affectedDrawingsRevisionsDates: AiExtractionFinding[];
  explicitNewDesignTablesOrParameters: AiExtractionFinding[];
};

export type AiDewateringProfileExtraction = {
  groundwaterObservations: AiExtractionFinding[];
  groundwaterLevels: AiExtractionFinding[];
  permeabilityHydraulicConductivity: AiExtractionFinding[];
  inflowRates: AiExtractionFinding[];
  drawdownEstimates: AiExtractionFinding[];
  aquiferWaterNswAipComplianceNotes: AiExtractionFinding[];
  neighbouringPropertySettlementEffects: AiExtractionFinding[];
  monitoringReportingRequirements: AiExtractionFinding[];
  keyAssumptionsLimitations: AiExtractionFinding[];
  piezometerMonitoringNetwork: AiExtractionFinding[];
  settlementDrawdownTriggerLevels: AiExtractionFinding[];
  waterNswLicenceBoreRegistration: AiExtractionFinding[];
  constructionStageApplicability: AiExtractionFinding[];
};

export type AiReportSectionsExtraction = {
  excavations: AiExtractionFinding[];
  batterSlopes: AiExtractionFinding[];
  soilNails: AiExtractionFinding[];
  retainingWalls: AiExtractionFinding[];
  fillMaterials: AiExtractionFinding[];
  siteClassification: AiExtractionFinding[];
  aggressivityDurability: AiExtractionFinding[];
  shallowFoundations: AiExtractionFinding[];
  deepFoundations: AiExtractionFinding[];
  raftSlab: AiExtractionFinding[];
  subgradePreparation: AiExtractionFinding[];
  drainageServiceInstallationSiteMaintenance: AiExtractionFinding[];
  earthquakeSiteFactor: AiExtractionFinding[];
  workingPlatform: AiExtractionFinding[];
  existingConditionsSurvey: AiExtractionFinding[];
  limitations: AiExtractionFinding[];
};

export type AiGroundModelUnitDepth = {
  unitName: string;
  weatheringNote: string | null;
  depthToBaseMeters: number | null;
  depthQualifier: 'EXACT' | 'MINIMUM' | 'NOT_ENCOUNTERED' | 'UNKNOWN';
  rawDepthText: string;
  citations: AiExtractionCitation[];
};

export type AiGroundModelBorehole = {
  boreholeId: string;
  unitDepths: AiGroundModelUnitDepth[];
  citations: AiExtractionCitation[];
};

export type AiGroundModelExtraction = {
  siteWideInterpretation: AiNullableExtractionFinding;
  boreholes: AiGroundModelBorehole[];
};

export type AiBatterSlopeTable = {
  tableLabel: string;
  pageLabel: string | null;
  rows: Array<{
    material: string | null;
    temporarySlope: string | null;
    permanentSlope: string | null;
    notes: string | null;
    assumptions: string | null;
    citations: AiExtractionCitation[];
  }>;
};

export type AiSoilNailBondStressTable = {
  tableLabel: string;
  pageLabel: string | null;
  rows: Array<{
    material: string | null;
    allowableBondStressKPa: number | null;
    notes: string | null;
    assumptions: string | null;
    citations: AiExtractionCitation[];
  }>;
};

export type AiRetainingWallPreliminaryParameters = {
  Ka: AiNullableNumericFinding;
  Kp: AiNullableNumericFinding;
  K0: AiNullableNumericFinding;
  bulkDensityKNm3: AiNullableNumericFinding;
  triangularPressureDistributionNotes: AiExtractionFinding[];
  rectangularPressureExpression: AiNullableExtractionFinding;
  adjacentFootingPressureExpression: AiNullableExtractionFinding;
  hydrostaticDrainageNotes: AiExtractionFinding[];
  compactionPressureKPa: AiNullableNumericFinding;
};

export type AiSiteClassificationExtraction = {
  classification: AiNullableExtractionFinding;
  estimatedGroundMovement: AiNullableExtractionFinding;
  notes: AiExtractionFinding[];
};

export type AiEarthquakeSiteFactorExtraction = {
  siteSubsoilClass: AiNullableExtractionFinding;
  hazardFactorZ: AiNullableNumericFinding;
  notes: AiExtractionFinding[];
};

export type AiPileConstructionExtraction = {
  suitableMethods: AiExtractionFinding[];
  cautionsOrUnsuitableMethods: AiExtractionFinding[];
  designVerificationNotes: AiExtractionFinding[];
  constructionControls: AiExtractionFinding[];
  testingRecommendations: AiExtractionFinding[];
  upliftTensionNotes: AiExtractionFinding[];
  settlementExpectations: AiExtractionFinding[];
};

export type AiShallowFoundationBearingTable = {
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
    citations: AiExtractionCitation[];
  }>;
  expectedSettlementRange: AiNullableExtractionFinding;
  differentialSettlementAssumption: AiNullableExtractionFinding;
  engineeredFillBearingPressures: {
    padOrSquareOrCircularAllowableKPa: number | null;
    stripAllowableKPa: number | null;
    notes: string | null;
    citations: AiExtractionCitation[];
  } | null;
  footingInspectionRequirement: AiNullableExtractionFinding;
};

export type AiEngineeringReportExtraction = {
  extractionProfile: AiReportClassification | null;
  documentFamily: AiNullableDocumentFamilyFinding;
  reportTitle: AiNullableExtractionFinding;
  projectSummary: AiNullableExtractionFinding;
  reportMetadata: AiReportMetadataExtraction;
  investigationBasis: AiInvestigationBasisExtraction;
  groundwater: AiGroundwaterExtraction;
  reportSections: AiReportSectionsExtraction;
  groundModel: AiGroundModelExtraction;
  shallowFoundationBearingTable: AiShallowFoundationBearingTable | null;
  batterSlopeTable: AiBatterSlopeTable | null;
  soilNailBondStressTable: AiSoilNailBondStressTable | null;
  retainingWallPreliminaryParameters: AiRetainingWallPreliminaryParameters;
  siteClassificationResult: AiSiteClassificationExtraction;
  earthquakeSiteFactor: AiEarthquakeSiteFactorExtraction;
  pileConstruction: AiPileConstructionExtraction;
  structuralDefaults: {
    concreteMentions: AiExtractionFinding[];
    coverDurabilityMentions: AiExtractionFinding[];
    reinforcementMentions: AiExtractionFinding[];
  };
  geotechnicalBasis: {
    foundingNotes: AiExtractionFinding[];
    groundwaterNotes: AiExtractionFinding[];
    groundwaterDesignAssumptions: AiExtractionFinding[];
    hydrostaticAssumptions: AiExtractionFinding[];
    materialMentions: AiExtractionFinding[];
    rockStrataDesignParameters: AiExtractionFinding[];
    pileRecommendations: AiExtractionFinding[];
    footingRecommendations: AiExtractionFinding[];
    raftRecommendations: AiExtractionFinding[];
    shoringRecommendations: AiExtractionFinding[];
    aggressivityDurabilityNotes: AiExtractionFinding[];
    furtherInvestigationNotes: AiExtractionFinding[];
  };
  loadMentions: {
    loadCases: AiExtractionFinding[];
    combinations: AiExtractionFinding[];
  };
  geotechnicalCommentProfile: AiGeotechnicalCommentProfileExtraction;
  dewateringProfile: AiDewateringProfileExtraction;
  geotechnicalParameterTables: AiGeotechnicalParameterTable[];
  standardsMapping: AiStandardsMapping | null;
  citations: AiExtractionCitation[];
};

type AiLegacyEngineeringReportExtraction = {
  documentType: AiNullableExtractionFinding;
  projectSummary: AiNullableExtractionFinding;
  structuralDefaults: {
    concreteMentions: AiExtractionFinding[];
    coverDurabilityMentions: AiExtractionFinding[];
    reinforcementMentions: AiExtractionFinding[];
  };
  geotechnicalBasis: {
    foundingNotes: AiExtractionFinding[];
    groundwaterNotes: AiExtractionFinding[];
    materialMentions: AiExtractionFinding[];
  };
  loadMentions: {
    loadCases: AiExtractionFinding[];
    combinations: AiExtractionFinding[];
  };
  citations: AiExtractionCitation[];
};

export type AiExtractionRun = {
  id: string;
  documentId: string;
  model: string;
  status: AiExtractionRunStatus;
  requestJson: Record<string, unknown>;
  resultJson: unknown;
  createdAt: string;
};

export type AiDocument = {
  id: string;
  projectId: string;
  pileGroupId: string | null;
  kind: AiDocumentKind;
  documentFamily?: AiReportDocumentFamily | null;
  reportType?: AiReportType | null;
  ownerWorkspace?: AiReportOwnerWorkspace | null;
  filename: string;
  mimeType: string;
  storagePath: string;
  openaiFileId: string | null;
  openaiVectorStoreId: string | null;
  status: AiDocumentStatus;
  createdAt: string;
  updatedAt: string;
  pileGroup?: {
    id: string;
    name: string;
  } | null;
  extractionRuns: AiExtractionRun[];
};

export function inferAiReportClassification(filename: string): AiReportClassification {
  const normalized = normalizeAiReportClassificationText(filename);

  if (
    /(dewater|groundwater|ground water|hydrogeolog|hydrostatic|water management)/.test(normalized)
  ) {
    return {
      documentFamily: 'hydrogeology_dewatering',
      reportType: 'dewatering_management_plan',
      ownerWorkspace: 'environmental',
    };
  }

  if (/(contamin|environmental|remediation|acid sulfate|asbestos)/.test(normalized)) {
    return {
      documentFamily: 'environmental',
      reportType: 'contamination_assessment',
      ownerWorkspace: 'environmental',
    };
  }

  if (/(structural|structure)/.test(normalized)) {
    return {
      documentFamily: 'structural',
      reportType: 'structural_design_report',
      ownerWorkspace: 'structural',
    };
  }

  if (/(inspection|site record|dilapidation|condition survey)/.test(normalized)) {
    return {
      documentFamily: 'inspections',
      reportType: 'inspection_report',
      ownerWorkspace: 'inspections',
    };
  }

  if (/(temporary works|temp works|working platform)/.test(normalized)) {
    return {
      documentFamily: 'temporary_works',
      reportType: 'temporary_works_report',
      ownerWorkspace: 'other',
    };
  }

  if (/(geotech|geo[ _-]*investigation|ground investigation|soil report)/.test(normalized)) {
    return {
      documentFamily: 'geotechnical',
      reportType: /(comment|letter|advice|memo)/.test(normalized)
        ? 'geotechnical_comment'
        : 'geotechnical_investigation',
      ownerWorkspace: 'project_geotechnical',
    };
  }

  return {
    documentFamily: 'other',
    reportType: 'other',
    ownerWorkspace: 'project',
  };
}

export function defaultAiReportClassificationForFamily(
  documentFamily: AiReportDocumentFamily,
): AiReportClassification {
  switch (documentFamily) {
    case 'geotechnical':
      return {
        documentFamily,
        reportType: 'geotechnical_investigation',
        ownerWorkspace: 'project_geotechnical',
      };
    case 'hydrogeology_dewatering':
      return {
        documentFamily,
        reportType: 'dewatering_management_plan',
        ownerWorkspace: 'environmental',
      };
    case 'environmental':
      return {
        documentFamily,
        reportType: 'contamination_assessment',
        ownerWorkspace: 'environmental',
      };
    case 'structural':
      return {
        documentFamily,
        reportType: 'structural_design_report',
        ownerWorkspace: 'structural',
      };
    case 'inspections':
      return {
        documentFamily,
        reportType: 'inspection_report',
        ownerWorkspace: 'inspections',
      };
    case 'temporary_works':
      return {
        documentFamily,
        reportType: 'temporary_works_report',
        ownerWorkspace: 'other',
      };
    case 'other':
    default:
      return {
        documentFamily: 'other',
        reportType: 'other',
        ownerWorkspace: 'project',
      };
  }
}

export function resolveAiReportClassification(
  document: Pick<AiDocument, 'documentFamily' | 'reportType' | 'ownerWorkspace' | 'filename'>,
): AiReportClassification {
  const inferred = inferAiReportClassification(document.filename);
  const documentFamily = isAiReportDocumentFamily(document.documentFamily)
    ? document.documentFamily
    : inferred.documentFamily;
  const familyDefault = defaultAiReportClassificationForFamily(documentFamily);

  return {
    documentFamily,
    reportType: isAiReportType(document.reportType) ? document.reportType : familyDefault.reportType,
    ownerWorkspace: isAiReportOwnerWorkspace(document.ownerWorkspace)
      ? document.ownerWorkspace
      : familyDefault.ownerWorkspace,
  };
}

export function formatAiReportDocumentFamily(value: AiReportDocumentFamily) {
  return labelForOption(AI_REPORT_DOCUMENT_FAMILY_OPTIONS, value);
}

export function formatAiReportType(value: AiReportType) {
  return labelForOption(AI_REPORT_TYPE_OPTIONS, value);
}

export function formatAiReportOwnerWorkspace(value: AiReportOwnerWorkspace) {
  return labelForOption(AI_REPORT_OWNER_WORKSPACE_OPTIONS, value);
}

function isAiReportDocumentFamily(
  value: string | null | undefined,
): value is AiReportDocumentFamily {
  return AI_REPORT_DOCUMENT_FAMILY_OPTIONS.some((option) => option.value === value);
}

function isAiReportType(value: string | null | undefined): value is AiReportType {
  return AI_REPORT_TYPE_OPTIONS.some((option) => option.value === value);
}

function isAiReportOwnerWorkspace(
  value: string | null | undefined,
): value is AiReportOwnerWorkspace {
  return AI_REPORT_OWNER_WORKSPACE_OPTIONS.some((option) => option.value === value);
}

function labelForOption<T extends string>(
  options: ReadonlyArray<{ value: T; label: string }>,
  value: T,
) {
  return options.find((option) => option.value === value)?.label ?? value.replace(/_/g, ' ');
}

function normalizeAiReportClassificationText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeAiExtractionProfile(value: unknown): AiReportClassification | null {
  const record = recordFromUnknown(value);
  const documentFamily = typeof record.documentFamily === 'string' ? record.documentFamily : null;
  const reportType = typeof record.reportType === 'string' ? record.reportType : null;
  const ownerWorkspace =
    typeof record.ownerWorkspace === 'string' ? record.ownerWorkspace : null;

  if (
    !isAiReportDocumentFamily(documentFamily) ||
    !isAiReportType(reportType) ||
    !isAiReportOwnerWorkspace(ownerWorkspace)
  ) {
    return null;
  }

  return { documentFamily, reportType, ownerWorkspace };
}

export function normalizeAiEngineeringReportExtraction(
  value: unknown,
): AiEngineeringReportExtraction | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  if (
    'documentFamily' in candidate &&
    'reportTitle' in candidate &&
    'projectSummary' in candidate &&
    'structuralDefaults' in candidate &&
    'geotechnicalBasis' in candidate &&
    'loadMentions' in candidate &&
    'citations' in candidate
  ) {
    const extraction = candidate as Partial<AiEngineeringReportExtraction>;
    return {
      ...(candidate as AiEngineeringReportExtraction),
      extractionProfile: normalizeAiExtractionProfile(extraction.extractionProfile),
      reportMetadata: extraction.reportMetadata ?? emptyReportMetadataExtraction(),
      investigationBasis: extraction.investigationBasis ?? emptyInvestigationBasisExtraction(),
      groundwater: extraction.groundwater ?? emptyGroundwaterExtraction(),
      reportSections: extraction.reportSections ?? emptyReportSectionsExtraction(),
      groundModel: extraction.groundModel ?? emptyGroundModelExtraction(),
      shallowFoundationBearingTable: extraction.shallowFoundationBearingTable ?? null,
      batterSlopeTable: extraction.batterSlopeTable ?? null,
      soilNailBondStressTable: extraction.soilNailBondStressTable ?? null,
      retainingWallPreliminaryParameters:
        extraction.retainingWallPreliminaryParameters ?? emptyRetainingWallPreliminaryParameters(),
      siteClassificationResult:
        extraction.siteClassificationResult ?? emptySiteClassificationExtraction(),
      earthquakeSiteFactor: extraction.earthquakeSiteFactor ?? emptyEarthquakeSiteFactorExtraction(),
      pileConstruction: extraction.pileConstruction ?? emptyPileConstructionExtraction(),
      geotechnicalCommentProfile: normalizeGeotechnicalCommentProfileExtraction(
        extraction.geotechnicalCommentProfile,
      ),
      dewateringProfile: normalizeDewateringProfileExtraction(extraction.dewateringProfile),
      geotechnicalParameterTables: extraction.geotechnicalParameterTables ?? [],
      standardsMapping: extraction.standardsMapping ?? null,
    };
  }

  if (
    'documentType' in candidate &&
    'projectSummary' in candidate &&
    'structuralDefaults' in candidate &&
    'geotechnicalBasis' in candidate &&
    'loadMentions' in candidate &&
    'citations' in candidate
  ) {
    const legacy = candidate as AiLegacyEngineeringReportExtraction;
    return {
      extractionProfile: null,
      documentFamily: {
        value: normalizeLegacyDocumentFamily(legacy.documentType.value),
        citations: legacy.documentType.citations,
      },
      reportTitle: legacy.documentType,
      projectSummary: legacy.projectSummary,
      reportMetadata: emptyReportMetadataExtraction(),
      investigationBasis: emptyInvestigationBasisExtraction(),
      groundwater: emptyGroundwaterExtraction(),
      reportSections: emptyReportSectionsExtraction(),
      groundModel: emptyGroundModelExtraction(),
      shallowFoundationBearingTable: null,
      batterSlopeTable: null,
      soilNailBondStressTable: null,
      retainingWallPreliminaryParameters: emptyRetainingWallPreliminaryParameters(),
      siteClassificationResult: emptySiteClassificationExtraction(),
      earthquakeSiteFactor: emptyEarthquakeSiteFactorExtraction(),
      pileConstruction: emptyPileConstructionExtraction(),
      structuralDefaults: legacy.structuralDefaults,
      geotechnicalBasis: {
        foundingNotes: legacy.geotechnicalBasis.foundingNotes,
        groundwaterNotes: legacy.geotechnicalBasis.groundwaterNotes,
        groundwaterDesignAssumptions: [],
        hydrostaticAssumptions: [],
        materialMentions: legacy.geotechnicalBasis.materialMentions,
        rockStrataDesignParameters: [],
        pileRecommendations: [],
        footingRecommendations: [],
        raftRecommendations: [],
        shoringRecommendations: [],
        aggressivityDurabilityNotes: [],
        furtherInvestigationNotes: [],
      },
      loadMentions: legacy.loadMentions,
      geotechnicalCommentProfile: emptyGeotechnicalCommentProfileExtraction(),
      dewateringProfile: emptyDewateringProfileExtraction(),
      geotechnicalParameterTables: [],
      standardsMapping: null,
      citations: legacy.citations.map((citation) => ({
        ...citation,
        pageLabel: citation.pageLabel ?? inferPageLabelFromSnippet(citation.snippet),
        query: citation.query ?? null,
      })),
    };
  }

  return null;
}

export function isAiEngineeringReportExtraction(value: unknown): value is AiEngineeringReportExtraction {
  return normalizeAiEngineeringReportExtraction(value) !== null;
}

export function isGeotechnicalDocumentFamily(family: AiDocumentFamily | null | undefined) {
  return (
    family === 'GEOTECHNICAL_REPORT' ||
    family === 'PRELIMINARY_GEOTECHNICAL_INVESTIGATION' ||
    family === 'GEOTECHNICAL_GROUNDWATER_REPORT' ||
    family === 'PRELIMINARY_GEOTECHNICAL_GROUNDWATER_REPORT'
  );
}

function normalizeLegacyDocumentFamily(value: string | null): AiDocumentFamily | null {
  if (!value) {
    return null;
  }

  const normalized = value.toLowerCase();
  if (normalized.includes('preliminary geotechnical') && normalized.includes('groundwater')) {
    return 'PRELIMINARY_GEOTECHNICAL_GROUNDWATER_REPORT';
  }
  if (normalized.includes('structural') && normalized.includes('geotechnical')) {
    return 'COMBINED_ENGINEERING_REPORT';
  }
  if (normalized.includes('groundwater')) {
    return 'GEOTECHNICAL_GROUNDWATER_REPORT';
  }
  if (normalized.includes('preliminary geotechnical')) {
    return 'PRELIMINARY_GEOTECHNICAL_INVESTIGATION';
  }
  if (normalized.includes('geotechnical')) {
    return 'GEOTECHNICAL_REPORT';
  }
  if (normalized.includes('structural')) {
    return 'STRUCTURAL_REPORT';
  }
  return 'OTHER_ENGINEERING_REPORT';
}

function inferPageLabelFromSnippet(snippet: string) {
  const match = snippet.match(/\bPage\s+\d+(?:\s+of\s+\d+)?\b/i);
  return match?.[0] ?? null;
}

function emptyNullableExtractionFinding(): AiNullableExtractionFinding {
  return { value: null, citations: [] };
}

function emptyNullableNumericFinding(): AiNullableNumericFinding {
  return { value: null, citations: [] };
}

function emptyReportMetadataExtraction(): AiReportMetadataExtraction {
  return {
    projectNumber: emptyNullableExtractionFinding(),
    filename: emptyNullableExtractionFinding(),
    documentTitle: emptyNullableExtractionFinding(),
    siteAddress: emptyNullableExtractionFinding(),
    preparedFor: emptyNullableExtractionFinding(),
    revision: emptyNullableExtractionFinding(),
    status: emptyNullableExtractionFinding(),
    preparedBy: emptyNullableExtractionFinding(),
    reviewedBy: emptyNullableExtractionFinding(),
    dateIssued: emptyNullableExtractionFinding(),
    distributionIssuedTo: emptyNullableExtractionFinding(),
    authorSignOffDate: emptyNullableExtractionFinding(),
    reviewerSignOffDate: emptyNullableExtractionFinding(),
  };
}

function emptyInvestigationBasisExtraction(): AiInvestigationBasisExtraction {
  return {
    purposeScope: emptyNullableExtractionFinding(),
    numberOfBoreholes: emptyNullableExtractionFinding(),
    testLocationSummary: emptyNullableExtractionFinding(),
    targetDepthRule: emptyNullableExtractionFinding(),
    fieldworkDates: emptyNullableExtractionFinding(),
    investigationMethods: [],
    laboratoryTestingSummary: [],
    coordinateDatumReferences: [],
    confidenceLimitations: [],
  };
}

function emptyGroundwaterExtraction(): AiGroundwaterExtraction {
  return {
    observedConditions: [],
    uncertaintyAndMonitoring: [],
    constructionImplications: [],
  };
}

function emptyGeotechnicalCommentProfileExtraction(): AiGeotechnicalCommentProfileExtraction {
  return {
    changedItems: [],
    unchangedItems: [],
    revisedRecommendations: [],
    affectedDrawingsRevisionsDates: [],
    explicitNewDesignTablesOrParameters: [],
  };
}

function emptyDewateringProfileExtraction(): AiDewateringProfileExtraction {
  return {
    groundwaterObservations: [],
    groundwaterLevels: [],
    permeabilityHydraulicConductivity: [],
    inflowRates: [],
    drawdownEstimates: [],
    aquiferWaterNswAipComplianceNotes: [],
    neighbouringPropertySettlementEffects: [],
    monitoringReportingRequirements: [],
    keyAssumptionsLimitations: [],
    piezometerMonitoringNetwork: [],
    settlementDrawdownTriggerLevels: [],
    waterNswLicenceBoreRegistration: [],
    constructionStageApplicability: [],
  };
}

function normalizeGeotechnicalCommentProfileExtraction(
  value: unknown,
): AiGeotechnicalCommentProfileExtraction {
  const record = recordFromUnknown(value);
  return {
    changedItems: normalizeFindingArray(record.changedItems),
    unchangedItems: normalizeFindingArray(record.unchangedItems),
    revisedRecommendations: normalizeFindingArray(record.revisedRecommendations),
    affectedDrawingsRevisionsDates: normalizeFindingArray(record.affectedDrawingsRevisionsDates),
    explicitNewDesignTablesOrParameters: normalizeFindingArray(
      record.explicitNewDesignTablesOrParameters,
    ),
  };
}

function normalizeDewateringProfileExtraction(value: unknown): AiDewateringProfileExtraction {
  const record = recordFromUnknown(value);
  return {
    groundwaterObservations: normalizeFindingArray(record.groundwaterObservations),
    groundwaterLevels: normalizeFindingArray(record.groundwaterLevels),
    permeabilityHydraulicConductivity: normalizeFindingArray(
      record.permeabilityHydraulicConductivity,
    ),
    inflowRates: normalizeFindingArray(record.inflowRates),
    drawdownEstimates: normalizeFindingArray(record.drawdownEstimates),
    aquiferWaterNswAipComplianceNotes: normalizeFindingArray(
      record.aquiferWaterNswAipComplianceNotes,
    ),
    neighbouringPropertySettlementEffects: normalizeFindingArray(
      record.neighbouringPropertySettlementEffects,
    ),
    monitoringReportingRequirements: normalizeFindingArray(record.monitoringReportingRequirements),
    keyAssumptionsLimitations: normalizeFindingArray(record.keyAssumptionsLimitations),
    piezometerMonitoringNetwork: normalizeFindingArray(record.piezometerMonitoringNetwork),
    settlementDrawdownTriggerLevels: normalizeFindingArray(record.settlementDrawdownTriggerLevels),
    waterNswLicenceBoreRegistration: normalizeFindingArray(record.waterNswLicenceBoreRegistration),
    constructionStageApplicability: normalizeFindingArray(record.constructionStageApplicability),
  };
}

function normalizeFindingArray(value: unknown): AiExtractionFinding[] {
  return Array.isArray(value) ? (value as AiExtractionFinding[]) : [];
}

function recordFromUnknown(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function emptyReportSectionsExtraction(): AiReportSectionsExtraction {
  return {
    excavations: [],
    batterSlopes: [],
    soilNails: [],
    retainingWalls: [],
    fillMaterials: [],
    siteClassification: [],
    aggressivityDurability: [],
    shallowFoundations: [],
    deepFoundations: [],
    raftSlab: [],
    subgradePreparation: [],
    drainageServiceInstallationSiteMaintenance: [],
    earthquakeSiteFactor: [],
    workingPlatform: [],
    existingConditionsSurvey: [],
    limitations: [],
  };
}

function emptyGroundModelExtraction(): AiGroundModelExtraction {
  return {
    siteWideInterpretation: emptyNullableExtractionFinding(),
    boreholes: [],
  };
}

function emptyRetainingWallPreliminaryParameters(): AiRetainingWallPreliminaryParameters {
  return {
    Ka: emptyNullableNumericFinding(),
    Kp: emptyNullableNumericFinding(),
    K0: emptyNullableNumericFinding(),
    bulkDensityKNm3: emptyNullableNumericFinding(),
    triangularPressureDistributionNotes: [],
    rectangularPressureExpression: emptyNullableExtractionFinding(),
    adjacentFootingPressureExpression: emptyNullableExtractionFinding(),
    hydrostaticDrainageNotes: [],
    compactionPressureKPa: emptyNullableNumericFinding(),
  };
}

function emptySiteClassificationExtraction(): AiSiteClassificationExtraction {
  return {
    classification: emptyNullableExtractionFinding(),
    estimatedGroundMovement: emptyNullableExtractionFinding(),
    notes: [],
  };
}

function emptyEarthquakeSiteFactorExtraction(): AiEarthquakeSiteFactorExtraction {
  return {
    siteSubsoilClass: emptyNullableExtractionFinding(),
    hazardFactorZ: emptyNullableNumericFinding(),
    notes: [],
  };
}

function emptyPileConstructionExtraction(): AiPileConstructionExtraction {
  return {
    suitableMethods: [],
    cautionsOrUnsuitableMethods: [],
    designVerificationNotes: [],
    constructionControls: [],
    testingRecommendations: [],
    upliftTensionNotes: [],
    settlementExpectations: [],
  };
}
