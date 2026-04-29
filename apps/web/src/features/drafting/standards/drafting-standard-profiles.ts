import type { DraftingDrawingSetup, DraftingObject } from '@eng/shared';

export const DRAFTING_STANDARD_PROFILE_IDS = [
  'as1100-general',
  'as1100-structural',
  'as1100-survey',
] as const;

export type DraftingStandardProfileId = (typeof DRAFTING_STANDARD_PROFILE_IDS)[number];

export type DraftingTextRole =
  | 'drawingTitle'
  | 'sheetTitle'
  | 'viewTitle'
  | 'sectionLabel'
  | 'dimension'
  | 'generalNote'
  | 'scheduleBody'
  | 'scheduleHeader'
  | 'gridReference'
  | 'callout';

export const DRAFTING_STANDARD_TEXT_PRESETS = [
  'TITLE',
  'SUBTITLE',
  'ANNOTATION',
  'DIMENSION',
  'NOTE_SMALL',
  'TABLE',
] as const;

export type DraftingStandardTextPreset = (typeof DRAFTING_STANDARD_TEXT_PRESETS)[number];

export type DraftingLineRole =
  | 'referenceUnderlay'
  | 'objectVisible'
  | 'objectHidden'
  | 'structuralPrimary'
  | 'structuralSecondary'
  | 'pileOutline'
  | 'pileCentreMark'
  | 'wallBaseline'
  | 'anchorTieback'
  | 'beamWaler'
  | 'serviceExisting'
  | 'serviceProposed'
  | 'serviceConflict'
  | 'borehole'
  | 'monitoringPoint'
  | 'dimension'
  | 'leaderCallout'
  | 'sectionMarker'
  | 'surveyReferenceMark'
  | 'northArrow'
  | 'centreLine'
  | 'dimensionLine'
  | 'leaderLine'
  | 'cuttingPlane'
  | 'sectionLine'
  | 'gridLine'
  | 'underlay'
  | 'existing'
  | 'proposed'
  | 'demolition'
  | 'surveyControl'
  | 'constructionSetout';

export const DRAFTING_STANDARD_LINE_ROLES = [
  'OBJECT_OUTLINE',
  'HIDDEN',
  'CENTRE',
  'DIMENSION',
  'EXTENSION',
  'HATCH',
  'SECTION',
  'LEADER',
  'GRID',
  'BORDER',
] as const;

export type DraftingStandardLineRole = (typeof DRAFTING_STANDARD_LINE_ROLES)[number];
export type DraftingLineProfileRole = DraftingLineRole | DraftingStandardLineRole;

export const DRAFTING_STANDARD_LINE_ROLE_ALIASES: Record<
  DraftingStandardLineRole,
  DraftingLineRole
> = {
  OBJECT_OUTLINE: 'objectVisible',
  HIDDEN: 'objectHidden',
  CENTRE: 'centreLine',
  DIMENSION: 'dimensionLine',
  EXTENSION: 'dimension',
  HATCH: 'underlay',
  SECTION: 'sectionLine',
  LEADER: 'leaderLine',
  GRID: 'gridLine',
  BORDER: 'structuralPrimary',
};

export const DRAFTING_LINE_TYPE_IDS = ['solid', 'dashed', 'centre', 'hidden'] as const;

export type DraftingLineTypeId = (typeof DRAFTING_LINE_TYPE_IDS)[number];

export type DraftingSymbolRole =
  | 'arrowhead'
  | 'dot'
  | 'sectionMarker'
  | 'northArrowProject'
  | 'northArrowTrue'
  | 'surveyMark'
  | 'gridBubble'
  | 'detailReference';

export type DraftingSheetPreset = {
  heightMm: number;
  id: 'A0' | 'A1' | 'A2' | 'A3' | 'A4';
  label: string;
  widthMm: number;
};

export type DraftingLineStyleDefinition = {
  color: string;
  dashArray?: string;
  lineType: DraftingLineTypeId;
  lineWeightMm: number;
  notes?: string;
  role: DraftingLineRole;
};

export type DraftingTextStyleDefinition = {
  a0B1HeightMm: number;
  a1ToA4HeightMm: number;
  characterLineThicknessRatioMax: number;
  role: DraftingTextRole;
};

export type DraftingLineTypeDefinition = {
  dashArray?: string;
  id: DraftingLineTypeId;
  label: string;
  notes: string;
};

