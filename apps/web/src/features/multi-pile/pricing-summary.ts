import {
  hydrateMultiPileStructTypeSettingsWithProjectAssignments,
  normalizeProjectCoverClass,
  projectConcretePresetById,
  projectTendonPresetById,
  resolveProjectConcreteClass,
  resolveProjectTendonGrade,
  type MultiPileEnvelopeRunSummary,
  type MultiPileGeoResultRow,
  type MultiPileGeoTypeSettings,
  type MultiPilePileTypeDefinition,
  type MultiPileProjectCoverDurabilityClass,
  type MultiPileProjectConcreteClass,
  type MultiPileProjectGeotechnicalMaterial,
  type MultiPileProjectSpecifics,
  type MultiPileProjectTendonGrade,
  type MultiPileState,
} from '@eng/shared';
import {
  derivePileRegisterRows,
  getStructDesignerUiState,
  getStructTypeSettings,
  pileTypeSelectLabel,
  type MultiPileStructTypeSettings,
} from './utils';

const EMPTY_VALUE = '—';
const PENDING_VALUE = 'Pending';
const NO_TENDON_VALUE = 'No tendon';
const NO_STORED_GEO_RESULT = 'No stored GEO result';
const NO_PROJECT_GEO_MATERIAL = 'No project geo material';
const FOUNDING_MATERIAL_PENDING = 'Founding material pending';
const SOCKET_PENDING_STATUS = 'Socket pending';
const NO_STORED_STRUCT_SELECTION = 'No stored struct selection';
const PROJECT_STRUCTURAL_DEFAULTS_UNRESOLVED = 'Project structural defaults unresolved';

type RawPricingStructInputs = {
  concreteClass: MultiPileProjectConcreteClass | null;
  tendonGrade: MultiPileProjectTendonGrade | null;
  coverClass: MultiPileProjectCoverDurabilityClass | null;
  concreteGradeLabel: string;
  tendonSummary: string;
  coverDurabilityLabel: string;
  missingSelections: string[];
};

export interface PricingSummaryHeader {
  projectNumber: string;
  projectName: string;
  client: string;
  location: string;
  revision: string;
  issueDate: string;
  pileCount: number;
  activePileTypeCount: number;
}

export interface PricingPileScheduleRow {
  pileId: string;
  parentJoint: string;
  pileType: string;
  pileTypeId: string;
  diameter: string;
  concreteGrade: string;
  coverDurability: string;
  reinforcementSummary: string;
  tendonSummary: string;
  foundingSocketMaterial: string;
  adoptedSocketLength: string;
  cageLength: string;
  structuralSectionSummary: string;
  elevationSummary: string;
  statusNotes: string;
}

export interface PricingTypeSummaryRow {
  pileType: string;
  pileTypeId: string;
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
}

export interface PricingSectionElevationRow {
  pileType: string;
  pileTypeId: string;
  sectionSketchNote: string;
  reinforcementElevationNote: string;
  structuralSectionSummary: string;
  elevationSummary: string;
  pileTypeDefinition: MultiPilePileTypeDefinition | null;
  structSettings: MultiPileStructTypeSettings | null;
}

export interface PricingWorkbookSheet {
  name: string;
  columns: string[];
  rows: Array<Array<string | number>>;
  columnWidths?: number[];
  rowHeights?: number[];
  wrapTextColumnIndexes?: number[];
}

export interface PricingSummaryData {
  header: PricingSummaryHeader;
  pileRows: PricingPileScheduleRow[];
  typeSummaryRows: PricingTypeSummaryRow[];
  sectionElevationRows: PricingSectionElevationRow[];
  workbookSheets: PricingWorkbookSheet[];
}

export function buildPricingSummaryPrintPath({
  projectId,
  groupId,
}: {
  projectId: string;
  groupId: string;
}) {
  return `/projects/${projectId}/pile-groups/${groupId}/multi-pile/pricing-summary/print`;
}

