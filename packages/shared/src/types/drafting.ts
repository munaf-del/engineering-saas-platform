export const DRAFTING_DRAWING_STATUSES = ['draft', 'issued', 'archived'] as const;
export type DraftingDrawingStatus = (typeof DRAFTING_DRAWING_STATUSES)[number];
export const DRAFTING_DRAWING_KINDS = ['model', 'sketch'] as const;
export type DraftingDrawingKind = (typeof DRAFTING_DRAWING_KINDS)[number];

export const DRAFTING_LAYER_IDS = [
  'underlay',
  'grid',
  'shoring',
  'piles',
  'anchors',
  'beams_walers',
  'excavation',
  'monitoring',
  'boreholes',
  'services',
  'services_conflicts',
  'sections',
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
  'dimension_chain',
  'callout',
  'section_marker',
  'borehole',
  'service_run',
  'service_crossing',
  'draft_line',
  'draft_polyline',
  'draft_rectangle',
  'draft_circle',
  'draft_polygon',
  'structural_joint',
  'geotech_surface',
  'survey_point',
  'service_line',
  'dimension',
  'title_block',
  'revision_block',
  'project_grid',
] as const;

export const DRAFTING_IMPLEMENTED_OBJECT_TYPES = [
  'pile',
  'excavation_line',
  'monitoring_point',
  'leader_note',
  'secant_pile_wall',
  'soldier_pile_wall',
  'anchor_tieback',
  'capping_beam',
  'waler',
  'dimension_chain',
  'callout',
  'section_marker',
  'borehole',
  'service_run',
  'service_crossing',
  'draft_line',
  'draft_polyline',
  'draft_rectangle',
  'draft_circle',
  'draft_polygon',
  'structural_joint',
  'geotech_surface',
  'project_grid',
] as const;

export const DRAFTING_FUTURE_OBJECT_TYPES = [
  'survey_point',
  'service_line',
  'dimension',
  'title_block',
  'revision_block',
] as const;

export type DraftingObjectType = (typeof DRAFTING_OBJECT_TYPES)[number];
export type DraftingImplementedObjectType = (typeof DRAFTING_IMPLEMENTED_OBJECT_TYPES)[number];
export type DraftingFutureObjectType = (typeof DRAFTING_FUTURE_OBJECT_TYPES)[number];

export const DRAFTING_LINE_STYLES = ['solid', 'dashed'] as const;
export type DraftingLineStyle = (typeof DRAFTING_LINE_STYLES)[number];
export const DRAFTING_MODEL_UNITS = ['mm'] as const;
export const DRAFTING_DISPLAY_UNITS = ['mm', 'm'] as const;
export const DRAFTING_LINE_WEIGHT_MODES = ['screen_constant', 'paper_preview'] as const;
export const DRAFTING_TEXT_SCALE_MODES = ['model', 'screen_constant'] as const;
export type DraftingModelUnits = (typeof DRAFTING_MODEL_UNITS)[number];
export type DraftingDisplayUnits = (typeof DRAFTING_DISPLAY_UNITS)[number];
export type DraftingLineWeightMode = (typeof DRAFTING_LINE_WEIGHT_MODES)[number];
export type DraftingTextScaleMode = (typeof DRAFTING_TEXT_SCALE_MODES)[number];

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

export const DRAFTING_SECANT_PRIMARY_SECONDARY_PATTERNS = [
  'hard_soft',
  'hard_firm',
  'contiguous',
] as const;

export const DRAFTING_SECANT_TYPES = ['overlapping', 'tangent'] as const;
export const DRAFTING_DIMENSION_UNITS = ['mm', 'm'] as const;
export const DRAFTING_CALLOUT_LEADER_STYLES = ['straight', 'dogleg'] as const;
export const DRAFTING_CALLOUT_ARROW_STYLES = ['filled', 'open', 'dot'] as const;
export const DRAFTING_SECTION_ARROW_DIRECTIONS = ['left', 'right', 'both'] as const;
export const DRAFTING_SERVICE_TYPES = [
  'stormwater',
  'sewer',
  'water',
  'gas',
  'electrical',
  'comms',
  'unknown',
] as const;
export const DRAFTING_SERVICE_STATUSES = ['existing', 'proposed', 'abandoned', 'unknown'] as const;
export const DRAFTING_SERVICE_CONFLICT_TYPES = [
  'crosses_wall',
  'crosses_anchor',
  'crosses_excavation',
  'unknown',
] as const;
export const DRAFTING_SERVICE_RISK_STATUSES = ['open', 'reviewed', 'resolved'] as const;
export const DRAFTING_OBJECT_PROVENANCE_ACTIONS = [
  'created',
  'updated',
  'moved',
  'deleted',
  'imported',
  'unknown',
] as const;

export type DraftingPileType = (typeof DRAFTING_PILE_TYPES)[number];
export type DraftingPileMaterial = (typeof DRAFTING_PILE_MATERIALS)[number];
export type DraftingMonitoringType = (typeof DRAFTING_MONITORING_TYPES)[number];
export type DraftingSecantPrimarySecondaryPattern =
  (typeof DRAFTING_SECANT_PRIMARY_SECONDARY_PATTERNS)[number];
