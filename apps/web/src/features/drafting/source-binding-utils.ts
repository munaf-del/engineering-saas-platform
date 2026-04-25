import type {
  DraftingBoreholeObject,
  DraftingModel,
  DraftingMonitoringPointObject,
  DraftingObject,
  DraftingObjectSourceType,
  DraftingPileObject,
  DraftingPoint,
  DraftingServiceConflictType,
  FoundationPileTypeSource,
  FoundationPlacedPileSource,
  DraftingServiceCrossingObject,
  DraftingServiceRunObject,
  DraftingServiceRiskStatus,
  DraftingServiceStatus,
  DraftingServiceType,
  DraftingStructuralJointObject,
  GeotechBoreholeSource,
  MonitoringPointSource,
  MultiPileJoint,
  MultiPilePileTypeDefinition,
  Pile,
  PileGroup,
  PileLayoutPoint,
  PileType,
  ProjectEngineeringSourceRegistry,
  ProjectSpatialFeature,
  ProjectSpatialFeatureType,
  ProjectSpatialGeometryJson,
  SpatialServiceSource,
} from '@eng/shared';
import {
  DRAFTING_SERVICE_CONFLICT_TYPES,
  DRAFTING_SERVICE_RISK_STATUSES,
  DRAFTING_SERVICE_STATUSES,
  DRAFTING_SERVICE_TYPES,
} from '@eng/shared';
import { createBoreholeObject } from './tools/borehole-tool';
import { createMonitoringPointObject } from './tools/monitoring-point-tool';
import { createPileObject } from './tools/pile-tool';
import { createStructuralJointObject } from './tools/primitive-geometry-tool';
import { createServiceCrossingObject } from './tools/service-crossing-tool';
import { createServiceRunObject } from './tools/service-run-tool';

export type PileGroupWithSources = PileGroup & {
  piles?: Pile[];
  layoutPoints?: PileLayoutPoint[];
  updatedAt?: string;
};

export type DraftingPileTypeSourceRecord = {
  sourceType: 'foundation_pile_type';
  sourceId: string;
  sourceLabel: string;
  groupId: string;
  groupName: string;
  sourceVersion?: string;
  originModule?: string;
  sourcePath?: string;
  pileType: MultiPilePileTypeDefinition;
};

export type DraftingPileSourceRecord = {
  sourceType: 'foundation_pile' | 'foundation_joint';
  sourceId: string;
  sourceLabel: string;
  groupId: string;
  groupName: string;
  sourceVersion?: string;
  originModule?: string;
  sourcePath?: string;
  pile?: Pile;
  layoutPoint?: PileLayoutPoint;
  joint?: MultiPileJoint;
  pileType?: MultiPilePileTypeDefinition;
};

export type DraftingPileTypeCompleteness = {
  status: 'complete' | 'partial' | 'diameter_only' | 'missing_key_fields';
  missing: string[];
};

export type DraftingSpatialSourceRecord = {
  sourceType: 'spatial_feature';
  sourceId: string;
  sourceLabel: string;
  objectType: Extract<
    DraftingObject['type'],
    'borehole' | 'monitoring_point' | 'service_run' | 'service_crossing'
  >;
  originModule?: string;
  sourcePath?: string;
  feature: ProjectSpatialFeature;
};

export function buildDraftingPileTypeSourceRecordsFromRegistry(
  registry: ProjectEngineeringSourceRegistry | undefined,
): DraftingPileTypeSourceRecord[] {
  return (registry?.sources.foundation.pileTypes ?? []).flatMap((source) => {
    const pileType = pileTypeFromRegistrySource(source);
    if (!pileType) {
      return [];
    }
    return [
      {
        sourceType: 'foundation_pile_type' as const,
        sourceId: source.sourceId,
        sourceLabel: source.sourceLabel,
        groupId: String(source.snapshot.pileGroupId ?? ''),
        groupName: String(source.snapshot.pileGroupName ?? 'Foundation source'),
        sourceVersion: source.sourceVersion,
        originModule: source.originModule,
        sourcePath: source.sourcePath,
        pileType,
      },
    ];
  });
}

