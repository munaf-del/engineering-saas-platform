import type {
  NoiseVibrationCriterionRow,
  NoiseVibrationReceiverType,
} from '@/features/standards/noise-vibration-types';
import type {
  ProjectSpatialBasemap,
  ProjectSpatialMapViewState,
} from '@/features/spatial/project-spatial-map';
import type { ProjectSpatialFeatureType } from '@eng/shared';
import { PROJECT_SPATIAL_FEATURE_TYPES } from '@eng/shared';
import type {
  ProjectSpatialPaperSize,
  ProjectSpatialSheetMode,
  ProjectSpatialSheetOrientation,
} from '@/features/spatial/project-spatial-sheet-config';
import {
  normalizeGenericTemplateDocument,
  type GenericTemplateDocument,
} from '@/features/templates/core/generic-template-document';

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
  { value: 'compliant', label: 'Compliant' },
  { value: 'trigger_exceeded', label: 'Trigger exceeded' },
  { value: 'criterion_exceeded', label: 'Criterion exceeded' },
  { value: 'not_applicable', label: 'Not applicable' },
  { value: 'review_required', label: 'Manual assessment required' },
  { value: 'complies', label: 'Complies (Legacy)' },
  { value: 'exceeds', label: 'Exceeds (Legacy)' },
] as const;

export const ENVIRONMENTAL_MONITORING_CRITERION_APPLICABILITY_OPTIONS = [
  { value: 'applicable', label: 'Applicable' },
  { value: 'reference_only', label: 'Reference only' },
  { value: 'superseded_by_project_condition', label: 'Superseded by project condition' },
  { value: 'not_applicable', label: 'Not applicable' },
] as const;

export const ENVIRONMENTAL_MONITORING_METRIC_TYPE_OPTIONS = [
  { value: 'ppv', label: 'PPV' },
  { value: 'vdv', label: 'VDV' },
  { value: 'lin_peak', label: 'Lin Peak' },
  { value: 'other', label: 'Other' },
] as const;

export const ENVIRONMENTAL_MONITORING_ANNEXURE_TYPE_OPTIONS = [
  { value: 'spatial_sheet', label: 'Spatial Sheet' },
] as const;

export type EnvironmentalMonitoringReportType =
  (typeof ENVIRONMENTAL_MONITORING_REPORT_TYPE_OPTIONS)[number]['value'];
export type EnvironmentalMonitoringSelectionPurpose =
  (typeof ENVIRONMENTAL_MONITORING_SELECTION_PURPOSE_OPTIONS)[number]['value'];
export type EnvironmentalMonitoringAssessmentLocationBasis =
  (typeof ENVIRONMENTAL_MONITORING_ASSESSMENT_LOCATION_OPTIONS)[number]['value'];
export type EnvironmentalMonitoringComplianceStatus =
  (typeof ENVIRONMENTAL_MONITORING_COMPLIANCE_STATUS_OPTIONS)[number]['value'];
export type EnvironmentalMonitoringCriterionApplicabilityStatus =
  (typeof ENVIRONMENTAL_MONITORING_CRITERION_APPLICABILITY_OPTIONS)[number]['value'];
export type EnvironmentalMonitoringMetricType =
  (typeof ENVIRONMENTAL_MONITORING_METRIC_TYPE_OPTIONS)[number]['value'];
export type EnvironmentalMonitoringAnnexureType =
  (typeof ENVIRONMENTAL_MONITORING_ANNEXURE_TYPE_OPTIONS)[number]['value'];

export type MonitoringRootSheetTemplateSnapshot = {
  id: string;
  label: string;
  templateDocument: GenericTemplateDocument;
  versionId: string;
};

export type MonitoringSheetTemplateSourceKind =
  | 'root_sheet_template'
  | 'built_in_sheet_template'
  | 'legacy_spatial_layout';

export type MonitoringSpatialAnnexureBinding = {
  activeBasemap: ProjectSpatialBasemap;
  rootSheetTemplateSnapshot?: MonitoringRootSheetTemplateSnapshot | null;
  showGeologyOverlay: boolean;
  visibleFeatureTypes: ProjectSpatialFeatureType[];
  viewState: ProjectSpatialMapViewState;
};

export function coerceMonitoringSpatialAnnexureBinding(
  value: unknown,
): MonitoringSpatialAnnexureBinding | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const activeBasemap = parseMonitoringSpatialBasemap(record.activeBasemap);
  const viewState = parseMonitoringSpatialViewState(record.viewState);

  if (!activeBasemap || typeof record.showGeologyOverlay !== 'boolean' || !viewState) {
    return null;
  }

  return {
    activeBasemap,
    rootSheetTemplateSnapshot: parseMonitoringRootSheetTemplateSnapshot(
      record.rootSheetTemplateSnapshot,
    ),
    showGeologyOverlay: record.showGeologyOverlay,
    visibleFeatureTypes: parseMonitoringSpatialFeatureTypes(record.visibleFeatureTypes),
    viewState,
  };
}

