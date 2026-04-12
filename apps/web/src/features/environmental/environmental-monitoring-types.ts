import type {
  NoiseVibrationCriterionRow,
  NoiseVibrationReceiverType,
} from '@/features/standards/noise-vibration-types';

export const ENVIRONMENTAL_MONITORING_REPORT_TYPE_OPTIONS = [
  { value: 'noise_monitoring', label: 'Noise Monitoring Report' },
  { value: 'vibration_monitoring', label: 'Vibration Monitoring Report' },
] as const;

export const ENVIRONMENTAL_MONITORING_SELECTION_PURPOSE_OPTIONS = [
  { value: 'noise', label: 'Noise' },
  { value: 'vibration_human_comfort', label: 'Vibration human comfort' },
  { value: 'vibration_structural', label: 'Vibration structural' },
  { value: 'blasting', label: 'Blasting' },
  { value: 'time_definition', label: 'Time definition' },
  { value: 'other', label: 'Other' },
] as const;

export const ENVIRONMENTAL_MONITORING_ASSESSMENT_LOCATION_OPTIONS = [
  { value: 'property_boundary', label: 'Property boundary' },
  { value: 'internal', label: 'Internal' },
  { value: 'external', label: 'External' },
  { value: 'occupied_point', label: 'Occupied point' },
  { value: 'foundation', label: 'Foundation' },
  { value: 'uppermost_storey', label: 'Uppermost storey' },
  { value: 'any', label: 'Any' },
] as const;

export const ENVIRONMENTAL_MONITORING_COMPLIANCE_STATUS_OPTIONS = [
  { value: 'not_assessed', label: 'Not assessed' },
  { value: 'complies', label: 'Complies' },
  { value: 'exceeds', label: 'Exceeds' },
  { value: 'review_required', label: 'Review required' },
] as const;

export const ENVIRONMENTAL_MONITORING_METRIC_TYPE_OPTIONS = [
  { value: 'ppv', label: 'PPV' },
  { value: 'vdv', label: 'VDV' },
  { value: 'lin_peak', label: 'Lin Peak' },
  { value: 'other', label: 'Other' },
] as const;

export type EnvironmentalMonitoringReportType =
  (typeof ENVIRONMENTAL_MONITORING_REPORT_TYPE_OPTIONS)[number]['value'];
export type EnvironmentalMonitoringSelectionPurpose =
  (typeof ENVIRONMENTAL_MONITORING_SELECTION_PURPOSE_OPTIONS)[number]['value'];
export type EnvironmentalMonitoringAssessmentLocationBasis =
  (typeof ENVIRONMENTAL_MONITORING_ASSESSMENT_LOCATION_OPTIONS)[number]['value'];
export type EnvironmentalMonitoringComplianceStatus =
  (typeof ENVIRONMENTAL_MONITORING_COMPLIANCE_STATUS_OPTIONS)[number]['value'];
export type EnvironmentalMonitoringMetricType =
  (typeof ENVIRONMENTAL_MONITORING_METRIC_TYPE_OPTIONS)[number]['value'];

export type EnvironmentalMonitoringAiDocumentLink = {
  id: string;
  filename: string;
  documentFamily: string;
  reportType: string;
  ownerWorkspace: string;
  status: string;
  createdAt: string;
};

export type EnvironmentalMonitoringReportSummary = {
  id: string;
  projectId: string;
  reportType: EnvironmentalMonitoringReportType;
  title: string | null;
  revision: string | null;
  issueDate: string | null;
  documentStatus: string | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    locations: number;
    selectedCriteria: number;
    noiseResults: number;
    vibrationResults: number;
    recommendations: number;
  };
};

export type ProjectEnvironmentalMonitoringReport = {
  id: string;
  projectId: string;
  reportType: EnvironmentalMonitoringReportType;
  title: string | null;
  revision: string | null;
  issueDate: string | null;
  documentStatus: string | null;
  preparedBy: string | null;
  checkedBy: string | null;
  purpose: string | null;
  monitoringDate: string | null;
  monitoringWindowStart: string | null;
  monitoringWindowEnd: string | null;
  weatherConditions: string | null;
  siteActivitySummary: string | null;
  executiveSummary: string | null;
  generalObservations: string | null;
  conclusion: string | null;
  recommendationsSummary: string | null;
  assumptionsLimitations: string | null;
  createdAt: string;
  updatedAt: string;
  references: ProjectEnvironmentalMonitoringReference[];
  locations: ProjectEnvironmentalMonitoringLocation[];
  selectedCriteria: ProjectEnvironmentalMonitoringSelectedCriterion[];
  noiseResults: ProjectEnvironmentalNoiseResultRow[];
  vibrationResults: ProjectEnvironmentalVibrationResultRow[];
  observations: ProjectEnvironmentalMonitoringObservation[];
  recommendations: ProjectEnvironmentalMonitoringRecommendation[];
};

export type ProjectEnvironmentalMonitoringReference = {
  id: string;
  monitoringReportId: string;
  projectReferenceId: string | null;
  aiDocumentId: string | null;
  label: string | null;
  note: string | null;
  sortOrder: number;
  aiDocument: EnvironmentalMonitoringAiDocumentLink | null;
};

export type ProjectEnvironmentalMonitoringLocation = {
  id: string;
  monitoringReportId: string;
  label: string;
  receiverType: NoiseVibrationReceiverType;
  locationDescription: string | null;
  distanceNote: string | null;
  chainageNote: string | null;
  coordinatesNote: string | null;
  assessmentLocationBasis: EnvironmentalMonitoringAssessmentLocationBasis | null;
  sortOrder: number;
};