export function buildDraftingPileSourceRecordsFromRegistry(
  registry: ProjectEngineeringSourceRegistry | undefined,
): DraftingPileSourceRecord[] {
  return (registry?.sources.foundation.placedPiles ?? []).map((source) => {
    const pileType = pileTypeFromRegistrySource(source);
    const joint = multiPileJointFromRegistrySource(source);
    const pile = pileFromRegistrySource(source);
    const layoutPoint = layoutPointFromRegistrySource(source);
    return {
      sourceType: source.sourceType,
      sourceId: source.sourceId,
      sourceLabel: source.sourceLabel,
      groupId: String(source.snapshot.pileGroupId ?? ''),
      groupName: String(source.snapshot.pileGroupName ?? 'Foundation source'),
      sourceVersion: source.sourceVersion,
      originModule: source.originModule,
      sourcePath: source.sourcePath,
      ...(pile ? { pile } : {}),
      ...(layoutPoint ? { layoutPoint } : {}),
      ...(joint ? { joint } : {}),
      ...(pileType ? { pileType } : {}),
    };
  });
}

export function buildDraftingSpatialSourceRecordsFromRegistry(
  registry: ProjectEngineeringSourceRegistry | undefined,
): DraftingSpatialSourceRecord[] {
  const boreholes = (registry?.sources.geotech.boreholes ?? []).map((source) =>
    spatialRecordFromRegistrySource(source, 'borehole'),
  );
  const monitoring = (registry?.sources.monitoring.monitoringPoints ?? []).map((source) =>
    spatialRecordFromRegistrySource(source, 'monitoring_point'),
  );
  const registryServices = registry?.sources.services
    ? [...registry.sources.services.serviceRuns, ...registry.sources.services.serviceCrossings]
    : (registry?.sources.spatial.services ?? []);
  const services = registryServices.flatMap((source) => {
    if (source.snapshot.objectType === 'service_crossing') {
      return [spatialRecordFromRegistrySource(source, 'service_crossing')];
    }
    return [spatialRecordFromRegistrySource(source, 'service_run')];
  });

  return [...boreholes, ...monitoring, ...services].filter(
    (source): source is DraftingSpatialSourceRecord => Boolean(source),
  );
}

export function buildDraftingPileSourceRecords(
  pileGroups: PileGroupWithSources[] | undefined,
): DraftingPileSourceRecord[] {
  return (pileGroups ?? []).flatMap((group) => {
    const multiPile = getMultiPileState(group);
    const pileTypes = multiPile.pileTypes;
    const normalizedPileSources = (group.piles ?? []).map((pile) => {
      const layoutPoint = (group.layoutPoints ?? []).find((point) => point.pileId === pile.id);
      return {
        sourceType: 'foundation_pile' as const,
        sourceId: pile.id,
        sourceLabel: layoutPoint?.label || pile.name,
        groupId: group.id,
        groupName: group.name,
        sourceVersion: group.updatedAt,
        pile,
        ...(layoutPoint ? { layoutPoint } : {}),
      };
    });
    const multiPileJointSources = multiPile.joints.map((joint) => {
      const pileType = pileTypes.find((candidate) => candidate.id === joint.pileTypeId);
      return {
        sourceType: 'foundation_pile' as const,
        sourceId: `${group.id}:joint:${joint.id}`,
        sourceLabel: joint.displayName || joint.jointDisplayName || joint.id,
        groupId: group.id,
        groupName: group.name,
        sourceVersion: group.updatedAt,
        joint,
        ...(pileType ? { pileType } : {}),
      };
    });

    return [...normalizedPileSources, ...multiPileJointSources];
  });
}