export function buildPricingSummaryData({
  draft,
  projectSpecifics,
  latestRun: _latestRun,
  projectCode,
  projectName,
}: {
  draft: MultiPileState;
  projectSpecifics: MultiPileProjectSpecifics;
  latestRun?: MultiPileEnvelopeRunSummary | null;
  projectCode?: string | null;
  projectName?: string | null;
}): PricingSummaryData {
  const pileTypesById = new Map(
    draft.pileTypes.map((pileType) => [pileType.id, pileType] as const),
  );
  const projectGeoMaterialsById = new Map(
    projectSpecifics.geotechnicalMaterials.materials.map(
      (material) => [material.id, material] as const,
    ),
  );
  const storedStructSelectionsByTypeId = getStructDesignerUiState(draft).typeSettingsByTypeId ?? {};
  const derivedRows = derivePileRegisterRows(draft);
  const activePileTypes = draft.pileTypes.filter((pileType) => pileType.active !== false);

  const pileRows = derivedRows.map((row) => {
    const pileType = pileTypesById.get(row.pileTypeId) ?? null;
    const rawStructSelection = pileType
      ? (storedStructSelectionsByTypeId[pileType.id] ?? null)
      : null;
    const hasStoredStructSelection = hasStoredStructSelectionValue(rawStructSelection);
    const settings =
      pileType && hasStoredStructSelection
        ? hydrateStructSettings(getStructTypeSettings(draft, pileType), projectSpecifics)
        : null;
    const structInputs = settings ? resolveStructInputs(projectSpecifics, settings) : null;
    const cageLengthSummary = settings ? deriveCageLengthSummary(settings) : null;
    const geoResult = resolveGeoResultForPileRow(
      draft.geoResults[row.parentJointId],
      row.pileTypeId,
    );
    const geoTypeSettings = draft.geoTypeSettings[row.pileTypeId] ?? null;
    const geoPricingInputs = resolveGeoPricingInputs({
      geoResult,
      geoTypeSettings,
      projectGeoMaterialsById,
    });
    const diameterLabel =
      pileType?.Dmm != null && Number.isFinite(pileType.Dmm)
        ? `${formatMaybeNumber(pileType.Dmm)} mm`
        : EMPTY_VALUE;

    return {
      pileId: row.id || EMPTY_VALUE,
      parentJoint: row.parentJointLabel || row.parentJointId || EMPTY_VALUE,
      pileType: pileType ? pileTypeSelectLabel(pileType) : row.pileTypeLabel || EMPTY_VALUE,
      pileTypeId: row.pileTypeId,
      diameter: diameterLabel,
      concreteGrade: structInputs?.concreteGradeLabel ?? PENDING_VALUE,
      coverDurability: structInputs?.coverDurabilityLabel ?? PENDING_VALUE,
      reinforcementSummary: settings ? buildReinforcementSummary(settings) : PENDING_VALUE,
      tendonSummary: structInputs?.tendonSummary ?? PENDING_VALUE,
      foundingSocketMaterial: geoPricingInputs.foundingSocketMaterialLabel,
      adoptedSocketLength: geoPricingInputs.adoptedSocketLengthLabel,
      cageLength: cageLengthSummary?.label ?? PENDING_VALUE,
      structuralSectionSummary:
        settings && structInputs
          ? buildStructuralSectionSummary(settings, structInputs)
          : PENDING_VALUE,
      elevationSummary:
        settings && cageLengthSummary
          ? buildElevationSummary(settings, cageLengthSummary)
          : PENDING_VALUE,
      statusNotes: buildStatusNotes({
        includedInAnalysis: row.includedInAnalysis,
        authoringStatus: row.status,
        pileType,
        geoResult,
        geoPricingInputs,
        structInputs,
        hasStoredStructSelection,
      }),
    };
  });

  const typeSummaryRows = activePileTypes.map((pileType) => {
    const rowsForType = pileRows.filter((row) => row.pileTypeId === pileType.id);

    return {
      pileType: pileTypeSelectLabel(pileType),
      pileTypeId: pileType.id,
      count: rowsForType.length,
      diameter:
        pileType.Dmm != null && Number.isFinite(pileType.Dmm)
          ? `${formatMaybeNumber(pileType.Dmm)} mm`
          : EMPTY_VALUE,
      concreteGrade: mostCommon(rowsForType.map((row) => row.concreteGrade)),
      reinforcementSummary: mostCommon(rowsForType.map((row) => row.reinforcementSummary)),
      tendonSummary: mostCommon(rowsForType.map((row) => row.tendonSummary)),
      coverDurability: mostCommon(rowsForType.map((row) => row.coverDurability)),
      typicalSocketMaterial: mostCommon(rowsForType.map((row) => row.foundingSocketMaterial)),
      typicalSocketLength: mostCommon(rowsForType.map((row) => row.adoptedSocketLength)),
      typicalCageLength: mostCommon(rowsForType.map((row) => row.cageLength)),
      structuralSectionSummary: mostCommon(rowsForType.map((row) => row.structuralSectionSummary)),
      elevationSummary: mostCommon(rowsForType.map((row) => row.elevationSummary)),
    };
  });

  const typeSummaryRowsByTypeId = new Map(
    typeSummaryRows.map((row) => [row.pileTypeId, row] as const),
  );

  const sectionElevationRows = activePileTypes.map((pileType) => {
    const rawStructSelection = storedStructSelectionsByTypeId[pileType.id] ?? null;
    const hasStoredStructSelection = hasStoredStructSelectionValue(rawStructSelection);
    const settings = hasStoredStructSelection
      ? hydrateStructSettings(getStructTypeSettings(draft, pileType), projectSpecifics)
      : null;
    const typeSummaryRow = typeSummaryRowsByTypeId.get(pileType.id) ?? null;

    return {
      pileType: pileTypeSelectLabel(pileType),
      pileTypeId: pileType.id,
      sectionSketchNote: buildWorksheetVisualNote({
        visualKind: 'section',
        pileTypeDefinition: pileType,
        structSettings: settings,
        hasStoredStructSelection,
      }),
      reinforcementElevationNote: buildWorksheetVisualNote({
        visualKind: 'elevation',
        pileTypeDefinition: pileType,
        structSettings: settings,
        hasStoredStructSelection,
      }),
      structuralSectionSummary: typeSummaryRow?.structuralSectionSummary ?? PENDING_VALUE,
      elevationSummary: typeSummaryRow?.elevationSummary ?? PENDING_VALUE,
      pileTypeDefinition: pileType,
      structSettings: settings,
    };
  });

  const header: PricingSummaryHeader = {
    projectNumber: normalizeHeaderValue(projectSpecifics.identity.projectNumber, projectCode),
    projectName: normalizeHeaderValue(projectSpecifics.identity.projectName, projectName),
    client: projectSpecifics.identity.client || EMPTY_VALUE,
    location:
      projectSpecifics.identity.address || projectSpecifics.identity.mapAddress || EMPTY_VALUE,
    revision: projectSpecifics.reportMeta.reportRevision || EMPTY_VALUE,
    issueDate: projectSpecifics.reportMeta.issueDate || EMPTY_VALUE,
    pileCount: pileRows.length,
    activePileTypeCount: activePileTypes.length,
  };

  return {
    header,
    pileRows,
    typeSummaryRows,
    sectionElevationRows,
    workbookSheets: buildPricingWorkbookSheets({
      pileRows,
      typeSummaryRows,
      sectionElevationRows,
    }),
  };
}

