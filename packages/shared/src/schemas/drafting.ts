import { z } from 'zod';
import {
  DRAFTING_CALLOUT_ARROW_STYLES,
  DRAFTING_CALLOUT_LEADER_STYLES,
  DRAFTING_DIMENSION_UNITS,
  DRAFTING_DISPLAY_UNITS,
  DRAFTING_DRAWING_SHEET_ISSUE_STATUSES,
  DRAFTING_DRAWING_TRANSMITTAL_STATUSES,
  DRAFTING_DRAWING_SHEET_VIEWPORT_FIT_MODES,
  DRAFTING_DRAWING_STATUSES,
  DRAFTING_FUTURE_OBJECT_TYPES,
  DRAFTING_LAYER_IDS,
  DRAFTING_LINE_WEIGHT_MODES,
  DRAFTING_LINE_STYLES,
  DRAFTING_MONITORING_TYPES,
  DRAFTING_MODEL_UNITS,
  DRAFTING_OBJECT_TYPES,
  DRAFTING_OBJECT_PROVENANCE_ACTIONS,
  DRAFTING_PILE_MATERIALS,
  DRAFTING_PILE_TYPES,
  DRAFTING_SCHEDULE_PACK_ISSUE_STATUSES,
  DRAFTING_SCHEDULE_SHEET_ORIENTATIONS,
  DRAFTING_SCHEDULE_SHEET_PAGE_SIZES,
  DRAFTING_SCHEDULE_SHEET_TABLE_DENSITIES,
  DRAFTING_SCHEDULE_SHEET_TEMPLATE_SNAPSHOT_SOURCES,
  DRAFTING_SECTION_ARROW_DIRECTIONS,
  DRAFTING_SECANT_PRIMARY_SECONDARY_PATTERNS,
  DRAFTING_SECANT_TYPES,
  DRAFTING_SERVICE_CONFLICT_TYPES,
  DRAFTING_SERVICE_RISK_STATUSES,
  DRAFTING_SERVICE_STATUSES,
  DRAFTING_SERVICE_TYPES,
  DRAFTING_TEXT_SCALE_MODES,
  DRAFTING_TITLE_BLOCK_STATUSES,
} from '../types/drafting.js';

const DraftingPointSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
});

const DraftingStyleSchema = z.object({
  stroke: z.string().optional(),
  fill: z.string().optional(),
  lineWeight: z.number().finite().optional(),
  lineWeightMm: z.number().finite().positive().optional(),
  lineStyle: z.enum(DRAFTING_LINE_STYLES).optional(),
  textSize: z.number().finite().optional(),
});

const DraftingModelPoint3dSchema = DraftingPointSchema.extend({
  z: z.number().finite(),
});

const DraftingSitePointSchema = z.object({
  easting: z.number().finite().optional(),
  northing: z.number().finite().optional(),
  elevation: z.number().finite().optional(),
});

const DraftingReferencePointSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  modelPoint: DraftingModelPoint3dSchema,
  sitePoint: DraftingSitePointSchema.optional(),
  datum: z.string().optional(),
  coordinateSystem: z.string().optional(),
  description: z.string().optional(),
  locked: z.boolean().optional(),
  updatedAt: z.string().datetime().optional(),
  updatedBy: z.string().optional(),
});

const DraftingNorthSetupSchema = z.object({
  projectNorthAngleDeg: z.number().finite(),
  trueNorthAngleDeg: z.number().finite(),
  showProjectNorth: z.boolean(),
  showTrueNorth: z.boolean(),
});

const DraftingScaleSetupSchema = z.object({
  defaultSheetScale: z.string().min(1),
  defaultCanvasScaleLabel: z.string().min(1),
  allowedScales: z.array(z.string().min(1)),
});

const DraftingGraphicsSetupSchema = z.object({
  lineWeightMode: z.enum(DRAFTING_LINE_WEIGHT_MODES),
  defaultLineWeightMm: z.number().positive(),
  lineWeightScale: z.number().positive(),
  textScaleMode: z.enum(DRAFTING_TEXT_SCALE_MODES),
});

const DraftingStandardProfileIdSchema = z.enum([
  'as1100-general',
  'as1100-structural',
  'as1100-survey',
]);

const DraftingDisciplineProfileIdSchema = z.enum(['general', 'structural', 'survey-control']);

const DraftingSheetSizePresetSchema = z.enum(['A0', 'A1', 'A2', 'A3', 'A4']);

