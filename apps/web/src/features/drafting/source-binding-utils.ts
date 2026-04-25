import type {
  DraftingBoreholeObject,
  DraftingModel,
  DraftingMonitoringPointObject,
  DraftingObject,
  DraftingObjectSourceType,
  DraftingPileObject,
  DraftingPoint,
  DraftingServiceCrossingObject,
  DraftingServiceRunObject,
  DraftingServiceStatus,
  DraftingServiceType,
  Pile,
  PileGroup,
  PileLayoutPoint,
  PileType,
  ProjectSpatialFeature,
  ProjectSpatialFeatureType,
  ProjectSpatialGeometryJson,
} from '@eng/shared';
import { DRAFTING_SERVICE_STATUSES, DRAFTING_SERVICE_TYPES } from '@eng/shared';
import { createBoreholeObject } from './tools/borehole-tool';
import { createMonitoringPointObject } from './tools/monitoring-point-tool';
import { createPileObject } from './tools/pile-tool';
import { createServiceCrossingObject } from './tools/service-crossing-tool';
import { createServiceRunObject } from './tools/service-run-tool';

export type PileGroupWithSources = PileGroup & {
  piles?: Pile[];
  layoutPoints?: PileLayoutPoint[];
  updatedAt?: string;
};

export type DraftingPileSourceRecord = {
  sourceType: 'foundation_pile';
  sourceId: string;
  sourceLabel: string;
  groupId: string;
  groupName: string;
  pile: Pile;
  layoutPoint?: PileLayoutPoint;
};

export type DraftingSpatialSourceRecord = {
  sourceType: 'spatial_feature';
  sourceId: string;
  sourceLabel: string;
  objectType: Extract<
    DraftingObject['type'],
    'borehole' | 'monitoring_point' | 'service_run' | 'service_crossing'
  >;
  feature: ProjectSpatialFeature;
};

export function buildDraftingPileSourceRecords(
  pileGroups: PileGroupWithSources[] | undefined,
): DraftingPileSourceRecord[] {
  return (pileGroups ?? []).flatMap((group) =>
    (group.piles ?? []).map((pile) => {
      const layoutPoint = (group.layoutPoints ?? []).find((point) => point.pileId === pile.id);
      return {
        sourceType: 'foundation_pile' as const,
        sourceId: pile.id,
        sourceLabel: layoutPoint?.label || pile.name,
        groupId: group.id,
        groupName: group.name,
        pile,
        ...(layoutPoint ? { layoutPoint } : {}),
      };
    }),
  );
}

export function buildDraftingSpatialSourceRecords(
  features: ProjectSpatialFeature[] | undefined,
): DraftingSpatialSourceRecord[] {
  return (features ?? []).flatMap((feature) => {
    const objectType = mapSpatialFeatureToDraftingObjectType(feature);
    return objectType
      ? [
          {
            sourceType: 'spatial_feature' as const,
            sourceId: feature.id,
            sourceLabel: feature.label,
            objectType,
            feature,
          },
        ]
      : [];
  });
}