export function buildPricingWorkbookFilename(data: PricingSummaryData) {
  const projectNumber = sanitizeFilenamePart(data.header.projectNumber);
  const projectName = sanitizeFilenamePart(data.header.projectName);
  const dated = new Date().toISOString().slice(0, 10);
  const base = [projectNumber, projectName, 'pricing-summary', dated].filter(Boolean).join('_');
  return `${base || 'multi-pile_pricing-summary'}.xlsx`;
}

function buildPricingWorkbookSheets({
  pileRows,
  typeSummaryRows,
  sectionElevationRows,
}: {
  pileRows: PricingPileScheduleRow[];
  typeSummaryRows: PricingTypeSummaryRow[];
  sectionElevationRows: PricingSectionElevationRow[];
}): PricingWorkbookSheet[] {
  return [
    {
      name: 'Pile Pricing',
      columns: [
        'Pile ID',
        'Parent Joint',
        'Pile Type',
        'Diameter',
        'Concrete Grade',
        'Cover / Durability',
        'Reinforcement Summary',
        'Tendon Summary',
        'Founding / Socket Material',
        'Adopted Socket Length',
        'Cage Length',
        'Structural Section Summary',
        'Elevation Summary',
        'Status / Notes',
      ],
      rows: pileRows.map((row) => [
        row.pileId,
        row.parentJoint,
        row.pileType,
        row.diameter,
        row.concreteGrade,
        row.coverDurability,
        row.reinforcementSummary,
        row.tendonSummary,
        row.foundingSocketMaterial,
        row.adoptedSocketLength,
        row.cageLength,
        row.structuralSectionSummary,
        row.elevationSummary,
        row.statusNotes,
      ]),
      columnWidths: [16, 18, 18, 14, 20, 22, 34, 22, 22, 18, 18, 38, 42, 24],
    },
    {
      name: 'Type Quantity Summary',
      columns: [
        'Pile Type',
        'Count',
        'Diameter',
        'Concrete Grade',
        'Reinforcement Summary',
        'Tendon Summary',
        'Cover / Durability',
        'Typical Socket Material',
        'Typical Socket Length',
        'Typical Cage Length',
        'Structural Section Summary',
        'Elevation Summary',
      ],
      rows: typeSummaryRows.map((row) => [
        row.pileType,
        row.count,
        row.diameter,
        row.concreteGrade,
        row.reinforcementSummary,
        row.tendonSummary,
        row.coverDurability,
        row.typicalSocketMaterial,
        row.typicalSocketLength,
        row.typicalCageLength,
        row.structuralSectionSummary,
        row.elevationSummary,
      ]),
      columnWidths: [18, 10, 14, 20, 34, 22, 22, 22, 18, 18, 38, 42],
    },
    {
      name: 'Pile Type Visual Summary',
      columns: [
        'Pile Type',
        'Section Sketch Note',
        'Reinforcement Elevation Note',
        'Structural Section Summary',
        'Elevation Summary',
      ],
      rows: sectionElevationRows.flatMap((row, index) => {
        const block: Array<Array<string | number>> = [
          [
            row.pileType,
            row.sectionSketchNote,
            row.reinforcementElevationNote,
            formatWorksheetMultilineText(row.structuralSectionSummary),
            formatWorksheetMultilineText(row.elevationSummary),
          ],
        ];

        if (index < sectionElevationRows.length - 1) {
          block.push(['', '', '', '', '']);
        }

        return block;
      }),
      columnWidths: [18, 34, 38, 44, 48],
      rowHeights: buildVisualSummaryRowHeights(sectionElevationRows.length),
      wrapTextColumnIndexes: [1, 2, 3, 4],
    },
  ];
}

