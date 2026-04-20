export const WASTE_CLASS_OPTIONS = [
  { value: 'special_waste', label: 'Special waste' },
  { value: 'liquid_waste', label: 'Liquid waste' },
  { value: 'hazardous_waste', label: 'Hazardous waste' },
  { value: 'restricted_solid_waste', label: 'Restricted solid waste' },
  { value: 'general_solid_putrescible', label: 'General solid waste (putrescible)' },
  { value: 'general_solid_non_putrescible', label: 'General solid waste (non-putrescible)' },
  { value: 'not_yet_classified', label: 'Not yet classified' },
] as const;

export const WASTE_CLASSIFICATION_REFERENCE_TYPE_OPTIONS = [
  { value: 'epa_guideline', label: 'EPA guideline' },
  { value: 'project_reference', label: 'Project reference' },
  { value: 'ai_report', label: 'AI report' },
  { value: 'lab_report', label: 'Lab report' },
  { value: 'other', label: 'Other' },
] as const;

export const WASTE_CLASSIFICATION_STEP_CODE_OPTIONS = [
  { value: 'step_1_special_waste', label: 'Step 1: Special waste' },
  { value: 'step_2_liquid_waste', label: 'Step 2: Liquid waste' },
  { value: 'step_3_preclassified', label: 'Step 3: Pre-classified waste' },
  { value: 'step_4_hazardous_characteristics', label: 'Step 4: Hazardous characteristics' },
  { value: 'step_5_chemical_assessment', label: 'Step 5: Chemical assessment' },
  { value: 'step_6_putrescible', label: 'Step 6: Putrescible classification' },
] as const;

export const WASTE_CLASSIFICATION_OUTCOME_STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not started' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'requires_assessment', label: 'Requires assessment' },
  { value: 'complete', label: 'Complete' },
] as const;

export const WASTE_CLASSIFICATION_PATHWAY_CODE_OPTIONS = [
  { value: 'part_2_immobilisation', label: 'Part 2: Immobilisation of waste' },
  { value: 'part_3_radioactive_material', label: 'Part 3: Waste containing radioactive material' },
  { value: 'part_4_acid_sulfate_soils', label: 'Part 4: Acid sulfate soils' },
  { value: 'addendum_part_1', label: 'Addendum to Part 1' },
] as const;

export const WASTE_CLASSIFICATION_MATERIAL_PATHWAY_CODE_OPTIONS = [
  { value: 'venm', label: 'VENM' },
  { value: 'enm', label: 'ENM' },
  { value: 'acid_sulfate_soils', label: 'Acid Sulfate Soils' },
] as const;

export const WASTE_CLASSIFICATION_MATERIAL_PATHWAY_OUTCOME_OPTIONS = [
  { value: 'not_assessed', label: 'Not assessed' },
  { value: 'qualifies', label: 'Qualifies' },
  { value: 'does_not_qualify', label: 'Does not qualify' },
  { value: 'requires_further_assessment', label: 'Requires further assessment' },
] as const;

export const ACID_SULFATE_SOIL_CLASS_OPTIONS = [
  { value: 'class_1', label: 'Class 1' },
  { value: 'class_2', label: 'Class 2' },
  { value: 'class_3', label: 'Class 3' },
  { value: 'class_4', label: 'Class 4' },
  { value: 'class_5', label: 'Class 5' },
  { value: 'not_mapped_unknown', label: 'Not mapped / unknown' },
] as const;

export type ProjectWasteClass = (typeof WASTE_CLASS_OPTIONS)[number]['value'];
export type ProjectWasteClassificationReferenceType =
  (typeof WASTE_CLASSIFICATION_REFERENCE_TYPE_OPTIONS)[number]['value'];
export type ProjectWasteClassificationStepCode =
  (typeof WASTE_CLASSIFICATION_STEP_CODE_OPTIONS)[number]['value'];
export type ProjectWasteClassificationOutcomeStatus =
  (typeof WASTE_CLASSIFICATION_OUTCOME_STATUS_OPTIONS)[number]['value'];
export type ProjectWasteClassificationPathwayCode =
  (typeof WASTE_CLASSIFICATION_PATHWAY_CODE_OPTIONS)[number]['value'];
export type ProjectWasteClassificationMaterialPathwayCode =
  (typeof WASTE_CLASSIFICATION_MATERIAL_PATHWAY_CODE_OPTIONS)[number]['value'];
export type ProjectWasteClassificationMaterialPathwayOutcomeStatus =
  (typeof WASTE_CLASSIFICATION_MATERIAL_PATHWAY_OUTCOME_OPTIONS)[number]['value'];
export type ProjectWasteClassificationAcidSulfateSoilClass =
  (typeof ACID_SULFATE_SOIL_CLASS_OPTIONS)[number]['value'];

export type WasteClassificationAiDocumentLink = {
  id: string;
  filename: string;
  documentFamily: string;
  reportType: string;
  ownerWorkspace: string;
  status: string;
  createdAt: string;
};