export type DraftingTextPresetDefinition = {
  emphasis: 'normal' | 'medium' | 'strong';
  lineHeight: number;
  role: DraftingStandardTextPreset;
  textRole: DraftingTextRole;
};

export type DraftingDimensionStyleDefinition = {
  extensionGapModelUnits: number;
  extensionOvershootModelUnits: number;
  extensionRole: DraftingLineRole;
  labelBackingFill: string;
  labelBackingOpacity: number;
  labelGapModelUnits: number;
  labelHaloColor: string;
  lineRole: DraftingLineRole;
  textPreset: DraftingStandardTextPreset;
  tickLengthModelUnits: number;
  totalLineGapModelUnits: number;
  totalTextGapModelUnits: number;
};

export type DraftingLeaderStyleDefinition = {
  colorRole: DraftingLineRole;
  labelHaloColor: string;
  lineRole: DraftingLineRole;
  maxLeaderOpacity: number;
  textPreset: DraftingStandardTextPreset;
};

export type DraftingProfilePalette = {
  background: string;
  conflict: string;
  halo: string;
  ink: string;
  mutedInk: string;
  selectionFill: string;
  selectionStroke: string;
  sheetBackground: string;
  softInk: string;
};

export type DraftingSymbolDefinition = {
  label: string;
  lineRole: DraftingLineRole;
  role: DraftingSymbolRole;
};

export type DraftingStandardProfile = {
  dimensionStyle: DraftingDimensionStyleDefinition;
  disciplineProfileId: DraftingDrawingSetup['disciplineProfileId'];
  id: DraftingStandardProfileId;
  label: string;
  lineStyleTableId: string;
  lineStyles: Record<DraftingLineRole, DraftingLineStyleDefinition>;
  lineTypes: Record<DraftingLineTypeId, DraftingLineTypeDefinition>;
  lineWeightTableId: string;
  leaderStyle: DraftingLeaderStyleDefinition;
  notes: string[];
  palette: DraftingProfilePalette;
  scalePresets: string[];
  sheetPresets: DraftingSheetPreset[];
  sourceBasis: string[];
  symbols: Record<DraftingSymbolRole, DraftingSymbolDefinition>;
  textPresets: Record<DraftingStandardTextPreset, DraftingTextPresetDefinition>;
  textStyles: Record<DraftingTextRole, DraftingTextStyleDefinition>;
  verifiedValues: string[];
  version: string;
};

export const DRAFTING_SCALE_PRESETS = [
  '1:1',
  '1:2',
  '1:5',
  '1:10',
  '1:20',
  '1:25',
  '1:50',
  '1:100',
  '1:200',
  '1:250',
  '1:500',
  '1:1000',
];

export const DRAFTING_SHEET_PRESETS: DraftingSheetPreset[] = [
  { id: 'A0', label: 'A0', widthMm: 1189, heightMm: 841 },
  { id: 'A1', label: 'A1', widthMm: 841, heightMm: 594 },
  { id: 'A2', label: 'A2', widthMm: 594, heightMm: 420 },
  { id: 'A3', label: 'A3', widthMm: 420, heightMm: 297 },
  { id: 'A4', label: 'A4', widthMm: 297, heightMm: 210 },
];

const as1100TextStyles: Record<DraftingTextRole, DraftingTextStyleDefinition> = {
  drawingTitle: textRole('drawingTitle', 7, 5),
  sheetTitle: textRole('sheetTitle', 7, 5),
  viewTitle: textRole('viewTitle', 5, 3.5),
  sectionLabel: textRole('sectionLabel', 5, 3.5),
  dimension: textRole('dimension', 3.5, 2.5),
  generalNote: textRole('generalNote', 3.5, 2.5),
  scheduleBody: textRole('scheduleBody', 3.5, 2.5),
  scheduleHeader: textRole('scheduleHeader', 5, 3.5),
  gridReference: textRole('gridReference', 5, 3.5),
  callout: textRole('callout', 3.5, 2.5),
};

