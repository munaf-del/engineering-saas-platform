import type {
  MultiPileCombinationRow,
  MultiPileEnvelopeRunSummary,
  MultiPileEnvelopeValue,
  MultiPileGeoResultRow,
  MultiPileGeoTypeSettings,
  MultiPileProjectGeotechnicalMaterial,
  MultiPileProjectReference,
  MultiPileState,
  MultiPileStructResult,
  Project,
} from '@eng/shared';
import { normalizeMultiPileSelectedCombinationIds } from '@eng/shared';
import { extractProjectLoadDefinition } from '@/features/projects/project-load-definition-adapter';
import {
  extractProjectSpecifics,
  projectGeotechnicalSummary,
  projectReferencesSummary,
  projectStructuralDefaultsSummary,
} from '@/features/projects/project-specifics-adapter';
import {
  buildPricingSummaryData,
  type PricingSummaryData,
  type PricingTypeSummaryRow,
} from './pricing-summary';
import { derivePileRegisterRows, pileTypeSelectLabel } from './utils';

const EMPTY_VALUE = '—';
const PENDING_VALUE = 'Pending';
const NOT_AUTHORED_VALUE = 'Not authored';
const NOT_RECORDED_VALUE = 'Not recorded';
const FLAGGED_VERIFICATION_ROW_LIMIT = 60;

type ContextTone = 'default' | 'success' | 'warning' | 'danger';
type VerificationStatus = 'pass' | 'warn' | 'fail' | 'unresolved';
type RegisterStatusKey = 'pass' | 'fail' | 'warning' | 'pending' | 'not-run' | 'excluded';
const COMPACT_FLAGGED_VERIFICATION_STATUSES = new Set<VerificationStatus>([
  'fail',
  'warn',
  'unresolved',
]);
export type MultiPileReportSummaryMode = 'compact' | 'appendix';
export type MultiPileReportSummaryAppendixMode = 'pricing' | 'justification' | 'full';

export interface MultiPileReportSummaryHeader {
  projectNumber: string;
  projectName: string;
  client: string;
  location: string;
  revision: string;
  issueDate: string;
  pileCount: number;
  activePileTypeCount: number;
  title: string;
}

export interface MultiPileReportContextCard {
  label: string;
  value: string;
  detail: string;
  tone?: ContextTone;
}

export interface MultiPileReportSummaryField {
  label: string;
  value: string;
}

export interface MultiPileReportGoverningTraceRow {
  key: 'nMax' | 'nMin' | 'vx' | 'vy' | 'mx' | 'my';
  label: string;
  unit: string;
  value: string;
  jointLabel: string;
  pileTypeId: string;
  combinationName: string;
  source: string;
}

export interface MultiPileReportPileTypeSummaryRow {
  pileType: string;
  count: number;
  diameter: string;
  concreteGrade: string;
  reinforcementSummary: string;
  tendonSummary: string;
  coverDurability: string;
  typicalSocketMaterial: string;
  typicalSocketLength: string;
  typicalCageLength: string;
  structuralSectionSummary: string;
  elevationSummary: string;
  geoStatus: string;
  structStatus: string;
}

export interface MultiPileReportVerificationRow {
  pileId: string;
  jointLabel: string;
  pileType: string;
  geoStatus: string;
  structStatus: string;
  governingSource: string;
  governingDetail: string;
  noteSummary: string;
  status: VerificationStatus;
}

export interface MultiPileReportVerificationSummary {
  totalDerivedPiles: number;
  passCount: number;
  warnCount: number;
  failCount: number;
  unresolvedCount: number;
  mode: 'full' | 'flagged' | 'summary-only';
  note: string;
  rows: MultiPileReportVerificationRow[];
  hiddenCount: number;
}

export interface MultiPileReportGeoTypeSummaryRow {
  key: string;
  pileType: string;
  pileCount: number;
  geoStatus: string;
  representativeBasis: string;
  redundancy: string;
  phiG: string;
  foundingSocketMaterial: string;
  adoptedSocketLength: string;
  note: string;
}

export interface MultiPileReportStructTypeSummaryCard {
  pileType: string;
  pileCount: number;
  representativePile: string;
  worstJoint: string;
  status: string;
  axialUtil: string;
  pmUtil: string;
  shearUtil: string;
  complianceSummary: string;
  governingSource: string;
  governingCombo: string;
}

export interface MultiPileReportReferenceRow {
  key: string;
  title: string;
  documentType: string;
  documentNumber: string;
  revision: string;
  issueDate: string;
  authorOrganisation: string;
  reportUse: string;
  notes: string;
}

export interface MultiPileReportSelectedCombinationRow {
  key: string;
  name: string;
  source: string;
  includeInEnvelope: string;
  expressionSummary: string;
}

export interface MultiPileReportVerificationFocusGroup {
  key: string;
  pileType: string;
  failCount: number;
  warnCount: number;
  unresolvedCount: number;
  rows: MultiPileReportVerificationRow[];
}

export interface MultiPileReportVerificationScheduleGroup {
  key: string;
  pileType: string;
  totalDerivedPiles: number;
  passCount: number;
  warnCount: number;
  failCount: number;
  unresolvedCount: number;
  rows: MultiPileReportVerificationRow[];
}

export interface MultiPileReportFullVerificationSchedule {
  summary: MultiPileReportVerificationSummary;
  groups: MultiPileReportVerificationScheduleGroup[];
}

export interface MultiPileReportJustificationAppendixData {
  header: MultiPileReportSummaryHeader;
  projectContextSummary: MultiPileReportContextCard[];
  reportProvenanceFields: MultiPileReportSummaryField[];
  referenceSummaryCards: MultiPileReportContextCard[];
  referenceRows: MultiPileReportReferenceRow[];
  geoBasisCards: MultiPileReportContextCard[];
  geoTypeRows: MultiPileReportGeoTypeSummaryRow[];
  arrBasisCards: MultiPileReportContextCard[];
  loadBasisCards: MultiPileReportContextCard[];
  selectedCombinationRows: MultiPileReportSelectedCombinationRow[];
  governingTraceRows: MultiPileReportGoverningTraceRow[];
  pileVerificationFocus: {
    summary: MultiPileReportVerificationSummary;
    groups: MultiPileReportVerificationFocusGroup[];
  };
  fullVerificationSchedule: MultiPileReportFullVerificationSchedule | null;
  structSummary: {
    cards: MultiPileReportContextCard[];
    typeCards: MultiPileReportStructTypeSummaryCard[];
  };
  openIssues: string[];
}

export interface MultiPileReportSummaryData {
  mode: MultiPileReportSummaryMode;
  appendixMode: MultiPileReportSummaryAppendixMode | null;
  header: MultiPileReportSummaryHeader;
  projectContextSummary: MultiPileReportContextCard[];
  loadCombinationSummary: {
    projectLoadCaseCount: number;
    projectCombinationCount: number;
    selectedCombinationCount: number;
    selectedCombinationSummary: string;
    latestRunSummary: string;
    governingTraceRows: MultiPileReportGoverningTraceRow[];
  };
  pileTypeSummaryRows: MultiPileReportPileTypeSummaryRow[];
  pileVerificationSummary: MultiPileReportVerificationSummary;
  geoSummary: {
    cards: MultiPileReportContextCard[];
    typeRows: MultiPileReportGeoTypeSummaryRow[];
  };
  structSummary: {
    cards: MultiPileReportContextCard[];
    typeCards: MultiPileReportStructTypeSummaryCard[];
  };
  justificationAppendix: MultiPileReportJustificationAppendixData | null;
  pricingAppendix: PricingSummaryData | null;
}

type GoverningTraceSourceRow = {
  jointId: string;
  jointDisplayName?: string;
  pileTypeId: string;
  nMax: MultiPileEnvelopeValue;
  nMin: MultiPileEnvelopeValue;
  vx: MultiPileEnvelopeValue;
  vy: MultiPileEnvelopeValue;
  mx: MultiPileEnvelopeValue;
  my: MultiPileEnvelopeValue;
};

export function buildMultiPileReportSummaryPrintPath({
  projectId,
  groupId,
  appendix,
}: {
  projectId: string;
  groupId: string;
  appendix?: MultiPileReportSummaryAppendixMode | null;
}) {
  const params = new URLSearchParams();
  if (appendix) {
    params.set('appendix', appendix);
  }

  const query = params.toString();
  return `/projects/${projectId}/pile-groups/${groupId}/multi-pile/report-summary/print${query ? `?${query}` : ''}`;
}