const DraftingDrawingSetupSchema = z.object({
  modelUnits: z.enum(DRAFTING_MODEL_UNITS),
  displayUnits: z.enum(DRAFTING_DISPLAY_UNITS),
  coordinatePrecision: z.number().int().min(0).max(6),
  activeStandardProfileId: DraftingStandardProfileIdSchema.default('as1100-general'),
  disciplineProfileId: DraftingDisciplineProfileIdSchema.default('general'),
  profileVersion: z.string().min(1).default('2026-04-as1100-style-v1'),
  defaultSheetSize: DraftingSheetSizePresetSchema.default('A1'),
  defaultTextHeightMm: z.number().positive().default(2.5),
  dimensionTextHeightMm: z.number().positive().default(2.5),
  titleTextHeightMm: z.number().positive().default(5),
  noteTextHeightMm: z.number().positive().default(2.5),
  arrowheadStyle: z.string().min(1).default('closed-filled'),
  northArrowStyle: z.string().min(1).default('as1100-plain'),
  scaleBarStyle: z.string().min(1).default('plain-metric'),
  lineWeightTableId: z.string().min(1).default('as1100-style-lineweights-v1'),
  lineStyleTableId: z.string().min(1).default('as1100-style-lines-v1'),
  outputLineWeightScale: z.number().positive().default(1),
  coordinateSurveyProfileId: z.string().min(1).default('as1100-survey-control'),
  referencePoint: DraftingReferencePointSchema,
  north: DraftingNorthSetupSchema,
  scale: DraftingScaleSetupSchema,
  graphics: DraftingGraphicsSetupSchema,
  standardsNote: z.string().optional(),
});

export const DraftingLayerSchema = z.object({
  id: z.enum(DRAFTING_LAYER_IDS),
  name: z.string().min(1),
  visible: z.boolean(),
  locked: z.boolean(),
  color: z.string().min(1),
  lineWeight: z.number().finite().nonnegative(),
});

export const DraftingUnderlayTransformSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  scale: z.number().positive(),
  rotationDeg: z.number().finite(),
});

export const DraftingUnderlayCropSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  width: z.number().positive(),
  height: z.number().positive(),
});

export const DraftingUnderlayCalibrationSchema = z.object({
  method: z.literal('two_point_uniform_scale'),
  pdfPointA: DraftingPointSchema,
  pdfPointB: DraftingPointSchema,
  modelPointA: DraftingPointSchema,
  modelPointB: DraftingPointSchema,
  modelDistanceMm: z.number().positive(),
  calculatedScale: z.number().positive(),
  calibratedAt: z.string().datetime(),
  warningAcknowledged: z.literal(true),
});

export const DraftingUnderlaySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  fileId: z.string().min(1),
  fileName: z.string().min(1),
  pageNumber: z.number().int().positive(),
  visible: z.boolean(),
  opacity: z.number().min(0).max(1),
  locked: z.boolean(),
  transform: DraftingUnderlayTransformSchema,
  crop: DraftingUnderlayCropSchema.nullable().optional(),
  calibration: DraftingUnderlayCalibrationSchema.nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const DraftingScheduleSheetProjectMetadataOverridesSchema = z.object({
  checkedBy: z.string().optional(),
  preparedBy: z.string().optional(),
  projectAddress: z.string().optional(),
  projectCode: z.string().optional(),
  projectName: z.string().optional(),
});

export const DraftingScheduleSheetDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  rootSheetTemplateId: z.string().min(1).nullable().optional(),
  templateId: z.string().min(1).nullable().optional(),
  pageSize: z.enum(DRAFTING_SCHEDULE_SHEET_PAGE_SIZES),
  orientation: z.enum(DRAFTING_SCHEDULE_SHEET_ORIENTATIONS),
  includedScheduleGroups: z.array(z.string().min(1)),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  revisionLabel: z.string().optional(),
  issuePurpose: z.string().optional(),
  projectMetadata: DraftingScheduleSheetProjectMetadataOverridesSchema.optional(),
  tableDensity: z.enum(DRAFTING_SCHEDULE_SHEET_TABLE_DENSITIES),
  pageOrder: z.number().int().nonnegative(),
});

export const DraftingDrawingSheetLayerFilterSchema = z.object({
  visibleLayerIds: z.array(z.enum(DRAFTING_LAYER_IDS)).optional(),
  hiddenLayerIds: z.array(z.enum(DRAFTING_LAYER_IDS)).optional(),
});

export const DraftingDrawingSheetViewportSchema = z.object({
  center: DraftingPointSchema,
  scale: z.number().positive(),
  rotationDeg: z.number().finite().optional(),
  widthMm: z.number().positive().optional(),
  heightMm: z.number().positive().optional(),
  fitMode: z.enum(DRAFTING_DRAWING_SHEET_VIEWPORT_FIT_MODES),
});

