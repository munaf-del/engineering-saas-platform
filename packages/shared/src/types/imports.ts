export const IMPORT_FORMATS = ['csv', 'xlsx', 'json'] as const;
export type ImportFormat = (typeof IMPORT_FORMATS)[number];

export const IMPORT_STATUSES = [
  'pending',
  'validating',
  'validated',
  'applying',
  'applied',
  'rolling_back',
  'rolled_back',
  'failed',
] as const;
export type ImportStatus = (typeof IMPORT_STATUSES)[number];

export const IMPORT_ENTITY_TYPES = [
  'steel_section',
  'rebar_size',
  'material',
  'geotech_parameter',
] as const;
export type ImportEntityType = (typeof IMPORT_ENTITY_TYPES)[number];

export const IMPORT_ERROR_SEVERITIES = ['error', 'warning'] as const;
export type ImportErrorSeverity = (typeof IMPORT_ERROR_SEVERITIES)[number];

export interface ImportJob {
  id: string;
  organisationId: string;
  entityType: ImportEntityType;
  format: ImportFormat;
  fileName: string;
  status: ImportStatus;
  totalRows: number;
  validRows: number;
  errorRows: number;
  dryRun: boolean;
  snapshotId?: string;
  diff?: ImportDiff;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  rolledBackAt?: string;
  rolledBackBy?: string;
}

export interface ImportItemError {
  id: string;
  importJobId: string;
  rowNumber: number;
  field?: string;
  message: string;
  severity: ImportErrorSeverity;
}

export interface ImportDiff {
  added: number;
  modified: number;
  unchanged: number;
  removed: number;
  rows: ImportDiffRow[];
}

export interface ImportDiffRow {
  rowNumber: number;
  action: 'add' | 'modify' | 'remove' | 'unchanged';
  key: string;
  changes?: Record<string, { old: unknown; new: unknown }>;
}