export function buildMultiPileReportSummaryData({
  project,
  groupName,
  draft,
  latestRun,
  appendix,
}: {
  project: Project;
  groupName?: string | null;
  draft: MultiPileState;
  latestRun?: MultiPileEnvelopeRunSummary | null;
  appendix?: MultiPileReportSummaryAppendixMode | null;
}): MultiPileReportSummaryData {
  const projectSpecifics = extractProjectSpecifics(project);
  const projectLoadDefinition = extractProjectLoadDefinition(project);
  const appendixMode = appendix ?? null;
  const showPricingAppendix = includesPricingAppendix(appendixMode);
  const showJustificationAppendix = includesJustificationAppendix(appendixMode);
  const includeFullVerificationSchedule = includesFullVerificationSchedule(appendixMode);
  const pricingSummaryData = buildPricingSummaryData({
    draft,
    projectSpecifics,
    latestRun,
    projectCode: project.code,
    projectName: project.name,
  });
  const referencesSummary = projectReferencesSummary(project);
  const structuralDefaultsSummary = projectStructuralDefaultsSummary(project);
  const geotechnicalSummary = projectGeotechnicalSummary(project);
  const activePileTypes = draft.pileTypes.filter((pileType) => pileType.active !== false);
  const derivedPileRows = derivePileRegisterRows(draft);
  const selectedCombinationIds = normalizeMultiPileSelectedCombinationIds(
    draft.selectedCombinations,
    draft.combinationLibrary,
  );
  const selectedCombinationSummary = summarizeSelectedCombinations(
    selectedCombinationIds,
    draft.combinationLibrary,
  );
  const verificationRows = buildVerificationRows({ draft, latestRun });
  const verificationSummary = buildCompactVerificationSummary(verificationRows, {
    includeFullVerificationSchedule,
  });
  const typeGeoStatusByTypeId = summarizeTypeGeoStatuses(verificationRows);
  const typeStructStatusByTypeId = summarizeTypeStructStatuses({ draft, latestRun });
  const geoTypeRows = buildGeoTypeSummaryRows({
    draft,
    pricingSummaryData,
    projectSpecifics,
    verificationRows,
  });
  const structTypeCards = buildStructTypeCards({
    draft,
    latestRun,
    pricingSummaryData,
  });
  const projectEnvelopeRows = latestRun?.envelope?.jointResults ?? [];
  const header = {
    projectNumber: normalizeHeaderValue(projectSpecifics.identity.projectNumber, project.code),
    projectName: normalizeHeaderValue(projectSpecifics.identity.projectName, project.name),
    client: normalizeHeaderValue(projectSpecifics.identity.client),
    location: normalizeHeaderValue(
      projectSpecifics.identity.address,
      projectSpecifics.identity.mapAddress,
    ),
    revision: normalizeHeaderValue(projectSpecifics.reportMeta.reportRevision),
    issueDate: normalizeHeaderValue(projectSpecifics.reportMeta.issueDate),
    pileCount: derivedPileRows.length,
    activePileTypeCount: activePileTypes.length,
    title: normalizeHeaderValue(groupName, project.name, 'Multi-Pile'),
  } satisfies MultiPileReportSummaryHeader;
  const projectContextSummary = [
    {
      label: 'References Summary',
      value: `${referencesSummary.totalReferences} active`,
      detail: `${referencesSummary.includedInReportCount} included in report · GEO ${referencesSummary.primaryGeotechnicalTitle} · STRUCT ${referencesSummary.primaryStructuralTitle}`,
    },
    {
      label: 'Structural Defaults Summary',
      value: `${structuralDefaultsSummary.configuredLibraries}/4 configured`,
      detail: `${structuralDefaultsSummary.concreteClasses.activeRows} concrete · ${structuralDefaultsSummary.reinforcementGrades.activeRows} reinforcement · ${structuralDefaultsSummary.tendonGrades.activeRows} tendon · ${structuralDefaultsSummary.coverDurabilityClasses.activeRows} cover`,
    },
    {
      label: 'Geotechnical Library Summary',
      value: `${geotechnicalSummary.activeMaterials} adopted`,
      detail: `${geotechnicalSummary.activeReferenceTitle} · ${geotechnicalSummary.templateState} · ${clipText(geotechnicalSummary.socketAssumptionsSummary, 88)}`,
    },
    {
      label: 'ARR Summary',
      value: `${geotechnicalSummary.arrValueSummary} · ${geotechnicalSummary.arrBandSummary}`,
      detail: `phi_g ${geotechnicalSummary.phiGLowSummary} / ${geotechnicalSummary.phiGHighSummary} · ${geotechnicalSummary.testingSummary}`,
      tone: geotechnicalSummary.arrBandSummary === 'Not recorded' ? 'warning' : 'success',
    },
    {
      label: 'Load Library Summary',
      value: `${projectLoadDefinition.loadCases.length} cases · ${projectLoadDefinition.loadCombinations.length} combinations`,
      detail: `${selectedCombinationIds.length} selected in Multi-Pile · ${projectLoadDefinition.loadCombinations.filter((row) => row.enabled && row.includeInEnvelope).length} project-included`,
    },
    {
      label: 'Run Status Summary',
      value: latestRun ? humanizeRunStatus(latestRun.status) : 'Not run',
      detail: latestRun
        ? buildLatestRunDetail(latestRun)
        : 'Run Envelope to persist joint envelope, GEO, and STRUCT outputs.',
      tone: latestRun ? runTone(latestRun.status) : 'warning',
    },
  ] satisfies MultiPileReportContextCard[];
  const loadCombinationSummary = {
    projectLoadCaseCount: projectLoadDefinition.loadCases.length,
    projectCombinationCount: projectLoadDefinition.loadCombinations.length,
    selectedCombinationCount: selectedCombinationIds.length,
    selectedCombinationSummary,
    latestRunSummary: latestRun
      ? buildLatestRunDetail(latestRun)
      : 'No stored envelope snapshot yet.',
    governingTraceRows: buildGoverningTraceRows(projectEnvelopeRows),
  };
  const structSummary = {
    cards: buildStructOverviewCards(structTypeCards),
    typeCards: structTypeCards,
  };
  const geoSummaryCards = buildGeoSummaryCards({
    projectSpecifics,
    geotechnicalSummary,
    verificationRows,
  });

  return {
    mode: appendixMode ? 'appendix' : 'compact',
    appendixMode,
    header,
    projectContextSummary,
    loadCombinationSummary,
    pileTypeSummaryRows: pricingSummaryData.typeSummaryRows.map((row) => ({
      pileType: row.pileType,
      count: row.count,
      diameter: row.diameter,
      concreteGrade: row.concreteGrade,
      reinforcementSummary: row.reinforcementSummary,
      tendonSummary: row.tendonSummary,
      coverDurability: row.coverDurability,
      typicalSocketMaterial: row.typicalSocketMaterial,
      typicalSocketLength: row.typicalSocketLength,
      typicalCageLength: row.typicalCageLength,
      structuralSectionSummary: row.structuralSectionSummary,
      elevationSummary: row.elevationSummary,
      geoStatus: typeGeoStatusByTypeId.get(row.pileTypeId) ?? PENDING_VALUE,
      structStatus: typeStructStatusByTypeId.get(row.pileTypeId) ?? PENDING_VALUE,
    })),
    pileVerificationSummary: verificationSummary,
    geoSummary: {
      cards: geoSummaryCards,
      typeRows: geoTypeRows,
    },
    structSummary: {
      cards: structSummary.cards,
      typeCards: structSummary.typeCards,
    },
    justificationAppendix: showJustificationAppendix
      ? buildJustificationAppendixData({
          project,
          header,
          projectSpecifics,
          projectLoadDefinition,
          projectContextSummary,
          referencesSummary,
          geotechnicalSummary,
          selectedCombinationIds,
          selectedCombinationSummary,
          verificationRows,
          geoSummaryCards,
          geoTypeRows,
          structSummary,
          latestRun,
          governingTraceRows: loadCombinationSummary.governingTraceRows,
          draft,
          includeFullVerificationSchedule,
        })
      : null,
    pricingAppendix: showPricingAppendix ? pricingSummaryData : null,
  };
}

type InternalVerificationRow = {
  pileId: string;
  jointLabel: string;
  pileTypeId: string;
  pileType: string;
  includedInAnalysis: boolean;
  geoStatusKey: RegisterStatusKey;
  geoStatus: string;
  structStatusKey: RegisterStatusKey;
  structStatus: string;
  governingSource: string;
  governingDetail: string;
  noteSummary: string;
  notes: string[];
  status: VerificationStatus;
  geoResult: MultiPileGeoResultRow | null;
  structResult: MultiPileStructResult | null;
};

function buildVerificationRows({
  draft,
  latestRun,
}: {
  draft: MultiPileState;
  latestRun?: MultiPileEnvelopeRunSummary | null;
}): InternalVerificationRow[] {
  const envelopeByJointId = new Map(
    (latestRun?.envelope?.jointResults ?? []).map((row) => [row.jointId, row] as const),
  );
  const structResultsByTypeId = latestRun?.envelope?.structResults ?? {};

  return derivePileRegisterRows(draft).map((row) => {
    const geoResult = resolveGeoResultForPile(draft.geoResults[row.parentJointId], row.pileTypeId);
    const structResult = structResultsByTypeId[row.pileTypeId] ?? null;
    const geoStatus = resolveGeoStatus(row.includedInAnalysis, geoResult);
    const structStatus = resolveStructStatus(row.includedInAnalysis, structResult);
    const notes = buildVerificationNotes({
      authoringStatus: row.status,
      includedInAnalysis: row.includedInAnalysis,
      geoResult,
      structResult,
    });
    const status = resolveVerificationStatus({
      includedInAnalysis: row.includedInAnalysis,
      geoStatusKey: geoStatus.key,
      structStatusKey: structStatus.key,
      notes,
    });
    const governingSource = resolveGoverningSource({
      geoResult,
      jointEnvelope: envelopeByJointId.get(row.parentJointId) ?? null,
      structResult,
    });

    return {
      pileId: row.id,
      jointLabel: row.parentJointLabel,
      pileTypeId: row.pileTypeId,
      pileType: row.pileTypeLabel,
      includedInAnalysis: row.includedInAnalysis,
      geoStatusKey: geoStatus.key,
      geoStatus: geoStatus.label,
      structStatusKey: structStatus.key,
      structStatus: structStatus.label,
      governingSource: governingSource.label,
      governingDetail: governingSource.detail,
      noteSummary: summarizeNotes(notes),
      notes,
      status,
      geoResult,
      structResult,
    };
  });
}

function buildGeoSummaryCards({
  projectSpecifics,
  geotechnicalSummary,
  verificationRows,
}: {
  projectSpecifics: ReturnType<typeof extractProjectSpecifics>;
  geotechnicalSummary: ReturnType<typeof projectGeotechnicalSummary>;
  verificationRows: InternalVerificationRow[];
}) {
  const hasGeoFailure = verificationRows.some((row) => row.geoStatusKey === 'fail');
  const hasPendingGeo = verificationRows.some(
    (row) => row.geoStatusKey === 'pending' || row.geoStatusKey === 'not-run',
  );

  return [
    {
      label: 'Project GEO Basis / Report Source',
      value: geotechnicalSummary.activeReferenceTitle,
      detail: clipText(
        projectSpecifics.geotechnicalBasis.commentary ||
          projectSpecifics.geotechnicalBasis.foundingNotes ||
          projectSpecifics.geotechnicalBasis.groundwaterDesignNotes ||
          'No project-level GEO basis commentary recorded.',
        120,
      ),
    },
    {
      label: 'ARR Band / phi_g',
      value: `${geotechnicalSummary.arrBandSummary} · ${geotechnicalSummary.arrValueSummary}`,
      detail: `phi_g low/high ${geotechnicalSummary.phiGLowSummary} / ${geotechnicalSummary.phiGHighSummary} · ${geotechnicalSummary.testingSummary}`,
    },
    {
      label: 'Included Materials Count',
      value: `${geotechnicalSummary.activeMaterials}`,
      detail: `${geotechnicalSummary.totalMaterials} total materials · ${summarizeLabels(geotechnicalSummary.materialPreviewLabels)}`,
    },
    {
      label: 'Adopted Founding / Socket Status',
      value: buildGeoAdoptionValue(verificationRows),
      detail: buildGeoAdoptionDetail(verificationRows),
      tone: hasGeoFailure ? 'danger' : hasPendingGeo ? 'warning' : 'success',
    },
  ] satisfies MultiPileReportContextCard[];
}

function includesPricingAppendix(appendixMode: MultiPileReportSummaryAppendixMode | null) {
  return appendixMode === 'pricing' || appendixMode === 'full';
}

