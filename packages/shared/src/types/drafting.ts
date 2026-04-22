export const DRAFTING_DRAWING_STATUSES = ['draft', 'issued', 'archived'] as const;
export type DraftingDrawingStatus = (typeof DRAFTING_DRAWING_STATUSES)[number];

export const DRAFTING_LAYER_IDS = [
  'underlay',
  'shoring',
  'piles',
  'anchors',
  'excavation',
  'monitoring',
  'boreholes',
  'services',
  'dimensions',
  'notes',
] as const;

export type DraftingLayerId = (typeof DRAFTING_LAYER_IDS)[number];

export const DRAFTING_OBJECT_TYPES = [
  'pile',
  'excavation_line',
  'monitoring_point',
  'leader_note',
  'secant_pile_wall',
  'soldier_pile_wall',
  'anchor_tieback',
  'capping_beam',
  'waler',
  'borehole',
  'survey_point',
  'service_line',
  'section_marker',
  'callout',
  'dimension',
  'title_block',
  'revision_block',
] as const;

export const DRAFTING_IMPLEMENTED_OBJECT_TYPES = [
  'pile',
  'excavation_line',
  'monitoring_point',
  'leader_note',
] as const;

export const DRAFTING_FUTURE_OBJECT_TYPES = [
  'secant_pile_wall',
  'soldier_pile_wall',
  'anchor_tieback',
  'capping_beam',
  'waler',
  'borehole',
  'survey_point',
  'service_line',
  'section_marker',
  'callout',
  'dimension',
  'title_block',
  'revision_block',
] as const;

export type DraftingObjectType = (typeof DRAFTING_OBJECT_TYPES)[number];
export type DraftingImplementedObjectType = (typeof DRAFTING_IMPLEMENTED_OBJECT_TYPES)[number];
export type DraftingFutureObjectType = (typeof DRAFTING_FUTURE_OBJECT_TYPES)[number];

export const DRAFTING_LINE_STYLES = ['solid', 'dashed'] as const;
export type DraftingLineStyle = (typeof DRAFTING_LINE_STYLES)[number];

export const DRAFTING_PILE_TYPES = [
  'bored',
  'cfa',
  'driven',
  'soldier',
  'secant_primary',
  'secant_secondary',
  'screw',
  'other',
] as const;

export const DRAFTING_PILE_MATERIALS = [
  'reinforced_concrete',
  'steel',
  'timber',
  'composite',
] as const;

export const DRAFTING_MONITORING_TYPES = [
  'vibration',
  'settlement',
  'inclinometer',
  'crack',
  'survey',
  'noise',
  'other',
] as const;

export type DraftingPileType = (typeof DRAFTING_PILE_TYPES)[number];
export type DraftingPileMaterial = (typeof DRAFTING_PILE_MATERIALS)[number];
export type DraftingMonitoringType = (typeof DRAFTING_MONITORING_TYPES)[number];

export type DraftingPoint = {
  x: number;
  y: number;
};

export type DraftingStyle = {
  stroke?: string;
  fill?: string;
  lineWeight?: number;
  lineStyle?: DraftingLineStyle;
  textSize?: number;
};

export type DraftingLayer = {
  id: DraftingLayerId;
  name: string;
  visible: boolean;
  locked: boolean;
  color: string;
  lineWeight: number;
};

export type DraftingUnderlayTransform = {
  x: number;
  y: number;
  scale: number;
  rotationDeg: number;
};

export type DraftingUnderlayCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type DraftingUnderlayCalibration = {
  method: 'two_point_uniform_scale';
  pdfPointA: DraftingPoint;
  pdfPointB: DraftingPoint;
  modelPointA: DraftingPoint;
  modelPointB: DraftingPoint;
  modelDistanceMm: number;
  calculatedScale: number;
  calibratedAt: string;
  warningAcknowledged: true;
};

export type DraftingUnderlay = {
  id: string;
  name: string;
  fileId: string;
  fileName: string;
  pageNumber: number;
  visible: boolean;
  opacity: number;
  locked: boolean;
  transform: DraftingUnderlayTransform;
  crop?: DraftingUnderlayCrop | null;
  calibration?: DraftingUnderlayCalibration | null;
  createdAt: string;
  updatedAt: string;
};