export function buildDraftingPileTypeSourceRecords(
  pileGroups: PileGroupWithSources[] | undefined,
): DraftingPileTypeSourceRecord[] {
  return (pileGroups ?? []).flatMap((group) =>
    getMultiPileState(group).pileTypes.map((pileType) => ({
      sourceType: 'foundation_pile_type' as const,
      sourceId: `${group.id}:type:${pileType.id}`,
      sourceLabel: pileType.displayName || pileType.id,
      groupId: group.id,
      groupName: group.name,
      sourceVersion: group.updatedAt,
      pileType,
    })),
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
}): DraftingObject {
  const now = new Date().toISOString();
  const point =
    pointFromPileLayout(args.source.layoutPoint) ??
    pointFromMultiPileJoint(args.source.joint) ??
    args.fallbackPoint;
  if (args.source.sourceType === 'foundation_joint' || args.source.joint) {
    const joint = createStructuralJointObject(point, args.model);
    return {
      ...joint,
      name: args.source.sourceLabel,
      parameters: {
        ...joint.parameters,
        jointId: args.source.joint?.id ?? args.source.sourceLabel,
        label: args.source.sourceLabel,
      },
      metadata: {
        ...joint.metadata,
        notes: sourceNotes([
          args.source.groupName,
          args.source.pileType ? `Pile type ${args.source.pileType.id}` : undefined,
        ]),
      },
      sourceRef: {
        sourceType: 'foundation_joint',
        sourceId: args.source.sourceId,
        sourceLabel: args.source.sourceLabel,
        sourceVersion: args.source.sourceVersion,
        linkedAt: now,
        ...(args.linkedBy ? { linkedBy: args.linkedBy } : {}),
        status: 'linked',
        snapshot: {
          pileGroupId: args.source.groupId,
          pileGroupName: args.source.groupName,
          joint: args.source.joint,
          pileTypeDefinition: args.source.pileType,
          sourceCoordinates: point,
          originModule: args.source.originModule,
          sourcePath: args.source.sourcePath,
        },
      },
      updatedAt: now,
    };
  }
  const base = createPileObject(point, args.model);
  const diameterMm =
    normalizePileDiameterMm(args.source.pile?.diameter) ??
    pileTypeDiameterMm(args.source.pileType) ??
    base.geometry.diameterMm;
  const pileType = args.source.pile
    ? mapPileTypeToDraftingPileType(args.source.pile.pileType)
    : undefined;

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
      ...(args.source.pileType ? pileTypeMetadata(args.source.pileType) : {}),
      ...(pileType ? { pileType } : {}),
      notes: sourceNotes([
        args.source.groupName,
        optionalNumberNote('length', args.source.pile?.length, 'm'),
        optionalNumberNote('embedment', args.source.pile?.embedmentDepth, 'm'),
      ]),
    },
    sourceRef: {
      sourceType: 'foundation_pile',
      sourceId: args.source.sourceId,
      sourceLabel: args.source.sourceLabel,
      sourceVersion: args.source.sourceVersion,
      linkedAt: now,
      ...(args.linkedBy ? { linkedBy: args.linkedBy } : {}),
      status: 'linked',
      snapshot: {
        pileId: args.source.pile?.id,
        pileName: args.source.pile?.name ?? args.source.sourceLabel,
        pileGroupId: args.source.groupId,
        pileGroupName: args.source.groupName,
        pileType: args.source.pile?.pileType,
        diameter: args.source.pile?.diameter,
        diameterMm,
        length: args.source.pile?.length,
        embedmentDepth: args.source.pile?.embedmentDepth,
        rakeAngle: args.source.pile?.rakeAngle,
        materialId: args.source.pile?.materialId,
        properties: args.source.pile?.properties,
        layoutPoint: args.source.layoutPoint,
        joint: args.source.joint,
        pileTypeDefinition: args.source.pileType,
        sourceCoordinates: point,
        originModule: args.source.originModule,
        sourcePath: args.source.sourcePath,
      },
    },
    updatedAt: now,
  };
}

export function createPileObjectFromTypeSource(args: {
  source: DraftingPileTypeSourceRecord;
  point: DraftingPoint;
  linkedBy?: string | null;
  model: DraftingModel;
}): DraftingPileObject {
  const now = new Date().toISOString();
  const base = createPileObject(args.point, args.model);
  const temporaryMark = nextTemporaryPileMark(args.model);
  const diameterMm = pileTypeDiameterMm(args.source.pileType) ?? base.geometry.diameterMm;

  return {
    ...base,
    name: temporaryMark,
    geometry: {
      ...base.geometry,
      centre: args.point,
      diameterMm,
    },
    metadata: {
      ...base.metadata,
      pileId: temporaryMark,
      ...pileTypeMetadata(args.source.pileType),
      notes: sourceNotes([
        args.source.groupName,
        'Placed from pile type; pile instance not assigned',
        args.source.pileType.notes,
      ]),
    },
    sourceRef: {
      sourceType: 'foundation_pile_type',
      sourceId: args.source.sourceId,
      sourceLabel: args.source.sourceLabel,
      sourceVersion: args.source.sourceVersion,
      linkedAt: now,
      ...(args.linkedBy ? { linkedBy: args.linkedBy } : {}),
      status: 'current',
      snapshot: {
        pileTypeId: args.source.pileType.id,
        pileTypeCode: args.source.pileType.id,
        pileTypeName: args.source.pileType.displayName,
        pileGroupId: args.source.groupId,
        pileGroupName: args.source.groupName,
        diameterMm,
        completeness: getPileTypeCompleteness(args.source.pileType),
        pileTypeDefinition: args.source.pileType,
        originModule: args.source.originModule,
        sourcePath: args.source.sourcePath,
      },
    },
    updatedAt: now,
  };
}