function parseMonitoringSpatialFeatureTypes(value: unknown): ProjectSpatialFeatureType[] {
  const rawFeatureTypes = Array.isArray(value) ? value : PROJECT_SPATIAL_FEATURE_TYPES;
  const visibleFeatureTypes = rawFeatureTypes.filter(
    (featureType): featureType is ProjectSpatialFeatureType =>
      PROJECT_SPATIAL_FEATURE_TYPES.includes(featureType as ProjectSpatialFeatureType),
  );

  return visibleFeatureTypes.length > 0 ? visibleFeatureTypes : [...PROJECT_SPATIAL_FEATURE_TYPES];
}

export type MonitoringSpatialAnnexureTemplateSpec = {
  layoutMode: ProjectSpatialSheetMode;
  orientation: ProjectSpatialSheetOrientation;
  paperSize: ProjectSpatialPaperSize;
};

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
    annexures: number;
    locations: number;
    selectedCriteria: number;
    noiseResults: number;
    vibrationResults: number;
    recommendations: number;
  };
};

export type MonitoringPackageProjectIdentitySnapshot = {
  projectNumber: string;
  projectName: string;
  client: string;
  address: string;
};

export type MonitoringPackageAnnexureRegisterEntry = {
  annexureCode: string;
  id: string;
  sourceKind: MonitoringSheetTemplateSourceKind;
  sourceLabel: string | null;
  templateLabel: string | null;
  title: string;
};

export type MonitoringReportPackageSnapshot = {
  annexureRegister: MonitoringPackageAnnexureRegisterEntry[];
  approvedBy: string | null;
  checkedBy: string | null;
  documentStatus: string | null;
  issueDate: string | null;
  issueLabel: string;
  preparedBy: string | null;
  projectIdentity: MonitoringPackageProjectIdentitySnapshot;
  reportTitle: string;
  reportTypeLabel: string;
  revision: string | null;
};

export type ProjectEnvironmentalMonitoringReportRecord = {
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
  annexures: ProjectEnvironmentalMonitoringAnnexure[];
  references: ProjectEnvironmentalMonitoringReference[];
  locations: ProjectEnvironmentalMonitoringLocation[];
  selectedCriteria: ProjectEnvironmentalMonitoringSelectedCriterion[];
  noiseResults: ProjectEnvironmentalNoiseResultRow[];
  vibrationResults: ProjectEnvironmentalVibrationResultRow[];
  observations: ProjectEnvironmentalMonitoringObservation[];
  recommendations: ProjectEnvironmentalMonitoringRecommendation[];
};

export type ProjectEnvironmentalMonitoringReportPackageIssueSummary = {
  id: string;
  monitoringReportId: string;
  issueLabel: string;
  revision: string | null;
  documentStatus: string | null;
  issueDate: string | null;
  preparedBy: string | null;
  checkedBy: string | null;
  approvedBy: string | null;
  createdAt: string | null;
  createdBy: string | null;
};

export type ProjectEnvironmentalMonitoringReport = ProjectEnvironmentalMonitoringReportRecord & {
  packageIssues: ProjectEnvironmentalMonitoringReportPackageIssueSummary[];
};