function includesJustificationAppendix(appendixMode: MultiPileReportSummaryAppendixMode | null) {
  return appendixMode === 'justification' || appendixMode === 'full';
}

function includesFullVerificationSchedule(appendixMode: MultiPileReportSummaryAppendixMode | null) {
  return appendixMode === 'full';
}

function summarizeVerificationCounts(rows: InternalVerificationRow[]) {
  return {
    totalDerivedPiles: rows.length,
    passCount: rows.filter((row) => row.status === 'pass').length,
    warnCount: rows.filter((row) => row.status === 'warn').length,
    failCount: rows.filter((row) => row.status === 'fail').length,
    unresolvedCount: rows.filter((row) => row.status === 'unresolved').length,
  } satisfies Pick<
    MultiPileReportVerificationSummary,
    'totalDerivedPiles' | 'passCount' | 'warnCount' | 'failCount' | 'unresolvedCount'
  >;
}

function sliceFlaggedVerificationRows(rows: InternalVerificationRow[]) {
  const flaggedRows = rows
    .filter(isCompactFlaggedVerificationRow)
    .sort(compareInternalVerificationRows);
  const visibleRows = flaggedRows.slice(0, FLAGGED_VERIFICATION_ROW_LIMIT);
  return {
    flaggedRows,
    visibleRows,
    hiddenCount: Math.max(0, flaggedRows.length - visibleRows.length),
  };
}

function verificationSeverityScore({
  warnCount,
  failCount,
  unresolvedCount,
}: {
  warnCount: number;
  failCount: number;
  unresolvedCount: number;
}) {
  return failCount * 3 + unresolvedCount * 2 + warnCount;
}

function buildCompactVerificationSummary(
  rows: InternalVerificationRow[],
  {
    includeFullVerificationSchedule,
  }: {
    includeFullVerificationSchedule: boolean;
  },
): MultiPileReportVerificationSummary {
  const counts = summarizeVerificationCounts(rows);
  const { flaggedRows, visibleRows, hiddenCount } = sliceFlaggedVerificationRows(rows);
  const detailNote = compactVerificationDetailNote(includeFullVerificationSchedule);

  if (flaggedRows.length > 0) {
    return {
      ...counts,
      mode: 'flagged',
      note: `Showing flagged / warning / fail / unresolved rows only. ${detailNote}`,
      rows: visibleRows.map(toReportVerificationRow),
      hiddenCount,
    };
  }

  return {
    ...counts,
    mode: 'summary-only',
    note:
      counts.totalDerivedPiles > 0
        ? `All ${counts.totalDerivedPiles} derived pile(s) passed the stored GEO and STRUCT checks. ${detailNote}`
        : 'No derived piles are currently available in the saved register.',
    rows: [],
    hiddenCount: 0,
  };
}

function compactVerificationDetailNote(includeFullVerificationSchedule: boolean) {
  if (includeFullVerificationSchedule) {
    return 'Detailed pile schedule is included in the full appendix below.';
  }
  return 'Detailed pile schedule omitted in compact mode; see Full Report.';
}

function buildGeoTypeSummaryRows({
  draft,
  pricingSummaryData,
  projectSpecifics,
  verificationRows,
}: {
  draft: MultiPileState;
  pricingSummaryData: PricingSummaryData;
  projectSpecifics: ReturnType<typeof extractProjectSpecifics>;
  verificationRows: InternalVerificationRow[];
}): MultiPileReportGeoTypeSummaryRow[] {
  const projectGeoMaterialsById = new Map(
    projectSpecifics.geotechnicalMaterials.materials.map(
      (material) => [material.id, material] as const,
    ),
  );
  const typeSummaryById = new Map(
    pricingSummaryData.typeSummaryRows.map((row) => [row.pileTypeId, row] as const),
  );
  const arrAssessment = projectSpecifics.geotechnicalBasis.arrAssessment;
  const activePileTypes = draft.pileTypes.filter((pileType) => pileType.active !== false);

  return activePileTypes.flatMap((pileType) => {
    const summaryRow = typeSummaryById.get(pileType.id);
    const rowsForType = verificationRows.filter((row) => row.pileTypeId === pileType.id);
    const geoSettings = draft.geoTypeSettings[pileType.id] ?? null;
    const authoredFoundingMaterial = resolveAuthoredFoundingMaterialLabel(
      geoSettings,
      projectGeoMaterialsById,
    );
    const authoredSocketLength = resolveAuthoredSocketLengthLabel(geoSettings);
    const redundancy = geoSettings?.redundancy === 'HIGH' ? 'High' : 'Low';
    const phiG = formatMaybePhiG({
      redundancy: geoSettings?.redundancy === 'HIGH' ? 'HIGH' : 'LOW',
      phiGLow: arrAssessment.phiGLow,
      phiGHigh: arrAssessment.phiGHigh,
    });
    const pileTypeLabel = pileTypeSelectLabel(pileType);

    if (rowsForType.length === 0) {
      return [
        {
          key: `${pileType.id}-empty`,
          pileType: pileTypeLabel,
          pileCount: summaryRow?.count ?? 0,
          geoStatus: 'No derived piles',
          representativeBasis: buildGeoRepresentativeBasis({
            row: null,
            authoredFoundingMaterial,
            authoredSocketLength,
            summaryRow,
          }),
          redundancy,
          phiG,
          foundingSocketMaterial:
            authoredFoundingMaterial || summaryRow?.typicalSocketMaterial || PENDING_VALUE,
          adoptedSocketLength:
            authoredSocketLength || summaryRow?.typicalSocketLength || PENDING_VALUE,
          note: 'No derived piles are currently linked to this active pile type.',
        },
      ];
    }

    const groupedRows = new Map<
      string,
      {
        representativeBasis: string;
        rows: InternalVerificationRow[];
        geoRows: MultiPileGeoResultRow[];
        foundingSocketMaterials: string[];
        adoptedSocketLengths: string[];
      }
    >();

    rowsForType.forEach((row) => {
      const representativeBasis = buildGeoRepresentativeBasis({
        row,
        authoredFoundingMaterial,
        authoredSocketLength,
        summaryRow,
      });
      const foundingSocketMaterial = resolveGeoRepresentativeFoundingMaterial(
        row,
        authoredFoundingMaterial,
        summaryRow,
      );
      const adoptedSocketLength = resolveGeoRepresentativeSocketLength(
        row,
        authoredSocketLength,
        summaryRow,
      );
      const groupKey = representativeBasis;
      const existingGroup = groupedRows.get(groupKey);

      if (existingGroup) {
        existingGroup.rows.push(row);
        if (row.geoResult) {
          existingGroup.geoRows.push(row.geoResult);
        }
        existingGroup.foundingSocketMaterials.push(foundingSocketMaterial);
        existingGroup.adoptedSocketLengths.push(adoptedSocketLength);
        return;
      }

      groupedRows.set(groupKey, {
        representativeBasis,
        rows: [row],
        geoRows: row.geoResult ? [row.geoResult] : [],
        foundingSocketMaterials: [foundingSocketMaterial],
        adoptedSocketLengths: [adoptedSocketLength],
      });
    });

    return Array.from(groupedRows.values())
      .sort((left, right) => {
        const rankDifference =
          geoStatusSortRank(worstGeoStatusKey(left.rows)) -
          geoStatusSortRank(worstGeoStatusKey(right.rows));
        if (rankDifference !== 0) {
          return rankDifference;
        }
        if (left.rows.length !== right.rows.length) {
          return right.rows.length - left.rows.length;
        }
        return left.representativeBasis.localeCompare(right.representativeBasis);
      })
      .map((group, index) => ({
        key: `${pileType.id}-${index}`,
        pileType: pileTypeLabel,
        pileCount: group.rows.length,
        geoStatus: summarizeGeoStatusForType(group.rows),
        representativeBasis: group.representativeBasis,
        redundancy,
        phiG,
        foundingSocketMaterial: mostCommon(group.foundingSocketMaterials),
        adoptedSocketLength: mostCommon(group.adoptedSocketLengths),
        note: buildGeoGroupNote({
          rows: group.rows,
          geoRows: group.geoRows,
          foundingSocketMaterials: group.foundingSocketMaterials,
          adoptedSocketLengths: group.adoptedSocketLengths,
        }),
      }));
  });
}

function buildStructTypeCards({
  draft,
  latestRun,
  pricingSummaryData,
}: {
  draft: MultiPileState;
  latestRun?: MultiPileEnvelopeRunSummary | null;
  pricingSummaryData: PricingSummaryData;
}): MultiPileReportStructTypeSummaryCard[] {
  const typeSummaryById = new Map(
    pricingSummaryData.typeSummaryRows.map((row) => [row.pileTypeId, row] as const),
  );
  const activePileTypes = draft.pileTypes.filter((pileType) => pileType.active !== false);

  return activePileTypes.map((pileType) => {
    const envelopeRows = (latestRun?.envelope?.jointResults ?? []).filter(
      (row) => row.pileTypeId === pileType.id,
    );
    const structResult = latestRun?.envelope?.structResults?.[pileType.id] ?? null;
    const summaryRow = typeSummaryById.get(pileType.id);
    const worstEnvelopeRow =
      envelopeRows.find((row) => row.jointId === structResult?.worstJointId) ??
      envelopeRows[0] ??
      null;
    const traceRows = buildGoverningTraceRows(envelopeRows);
    const governingTrace = [findTraceRow(traceRows, 'nMax'), findTraceRow(traceRows, 'mx')]
      .filter((row): row is MultiPileReportGoverningTraceRow => Boolean(row))
      .map((row) => `${row.label} ${row.value}`)
      .join(' | ');
    const governingCombos = Array.from(
      new Set(traceRows.map((row) => row.combinationName.trim()).filter(Boolean)),
    ).join(', ');

    return {
      pileType: pileTypeSelectLabel(pileType),
      pileCount: summaryRow?.count ?? 0,
      representativePile:
        structResult?.representativePileId ||
        envelopeRows[0]?.representativePileId ||
        PENDING_VALUE,
      worstJoint:
        worstEnvelopeRow?.jointDisplayName ||
        structResult?.worstJointId ||
        worstEnvelopeRow?.jointId ||
        PENDING_VALUE,
      status: structResult
        ? structResult.status === 'pass'
          ? 'Stored PASS'
          : structResult.status === 'fail'
            ? 'Stored FAIL'
            : 'Stored WARNING'
        : 'Not run',
      axialUtil: formatStructUtil(structResult?.utilisation.axial),
      pmUtil: formatStructUtil(structResult?.utilisation.moment),
      shearUtil: formatStructUtil(structResult?.utilisation.shear),
      complianceSummary: clipText(
        structResult?.reinforcementCompliance?.summaryText ||
          (structResult
            ? structResult.checks.struct
              ? 'Stored STRUCT result'
              : 'Stored result requires review'
            : 'Run Envelope to populate'),
        88,
      ),
      governingSource: governingTrace || 'No governing trace stored yet',
      governingCombo: governingCombos || 'No governing combination stored yet',
    };
  });
}