export type DraftingSecantType = (typeof DRAFTING_SECANT_TYPES)[number];
export type DraftingDimensionUnit = (typeof DRAFTING_DIMENSION_UNITS)[number];
export type DraftingCalloutLeaderStyle = (typeof DRAFTING_CALLOUT_LEADER_STYLES)[number];
export type DraftingCalloutArrowStyle = (typeof DRAFTING_CALLOUT_ARROW_STYLES)[number];
export type DraftingSectionArrowDirection = (typeof DRAFTING_SECTION_ARROW_DIRECTIONS)[number];
export type DraftingServiceType = (typeof DRAFTING_SERVICE_TYPES)[number];
export type DraftingServiceStatus = (typeof DRAFTING_SERVICE_STATUSES)[number];
export type DraftingServiceConflictType = (typeof DRAFTING_SERVICE_CONFLICT_TYPES)[number];
export type DraftingServiceRiskStatus = (typeof DRAFTING_SERVICE_RISK_STATUSES)[number];
export type DraftingObjectProvenanceAction = (typeof DRAFTING_OBJECT_PROVENANCE_ACTIONS)[number];
export const DRAFTING_PROJECT_GRID_LINE_ROLES = ['minor', 'major', 'axis', 'custom'] as const;
export type DraftingProjectGridLineRole = (typeof DRAFTING_PROJECT_GRID_LINE_ROLES)[number];
export const DRAFTING_PROJECT_GRID_BUBBLE_PLACEMENTS = ['both', 'start', 'end', 'none'] as const;
export type DraftingProjectGridBubblePlacement =
  (typeof DRAFTING_PROJECT_GRID_BUBBLE_PLACEMENTS)[number];
export const DRAFTING_PROJECT_GRID_LABEL_MODES = ['letters', 'numbers', 'custom'] as const;
export type DraftingProjectGridLabelMode = (typeof DRAFTING_PROJECT_GRID_LABEL_MODES)[number];
export type DraftingObjectSourceType =
  | 'foundation_pile'
  | 'foundation_joint'
  | 'foundation_pile_type'
  | 'foundation_pile_group'
  | 'geotech_borehole'
  | 'spatial_feature'
  | 'manual';
export type DraftingObjectSourceStatus =
  | 'current'
  | 'linked'
  | 'snapshot'
  | 'missing_source'
  | 'manual';

export type DraftingPointAnchorRef = {
  sourceObjectId?: string;
  anchorKind:
    | 'grid'
    | 'origin'
    | 'endpoint'
    | 'midpoint'
    | 'centre'
    | 'intersection'
    | 'nearest_path'
    | 'vertex'
    | 'joint'
    | 'reference';
  anchorIndex?: number;
  anchorName?: string;
  capturedCoordinate: {
    x: number;
    y: number;
    z?: number;
    rl?: number;
  };
};

export type DraftingPoint = {
  x: number;
  y: number;
  z?: number;
  rl?: number;
  snapRef?: DraftingPointAnchorRef;
};

export type DraftingModelPoint3d = DraftingPoint & {
  z: number;
};

export type DraftingSitePoint = {
  easting?: number;
  northing?: number;
  elevation?: number;
};

export type DraftingReferencePoint = {
  id: string;
  label: string;
  modelPoint: DraftingModelPoint3d;
  sitePoint?: DraftingSitePoint;
  datum?: string;
  coordinateSystem?: string;
  description?: string;
  locked?: boolean;
  updatedAt?: string;
  updatedBy?: string;
};

export type DraftingNorthSetup = {
  /**
   * Angle convention: model +Y is project north at 0 degrees; positive angles rotate clockwise.
   * True north is stored independently so survey north can differ from project/document north.
   */
  projectNorthAngleDeg: number;
  trueNorthAngleDeg: number;
  showProjectNorth: boolean;
  showTrueNorth: boolean;
};

export type DraftingScaleSetup = {
  defaultSheetScale: string;
  defaultCanvasScaleLabel: string;
  allowedScales: string[];
};

export type DraftingGraphicsSetup = {
  lineWeightMode: DraftingLineWeightMode;
  defaultLineWeightMm: number;
  lineWeightScale: number;
  textScaleMode: DraftingTextScaleMode;
};

export type DraftingStandardProfileId = 'as1100-general' | 'as1100-structural' | 'as1100-survey';

export type DraftingDisciplineProfileId = 'general' | 'structural' | 'survey-control';

export type DraftingSheetSizePreset = 'A0' | 'A1' | 'A2' | 'A3' | 'A4';

export type DraftingDrawingSetup = {
  modelUnits: DraftingModelUnits;
  displayUnits: DraftingDisplayUnits;
  coordinatePrecision: number;
  activeStandardProfileId: DraftingStandardProfileId;
  disciplineProfileId: DraftingDisciplineProfileId;
  profileVersion: string;
  defaultSheetSize: DraftingSheetSizePreset;
  defaultTextHeightMm: number;
  dimensionTextHeightMm: number;
  titleTextHeightMm: number;
  noteTextHeightMm: number;
  arrowheadStyle: string;
  northArrowStyle: string;
  scaleBarStyle: string;
  lineWeightTableId: string;
  lineStyleTableId: string;
  outputLineWeightScale: number;
  coordinateSurveyProfileId: string;
  referencePoint: DraftingReferencePoint;
  north: DraftingNorthSetup;
  scale: DraftingScaleSetup;
  graphics: DraftingGraphicsSetup;
  standardsNote?: string;
};