export type ProjectEnvironmentalMonitoringSelectedCriterion = {
  id: string;
  monitoringReportId: string;
  criterionRowId: string;
  selectionPurpose: EnvironmentalMonitoringSelectionPurpose;
  isEnforceableOnThisProject: boolean;
  projectConditionReference: string | null;
  selectionNote: string | null;
  sortOrder: number;
  criterionRow: NoiseVibrationCriterionRow;
};

export type ProjectEnvironmentalNoiseResultRow = {
  id: string;
  monitoringReportId: string;
  locationId: string | null;
  observedAt: string | null;
  activityLabel: string;
  instrumentNote: string | null;
  measurementPeriodNote: string | null;
  laeq15min: string | null;
  lamax: string | null;
  laf1_1min: string | null;
  backgroundNote: string | null;
  criterionRowId: string | null;
  complianceStatus: EnvironmentalMonitoringComplianceStatus;
  resultNote: string | null;
  sortOrder: number;
  location: { id: string; label: string } | null;
  criterionRow: NoiseVibrationCriterionRow | null;
};

export type ProjectEnvironmentalVibrationResultRow = {
  id: string;
  monitoringReportId: string;
  locationId: string | null;
  observedAt: string | null;
  activityLabel: string;
  instrumentNote: string | null;
  metricType: EnvironmentalMonitoringMetricType;
  ppvValue: string | null;
  vdvValue: string | null;
  linPeakValue: string | null;
  dominantFrequencyHz: string | null;
  axisNote: string | null;
  criterionRowId: string | null;
  complianceStatus: EnvironmentalMonitoringComplianceStatus;
  resultNote: string | null;
  sortOrder: number;
  location: { id: string; label: string } | null;
  criterionRow: NoiseVibrationCriterionRow | null;
};

export type ProjectEnvironmentalMonitoringObservation = {
  id: string;
  monitoringReportId: string;
  category: string;
  observation: string;
  implicationNote: string | null;
  sortOrder: number;
};

export type ProjectEnvironmentalMonitoringRecommendation = {
  id: string;
  monitoringReportId: string;
  category: string;
  recommendation: string;
  priority: string | null;
  responsibility: string | null;
  timingNote: string | null;
  sortOrder: number;
};

export type ProjectEnvironmentalMonitoringReportCreateInput = {
  reportType: EnvironmentalMonitoringReportType;
  title?: string | null;
};

export type ProjectEnvironmentalMonitoringReportRootInput = Partial<
  Pick<
    ProjectEnvironmentalMonitoringReport,
    | 'title'
    | 'revision'
    | 'issueDate'
    | 'documentStatus'
    | 'preparedBy'
    | 'checkedBy'
    | 'purpose'
    | 'monitoringDate'
    | 'monitoringWindowStart'
    | 'monitoringWindowEnd'
    | 'weatherConditions'
    | 'siteActivitySummary'
    | 'executiveSummary'
    | 'generalObservations'
    | 'conclusion'
    | 'recommendationsSummary'
    | 'assumptionsLimitations'
  >
>;

export type ProjectEnvironmentalMonitoringReferenceInput = Partial<
  Pick<
    ProjectEnvironmentalMonitoringReference,
    'projectReferenceId' | 'aiDocumentId' | 'label' | 'note' | 'sortOrder'
  >
>;

export type ProjectEnvironmentalMonitoringLocationInput = Partial<
  Pick<
    ProjectEnvironmentalMonitoringLocation,
    | 'label'
    | 'receiverType'
    | 'locationDescription'
    | 'distanceNote'
    | 'chainageNote'
    | 'coordinatesNote'
    | 'assessmentLocationBasis'
    | 'sortOrder'
  >
>;

export type ProjectEnvironmentalMonitoringSelectedCriterionInput = Partial<
  Pick<
    ProjectEnvironmentalMonitoringSelectedCriterion,
    | 'criterionRowId'
    | 'selectionPurpose'
    | 'isEnforceableOnThisProject'
    | 'projectConditionReference'
    | 'selectionNote'
    | 'sortOrder'
  >
>;

export type ProjectEnvironmentalNoiseResultRowInput = Partial<
  Pick<
    ProjectEnvironmentalNoiseResultRow,
    | 'locationId'
    | 'observedAt'
    | 'activityLabel'
    | 'instrumentNote'
    | 'measurementPeriodNote'
    | 'laeq15min'
    | 'lamax'
    | 'laf1_1min'
    | 'backgroundNote'
    | 'criterionRowId'
    | 'complianceStatus'
    | 'resultNote'
    | 'sortOrder'
  >
>;

export type ProjectEnvironmentalVibrationResultRowInput = Partial<
  Pick<
    ProjectEnvironmentalVibrationResultRow,
    | 'locationId'
    | 'observedAt'
    | 'activityLabel'
    | 'instrumentNote'
    | 'metricType'
    | 'ppvValue'
    | 'vdvValue'
    | 'linPeakValue'
    | 'dominantFrequencyHz'
    | 'axisNote'
    | 'criterionRowId'
    | 'complianceStatus'
    | 'resultNote'
    | 'sortOrder'
  >
>;

export type ProjectEnvironmentalMonitoringObservationInput = Partial<
  Pick<
    ProjectEnvironmentalMonitoringObservation,
    'category' | 'observation' | 'implicationNote' | 'sortOrder'
  >
>;

export type ProjectEnvironmentalMonitoringRecommendationInput = Partial<
  Pick<
    ProjectEnvironmentalMonitoringRecommendation,
    'category' | 'recommendation' | 'priority' | 'responsibility' | 'timingNote' | 'sortOrder'
  >
>;

export type DeleteEnvironmentalMonitoringReportResult = {
  id: string;
  deleted: true;
};