function hydrateStructSettings(
  settings: MultiPileStructTypeSettings,
  projectSpecifics: MultiPileProjectSpecifics,
) {
  return {
    ...settings,
    ...hydrateMultiPileStructTypeSettingsWithProjectAssignments(settings, projectSpecifics),
  } as MultiPileStructTypeSettings;
}

function resolveStructInputs(
  projectSpecifics: MultiPileProjectSpecifics,
  settings: MultiPileStructTypeSettings,
): RawPricingStructInputs {
  const concreteRows = projectSpecifics.structuralDefaults.concreteClasses.map((row) =>
    resolvePricingConcreteClass(row),
  );
  const tendonRows = projectSpecifics.structuralDefaults.tendonGrades.map((row) =>
    resolvePricingTendonGrade(row),
  );
  const coverRows = projectSpecifics.structuralDefaults.coverDurabilityClasses.map((row) =>
    normalizeProjectCoverClass(row),
  );

  const concreteClass = concreteRows.find((row) => row.id === settings.concreteClassId) ?? null;
  const tendonGrade = tendonRows.find((row) => row.id === settings.tendonGradeId) ?? null;
  const coverClass = coverRows.find((row) => row.id === settings.coverDurabilityClassId) ?? null;
  const missingSelections: string[] = [];

  if (settings.concreteClassId && !concreteClass) {
    missingSelections.push('concrete');
  }
  if (settings.tendonGradeId && !tendonGrade) {
    missingSelections.push('tendon');
  }
  if (settings.coverDurabilityClassId && !coverClass) {
    missingSelections.push('cover');
  }

  return {
    concreteClass,
    tendonGrade,
    coverClass,
    concreteGradeLabel: concreteClass
      ? concreteCommercialLabel(concreteClass)
      : settings.fc > 0
        ? `${formatMaybeNumber(settings.fc)} MPa`
        : PENDING_VALUE,
    tendonSummary: buildTendonSummary(tendonGrade, settings),
    coverDurabilityLabel: coverClass
      ? coverCommercialLabel(coverClass)
      : settings.cover > 0
        ? `${formatMaybeNumber(settings.cover)} mm cover`
        : PENDING_VALUE,
    missingSelections,
  };
}

function resolvePricingConcreteClass(row: unknown) {
  const source = objectRecord(row);
  const standardProfileId = String(source.standardProfileId ?? '').trim();
  const id = String(source.id ?? '').trim();

  return resolveProjectConcreteClass(
    !standardProfileId && id && projectConcretePresetById(id)
      ? { ...source, standardProfileId: id }
      : source,
  ).row;
}

function resolvePricingTendonGrade(row: unknown) {
  const source = objectRecord(row);
  const standardProfileId = String(source.standardProfileId ?? '').trim();
  const id = String(source.id ?? '').trim();

  return resolveProjectTendonGrade(
    !standardProfileId && id && projectTendonPresetById(id)
      ? { ...source, standardProfileId: id }
      : source,
  ).row;
}