function buildStructOverviewCards(
  typeCards: MultiPileReportStructTypeSummaryCard[],
): MultiPileReportContextCard[] {
  const storedCards = typeCards.filter((card) => card.status !== 'Not run');
  return [
    {
      label: 'Stored STRUCT Type Results',
      value: `${storedCards.length}/${typeCards.length}`,
      detail: typeCards.length
        ? `${typeCards.filter((card) => card.status === 'Stored PASS').length} pass · ${typeCards.filter((card) => card.status === 'Stored WARNING').length} warning · ${typeCards.filter((card) => card.status === 'Stored FAIL').length} fail`
        : 'No active pile types.',
      tone: typeCards.some((card) => card.status === 'Stored FAIL')
        ? 'danger'
        : typeCards.some((card) => card.status === 'Stored WARNING')
          ? 'warning'
          : 'success',
    },
    {
      label: 'Worst Axial Util',
      value: maxUtilLabel(typeCards.map((card) => card.axialUtil)),
      detail: 'Current stored type-level axial utilisation from STRUCT results.',
    },
    {
      label: 'Worst P-M Util',
      value: maxUtilLabel(typeCards.map((card) => card.pmUtil)),
      detail: 'Current stored type-level moment interaction utilisation.',
    },
    {
      label: 'Worst Shear Util',
      value: maxUtilLabel(typeCards.map((card) => card.shearUtil)),
      detail: 'Current stored type-level shear utilisation.',
    },
  ];
}

function buildJustificationAppendixData({
  project,
  header,
  projectSpecifics,
  projectLoadDefinition,
  projectContextSummary,
  referencesSummary,
  geotechnicalSummary,
  selectedCombinationIds,
  selectedCombinationSummary,
  verificationRows,
  geoSummaryCards,
  geoTypeRows,
  structSummary,
  latestRun,
  governingTraceRows,
  draft,
  includeFullVerificationSchedule,
}: {
  project: Project;
  header: MultiPileReportSummaryHeader;
  projectSpecifics: ReturnType<typeof extractProjectSpecifics>;
  projectLoadDefinition: ReturnType<typeof extractProjectLoadDefinition>;
  projectContextSummary: MultiPileReportContextCard[];
  referencesSummary: ReturnType<typeof projectReferencesSummary>;
  geotechnicalSummary: ReturnType<typeof projectGeotechnicalSummary>;
  selectedCombinationIds: string[];
  selectedCombinationSummary: string;
  verificationRows: InternalVerificationRow[];
  geoSummaryCards: MultiPileReportContextCard[];
  geoTypeRows: MultiPileReportGeoTypeSummaryRow[];
  structSummary: {
    cards: MultiPileReportContextCard[];
    typeCards: MultiPileReportStructTypeSummaryCard[];
  };
  latestRun?: MultiPileEnvelopeRunSummary | null;
  governingTraceRows: MultiPileReportGoverningTraceRow[];
  draft: MultiPileState;
  includeFullVerificationSchedule: boolean;
}): MultiPileReportJustificationAppendixData {
  const pileVerificationFocus = buildJustificationVerificationFocus(verificationRows);

  return {
    header,
    projectContextSummary: buildJustificationProjectContextCards({
      project,
      latestRun,
      projectContextSummary,
    }),
    reportProvenanceFields: buildReportProvenanceFields({ project, projectSpecifics, latestRun }),
    referenceSummaryCards: buildReferenceSummaryCards(referencesSummary, projectSpecifics),
    referenceRows: buildReferenceRows(projectSpecifics.references),
    geoBasisCards: buildJustificationGeoBasisCards({
      projectSpecifics,
      geotechnicalSummary,
      geoSummaryCards,
    }),
    geoTypeRows,
    arrBasisCards: buildArrBasisCards(projectSpecifics.geotechnicalBasis.arrAssessment),
    loadBasisCards: buildLoadBasisCards({
      projectLoadDefinition,
      selectedCombinationIds,
      selectedCombinationSummary,
      latestRun,
    }),
    selectedCombinationRows: buildSelectedCombinationRows({
      combinationLibrary: draft.combinationLibrary,
      selectedCombinationIds,
    }),
    governingTraceRows,
    pileVerificationFocus,
    fullVerificationSchedule: includeFullVerificationSchedule
      ? buildFullVerificationSchedule(verificationRows)
      : null,
    structSummary,
    openIssues: buildOpenIssues({
      referencesSummary,
      geotechnicalSummary,
      selectedCombinationIds,
      latestRun,
      verificationRows,
      pileVerificationFocus,
      structSummary,
    }),
  };
}

function buildJustificationProjectContextCards({
  project,
  latestRun,
  projectContextSummary,
}: {
  project: Project;
  latestRun?: MultiPileEnvelopeRunSummary | null;
  projectContextSummary: MultiPileReportContextCard[];
}) {
  return [
    ...projectContextSummary,
    {
      label: 'Project Record Provenance',
      value: `Updated ${formatDateOnly(project.updatedAt)}`,
      detail: `Created ${formatDateOnly(project.createdAt)} · Project status ${humanizeRunStatus(project.status || NOT_RECORDED_VALUE)}`,
    },
    {
      label: 'Stored Run Provenance',
      value: latestRun ? humanizeRunStatus(latestRun.status) : PENDING_VALUE,
      detail: latestRun
        ? `${latestRun.runId} · ${buildLatestRunDetail(latestRun)}`
        : 'No stored envelope snapshot has been persisted yet.',
      tone: latestRun ? runTone(latestRun.status) : 'warning',
    },
  ] satisfies MultiPileReportContextCard[];
}

function buildReportProvenanceFields({
  project,
  projectSpecifics,
  latestRun,
}: {
  project: Project;
  projectSpecifics: ReturnType<typeof extractProjectSpecifics>;
  latestRun?: MultiPileEnvelopeRunSummary | null;
}) {
  return [
    {
      label: 'Report Title',
      value: appendixText(projectSpecifics.reportMeta.reportTitle, NOT_AUTHORED_VALUE),
    },
    {
      label: 'Prepared / Checked',
      value: [
        appendixText(projectSpecifics.reportMeta.preparedBy, NOT_AUTHORED_VALUE),
        appendixText(projectSpecifics.reportMeta.checkedBy, NOT_AUTHORED_VALUE),
      ].join(' / '),
    },
    {
      label: 'Purpose',
      value: appendixText(projectSpecifics.reportMeta.purpose, NOT_AUTHORED_VALUE),
    },
    {
      label: 'Project Identity Status',
      value: appendixText(projectSpecifics.identity.status, NOT_RECORDED_VALUE),
    },
    {
      label: 'Project Created',
      value: formatDateOnly(project.createdAt),
    },
    {
      label: 'Project Updated',
      value: formatDateOnly(project.updatedAt),
    },
    {
      label: 'Latest Stored Run',
      value: latestRun ? formatDateTime(latestRun.createdAt) : PENDING_VALUE,
    },
    {
      label: 'Run ID / Status',
      value: latestRun
        ? `${latestRun.runId} · ${humanizeRunStatus(latestRun.status)}`
        : PENDING_VALUE,
    },
  ] satisfies MultiPileReportSummaryField[];
}

function buildReferenceSummaryCards(
  referencesSummary: ReturnType<typeof projectReferencesSummary>,
  projectSpecifics: ReturnType<typeof extractProjectSpecifics>,
) {
  const activeReferences = projectSpecifics.references.filter((reference) => reference.active);
  return [
    {
      label: 'Active Project References',
      value: `${referencesSummary.totalReferences}`,
      detail: `${referencesSummary.includedInReportCount} currently flagged for report inclusion.`,
    },
    {
      label: 'Primary Geotechnical Reference',
      value: referencesSummary.primaryGeotechnicalTitle,
      detail: activeReferences.some((reference) => reference.primaryGeotechnical)
        ? 'Sourced from the active project reference register.'
        : 'No primary geotechnical report is currently flagged.',
      tone: activeReferences.some((reference) => reference.primaryGeotechnical)
        ? 'success'
        : 'warning',
    },
    {
      label: 'Primary Structural Reference',
      value: referencesSummary.primaryStructuralTitle,
      detail: activeReferences.some((reference) => reference.primaryStructuralReference)
        ? 'Sourced from the active project reference register.'
        : 'No primary structural drawing set is currently flagged.',
      tone: activeReferences.some((reference) => reference.primaryStructuralReference)
        ? 'success'
        : 'warning',
    },
    {
      label: 'Included In Report',
      value: `${referencesSummary.includedInReportCount}/${referencesSummary.totalReferences || 0}`,
      detail:
        referencesSummary.includedInReportCount > 0
          ? 'Only active references flagged for inclusion are treated as report provenance.'
          : 'No active references are currently flagged for report inclusion.',
      tone: referencesSummary.includedInReportCount > 0 ? 'success' : 'warning',
    },
  ] satisfies MultiPileReportContextCard[];
}

function buildReferenceRows(references: MultiPileProjectReference[]) {
  return references
    .filter((reference) => reference.active)
    .sort((left, right) => {
      const leftRank = referenceSortRank(left);
      const rightRank = referenceSortRank(right);
      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }
      return resolveReferenceTitle(left).localeCompare(resolveReferenceTitle(right), undefined, {
        numeric: true,
      });
    })
    .map((reference) => ({
      key: reference.id,
      title: resolveReferenceTitle(reference),
      documentType: appendixText(reference.documentType, NOT_RECORDED_VALUE),
      documentNumber: appendixText(reference.documentNumber, NOT_RECORDED_VALUE),
      revision: appendixText(reference.revision, NOT_RECORDED_VALUE),
      issueDate: appendixText(reference.issueDate, NOT_RECORDED_VALUE),
      authorOrganisation: appendixText(reference.authorOrganisation, NOT_RECORDED_VALUE),
      reportUse: buildReferenceRoleLabel(reference),
      notes: appendixText(reference.notes, NOT_AUTHORED_VALUE),
    })) satisfies MultiPileReportReferenceRow[];
}