export type DraftingObjectBase = {
  id: string;
  type: DraftingObjectType;
  layerId: DraftingLayerId;
  name?: string;
  locked?: boolean;
  visible?: boolean;
  style?: DraftingStyle;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type DraftingPileObject = DraftingObjectBase & {
  type: 'pile';
  geometry: {
    centre: DraftingPoint;
    diameterMm: number;
  };
  metadata: {
    pileId: string;
    pileType?: DraftingPileType;
    material?: DraftingPileMaterial;
    cutOffLevel?: number;
    toeLevel?: number;
    notes?: string;
  };
};

export type DraftingExcavationLineObject = DraftingObjectBase & {
  type: 'excavation_line';
  geometry: {
    points: DraftingPoint[];
    closed?: boolean;
  };
  metadata: {
    excavationId?: string;
    stage?: string;
    designLevel?: number;
    notes?: string;
  };
};

export type DraftingMonitoringPointObject = DraftingObjectBase & {
  type: 'monitoring_point';
  geometry: {
    point: DraftingPoint;
  };
  metadata: {
    pointId: string;
    monitoringType: DraftingMonitoringType;
    triggerLevel?: number;
    actionLevel?: number;
    units?: string;
    notes?: string;
  };
};

export type DraftingLeaderNoteObject = DraftingObjectBase & {
  type: 'leader_note';
  geometry: {
    anchor: DraftingPoint;
    textPoint: DraftingPoint;
  };
  metadata: {
    text: string;
  };
};

export type DraftingPlaceholderObject = DraftingObjectBase & {
  type: DraftingFutureObjectType;
  geometry: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export type DraftingObject =
  | DraftingPileObject
  | DraftingExcavationLineObject
  | DraftingMonitoringPointObject
  | DraftingLeaderNoteObject
  | DraftingPlaceholderObject;

export type DraftingModel = {
  version: 1;
  units: 'mm';
  drawingId: string;
  view: {
    scale: number;
    offsetX: number;
    offsetY: number;
  };
  layers: DraftingLayer[];
  underlays: DraftingUnderlay[];
  objects: DraftingObject[];
};

export interface DraftingDrawingSummary {
  id: string;
  projectId: string;
  title: string;
  status: DraftingDrawingStatus;
  currentRevision: number;
  modelVersion: number;
  objectCount: number;
  createdById: string | null;
  updatedById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DraftingRevision {
  id: string;
  drawingId: string;
  projectId: string;
  revisionNumber: number;
  title: string;
  notes: string | null;
  modelJsonSnapshot: DraftingModel;
  createdById: string | null;
  createdAt: string;
}

export interface DraftingDrawing extends DraftingDrawingSummary {
  model: DraftingModel;
  revisions: DraftingRevision[];
}

export interface CreateDraftingDrawingInput {
  title: string;
}

export interface UpdateDraftingDrawingInput {
  title?: string;
  status?: DraftingDrawingStatus;
}

export interface SaveDraftingModelInput {
  model: DraftingModel;
}

export const DEFAULT_DRAFTING_LAYERS: DraftingLayer[] = [
  {
    id: 'underlay',
    name: 'Underlay',
    visible: true,
    locked: false,
    color: '#94a3b8',
    lineWeight: 1,
  },
  {
    id: 'shoring',
    name: 'Shoring',
    visible: true,
    locked: false,
    color: '#b45309',
    lineWeight: 2,
  },
  {
    id: 'piles',
    name: 'Piles',
    visible: true,
    locked: false,
    color: '#1d4ed8',
    lineWeight: 2,
  },
  {
    id: 'anchors',
    name: 'Anchors',
    visible: true,
    locked: false,
    color: '#0f766e',
    lineWeight: 2,
  },
  {
    id: 'excavation',
    name: 'Excavation',
    visible: true,
    locked: false,
    color: '#b91c1c',
    lineWeight: 2,
  },
  {
    id: 'monitoring',
    name: 'Monitoring',
    visible: true,
    locked: false,
    color: '#7c3aed',
    lineWeight: 2,
  },
  {
    id: 'boreholes',
    name: 'Boreholes',
    visible: true,
    locked: false,
    color: '#0f766e',
    lineWeight: 2,
  },
  {
    id: 'services',
    name: 'Services',
    visible: true,
    locked: false,
    color: '#475569',
    lineWeight: 2,
  },
  {
    id: 'dimensions',
    name: 'Dimensions',
    visible: true,
    locked: false,
    color: '#334155',
    lineWeight: 1,
  },
  {
    id: 'notes',
    name: 'Notes',
    visible: true,
    locked: false,
    color: '#111827',
    lineWeight: 1,
  },
];

export function createDefaultDraftingLayers(): DraftingLayer[] {
  return DEFAULT_DRAFTING_LAYERS.map((layer) => ({ ...layer }));
}

export function createEmptyDraftingModel(drawingId: string): DraftingModel {
  return {
    version: 1,
    units: 'mm',
    drawingId,
    view: {
      scale: 0.05,
      offsetX: 160,
      offsetY: 160,
    },
    layers: createDefaultDraftingLayers(),
    underlays: [],
    objects: [],
  };
}

export function defaultLayerIdForDraftingObjectType(type: DraftingObjectType): DraftingLayerId {
  switch (type) {
    case 'pile':
      return 'piles';
    case 'excavation_line':
      return 'excavation';
    case 'monitoring_point':
      return 'monitoring';
    case 'leader_note':
      return 'notes';
    case 'anchor_tieback':
    case 'waler':
    case 'capping_beam':
      return 'anchors';
    case 'borehole':
    case 'survey_point':
      return 'boreholes';
    case 'service_line':
      return 'services';
    case 'dimension':
      return 'dimensions';
    default:
      return 'shoring';
  }
}