export type ProjectWasteClassificationReportSummary = {
  id: string;
  projectId: string;
  title: string | null;
  revision: string | null;
  issueDate: string | null;
  documentStatus: string | null;
  finalWasteClass: ProjectWasteClass;
  createdAt: string;
  updatedAt: string;
  _count: {
    references: number;
    stepDecisions: number;
    labResults: number;
    recommendations: number;
  };
};

export type ProjectWasteClassificationReference = {
  id: string;
  reportId: string;
  referenceType: ProjectWasteClassificationReferenceType;
  title: string;
  sourceUrl: string | null;
  projectReferenceId: string | null;
  aiDocumentId: string | null;
  note: string | null;
  isPrefilled: boolean;
  isIncluded: boolean;
  sortOrder: number;
  aiDocument: WasteClassificationAiDocumentLink | null;
};

export type ProjectWasteClassificationChecklistItem = {
  id: string;
  stepDecisionId: string;
  label: string;
  isChecked: boolean;
  note: string | null;
  sortOrder: number;
};

export type ProjectWasteClassificationStepDecision = {
  id: string;
  reportId: string;
  stepCode: ProjectWasteClassificationStepCode;
  stepTitle: string;
  outcomeStatus: ProjectWasteClassificationOutcomeStatus;
  classificationReached: boolean;
  resultingWasteClass: ProjectWasteClass | null;
  decisionSummary: string | null;
  detailedReasoning: string | null;
  isApplicable: boolean;
  sortOrder: number;
  checklistItems: ProjectWasteClassificationChecklistItem[];
};

export type ProjectWasteClassificationLabResult = {
  id: string;
  reportId: string;
  contaminant: string;
  sampleId: string | null;
  analyticalMethod: string | null;
  sccMgKg: string | null;
  tclpMgL: string | null;
  thresholdReferenceNote: string | null;
  resultInterpretation: string | null;
  sortOrder: number;
};

export type ProjectWasteClassificationRecommendation = {
  id: string;
  reportId: string;
  category: string;
  recommendation: string;
  priority: string | null;
  responsibility: string | null;
  timingNote: string | null;
  sortOrder: number;
};

export type ProjectWasteClassificationMaterialPathwayChecklistItem = {
  id: string;
  materialPathwayId: string;
  label: string;
  isChecked: boolean;
  note: string | null;
  sortOrder: number;
};

export type ProjectWasteClassificationMaterialPathway = {
  id: string;
  reportId: string;
  pathwayCode: ProjectWasteClassificationMaterialPathwayCode;
  title: string;
  isRelevant: boolean;
  outcomeStatus: ProjectWasteClassificationMaterialPathwayOutcomeStatus;
  testingNote: string | null;
  supportingReasoning: string | null;
  linkedReferenceId: string | null;
  assClass: ProjectWasteClassificationAcidSulfateSoilClass | null;
  assClassSource: string | null;
  projectLocationNote: string | null;
  treatmentManagementNote: string | null;
  step5ChemicalAssessmentApplies: boolean | null;
  assOrderRelevant: boolean | null;
  assExemptionRelevant: boolean | null;
  orderExemptionNote: string | null;
  sortOrder: number;
  checklistItems: ProjectWasteClassificationMaterialPathwayChecklistItem[];
  linkedReference: {
    id: string;
    title: string;
    referenceType: ProjectWasteClassificationReferenceType;
    sourceUrl: string | null;
    isIncluded: boolean;
  } | null;
};

export type ProjectWasteClassificationRelatedPathway = {
  id: string;
  reportId: string;
  pathwayCode: ProjectWasteClassificationPathwayCode;
  title: string;
  isRelevant: boolean;
  summaryNote: string | null;
  linkedReferenceId: string | null;
  resultingAction: string | null;
  sortOrder: number;
  linkedReference: {
    id: string;
    title: string;
    referenceType: ProjectWasteClassificationReferenceType;
    sourceUrl: string | null;
    isIncluded: boolean;
  } | null;
};

export type ProjectWasteClassificationReport = {
  id: string;
  projectId: string;
  title: string | null;
  revision: string | null;
  issueDate: string | null;
  documentStatus: string | null;
  preparedBy: string | null;
  checkedBy: string | null;
  purpose: string | null;
  wasteStreamName: string | null;
  wasteSourceOrigin: string | null;
  wasteDescription: string | null;
  samplingDate: string | null;
  quantityEstimate: string | null;
  proposedReceivingFacilityNote: string | null;
  executiveSummary: string | null;
  finalWasteClass: ProjectWasteClass;
  finalClassificationReasoning: string | null;
  managementRecommendation: string | null;
  assumptionsLimitations: string | null;
  createdAt: string;
  updatedAt: string;
  references: ProjectWasteClassificationReference[];
  stepDecisions: ProjectWasteClassificationStepDecision[];
  labResults: ProjectWasteClassificationLabResult[];
  recommendations: ProjectWasteClassificationRecommendation[];
  materialPathways: ProjectWasteClassificationMaterialPathway[];
  relatedPathways: ProjectWasteClassificationRelatedPathway[];
};