export function createPileObjectFromSource(args: {
  source: DraftingPileSourceRecord;
  fallbackPoint: DraftingPoint;
  linkedBy?: string | null;
  model: DraftingModel;
}): DraftingPileObject {
  const now = new Date().toISOString();
  const point = pointFromPileLayout(args.source.layoutPoint) ?? args.fallbackPoint;
  const base = createPileObject(point, args.model);
  const diameterMm = normalizePileDiameterMm(args.source.pile.diameter) ?? base.geometry.diameterMm;
  const pileType = mapPileTypeToDraftingPileType(args.source.pile.pileType);

  return {
    ...base,
    name: args.source.sourceLabel,
    geometry: {
      ...base.geometry,
      centre: point,
      diameterMm,
    },
    metadata: {
      ...base.metadata,
      pileId: args.source.sourceLabel,
      ...(pileType ? { pileType } : {}),
      notes: sourceNotes([
        args.source.groupName,
        optionalNumberNote('length', args.source.pile.length, 'm'),
        optionalNumberNote('embedment', args.source.pile.embedmentDepth, 'm'),
      ]),
    },
    sourceRef: {
      sourceType: 'foundation_pile',
      sourceId: args.source.sourceId,
      sourceLabel: args.source.sourceLabel,
      sourceVersion: (args.source as { updatedAt?: string }).updatedAt,
      linkedAt: now,
      ...(args.linkedBy ? { linkedBy: args.linkedBy } : {}),
      status: 'linked',
      snapshot: {
        pileId: args.source.pile.id,
        pileName: args.source.pile.name,
        pileGroupId: args.source.groupId,
        pileGroupName: args.source.groupName,
        pileType: args.source.pile.pileType,
        diameter: args.source.pile.diameter,
        diameterMm,
        length: args.source.pile.length,
        embedmentDepth: args.source.pile.embedmentDepth,
        rakeAngle: args.source.pile.rakeAngle,
        materialId: args.source.pile.materialId,
        properties: args.source.pile.properties,
        layoutPoint: args.source.layoutPoint,
      },
    },
    updatedAt: now,
  };
}

export function createDraftingObjectFromSpatialSource(args: {
  source: DraftingSpatialSourceRecord;
  fallbackPoint: DraftingPoint;
  linkedBy?: string | null;
  model: DraftingModel;
}): DraftingObject {
  switch (args.source.objectType) {
    case 'borehole':
      return createBoreholeFromSpatialSource(args);
    case 'monitoring_point':
      return createMonitoringPointFromSpatialSource(args);
    case 'service_run':
      return createServiceRunFromSpatialSource(args);
    case 'service_crossing':
      return createServiceCrossingFromSpatialSource(args);
  }
}

export function findExistingSourceObject(
  model: DraftingModel,
  sourceType: DraftingObjectSourceType,
  sourceId: string,
) {
  return model.objects.find(
    (object) =>
      object.sourceRef?.sourceType === sourceType && object.sourceRef.sourceId === sourceId,
  );
}

function createBoreholeFromSpatialSource(args: {
  source: DraftingSpatialSourceRecord;
  fallbackPoint: DraftingPoint;
  linkedBy?: string | null;
  model: DraftingModel;
}): DraftingBoreholeObject {
  const now = new Date().toISOString();
  const feature = args.source.feature;
  const properties = featureProperties(feature);
  const point = pointFromSpatialGeometry(feature.geometryJson) ?? args.fallbackPoint;
  const depth = optionalNumber(properties.depthM);
  const groundRl = optionalNumber(properties.rlM);
  const boreholeId = stringValue(properties.boreholeId) || feature.label;
  const base = createBoreholeObject(point, args.model);

  return {
    ...base,
    name: feature.label,
    geometry: { point },
    parameters: {
      ...base.parameters,
      boreholeId,
      label: feature.label,
      groundLevelRl: groundRl,
      terminationDepthM: depth,
      terminationLevelRl:
        groundRl !== undefined && depth !== undefined ? roundNumber(groundRl - depth) : undefined,
      boreholeType: feature.sourceType ?? feature.featureType,
    },
    metadata: {
      ...base.metadata,
      linkedGeotechEntityId: feature.linkedDeliverableId ?? feature.linkedProjectReferenceId ?? '',
      sourceReference: feature.sourceReference ?? '',
    },
    sourceRef: buildSpatialSourceRef(feature, now, args.linkedBy),
    updatedAt: now,
  };
}

function createMonitoringPointFromSpatialSource(args: {
  source: DraftingSpatialSourceRecord;
  fallbackPoint: DraftingPoint;
  linkedBy?: string | null;
  model: DraftingModel;
}): DraftingMonitoringPointObject {
  const now = new Date().toISOString();
  const feature = args.source.feature;
  const properties = featureProperties(feature);
  const point = pointFromSpatialGeometry(feature.geometryJson) ?? args.fallbackPoint;
  const base = createMonitoringPointObject(point, args.model);

  return {
    ...base,
    name: feature.label,
    geometry: { point },
    metadata: {
      ...base.metadata,
      pointId: stringValue(properties.monitorId) || stringValue(properties.wellId) || feature.label,
      monitoringType:
        feature.featureType === 'noise_monitor'
          ? 'noise'
          : feature.featureType === 'vibration_monitor'
            ? 'vibration'
            : 'survey',
      notes: feature.description ?? feature.sourceReference ?? '',
    },
    sourceRef: buildSpatialSourceRef(feature, now, args.linkedBy),
    updatedAt: now,
  };
}