function concreteCommercialLabel(row: MultiPileProjectConcreteClass) {
  const parts = [
    row.displayName || '',
    row.fc_MPa != null ? `${formatMaybeNumber(row.fc_MPa)} MPa` : '',
  ];
  const label = parts.filter(Boolean).join(' · ');
  return label || PENDING_VALUE;
}

function coverCommercialLabel(row: MultiPileProjectCoverDurabilityClass) {
  const labelParts = [
    row.displayName || row.exposureClass || row.exposureClassification || '',
    row.nominalCover_mm != null ? `${formatMaybeNumber(row.nominalCover_mm)} mm cover` : '',
  ];
  const label = labelParts.filter(Boolean).join(' · ');
  return label || PENDING_VALUE;
}

function buildTendonSummary(
  tendonGrade: MultiPileProjectTendonGrade | null,
  settings: MultiPileStructTypeSettings,
) {
  if (!settings.tendonGradeId) {
    return NO_TENDON_VALUE;
  }
  if (!tendonGrade) {
    return settings.tendonGradeId || PENDING_VALUE;
  }
  const labelParts = [
    tendonGrade.displayName || tendonGrade.tendonType || tendonGrade.id,
    tendonGrade.nominalDiameter_mm != null
      ? `${formatMaybeNumber(tendonGrade.nominalDiameter_mm)} mm`
      : '',
  ];
  const label = labelParts.filter(Boolean).join(' · ');
  return label || PENDING_VALUE;
}

function buildReinforcementSummary(settings: MultiPileStructTypeSettings) {
  const perimeter =
    settings.nBars > 0 ? `${settings.nBars}-N${settings.barDia} perimeter` : 'No perimeter cage';
  const central =
    settings.useCentralBar && settings.centralBarCount > 0
      ? `${settings.centralBarCount}-N${settings.centralBarDia} central`
      : 'No central bar';
  const transverse =
    settings.transverseSystem === 'spiral'
      ? `N${settings.spiralDia} spiral @ ${formatMaybeNumber(settings.spiralPitch)}`
      : `N${settings.tieDia} @ ${formatMaybeNumber(settings.tieS)} ties`;

  return [perimeter, central, transverse].join('; ');
}

function buildStructuralSectionSummary(
  settings: MultiPileStructTypeSettings,
  structInputs: RawPricingStructInputs,
) {
  const axialLabel =
    settings.axModel === 'plain'
      ? 'Plain circular pile'
      : settings.axModel === 'partial'
        ? 'Partially reinforced circular pile'
        : 'Reinforced circular pile';

  const parts = [axialLabel, buildReinforcementSummary(settings)];

  if (settings.cover > 0) {
    parts.push(`Cover ${formatMaybeNumber(settings.cover)} mm`);
  } else if (
    structInputs.coverClass?.nominalCover_mm != null &&
    Number.isFinite(structInputs.coverClass.nominalCover_mm) &&
    structInputs.coverClass.nominalCover_mm > 0
  ) {
    parts.push(`Cover ${formatMaybeNumber(structInputs.coverClass.nominalCover_mm)} mm`);
  }

  return parts.join('; ');
}

type CageLengthSummary = {
  label: string;
  belowHeadLabel: string;
  centralContinuation: string;
};

function deriveCageLengthSummary(settings: MultiPileStructTypeSettings): CageLengthSummary {
  const hasCentral = settings.useCentralBar && settings.centralBarCount > 0;

  if (settings.axModel === 'plain') {
    return {
      label: 'No cage',
      belowHeadLabel: 'None',
      centralContinuation: hasCentral
        ? 'Central bars only (no perimeter cage)'
        : 'No reinforcement',
    };
  }

  if (settings.axModel === 'partial') {
    const cutDepth = Math.max(0, settings.reoCutDepth);
    const developmentLength = Math.max(0, settings.reoLd);

    if (cutDepth > 0 && developmentLength > 0) {
      return {
        label: `${formatMeters(cutDepth + developmentLength)} (cut-off ${formatMaybeNumber(cutDepth)} + Ld ${formatMaybeNumber(developmentLength)})`,
        belowHeadLabel: formatMeters(cutDepth + developmentLength),
        centralContinuation: hasCentral ? 'Central bars continue below perimeter cage' : '',
      };
    }

    if (cutDepth > 0 && developmentLength <= 0) {
      return {
        label: 'Partially defined (Ld missing)',
        belowHeadLabel: 'Partially defined',
        centralContinuation: hasCentral ? 'Central bars continue below perimeter cage' : '',
      };
    }

    return {
      label: 'Not fully defined',
      belowHeadLabel: 'Not fully defined',
      centralContinuation: hasCentral ? 'Central bars continue below perimeter cage' : '',
    };
  }

  return {
    label: 'Full depth (to toe)',
    belowHeadLabel: 'Full depth (to toe)',
    centralContinuation: hasCentral ? 'Central bars within full-depth cage' : '',
  };
}