export const DraftingDrawingSheetDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  title: z.string().min(1),
  sheetNumber: z.string().min(1),
  rootSheetTemplateId: z.string().min(1).nullable().optional(),
  pageSize: z.enum(DRAFTING_SCHEDULE_SHEET_PAGE_SIZES),
  orientation: z.enum(DRAFTING_SCHEDULE_SHEET_ORIENTATIONS),
  scaleLabel: z.string().min(1),
  viewport: DraftingDrawingSheetViewportSchema,
  layerFilter: DraftingDrawingSheetLayerFilterSchema.optional(),
  includeUnderlays: z.boolean(),
  includeGrid: z.boolean(),
  includeObjectLabels: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const DraftingScheduleSheetTemplateRectSnapshotSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  width: z.number().positive(),
  height: z.number().positive(),
});

export const DraftingScheduleSheetTemplateScheduleRegionSnapshotSchema =
  DraftingScheduleSheetTemplateRectSnapshotSchema.extend({
    sourceBlockId: z.string().min(1).nullable().optional(),
  });

export const DraftingScheduleSheetTemplateSnapshotSchema = z.object({
  source: z.enum(DRAFTING_SCHEDULE_SHEET_TEMPLATE_SNAPSHOT_SOURCES),
  label: z.string().min(1),
  rootSheetTemplateId: z.string().min(1).nullable().optional(),
  rootSheetTemplateName: z.string().min(1).nullable().optional(),
  rootSheetTemplateVersionId: z.string().min(1).nullable().optional(),
  templateFingerprint: z.string().min(1).nullable().optional(),
  safeArea: DraftingScheduleSheetTemplateRectSnapshotSchema,
  scheduleRegion: DraftingScheduleSheetTemplateScheduleRegionSnapshotSchema,
  renderDefinition: z.record(z.unknown()),
});

export const DraftingLockedScheduleSheetDefinitionSchema =
  DraftingScheduleSheetDefinitionSchema.extend({
    templateSnapshot: DraftingScheduleSheetTemplateSnapshotSchema.optional(),
  });

export const DraftingScheduleSummaryColumnSnapshotSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
});

export const DraftingObjectProvenanceSchema = z.object({
  createdAt: z.string().datetime().optional(),
  createdBy: z.string().optional(),
  updatedAt: z.string().datetime().optional(),
  updatedBy: z.string().optional(),
  lastAction: z.enum(DRAFTING_OBJECT_PROVENANCE_ACTIONS).optional(),
});

export const DraftingScheduleSummaryRowSnapshotSchema = z.object({
  id: z.string().min(1),
  sourceObjectId: z.string().min(1),
  objectType: z.enum(DRAFTING_OBJECT_TYPES),
  cells: z.record(z.string()),
  provenance: DraftingObjectProvenanceSchema.optional(),
});

export const DraftingScheduleSummaryGroupSnapshotSchema = z.object({
  key: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  columns: z.array(DraftingScheduleSummaryColumnSnapshotSchema),
  rows: z.array(DraftingScheduleSummaryRowSnapshotSchema),
});

export const DraftingScheduleSummarySnapshotSchema = z.object({
  counts: z.record(z.number().int().nonnegative()),
  drawingId: z.string().min(1),
  groups: z.array(DraftingScheduleSummaryGroupSnapshotSchema),
  units: z.literal('mm'),
});

export const DraftingSchedulePackIssueSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  revisionLabel: z.string().min(1),
  issuePurpose: z.string().min(1),
  issueStatus: z.enum(DRAFTING_SCHEDULE_PACK_ISSUE_STATUSES),
  issuedAt: z.string().datetime().optional(),
  issuedBy: z.string().optional(),
  notes: z.string().optional(),
  includedScheduleSheetIds: z.array(z.string().min(1)),
  lockedSheetDefinitions: z.array(DraftingLockedScheduleSheetDefinitionSchema),
  lockedScheduleSummary: DraftingScheduleSummarySnapshotSchema,
  pageCount: z.number().int().nonnegative(),
});

export const DraftingDrawingSheetTemplateSnapshotSchema = z.object({
  label: z.string().min(1),
  rootSheetTemplateId: z.string().min(1).nullable().optional(),
  rootSheetTemplateName: z.string().min(1).nullable().optional(),
  rootSheetTemplateVersionId: z.string().min(1).nullable().optional(),
  templateFingerprint: z.string().min(1).nullable().optional(),
  source: z.enum([
    'default_layout',
    'root_template',
    'missing_template_fallback',
    'incompatible_template_fallback',
  ]),
  renderDefinition: z.record(z.unknown()),
});