function createServiceRunFromSpatialSource(args: {
  source: DraftingSpatialSourceRecord;
  fallbackPoint: DraftingPoint;
  linkedBy?: string | null;
  model: DraftingModel;
}): DraftingServiceRunObject {
  const now = new Date().toISOString();
  const feature = args.source.feature;
  const path = pathFromSpatialGeometry(feature.geometryJson) ?? [
    args.fallbackPoint,
    { x: args.fallbackPoint.x + 2400, y: args.fallbackPoint.y },
  ];
  const base = createServiceRunObject(path[0]!, args.model);
  const properties = featureProperties(feature);

  return {
    ...base,
    name: feature.label,
    geometry: { path },
    parameters: {
      ...base.parameters,
      serviceId: feature.label,
      serviceType: normalizeServiceType(properties.serviceType),
      status: normalizeServiceStatus(properties.status ?? feature.status),
      authority: stringValue(properties.authority),
    },
    metadata: {
      ...base.metadata,
      sourceReference: feature.sourceReference ?? '',
      notes: feature.description ?? '',
    },
    sourceRef: buildSpatialSourceRef(feature, now, args.linkedBy),
    updatedAt: now,
  };
}

function createServiceCrossingFromSpatialSource(args: {
  source: DraftingSpatialSourceRecord;
  fallbackPoint: DraftingPoint;
  linkedBy?: string | null;
  model: DraftingModel;
}): DraftingServiceCrossingObject {
  const now = new Date().toISOString();
  const feature = args.source.feature;
  const point = pointFromSpatialGeometry(feature.geometryJson) ?? args.fallbackPoint;
  const properties = featureProperties(feature);
  const base = createServiceCrossingObject(point, args.model);

  return {
    ...base,
    name: feature.label,
    geometry: { crossingPoint: point },
    parameters: {
      ...base.parameters,
      crossingId: feature.label,
      serviceType: normalizeServiceType(properties.serviceType),
      clearanceMm: optionalNumber(properties.clearanceMm) ?? base.parameters.clearanceMm,
    },
    metadata: {
      ...base.metadata,
      notes: feature.description ?? feature.sourceReference ?? '',
    },
    sourceRef: buildSpatialSourceRef(feature, now, args.linkedBy),
    updatedAt: now,
  };
}

function buildSpatialSourceRef(
  feature: ProjectSpatialFeature,
  linkedAt: string,
  linkedBy?: string | null,
) {
  return {
    sourceType:
      feature.featureType === 'borehole'
        ? ('geotech_borehole' as const)
        : ('spatial_feature' as const),
    sourceId: feature.id,
    sourceLabel: feature.label,
    sourceVersion: feature.updatedAt,
    linkedAt,
    ...(linkedBy ? { linkedBy } : {}),
    status: 'linked' as const,
    snapshot: {
      id: feature.id,
      featureType: feature.featureType,
      geometryType: feature.geometryType,
      label: feature.label,
      description: feature.description,
      geometryJson: feature.geometryJson,
      status: feature.status,
      sourceType: feature.sourceType,
      sourceReference: feature.sourceReference,
      linkedProjectReferenceId: feature.linkedProjectReferenceId,
      linkedDeliverableType: feature.linkedDeliverableType,
      linkedDeliverableId: feature.linkedDeliverableId,
      propertiesJson: feature.propertiesJson,
      updatedAt: feature.updatedAt,
    },
  };
}