export function refreshPileObjectFromSource(args: {
  object: DraftingPileObject;
  pileSources: DraftingPileSourceRecord[];
  pileTypeSources: DraftingPileTypeSourceRecord[];
  updateCoordinates?: boolean;
}): DraftingPileObject {
  const sourceRef = args.object.sourceRef;
  if (!sourceRef?.sourceId || sourceRef.sourceType === 'manual') {
    return args.object;
  }

  if (sourceRef.sourceType === 'foundation_pile_type') {
    const source = args.pileTypeSources.find(
      (candidate) => candidate.sourceId === sourceRef.sourceId,
    );
    if (!source) {
      return markMissingSource(args.object);
    }
    const refreshed = createPileObjectFromTypeSource({
      source,
      point: args.object.geometry.centre,
      model: { objects: [] } as unknown as DraftingModel,
    });
    return preservePileObjectIdentity(args.object, refreshed);
  }

  if (sourceRef.sourceType === 'foundation_pile') {
    const source = args.pileSources.find((candidate) => candidate.sourceId === sourceRef.sourceId);
    if (!source) {
      return markMissingSource(args.object);
    }
    const refreshed = createPileObjectFromSource({
      source,
      fallbackPoint: args.object.geometry.centre,
      model: { objects: [] } as unknown as DraftingModel,
    });
    if (refreshed.type !== 'pile') {
      return args.object;
    }
    const sourcePoint =
      pointFromPileLayout(source.layoutPoint) ?? pointFromMultiPileJoint(source.joint);
    return preservePileObjectIdentity(args.object, {
      ...refreshed,
      geometry: {
        ...refreshed.geometry,
        centre: args.updateCoordinates && sourcePoint ? sourcePoint : args.object.geometry.centre,
      },
    });
  }

  return args.object;
}

export function refreshStructuralJointObjectFromSource(args: {
  object: DraftingStructuralJointObject;
  pileSources: DraftingPileSourceRecord[];
  updateCoordinates?: boolean;
}): DraftingStructuralJointObject {
  const sourceRef = args.object.sourceRef;
  if (!sourceRef?.sourceId || sourceRef.sourceType === 'manual') {
    return args.object;
  }
  const source = args.pileSources.find((candidate) => candidate.sourceId === sourceRef.sourceId);
  if (!source) {
    return markMissingStructuralJointSource(args.object);
  }
  const refreshed = createPileObjectFromSource({
    source,
    fallbackPoint: args.object.geometry.point,
    model: { objects: [] } as unknown as DraftingModel,
  });
  if (refreshed.type !== 'structural_joint') {
    return markMissingStructuralJointSource(args.object);
  }
  return {
    ...args.object,
    name: refreshed.name,
    geometry: args.updateCoordinates ? refreshed.geometry : args.object.geometry,
    parameters: {
      ...refreshed.parameters,
      loadEnabled: args.object.parameters.loadEnabled,
      loadCase: args.object.parameters.loadCase,
      loadCombination: args.object.parameters.loadCombination,
      fxKn: args.object.parameters.fxKn,
      fyKn: args.object.parameters.fyKn,
      fzKn: args.object.parameters.fzKn,
      verticalLoadKn: args.object.parameters.verticalLoadKn,
      units: args.object.parameters.units,
    },
    metadata: {
      ...args.object.metadata,
      ...refreshed.metadata,
    },
    sourceRef: refreshed.sourceRef,
    updatedAt: new Date().toISOString(),
  };
}