function buildElevationSummary(
  settings: MultiPileStructTypeSettings,
  cageLengthSummary: CageLengthSummary,
) {
  const parts: string[] = [];
  if (settings.axModel === 'plain') {
    parts.push('No perimeter cage');
  } else if (settings.axModel === 'partial') {
    parts.push(`Perimeter cage ${cageLengthSummary.belowHeadLabel || 'Partially defined'}`);
  } else {
    parts.push('Perimeter cage full depth to toe');
  }

  if (settings.useCentralBar && settings.centralBarCount > 0) {
    parts.push(`${settings.centralBarCount}-N${settings.centralBarDia} central`);
    if (cageLengthSummary.centralContinuation) {
      parts.push(cageLengthSummary.centralContinuation);
    }
  }

  const headNotes = [
    `perimeter ${headDetailLabel(settings.perimHeadDetail)}`,
    settings.perimProjectionAboveHead > 0
      ? `${formatMeters(settings.perimProjectionAboveHead)} projection`
      : '',
  ]
    .filter(Boolean)
    .join(', ');
  if (headNotes) {
    parts.push(`Head detail: ${headNotes}`);
  }

  if (settings.useCentralBar && settings.centralBarCount > 0) {
    const centralProjectionNotes = [
      `central ${headDetailLabel(settings.centralHeadDetail)}`,
      settings.centralProjectionAboveHead > 0
        ? `${formatMeters(settings.centralProjectionAboveHead)} projection`
        : '',
    ]
      .filter(Boolean)
      .join(', ');
    if (centralProjectionNotes) {
      parts.push(`Central head detail: ${centralProjectionNotes}`);
    }
  }

  return parts.join('; ') || PENDING_VALUE;
}

function headDetailLabel(value: string) {
  switch (value) {
    case '90out':
      return '90 out';
    case '90in':
      return '90 in';
    case '180in':
      return '180 in';
    case '180out':
      return '180 out';
    default:
      return 'straight';
  }
}

function resolveGeoResultForPileRow(
  geoResult: MultiPileGeoResultRow | undefined,
  pileTypeId: string,
) {
  if (!geoResult) {
    return null;
  }
  return geoResult.typeId === pileTypeId ? geoResult : null;
}

type GeoPricingInputs = {
  foundingSocketMaterialLabel: string;
  adoptedSocketLengthLabel: string;
  foundingMaterialSource:
    | 'stored-result'
    | 'authored-material'
    | 'missing-project-material'
    | 'unresolved';
  socketLengthSource: 'stored-result' | 'manual' | 'adopted' | 'solved' | 'unresolved';
  hasFoundingMaterialSource: boolean;
  hasSocketLengthSource: boolean;
  usesStoredGeoResult: boolean;
};

function resolveGeoPricingInputs({
  geoResult,
  geoTypeSettings,
  projectGeoMaterialsById,
}: {
  geoResult: MultiPileGeoResultRow | null;
  geoTypeSettings: MultiPileGeoTypeSettings | null;
  projectGeoMaterialsById: Map<string, MultiPileProjectGeotechnicalMaterial>;
}): GeoPricingInputs {
  const storedFoundingMaterialLabel = String(
    geoResult?.foundingMaterialLabel || geoResult?.foundingLabel || '',
  ).trim();
  const storedSocketLength =
    geoResult?.LsAdopted != null && Number.isFinite(geoResult.LsAdopted) && geoResult.LsAdopted > 0
      ? formatMeters(geoResult.LsAdopted)
      : '';

  const authoredFoundingMaterial = resolveAuthoredFoundingMaterial(
    geoTypeSettings,
    projectGeoMaterialsById,
  );
  const authoredSocketLength = resolveAuthoredSocketLength(geoTypeSettings);

  const foundingMaterialSource = storedFoundingMaterialLabel
    ? 'stored-result'
    : authoredFoundingMaterial.material != null
      ? 'authored-material'
      : authoredFoundingMaterial.selectedMaterialId
        ? 'missing-project-material'
        : 'unresolved';
  const socketLengthSource = storedSocketLength ? 'stored-result' : authoredSocketLength.source;
  const foundingSocketMaterialLabel =
    storedFoundingMaterialLabel ||
    authoredFoundingMaterial.label ||
    authoredFoundingMaterial.selectedMaterialId ||
    PENDING_VALUE;
  const adoptedSocketLengthLabel =
    storedSocketLength || authoredSocketLength.label || PENDING_VALUE;

  return {
    foundingSocketMaterialLabel,
    adoptedSocketLengthLabel,
    foundingMaterialSource,
    socketLengthSource,
    hasFoundingMaterialSource: foundingMaterialSource !== 'unresolved',
    hasSocketLengthSource: socketLengthSource !== 'unresolved',
    usesStoredGeoResult: Boolean(storedFoundingMaterialLabel || storedSocketLength),
  };
}