function mapSpatialFeatureToDraftingObjectType(
  feature: ProjectSpatialFeature,
): DraftingSpatialSourceRecord['objectType'] | null {
  if (feature.featureType === 'borehole') {
    return feature.geometryType === 'point' ? 'borehole' : null;
  }

  if (
    feature.featureType === 'monitoring_well' ||
    feature.featureType === 'vibration_monitor' ||
    feature.featureType === 'noise_monitor' ||
    feature.featureType === 'reference_point'
  ) {
    return feature.geometryType === 'point' ? 'monitoring_point' : null;
  }

  if (isServiceLikeFeature(feature)) {
    return feature.geometryType === 'line_string'
      ? 'service_run'
      : feature.geometryType === 'point'
        ? 'service_crossing'
        : null;
  }

  return null;
}

function isServiceLikeFeature(
  feature: Pick<ProjectSpatialFeature, 'featureType' | 'label' | 'description' | 'sourceReference'>,
) {
  if (
    !(['other', 'structure', 'work_zone'] as ProjectSpatialFeatureType[]).includes(
      feature.featureType,
    )
  ) {
    return false;
  }

  return /service|utility|water|sewer|stormwater|gas|electrical|telecom|crossing|xing/i.test(
    [feature.label, feature.description, feature.sourceReference].filter(Boolean).join(' '),
  );
}

function pointFromPileLayout(layoutPoint: PileLayoutPoint | undefined): DraftingPoint | null {
  if (!layoutPoint || !Number.isFinite(layoutPoint.x) || !Number.isFinite(layoutPoint.y)) {
    return null;
  }

  return {
    x: layoutPoint.x,
    y: layoutPoint.y,
    ...(Number.isFinite(layoutPoint.z) ? { z: layoutPoint.z } : {}),
  };
}

function pointFromSpatialGeometry(geometry: ProjectSpatialGeometryJson): DraftingPoint | null {
  if (geometry.type !== 'Point') {
    return null;
  }

  return pointFromGeoJsonPosition(geometry.coordinates);
}

function pathFromSpatialGeometry(geometry: ProjectSpatialGeometryJson): DraftingPoint[] | null {
  if (geometry.type !== 'LineString') {
    return null;
  }

  const points = geometry.coordinates
    .map(pointFromGeoJsonPosition)
    .filter(Boolean) as DraftingPoint[];
  return points.length >= 2 ? points : null;
}

function pointFromGeoJsonPosition(position: readonly number[]): DraftingPoint | null {
  const x = position[0];
  const y = position[1];
  const z = position[2];
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }

  return {
    x: x as number,
    y: y as number,
    ...(Number.isFinite(z) ? { z: z as number } : {}),
  };
}

function featureProperties(feature: ProjectSpatialFeature): Record<string, unknown> {
  return feature.propertiesJson && typeof feature.propertiesJson === 'object'
    ? (feature.propertiesJson as Record<string, unknown>)
    : {};
}

function normalizePileDiameterMm(value: number | undefined) {
  if (!Number.isFinite(value) || value === undefined || value <= 0) {
    return null;
  }

  return value <= 20 ? Math.round(value * 1000) : Math.round(value);
}

function mapPileTypeToDraftingPileType(pileType: PileType) {
  if (pileType === 'micropile') {
    return 'other' as const;
  }

  return pileType;
}

function normalizeServiceType(value: unknown): DraftingServiceType {
  return DRAFTING_SERVICE_TYPES.includes(value as DraftingServiceType)
    ? (value as DraftingServiceType)
    : 'unknown';
}

function normalizeServiceStatus(value: unknown): DraftingServiceStatus {
  return DRAFTING_SERVICE_STATUSES.includes(value as DraftingServiceStatus)
    ? (value as DraftingServiceStatus)
    : 'existing';
}

function optionalNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function sourceNotes(values: Array<string | undefined>) {
  return values.filter(Boolean).join('; ');
}

function optionalNumberNote(label: string, value: number | undefined, units: string) {
  return Number.isFinite(value) ? `${label} ${value} ${units}` : undefined;
}

function roundNumber(value: number) {
  return Math.round(value * 1000) / 1000;
}
