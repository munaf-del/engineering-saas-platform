import {
  PROJECT_SPATIAL_FEATURE_TYPES,
  PROJECT_SPATIAL_GEOMETRY_TYPES,
  PROJECT_SPATIAL_LINKED_DELIVERABLE_TYPES,
  PROJECT_SPATIAL_SOURCE_TYPES,
  type ProjectSpatialFeatureType,
} from '@eng/shared';

export const PROJECT_SPATIAL_FEATURE_TYPE_OPTIONS = PROJECT_SPATIAL_FEATURE_TYPES.map((value) => ({
  value,
  label: formatSpatialLabel(value),
})) as ReadonlyArray<{ value: ProjectSpatialFeatureType; label: string }>;

export const PROJECT_SPATIAL_GEOMETRY_TYPE_OPTIONS = PROJECT_SPATIAL_GEOMETRY_TYPES.map((value) => ({
  value,
  label: formatSpatialLabel(value),
})) satisfies ReadonlyArray<{
  value: (typeof PROJECT_SPATIAL_GEOMETRY_TYPES)[number];
  label: string;
}>;

export const PROJECT_SPATIAL_SOURCE_TYPE_OPTIONS = PROJECT_SPATIAL_SOURCE_TYPES.map((value) => ({
  value,
  label: formatSpatialLabel(value),
})) satisfies ReadonlyArray<{
  value: (typeof PROJECT_SPATIAL_SOURCE_TYPES)[number];
  label: string;
}>;

export const PROJECT_SPATIAL_LINKED_DELIVERABLE_TYPE_OPTIONS =
  PROJECT_SPATIAL_LINKED_DELIVERABLE_TYPES.map((value) => ({
    value,
    label: formatSpatialLabel(value),
  })) satisfies ReadonlyArray<{
    value: (typeof PROJECT_SPATIAL_LINKED_DELIVERABLE_TYPES)[number];
    label: string;
  }>;

export type ProjectSpatialMetadataFieldDefinition = {
  key: string;
  label: string;
  kind: 'text' | 'textarea' | 'checkbox';
};

// Do NOT render propertiesJson as a raw JSON editor. Render type-specific form fields based on featureType selection.
export const PROJECT_SPATIAL_METADATA_FIELDS: Partial<
  Record<ProjectSpatialFeatureType, ProjectSpatialMetadataFieldDefinition[]>
> = {
  site_boundary: [
    { key: 'areaNote', label: 'Area note', kind: 'textarea' },
    { key: 'tenureNote', label: 'Tenure note', kind: 'textarea' },
    { key: 'sourceNote', label: 'Source note', kind: 'textarea' },
  ],
  borehole: [
    { key: 'boreholeId', label: 'Borehole ID', kind: 'text' },
    { key: 'depthM', label: 'Depth (m)', kind: 'text' },
    { key: 'rlM', label: 'RL (m)', kind: 'text' },
    { key: 'date', label: 'Date', kind: 'text' },
    { key: 'status', label: 'Status', kind: 'text' },
  ],
  monitoring_well: [
    { key: 'wellId', label: 'Well ID', kind: 'text' },
    { key: 'depthM', label: 'Depth (m)', kind: 'text' },
    { key: 'groundwaterNote', label: 'Groundwater note', kind: 'textarea' },
    { key: 'dateInstalled', label: 'Date installed', kind: 'text' },
  ],
  vibration_monitor: [
    { key: 'monitorId', label: 'Monitor ID', kind: 'text' },
    { key: 'instrumentNote', label: 'Instrument note', kind: 'textarea' },
    { key: 'isActive', label: 'Active monitor', kind: 'checkbox' },
  ],
  noise_monitor: [
    { key: 'monitorId', label: 'Monitor ID', kind: 'text' },
    { key: 'instrumentNote', label: 'Instrument note', kind: 'textarea' },
    { key: 'isActive', label: 'Active monitor', kind: 'checkbox' },
  ],
  receiver: [
    { key: 'receiverType', label: 'Receiver type', kind: 'text' },
    { key: 'sensitivityNote', label: 'Sensitivity note', kind: 'textarea' },
    { key: 'heritageFlag', label: 'Heritage receiver', kind: 'checkbox' },
    { key: 'criticalFlag', label: 'Critical receiver', kind: 'checkbox' },
  ],
};

export const PROJECT_SPATIAL_FEATURE_COLORS: Record<ProjectSpatialFeatureType, string> = {
  site_boundary: '#0f766e',
  parcel_boundary: '#155e75',
  borehole: '#9a3412',
  monitoring_well: '#0369a1',
  vibration_monitor: '#b45309',
  noise_monitor: '#1d4ed8',
  receiver: '#7c3aed',
  structure: '#374151',
  excavation_area: '#dc2626',
  work_zone: '#ea580c',
  reference_point: '#4f46e5',
  other: '#475569',
};

export function formatSpatialLabel(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function getProjectSpatialMetadataFields(featureType: ProjectSpatialFeatureType | '') {
  if (!featureType) {
    return [];
  }

  return PROJECT_SPATIAL_METADATA_FIELDS[featureType] ?? [];
}

export function usesProjectSpatialFallbackMetadata(featureType: ProjectSpatialFeatureType | '') {
  return !!featureType && !PROJECT_SPATIAL_METADATA_FIELDS[featureType];
}
