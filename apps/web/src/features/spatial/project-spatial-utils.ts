import {
  PROJECT_SPATIAL_FEATURE_TYPES,
  PROJECT_SPATIAL_GEOMETRY_TYPES,
  PROJECT_SPATIAL_LINKED_DELIVERABLE_TYPES,
  PROJECT_SPATIAL_SOURCE_TYPES,
  type ProjectSpatialGeometryType,
  type ProjectSpatialFeatureType,
} from '@eng/shared';

export type ProjectSpatialMetadataFieldDefinition = {
  key: string;
  label: string;
  kind: 'text' | 'textarea' | 'checkbox';
};

export type ProjectSpatialPointSymbolShape = 'circle' | 'square' | 'triangle' | 'diamond' | 'star';

export type ProjectSpatialPointSymbolVariant = 'solid' | 'open' | 'bullseye';

export type ProjectSpatialFillPattern = 'none' | 'solid' | 'diagonal' | 'cross' | 'dot';

export type ProjectSpatialFeatureSymbologyDefinition = {
  label: string;
  color: string;
  pointShape: ProjectSpatialPointSymbolShape;
  pointVariant: ProjectSpatialPointSymbolVariant;
  pointRadius: number;
  strokeDash: number[];
  strokeWidth: number;
  fillPattern: ProjectSpatialFillPattern;
  fillOpacity: number;
};

export function formatSpatialLabel(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

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
  service_run: [
    { key: 'serviceType', label: 'Service type', kind: 'text' },
    { key: 'status', label: 'Service status', kind: 'text' },
    { key: 'diameterMm', label: 'Diameter (mm)', kind: 'text' },
    { key: 'depthM', label: 'Depth (m)', kind: 'text' },
    { key: 'levelRL', label: 'Level RL', kind: 'text' },
    { key: 'authority', label: 'Authority', kind: 'text' },
    { key: 'material', label: 'Material', kind: 'text' },
    { key: 'sourceReference', label: 'Source reference', kind: 'text' },
    { key: 'surveyConfidence', label: 'Survey confidence', kind: 'text' },
    { key: 'notes', label: 'Notes', kind: 'textarea' },
  ],
  service_crossing: [
    { key: 'serviceType', label: 'Service type', kind: 'text' },
    { key: 'status', label: 'Service status', kind: 'text' },
    { key: 'linkedServiceSourceId', label: 'Linked service source ID', kind: 'text' },
    { key: 'conflictType', label: 'Conflict type', kind: 'text' },
    { key: 'diameterMm', label: 'Diameter (mm)', kind: 'text' },
    { key: 'depthM', label: 'Depth (m)', kind: 'text' },
    { key: 'levelRL', label: 'Level RL', kind: 'text' },
    { key: 'clearanceMm', label: 'Clearance (mm)', kind: 'text' },
    { key: 'riskStatus', label: 'Risk status', kind: 'text' },
    { key: 'authority', label: 'Authority', kind: 'text' },
    { key: 'material', label: 'Material', kind: 'text' },
    { key: 'sourceReference', label: 'Source reference', kind: 'text' },
    { key: 'surveyConfidence', label: 'Survey confidence', kind: 'text' },
    { key: 'notes', label: 'Notes', kind: 'textarea' },
  ],
};