const as1100TextPresets: Record<DraftingStandardTextPreset, DraftingTextPresetDefinition> = {
  TITLE: textPreset('TITLE', 'drawingTitle', 'strong', 1.12),
  SUBTITLE: textPreset('SUBTITLE', 'viewTitle', 'strong', 1.1),
  ANNOTATION: textPreset('ANNOTATION', 'generalNote', 'medium', 1.08),
  DIMENSION: textPreset('DIMENSION', 'dimension', 'medium', 1),
  NOTE_SMALL: textPreset('NOTE_SMALL', 'callout', 'normal', 1.05),
  TABLE: textPreset('TABLE', 'scheduleBody', 'normal', 1.08),
};

const profilePalette: DraftingProfilePalette = {
  background: '#f8fafc',
  conflict: '#7f1d1d',
  halo: '#ffffff',
  ink: '#111827',
  mutedInk: '#334155',
  selectionFill: 'rgba(37, 99, 235, 0.08)',
  selectionStroke: '#2563eb',
  sheetBackground: '#ffffff',
  softInk: '#64748b',
};

const lineTypes: Record<DraftingLineTypeId, DraftingLineTypeDefinition> = {
  solid: lineType('solid', 'Solid', undefined),
  dashed: lineType('dashed', 'Dashed', '4 2'),
  centre: lineType('centre', 'Centre', '7 2 1.5 2'),
  hidden: lineType('hidden', 'Hidden', '4 2'),
};

const generalLineStyles: Record<DraftingLineRole, DraftingLineStyleDefinition> = {
  referenceUnderlay: lineRole('referenceUnderlay', 0.13, profilePalette.softInk, 'solid'),
  objectVisible: lineRole('objectVisible', 0.35, profilePalette.mutedInk, 'solid'),
  objectHidden: lineRole('objectHidden', 0.25, profilePalette.softInk, 'hidden'),
  structuralPrimary: lineRole('structuralPrimary', 0.35, profilePalette.ink, 'solid'),
  structuralSecondary: lineRole('structuralSecondary', 0.25, profilePalette.mutedInk, 'solid'),
  pileOutline: lineRole('pileOutline', 0.35, profilePalette.ink, 'solid'),
  pileCentreMark: lineRole('pileCentreMark', 0.18, profilePalette.softInk, 'centre'),
  wallBaseline: lineRole('wallBaseline', 0.25, profilePalette.mutedInk, 'centre'),
  anchorTieback: lineRole('anchorTieback', 0.25, profilePalette.mutedInk, 'solid'),
  beamWaler: lineRole('beamWaler', 0.35, profilePalette.ink, 'solid'),
  serviceExisting: lineRole('serviceExisting', 0.25, profilePalette.mutedInk, 'solid'),
  serviceProposed: lineRole('serviceProposed', 0.25, profilePalette.mutedInk, 'dashed', '6 2'),
  serviceConflict: lineRole('serviceConflict', 0.35, profilePalette.conflict, 'solid'),
  borehole: lineRole('borehole', 0.25, profilePalette.ink, 'solid'),
  monitoringPoint: lineRole('monitoringPoint', 0.25, profilePalette.ink, 'solid'),
  dimension: lineRole('dimension', 0.18, profilePalette.ink, 'solid'),
  leaderCallout: lineRole('leaderCallout', 0.18, profilePalette.ink, 'solid'),
  sectionMarker: lineRole('sectionMarker', 0.5, profilePalette.ink, 'solid'),
  surveyReferenceMark: lineRole('surveyReferenceMark', 0.35, profilePalette.ink, 'solid'),
  northArrow: lineRole('northArrow', 0.35, profilePalette.ink, 'solid'),
  centreLine: lineRole('centreLine', 0.25, profilePalette.softInk, 'centre'),
  dimensionLine: lineRole('dimensionLine', 0.18, profilePalette.ink, 'solid'),
  leaderLine: lineRole('leaderLine', 0.18, profilePalette.ink, 'solid'),
  cuttingPlane: lineRole('cuttingPlane', 0.5, profilePalette.ink, 'solid'),
  sectionLine: lineRole('sectionLine', 0.5, profilePalette.ink, 'solid'),
  gridLine: lineRole('gridLine', 0.18, profilePalette.softInk, 'solid'),
  underlay: lineRole('underlay', 0.13, profilePalette.softInk, 'solid'),
  existing: lineRole('existing', 0.25, profilePalette.softInk, 'solid'),
  proposed: lineRole('proposed', 0.35, profilePalette.mutedInk, 'solid'),
  demolition: lineRole('demolition', 0.25, profilePalette.conflict, 'dashed'),
  surveyControl: lineRole('surveyControl', 0.35, profilePalette.ink, 'solid'),
  constructionSetout: lineRole(
    'constructionSetout',
    0.25,
    profilePalette.mutedInk,
    'dashed',
    '6 2',
  ),
};

