import type {
  NoiseVibrationCriterionRow,
  NoiseVibrationReceiverType,
  NoiseVibrationStandardSource,
  NoiseVibrationWorkType,
} from '@/features/standards/noise-vibration-types';

export const CNVMP_DOCUMENT_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'for_review', label: 'For review' },
  { value: 'issued', label: 'Issued' },
  { value: 'superseded', label: 'Superseded' },
] as const;

export const CNVMP_SELECTION_PURPOSE_OPTIONS = [
  { value: 'noise', label: 'Noise' },
  { value: 'vibration_human_comfort', label: 'Vibration human comfort' },
  { value: 'vibration_structural', label: 'Vibration structural' },
  { value: 'blasting', label: 'Blasting' },
  { value: 'time_definition', label: 'Time definition' },
  { value: 'other', label: 'Other' },
] as const;

export const CNVMP_ASSESSMENT_LOCATION_OPTIONS = [
  { value: 'property_boundary', label: 'Property boundary' },
  { value: 'internal', label: 'Internal' },
  { value: 'external', label: 'External' },
  { value: 'occupied_point', label: 'Occupied point' },
  { value: 'foundation', label: 'Foundation' },
  { value: 'uppermost_storey', label: 'Uppermost storey' },
  { value: 'any', label: 'Any' },
] as const;

export type CnvmpDocumentStatus = (typeof CNVMP_DOCUMENT_STATUS_OPTIONS)[number]['value'];
export type CnvmpSelectionPurpose = (typeof CNVMP_SELECTION_PURPOSE_OPTIONS)[number]['value'];
export type CnvmpAssessmentLocationBasis =
  (typeof CNVMP_ASSESSMENT_LOCATION_OPTIONS)[number]['value'];

export type CnvmpAiDocumentLink = {
  id: string;
  filename: string;
  documentFamily: string;
  reportType: string;
  ownerWorkspace: string;
  status: string;
  createdAt: string;
};

export type ProjectCnvmp = {
  id: string;
  projectId: string;
  title: string | null;
  revision: string | null;
  issueDate: string | null;
  preparedBy: string | null;
  checkedBy: string | null;
  purpose: string | null;
  documentStatus: string | null;
  client: string | null;
  projectName: string | null;
  projectAddress: string | null;
  projectDescription: string | null;
  scopeOfWorks: string | null;
  constructionActivitiesNote: string | null;
  standardHoursNote: string | null;
  outOfHoursNote: string | null;
  sensitiveReceiversNote: string | null;
  communityCommunicationNote: string | null;
  contactDetailsNote: string | null;
  complaintsHandlingNote: string | null;
  respiteCommunicationNote: string | null;
  assumptionsLimitations: string | null;
  createdAt: string;
  updatedAt: string;
  references: ProjectCnvmpReference[];
  receivers: ProjectCnvmpReceiver[];
  activities: ProjectCnvmpActivity[];
  selectedSources: ProjectCnvmpSelectedSource[];
  selectedCriteria: ProjectCnvmpSelectedCriterion[];
  mitigationRows: ProjectCnvmpMitigationMeasure[];
  monitoringRows: ProjectCnvmpMonitoringRow[];
};

export type ProjectCnvmpReference = {
  id: string;
  projectCnvmpId: string;
  projectReferenceId: string | null;
  aiDocumentId: string | null;
  label: string | null;
  note: string | null;
  sortOrder: number;
  aiDocument: CnvmpAiDocumentLink | null;
};

export type ProjectCnvmpReceiver = {
  id: string;
  projectCnvmpId: string;
  label: string;
  receiverType: NoiseVibrationReceiverType;
  locationDescription: string | null;
  distanceNote: string | null;
  sensitivityNote: string | null;
  usePeriodNote: string | null;
  isHeritage: boolean;
  isCritical: boolean;
  assessmentLocationBasis: CnvmpAssessmentLocationBasis | null;
  sortOrder: number;
};

export type ProjectCnvmpActivity = {
  id: string;
  projectCnvmpId: string;
  label: string;
  workType: NoiseVibrationWorkType;
  description: string | null;
  timingNote: string | null;
  isOutsideStandardHours: boolean;
  noiseRiskNote: string | null;
  vibrationRiskNote: string | null;
  sortOrder: number;
};