export const DraftingLockedDrawingSheetDefinitionSchema =
  DraftingDrawingSheetDefinitionSchema.extend({
    templateSnapshot: DraftingDrawingSheetTemplateSnapshotSchema.optional(),
  });

export const DraftingTitleBlockMetadataSchema = z.object({
  projectName: z.string().optional(),
  projectNumber: z.string().optional(),
  clientName: z.string().optional(),
  drawingTitle: z.string().optional(),
  drawingNumber: z.string().optional(),
  sheetNumber: z.string().optional(),
  sheetTotal: z.string().optional(),
  scale: z.string().optional(),
  discipline: z.string().optional(),
  status: z.enum(DRAFTING_TITLE_BLOCK_STATUSES).optional(),
  designedBy: z.string().optional(),
  drawnBy: z.string().optional(),
  checkedBy: z.string().optional(),
  approvedBy: z.string().optional(),
  organisationName: z.string().optional(),
  notes: z.string().optional(),
});

export const DraftingRevisionBlockRowSchema = z.object({
  id: z.string().min(1),
  revision: z.string(),
  date: z.string(),
  description: z.string(),
  issuedFor: z.string(),
  drawnBy: z.string(),
  checkedBy: z.string(),
  approvedBy: z.string(),
  status: z.string(),
});

export const DraftingRevisionBlockMetadataSchema = z.object({
  currentRevision: z.string().optional(),
  revisions: z.array(DraftingRevisionBlockRowSchema).default([]),
});