const dimensionStyle: DraftingDimensionStyleDefinition = {
  extensionGapModelUnits: 90,
  extensionOvershootModelUnits: 180,
  extensionRole: 'dimension',
  labelBackingFill: profilePalette.halo,
  labelBackingOpacity: 0.84,
  labelGapModelUnits: 340,
  labelHaloColor: profilePalette.halo,
  lineRole: 'dimensionLine',
  textPreset: 'DIMENSION',
  tickLengthModelUnits: 210,
  totalLineGapModelUnits: 620,
  totalTextGapModelUnits: 420,
};

const leaderStyle: DraftingLeaderStyleDefinition = {
  colorRole: 'leaderLine',
  labelHaloColor: profilePalette.halo,
  lineRole: 'leaderLine',
  maxLeaderOpacity: 0.68,
  textPreset: 'ANNOTATION',
};

const symbols: Record<DraftingSymbolRole, DraftingSymbolDefinition> = {
  arrowhead: symbolRole('arrowhead', 'Closed filled arrowhead', 'leaderLine'),
  dot: symbolRole('dot', 'Dot terminator', 'leaderLine'),
  sectionMarker: symbolRole('sectionMarker', 'Section marker', 'sectionLine'),
  northArrowProject: symbolRole('northArrowProject', 'PN', 'surveyControl'),
  northArrowTrue: symbolRole('northArrowTrue', 'TN', 'surveyControl'),
  surveyMark: symbolRole('surveyMark', 'Survey mark', 'surveyControl'),
  gridBubble: symbolRole('gridBubble', 'Grid bubble', 'gridLine'),
  detailReference: symbolRole('detailReference', 'Detail reference', 'leaderLine'),
};

export const DRAFTING_STANDARD_PROFILES: DraftingStandardProfile[] = [
  createProfile({
    disciplineProfileId: 'general',
    id: 'as1100-general',
    label: 'AS 1100 General',
    sourceBasis: ['AS 1100.101'],
  }),
  createProfile({
    disciplineProfileId: 'structural',
    id: 'as1100-structural',
    label: 'AS/NZS 1100 Structural',
    lineOverrides: {
      objectVisible: { lineWeightMm: 0.35 },
      structuralPrimary: { lineWeightMm: 0.35 },
      beamWaler: { lineWeightMm: 0.35 },
      pileOutline: { lineWeightMm: 0.35 },
      sectionLine: { lineWeightMm: 0.5 },
      sectionMarker: { lineWeightMm: 0.5 },
      gridLine: { lineWeightMm: 0.25 },
      constructionSetout: { lineWeightMm: 0.25 },
    },
    sourceBasis: ['AS/NZS 1100.501', 'AS 1100.101'],
  }),
  createProfile({
    disciplineProfileId: 'survey-control',
    id: 'as1100-survey',
    label: 'AS 1100 Survey / Control',
    lineOverrides: {
      surveyControl: { lineWeightMm: 0.5 },
      surveyReferenceMark: { lineWeightMm: 0.5 },
      constructionSetout: { lineWeightMm: 0.35 },
      gridLine: { lineWeightMm: 0.18 },
    },
    sourceBasis: ['AS 1100.401', 'AS 1100.101'],
  }),
];

export const DRAFTING_OBJECT_LINE_ROLE_MAP: Record<DraftingObject['type'], DraftingLineRole> = {
  pile: 'pileOutline',
  excavation_line: 'constructionSetout',
  monitoring_point: 'monitoringPoint',
  leader_note: 'leaderCallout',
  secant_pile_wall: 'structuralPrimary',
  soldier_pile_wall: 'structuralPrimary',
  anchor_tieback: 'anchorTieback',
  capping_beam: 'beamWaler',
  waler: 'beamWaler',
  dimension_chain: 'dimension',
  callout: 'leaderCallout',
  section_marker: 'sectionMarker',
  borehole: 'borehole',
  service_run: 'serviceExisting',
  service_crossing: 'serviceConflict',
  draft_line: 'objectVisible',
  draft_polyline: 'objectVisible',
  draft_rectangle: 'objectVisible',
  draft_circle: 'objectVisible',
  draft_polygon: 'objectVisible',
  structural_joint: 'structuralPrimary',
  geotech_surface: 'constructionSetout',
  survey_point: 'surveyReferenceMark',
  service_line: 'serviceExisting',
  dimension: 'dimension',
  title_block: 'objectVisible',
  revision_block: 'objectVisible',
};