export const PROJECT_SPATIAL_FEATURE_SYMBOLOGY = {
  site_boundary: {
    label: 'Site Boundary',
    color: '#0f766e',
    pointShape: 'square',
    pointVariant: 'open',
    pointRadius: 7,
    strokeDash: [12, 4],
    strokeWidth: 3,
    fillPattern: 'diagonal',
    fillOpacity: 0.08,
  },
  parcel_boundary: {
    label: 'Parcel Boundary',
    color: '#155e75',
    pointShape: 'diamond',
    pointVariant: 'open',
    pointRadius: 7,
    strokeDash: [6, 4],
    strokeWidth: 2,
    fillPattern: 'dot',
    fillOpacity: 0.08,
  },
  borehole: {
    label: 'Borehole',
    color: '#9a3412',
    pointShape: 'triangle',
    pointVariant: 'solid',
    pointRadius: 7,
    strokeDash: [10, 4],
    strokeWidth: 2,
    fillPattern: 'solid',
    fillOpacity: 0.12,
  },
  monitoring_well: {
    label: 'Monitoring Well',
    color: '#0369a1',
    pointShape: 'diamond',
    pointVariant: 'open',
    pointRadius: 7,
    strokeDash: [8, 4],
    strokeWidth: 2,
    fillPattern: 'cross',
    fillOpacity: 0.12,
  },
  vibration_monitor: {
    label: 'Vibration Monitor',
    color: '#b45309',
    pointShape: 'square',
    pointVariant: 'solid',
    pointRadius: 6.5,
    strokeDash: [10, 6, 2, 6],
    strokeWidth: 2,
    fillPattern: 'solid',
    fillOpacity: 0.12,
  },
  noise_monitor: {
    label: 'Noise Monitor',
    color: '#1d4ed8',
    pointShape: 'circle',
    pointVariant: 'open',
    pointRadius: 7,
    strokeDash: [2, 6],
    strokeWidth: 2,
    fillPattern: 'dot',
    fillOpacity: 0.12,
  },
  receiver: {
    label: 'Receiver',
    color: '#7c3aed',
    pointShape: 'star',
    pointVariant: 'solid',
    pointRadius: 8,
    strokeDash: [],
    strokeWidth: 2,
    fillPattern: 'diagonal',
    fillOpacity: 0.1,
  },
  structure: {
    label: 'Structure',
    color: '#374151',
    pointShape: 'square',
    pointVariant: 'open',
    pointRadius: 7,
    strokeDash: [],
    strokeWidth: 2,
    fillPattern: 'solid',
    fillOpacity: 0.18,
  },
  excavation_area: {
    label: 'Excavation Area',
    color: '#dc2626',
    pointShape: 'triangle',
    pointVariant: 'open',
    pointRadius: 8,
    strokeDash: [10, 6],
    strokeWidth: 2,
    fillPattern: 'diagonal',
    fillOpacity: 0.16,
  },
  work_zone: {
    label: 'Work Zone',
    color: '#ea580c',
    pointShape: 'square',
    pointVariant: 'solid',
    pointRadius: 7,
    strokeDash: [2, 5],
    strokeWidth: 2,
    fillPattern: 'dot',
    fillOpacity: 0.16,
  },
  service_run: {
    label: 'Service Run',
    color: '#2563eb',
    pointShape: 'circle',
    pointVariant: 'open',
    pointRadius: 6.5,
    strokeDash: [12, 3, 3, 3],
    strokeWidth: 2.5,
    fillPattern: 'none',
    fillOpacity: 0,
  },
  service_crossing: {
    label: 'Service Crossing',
    color: '#be123c',
    pointShape: 'diamond',
    pointVariant: 'bullseye',
    pointRadius: 8,
    strokeDash: [4, 3],
    strokeWidth: 2.5,
    fillPattern: 'cross',
    fillOpacity: 0.1,
  },
  reference_point: {
    label: 'Reference Point',
    color: '#4f46e5',
    pointShape: 'diamond',
    pointVariant: 'bullseye',
    pointRadius: 7,
    strokeDash: [8, 3, 2, 3],
    strokeWidth: 2,
    fillPattern: 'solid',
    fillOpacity: 0.1,
  },
  other: {
    label: 'Other',
    color: '#475569',
    pointShape: 'circle',
    pointVariant: 'solid',
    pointRadius: 6.5,
    strokeDash: [6, 6],
    strokeWidth: 2,
    fillPattern: 'solid',
    fillOpacity: 0.12,
  },
} satisfies Record<ProjectSpatialFeatureType, ProjectSpatialFeatureSymbologyDefinition>;

export const PROJECT_SPATIAL_FEATURE_COLORS = Object.fromEntries(
  PROJECT_SPATIAL_FEATURE_TYPES.map((featureType) => [
    featureType,
    PROJECT_SPATIAL_FEATURE_SYMBOLOGY[featureType].color,
  ]),
) as Record<ProjectSpatialFeatureType, string>;

export const PROJECT_SPATIAL_FEATURE_TYPE_OPTIONS = PROJECT_SPATIAL_FEATURE_TYPES.map((value) => ({
  value,
  label: PROJECT_SPATIAL_FEATURE_SYMBOLOGY[value].label,
})) as ReadonlyArray<{ value: ProjectSpatialFeatureType; label: string }>;

export const PROJECT_SPATIAL_GEOMETRY_TYPE_OPTIONS = PROJECT_SPATIAL_GEOMETRY_TYPES.map(
  (value) => ({
    value,
    label: formatSpatialLabel(value),
  }),
) satisfies ReadonlyArray<{
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

export const PROJECT_SPATIAL_GEOLOGY_QUERY_MARKER = {
  label: 'Geo Query',
  color: '#111827',
  accentColor: '#facc15',
  textColor: '#111827',
} as const;

export const PROJECT_SPATIAL_GEOLOGY_OVERLAY_LEGEND = {
  label: 'NSW Seamless Geology',
  strokeColor: '#0f766e',
  fillColor: 'rgba(15, 118, 110, 0.12)',
} as const;

export function getProjectSpatialFeatureSymbology(
  featureType: ProjectSpatialFeatureType | '',
): ProjectSpatialFeatureSymbologyDefinition {
  return PROJECT_SPATIAL_FEATURE_SYMBOLOGY[featureType || 'other'];
}

export function isPolygonGeometryType(geometryType: ProjectSpatialGeometryType) {
  return geometryType === 'polygon';
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