const DraftingObjectBaseSchema = z.object({
  id: z.string().min(1),
  type: z.enum(DRAFTING_OBJECT_TYPES),
  layerId: z.enum(DRAFTING_LAYER_IDS),
  name: z.string().optional(),
  locked: z.boolean().optional(),
  visible: z.boolean().optional(),
  style: DraftingStyleSchema.optional(),
  metadata: z.record(z.unknown()).optional(),
  provenance: DraftingObjectProvenanceSchema.optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const DraftingObjectChangeEventSchema = z.object({
  id: z.string().min(1),
  objectId: z.string().min(1),
  objectType: z.enum(DRAFTING_OBJECT_TYPES),
  action: z.enum(['created', 'updated', 'moved', 'deleted']),
  at: z.string().datetime(),
  by: z.string().optional(),
  summary: z.string().optional(),
  source: z.literal('drafting-editor'),
});

export const DraftingPileObjectSchema = DraftingObjectBaseSchema.extend({
  type: z.literal('pile'),
  geometry: z.object({
    centre: DraftingPointSchema,
    diameterMm: z.number().positive(),
  }),
  metadata: z.object({
    pileId: z.string().min(1),
    pileType: z.enum(DRAFTING_PILE_TYPES).optional(),
    material: z.enum(DRAFTING_PILE_MATERIALS).optional(),
    cutOffLevel: z.number().finite().optional(),
    toeLevel: z.number().finite().optional(),
    notes: z.string().optional(),
  }),
});

export const DraftingExcavationLineObjectSchema = DraftingObjectBaseSchema.extend({
  type: z.literal('excavation_line'),
  geometry: z.object({
    points: z.array(DraftingPointSchema).min(2),
    closed: z.boolean().optional(),
  }),
  metadata: z.object({
    excavationId: z.string().optional(),
    stage: z.string().optional(),
    designLevel: z.number().finite().optional(),
    notes: z.string().optional(),
  }),
});

export const DraftingMonitoringPointObjectSchema = DraftingObjectBaseSchema.extend({
  type: z.literal('monitoring_point'),
  geometry: z.object({
    point: DraftingPointSchema,
  }),
  metadata: z.object({
    pointId: z.string().min(1),
    monitoringType: z.enum(DRAFTING_MONITORING_TYPES),
    triggerLevel: z.number().finite().optional(),
    actionLevel: z.number().finite().optional(),
    units: z.string().optional(),
    notes: z.string().optional(),
  }),
});

export const DraftingLeaderNoteObjectSchema = DraftingObjectBaseSchema.extend({
  type: z.literal('leader_note'),
  geometry: z.object({
    anchor: DraftingPointSchema,
    textPoint: DraftingPointSchema,
  }),
  metadata: z.object({
    text: z.string().min(1),
  }),
});

export const DraftingSecantPileWallObjectSchema = DraftingObjectBaseSchema.extend({
  type: z.literal('secant_pile_wall'),
  geometry: z.object({
    baselinePoints: z.array(DraftingPointSchema).min(2),
    pileCentres: z.array(DraftingPointSchema).min(1),
  }),
  parameters: z
    .object({
      pileDiameterMm: z.number().positive(),
      spacingMm: z.number().positive(),
      overlapMm: z.number().positive().optional(),
      secantType: z.enum(DRAFTING_SECANT_TYPES).optional(),
      primarySecondaryPattern: z.enum(DRAFTING_SECANT_PRIMARY_SECONDARY_PATTERNS),
    })
    .refine((value) => value.overlapMm !== undefined || value.secantType !== undefined, {
      message: 'Secant pile wall requires overlapMm or secantType',
      path: ['overlapMm'],
    }),
  metadata: z.object({
    wallId: z.string().min(1),
    constructionMethod: z.string().min(1),
    pileCount: z.number().int().positive(),
    designNotes: z.string().optional(),
  }),
});

export const DraftingSoldierPileWallObjectSchema = DraftingObjectBaseSchema.extend({
  type: z.literal('soldier_pile_wall'),
  geometry: z.object({
    baselinePoints: z.array(DraftingPointSchema).min(2),
    pilePositions: z.array(DraftingPointSchema).min(1),
  }),
  parameters: z
    .object({
      pileDiameterMm: z.number().positive().optional(),
      sectionLabel: z.string().min(1).optional(),
      spacingMm: z.number().positive(),
      laggingType: z.string().optional(),
      embedmentNote: z.string().optional(),
    })
    .refine((value) => value.pileDiameterMm !== undefined || Boolean(value.sectionLabel), {
      message: 'Soldier pile wall requires pileDiameterMm or sectionLabel',
      path: ['pileDiameterMm'],
    }),
  metadata: z.object({
    wallId: z.string().min(1),
    constructionMethod: z.string().min(1),
    pileCount: z.number().int().positive(),
  }),
});

export const DraftingAnchorTiebackObjectSchema = DraftingObjectBaseSchema.extend({
  type: z.literal('anchor_tieback'),
  geometry: z.object({
    headPoint: DraftingPointSchema,
    tailPoint: DraftingPointSchema,
  }),
  parameters: z.object({
    anchorId: z.string().min(1),
    angleDeg: z.number().finite(),
    planLengthMm: z.number().positive(),
    freeLengthMm: z.number().positive().optional(),
    bondLengthMm: z.number().positive().optional(),
    designLoadKn: z.number().positive().optional(),
    lockOffLoadKn: z.number().positive().optional(),
    stage: z.string().optional(),
  }),
  metadata: z.object({
    associatedWallId: z.string().optional(),
    installationStage: z.string().optional(),
    notes: z.string().optional(),
  }),
});

export const DraftingCappingBeamObjectSchema = DraftingObjectBaseSchema.extend({
  type: z.literal('capping_beam'),
  geometry: z.object({
    points: z.array(DraftingPointSchema).min(2),
  }),
  parameters: z.object({
    beamId: z.string().min(1),
    widthMm: z.number().positive(),
    depthMm: z.number().positive().optional(),
    levelRl: z.number().finite().optional(),
    concreteGrade: z.string().optional(),
  }),
  metadata: z.object({
    associatedWallId: z.string().optional(),
    notes: z.string().optional(),
  }),
});

export const DraftingWalerObjectSchema = DraftingObjectBaseSchema.extend({
  type: z.literal('waler'),
  geometry: z.object({
    points: z.array(DraftingPointSchema).min(2),
  }),
  parameters: z.object({
    walerId: z.string().min(1),
    sectionLabel: z.string().min(1),
    levelRl: z.number().finite().optional(),
    connectionNotes: z.string().optional(),
  }),
  metadata: z.object({
    associatedWallId: z.string().optional(),
    notes: z.string().optional(),
  }),
});

export const DraftingDimensionChainObjectSchema = DraftingObjectBaseSchema.extend({
  type: z.literal('dimension_chain'),
  geometry: z
    .object({
      points: z.array(DraftingPointSchema).min(2),
      offsetVector: DraftingPointSchema.optional(),
      offsetDistanceMm: z.number().finite().optional(),
    })
    .refine((value) => value.offsetVector !== undefined || value.offsetDistanceMm !== undefined, {
      message: 'Dimension chain requires offsetVector or offsetDistanceMm',
      path: ['offsetDistanceMm'],
    }),
  parameters: z.object({
    dimensionId: z.string().min(1),
    unit: z.enum(DRAFTING_DIMENSION_UNITS),
    precision: z.number().int().min(0).max(4),
    showSegments: z.boolean(),
    showTotal: z.boolean(),
    textOverride: z.string().optional(),
  }),
  metadata: z.object({
    associatedObjectIds: z.array(z.string().min(1)).optional(),
    notes: z.string().optional(),
  }),
});

export const DraftingCalloutObjectSchema = DraftingObjectBaseSchema.extend({
  type: z.literal('callout'),
  geometry: z.object({
    anchorPoint: DraftingPointSchema,
    labelPoint: DraftingPointSchema,
  }),
  parameters: z.object({
    calloutId: z.string().min(1),
    title: z.string().min(1),
    body: z.string(),
    leaderStyle: z.enum(DRAFTING_CALLOUT_LEADER_STYLES),
    arrowStyle: z.enum(DRAFTING_CALLOUT_ARROW_STYLES),
  }),
  metadata: z.object({
    associatedObjectId: z.string().optional(),
    notes: z.string().optional(),
  }),
});

export const DraftingSectionMarkerObjectSchema = DraftingObjectBaseSchema.extend({
  type: z.literal('section_marker'),
  geometry: z.object({
    startPoint: DraftingPointSchema,
    endPoint: DraftingPointSchema,
  }),
  parameters: z.object({
    sectionId: z.string().min(1),
    sectionLabel: z.string().min(1),
    sheetReference: z.string().optional(),
    arrowDirection: z.enum(DRAFTING_SECTION_ARROW_DIRECTIONS),
  }),
  metadata: z.object({
    linkedDrawingId: z.string().optional(),
    notes: z.string().optional(),
  }),
});

export const DraftingBoreholeObjectSchema = DraftingObjectBaseSchema.extend({
  type: z.literal('borehole'),
  geometry: z.object({
    point: DraftingPointSchema,
  }),
  parameters: z.object({
    boreholeId: z.string().min(1),
    label: z.string().min(1),
    groundLevelRl: z.number().finite().optional(),
    terminationDepthM: z.number().finite().optional(),
    terminationLevelRl: z.number().finite().optional(),
    boreholeType: z.string().optional(),
  }),
  metadata: z.object({
    linkedGeotechEntityId: z.string().optional(),
    sourceReference: z.string().optional(),
    notes: z.string().optional(),
  }),
});

export const DraftingServiceRunObjectSchema = DraftingObjectBaseSchema.extend({
  type: z.literal('service_run'),
  geometry: z.object({
    path: z.array(DraftingPointSchema).min(2),
  }),
  parameters: z.object({
    serviceId: z.string().min(1),
    serviceType: z.enum(DRAFTING_SERVICE_TYPES),
    status: z.enum(DRAFTING_SERVICE_STATUSES),
    diameterMm: z.number().positive().optional(),
    depthM: z.number().finite().optional(),
    levelRl: z.number().finite().optional(),
    authority: z.string().optional(),
  }),
  metadata: z.object({
    sourceReference: z.string().optional(),
    surveyConfidence: z.string().optional(),
    notes: z.string().optional(),
  }),
});

export const DraftingServiceCrossingObjectSchema = DraftingObjectBaseSchema.extend({
  type: z.literal('service_crossing'),
  geometry: z.object({
    crossingPoint: DraftingPointSchema,
  }),
  parameters: z.object({
    crossingId: z.string().min(1),
    serviceType: z.enum(DRAFTING_SERVICE_TYPES),
    conflictType: z.enum(DRAFTING_SERVICE_CONFLICT_TYPES),
    clearanceMm: z.number().positive().optional(),
    riskStatus: z.enum(DRAFTING_SERVICE_RISK_STATUSES),
  }),
  metadata: z.object({
    linkedServiceRunId: z.string().optional(),
    linkedObjectId: z.string().optional(),
    notes: z.string().optional(),
  }),
});

export const DraftingPlaceholderObjectSchema = DraftingObjectBaseSchema.extend({
  type: z.enum(DRAFTING_FUTURE_OBJECT_TYPES),
  geometry: z.record(z.unknown()),
  metadata: z.record(z.unknown()).optional(),
});

export const DraftingObjectSchema = z
  .discriminatedUnion('type', [
    DraftingPileObjectSchema,
    DraftingExcavationLineObjectSchema,
    DraftingMonitoringPointObjectSchema,
    DraftingLeaderNoteObjectSchema,
    DraftingSecantPileWallObjectSchema,
    DraftingSoldierPileWallObjectSchema,
    DraftingAnchorTiebackObjectSchema,
    DraftingCappingBeamObjectSchema,
    DraftingWalerObjectSchema,
    DraftingDimensionChainObjectSchema,
    DraftingCalloutObjectSchema,
    DraftingSectionMarkerObjectSchema,
    DraftingBoreholeObjectSchema,
    DraftingServiceRunObjectSchema,
    DraftingServiceCrossingObjectSchema,
    DraftingPlaceholderObjectSchema,
  ])
  .superRefine((value, context) => {
    if (
      value.type === 'secant_pile_wall' &&
      value.metadata.pileCount !== value.geometry.pileCentres.length
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'pileCount must match generated pile centre count',
        path: ['metadata', 'pileCount'],
      });
    }

    if (
      value.type === 'soldier_pile_wall' &&
      value.metadata.pileCount !== value.geometry.pilePositions.length
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'pileCount must match generated pile position count',
        path: ['metadata', 'pileCount'],
      });
    }
  });

