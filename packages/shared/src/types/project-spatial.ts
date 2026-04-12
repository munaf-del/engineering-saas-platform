export const PROJECT_SPATIAL_FEATURE_TYPES = [
  'site_boundary',
  'parcel_boundary',
  'borehole',
  'monitoring_well',
  'vibration_monitor',
  'noise_monitor',
  'receiver',
  'structure',
  'excavation_area',
  'work_zone',
  'reference_point',
  'other',
] as const;

export const PROJECT_SPATIAL_GEOMETRY_TYPES = ['point', 'line_string', 'polygon'] as const;

export const PROJECT_SPATIAL_SOURCE_TYPES = [
  'manual',
  'imported',
  'report_derived',
  'reference_derived',
  'other',
] as const;

export const PROJECT_SPATIAL_LINKED_DELIVERABLE_TYPES = [
  'cnvmp',
  'noise_monitoring_report',
  'vibration_monitoring_report',
  'geotechnical',
  'foundations',
  'other',
] as const;

export type ProjectSpatialFeatureType = (typeof PROJECT_SPATIAL_FEATURE_TYPES)[number];
export type ProjectSpatialGeometryType = (typeof PROJECT_SPATIAL_GEOMETRY_TYPES)[number];
export type ProjectSpatialSourceType = (typeof PROJECT_SPATIAL_SOURCE_TYPES)[number];
export type ProjectSpatialLinkedDeliverableType =
  (typeof PROJECT_SPATIAL_LINKED_DELIVERABLE_TYPES)[number];

export type GeoJsonPosition = [number, number] | [number, number, number];

export type ProjectSpatialPointGeometry = {
  type: 'Point';
  coordinates: GeoJsonPosition;
};

export type ProjectSpatialLineStringGeometry = {
  type: 'LineString';
  coordinates: GeoJsonPosition[];
};

export type ProjectSpatialPolygonGeometry = {
  type: 'Polygon';
  coordinates: GeoJsonPosition[][];
};

export type ProjectSpatialGeometryJson =
  | ProjectSpatialPointGeometry
  | ProjectSpatialLineStringGeometry
  | ProjectSpatialPolygonGeometry;

export type ProjectSpatialSiteBoundaryProperties = {
  areaNote?: string;
  tenureNote?: string;
  sourceNote?: string;
};

export type ProjectSpatialBoreholeProperties = {
  boreholeId?: string;
  depthM?: string;
  rlM?: string;
  date?: string;
  status?: string;
};

export type ProjectSpatialMonitoringWellProperties = {
  wellId?: string;
  depthM?: string;
  groundwaterNote?: string;
  dateInstalled?: string;
};

export type ProjectSpatialMonitorProperties = {
  monitorId?: string;
  instrumentNote?: string;
  isActive?: boolean;
};

export type ProjectSpatialReceiverProperties = {
  receiverType?: string;
  sensitivityNote?: string;
  heritageFlag?: boolean;
  criticalFlag?: boolean;
};

export type ProjectSpatialFallbackProperties = {
  additionalProperties?: string;
};

export type ProjectSpatialFeatureProperties =
  | ProjectSpatialSiteBoundaryProperties
  | ProjectSpatialBoreholeProperties
  | ProjectSpatialMonitoringWellProperties
  | ProjectSpatialMonitorProperties
  | ProjectSpatialReceiverProperties
  | ProjectSpatialFallbackProperties
  | Record<string, unknown>;

export interface ProjectSpatialLinkedAiDocument {
  id: string;
  filename: string;
  documentFamily: string;
  reportType: string;
  ownerWorkspace: string;
  status: string;
  createdAt: string;
}

export interface ProjectSpatialFeature {
  id: string;
  projectId: string;
  featureType: ProjectSpatialFeatureType;
  geometryType: ProjectSpatialGeometryType;
  label: string;
  description: string | null;
  geometryJson: ProjectSpatialGeometryJson;
  status: string | null;
  sourceType: ProjectSpatialSourceType | null;
  sourceReference: string | null;
  linkedProjectReferenceId: string | null;
  linkedAiDocumentId: string | null;
  linkedDeliverableType: ProjectSpatialLinkedDeliverableType | null;
  linkedDeliverableId: string | null;
  propertiesJson: ProjectSpatialFeatureProperties | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  linkedAiDocument?: ProjectSpatialLinkedAiDocument | null;
}

export interface ProjectSpatialFeatureInput {
  featureType: ProjectSpatialFeatureType;
  geometryType: ProjectSpatialGeometryType;
  label: string;
  description?: string | null;
  geometryJson: ProjectSpatialGeometryJson;
  status?: string | null;
  sourceType?: ProjectSpatialSourceType | null;
  sourceReference?: string | null;
  linkedProjectReferenceId?: string | null;
  linkedAiDocumentId?: string | null;
  linkedDeliverableType?: ProjectSpatialLinkedDeliverableType | null;
  linkedDeliverableId?: string | null;
  propertiesJson?: ProjectSpatialFeatureProperties | null;
  sortOrder?: number;
}

export type UpdateProjectSpatialFeatureInput = Partial<ProjectSpatialFeatureInput>;

export interface ProjectSpatialFeatureFilters {
  featureType?: ProjectSpatialFeatureType;
  geometryType?: ProjectSpatialGeometryType;
  linkedDeliverableType?: ProjectSpatialLinkedDeliverableType;
  q?: string;
}