export type DraftingStyle = {
  stroke?: string;
  fill?: string;
  lineWeight?: number;
  lineWeightMm?: number;
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

export const DRAFTING_SCHEDULE_SHEET_PAGE_SIZES = ['a4', 'a3', 'a2', 'a1', 'a0'] as const;
export type DraftingScheduleSheetPageSize = (typeof DRAFTING_SCHEDULE_SHEET_PAGE_SIZES)[number];

export const DRAFTING_SCHEDULE_SHEET_ORIENTATIONS = ['portrait', 'landscape'] as const;
export type DraftingScheduleSheetOrientation =
  (typeof DRAFTING_SCHEDULE_SHEET_ORIENTATIONS)[number];

export const DRAFTING_DRAWING_SHEET_VIEWPORT_FIT_MODES = [
  'model_extents',
  'selected_extents',
  'manual',
] as const;
export type DraftingDrawingSheetViewportFitMode =
  (typeof DRAFTING_DRAWING_SHEET_VIEWPORT_FIT_MODES)[number];

export const DRAFTING_SCHEDULE_SHEET_TABLE_DENSITIES = ['normal', 'compact'] as const;
export type DraftingScheduleSheetTableDensity =
  (typeof DRAFTING_SCHEDULE_SHEET_TABLE_DENSITIES)[number];

export const DRAFTING_SCHEDULE_PACK_ISSUE_STATUSES = ['draft', 'issued', 'superseded'] as const;
export type DraftingSchedulePackIssueStatus =
  (typeof DRAFTING_SCHEDULE_PACK_ISSUE_STATUSES)[number];

export const DRAFTING_DRAWING_SHEET_ISSUE_STATUSES = ['draft', 'issued', 'superseded'] as const;
export type DraftingDrawingSheetIssueStatus =
  (typeof DRAFTING_DRAWING_SHEET_ISSUE_STATUSES)[number];

export const DRAFTING_DRAWING_TRANSMITTAL_STATUSES = [
  'draft',
  'issued',
  'superseded',
  'void',
  'archived',
] as const;
export type DraftingDrawingTransmittalStatus =
  (typeof DRAFTING_DRAWING_TRANSMITTAL_STATUSES)[number];
export type DraftingProjectTransmittalStatus = Exclude<
  DraftingDrawingTransmittalStatus,
  'archived'
>;

export const DRAFTING_TITLE_BLOCK_STATUSES = [
  'draft',
  'for_review',
  'for_information',
  'for_construction',
  'as_built',
  'superseded',
] as const;
export type DraftingTitleBlockStatus = (typeof DRAFTING_TITLE_BLOCK_STATUSES)[number];

export type DraftingTitleBlockMetadata = {
  projectName?: string;
  projectNumber?: string;
  clientName?: string;
  drawingTitle?: string;
  drawingNumber?: string;
  sheetNumber?: string;
  sheetTotal?: string;
  scale?: string;
  discipline?: string;
  status?: DraftingTitleBlockStatus;
  designedBy?: string;
  drawnBy?: string;
  checkedBy?: string;
  approvedBy?: string;
  organisationName?: string;
  notes?: string;
};

export type DraftingRevisionBlockRow = {
  id: string;
  revision: string;
  date: string;
  description: string;
  issuedFor: string;
  drawnBy: string;
  checkedBy: string;
  approvedBy: string;
  status: string;
};

export type DraftingRevisionBlockMetadata = {
  currentRevision?: string;
  revisions: DraftingRevisionBlockRow[];
};

export type DraftingScheduleSheetProjectMetadataOverrides = {
  checkedBy?: string;
  preparedBy?: string;
  projectAddress?: string;
  projectCode?: string;
  projectName?: string;
};

export const DRAFTING_SCHEDULE_SHEET_TEMPLATE_SNAPSHOT_SOURCES = [
  'default_layout',
  'root_template',
  'missing_template_fallback',
  'incompatible_template_fallback',
] as const;

export type DraftingScheduleSheetTemplateSnapshotSource =
  (typeof DRAFTING_SCHEDULE_SHEET_TEMPLATE_SNAPSHOT_SOURCES)[number];

export type DraftingScheduleSheetDefinition = {
  id: string;
  name: string;
  rootSheetTemplateId?: string | null;
  templateId?: string | null;
  pageSize: DraftingScheduleSheetPageSize;
  orientation: DraftingScheduleSheetOrientation;
  includedScheduleGroups: string[];
  title: string;
  subtitle?: string;
  revisionLabel?: string;
  issuePurpose?: string;
  projectMetadata?: DraftingScheduleSheetProjectMetadataOverrides;
  tableDensity: DraftingScheduleSheetTableDensity;
  pageOrder: number;
};

export type DraftingDrawingSheetLayerFilter = {
  visibleLayerIds?: DraftingLayerId[];
  hiddenLayerIds?: DraftingLayerId[];
};

export type DraftingDrawingSheetViewport = {
  center: DraftingPoint;
  scale: number;
  rotationDeg?: number;
  widthMm?: number;
  heightMm?: number;
  fitMode: DraftingDrawingSheetViewportFitMode;
};

export type DraftingDrawingSheetDefinition = {
  id: string;
  name: string;
  title: string;
  sheetNumber: string;
  rootSheetTemplateId?: string | null;
  pageSize: DraftingScheduleSheetPageSize;
  orientation: DraftingScheduleSheetOrientation;
  scaleLabel: string;
  viewport: DraftingDrawingSheetViewport;
  layerFilter?: DraftingDrawingSheetLayerFilter;
  includeUnderlays: boolean;
  includeGrid: boolean;
  includeObjectLabels: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DraftingScheduleSheetTemplateRectSnapshot = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type DraftingScheduleSheetTemplateScheduleRegionSnapshot =
  DraftingScheduleSheetTemplateRectSnapshot & {
    sourceBlockId?: string | null;
  };

export type DraftingScheduleSheetTemplateSnapshot = {
  source: DraftingScheduleSheetTemplateSnapshotSource;
  label: string;
  rootSheetTemplateId?: string | null;
  rootSheetTemplateName?: string | null;
  rootSheetTemplateVersionId?: string | null;
  templateFingerprint?: string | null;
  safeArea: DraftingScheduleSheetTemplateRectSnapshot;
  scheduleRegion: DraftingScheduleSheetTemplateScheduleRegionSnapshot;
  renderDefinition: Record<string, unknown>;
};

export type DraftingLockedScheduleSheetDefinition = DraftingScheduleSheetDefinition & {
  templateSnapshot?: DraftingScheduleSheetTemplateSnapshot;
};

export type DraftingScheduleSummaryColumnSnapshot = {
  key: string;
  label: string;
};

export type DraftingScheduleSummaryRowSnapshot = {
  id: string;
  sourceObjectId: string;
  objectType: DraftingObjectType;
  cells: Record<string, string>;
  provenance?: DraftingObjectProvenance;
};

export type DraftingScheduleSummaryGroupSnapshot = {
  key: string;
  title: string;
  description: string;
  columns: DraftingScheduleSummaryColumnSnapshot[];
  rows: DraftingScheduleSummaryRowSnapshot[];
};

export type DraftingScheduleSummarySnapshot = {
  counts: Record<string, number>;
  drawingId: string;
  groups: DraftingScheduleSummaryGroupSnapshot[];
  units: 'mm';
};

export type DraftingSchedulePackIssue = {
  id: string;
  name: string;
  revisionLabel: string;
  issuePurpose: string;
  issueStatus: DraftingSchedulePackIssueStatus;
  issuedAt?: string;
  issuedBy?: string;
  notes?: string;
  includedScheduleSheetIds: string[];
  lockedSheetDefinitions: DraftingLockedScheduleSheetDefinition[];
  lockedScheduleSummary: DraftingScheduleSummarySnapshot;
  pageCount: number;
};

export type DraftingDrawingSheetTemplateSnapshot = {
  label: string;
  rootSheetTemplateId?: string | null;
  rootSheetTemplateName?: string | null;
  rootSheetTemplateVersionId?: string | null;
  templateFingerprint?: string | null;
  source:
    | 'default_layout'
    | 'root_template'
    | 'missing_template_fallback'
    | 'incompatible_template_fallback';
  renderDefinition: Record<string, unknown>;
};

export type DraftingSheetProfileAudit = {
  schemaVersion: 'drafting.profile-audit.v1';
  provenance?: DraftingSheetProfileAuditProvenance;
  warning: string;
  activeProfileId: DraftingStandardProfileId;
  profileName: string;
  profileVersion: string;
  disciplineProfileId: DraftingDisciplineProfileId;
  lineWeightTableId: string;
  lineStyleTableId: string;
  sheetSize: string;
  plottedScale: string;
  lineWeightScale: number;
  textScaleMode: DraftingTextScaleMode;
  lineRoles: Array<{
    role: string;
    resolvedRole: string;
    lineType: string;
    editorStrokeWidthPx: number;
    sheetLineWeightMm: number;
  }>;
  textPresets: Array<{
    preset: string;
    textRole: string;
    paperHeightMm: number;
    editorFontSizeModelUnits: number;
    sheetFontSizeMm: number;
  }>;
  dimensionStyle: {
    extensionRole: string;
    labelGapModelUnits: number;
    lineRole: string;
    sheetLineWeightMm: number;
    textHeightMm: number;
    textPreset: string;
    tickLengthModelUnits: number;
  };
  leaderStyle: {
    colorRole: string;
    lineRole: string;
    maxLeaderOpacity: number;
    sheetLineWeightMm: number;
    textHeightMm: number;
    textPreset: string;
  };
};

export type DraftingSheetProfileAuditProvenance = {
  status: 'frozen' | 'fallback_resolved' | 'missing';
  source: 'frozen' | 'fallback_resolved' | 'missing';
  drawingId?: string;
  frozenAt?: string;
  resolvedAt?: string;
  sheetId?: string;
  sourceIssueId?: string;
  warning?: string;
};

export type DraftingLockedDrawingSheetDefinition = DraftingDrawingSheetDefinition & {
  profileAudit?: DraftingSheetProfileAudit;
  templateSnapshot?: DraftingDrawingSheetTemplateSnapshot;
};

export type DraftingDrawingSheetIssueObjectSnapshot = {
  objectId: string;
  objectType: DraftingObjectType;
  layerId: DraftingLayerId;
  label?: string;
  geometrySummary?: string;
  scheduleKey?: string;
  provenance?: DraftingObjectProvenance;
  renderedState?: Record<string, unknown>;
};

export type DraftingDrawingSheetIssueUnderlaySnapshot = {
  underlayId: string;
  fileId: string;
  fileName: string;
  pageNumber: number;
  transform: DraftingUnderlayTransform;
  crop?: DraftingUnderlayCrop | null;
  calibration?: DraftingUnderlayCalibration | null;
  visible: boolean;
  opacity: number;
  locked: boolean;
};

export type DraftingDrawingSheetIssue = {
  id: string;
  issueNumber: string;
  revision: string;
  issueDate: string;
  issuedBy?: string;
  purpose: string;
  status: DraftingDrawingSheetIssueStatus;
  notes?: string;
  sheetIds: string[];
  lockedTitleBlock: DraftingTitleBlockMetadata;
  lockedRevisionBlock: DraftingRevisionBlockMetadata;
  lockedDrawingSheets: DraftingLockedDrawingSheetDefinition[];
  lockedObjects: DraftingDrawingSheetIssueObjectSnapshot[];
  lockedUnderlays: DraftingDrawingSheetIssueUnderlaySnapshot[];
  createdAt: string;
  updatedAt: string;
};

export type DraftingDrawingTransmittalSheet = {
  drawingSheetIssueId: string;
  sheetId: string;
  sheetNumber: string;
  sheetName: string;
  revision: string;
  status: DraftingDrawingSheetIssueStatus;
  issueNumber: string;
  snapshotLabel: string;
};

export type DraftingTransmittalEvidenceSource = 'browser_print_pdf' | 'manual_upload';
export type DraftingTransmittalEvidenceStatus = 'attached' | 'replaced' | 'removed';

export type DraftingTransmittalEvidenceEvent = {
  id: string;
  action: DraftingTransmittalEvidenceStatus;
  at: string;
  by?: string;
  artifactDocumentId?: string;
  artifactFileName?: string;
  artifactNotes?: string;
  artifactSource: DraftingTransmittalEvidenceSource;
};

export type DraftingDrawingTransmittal = {
  id: string;
  transmittalNumber: string;
  title: string;
  purpose: string;
  status: DraftingDrawingTransmittalStatus;
  issueDate: string;
  issuedBy: string;
  issuedAt?: string;
  issuedTo: string[];
  cc: string[];
  notes?: string;
  issueActionId?: string;
  manifestSignature?: string;
  lastExportedAt?: string;
  lastExportedBy?: string;
  artifactFileName?: string;
  artifactDocumentId?: string;
  artifactMimeType?: string;
  artifactSizeBytes?: number;
  artifactUploadedAt?: string;
  artifactUploadedBy?: string;
  artifactAttachedAt?: string;
  artifactAttachedBy?: string;
  artifactAddedAt?: string;
  artifactAddedBy?: string;
  artifactNotes?: string;
  artifactSource?: DraftingTransmittalEvidenceSource;
  artifactStatus?: DraftingTransmittalEvidenceStatus;
  artifactVersion?: number;
  evidenceSignature?: string;
  evidenceEvents?: DraftingTransmittalEvidenceEvent[];
  supersededAt?: string;
  supersededBy?: string;
  supersededByTransmittalId?: string;
  voidedAt?: string;
  voidedBy?: string;
  voidReason?: string;
  includedDrawingSheetIssueIds: string[];
  includedSheets: DraftingDrawingTransmittalSheet[];
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
  provenance?: DraftingObjectProvenance;
  sourceRef?: DraftingObjectSourceRef;
  createdAt: string;
  updatedAt: string;
};

export type DraftingObjectProvenance = {
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
  lastAction?: DraftingObjectProvenanceAction;
};

export type DraftingObjectSourceRef = {
  sourceType: DraftingObjectSourceType;
  sourceId?: string;
  sourceLabel?: string;
  sourceVersion?: string;
  linkedAt?: string;
  linkedBy?: string;
  status?: DraftingObjectSourceStatus;
  snapshot?: Record<string, unknown>;
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
    pileTypeCode?: string;
    pileSystem?: string;
    material?: DraftingPileMaterial;
    concreteGrade?: string;
    socketLengthM?: number;
    foundingStratum?: string;
    foundingNote?: string;
    designCompressionKn?: number;
    designTensionKn?: number;
    designLateralKn?: number;
    sourceCompleteness?: 'complete' | 'partial' | 'diameter_only' | 'missing_key_fields';
    durabilityExposureNote?: string;
    constructionNote?: string;
    sourceStatus?: string;
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

export type DraftingSecantPileWallObject = DraftingObjectBase & {
  type: 'secant_pile_wall';
  geometry: {
    baselinePoints: DraftingPoint[];
    pileCentres: DraftingPoint[];
  };
  parameters: {
    pileDiameterMm: number;
    spacingMm: number;
    overlapMm?: number;
    secantType?: DraftingSecantType;
    primarySecondaryPattern: DraftingSecantPrimarySecondaryPattern;
  };
  metadata: {
    wallId: string;
    constructionMethod: string;
    pileCount: number;
    designNotes?: string;
  };
};

export type DraftingSoldierPileWallObject = DraftingObjectBase & {
  type: 'soldier_pile_wall';
  geometry: {
    baselinePoints: DraftingPoint[];
    pilePositions: DraftingPoint[];
  };
  parameters: {
    pileDiameterMm?: number;
    sectionLabel?: string;
    spacingMm: number;
    laggingType?: string;
    embedmentNote?: string;
  };
  metadata: {
    wallId: string;
    constructionMethod: string;
    pileCount: number;
  };
};

export type DraftingAnchorTiebackObject = DraftingObjectBase & {
  type: 'anchor_tieback';
  geometry: {
    headPoint: DraftingPoint;
    tailPoint: DraftingPoint;
  };
  parameters: {
    anchorId: string;
    angleDeg: number;
    planLengthMm: number;
    freeLengthMm?: number;
    bondLengthMm?: number;
    designLoadKn?: number;
    lockOffLoadKn?: number;
    stage?: string;
  };
  metadata: {
    associatedWallId?: string;
    installationStage?: string;
    notes?: string;
  };
};

export type DraftingCappingBeamObject = DraftingObjectBase & {
  type: 'capping_beam';
  geometry: {
    points: DraftingPoint[];
  };
  parameters: {
    beamId: string;
    widthMm: number;
    depthMm?: number;
    levelRl?: number;
    concreteGrade?: string;
  };
  metadata: {
    associatedWallId?: string;
    notes?: string;
  };
};

export type DraftingWalerObject = DraftingObjectBase & {
  type: 'waler';
  geometry: {
    points: DraftingPoint[];
  };
  parameters: {
    walerId: string;
    sectionLabel: string;
    levelRl?: number;
    connectionNotes?: string;
  };
  metadata: {
    associatedWallId?: string;
    notes?: string;
  };
};

export type DraftingDimensionChainObject = DraftingObjectBase & {
  type: 'dimension_chain';
  geometry: {
    points: DraftingPoint[];
    offsetVector?: DraftingPoint;
    offsetDistanceMm?: number;
  };
  parameters: {
    dimensionId: string;
    unit: DraftingDimensionUnit;
    precision: number;
    showSegments: boolean;
    showTotal: boolean;
    textOverride?: string;
  };
  metadata: {
    associatedObjectIds?: string[];
    witnessAnchorRefs?: DraftingPointAnchorRef[];
    notes?: string;
  };
};

export type DraftingCalloutObject = DraftingObjectBase & {
  type: 'callout';
  geometry: {
    anchorPoint: DraftingPoint;
    labelPoint: DraftingPoint;
  };
  parameters: {
    calloutId: string;
    title: string;
    body: string;
    leaderStyle: DraftingCalloutLeaderStyle;
    arrowStyle: DraftingCalloutArrowStyle;
  };
  metadata: {
    associatedObjectId?: string;
    notes?: string;
  };
};

export type DraftingSectionMarkerObject = DraftingObjectBase & {
  type: 'section_marker';
  geometry: {
    startPoint: DraftingPoint;
    endPoint: DraftingPoint;
  };
  parameters: {
    sectionId: string;
    sectionLabel: string;
    sheetReference?: string;
    arrowDirection: DraftingSectionArrowDirection;
  };
  metadata: {
    linkedDrawingId?: string;
    notes?: string;
  };
};

export type DraftingBoreholeObject = DraftingObjectBase & {
  type: 'borehole';
  geometry: {
    point: DraftingPoint;
  };
  parameters: {
    boreholeId: string;
    label: string;
    groundLevelRl?: number;
    terminationDepthM?: number;
    terminationLevelRl?: number;
    boreholeType?: string;
  };
  metadata: {
    linkedGeotechEntityId?: string;
    sourceReference?: string;
    notes?: string;
  };
};

export type DraftingServiceRunObject = DraftingObjectBase & {
  type: 'service_run';
  geometry: {
    path: DraftingPoint[];
  };
  parameters: {
    serviceId: string;
    serviceType: DraftingServiceType;
    status: DraftingServiceStatus;
    diameterMm?: number;
    depthM?: number;
    levelRl?: number;
    authority?: string;
  };
  metadata: {
    sourceReference?: string;
    surveyConfidence?: string;
    notes?: string;
  };
};

export type DraftingServiceCrossingObject = DraftingObjectBase & {
  type: 'service_crossing';
  geometry: {
    crossingPoint: DraftingPoint;
  };
  parameters: {
    crossingId: string;
    serviceType: DraftingServiceType;
    conflictType: DraftingServiceConflictType;
    clearanceMm?: number;
    riskStatus: DraftingServiceRiskStatus;
  };
  metadata: {
    linkedServiceRunId?: string;
    linkedObjectId?: string;
    notes?: string;
  };
};

export type DraftingLineObject = DraftingObjectBase & {
  type: 'draft_line';
  geometry: {
    startPoint: DraftingPoint;
    endPoint: DraftingPoint;
  };
  metadata: {
    lineId: string;
    notes?: string;
  };
};

export type DraftingPolylineObject = DraftingObjectBase & {
  type: 'draft_polyline';
  geometry: {
    points: DraftingPoint[];
    closed?: boolean;
  };
  metadata: {
    polylineId: string;
    notes?: string;
  };
};

export type DraftingRectangleObject = DraftingObjectBase & {
  type: 'draft_rectangle';
  geometry: {
    cornerA: DraftingPoint;
    cornerB: DraftingPoint;
  };
  metadata: {
    rectangleId: string;
    notes?: string;
  };
};

export type DraftingCircleObject = DraftingObjectBase & {
  type: 'draft_circle';
  geometry: {
    centre: DraftingPoint;
    radiusMm: number;
  };
  metadata: {
    circleId: string;
    notes?: string;
  };
};

export type DraftingPolygonObject = DraftingObjectBase & {
  type: 'draft_polygon';
  geometry: {
    points: DraftingPoint[];
  };
  metadata: {
    polygonId: string;
    notes?: string;
  };
};

export type DraftingStructuralJointObject = DraftingObjectBase & {
  type: 'structural_joint';
  geometry: {
    point: DraftingPoint;
  };
  parameters: {
    jointId: string;
    label: string;
    loadEnabled?: boolean;
    loadCase?: string;
    loadCombination?: string;
    fxKn?: number;
    fyKn?: number;
    fzKn?: number;
    verticalLoadKn?: number;
    units?: 'kN';
  };
  metadata: {
    connectedObjectIds?: string[];
    notes?: string;
  };
};

export type DraftingGeotechSurfaceObject = DraftingObjectBase & {
  type: 'geotech_surface';
  geometry: {
    points: Array<DraftingPoint & { z: number }>;
    breaklines?: DraftingPoint[][];
    boundary?: DraftingPoint[];
  };
  parameters: {
    surfaceId: string;
    name: string;
    surfaceType:
      | 'existing_ground'
      | 'proposed_surface'
      | 'strata_contact'
      | 'water_table'
      | 'other';
    datum?: string;
    sourceBoreholeIds?: string[];
    showTriangulation?: boolean;
    showPointLabels?: boolean;
  };
  metadata: {
    notes?: string;
  };
};

export type DraftingProjectGridLineDefinition = {
  id: string;
  label: string;
  offsetMm: number;
  lineRole: DraftingProjectGridLineRole;
  bubbleStart: boolean;
  bubbleEnd: boolean;
  moduleNotation?: string;
  locked?: boolean;
  visible?: boolean;
};

export type DraftingProjectGridObject = DraftingObjectBase & {
  type: 'project_grid';
  geometry: {
    origin: DraftingPoint;
    rotationDeg: number;
    extentXPositiveMm: number;
    extentXNegativeMm: number;
    extentYPositiveMm: number;
    extentYNegativeMm: number;
    xLines: DraftingProjectGridLineDefinition[];
    yLines: DraftingProjectGridLineDefinition[];
  };
  metadata: {
    gridId: string;
    moduleSizeMm: number;
    xLabelMode: DraftingProjectGridLabelMode;
    yLabelMode: DraftingProjectGridLabelMode;
    bubbleRadiusMm: number;
    bubblePlacement: DraftingProjectGridBubblePlacement;
    showModuleNotation?: boolean;
    majorEvery?: number;
    as1100Profile: 'modular_grid_informed';
    note?: string;
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
  | DraftingSecantPileWallObject
  | DraftingSoldierPileWallObject
  | DraftingAnchorTiebackObject
  | DraftingCappingBeamObject
  | DraftingWalerObject
  | DraftingDimensionChainObject
  | DraftingCalloutObject
  | DraftingSectionMarkerObject
  | DraftingBoreholeObject
  | DraftingServiceRunObject
  | DraftingServiceCrossingObject
  | DraftingLineObject
  | DraftingPolylineObject
  | DraftingRectangleObject
  | DraftingCircleObject
  | DraftingPolygonObject
  | DraftingStructuralJointObject
  | DraftingGeotechSurfaceObject
  | DraftingProjectGridObject
  | DraftingPlaceholderObject;

export type DraftingModel = {
  version: 1;
  units: 'mm';
  drawingId: string;
  drawingSetup?: DraftingDrawingSetup;
  view: {
    scale: number;
    offsetX: number;
    offsetY: number;
  };
  layers: DraftingLayer[];
  underlays: DraftingUnderlay[];
  objects: DraftingObject[];
  objectChangeEvents?: DraftingObjectChangeEvent[];
  titleBlock?: DraftingTitleBlockMetadata;
  revisionBlock?: DraftingRevisionBlockMetadata;
  scheduleSheets: DraftingScheduleSheetDefinition[];
  schedulePackIssues: DraftingSchedulePackIssue[];
  drawingSheets: DraftingDrawingSheetDefinition[];
  drawingSheetIssues: DraftingDrawingSheetIssue[];
  drawingTransmittals: DraftingDrawingTransmittal[];
};

export type DraftingObjectChangeEvent = {
  id: string;
  objectId: string;
  objectType: DraftingObjectType;
  action: Exclude<DraftingObjectProvenanceAction, 'imported' | 'unknown'>;
  at: string;
  by?: string;
  summary?: string;
  source: 'drafting-editor';
};

export interface DraftingDrawingSummary {
  id: string;
  projectId: string;
  title: string;
  kind: DraftingDrawingKind;
  isProjectModel: boolean;
  isSketch: boolean;
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

export type DraftingProjectTransmittalItem = {
  drawingId: string;
  drawingName: string;
  drawingNumber?: string;
  drawingSheetIssueId: string;
  issueDate: string;
  issueNumber: string;
  revision: string;
  sheetId: string;
  sheetNumber: string;
  sheetTitle: string;
  snapshotLabel: string;
  status: DraftingDrawingSheetIssueStatus;
  profileAudit?: DraftingSheetProfileAudit;
  profileAuditProvenance?: DraftingSheetProfileAuditProvenance;
};

export type DraftingProjectTransmittalPayload = {
  cc: string[];
  includedItems: DraftingProjectTransmittalItem[];
  issuedAt?: string;
  issuedBy?: string;
  issuedTo: string[];
  manifestSignature?: string;
  notes?: string;
  provenanceSummary: {
    drawingCount: number;
    frozenIssueCount: number;
    sheetCount: number;
    source: 'drafting_drawing_sheet_issue_snapshots';
  };
  purpose: string;
  status: DraftingProjectTransmittalStatus;
  title: string;
  warningSummary: string[];
};

export type DraftingProjectTransmittal = {
  id: string;
  projectId: string;
  organisationId: string;
  transmittalNumber: string;
  status: DraftingProjectTransmittalStatus;
  payload: DraftingProjectTransmittalPayload;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DraftingProjectTransmittalInput = {
  cc?: string[];
  includedItems: Array<
    Pick<DraftingProjectTransmittalItem, 'drawingId' | 'drawingSheetIssueId' | 'sheetId'>
  >;
  issuedAt?: string;
  issuedBy?: string;
  issuedTo?: string[];
  notes?: string;
  purpose: string;
  status?: DraftingProjectTransmittalStatus;
  title: string;
  transmittalNumber: string;
};

export interface CreateDraftingDrawingInput {
  title: string;
  kind?: DraftingDrawingKind;
}

export interface UpdateDraftingDrawingInput {
  title?: string;
  status?: DraftingDrawingStatus;
  kind?: DraftingDrawingKind;
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
    id: 'grid',
    name: 'Project Grid',
    visible: true,
    locked: false,
    color: '#475569',
    lineWeight: 1,
  },
  {
    id: 'shoring',
    name: 'Shoring',
    visible: true,
    locked: false,
    color: '#111827',
    lineWeight: 2,
  },
  {
    id: 'piles',
    name: 'Piles',
    visible: true,
    locked: false,
    color: '#111827',
    lineWeight: 2,
  },
  {
    id: 'anchors',
    name: 'Anchors',
    visible: true,
    locked: false,
    color: '#334155',
    lineWeight: 2,
  },
  {
    id: 'beams_walers',
    name: 'Beams / Walers',
    visible: true,
    locked: false,
    color: '#111827',
    lineWeight: 3,
  },
  {
    id: 'excavation',
    name: 'Excavation',
    visible: true,
    locked: false,
    color: '#334155',
    lineWeight: 2,
  },
  {
    id: 'monitoring',
    name: 'Monitoring',
    visible: true,
    locked: false,
    color: '#0f172a',
    lineWeight: 2,
  },
  {
    id: 'boreholes',
    name: 'Investigation',
    visible: true,
    locked: false,
    color: '#0f172a',
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
    id: 'services_conflicts',
    name: 'Services / Conflicts',
    visible: true,
    locked: false,
    color: '#7f1d1d',
    lineWeight: 2,
  },
  {
    id: 'sections',
    name: 'Sections',
    visible: true,
    locked: false,
    color: '#111827',
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
    name: 'Notes / Callouts',
    visible: true,
    locked: false,
    color: '#111827',
    lineWeight: 1,
  },
];

export function createDefaultDraftingLayers(): DraftingLayer[] {
  return DEFAULT_DRAFTING_LAYERS.map((layer) => ({ ...layer }));
}

export function createDefaultDraftingDrawingSetup(
  patch: Partial<DraftingDrawingSetup> = {},
): DraftingDrawingSetup {
  const referencePatch: Partial<DraftingReferencePoint> = patch.referencePoint ?? {};
  const sitePoint =
    referencePatch.sitePoint && Object.keys(referencePatch.sitePoint).length > 0
      ? { ...referencePatch.sitePoint }
      : undefined;

  return {
    modelUnits: patch.modelUnits ?? 'mm',
    displayUnits: patch.displayUnits ?? 'm',
    coordinatePrecision: patch.coordinatePrecision ?? 3,
    activeStandardProfileId: patch.activeStandardProfileId ?? 'as1100-general',
    disciplineProfileId: patch.disciplineProfileId ?? 'general',
    profileVersion: patch.profileVersion ?? '2026-04-as1100-style-v1',
    defaultSheetSize: patch.defaultSheetSize ?? 'A1',
    defaultTextHeightMm: patch.defaultTextHeightMm ?? 2.5,
    dimensionTextHeightMm: patch.dimensionTextHeightMm ?? 2.5,
    titleTextHeightMm: patch.titleTextHeightMm ?? 5,
    noteTextHeightMm: patch.noteTextHeightMm ?? 2.5,
    arrowheadStyle: patch.arrowheadStyle ?? 'closed-filled',
    northArrowStyle: patch.northArrowStyle ?? 'as1100-plain',
    scaleBarStyle: patch.scaleBarStyle ?? 'plain-metric',
    lineWeightTableId: patch.lineWeightTableId ?? 'as1100-style-lineweights-v1',
    lineStyleTableId: patch.lineStyleTableId ?? 'as1100-style-lines-v1',
    outputLineWeightScale: patch.outputLineWeightScale ?? 1,
    coordinateSurveyProfileId: patch.coordinateSurveyProfileId ?? 'as1100-survey-control',
    referencePoint: {
      id: referencePatch.id ?? 'model-origin',
      label: referencePatch.label ?? 'Model origin / survey mark',
      modelPoint: {
        x: referencePatch.modelPoint?.x ?? 0,
        y: referencePatch.modelPoint?.y ?? 0,
        z: referencePatch.modelPoint?.z ?? 0,
      },
      ...(sitePoint ? { sitePoint } : {}),
      datum: referencePatch.datum ?? '',
      coordinateSystem: referencePatch.coordinateSystem ?? '',
      description: referencePatch.description ?? '',
      locked: referencePatch.locked ?? false,
      updatedAt: referencePatch.updatedAt,
      updatedBy: referencePatch.updatedBy,
    },
    north: {
      projectNorthAngleDeg: patch.north?.projectNorthAngleDeg ?? 0,
      trueNorthAngleDeg: patch.north?.trueNorthAngleDeg ?? 0,
      showProjectNorth: patch.north?.showProjectNorth ?? true,
      showTrueNorth: patch.north?.showTrueNorth ?? false,
    },
    scale: {
      defaultSheetScale: patch.scale?.defaultSheetScale ?? '1:100',
      defaultCanvasScaleLabel: patch.scale?.defaultCanvasScaleLabel ?? 'Editing zoom',
      allowedScales: patch.scale?.allowedScales ?? ['1:20', '1:50', '1:100', '1:200', '1:500'],
    },
    graphics: {
      lineWeightMode: patch.graphics?.lineWeightMode ?? 'screen_constant',
      defaultLineWeightMm: patch.graphics?.defaultLineWeightMm ?? 0.25,
      lineWeightScale: patch.graphics?.lineWeightScale ?? 1,
      textScaleMode: patch.graphics?.textScaleMode ?? 'model',
    },
    standardsNote:
      patch.standardsNote ??
      'AS 1100-style drafting defaults. Exact AS defaults should be verified against the licensed standard before project certification.',
  };
}

export function ensureDraftingDrawingSetup(model: DraftingModel): DraftingDrawingSetup {
  return createDefaultDraftingDrawingSetup(model.drawingSetup);
}

export function ensureDraftingModelLayers(model: DraftingModel): DraftingModel {
  const existingLayersById = new Map(model.layers.map((layer) => [layer.id, layer]));
  const defaultLayerIds = new Set(DEFAULT_DRAFTING_LAYERS.map((layer) => layer.id));
  const orderedLayers = DEFAULT_DRAFTING_LAYERS.map(
    (layer) => existingLayersById.get(layer.id) ?? { ...layer },
  );
  const extraLayers = model.layers.filter((layer) => !defaultLayerIds.has(layer.id));

  return {
    ...model,
    drawingSetup: ensureDraftingDrawingSetup(model),
    layers: [...orderedLayers, ...extraLayers],
    objectChangeEvents: model.objectChangeEvents ?? [],
    titleBlock: model.titleBlock ?? {},
    revisionBlock: {
      currentRevision: model.revisionBlock?.currentRevision,
      revisions: model.revisionBlock?.revisions ?? [],
    },
    scheduleSheets: model.scheduleSheets ?? [],
    schedulePackIssues: model.schedulePackIssues ?? [],
    drawingSheets: model.drawingSheets ?? [],
    drawingSheetIssues: model.drawingSheetIssues ?? [],
    drawingTransmittals: model.drawingTransmittals ?? [],
  };
}

export function createEmptyDraftingModel(drawingId: string): DraftingModel {
  return ensureDraftingModelLayers({
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
    objectChangeEvents: [],
    titleBlock: {},
    revisionBlock: {
      revisions: [],
    },
    scheduleSheets: [],
    schedulePackIssues: [],
    drawingSheets: [],
    drawingSheetIssues: [],
    drawingTransmittals: [],
  });
}

export function defaultLayerIdForDraftingObjectType(type: DraftingObjectType): DraftingLayerId {
  switch (type) {
    case 'project_grid':
      return 'grid';
    case 'pile':
      return 'piles';
    case 'secant_pile_wall':
    case 'soldier_pile_wall':
      return 'shoring';
    case 'anchor_tieback':
      return 'anchors';
    case 'capping_beam':
    case 'waler':
      return 'beams_walers';
    case 'excavation_line':
      return 'excavation';
    case 'monitoring_point':
      return 'monitoring';
    case 'leader_note':
      return 'notes';
    case 'borehole':
    case 'survey_point':
      return 'boreholes';
    case 'service_run':
    case 'service_line':
      return 'services';
    case 'service_crossing':
      return 'services_conflicts';
    case 'draft_line':
    case 'draft_polyline':
    case 'draft_rectangle':
    case 'draft_circle':
    case 'draft_polygon':
      return 'notes';
    case 'structural_joint':
      return 'shoring';
    case 'geotech_surface':
      return 'boreholes';
    case 'section_marker':
      return 'sections';
    case 'dimension_chain':
    case 'dimension':
      return 'dimensions';
    case 'callout':
      return 'notes';
    default:
      return 'shoring';
  }
}