export const DraftingDrawingSheetIssueObjectSnapshotSchema = z.object({
  objectId: z.string().min(1),
  objectType: z.enum(DRAFTING_OBJECT_TYPES),
  layerId: z.enum(DRAFTING_LAYER_IDS),
  label: z.string().optional(),
  geometrySummary: z.string().optional(),
  scheduleKey: z.string().optional(),
  provenance: DraftingObjectProvenanceSchema.optional(),
  renderedState: z.record(z.unknown()).optional(),
});

export const DraftingDrawingSheetIssueUnderlaySnapshotSchema = z.object({
  underlayId: z.string().min(1),
  fileId: z.string().min(1),
  fileName: z.string().min(1),
  pageNumber: z.number().int().positive(),
  transform: DraftingUnderlayTransformSchema,
  crop: DraftingUnderlayCropSchema.nullable().optional(),
  calibration: DraftingUnderlayCalibrationSchema.nullable().optional(),
  visible: z.boolean(),
  opacity: z.number().min(0).max(1),
  locked: z.boolean(),
});

export const DraftingDrawingSheetIssueSchema = z.object({
  id: z.string().min(1),
  issueNumber: z.string().min(1),
  revision: z.string().min(1),
  issueDate: z.string().datetime(),
  issuedBy: z.string().optional(),
  purpose: z.string().min(1),
  status: z.enum(DRAFTING_DRAWING_SHEET_ISSUE_STATUSES),
  notes: z.string().optional(),
  sheetIds: z.array(z.string().min(1)),
  lockedTitleBlock: DraftingTitleBlockMetadataSchema,
  lockedRevisionBlock: DraftingRevisionBlockMetadataSchema,
  lockedDrawingSheets: z.array(DraftingLockedDrawingSheetDefinitionSchema),
  lockedObjects: z.array(DraftingDrawingSheetIssueObjectSnapshotSchema),
  lockedUnderlays: z.array(DraftingDrawingSheetIssueUnderlaySnapshotSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const DraftingDrawingTransmittalSheetSchema = z.object({
  drawingSheetIssueId: z.string().min(1),
  sheetId: z.string().min(1),
  sheetNumber: z.string().min(1),
  sheetName: z.string().min(1),
  revision: z.string().min(1),
  status: z.enum(DRAFTING_DRAWING_SHEET_ISSUE_STATUSES),
  issueNumber: z.string().min(1),
  snapshotLabel: z.string().min(1),
});

export const DraftingTransmittalEvidenceSourceSchema = z.enum([
  'browser_print_pdf',
  'manual_upload',
]);
export const DraftingTransmittalEvidenceStatusSchema = z.enum(['attached', 'replaced', 'removed']);

export const DraftingTransmittalEvidenceEventSchema = z.object({
  id: z.string().min(1),
  action: DraftingTransmittalEvidenceStatusSchema,
  at: z.string().datetime(),
  by: z.string().optional(),
  artifactDocumentId: z.string().optional(),
  artifactFileName: z.string().optional(),
  artifactNotes: z.string().optional(),
  artifactSource: DraftingTransmittalEvidenceSourceSchema,
});

export const DraftingDrawingTransmittalSchema = z.object({
  id: z.string().min(1),
  transmittalNumber: z.string().min(1),
  title: z.string().min(1),
  purpose: z.string().min(1),
  status: z.enum(DRAFTING_DRAWING_TRANSMITTAL_STATUSES),
  issueDate: z.string().datetime(),
  issuedBy: z.string(),
  issuedAt: z.string().datetime().optional(),
  issuedTo: z.array(z.string().min(1)),
  cc: z.array(z.string().min(1)),
  notes: z.string().optional(),
  issueActionId: z.string().optional(),
  manifestSignature: z.string().optional(),
  lastExportedAt: z.string().datetime().optional(),
  lastExportedBy: z.string().optional(),
  artifactFileName: z.string().optional(),
  artifactDocumentId: z.string().optional(),
  artifactMimeType: z.string().optional(),
  artifactSizeBytes: z.number().int().nonnegative().optional(),
  artifactUploadedAt: z.string().datetime().optional(),
  artifactUploadedBy: z.string().optional(),
  artifactAttachedAt: z.string().datetime().optional(),
  artifactAttachedBy: z.string().optional(),
  artifactAddedAt: z.string().datetime().optional(),
  artifactAddedBy: z.string().optional(),
  artifactNotes: z.string().optional(),
  artifactSource: DraftingTransmittalEvidenceSourceSchema.optional(),
  artifactStatus: DraftingTransmittalEvidenceStatusSchema.optional(),
  artifactVersion: z.number().int().positive().optional(),
  evidenceSignature: z.string().optional(),
  evidenceEvents: z.array(DraftingTransmittalEvidenceEventSchema).default([]),
  supersededAt: z.string().datetime().optional(),
  supersededBy: z.string().optional(),
  supersededByTransmittalId: z.string().optional(),
  voidedAt: z.string().datetime().optional(),
  voidedBy: z.string().optional(),
  voidReason: z.string().optional(),
  includedDrawingSheetIssueIds: z.array(z.string().min(1)),
  includedSheets: z.array(DraftingDrawingTransmittalSheetSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const DraftingProjectTransmittalStatusSchema = z.enum([
  'draft',
  'issued',
  'superseded',
  'void',
]);

export const DraftingProjectTransmittalItemSchema = z.object({
  drawingId: z.string().min(1),
  drawingName: z.string().min(1),
  drawingNumber: z.string().optional(),
  drawingSheetIssueId: z.string().min(1),
  issueDate: z.string().datetime(),
  issueNumber: z.string().min(1),
  revision: z.string().min(1),
  sheetId: z.string().min(1),
  sheetNumber: z.string().min(1),
  sheetTitle: z.string().min(1),
  snapshotLabel: z.string().min(1),
  status: z.enum(DRAFTING_DRAWING_SHEET_ISSUE_STATUSES),
});

export const DraftingProjectTransmittalPayloadSchema = z.object({
  cc: z.array(z.string().min(1)),
  includedItems: z.array(DraftingProjectTransmittalItemSchema).min(1),
  issuedAt: z.string().datetime().optional(),
  issuedBy: z.string().optional(),
  issuedTo: z.array(z.string().min(1)),
  manifestSignature: z.string().optional(),
  notes: z.string().optional(),
  provenanceSummary: z.object({
    drawingCount: z.number().int().nonnegative(),
    frozenIssueCount: z.number().int().nonnegative(),
    sheetCount: z.number().int().nonnegative(),
    source: z.literal('drafting_drawing_sheet_issue_snapshots'),
  }),
  purpose: z.string().min(1),
  status: DraftingProjectTransmittalStatusSchema,
  title: z.string().min(1),
  warningSummary: z.array(z.string()),
});

export const DraftingModelSchema = z.object({
  version: z.literal(1),
  units: z.literal('mm'),
  drawingId: z.string().min(1),
  drawingSetup: DraftingDrawingSetupSchema.optional(),
  view: z.object({
    scale: z.number().positive(),
    offsetX: z.number().finite(),
    offsetY: z.number().finite(),
  }),
  layers: z.array(DraftingLayerSchema),
  underlays: z.array(DraftingUnderlaySchema),
  objects: z.array(DraftingObjectSchema),
  objectChangeEvents: z.array(DraftingObjectChangeEventSchema).default([]),
  titleBlock: DraftingTitleBlockMetadataSchema.default({}),
  revisionBlock: DraftingRevisionBlockMetadataSchema.default({ revisions: [] }),
  scheduleSheets: z.array(DraftingScheduleSheetDefinitionSchema).default([]),
  schedulePackIssues: z.array(DraftingSchedulePackIssueSchema).default([]),
  drawingSheets: z.array(DraftingDrawingSheetDefinitionSchema).default([]),
  drawingSheetIssues: z.array(DraftingDrawingSheetIssueSchema).default([]),
  drawingTransmittals: z.array(DraftingDrawingTransmittalSchema).default([]),
});

export const DraftingDrawingSummarySchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  title: z.string().min(1),
  status: z.enum(DRAFTING_DRAWING_STATUSES),
  currentRevision: z.number().int().nonnegative(),
  modelVersion: z.number().int().positive(),
  objectCount: z.number().int().nonnegative(),
  createdById: z.string().uuid().nullable(),
  updatedById: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const DraftingRevisionSchema = z.object({
  id: z.string().uuid(),
  drawingId: z.string().uuid(),
  projectId: z.string().uuid(),
  revisionNumber: z.number().int().nonnegative(),
  title: z.string().min(1),
  notes: z.string().nullable(),
  modelJsonSnapshot: DraftingModelSchema,
  createdById: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
});

export const DraftingDrawingSchema = DraftingDrawingSummarySchema.extend({
  model: DraftingModelSchema,
  revisions: z.array(DraftingRevisionSchema),
});