export type ProjectEnvironmentalMonitoringReportPackageIssue =
  ProjectEnvironmentalMonitoringReportPackageIssueSummary & {
    reportSnapshotJson: ProjectEnvironmentalMonitoringReportRecord;
    packageSnapshotJson: MonitoringReportPackageSnapshot;
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

export type ProjectEnvironmentalMonitoringAnnexure = {
  id: string;
  monitoringReportId: string;
  title: string;
  annexureType: EnvironmentalMonitoringAnnexureType;
  templateSourceKind: MonitoringSheetTemplateSourceKind;
  templateReferenceId: string | null;
  rootSheetTemplateId: string | null;
  rootSheetTemplateVersionId: string | null;
  templateSnapshotJson: Record<string, unknown> | null;
  sourceLabel: string | null;
  bindingJson: MonitoringSpatialAnnexureBinding | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type ProjectEnvironmentalMonitoringLocation = {
  id: string;
  monitoringReportId: string;
  label: string;
  receiverType: NoiseVibrationReceiverType | null;
  sourceSpatialViewId: string | null;
  sourceSpatialViewLabel: string | null;
  sourceSpatialFeatureId: string | null;
  sourceSpatialFeatureLabel: string | null;
  sourceSpatialFeatureType: ProjectSpatialFeatureType | null;
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
  applicabilityStatus: EnvironmentalMonitoringCriterionApplicabilityStatus;
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
  descriptorMetric: string | null;
  measuredValue: string | null;
  measuredUnit: string | null;
  laeq15min: string | null;
  lamax: string | null;
  laf1_1min: string | null;
  backgroundNote: string | null;
  selectedCriterionId: string | null;
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
  locationId: string | null;
  noiseResultId: string | null;
  observation: string;
  implicationNote: string | null;
  implicationSeverity: string | null;
  followUpRequired: boolean;
  sortOrder: number;
};

export type ProjectEnvironmentalMonitoringRecommendation = {
  id: string;
  monitoringReportId: string;
  category: string;
  observationId: string | null;
  noiseResultId: string | null;
  recommendation: string;
  priority: string | null;
  responsibility: string | null;
  timingNote: string | null;
  dueDate: string | null;
  status: string | null;
  sortOrder: number;
};

export type ProjectEnvironmentalMonitoringLocationImportMode = 'new_only' | 'refresh_imported';

export type ProjectEnvironmentalMonitoringLocationImportInput = {
  projectSpatialViewId: string;
  mode?: ProjectEnvironmentalMonitoringLocationImportMode;
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

export type ProjectEnvironmentalMonitoringReportPackageIssueCreateInput = {
  issueLabel?: string | null;
  revision?: string | null;
  documentStatus?: string | null;
  issueDate?: string | null;
  preparedBy?: string | null;
  checkedBy?: string | null;
  approvedBy?: string | null;
};

export type ProjectEnvironmentalMonitoringReferenceInput = Partial<
  Pick<
    ProjectEnvironmentalMonitoringReference,
    'projectReferenceId' | 'aiDocumentId' | 'label' | 'note' | 'sortOrder'
  >
>;

export type ProjectEnvironmentalMonitoringAnnexureInput = {
  title?: string | null;
  annexureType?: EnvironmentalMonitoringAnnexureType;
  templateSourceKind?: MonitoringSheetTemplateSourceKind | null;
  templateReferenceId?: string | null;
  rootSheetTemplateId?: string | null;
  rootSheetTemplateVersionId?: string | null;
  templateSnapshotJson?: Record<string, unknown> | null;
  sourceLabel?: string | null;
  bindingJson?: MonitoringSpatialAnnexureBinding | null;
};

export function coerceMonitoringAnnexureTemplateSnapshot(
  value: unknown,
): GenericTemplateDocument | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  try {
    return normalizeGenericTemplateDocument(value);
  } catch {
    return null;
  }
}

function parseMonitoringRootSheetTemplateSnapshot(
  value: unknown,
): MonitoringRootSheetTemplateSnapshot | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const templateDocument = normalizeGenericTemplateDocument(record.templateDocument);

  if (typeof record.id !== 'string' || !record.id.trim()) {
    return null;
  }

  if (typeof record.label !== 'string' || !record.label.trim()) {
    return null;
  }

  if (typeof record.versionId !== 'string' || !record.versionId.trim()) {
    return null;
  }

  return {
    id: record.id.trim(),
    label: record.label.trim(),
    templateDocument,
    versionId: record.versionId.trim(),
  };
}

function parseMonitoringSpatialBasemap(value: unknown): ProjectSpatialBasemap | null {
  return value === 'osm' || value === 'nsw_aerial_imagery' || value === 'nsw_topographic'
    ? value
    : null;
}

function parseMonitoringSpatialViewState(value: unknown): ProjectSpatialMapViewState | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const center = Array.isArray(record.centerLonLat) ? record.centerLonLat : [];
  const longitude = Number(center[0]);
  const latitude = Number(center[1]);
  const rotation = Number(record.rotation);
  const zoomRaw = record.zoom;
  const zoom =
    zoomRaw === undefined || zoomRaw === null || zoomRaw === '' ? undefined : Number(zoomRaw);

  if (
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180 ||
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    !Number.isFinite(rotation) ||
    (zoom !== undefined && !Number.isFinite(zoom))
  ) {
    return null;
  }

  return {
    centerLonLat: [longitude, latitude],
    rotation,
    zoom,
  };
}

export type ProjectEnvironmentalMonitoringLocationInput = Partial<
  Pick<
    ProjectEnvironmentalMonitoringLocation,
    | 'label'
    | 'receiverType'
    | 'sourceSpatialViewId'
    | 'sourceSpatialViewLabel'
    | 'sourceSpatialFeatureId'
    | 'sourceSpatialFeatureLabel'
    | 'sourceSpatialFeatureType'
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
    | 'applicabilityStatus'
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
    | 'descriptorMetric'
    | 'measuredValue'
    | 'measuredUnit'
    | 'laeq15min'
    | 'lamax'
    | 'laf1_1min'
    | 'backgroundNote'
    | 'selectedCriterionId'
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
    | 'category'
    | 'locationId'
    | 'noiseResultId'
    | 'observation'
    | 'implicationNote'
    | 'implicationSeverity'
    | 'followUpRequired'
    | 'sortOrder'
  >
>;

export type ProjectEnvironmentalMonitoringRecommendationInput = Partial<
  Pick<
    ProjectEnvironmentalMonitoringRecommendation,
    | 'category'
    | 'observationId'
    | 'noiseResultId'
    | 'recommendation'
    | 'priority'
    | 'responsibility'
    | 'timingNote'
    | 'dueDate'
    | 'status'
    | 'sortOrder'
  >
>;

export type DeleteEnvironmentalMonitoringReportResult = {
  id: string;
  deleted: true;
};