export function refreshSpatialObjectFromSource(args: {
  object: Extract<
    DraftingObject,
    { type: 'borehole' | 'monitoring_point' | 'service_run' | 'service_crossing' }
  >;
  spatialSources: DraftingSpatialSourceRecord[];
  updateCoordinates?: boolean;
}): DraftingObject {
  const sourceRef = args.object.sourceRef;
  if (!sourceRef?.sourceId || sourceRef.sourceType === 'manual') {
    return args.object;
  }
  const source = args.spatialSources.find((candidate) => candidate.sourceId === sourceRef.sourceId);
  if (!source) {
    return markMissingSpatialSource(args.object);
  }
  const fallbackPoint = getObjectReferencePoint(args.object);
  const refreshed = createDraftingObjectFromSpatialSource({
    source,
    fallbackPoint,
    model: { objects: [] } as unknown as DraftingModel,
  });
  return preserveSpatialObjectIdentity(args.object, refreshed, {
    updateCoordinates: args.updateCoordinates,
  });
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

export function getPileTypeCompleteness(
  pileType: MultiPilePileTypeDefinition,
): DraftingPileTypeCompleteness {
  const missing: string[] = [];
  const hasDiameter = Boolean(pileTypeDiameterMm(pileType));
  const hasConcrete = Boolean(stringValue(pileType.concreteGrade));
  const hasFounding =
    optionalNumber(pileType.socketLengthM) !== undefined ||
    optionalNumber(pileType.socketLengthMm) !== undefined ||
    Boolean(stringValue(pileType.foundingStratum)) ||
    Boolean(stringValue(pileType.foundingNote));

  if (!hasDiameter) {
    missing.push('diameter');
  }
  if (!hasConcrete) {
    missing.push('concrete');
  }
  if (!hasFounding) {
    missing.push('socket/founding');
  }

  const status =
    missing.length === 0
      ? 'complete'
      : !hasDiameter
        ? 'missing_key_fields'
        : !hasConcrete && !hasFounding
          ? 'diameter_only'
          : 'partial';

  return {
    status,
    missing,
  };
}

export function formatPileTypeSourceSummary(source: DraftingPileTypeSourceRecord) {
  const pileType = source.pileType;
  const diameter = pileTypeDiameterMm(pileType);
  const parts = [source.sourceLabel];
  if (diameter) {
    parts.push(`${diameter} mm`);
  }
  if (stringValue(pileType.concreteGrade)) {
    parts.push(stringValue(pileType.concreteGrade));
  }
  const socket = optionalNumber(pileType.socketLengthM);
  if (socket !== undefined) {
    parts.push(`socket ${socket} m`);
  } else if (stringValue(pileType.foundingStratum)) {
    parts.push(stringValue(pileType.foundingStratum));
  }
  const completeness = getPileTypeCompleteness(pileType);
  if (completeness.status !== 'complete') {
    parts.push(`missing ${completeness.missing.join('/')}`);
  }
  return parts.join(' · ');
}

export function formatPileInstanceSourceSummary(source: DraftingPileSourceRecord) {
  const point = pointFromPileLayout(source.layoutPoint) ?? pointFromMultiPileJoint(source.joint);
  const typeSummary = source.pileType
    ? formatPileTypeSourceSummary({
        sourceType: 'foundation_pile_type',
        sourceId: `${source.groupId}:type:${source.pileType.id}`,
        sourceLabel: source.pileType.displayName || source.pileType.id,
        groupId: source.groupId,
        groupName: source.groupName,
        sourceVersion: source.sourceVersion,
        pileType: source.pileType,
      })
    : undefined;
  return sourceNotes([
    source.sourceLabel,
    point ? `X ${point.x}, Y ${point.y}` : undefined,
    typeSummary,
  ]);
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
      diameterMm: optionalNumber(properties.diameterMm) ?? base.parameters.diameterMm,
      depthM: optionalNumber(properties.depthM) ?? base.parameters.depthM,
      levelRl: optionalNumber(properties.levelRL) ?? base.parameters.levelRl,
      authority: stringValue(properties.authority),
    },
    metadata: {
      ...base.metadata,
      sourceReference: stringValue(properties.sourceReference) || feature.sourceReference || '',
      surveyConfidence: stringValue(properties.surveyConfidence) || base.metadata.surveyConfidence,
      notes: sourceNotes([
        feature.description ?? undefined,
        stringValue(properties.notes),
        stringValue(properties.material) ? `Material ${stringValue(properties.material)}` : '',
      ]),
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
      conflictType: normalizeConflictType(properties.conflictType),
      riskStatus: normalizeRiskStatus(properties.riskStatus),
    },
    metadata: {
      ...base.metadata,
      linkedServiceRunId: stringValue(properties.linkedServiceSourceId),
      notes: sourceNotes([feature.description ?? undefined, stringValue(properties.notes)]),
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
      objectType:
        feature.featureType === 'service_run'
          ? 'service_run'
          : feature.featureType === 'service_crossing'
            ? 'service_crossing'
            : undefined,
      originModule: 'spatial',
      sourcePath: 'project_spatial_features',
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

  if (feature.featureType === 'service_run') {
    return feature.geometryType === 'line_string' ? 'service_run' : null;
  }

  if (feature.featureType === 'service_crossing') {
    return feature.geometryType === 'point' ? 'service_crossing' : null;
  }

  return null;
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

function pointFromMultiPileJoint(joint: MultiPileJoint | undefined): DraftingPoint | null {
  if (!joint || !Number.isFinite(joint.x) || !Number.isFinite(joint.y)) {
    return null;
  }

  return {
    x: joint.x,
    y: joint.y,
    ...(Number.isFinite(joint.z) ? { z: joint.z } : {}),
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

function pileTypeDiameterMm(pileType: MultiPilePileTypeDefinition | undefined) {
  return (
    normalizePileDiameterMm(pileType?.nominalDiameterMm) ??
    normalizePileDiameterMm(pileType?.Dmm) ??
    normalizePileDiameterMm(pileType?.customMm)
  );
}

function pileTypeMetadata(
  pileType: MultiPilePileTypeDefinition,
): Partial<DraftingPileObject['metadata']> {
  return {
    pileType: 'bored',
    pileTypeCode: pileType.id,
    pileSystem: stringValue(pileType.pileSystem) || 'pile type library',
    sourceCompleteness: getPileTypeCompleteness(pileType).status,
    sourceStatus: pileType.status ?? 'draft',
    ...(stringValue(pileType.concreteGrade)
      ? { concreteGrade: stringValue(pileType.concreteGrade) }
      : {}),
    ...(optionalNumber(pileType.socketLengthM) !== undefined
      ? { socketLengthM: optionalNumber(pileType.socketLengthM) }
      : {}),
    ...(stringValue(pileType.foundingStratum)
      ? { foundingStratum: stringValue(pileType.foundingStratum) }
      : {}),
    ...(stringValue(pileType.foundingNote)
      ? { foundingNote: stringValue(pileType.foundingNote) }
      : {}),
    ...(optionalNumber(pileType.designCompressionKn) !== undefined
      ? { designCompressionKn: optionalNumber(pileType.designCompressionKn) }
      : Number.isFinite(pileType.compressionUltimateMax)
        ? { designCompressionKn: pileType.compressionUltimateMax as number }
        : {}),
    ...(optionalNumber(pileType.designTensionKn) !== undefined
      ? { designTensionKn: optionalNumber(pileType.designTensionKn) }
      : Number.isFinite(pileType.tensionUltimateMax)
        ? { designTensionKn: pileType.tensionUltimateMax as number }
        : {}),
    ...(optionalNumber(pileType.designLateralKn) !== undefined
      ? { designLateralKn: optionalNumber(pileType.designLateralKn) }
      : {}),
    ...(stringValue(pileType.durabilityExposureNote)
      ? { durabilityExposureNote: stringValue(pileType.durabilityExposureNote) }
      : {}),
    ...(stringValue(pileType.constructionNote)
      ? { constructionNote: stringValue(pileType.constructionNote) }
      : {}),
    ...(stringValue(pileType.notes) || stringValue(pileType.constructionNote)
      ? {
          notes: sourceNotes([stringValue(pileType.notes), stringValue(pileType.constructionNote)]),
        }
      : {}),
  };
}

function nextTemporaryPileMark(model: DraftingModel) {
  const used = new Set(
    model.objects
      .filter((object): object is DraftingPileObject => object.type === 'pile')
      .map((object) => object.metadata.pileId),
  );
  let index = 1;
  while (used.has(`P-NEW-${String(index).padStart(3, '0')}`)) {
    index += 1;
  }
  return `P-NEW-${String(index).padStart(3, '0')}`;
}

function preservePileObjectIdentity(
  original: DraftingPileObject,
  refreshed: DraftingPileObject,
): DraftingPileObject {
  return {
    ...original,
    name: original.name,
    geometry: refreshed.geometry,
    metadata: {
      ...original.metadata,
      ...refreshed.metadata,
      pileId: original.metadata.pileId,
    },
    sourceRef: refreshed.sourceRef,
    updatedAt: new Date().toISOString(),
  };
}

function markMissingSpatialSource(
  object: Extract<
    DraftingObject,
    { type: 'borehole' | 'monitoring_point' | 'service_run' | 'service_crossing' }
  >,
): DraftingObject {
  return {
    ...object,
    sourceRef: object.sourceRef
      ? {
          ...object.sourceRef,
          status: 'missing_source',
        }
      : object.sourceRef,
    updatedAt: new Date().toISOString(),
  };
}

function preserveSpatialObjectIdentity(
  original: Extract<
    DraftingObject,
    { type: 'borehole' | 'monitoring_point' | 'service_run' | 'service_crossing' }
  >,
  refreshed: DraftingObject,
  options: { updateCoordinates?: boolean },
): DraftingObject {
  if (original.type !== refreshed.type) {
    return markMissingSpatialSource(original);
  }
  return {
    ...original,
    name: refreshed.name,
    ...('parameters' in refreshed ? { parameters: refreshed.parameters } : {}),
    metadata: {
      ...original.metadata,
      ...refreshed.metadata,
    },
    geometry: options.updateCoordinates ? refreshed.geometry : original.geometry,
    sourceRef: refreshed.sourceRef,
    updatedAt: new Date().toISOString(),
  } as DraftingObject;
}

function getObjectReferencePoint(
  object: Extract<
    DraftingObject,
    { type: 'borehole' | 'monitoring_point' | 'service_run' | 'service_crossing' }
  >,
): DraftingPoint {
  switch (object.type) {
    case 'borehole':
      return object.geometry.point;
    case 'monitoring_point':
      return object.geometry.point;
    case 'service_crossing':
      return object.geometry.crossingPoint;
    case 'service_run':
      return object.geometry.path[0] ?? { x: 0, y: 0 };
  }
}

function pileTypeFromRegistrySource(
  source: FoundationPileTypeSource | FoundationPlacedPileSource,
): MultiPilePileTypeDefinition | null {
  const candidate = source.snapshot.pileTypeDefinition;
  return isMultiPilePileType(candidate) ? candidate : null;
}

function multiPileJointFromRegistrySource(
  source: FoundationPlacedPileSource,
): MultiPileJoint | null {
  const candidate = source.snapshot.joint;
  return isMultiPileJoint(candidate) ? candidate : null;
}

function pileFromRegistrySource(source: FoundationPlacedPileSource): Pile | null {
  const candidate = source.snapshot.pile;
  if (
    candidate &&
    typeof candidate === 'object' &&
    typeof (candidate as { id?: unknown }).id === 'string' &&
    typeof (candidate as { name?: unknown }).name === 'string'
  ) {
    return candidate as Pile;
  }
  return null;
}

function layoutPointFromRegistrySource(source: FoundationPlacedPileSource): PileLayoutPoint | null {
  const candidate = source.snapshot.layoutPoint;
  if (
    candidate &&
    typeof candidate === 'object' &&
    typeof (candidate as { id?: unknown }).id === 'string' &&
    Number.isFinite((candidate as { x?: unknown }).x) &&
    Number.isFinite((candidate as { y?: unknown }).y)
  ) {
    return candidate as PileLayoutPoint;
  }
  if (source.coordinates) {
    return {
      id: `${source.sourceId}:coordinates`,
      pileGroupId: String(source.snapshot.pileGroupId ?? ''),
      x: source.coordinates.x,
      y: source.coordinates.y,
      z: source.coordinates.z ?? 0,
      label: source.sourceLabel,
    };
  }
  return null;
}

function spatialRecordFromRegistrySource(
  source: GeotechBoreholeSource | MonitoringPointSource | SpatialServiceSource,
  objectType: DraftingSpatialSourceRecord['objectType'],
): DraftingSpatialSourceRecord | null {
  const feature = featureFromRegistrySource(source);
  if (!feature) {
    return null;
  }
  return {
    sourceType: 'spatial_feature',
    sourceId: source.sourceId,
    sourceLabel: source.sourceLabel,
    objectType,
    originModule: source.originModule,
    sourcePath: source.sourcePath,
    feature,
  };
}

function featureFromRegistrySource(
  source: GeotechBoreholeSource | MonitoringPointSource | SpatialServiceSource,
): ProjectSpatialFeature | null {
  const candidate = source.snapshot.feature;
  if (
    candidate &&
    typeof candidate === 'object' &&
    typeof (candidate as { id?: unknown }).id === 'string' &&
    typeof (candidate as { label?: unknown }).label === 'string'
  ) {
    const record = candidate as Record<string, unknown>;
    return {
      id: String(record.id),
      projectId: String(record.projectId ?? ''),
      featureType: String(record.featureType) as ProjectSpatialFeatureType,
      geometryType: String(record.geometryType) as ProjectSpatialFeature['geometryType'],
      label: String(record.label),
      description: typeof record.description === 'string' ? record.description : null,
      geometryJson: record.geometryJson as ProjectSpatialGeometryJson,
      status: typeof record.status === 'string' ? record.status : null,
      sourceType:
        typeof record.sourceType === 'string'
          ? (record.sourceType as ProjectSpatialFeature['sourceType'])
          : null,
      sourceReference: typeof record.sourceReference === 'string' ? record.sourceReference : null,
      linkedProjectReferenceId:
        typeof record.linkedProjectReferenceId === 'string'
          ? record.linkedProjectReferenceId
          : null,
      linkedAiDocumentId:
        typeof record.linkedAiDocumentId === 'string' ? record.linkedAiDocumentId : null,
      linkedDeliverableType:
        typeof record.linkedDeliverableType === 'string'
          ? (record.linkedDeliverableType as ProjectSpatialFeature['linkedDeliverableType'])
          : null,
      linkedDeliverableId:
        typeof record.linkedDeliverableId === 'string' ? record.linkedDeliverableId : null,
      propertiesJson: recordObject(record.propertiesJson),
      sortOrder: optionalNumber(record.sortOrder) ?? 0,
      createdAt:
        typeof record.createdAt === 'string' ? record.createdAt : new Date(0).toISOString(),
      updatedAt:
        typeof record.updatedAt === 'string' ? record.updatedAt : new Date(0).toISOString(),
    };
  }
  return null;
}

function recordObject(value: unknown): Record<string, unknown> | null {
  if (!value) {
    return null;
  }
  return typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function markMissingSource(object: DraftingPileObject): DraftingPileObject {
  return {
    ...object,
    sourceRef: object.sourceRef
      ? {
          ...object.sourceRef,
          status: 'missing_source',
        }
      : object.sourceRef,
    updatedAt: new Date().toISOString(),
  };
}

function markMissingStructuralJointSource(
  object: DraftingStructuralJointObject,
): DraftingStructuralJointObject {
  return {
    ...object,
    sourceRef: object.sourceRef
      ? {
          ...object.sourceRef,
          status: 'missing_source',
        }
      : object.sourceRef,
    updatedAt: new Date().toISOString(),
  };
}

function getMultiPileState(group: PileGroupWithSources): {
  pileTypes: MultiPilePileTypeDefinition[];
  joints: MultiPileJoint[];
} {
  const metadata = group.metadata;
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return { pileTypes: [], joints: [] };
  }

  const multiPile = (metadata as Record<string, unknown>).multiPile;
  if (!multiPile || typeof multiPile !== 'object' || Array.isArray(multiPile)) {
    return { pileTypes: [], joints: [] };
  }

  const record = multiPile as Record<string, unknown>;
  return {
    pileTypes: Array.isArray(record.pileTypes) ? record.pileTypes.filter(isMultiPilePileType) : [],
    joints: Array.isArray(record.joints) ? record.joints.filter(isMultiPileJoint) : [],
  };
}

function isMultiPilePileType(value: unknown): value is MultiPilePileTypeDefinition {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as { id?: unknown }).id === 'string' &&
    typeof (value as { displayName?: unknown }).displayName === 'string'
  );
}

function isMultiPileJoint(value: unknown): value is MultiPileJoint {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as { id?: unknown }).id === 'string' &&
    Number.isFinite((value as { x?: unknown }).x) &&
    Number.isFinite((value as { y?: unknown }).y) &&
    typeof (value as { pileTypeId?: unknown }).pileTypeId === 'string'
  );
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
    : 'unknown';
}

function normalizeConflictType(value: unknown): DraftingServiceConflictType {
  return DRAFTING_SERVICE_CONFLICT_TYPES.includes(value as DraftingServiceConflictType)
    ? (value as DraftingServiceConflictType)
    : 'unknown';
}

function normalizeRiskStatus(value: unknown): DraftingServiceRiskStatus {
  return DRAFTING_SERVICE_RISK_STATUSES.includes(value as DraftingServiceRiskStatus)
    ? (value as DraftingServiceRiskStatus)
    : 'open';
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