export type ProjectWasteClassificationAssAutofillResult = {
  assClass: ProjectWasteClassificationAcidSulfateSoilClass;
  assClassSource: string;
  projectLocationNote: string | null;
  detectionMethod:
    | 'spatial_site_boundary'
    | 'spatial_parcel_boundary'
    | 'project_coordinates'
    | 'project_address_geocode'
    | 'fallback';
  matchedPlanningPortalClass: string | null;
};

export type ProjectWasteClassificationDraftRecommendation = {
  finalWasteClass: ProjectWasteClass;
  summary: string;
  disclaimer: string;
  recommendationRow: {
    category: string;
    recommendation: string;
    priority: string;
    responsibility: string;
    timingNote: string;
  };
  authoredManagementRecommendationPresent: boolean;
};

export type ProjectWasteClassificationDraftSuggestionField =
  | 'wasteStreamName'
  | 'wasteSourceOrigin'
  | 'wasteDescription'
  | 'samplingDate'
  | 'executiveSummary'
  | 'finalClassificationReasoning'
  | 'managementRecommendation';

export type ProjectWasteClassificationDraftSuggestion = {
  id: string;
  field: ProjectWasteClassificationDraftSuggestionField;
  label: string;
  suggestedValue: string;
  sourceType: 'project_reference' | 'ai_document' | 'lab_result';
  sourceLabel: string;
  rationale: string;
};

export type ProjectWasteClassificationReportCreateInput = {
  title?: string | null;
};

export type DeleteWasteClassificationReportResult = {
  id: string;
  deleted: boolean;
};

export type ProjectWasteClassificationReportRootInput = Partial<
  Pick<
    ProjectWasteClassificationReport,
    | 'title'
    | 'revision'
    | 'issueDate'
    | 'documentStatus'
    | 'preparedBy'
    | 'checkedBy'
    | 'purpose'
    | 'wasteStreamName'
    | 'wasteSourceOrigin'
    | 'wasteDescription'
    | 'samplingDate'
    | 'quantityEstimate'
    | 'proposedReceivingFacilityNote'
    | 'executiveSummary'
    | 'finalWasteClass'
    | 'finalClassificationReasoning'
    | 'managementRecommendation'
    | 'assumptionsLimitations'
  >
>;

export type ProjectWasteClassificationReferenceInput = Partial<
  Pick<
    ProjectWasteClassificationReference,
    | 'referenceType'
    | 'title'
    | 'sourceUrl'
    | 'projectReferenceId'
    | 'aiDocumentId'
    | 'note'
    | 'isPrefilled'
    | 'isIncluded'
    | 'sortOrder'
  >
>;

export type ProjectWasteClassificationStepDecisionInput = Partial<
  Pick<
    ProjectWasteClassificationStepDecision,
    | 'stepCode'
    | 'stepTitle'
    | 'outcomeStatus'
    | 'classificationReached'
    | 'resultingWasteClass'
    | 'decisionSummary'
    | 'detailedReasoning'
    | 'isApplicable'
    | 'sortOrder'
  >
>;

export type ProjectWasteClassificationChecklistItemInput = Partial<
  Pick<ProjectWasteClassificationChecklistItem, 'label' | 'isChecked' | 'note' | 'sortOrder'>
>;

export type ProjectWasteClassificationLabResultInput = Partial<
  Pick<
    ProjectWasteClassificationLabResult,
    | 'contaminant'
    | 'sampleId'
    | 'analyticalMethod'
    | 'sccMgKg'
    | 'tclpMgL'
    | 'thresholdReferenceNote'
    | 'resultInterpretation'
    | 'sortOrder'
  >
>;

export type ProjectWasteClassificationRecommendationInput = Partial<
  Pick<
    ProjectWasteClassificationRecommendation,
    'category' | 'recommendation' | 'priority' | 'responsibility' | 'timingNote' | 'sortOrder'
  >
>;

export type ProjectWasteClassificationMaterialPathwayChecklistItemInput = Partial<
  Pick<
    ProjectWasteClassificationMaterialPathwayChecklistItem,
    'id' | 'label' | 'isChecked' | 'note' | 'sortOrder'
  >
>;

export type ProjectWasteClassificationMaterialPathwayInput = Partial<
  Pick<
    ProjectWasteClassificationMaterialPathway,
    | 'pathwayCode'
    | 'title'
    | 'isRelevant'
    | 'outcomeStatus'
    | 'testingNote'
    | 'supportingReasoning'
    | 'linkedReferenceId'
    | 'assClass'
    | 'assClassSource'
    | 'projectLocationNote'
    | 'treatmentManagementNote'
    | 'step5ChemicalAssessmentApplies'
    | 'assOrderRelevant'
    | 'assExemptionRelevant'
    | 'orderExemptionNote'
    | 'sortOrder'
  >
> & {
  checklistItems?: ProjectWasteClassificationMaterialPathwayChecklistItemInput[];
};

export type ProjectWasteClassificationRelatedPathwayInput = Partial<
  Pick<
    ProjectWasteClassificationRelatedPathway,
    | 'pathwayCode'
    | 'title'
    | 'isRelevant'
    | 'summaryNote'
    | 'linkedReferenceId'
    | 'resultingAction'
    | 'sortOrder'
  >
>;