export type ProjectCnvmpSelectedSource = {
  id: string;
  projectCnvmpId: string;
  standardSourceId: string;
  isGuidanceOnly: boolean;
  isEnforceableOnThisProject: boolean;
  projectConditionReference: string | null;
  selectionNote: string | null;
  sortOrder: number;
  standardSource: NoiseVibrationStandardSource;
};

export type ProjectCnvmpSelectedCriterion = {
  id: string;
  projectCnvmpId: string;
  criterionRowId: string;
  selectionPurpose: CnvmpSelectionPurpose;
  isEnforceableOnThisProject: boolean;
  projectConditionReference: string | null;
  selectionNote: string | null;
  sortOrder: number;
  criterionRow: NoiseVibrationCriterionRow;
};

export type ProjectCnvmpMitigationMeasure = {
  id: string;
  projectCnvmpId: string;
  category: string;
  measure: string;
  triggerNote: string | null;
  responsibility: string | null;
  timingStage: string | null;
  note: string | null;
  sortOrder: number;
};

export type ProjectCnvmpMonitoringRow = {
  id: string;
  projectCnvmpId: string;
  parameter: string;
  method: string | null;
  location: string | null;
  frequency: string | null;
  triggerAction: string | null;
  responsibility: string | null;
  reportingNote: string | null;
  sortOrder: number;
};

export type ProjectCnvmpRootInput = Partial<
  Pick<
    ProjectCnvmp,
    | 'title'
    | 'revision'
    | 'issueDate'
    | 'preparedBy'
    | 'checkedBy'
    | 'purpose'
    | 'documentStatus'
    | 'projectDescription'
    | 'scopeOfWorks'
    | 'constructionActivitiesNote'
    | 'standardHoursNote'
    | 'outOfHoursNote'
    | 'sensitiveReceiversNote'
    | 'communityCommunicationNote'
    | 'contactDetailsNote'
    | 'complaintsHandlingNote'
    | 'respiteCommunicationNote'
    | 'assumptionsLimitations'
  >
>;

export type ProjectCnvmpReferenceInput = Partial<
  Pick<
    ProjectCnvmpReference,
    'projectReferenceId' | 'aiDocumentId' | 'label' | 'note' | 'sortOrder'
  >
>;

export type ProjectCnvmpReceiverInput = Partial<
  Pick<
    ProjectCnvmpReceiver,
    | 'label'
    | 'receiverType'
    | 'locationDescription'
    | 'distanceNote'
    | 'sensitivityNote'
    | 'usePeriodNote'
    | 'isHeritage'
    | 'isCritical'
    | 'assessmentLocationBasis'
    | 'sortOrder'
  >
>;

export type ProjectCnvmpActivityInput = Partial<
  Pick<
    ProjectCnvmpActivity,
    | 'label'
    | 'workType'
    | 'description'
    | 'timingNote'
    | 'isOutsideStandardHours'
    | 'noiseRiskNote'
    | 'vibrationRiskNote'
    | 'sortOrder'
  >
>;

export type ProjectCnvmpSelectedSourceInput = Partial<
  Pick<
    ProjectCnvmpSelectedSource,
    | 'standardSourceId'
    | 'isGuidanceOnly'
    | 'isEnforceableOnThisProject'
    | 'projectConditionReference'
    | 'selectionNote'
    | 'sortOrder'
  >
>;

export type ProjectCnvmpSelectedCriterionInput = Partial<
  Pick<
    ProjectCnvmpSelectedCriterion,
    | 'criterionRowId'
    | 'selectionPurpose'
    | 'isEnforceableOnThisProject'
    | 'projectConditionReference'
    | 'selectionNote'
    | 'sortOrder'
  >
>;

export type ProjectCnvmpMitigationMeasureInput = Partial<
  Pick<
    ProjectCnvmpMitigationMeasure,
    'category' | 'measure' | 'triggerNote' | 'responsibility' | 'timingStage' | 'note' | 'sortOrder'
  >
>;

export type ProjectCnvmpMonitoringRowInput = Partial<
  Pick<
    ProjectCnvmpMonitoringRow,
    | 'parameter'
    | 'method'
    | 'location'
    | 'frequency'
    | 'triggerAction'
    | 'responsibility'
    | 'reportingNote'
    | 'sortOrder'
  >
>;