function resolveAuthoredFoundingMaterial(
  geoTypeSettings: MultiPileGeoTypeSettings | null,
  projectGeoMaterialsById: Map<string, MultiPileProjectGeotechnicalMaterial>,
) {
  const selectedMaterialId = String(geoTypeSettings?.foundingMaterialId || '').trim();
  if (!selectedMaterialId) {
    return {
      selectedMaterialId: '',
      material: null,
      label: '',
    };
  }

  const material = projectGeoMaterialsById.get(selectedMaterialId) ?? null;
  return {
    selectedMaterialId,
    material,
    label: material ? geotechnicalMaterialLabel(material) : '',
  };
}

function resolveAuthoredSocketLength(geoTypeSettings: MultiPileGeoTypeSettings | null): {
  label: string;
  source: GeoPricingInputs['socketLengthSource'];
} {
  if (!geoTypeSettings) {
    return { label: '', source: 'unresolved' };
  }
  if (geoTypeSettings.socketOverrideEnabled && geoTypeSettings.LsManual > 0) {
    return { label: formatMeters(geoTypeSettings.LsManual), source: 'manual' };
  }
  if (geoTypeSettings.LsAdopted > 0) {
    return { label: formatMeters(geoTypeSettings.LsAdopted), source: 'adopted' };
  }
  if (geoTypeSettings.LsSolved > 0) {
    return { label: formatMeters(geoTypeSettings.LsSolved), source: 'solved' };
  }
  return { label: '', source: 'unresolved' };
}

function buildStatusNotes({
  includedInAnalysis,
  authoringStatus,
  pileType,
  geoResult,
  geoPricingInputs,
  structInputs,
  hasStoredStructSelection,
}: {
  includedInAnalysis: boolean;
  authoringStatus: string;
  pileType: MultiPilePileTypeDefinition | null;
  geoResult: MultiPileGeoResultRow | null;
  geoPricingInputs: GeoPricingInputs;
  structInputs: RawPricingStructInputs | null;
  hasStoredStructSelection: boolean;
}) {
  const notes: string[] = [];

  if (!includedInAnalysis) {
    notes.push(authoringStatus);
  }
  if (!pileType) {
    notes.push('Pile type pending');
  }
  if (!includedInAnalysis) {
    return notes.length > 0 ? Array.from(new Set(notes)).join(' · ') : PENDING_VALUE;
  }
  if (!geoResult) {
    notes.push(NO_STORED_GEO_RESULT);
  }
  if (geoPricingInputs.foundingMaterialSource === 'missing-project-material') {
    notes.push(NO_PROJECT_GEO_MATERIAL);
  } else if (geoPricingInputs.foundingMaterialSource === 'unresolved') {
    notes.push(FOUNDING_MATERIAL_PENDING);
  }
  if (
    geoPricingInputs.socketLengthSource === 'unresolved' ||
    (geoResult?.status === 'pending' && !geoPricingInputs.usesStoredGeoResult)
  ) {
    notes.push(SOCKET_PENDING_STATUS);
  }
  if (!hasStoredStructSelection && pileType) {
    notes.push(NO_STORED_STRUCT_SELECTION);
  } else if (structInputs?.missingSelections.length) {
    notes.push(PROJECT_STRUCTURAL_DEFAULTS_UNRESOLVED);
  }

  return notes.length > 0 ? Array.from(new Set(notes)).join(' · ') : 'Ready';
}

