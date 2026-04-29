import type { ProjectEnvironmentalMonitoringReport } from './environmental-monitoring-types';

export const OMNIDOTS_IMPORT_PANEL_ID = 'omnidots-import-panel' as const;

export const OMNIDOTS_MONITORING_METRIC_OPTIONS = [
  { value: 'vtop', label: 'Vtop / Fdom peak records' },
  { value: 'vdv', label: 'VDV' },
  { value: 'veff_max', label: 'Veff,max' },
] as const;

export type OmnidotsMonitoringMetricKey =
  (typeof OMNIDOTS_MONITORING_METRIC_OPTIONS)[number]['value'];

export type OmnidotsConnectionSummary = {
  id: string;
  organisationId: string;
  providerKey: string;
  displayName: string;
  status: string;
  authType: string;
  lastValidatedAt: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  hasStoredToken: boolean;
};

export type OmnidotsMeasuringPointSummary = {
  id: string;
  connectionId: string;
  externalMeasuringPointId: string;
  name: string;
  active: boolean;
  timezone: string | null;
  guideLine: string | null;
  category: string | null;
  measuringType: string | null;
  vibrationType: string | null;
  userLatitude: number | null;
  userLongitude: number | null;
  sensorName: string | null;
  sensorOnline: boolean | null;
  sensorLastseenAt: string | null;
  sensorConnectedUsing: string | null;
  sensorBatteryCharge: number | null;
  sensorLatitude: number | null;
  sensorLongitude: number | null;
  deepLinkUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OmnidotsLatestImportJobSummary = {
  id: string;
  jobType: string;
  status: string;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
};

export type OmnidotsDatasetPreviewRow = {
  metricKey: string;
  metricLabel: string;
  unit: string | null;
  measuringPointId: string | null;
  measuringPointLabel: string;
  sampleCount: number;
  importDateFrom: string | null;
  importDateTo: string | null;
  timezone: string | null;
  datasetId: string;
  importJobId: string | null;
  importJobStatus: string | null;
  highestVtopX: number | null;
  highestVtopXAt: string | null;
  highestVtopY: number | null;
  highestVtopYAt: string | null;
  highestVtopZ: number | null;
  highestVtopZAt: string | null;
  fdomX: number | null;
  fdomY: number | null;
  fdomZ: number | null;
  highestVdvX: number | null;
  highestVdvXAt: string | null;
  highestVdvY: number | null;
  highestVdvYAt: string | null;
  highestVdvZ: number | null;
  highestVdvZAt: string | null;
  highestVeffX: number | null;
  highestVeffXAt: string | null;
  highestVeffY: number | null;
  highestVeffYAt: string | null;
  highestVeffZ: number | null;
  highestVeffZAt: string | null;
};

export type OmnidotsLatestDatasetSummary = {
  id: string;
  connectionId: string | null;
  measuringPointId: string | null;
  measuringPointLabel: string;
  dateFrom: string;
  dateTo: string;
  timezone: string;
  datasetHash: string;
  createdAt: string;
  updatedAt: string;
  selectedMetricKeys: string[];
  sampleCount: number;
  previewRows: OmnidotsDatasetPreviewRow[];
};

export type OmnidotsMeasuringPointState = {
  measuringPoints: OmnidotsMeasuringPointSummary[];
  latestImportJob: OmnidotsLatestImportJobSummary | null;
  latestDataset: OmnidotsLatestDatasetSummary | null;
};

export type EnvironmentalMonitoringOmnidotsConnectionInput = {
  displayName?: string | null;
  token: string;
};

export type EnvironmentalMonitoringOmnidotsConnectionUpdateInput = {
  displayName?: string | null;
  token?: string;
};

export type EnvironmentalMonitoringOmnidotsImportInput = {
  connectionId: string;
  measuringPointId: string;
  dateFrom: string;
  dateTo: string;
  selectedMetricKeys: OmnidotsMonitoringMetricKey[];
};

export type OmnidotsMetricImportResult = {
  status: string;
  metricKey: string;
  seriesId?: string;
  processedCount: number;
  createdCount: number;
  updatedCount: number;
  jobId: string;
  errorMessage?: string;
};

export type OmnidotsImportSummary = {
  connectionId: string;
  measuringPointId: string;
  selectedMetricKeys: string[];
  dateFrom: string;
  dateTo: string;
  samplesImported: number;
  samplesCreated: number;
  samplesUpdated: number;
  lastImportJobStatus: string | null;
  metricResults: OmnidotsMetricImportResult[];
};

export type OmnidotsImportResponse = {
  importSummary: OmnidotsImportSummary;
};

export type OmnidotsBuildDatasetResponse = {
  created: boolean;
  latestDataset: OmnidotsLatestDatasetSummary | null;
  latestImportJob: OmnidotsLatestImportJobSummary | null;
};

export type OmnidotsCreateVibrationResultsResponse = {
  createdCount: number;
  skippedCount: number;
  skipped: Array<{
    metricKey: string;
    reason: string;
  }>;
  report: ProjectEnvironmentalMonitoringReport;
};