function buildJustificationGeoBasisCards({
  projectSpecifics,
  geotechnicalSummary,
  geoSummaryCards,
}: {
  projectSpecifics: ReturnType<typeof extractProjectSpecifics>;
  geotechnicalSummary: ReturnType<typeof projectGeotechnicalSummary>;
  geoSummaryCards: MultiPileReportContextCard[];
}) {
  return [
    ...geoSummaryCards,
    {
      label: 'Groundwater Design Notes',
      value: clipText(
        appendixText(projectSpecifics.geotechnicalBasis.groundwaterDesignNotes, NOT_RECORDED_VALUE),
        72,
      ),
      detail: 'Current project geotechnical basis field.',
    },
    {
      label: 'Default Socket Assumptions',
      value: clipText(
        appendixText(
          projectSpecifics.geotechnicalBasis.defaultSocketAssumptions,
          NOT_RECORDED_VALUE,
        ),
        72,
      ),
      detail: `CFA uplift logic ${geotechnicalSummary.cfaUpliftSummary}.`,
    },
    {
      label: 'Project Founding Notes',
      value: clipText(
        appendixText(projectSpecifics.geotechnicalBasis.foundingNotes, NOT_RECORDED_VALUE),
        72,
      ),
      detail: 'Current project founding commentary only.',
    },
  ] satisfies MultiPileReportContextCard[];
}

function buildArrBasisCards(
  arrAssessment: ReturnType<typeof extractProjectSpecifics>['geotechnicalBasis']['arrAssessment'],
) {
  return [
    {
      label: 'ARR Value / Band',
      value: `${formatNumber(arrAssessment.arrValue, 3)} · ${appendixText(arrAssessment.arrBand, NOT_RECORDED_VALUE)}`,
      detail: `Weighted score ${formatNumber(arrAssessment.weightedScore, 3)} / weight total ${formatNumber(arrAssessment.weightTotal, 3)}.`,
      tone: arrAssessment.arrBand ? 'success' : 'warning',
    },
    {
      label: 'Base phi_gb',
      value: `${formatNumber(arrAssessment.phiGbLow, 3)} / ${formatNumber(arrAssessment.phiGbHigh, 3)}`,
      detail: 'Low / high redundancy base factors from the stored ARR assessment.',
    },
    {
      label: 'Adopted phi_g',
      value: `${formatNumber(arrAssessment.phiGLow, 3)} / ${formatNumber(arrAssessment.phiGHigh, 3)}`,
      detail: 'Low / high redundancy adopted factors currently stored for reporting.',
    },
    {
      label: 'Testing Benefit',
      value:
        arrAssessment.testType === 'NONE'
          ? 'No testing'
          : `${arrAssessment.testType} at ${formatNumber(arrAssessment.testPilePercentage, 1)}%`,
      detail:
        arrAssessment.testType === 'NONE'
          ? 'No testing benefit has been applied in the stored ARR assessment.'
          : `K ${formatNumber(arrAssessment.testBenefitK, 3)} · phi_tf ${arrAssessment.phiTf == null ? NOT_RECORDED_VALUE : formatNumber(arrAssessment.phiTf, 3)}.`,
    },
  ] satisfies MultiPileReportContextCard[];
}

function buildLoadBasisCards({
  projectLoadDefinition,
  selectedCombinationIds,
  selectedCombinationSummary,
  latestRun,
}: {
  projectLoadDefinition: ReturnType<typeof extractProjectLoadDefinition>;
  selectedCombinationIds: string[];
  selectedCombinationSummary: string;
  latestRun?: MultiPileEnvelopeRunSummary | null;
}) {
  const includedEnvelopeCount = projectLoadDefinition.loadCombinations.filter(
    (row) => row.enabled && row.includeInEnvelope,
  ).length;
  return [
    {
      label: 'Project Load Library',
      value: `${projectLoadDefinition.loadCases.length} case(s) · ${projectLoadDefinition.loadCombinations.length} combination(s)`,
      detail: `${includedEnvelopeCount} enabled project combination(s) currently included in envelope scope.`,
    },
    {
      label: 'Selected Multi-Pile Combinations',
      value: `${selectedCombinationIds.length}`,
      detail: selectedCombinationSummary,
      tone: selectedCombinationIds.length > 0 ? 'success' : 'warning',
    },
    {
      label: 'Combination Settings',
      value: `alpha ${formatNumber(projectLoadDefinition.combinationSettings.alpha, 3)} · psi_c ${formatNumber(projectLoadDefinition.combinationSettings.psiC, 3)}`,
      detail: `psi_l ${formatNumber(projectLoadDefinition.combinationSettings.psiL, 3)} · psi_E ${formatNumber(projectLoadDefinition.combinationSettings.psiE, 3)}.`,
    },
    {
      label: 'Groundwater / Minimum Permanent',
      value: `gamma_gw ${formatNumber(projectLoadDefinition.combinationSettings.groundwaterFactor, 2)} · Gmin ${formatNumber(projectLoadDefinition.combinationSettings.minPermanentFactor, 2)}`,
      detail: projectLoadDefinition.combinationSettings.reduceMinimumPermanentWithPointNine
        ? '0.9 reduction to minimum permanent factors is enabled.'
        : '0.9 reduction to minimum permanent factors is not enabled.',
    },
    {
      label: 'Latest Run Link',
      value: latestRun ? humanizeRunStatus(latestRun.status) : PENDING_VALUE,
      detail: latestRun
        ? buildLatestRunDetail(latestRun)
        : 'No stored envelope snapshot is available yet.',
      tone: latestRun ? runTone(latestRun.status) : 'warning',
    },
  ] satisfies MultiPileReportContextCard[];
}

function buildSelectedCombinationRows({
  combinationLibrary,
  selectedCombinationIds,
}: {
  combinationLibrary: MultiPileCombinationRow[];
  selectedCombinationIds: string[];
}) {
  const selectedIdSet = new Set(selectedCombinationIds);
  return combinationLibrary
    .filter((combination) => selectedIdSet.has(combination.id))
    .sort((left, right) => left.order - right.order)
    .map((combination) => ({
      key: combination.id,
      name: appendixText(combination.displayName || combination.id, NOT_RECORDED_VALUE),
      source: appendixText(combination.source, NOT_RECORDED_VALUE),
      includeInEnvelope: combination.includeInEnvelope ? 'Yes' : 'No',
      expressionSummary: appendixText(
        combination.expressionSummary || combination.reference,
        'No stored expression summary',
      ),
    })) satisfies MultiPileReportSelectedCombinationRow[];
}

function buildJustificationVerificationFocus(rows: InternalVerificationRow[]) {
  const counts = summarizeVerificationCounts(rows);
  const { flaggedRows, visibleRows, hiddenCount } = sliceFlaggedVerificationRows(rows);
  const summaryMode: MultiPileReportVerificationSummary['mode'] =
    flaggedRows.length > 0 ? 'flagged' : 'summary-only';
  const groupedRows = new Map<
    string,
    {
      pileType: string;
      failCount: number;
      warnCount: number;
      unresolvedCount: number;
      rows: MultiPileReportVerificationRow[];
    }
  >();

  visibleRows.forEach((row) => {
    const existing = groupedRows.get(row.pileTypeId);
    const reportRow = toReportVerificationRow(row);
    if (existing) {
      existing.rows.push(reportRow);
      if (row.status === 'fail') existing.failCount += 1;
      else if (row.status === 'warn') existing.warnCount += 1;
      else if (row.status === 'unresolved') existing.unresolvedCount += 1;
      return;
    }

    groupedRows.set(row.pileTypeId, {
      pileType: row.pileType,
      failCount: row.status === 'fail' ? 1 : 0,
      warnCount: row.status === 'warn' ? 1 : 0,
      unresolvedCount: row.status === 'unresolved' ? 1 : 0,
      rows: [reportRow],
    });
  });

  return {
    summary: {
      ...counts,
      mode: summaryMode,
      note:
        flaggedRows.length > 0
          ? `Flagged / warning / failed / unresolved rows only, ordered by severity and grouped by pile type. ${counts.totalDerivedPiles} derived pile(s) are currently in the saved register.`
          : `No flagged rows are present in the current stored verification summary across ${counts.totalDerivedPiles} derived pile(s).`,
      rows: visibleRows.map(toReportVerificationRow),
      hiddenCount,
    },
    groups: Array.from(groupedRows.entries())
      .map(([key, group]) => ({ key, ...group }))
      .sort((left, right) => {
        const leftSeverity = verificationSeverityScore(left);
        const rightSeverity = verificationSeverityScore(right);
        if (leftSeverity !== rightSeverity) {
          return rightSeverity - leftSeverity;
        }
        if (left.rows.length !== right.rows.length) {
          return right.rows.length - left.rows.length;
        }
        return left.pileType.localeCompare(right.pileType, undefined, { numeric: true });
      }),
  };
}

function buildFullVerificationSchedule(
  rows: InternalVerificationRow[],
): MultiPileReportFullVerificationSchedule {
  const counts = summarizeVerificationCounts(rows);
  const sortedRows = [...rows].sort(compareInternalVerificationRows);
  const groups = new Map<
    string,
    {
      pileType: string;
      passCount: number;
      warnCount: number;
      failCount: number;
      unresolvedCount: number;
      rows: MultiPileReportVerificationRow[];
    }
  >();

  sortedRows.forEach((row) => {
    const existing = groups.get(row.pileTypeId);
    const reportRow = toReportVerificationRow(row);
    if (existing) {
      existing.rows.push(reportRow);
      if (row.status === 'pass') existing.passCount += 1;
      else if (row.status === 'warn') existing.warnCount += 1;
      else if (row.status === 'fail') existing.failCount += 1;
      else if (row.status === 'unresolved') existing.unresolvedCount += 1;
      return;
    }

    groups.set(row.pileTypeId, {
      pileType: row.pileType,
      passCount: row.status === 'pass' ? 1 : 0,
      warnCount: row.status === 'warn' ? 1 : 0,
      failCount: row.status === 'fail' ? 1 : 0,
      unresolvedCount: row.status === 'unresolved' ? 1 : 0,
      rows: [reportRow],
    });
  });

  return {
    summary: {
      ...counts,
      mode: 'full',
      note:
        counts.totalDerivedPiles > 0
          ? 'Full per-derived-pile verification schedule shown only in Full Report mode. Rows are grouped by pile type with flagged rows first.'
          : 'No derived piles are currently available in the saved register.',
      rows: sortedRows.map(toReportVerificationRow),
      hiddenCount: 0,
    },
    groups: Array.from(groups.entries())
      .map(([key, group]) => ({
        key,
        pileType: group.pileType,
        totalDerivedPiles: group.rows.length,
        passCount: group.passCount,
        warnCount: group.warnCount,
        failCount: group.failCount,
        unresolvedCount: group.unresolvedCount,
        rows: group.rows,
      }))
      .sort((left, right) => {
        const leftSeverity = verificationSeverityScore(left);
        const rightSeverity = verificationSeverityScore(right);
        if (leftSeverity !== rightSeverity) {
          return rightSeverity - leftSeverity;
        }
        return left.pileType.localeCompare(right.pileType, undefined, { numeric: true });
      }),
  };
}