export function getDraftingStandardProfile(profileId?: string): DraftingStandardProfile {
  return (
    DRAFTING_STANDARD_PROFILES.find((profile) => profile.id === profileId) ??
    DRAFTING_STANDARD_PROFILES[0]!
  );
}

function createProfile(args: {
  disciplineProfileId: DraftingDrawingSetup['disciplineProfileId'];
  id: DraftingStandardProfileId;
  label: string;
  lineOverrides?: Partial<Record<DraftingLineRole, Partial<DraftingLineStyleDefinition>>>;
  sourceBasis: string[];
}): DraftingStandardProfile {
  const lineStyles = { ...generalLineStyles };
  for (const [role, override] of Object.entries(args.lineOverrides ?? {}) as Array<
    [DraftingLineRole, Partial<DraftingLineStyleDefinition>]
  >) {
    lineStyles[role] = { ...lineStyles[role], ...override };
  }

  return {
    dimensionStyle,
    disciplineProfileId: args.disciplineProfileId,
    id: args.id,
    label: args.label,
    lineStyleTableId: 'as1100-style-lines-v1',
    lineStyles,
    lineTypes,
    lineWeightTableId: 'as1100-style-lineweights-v1',
    leaderStyle,
    notes: [
      'AS 1100-style profile defaults; exact project certification remains a licensed-standard review task.',
      'Unverified line dash and symbol geometry tables remain configurable profile data.',
      'Profiles derive presentation defaults from repo-approved AS 1100 notes without embedding licensed source text.',
    ],
    palette: profilePalette,
    scalePresets: DRAFTING_SCALE_PRESETS,
    sheetPresets: DRAFTING_SHEET_PRESETS,
    sourceBasis: args.sourceBasis,
    symbols,
    textPresets: as1100TextPresets,
    textStyles: as1100TextStyles,
    verifiedValues: [
      'AS 1100.101 page 66 character-height table values.',
      'AS 1100.101 page 66 character line thickness maximum ratio.',
    ],
    version: '2026-04-as1100-style-v1',
  };
}

export function resolveDraftingStandardLineRole(role: DraftingLineProfileRole): DraftingLineRole {
  if ((DRAFTING_STANDARD_LINE_ROLES as readonly string[]).includes(role)) {
    return DRAFTING_STANDARD_LINE_ROLE_ALIASES[role as DraftingStandardLineRole];
  }

  return role as DraftingLineRole;
}

function lineRole(
  role: DraftingLineRole,
  lineWeightMm: number,
  color: string,
  lineType: DraftingLineTypeId = 'solid',
  dashArray?: string,
): DraftingLineStyleDefinition {
  return {
    color,
    dashArray: dashArray ?? lineTypes[lineType].dashArray,
    lineType,
    lineWeightMm,
    role,
    notes: 'Configurable AS 1100-style default; verify exact table values before certification.',
  };
}

function lineType(
  id: DraftingLineTypeId,
  label: string,
  dashArray?: string,
): DraftingLineTypeDefinition {
  return {
    ...(dashArray ? { dashArray } : {}),
    id,
    label,
    notes: 'AS 1100-informed line pattern role; verify exact table geometry before certification.',
  };
}

function symbolRole(
  role: DraftingSymbolRole,
  label: string,
  lineRole: DraftingLineRole,
): DraftingSymbolDefinition {
  return { label, lineRole, role };
}

function textRole(
  role: DraftingTextRole,
  a0B1HeightMm: number,
  a1ToA4HeightMm: number,
): DraftingTextStyleDefinition {
  return {
    a0B1HeightMm,
    a1ToA4HeightMm,
    characterLineThicknessRatioMax: 0.1,
    role,
  };
}

function textPreset(
  role: DraftingStandardTextPreset,
  textRole: DraftingTextRole,
  emphasis: DraftingTextPresetDefinition['emphasis'],
  lineHeight: number,
): DraftingTextPresetDefinition {
  return {
    emphasis,
    lineHeight,
    role,
    textRole,
  };
}
