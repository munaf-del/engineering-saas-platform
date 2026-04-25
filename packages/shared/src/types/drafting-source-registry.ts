export type DraftingSourceOriginModule =
  | 'foundations'
  | 'geotech'
  | 'spatial'
  | 'environmental'
  | 'omnidots'
  | 'manual';

export type DraftingRegistrySourceStatus =
  | 'current'
  | 'stale_possible'
  | 'missing_source'
  | 'incomplete';

export type DraftingRegistrySourceCompleteness =
  | 'complete'
  | 'partial'
  | 'diameter_only'
  | 'missing_key_fields'
  | 'unknown';

export type DraftingRegistryCoordinates = {
  x: number;
  y: number;
  z?: number;
};

export type DraftingRegistrySourceBase = {
  sourceType: string;
  sourceId: string;
  sourceLabel: string;
  sourceCode?: string;
  originModule: DraftingSourceOriginModule;
  status: DraftingRegistrySourceStatus;
  completeness: DraftingRegistrySourceCompleteness;
  coordinates?: DraftingRegistryCoordinates;
  sourcePath: string;
  sourceVersion?: string;
  usedByDraftingObjectCount?: number;
  alreadyRepresentedInDrafting?: boolean;
  existingDraftingObjectId?: string;
  snapshot: Record<string, unknown>;
  warnings?: string[];
};

export type FoundationPileTypeSource = DraftingRegistrySourceBase & {
  sourceType: 'foundation_pile_type';
  originModule: 'foundations';
  engineering: {
    code?: string;
    name?: string;
    pileSystem?: string;
    diameterMm?: number;
    concreteGrade?: string;
    socketLengthM?: number;
    socketLengthMm?: number;
    foundingStratum?: string;
    foundingNote?: string;
    designCompressionKn?: number;
    designTensionKn?: number;
    designLateralKn?: number;
    status?: string;
    notes?: string;
  };
};

export type FoundationPlacedPileSource = DraftingRegistrySourceBase & {
  sourceType: 'foundation_pile';
  originModule: 'foundations';
  engineering: {
    pileTypeCode?: string;
    pileTypeName?: string;
    pileSystem?: string;
    diameterMm?: number;
    concreteGrade?: string;
    socketLengthM?: number;
    foundingStratum?: string;
    foundingNote?: string;
    designCompressionKn?: number;
    designTensionKn?: number;
    designLateralKn?: number;
  };
};

export type GeotechBoreholeSource = DraftingRegistrySourceBase & {
  sourceType: 'geotech_borehole' | 'spatial_feature';
  originModule: 'geotech' | 'spatial';
  engineering: {
    boreholeId?: string;
    boreholeType?: string;
    groundLevelRl?: number;
    terminationDepthM?: number;
    terminationLevelRl?: number;
  };
};

export type MonitoringPointSource = DraftingRegistrySourceBase & {
  sourceType: 'monitoring_point' | 'spatial_feature';
  originModule: 'spatial' | 'environmental';
  engineering: {
    monitoringType?: string;
    monitorId?: string;
    city?: string;
    location?: string;
  };
};

export type OmnidotsMeasuringPointSource = DraftingRegistrySourceBase & {
  sourceType: 'omnidots_measuring_point';
  originModule: 'omnidots';
  engineering: {
    externalMeasuringPointId?: string;
    measuringType?: string;
    category?: string;
    timezone?: string;
    active?: boolean;
  };
};

export type SpatialFeatureSource = DraftingRegistrySourceBase & {
  sourceType: 'spatial_feature';
  originModule: 'spatial';
  category:
    | 'boundary'
    | 'reference_point'
    | 'generic'
    | 'service_run'
    | 'service_crossing'
    | 'unknown_or_heuristic';
  engineering: {
    featureType?: string;
    geometryType?: string;
    sourceType?: string;
    sourceReference?: string;
  };
};

export type SpatialServiceSource = SpatialFeatureSource & {
  category: 'service_run' | 'service_crossing';
  engineering: SpatialFeatureSource['engineering'] & {
    serviceType?: string;
    serviceStatus?: string;
    diameterMm?: number;
    depthM?: number;
    levelRL?: number;
    authority?: string;
    material?: string;
    sourceReference?: string;
    surveyConfidence?: string;
    linkedServiceSourceId?: string;
    conflictType?: string;
    clearanceMm?: number;
    riskStatus?: string;
  };
};

export type SketchManualSource = DraftingRegistrySourceBase & {
  sourceType: 'manual';
  originModule: 'manual';
};

export type ProjectEngineeringSourceRegistry = {
  projectId: string;
  generatedAt: string;
  sources: {
    foundation: {
      pileTypes: FoundationPileTypeSource[];
      placedPiles: FoundationPlacedPileSource[];
      pileGroups: DraftingRegistrySourceBase[];
      capacityProfiles: DraftingRegistrySourceBase[];
      designChecks: DraftingRegistrySourceBase[];
    };
    geotech: {
      boreholes: GeotechBoreholeSource[];
      strata: DraftingRegistrySourceBase[];
    };
    monitoring: {
      monitoringPoints: MonitoringPointSource[];
      omnidotsMeasuringPoints: OmnidotsMeasuringPointSource[];
    };
    spatial: {
      referencePoints: SpatialFeatureSource[];
      boundaries: SpatialFeatureSource[];
      features: SpatialFeatureSource[];
      services: SpatialServiceSource[];
    };
    services?: {
      serviceRuns: SpatialServiceSource[];
      serviceCrossings: SpatialServiceSource[];
      warnings: string[];
    };
  };
  warnings: string[];
};