function buildOpenIssues({
  referencesSummary,
  geotechnicalSummary,
  selectedCombinationIds,
  latestRun,
  verificationRows,
  pileVerificationFocus,
  structSummary,
}: {
  referencesSummary: ReturnType<typeof projectReferencesSummary>;
  geotechnicalSummary: ReturnType<typeof projectGeotechnicalSummary>;
  selectedCombinationIds: string[];
  latestRun?: MultiPileEnvelopeRunSummary | null;
  verificationRows: InternalVerificationRow[];
  pileVerificationFocus: {
    summary: MultiPileReportVerificationSummary;
    groups: MultiPileReportVerificationFocusGroup[];
  };
  structSummary: {
    cards: MultiPileReportContextCard[];
    typeCards: MultiPileReportStructTypeSummaryCard[];
  };
}) {
  const issues: string[] = [];

  if (referencesSummary.includedInReportCount === 0) {
    issues.push('No active project references are currently flagged for report inclusion.');
  }
  if (referencesSummary.primaryGeotechnicalTitle === 'Not set') {
    issues.push(
      'Primary geotechnical report provenance is not set in the current project references.',
    );
  }
  if (referencesSummary.primaryStructuralTitle === 'Not set') {
    issues.push(
      'Primary structural drawing provenance is not set in the current project references.',
    );
  }
  if (geotechnicalSummary.activeMaterials === 0) {
    issues.push('No project geotechnical materials are currently adopted.');
  }
  if (geotechnicalSummary.arrBandSummary === 'Not recorded') {
    issues.push('ARR band is not recorded in the current project geotechnical basis.');
  }
  if (!selectedCombinationIds.length) {
    issues.push('No Multi-Pile combinations are currently selected in the saved state.');
  }
  if (!latestRun?.envelope) {
    issues.push(
      'No stored envelope snapshot is available yet, so governing combination trace, GEO, and STRUCT summaries remain pending.',
    );
  }

  latestRun?.warnings?.forEach((warning) => {
    issues.push(
      `Latest run warning ${warning.code}: ${warning.message}${warning.clauseRef ? ` (${warning.clauseRef})` : ''}`,
    );
  });
  latestRun?.errors?.forEach((error) => {
    issues.push(
      `Latest run error ${error.code}: ${error.message}${error.clauseRef ? ` (${error.clauseRef})` : ''}`,
    );
  });

  const failCount = verificationRows.filter((row) => row.status === 'fail').length;
  const unresolvedCount = verificationRows.filter((row) => row.status === 'unresolved').length;
  const warnCount = verificationRows.filter((row) => row.status === 'warn').length;

  if (failCount > 0) {
    issues.push(
      `${failCount} pile verification row(s) currently fail under the latest stored outputs.`,
    );
  }
  if (unresolvedCount > 0) {
    issues.push(
      `${unresolvedCount} pile verification row(s) remain unresolved, pending, or not yet run.`,
    );
  }
  if (warnCount > 0) {
    issues.push(`${warnCount} pile verification row(s) carry stored warnings or review notes.`);
  }
  if (pileVerificationFocus.summary.hiddenCount > 0) {
    issues.push(
      `${pileVerificationFocus.summary.hiddenCount} additional flagged or unresolved pile row(s) are omitted from the appendix detail to keep the report compact.`,
    );
  }

  const structFailCount = structSummary.typeCards.filter(
    (card) => card.status === 'Stored FAIL',
  ).length;
  const structWarningCount = structSummary.typeCards.filter(
    (card) => card.status === 'Stored WARNING',
  ).length;
  const structPendingCount = structSummary.typeCards.filter(
    (card) => card.status === 'Not run',
  ).length;

  if (structFailCount > 0) {
    issues.push(
      `${structFailCount} pile type STRUCT summary card(s) currently show stored failures.`,
    );
  }
  if (structWarningCount > 0) {
    issues.push(
      `${structWarningCount} pile type STRUCT summary card(s) currently show stored warnings.`,
    );
  }
  if (structPendingCount > 0) {
    issues.push(`${structPendingCount} active pile type(s) do not yet have stored STRUCT results.`);
  }

  const noteSamples = Array.from(
    new Set(
      verificationRows
        .filter((row) => row.status !== 'pass')
        .flatMap((row) => row.notes)
        .map((note) => clipText(note, 110)),
    ),
  ).slice(0, 3);

  noteSamples.forEach((note, index) => {
    issues.push(`Flagged verification note ${index + 1}: ${note}`);
  });

  if (issues.length === 0) {
    issues.push(
      'No open issues are exposed by the current project metadata, selected combinations, or latest stored Multi-Pile run outputs.',
    );
  }

  return Array.from(new Set(issues));
}

function resolveReferenceTitle(reference: MultiPileProjectReference) {
  return (
    appendixText(reference.title, '') ||
    appendixText(reference.referenceId, '') ||
    appendixText(reference.documentNumber, '') ||
    'Untitled reference'
  );
}

function buildReferenceRoleLabel(reference: MultiPileProjectReference) {
  const roles = [];
  if (reference.includeInReport) roles.push('Included in report');
  if (reference.primaryGeotechnical) roles.push('Primary GEO');
  if (reference.primaryStructuralReference) roles.push('Primary STRUCT');
  return roles.join(' · ') || 'Active only';
}

function referenceSortRank(reference: MultiPileProjectReference) {
  if (reference.primaryGeotechnical) return 0;
  if (reference.primaryStructuralReference) return 1;
  if (reference.includeInReport) return 2;
  return 3;
}

function buildLatestRunDetail(latestRun: MultiPileEnvelopeRunSummary) {
  const parts = [formatDateTime(latestRun.createdAt)];
  if (latestRun.durationMs != null) {
    parts.push(`${Math.round(latestRun.durationMs)} ms`);
  }
  if (latestRun.envelope) {
    parts.push(
      `${latestRun.envelope.projectSummary.jointCount} joints`,
      `${latestRun.envelope.projectSummary.evaluatedCombinationCount} evaluated combinations`,
    );
  }
  if (latestRun.warnings?.length) {
    parts.push(`${latestRun.warnings.length} warning(s)`);
  }
  if (latestRun.errors?.length) {
    parts.push(`${latestRun.errors.length} error(s)`);
  }
  return parts.join(' · ');
}

function summarizeSelectedCombinations(
  selectedIds: string[],
  combinationLibrary: MultiPileCombinationRow[],
) {
  const selectedLabels = combinationLibrary
    .filter((row) => selectedIds.includes(row.id))
    .map((row) => row.displayName.trim() || row.id)
    .filter(Boolean);

  if (selectedLabels.length === 0) {
    return 'No selected Multi-Pile combinations stored.';
  }
  if (selectedLabels.length <= 4) {
    return selectedLabels.join(', ');
  }
  return `${selectedLabels.slice(0, 4).join(', ')} + ${selectedLabels.length - 4} more`;
}

function buildGoverningTraceRows(
  rows: GoverningTraceSourceRow[],
): MultiPileReportGoverningTraceRow[] {
  return [
    pickGoverningTraceRow(rows, 'nMax', 'Governing N*max', 'kN', (row) => row.nMax, 'max'),
    pickGoverningTraceRow(rows, 'nMin', 'Governing N*min', 'kN', (row) => row.nMin, 'min'),
    pickGoverningTraceRow(rows, 'vx', 'Governing Vx,DES', 'kN', (row) => row.vx, 'max-abs'),
    pickGoverningTraceRow(rows, 'vy', 'Governing Vy,DES', 'kN', (row) => row.vy, 'max-abs'),
    pickGoverningTraceRow(rows, 'mx', 'Governing Mx,DES', 'kNm', (row) => row.mx, 'max-abs'),
    pickGoverningTraceRow(rows, 'my', 'Governing My,DES', 'kNm', (row) => row.my, 'max-abs'),
  ].filter((row): row is MultiPileReportGoverningTraceRow => Boolean(row));
}

function pickGoverningTraceRow(
  rows: GoverningTraceSourceRow[],
  key: MultiPileReportGoverningTraceRow['key'],
  label: string,
  unit: string,
  accessor: (row: GoverningTraceSourceRow) => MultiPileEnvelopeValue,
  mode: 'max' | 'min' | 'max-abs',
) {
  if (rows.length === 0) {
    return null;
  }

  let selectedRow = rows[0] ?? null;
  let selectedValue = selectedRow ? accessor(selectedRow) : null;

  rows.forEach((row) => {
    if (!selectedValue || !selectedRow) {
      selectedRow = row;
      selectedValue = accessor(row);
      return;
    }

    const candidateValue = accessor(row);
    const candidateScore =
      mode === 'max-abs' ? Math.abs(candidateValue.value) : candidateValue.value;
    const selectedScore = mode === 'max-abs' ? Math.abs(selectedValue.value) : selectedValue.value;
    const shouldReplace =
      mode === 'min' ? candidateScore < selectedScore : candidateScore > selectedScore;

    if (shouldReplace) {
      selectedRow = row;
      selectedValue = candidateValue;
    }
  });

  if (!selectedRow || !selectedValue) {
    return null;
  }

  return {
    key,
    label,
    unit,
    value: formatEnvelopeValue(selectedValue.value, unit),
    jointLabel: selectedRow.jointDisplayName || selectedRow.jointId || EMPTY_VALUE,
    pileTypeId: selectedRow.pileTypeId || EMPTY_VALUE,
    combinationName: selectedValue.combinationName || selectedValue.combinationId || EMPTY_VALUE,
    source:
      [selectedValue.source, selectedValue.expressionSummary].filter(Boolean).join(' · ') ||
      EMPTY_VALUE,
  } satisfies MultiPileReportGoverningTraceRow;
}

function resolveGeoResultForPile(geoResult: MultiPileGeoResultRow | undefined, pileTypeId: string) {
  if (!geoResult || geoResult.typeId !== pileTypeId) {
    return null;
  }
  return geoResult;
}