function mostCommon(values: string[], fallback = PENDING_VALUE) {
  const counts = new Map<string, number>();
  values.forEach((value) => {
    if (!value || value === EMPTY_VALUE || value === PENDING_VALUE) {
      return;
    }
    counts.set(value, (counts.get(value) ?? 0) + 1);
  });

  let winner = '';
  let bestCount = -1;
  counts.forEach((count, value) => {
    if (count > bestCount) {
      winner = value;
      bestCount = count;
    }
  });

  return winner || fallback || PENDING_VALUE;
}

function geotechnicalMaterialLabel(
  material: Pick<MultiPileProjectGeotechnicalMaterial, 'id' | 'unitCode' | 'displayName'>,
) {
  const unitCode = material.unitCode.trim();
  const displayName = material.displayName.trim();
  if (unitCode && displayName) {
    return `${unitCode} — ${displayName}`;
  }
  return unitCode || displayName || material.id;
}

function buildWorksheetVisualNote({
  visualKind,
  pileTypeDefinition,
  structSettings,
  hasStoredStructSelection,
}: {
  visualKind: 'section' | 'elevation';
  pileTypeDefinition: MultiPilePileTypeDefinition | null;
  structSettings: MultiPileStructTypeSettings | null;
  hasStoredStructSelection: boolean;
}) {
  if (!pileTypeDefinition) {
    return `No ${visualKind} sketch available because the pile type definition is missing.`;
  }
  if (!hasStoredStructSelection || !structSettings) {
    return `No ${visualKind} sketch available because no stored STRUCT selection exists for this pile type.`;
  }

  const canRender =
    visualKind === 'section'
      ? canRenderSectionSketch(pileTypeDefinition, structSettings)
      : canRenderElevationSketch(pileTypeDefinition, structSettings);

  return canRender
    ? `Renderable from the current stored pile type and STRUCT settings. XLSX export remains text-only.`
    : `Text-only ${visualKind} summary from the current stored pile type and STRUCT settings because the stored data is not fully renderable.`;
}

function canRenderSectionSketch(
  pileTypeDefinition: Pick<MultiPilePileTypeDefinition, 'id' | 'nominalDiameterMm' | 'Dmm'>,
  structSettings: MultiPileStructTypeSettings,
) {
  const diameterMm = Number(pileTypeDefinition.nominalDiameterMm || pileTypeDefinition.Dmm || 0);
  return (
    Boolean(pileTypeDefinition.id) &&
    Number.isFinite(diameterMm) &&
    diameterMm > 0 &&
    isFiniteNonNegative(structSettings.cover) &&
    isFinitePositive(structSettings.barDia) &&
    isFiniteNonNegative(structSettings.nBars) &&
    isFinitePositive(structSettings.centralBarDia) &&
    isFiniteNonNegative(structSettings.centralBarCount)
  );
}

function canRenderElevationSketch(
  pileTypeDefinition: Pick<MultiPilePileTypeDefinition, 'id'>,
  structSettings: MultiPileStructTypeSettings,
) {
  return (
    Boolean(pileTypeDefinition.id) &&
    isFiniteNonNegative(structSettings.perimProjectionAboveHead) &&
    isFiniteNonNegative(structSettings.centralProjectionAboveHead) &&
    isFiniteNonNegative(structSettings.reoCutDepth)
  );
}

function isFinitePositive(value: number | null | undefined) {
  return value != null && Number.isFinite(value) && value > 0;
}

function isFiniteNonNegative(value: number | null | undefined) {
  return value != null && Number.isFinite(value) && value >= 0;
}

function formatWorksheetMultilineText(value: string) {
  return value.replace(/; /g, ';\n');
}

function buildVisualSummaryRowHeights(typeCount: number) {
  const rowHeights = [24];
  for (let index = 0; index < typeCount; index += 1) {
    rowHeights.push(84);
    if (index < typeCount - 1) {
      rowHeights.push(12);
    }
  }
  return rowHeights;
}

function formatMaybeNumber(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) {
    return '';
  }
  return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(3).replace(/\.?0+$/, '');
}

function formatMeters(value: number) {
  return `${formatMaybeNumber(value)} m`;
}

function sanitizeFilenamePart(value: string) {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
}

function hasStoredStructSelectionValue(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  return Object.keys(value as Record<string, unknown>).length > 0;
}

function normalizeHeaderValue(primary: string, fallback?: string | null) {
  const resolved = primary.trim() || String(fallback || '').trim();
  return resolved || EMPTY_VALUE;
}

function objectRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
