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

export type DraftingLineRole =
  | 'objectVisible'
  | 'objectHidden'
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

export type DraftingSymbolDefinition = {
  label: string;
  lineRole: DraftingLineRole;
  role: DraftingSymbolRole;
};

export type DraftingStandardProfile = {
  disciplineProfileId: DraftingDrawingSetup['disciplineProfileId'];
  id: DraftingStandardProfileId;
  label: string;
  lineStyleTableId: string;
  lineStyles: Record<DraftingLineRole, DraftingLineStyleDefinition>;
  lineWeightTableId: string;
  notes: string[];
  scalePresets: string[];
  sheetPresets: DraftingSheetPreset[];
  sourceBasis: string[];
  symbols: Record<DraftingSymbolRole, DraftingSymbolDefinition>;
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

const generalLineStyles: Record<DraftingLineRole, DraftingLineStyleDefinition> = {
  objectVisible: lineRole('objectVisible', 0.35, '#334155'),
  objectHidden: lineRole('objectHidden', 0.25, '#64748b', '4 2'),
  centreLine: lineRole('centreLine', 0.25, '#475569', '7 2 1.5 2'),
  dimensionLine: lineRole('dimensionLine', 0.18, '#111827'),
  leaderLine: lineRole('leaderLine', 0.18, '#111827'),
  cuttingPlane: lineRole('cuttingPlane', 0.5, '#111827'),
  sectionLine: lineRole('sectionLine', 0.5, '#111827'),
  gridLine: lineRole('gridLine', 0.18, '#94a3b8'),
  underlay: lineRole('underlay', 0.13, '#94a3b8'),
  existing: lineRole('existing', 0.25, '#475569'),
  proposed: lineRole('proposed', 0.35, '#1d4ed8'),
  demolition: lineRole('demolition', 0.25, '#b91c1c', '4 2'),
  surveyControl: lineRole('surveyControl', 0.35, '#0f766e'),
  constructionSetout: lineRole('constructionSetout', 0.25, '#7c3aed', '6 2'),
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
      sectionLine: { lineWeightMm: 0.5 },
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
      constructionSetout: { lineWeightMm: 0.35 },
      gridLine: { lineWeightMm: 0.18 },
    },
    sourceBasis: ['AS 1100.401', 'AS 1100.101'],
  }),
];

export const DRAFTING_OBJECT_LINE_ROLE_MAP: Record<DraftingObject['type'], DraftingLineRole> = {
  pile: 'objectVisible',
  excavation_line: 'constructionSetout',
  monitoring_point: 'surveyControl',
  leader_note: 'leaderLine',
  secant_pile_wall: 'objectVisible',
  soldier_pile_wall: 'objectVisible',
  anchor_tieback: 'constructionSetout',
  capping_beam: 'sectionLine',
  waler: 'objectVisible',
  dimension_chain: 'dimensionLine',
  callout: 'leaderLine',
  section_marker: 'sectionLine',
  borehole: 'surveyControl',
  service_run: 'existing',
  service_crossing: 'objectHidden',
  survey_point: 'surveyControl',
  service_line: 'existing',
  dimension: 'dimensionLine',
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
    disciplineProfileId: args.disciplineProfileId,
    id: args.id,
    label: args.label,
    lineStyleTableId: 'as1100-style-lines-v1',
    lineStyles,
    lineWeightTableId: 'as1100-style-lineweights-v1',
    notes: [
      'AS 1100-style profile defaults; exact project certification remains a licensed-standard review task.',
      'Unverified line dash and symbol geometry tables remain configurable profile data.',
    ],
    scalePresets: DRAFTING_SCALE_PRESETS,
    sheetPresets: DRAFTING_SHEET_PRESETS,
    sourceBasis: args.sourceBasis,
    symbols,
    textStyles: as1100TextStyles,
    verifiedValues: [
      'AS 1100.101 page 66 character-height table values.',
      'AS 1100.101 page 66 character line thickness maximum ratio.',
    ],
    version: '2026-04-as1100-style-v1',
  };
}

function lineRole(
  role: DraftingLineRole,
  lineWeightMm: number,
  color: string,
  dashArray?: string,
): DraftingLineStyleDefinition {
  return {
    color,
    ...(dashArray ? { dashArray } : {}),
    lineWeightMm,
    role,
    notes: 'Configurable AS 1100-style default; verify exact table values before certification.',
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