function resolveGeoStatus(
  includedInAnalysis: boolean,
  geoResult: MultiPileGeoResultRow | null,
): { key: RegisterStatusKey; label: string } {
  if (!includedInAnalysis) {
    return { key: 'excluded', label: 'Excluded' };
  }
  if (!geoResult) {
    return { key: 'not-run', label: 'Not run' };
  }
  if (geoResult.status === 'pending') {
    return { key: 'pending', label: 'Pending' };
  }
  if (geoResult.ok === false) {
    return { key: 'fail', label: 'Fail' };
  }
  if (geoResult.ok === true) {
    return { key: 'pass', label: 'Pass' };
  }
  return { key: 'pending', label: 'Pending' };
}

function resolveStructStatus(
  includedInAnalysis: boolean,
  structResult: MultiPileStructResult | null,
): { key: RegisterStatusKey; label: string } {
  if (!includedInAnalysis) {
    return { key: 'excluded', label: 'Excluded' };
  }
  if (!structResult) {
    return { key: 'not-run', label: 'Not run' };
  }
  if (structResult.status === 'pass') {
    return { key: 'pass', label: 'Pass' };
  }
  if (structResult.status === 'fail') {
    return { key: 'fail', label: 'Fail' };
  }
  return { key: 'warning', label: 'Warning' };
}

function buildVerificationNotes({
  authoringStatus,
  includedInAnalysis,
  geoResult,
  structResult,
}: {
  authoringStatus: string;
  includedInAnalysis: boolean;
  geoResult: MultiPileGeoResultRow | null;
  structResult: MultiPileStructResult | null;
}) {
  const notes: string[] = [];

  if (!includedInAnalysis) {
    notes.push(authoringStatus);
    return notes;
  }

  if (!geoResult) {
    notes.push('No stored GEO result is available for this pile’s parent joint yet.');
  } else if (geoResult.status === 'pending') {
    notes.push(geoResult.pendingReason || 'GEO is still pending for this pile’s parent joint.');
  }

  if (geoResult?.inputWarnings?.length) {
    notes.push(...geoResult.inputWarnings);
  }

  if (!structResult) {
    notes.push('No stored STRUCT result is available for this pile type yet.');
  } else if (structResult.inputWarnings.length) {
    notes.push(...structResult.inputWarnings);
  }

  return Array.from(new Set(notes));
}

function resolveVerificationStatus({
  includedInAnalysis,
  geoStatusKey,
  structStatusKey,
  notes,
}: {
  includedInAnalysis: boolean;
  geoStatusKey: RegisterStatusKey;
  structStatusKey: RegisterStatusKey;
  notes: string[];
}): VerificationStatus {
  if (geoStatusKey === 'fail' || structStatusKey === 'fail') {
    return 'fail';
  }
  if (
    !includedInAnalysis ||
    geoStatusKey === 'pending' ||
    geoStatusKey === 'not-run' ||
    structStatusKey === 'not-run'
  ) {
    return 'unresolved';
  }
  if (structStatusKey === 'warning' || notes.length > 0) {
    return 'warn';
  }
  return 'pass';
}

function resolveGoverningSource({
  geoResult,
  jointEnvelope,
  structResult,
}: {
  geoResult: MultiPileGeoResultRow | null;
  jointEnvelope: {
    nMax: MultiPileEnvelopeValue;
    nMin: MultiPileEnvelopeValue;
    vx: MultiPileEnvelopeValue;
    vy: MultiPileEnvelopeValue;
    mx: MultiPileEnvelopeValue;
    my: MultiPileEnvelopeValue;
  } | null;
  structResult: MultiPileStructResult | null;
}) {
  if (!jointEnvelope) {
    return {
      label: 'No stored envelope trace',
      detail: 'Run Envelope to populate governing combinations.',
    };
  }

  const candidates: Array<{ score: number; label: string; detail: string }> = [];

  if (geoResult?.utilComp != null) {
    candidates.push({
      score: geoResult.utilComp / 100,
      label: `GEO comp · ${compactCombinationLabel(jointEnvelope.nMax)}`,
      detail: sourceLabel(jointEnvelope.nMax),
    });
  }

  if (geoResult?.utilTen != null) {
    candidates.push({
      score: geoResult.utilTen / 100,
      label: `GEO uplift · ${compactCombinationLabel(jointEnvelope.nMin)}`,
      detail: sourceLabel(jointEnvelope.nMin),
    });
  }

  if (structResult) {
    const axialSource =
      structResult.axial.compressionUtilisation >= structResult.axial.tensionUtilisation
        ? jointEnvelope.nMax
        : jointEnvelope.nMin;
    const momentSource =
      Math.abs(jointEnvelope.mx.value) >= Math.abs(jointEnvelope.my.value)
        ? jointEnvelope.mx
        : jointEnvelope.my;
    const shearSource =
      Math.abs(jointEnvelope.vx.value) >= Math.abs(jointEnvelope.vy.value)
        ? jointEnvelope.vx
        : jointEnvelope.vy;

    candidates.push({
      score: Math.max(
        structResult.axial.compressionUtilisation,
        structResult.axial.tensionUtilisation,
      ),
      label: `STRUCT axial · ${compactCombinationLabel(axialSource)}`,
      detail: sourceLabel(axialSource),
    });
    candidates.push({
      score: structResult.utilisation.moment,
      label: `STRUCT P-M · ${compactCombinationLabel(momentSource)}`,
      detail: sourceLabel(momentSource),
    });
    candidates.push({
      score: structResult.utilisation.shear,
      label: `STRUCT shear · ${compactCombinationLabel(shearSource)}`,
      detail: sourceLabel(shearSource),
    });
  }

  candidates.sort((left, right) => right.score - left.score);
  return (
    candidates[0] ?? {
      label: `Envelope · ${compactCombinationLabel(jointEnvelope.nMax)}`,
      detail: sourceLabel(jointEnvelope.nMax),
    }
  );
}

function compactCombinationLabel(value: MultiPileEnvelopeValue) {
  return value.combinationName || value.combinationId || EMPTY_VALUE;
}

function sourceLabel(value: MultiPileEnvelopeValue) {
  return [value.source, value.expressionSummary].filter(Boolean).join(' · ') || EMPTY_VALUE;
}

function toReportVerificationRow(row: InternalVerificationRow): MultiPileReportVerificationRow {
  return {
    pileId: row.pileId,
    jointLabel: row.jointLabel,
    pileType: row.pileType,
    geoStatus: row.geoStatus,
    structStatus: row.structStatus,
    governingSource: row.governingSource,
    governingDetail: row.governingDetail,
    noteSummary: row.noteSummary,
    status: row.status,
  };
}

function compareInternalVerificationRows(
  left: InternalVerificationRow,
  right: InternalVerificationRow,
) {
  const statusDifference =
    verificationStatusSortRank(left.status) - verificationStatusSortRank(right.status);
  if (statusDifference !== 0) {
    return statusDifference;
  }
  const pileTypeDifference = left.pileType.localeCompare(right.pileType, undefined, {
    numeric: true,
  });
  if (pileTypeDifference !== 0) {
    return pileTypeDifference;
  }
  const jointDifference = left.jointLabel.localeCompare(right.jointLabel, undefined, {
    numeric: true,
  });
  if (jointDifference !== 0) {
    return jointDifference;
  }
  return left.pileId.localeCompare(right.pileId, undefined, { numeric: true });
}

function summarizeTypeGeoStatuses(rows: InternalVerificationRow[]) {
  const byTypeId = new Map<string, string>();
  const pileTypeIds = Array.from(new Set(rows.map((row) => row.pileTypeId)));
  pileTypeIds.forEach((pileTypeId) => {
    byTypeId.set(
      pileTypeId,
      summarizeGeoStatusForType(rows.filter((row) => row.pileTypeId === pileTypeId)),
    );
  });
  return byTypeId;
}

function summarizeTypeStructStatuses({
  draft,
  latestRun,
}: {
  draft: MultiPileState;
  latestRun?: MultiPileEnvelopeRunSummary | null;
}) {
  const byTypeId = new Map<string, string>();
  draft.pileTypes
    .filter((pileType) => pileType.active !== false)
    .forEach((pileType) => {
      const structResult = latestRun?.envelope?.structResults?.[pileType.id] ?? null;
      byTypeId.set(
        pileType.id,
        structResult
          ? structResult.status === 'pass'
            ? 'Pass'
            : structResult.status === 'fail'
              ? 'Fail'
              : 'Warning'
          : 'Not run',
      );
    });
  return byTypeId;
}

function summarizeGeoStatusForType(rows: InternalVerificationRow[]) {
  const includedRows = rows.filter((row) => row.includedInAnalysis);
  if (includedRows.length === 0) {
    return 'Excluded';
  }

  const failCount = includedRows.filter((row) => row.geoStatusKey === 'fail').length;
  const unresolvedCount = includedRows.filter(
    (row) => row.geoStatusKey === 'pending' || row.geoStatusKey === 'not-run',
  ).length;
  const passCount = includedRows.filter((row) => row.geoStatusKey === 'pass').length;

  if (failCount > 0) {
    return `${failCount} fail · ${passCount} pass`;
  }
  if (unresolvedCount > 0) {
    return `${passCount} pass · ${unresolvedCount} unresolved`;
  }
  return `Pass (${passCount}/${includedRows.length})`;
}

function buildGeoAdoptionValue(rows: InternalVerificationRow[]) {
  const storedRows = rows
    .map((row) => row.geoResult)
    .filter((row): row is MultiPileGeoResultRow => Boolean(row));
  return `${storedRows.length}/${rows.filter((row) => row.includedInAnalysis).length || rows.length} stored GEO`;
}

function buildGeoAdoptionDetail(rows: InternalVerificationRow[]) {
  const includedRows = rows.filter((row) => row.includedInAnalysis);
  const geoRows = includedRows
    .map((row) => row.geoResult)
    .filter((row): row is MultiPileGeoResultRow => Boolean(row));
  const foundingCount = geoRows.filter(
    (row) => (row.foundingMaterialLabel || row.foundingLabel).trim().length > 0,
  ).length;
  const socketCount = geoRows.filter((row) => row.LsAdopted != null && row.LsAdopted > 0).length;
  const pendingCount = includedRows.filter(
    (row) => row.geoStatusKey === 'pending' || row.geoStatusKey === 'not-run',
  ).length;
  const failCount = includedRows.filter((row) => row.geoStatusKey === 'fail').length;

  return [
    `${foundingCount}/${includedRows.length || 0} founding rows stored`,
    `${socketCount}/${includedRows.length || 0} adopted socket rows stored`,
    `${pendingCount} pending`,
    `${failCount} fail`,
  ].join(' · ');
}

function resolveAuthoredFoundingMaterialLabel(
  geoSettings: MultiPileGeoTypeSettings | null,
  projectGeoMaterialsById: Map<string, MultiPileProjectGeotechnicalMaterial>,
) {
  const selectedMaterialId = String(geoSettings?.foundingMaterialId || '').trim();
  if (!selectedMaterialId) {
    return '';
  }

  const material = projectGeoMaterialsById.get(selectedMaterialId) ?? null;
  if (!material) {
    return selectedMaterialId;
  }

  const unitCode = material.unitCode.trim();
  const displayName = material.displayName.trim();
  if (unitCode && displayName) {
    return `${unitCode} — ${displayName}`;
  }
  return unitCode || displayName || material.id;
}

function resolveAuthoredSocketLengthLabel(geoSettings: MultiPileGeoTypeSettings | null) {
  if (!geoSettings) {
    return '';
  }
  if (geoSettings.socketOverrideEnabled && geoSettings.LsManual > 0) {
    return formatMeters(geoSettings.LsManual);
  }
  if (geoSettings.LsAdopted > 0) {
    return formatMeters(geoSettings.LsAdopted);
  }
  if (geoSettings.LsSolved > 0) {
    return formatMeters(geoSettings.LsSolved);
  }
  return '';
}

function buildGeoRepresentativeBasis({
  row,
  authoredFoundingMaterial,
  authoredSocketLength,
  summaryRow,
}: {
  row: InternalVerificationRow | null;
  authoredFoundingMaterial: string;
  authoredSocketLength: string;
  summaryRow?: PricingTypeSummaryRow | null;
}) {
  if (!row) {
    const fallbackParts = [
      authoredFoundingMaterial || summaryRow?.typicalSocketMaterial || '',
      authoredSocketLength || summaryRow?.typicalSocketLength || '',
    ].filter(Boolean);
    return fallbackParts.length > 0
      ? `Authoring basis · ${fallbackParts.join(' · ')}`
      : 'No stored GEO result';
  }

  if (!row.includedInAnalysis) {
    return 'Excluded from analysis';
  }

  if (!row.geoResult) {
    const authoredParts = [
      authoredFoundingMaterial || summaryRow?.typicalSocketMaterial || '',
      authoredSocketLength || summaryRow?.typicalSocketLength || '',
    ].filter(Boolean);
    return authoredParts.length > 0
      ? `No stored GEO result · ${authoredParts.join(' · ')}`
      : 'No stored GEO result';
  }

  const storedParts = [
    row.geoResult.activeReferenceLabel || 'Stored GEO result',
    humanizeGeoResolutionMode(row.geoResult.foundingResolutionMode),
    row.geoResult.socketAdoptionNote || geoSocketBasisLabel(row.geoResult),
  ].filter(Boolean);

  return clipText(storedParts.join(' · '), 96) || 'Stored GEO result';
}

function resolveGeoRepresentativeFoundingMaterial(
  row: InternalVerificationRow,
  authoredFoundingMaterial: string,
  summaryRow?: PricingTypeSummaryRow | null,
) {
  return (
    row.geoResult?.foundingMaterialLabel ||
    row.geoResult?.foundingLabel ||
    authoredFoundingMaterial ||
    summaryRow?.typicalSocketMaterial ||
    PENDING_VALUE
  );
}

function resolveGeoRepresentativeSocketLength(
  row: InternalVerificationRow,
  authoredSocketLength: string,
  summaryRow?: PricingTypeSummaryRow | null,
) {
  return (
    (row.geoResult?.LsAdopted && row.geoResult.LsAdopted > 0
      ? formatMeters(row.geoResult.LsAdopted)
      : '') ||
    authoredSocketLength ||
    summaryRow?.typicalSocketLength ||
    PENDING_VALUE
  );
}

function buildGeoGroupNote({
  rows,
  geoRows,
  foundingSocketMaterials,
  adoptedSocketLengths,
}: {
  rows: InternalVerificationRow[];
  geoRows: MultiPileGeoResultRow[];
  foundingSocketMaterials: string[];
  adoptedSocketLengths: string[];
}) {
  const includedRows = rows.filter((row) => row.includedInAnalysis);
  const noteParts: string[] = [];

  if (includedRows.length === 0) {
    noteParts.push('Authoring-only group');
  } else if (geoRows.length > 0) {
    noteParts.push(`${geoRows.length}/${includedRows.length} stored GEO row(s)`);
  } else {
    noteParts.push('Stored GEO rows pending');
  }

  const inputWarningCount = geoRows.reduce((count, row) => count + row.inputWarnings.length, 0);
  if (inputWarningCount > 0) {
    noteParts.push(`${inputWarningCount} input warning(s)`);
  }

  const pendingReason = geoRows.find((row) => row.pendingReason)?.pendingReason;
  if (pendingReason) {
    noteParts.push(clipText(pendingReason, 52));
  }

  const foundingVariants = new Set(
    foundingSocketMaterials.map((value) => value.trim()).filter(Boolean),
  ).size;
  if (foundingVariants > 1) {
    noteParts.push(`${foundingVariants} founding variants`);
  }

  const socketVariants = new Set(adoptedSocketLengths.map((value) => value.trim()).filter(Boolean))
    .size;
  if (socketVariants > 1) {
    noteParts.push(`${socketVariants} socket variants`);
  }

  return noteParts.join(' · ') || PENDING_VALUE;
}

function geoSocketBasisLabel(row: MultiPileGeoResultRow) {
  if (row.LsAdopted != null && row.LsAdopted > 0) {
    return `Socket ${formatMeters(row.LsAdopted)}`;
  }
  if (row.status === 'pending') {
    return row.pendingReason || 'Pending socket adoption';
  }
  return 'Stored socket basis';
}

function humanizeGeoResolutionMode(value: string) {
  if (value === 'project-library') {
    return 'Project library';
  }
  if (value === 'migration-fallback') {
    return 'Migration fallback';
  }
  if (value === 'missing') {
    return 'Missing selection';
  }
  return humanizeRunStatus(value);
}

function geoStatusSortRank(status: RegisterStatusKey) {
  if (status === 'fail') {
    return 0;
  }
  if (status === 'pending') {
    return 1;
  }
  if (status === 'not-run') {
    return 2;
  }
  if (status === 'warning') {
    return 3;
  }
  if (status === 'excluded') {
    return 4;
  }
  return 5;
}

function worstGeoStatusKey(rows: InternalVerificationRow[]) {
  if (rows.some((row) => row.geoStatusKey === 'fail')) {
    return 'fail';
  }
  if (rows.some((row) => row.geoStatusKey === 'pending')) {
    return 'pending';
  }
  if (rows.some((row) => row.geoStatusKey === 'not-run')) {
    return 'not-run';
  }
  if (rows.some((row) => row.geoStatusKey === 'warning')) {
    return 'warning';
  }
  if (rows.some((row) => row.geoStatusKey === 'excluded')) {
    return 'excluded';
  }
  return 'pass';
}

function verificationStatusSortRank(status: VerificationStatus) {
  if (status === 'fail') {
    return 0;
  }
  if (status === 'unresolved') {
    return 1;
  }
  if (status === 'warn') {
    return 2;
  }
  return 3;
}

function isCompactFlaggedVerificationRow(row: Pick<InternalVerificationRow, 'status'>): boolean {
  return COMPACT_FLAGGED_VERIFICATION_STATUSES.has(row.status);
}

function findTraceRow(
  rows: MultiPileReportGoverningTraceRow[],
  key: MultiPileReportGoverningTraceRow['key'],
) {
  return rows.find((row) => row.key === key) ?? null;
}

function maxUtilLabel(values: string[]) {
  const numericValues = values
    .map((value) => Number.parseFloat(value.replace('%', '')))
    .filter((value) => Number.isFinite(value));
  if (numericValues.length === 0) {
    return PENDING_VALUE;
  }
  return `${Math.max(...numericValues)
    .toFixed(1)
    .replace(/\.0$/, '')}%`;
}

function summarizeNotes(notes: string[]) {
  if (notes.length === 0) {
    return 'Ready';
  }
  if (notes.length === 1) {
    return clipText(notes[0] ?? '', 52);
  }
  return `${notes.length} notes`;
}

function normalizeHeaderValue(...values: Array<string | null | undefined>) {
  const value = values.find((candidate) => String(candidate ?? '').trim().length > 0);
  return value ? String(value).trim() : EMPTY_VALUE;
}

function mostCommon(values: string[], fallback = PENDING_VALUE) {
  const counts = new Map<string, number>();
  values.forEach((value) => {
    const trimmed = String(value ?? '').trim();
    if (!trimmed) {
      return;
    }
    counts.set(trimmed, (counts.get(trimmed) ?? 0) + 1);
  });

  let winner = '';
  let bestCount = -1;
  counts.forEach((count, value) => {
    if (count > bestCount) {
      winner = value;
      bestCount = count;
    }
  });

  return winner || fallback;
}

function summarizeLabels(labels: string[]) {
  if (labels.length === 0) {
    return 'No active material preview available.';
  }
  if (labels.length <= 3) {
    return labels.join(', ');
  }
  return `${labels.slice(0, 3).join(', ')} + ${labels.length - 3} more`;
}

function runTone(status: string): ContextTone {
  if (status === 'completed') {
    return 'success';
  }
  if (status === 'failed') {
    return 'danger';
  }
  if (status === 'running') {
    return 'warning';
  }
  return 'default';
}

function humanizeRunStatus(status: string) {
  return status
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((chunk) => chunk[0]?.toUpperCase() + chunk.slice(1))
    .join(' ');
}

function clipText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function appendixText(value: string | null | undefined, fallback = NOT_RECORDED_VALUE): string {
  const trimmed = String(value ?? '').trim();
  return trimmed || fallback;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateOnly(value: string | null | undefined) {
  if (!value) {
    return NOT_RECORDED_VALUE;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatNumber(value: number, digits = 1) {
  return value.toFixed(digits).replace(/0+$/, '').replace(/\.$/, '');
}

function formatMeters(value: number) {
  return `${formatNumber(value, 2)} m`;
}

function formatEnvelopeValue(value: number, unit: string) {
  const digits = unit === 'kNm' ? 1 : 1;
  return `${formatNumber(value, digits)} ${unit}`;
}

function formatStructUtil(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) {
    return PENDING_VALUE;
  }
  return `${(value * 100).toFixed(1).replace(/\.0$/, '')}%`;
}

function formatMaybePhiG({
  redundancy,
  phiGLow,
  phiGHigh,
}: {
  redundancy: 'LOW' | 'HIGH';
  phiGLow: number;
  phiGHigh: number;
}) {
  const value = redundancy === 'HIGH' ? phiGHigh : phiGLow;
  return Number.isFinite(value) ? formatNumber(value, 3) : PENDING_VALUE;
}
