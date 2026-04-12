import {
  MULTI_PILE_UNASSIGNED_PILE_TYPE_ID,
  type MultiPileJoint,
  type MultiPileJointLoadRow,
  type MultiPileState,
  type ProjectLoadCase,
} from '@eng/shared';
import {
  MULTI_PILE_JOINT_LOAD_FIELDS,
  emptyJointLoadRow,
  getJointLoadAuthoringUiState,
  isZeroJointLoadRow,
  jointDisplayLabel,
  jointLoadRowKey,
  normalizeJointDefinition,
  pileTypeSelectLabel,
  setJointLoadAuthoringUiState,
  type MultiPileJointLoadField,
} from './utils';

export const MULTI_PILE_JOINT_LOAD_IMPORT_SHEET_NAME = 'Joint Load Import';
export const MULTI_PILE_JOINT_LOAD_SAMPLE_SHEET_NAME = 'Sample Rows';
export const MULTI_PILE_JOINT_LOAD_REFERENCE_SHEET_NAME = 'Reference';

export const MULTI_PILE_JOINT_LOAD_IMPORT_COLUMNS = [
  'jointId',
  'jointLabel',
  'x',
  'y',
  'z',
  'supports',
  'pileType',
  'active',
  'loadCase',
  'P',
  'Vx',
  'Vy',
  'Mx',
  'My',
  'Mz',
] as const;

type ImportColumnKey = (typeof MULTI_PILE_JOINT_LOAD_IMPORT_COLUMNS)[number];

type JointLoadImportColumnIndexes = Record<ImportColumnKey, number>;
type JointLoadImportSkipReason =
  | 'missing jointId'
  | 'missing loadCase'
  | 'unknown pileType'
  | 'unknown loadCase'
  | 'disabled loadCase'
  | 'missing required new-joint fields'
  | 'invalid joint metadata'
  | 'invalid load values';

type JointLoadImportSkipTracker = Map<
  JointLoadImportSkipReason,
  { count: number; examples: string[] }
>;

type LoadStateSnapshot = {
  row: MultiPileJointLoadRow | null;
  blankFields: Partial<Record<MultiPileJointLoadField, true>> | null;
  authoredZeroRow: boolean;
};

type NumberParseResult =
  | { kind: 'blank' }
  | { kind: 'number'; value: number }
  | { kind: 'invalid' };

type BooleanParseResult =
  | { kind: 'blank' }
  | { kind: 'boolean'; value: boolean }
  | { kind: 'invalid' };

export interface JointLoadImportSummary {
  totalRows: number;
  appliedRowCount: number;
  skippedRowCount: number;
  insertedJointCount: number;
  updatedJointCount: number;
  insertedLoadRowCount: number;
  updatedLoadRowCount: number;
  warningMessages: string[];
}

export interface JointLoadImportWorkbookData {
  templateRows: Array<Array<string | number>>;
  sampleRows: Array<Array<string | number>>;
  referenceRows: Array<Array<string | number>>;
  templateColumnWidths: number[];
  sampleColumnWidths: number[];
  referenceColumnWidths: number[];
}

export interface JointLoadImportPileTypeReference {
  id: string;
  uiLabel: string;
  active: boolean;
}

export interface JointLoadImportLoadCaseReference {
  loadCaseId: string;
  canonicalToken: string;
  acceptedTokens: string[];
  aliasTokens: string[];
  enabled: boolean;
  name: string;
  type: ProjectLoadCase['type'];
  reversible: boolean;
}

export interface JointLoadImportReferenceData {
  pileTypes: JointLoadImportPileTypeReference[];
  loadCases: JointLoadImportLoadCaseReference[];
  enabledLoadCases: JointLoadImportLoadCaseReference[];
  disabledLoadCases: JointLoadImportLoadCaseReference[];
  sampleCsvRows: Array<Array<string | number>>;
  sampleCsv: string;
}

const HEADER_ALIASES: Record<ImportColumnKey, string[]> = {
  jointId: ['jointId', 'joint id'],
  jointLabel: ['jointLabel', 'joint label', 'label'],
  x: ['x'],
  y: ['y'],
  z: ['z'],
  supports: ['supports', 'supportCount', 'support count'],
  pileType: ['pileType', 'pile type'],
  active: ['active'],
  loadCase: ['loadCase', 'load case', 'pattern', 'pattern id'],
  P: ['P', 'p'],
  Vx: ['Vx', 'vx'],
  Vy: ['Vy', 'vy'],
  Mx: ['Mx', 'mx'],
  My: ['My', 'my'],
  Mz: ['Mz', 'mz'],
};

const LOAD_FIELD_BY_COLUMN: Record<
  Extract<ImportColumnKey, 'P' | 'Vx' | 'Vy' | 'Mx' | 'My' | 'Mz'>,
  MultiPileJointLoadField
> = {
  P: 'p',
  Vx: 'vx',
  Vy: 'vy',
  Mx: 'mx',
  My: 'my',
  Mz: 'mz',
};

export function applyJointLoadImportFromSheetRows({
  draft,
  projectLoadCases,
  sheetRows,
}: {
  draft: MultiPileState;
  projectLoadCases: ProjectLoadCase[];
  sheetRows: unknown[][];
}): { nextState: MultiPileState; summary: JointLoadImportSummary } {
  const columnIndexes = resolveImportColumnIndexes(sheetRows[0] ?? []);
  const dataRows = (sheetRows.slice(1) ?? []).filter((row) => !rowIsBlank(row));
  if (dataRows.length === 0) {
    throw new Error('No import rows were found under the header row.');
  }

  const jointsById = new Map(draft.joints.map((joint) => [joint.id, { ...joint }]));
  const jointOrderById = new Map(draft.joints.map((joint) => [joint.id, joint.order]));
  const loadRowsByKey = new Map(
    draft.jointLoads.map((row) => [jointLoadRowKey(row.jointId, row.patternId), { ...row }]),
  );
  const currentAuthoringState = getJointLoadAuthoringUiState(draft);
  const blankFieldsByRowKey = Object.fromEntries(
    Object.entries(currentAuthoringState.blankFieldsByRowKey).map(([rowKey, fields]) => [
      rowKey,
      { ...fields },
    ]),
  );
  const authoredZeroRowsByKey = { ...currentAuthoringState.authoredZeroRowsByKey };
  const pileTypeIdByToken = buildPileTypeLookup(draft);
  const loadCaseByToken = buildLoadCaseLookup({ draft, projectLoadCases });
  const insertedJointIds = new Set<string>();
  const updatedJointIds = new Set<string>();
  const insertedLoadRowKeys = new Set<string>();
  const updatedLoadRowKeys = new Set<string>();
  const skips: JointLoadImportSkipTracker = new Map();

  dataRows.forEach((row, rowIndex) => {
    const sourceRowNumber = rowIndex + 2;
    const jointId = readStringCell(row, columnIndexes.jointId);
    if (!jointId) {
      addSkip(skips, 'missing jointId', `Row ${sourceRowNumber}`);
      return;
    }

    const loadCaseToken = readStringCell(row, columnIndexes.loadCase);
    if (!loadCaseToken) {
      addSkip(skips, 'missing loadCase', `Row ${sourceRowNumber} (${jointId})`);
      return;
    }

    const matchedLoadCase = loadCaseByToken.get(normalizeLookupToken(loadCaseToken)) ?? null;
    if (!matchedLoadCase) {
      addSkip(skips, 'unknown loadCase', `Row ${sourceRowNumber} (${jointId} · ${loadCaseToken})`);
      return;
    }
    if (!matchedLoadCase.enabled) {
      addSkip(
        skips,
        'disabled loadCase',
        `Row ${sourceRowNumber} (${jointId} · ${matchedLoadCase.id})`,
      );
      return;
    }

    const existingJoint = jointsById.get(jointId) ?? null;
    const pileTypeToken = readStringCell(row, columnIndexes.pileType);
    let pileTypeId = existingJoint?.pileTypeId ?? '';
    if (pileTypeToken) {
      pileTypeId = pileTypeIdByToken.get(normalizeLookupToken(pileTypeToken)) ?? '';
      if (!pileTypeId) {
        addSkip(
          skips,
          'unknown pileType',
          `Row ${sourceRowNumber} (${jointId} · ${pileTypeToken})`,
        );
        return;
      }
    }

    const xValue = parseNumberCell(row[columnIndexes.x]);
    const yValue = parseNumberCell(row[columnIndexes.y]);
    const zValue = parseNumberCell(row[columnIndexes.z]);
    const supportsValue = parseNumberCell(row[columnIndexes.supports]);
    const activeValue = parseBooleanCell(row[columnIndexes.active]);
    if (
      xValue.kind === 'invalid' ||
      yValue.kind === 'invalid' ||
      zValue.kind === 'invalid' ||
      supportsValue.kind === 'invalid' ||
      (supportsValue.kind === 'number' &&
        (!Number.isInteger(supportsValue.value) || supportsValue.value < 1)) ||
      activeValue.kind === 'invalid'
    ) {
      addSkip(skips, 'invalid joint metadata', `Row ${sourceRowNumber} (${jointId})`);
      return;
    }

    const isNewJoint = !existingJoint;
    if (
      isNewJoint &&
      (!pileTypeId ||
        xValue.kind === 'blank' ||
        yValue.kind === 'blank' ||
        zValue.kind === 'blank' ||
        supportsValue.kind === 'blank')
    ) {
      addSkip(skips, 'missing required new-joint fields', `Row ${sourceRowNumber} (${jointId})`);
      return;
    }

    const numericColumns = Object.entries(LOAD_FIELD_BY_COLUMN) as Array<
      [keyof typeof LOAD_FIELD_BY_COLUMN, MultiPileJointLoadField]
    >;
    const parsedLoadValues = Object.fromEntries(
      numericColumns.map(([columnKey, field]) => [
        field,
        parseNumberCell(row[columnIndexes[columnKey]]),
      ]),
    ) as Record<MultiPileJointLoadField, NumberParseResult>;
    const hasInvalidLoadValue = MULTI_PILE_JOINT_LOAD_FIELDS.some(
      (field) => parsedLoadValues[field].kind === 'invalid',
    );
    if (hasInvalidLoadValue) {
      addSkip(
        skips,
        'invalid load values',
        `Row ${sourceRowNumber} (${jointId} · ${matchedLoadCase.id})`,
      );
      return;
    }

    const nextJoint = normalizeJointDefinition(
      {
        id: jointId,
        displayName:
          readStringCell(row, columnIndexes.jointLabel) ||
          existingJoint?.displayName ||
          existingJoint?.jointDisplayName ||
          '',
        jointDisplayName:
          readStringCell(row, columnIndexes.jointLabel) ||
          existingJoint?.jointDisplayName ||
          existingJoint?.displayName ||
          '',
        x: xValue.kind === 'number' ? xValue.value : (existingJoint?.x ?? 0),
        y: yValue.kind === 'number' ? yValue.value : (existingJoint?.y ?? 0),
        z: zValue.kind === 'number' ? zValue.value : (existingJoint?.z ?? 0),
        supportCount:
          supportsValue.kind === 'number'
            ? Math.max(1, Math.round(supportsValue.value))
            : (existingJoint?.supportCount ?? existingJoint?.noOfSupports ?? 1),
        noOfSupports:
          supportsValue.kind === 'number'
            ? Math.max(1, Math.round(supportsValue.value))
            : (existingJoint?.supportCount ?? existingJoint?.noOfSupports ?? 1),
        pileTypeId:
          pileTypeId ||
          existingJoint?.pileTypeId ||
          draft.pileTypes[0]?.id ||
          MULTI_PILE_UNASSIGNED_PILE_TYPE_ID,
        active:
          activeValue.kind === 'boolean' ? activeValue.value : (existingJoint?.active ?? true),
        order: jointOrderById.get(jointId) ?? jointsById.size,
      },
      {
        fallbackId: jointId,
        order: jointOrderById.get(jointId) ?? jointsById.size,
        defaultPileTypeId: draft.pileTypes[0]?.id ?? MULTI_PILE_UNASSIGNED_PILE_TYPE_ID,
        pileTypeIds: [
          MULTI_PILE_UNASSIGNED_PILE_TYPE_ID,
          ...draft.pileTypes.map((pileType) => pileType.id),
        ],
      },
    );

    if (isNewJoint) {
      jointsById.set(jointId, nextJoint);
      jointOrderById.set(jointId, nextJoint.order);
      insertedJointIds.add(jointId);
    } else if (!jointEquals(existingJoint, nextJoint)) {
      jointsById.set(jointId, nextJoint);
      updatedJointIds.add(jointId);
    }

    const rowKey = jointLoadRowKey(jointId, matchedLoadCase.id);
    const beforeLoadState = snapshotLoadState(
      loadRowsByKey,
      blankFieldsByRowKey,
      authoredZeroRowsByKey,
      rowKey,
    );
    const nextLoadRow = {
      ...(loadRowsByKey.get(rowKey) ?? emptyJointLoadRow(jointId, matchedLoadCase.id)),
    };
    const nextBlankFields = { ...(blankFieldsByRowKey[rowKey] ?? {}) };

    numericColumns.forEach(([, field]) => {
      const parsed = parsedLoadValues[field];
      if (parsed.kind === 'blank') {
        nextLoadRow[field] = 0;
        nextBlankFields[field] = true;
        return;
      }
      if (parsed.kind !== 'number') {
        return;
      }

      nextLoadRow[field] = parsed.value;
      delete nextBlankFields[field];
    });

    if (Object.keys(nextBlankFields).length > 0) {
      blankFieldsByRowKey[rowKey] = nextBlankFields;
    } else {
      delete blankFieldsByRowKey[rowKey];
    }

    if (jointLoadRowIsEntirelyBlank(nextBlankFields)) {
      loadRowsByKey.delete(rowKey);
      delete authoredZeroRowsByKey[rowKey];
    } else if (isZeroJointLoadRow(nextLoadRow)) {
      loadRowsByKey.delete(rowKey);
      authoredZeroRowsByKey[rowKey] = true;
    } else {
      loadRowsByKey.set(rowKey, nextLoadRow);
      delete authoredZeroRowsByKey[rowKey];
    }

    const afterLoadState = snapshotLoadState(
      loadRowsByKey,
      blankFieldsByRowKey,
      authoredZeroRowsByKey,
      rowKey,
    );
    if (!loadStateEquals(beforeLoadState, afterLoadState)) {
      if (beforeLoadState.row || beforeLoadState.blankFields || beforeLoadState.authoredZeroRow) {
        updatedLoadRowKeys.add(rowKey);
      } else {
        insertedLoadRowKeys.add(rowKey);
      }
    }
  });

  const nextState = setJointLoadAuthoringUiState(
    {
      ...draft,
      joints: Array.from(jointsById.values()).sort((left, right) => left.order - right.order),
      jointLoads: Array.from(loadRowsByKey.values()).sort((left, right) => {
        if (left.jointId !== right.jointId) {
          return left.jointId.localeCompare(right.jointId);
        }
        return left.patternId.localeCompare(right.patternId);
      }),
    },
    {
      blankFieldsByRowKey,
      authoredZeroRowsByKey,
    },
  );

  const totalRows = dataRows.length;
  const skippedRowCount = Array.from(skips.values()).reduce((sum, entry) => sum + entry.count, 0);
  const summary: JointLoadImportSummary = {
    totalRows,
    appliedRowCount: totalRows - skippedRowCount,
    skippedRowCount,
    insertedJointCount: insertedJointIds.size,
    updatedJointCount: updatedJointIds.size,
    insertedLoadRowCount: insertedLoadRowKeys.size,
    updatedLoadRowCount: updatedLoadRowKeys.size,
    warningMessages: formatSkipMessages(skips),
  };

  return { nextState, summary };
}

export function buildJointLoadImportWorkbookData({
  draft,
  projectLoadCases,
}: {
  draft: MultiPileState;
  projectLoadCases: ProjectLoadCase[];
}): JointLoadImportWorkbookData {
  const templateRows: Array<Array<string | number>> = [[...MULTI_PILE_JOINT_LOAD_IMPORT_COLUMNS]];
  const importReference = buildJointLoadImportReferenceData({ draft, projectLoadCases });

  const referenceRows: Array<Array<string | number>> = [
    ['Reference'],
    ['What goes in `loadCase`? Use one of the canonical tokens below. Also accepted aliases are listed where applicable.'],
    ['What goes in `pileType`? Use one of the exact pile type codes below.'],
    ['Are zeros allowed? Yes. Enter 0 to keep zero. Leave blank to keep blank / unassigned.'],
    ['How do repeated rows work? One row = one joint + one load case. Repeat the same joint fields across each loadCase row for the same joint.'],
    ['Descriptive text like `Permanent` is not accepted unless your project explicitly lists it as an alias below.'],
    [],
    ['Accepted pile type codes'],
    ['pileType', 'UI label', 'Active'],
    ...importReference.pileTypes.map((pileType) => [
      pileType.id,
      pileType.uiLabel,
      pileType.active ? 'Yes' : 'No',
    ]),
    [],
    ['Enabled loadCase values you can use on this tab'],
    ['canonical loadCase', 'also accepts', 'Type', 'Direction'],
    ...importReference.enabledLoadCases.map((loadCase) => [
      loadCase.canonicalToken,
      formatAcceptedAliasCell(loadCase.aliasTokens),
      loadCase.type,
      loadCase.reversible ? 'Reversible' : 'One-way',
    ]),
  ];

  if (importReference.disabledLoadCases.length > 0) {
    referenceRows.push(
      [],
      ['Recognized but currently disabled loadCase values'],
      ['canonical loadCase', 'also accepts', 'Type', 'Import status'],
      ...importReference.disabledLoadCases.map((loadCase) => [
        loadCase.canonicalToken,
        formatAcceptedAliasCell(loadCase.aliasTokens),
        loadCase.type,
        'Recognized, but skipped while disabled',
      ]),
    );
  }

  const sampleRows: Array<Array<string | number>> = [
    ['Examples only'],
    [
      'One row = one joint + one load case.',
    ],
    [
      'Repeat the same jointId/jointLabel/x/y/z/supports/pileType/active across multiple loadCase rows for the same joint.',
    ],
    ['loadCase must match one of the accepted import values shown in Reference.'],
    ['pileType must match one of the accepted pile type codes.'],
    ['Blank = blank. Zero = zero.'],
    ['Use the clean `Joint Load Import` sheet for your actual upload.'],
    [],
    [...MULTI_PILE_JOINT_LOAD_IMPORT_COLUMNS],
    ...importReference.sampleCsvRows,
  ];

  return {
    templateRows,
    sampleRows,
    referenceRows,
    templateColumnWidths: [12, 20, 10, 10, 10, 10, 14, 10, 14, 10, 10, 10, 10, 10, 10],
    sampleColumnWidths: [14, 20, 10, 10, 10, 10, 14, 10, 14, 10, 10, 10, 10, 10, 10],
    referenceColumnWidths: [24, 36, 18, 18],
  };
}

export function buildJointLoadImportReferenceData({
  draft,
  projectLoadCases,
}: {
  draft: MultiPileState;
  projectLoadCases: ProjectLoadCase[];
}): JointLoadImportReferenceData {
  const pileTypes = draft.pileTypes
    .slice()
    .sort((left, right) => left.order - right.order)
    .map((pileType) => ({
      id: pileType.id,
      uiLabel: pileTypeSelectLabel(pileType),
      active: pileType.active,
    }));
  const loadPatternById = new Map(draft.loadPatterns.map((pattern) => [pattern.id, pattern]));
  const loadCases = projectLoadCases
    .slice()
    .sort((left, right) => left.order - right.order)
    .map((loadCase) => {
      const calculatorPattern = loadPatternById.get(loadCase.id);
      const canonicalToken = firstImportToken(
        loadCase.id,
        calculatorPattern?.id,
        loadCase.name,
        calculatorPattern?.displayName,
      ) || loadCase.id;
      const acceptedTokens = uniqueImportTokens([
        canonicalToken,
        ...collectLoadCaseAliasTokens(loadCase, calculatorPattern?.displayName),
      ]);

      return {
        loadCaseId: loadCase.id,
        canonicalToken,
        acceptedTokens,
        aliasTokens: acceptedTokens.filter(
          (token) => normalizeLookupToken(token) !== normalizeLookupToken(canonicalToken),
        ),
        enabled: loadCase.enabled,
        name: loadCase.name,
        type: loadCase.type,
        reversible: loadCase.reversible,
      };
    });
  const enabledLoadCases = loadCases.filter((loadCase) => loadCase.enabled);
  const disabledLoadCases = loadCases.filter((loadCase) => !loadCase.enabled);
  const sampleCsvRows = buildJointLoadImportSampleRows({ pileTypes, enabledLoadCases });

  return {
    pileTypes,
    loadCases,
    enabledLoadCases,
    disabledLoadCases,
    sampleCsvRows,
    sampleCsv: [
      serializeCsvRow(MULTI_PILE_JOINT_LOAD_IMPORT_COLUMNS),
      ...sampleCsvRows.map((row) => serializeCsvRow(row)),
    ].join('\n'),
  };
}

function resolveImportColumnIndexes(headerRow: unknown[]): JointLoadImportColumnIndexes {
  const normalizedHeaders = headerRow.map((value) => normalizeLookupToken(readCellText(value)));
  const entries = MULTI_PILE_JOINT_LOAD_IMPORT_COLUMNS.map((columnKey) => {
    const aliases = new Set(HEADER_ALIASES[columnKey].map((alias) => normalizeLookupToken(alias)));
    const index = normalizedHeaders.findIndex((header) => aliases.has(header));
    return [columnKey, index] as const;
  });

  const missingColumns = entries.filter(([, index]) => index < 0).map(([columnKey]) => columnKey);

  if (missingColumns.length > 0) {
    throw new Error(`Missing required import columns: ${missingColumns.join(', ')}`);
  }

  return Object.fromEntries(entries) as JointLoadImportColumnIndexes;
}

function rowIsBlank(row: unknown[]) {
  return row.every((cell) => !readCellText(cell));
}

function readStringCell(row: unknown[], index: number) {
  return readCellText(row[index]);
}

function readCellText(value: unknown) {
  return String(value ?? '').trim();
}

function parseNumberCell(value: unknown): NumberParseResult {
  if (value == null) {
    return { kind: 'blank' };
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? { kind: 'number', value } : { kind: 'invalid' };
  }

  const text = readCellText(value);
  if (!text) {
    return { kind: 'blank' };
  }

  const numeric = Number(text);
  return Number.isFinite(numeric) ? { kind: 'number', value: numeric } : { kind: 'invalid' };
}

function parseBooleanCell(value: unknown): BooleanParseResult {
  if (value == null) {
    return { kind: 'blank' };
  }
  if (typeof value === 'boolean') {
    return { kind: 'boolean', value };
  }
  if (typeof value === 'number') {
    if (value === 1) return { kind: 'boolean', value: true };
    if (value === 0) return { kind: 'boolean', value: false };
  }

  const token = normalizeLookupToken(readCellText(value));
  if (!token) {
    return { kind: 'blank' };
  }
  if (['true', 'yes', 'y', '1', 'active'].includes(token)) {
    return { kind: 'boolean', value: true };
  }
  if (['false', 'no', 'n', '0', 'inactive'].includes(token)) {
    return { kind: 'boolean', value: false };
  }

  return { kind: 'invalid' };
}

function normalizeLookupToken(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function buildPileTypeLookup(draft: MultiPileState) {
  const lookup = new Map<string, string>();

  draft.pileTypes.forEach((pileType) => {
    addLookupToken(lookup, pileType.id, pileType.id);
    addLookupToken(lookup, pileType.displayName, pileType.id);
    addLookupToken(lookup, pileTypeSelectLabel(pileType), pileType.id);
  });

  addLookupToken(lookup, MULTI_PILE_UNASSIGNED_PILE_TYPE_ID, MULTI_PILE_UNASSIGNED_PILE_TYPE_ID);
  addLookupToken(
    lookup,
    `${MULTI_PILE_UNASSIGNED_PILE_TYPE_ID} — Needs assignment`,
    MULTI_PILE_UNASSIGNED_PILE_TYPE_ID,
  );

  return lookup;
}

function buildLoadCaseLookup({
  draft,
  projectLoadCases,
}: {
  draft: MultiPileState;
  projectLoadCases: ProjectLoadCase[];
}) {
  const lookup = new Map<string, ProjectLoadCase>();
  const loadCaseById = new Map(projectLoadCases.map((loadCase) => [loadCase.id, loadCase]));
  const importReference = buildJointLoadImportReferenceData({ draft, projectLoadCases });

  importReference.loadCases.forEach((loadCaseReference) => {
    const loadCase = loadCaseById.get(loadCaseReference.loadCaseId);
    if (!loadCase) {
      return;
    }

    loadCaseReference.acceptedTokens.forEach((token) => {
      addLookupToken(lookup, token, loadCase);
    });
  });

  return lookup;
}

function buildJointLoadImportSampleRows({
  pileTypes,
  enabledLoadCases,
}: {
  pileTypes: JointLoadImportPileTypeReference[];
  enabledLoadCases: JointLoadImportLoadCaseReference[];
}) {
  const primaryPileType = pileTypes[0]?.id ?? 'BP1';
  const secondaryPileType = pileTypes[1]?.id ?? primaryPileType;
  const primaryLoadCase = enabledLoadCases[0]?.canonicalToken ?? 'G';
  const secondaryLoadCase = enabledLoadCases[1]?.canonicalToken ?? primaryLoadCase;

  return [
    [
      'J_SAMPLE_1',
      'Sample Joint 1',
      0,
      0,
      0,
      1,
      primaryPileType,
      'TRUE',
      primaryLoadCase,
      0,
      0,
      0,
      0,
      0,
      0,
    ],
    [
      'J_SAMPLE_1',
      'Sample Joint 1',
      0,
      0,
      0,
      1,
      primaryPileType,
      'TRUE',
      secondaryLoadCase,
      0,
      0,
      0,
      0,
      0,
      0,
    ],
    [
      'J_SAMPLE_2',
      'Sample Joint 2',
      12,
      4,
      0,
      2,
      secondaryPileType,
      'TRUE',
      primaryLoadCase,
      0,
      0,
      0,
      0,
      0,
      0,
    ],
  ];
}

function collectLoadCaseAliasTokens(
  loadCase: ProjectLoadCase,
  calculatorPatternDisplayName?: string,
) {
  return uniqueImportTokens([
    ...readMetadataImportTokens(loadCase.metadata),
    ...collectVisibleCodeAliases(loadCase, calculatorPatternDisplayName),
  ]);
}

function collectVisibleCodeAliases(
  loadCase: ProjectLoadCase,
  calculatorPatternDisplayName?: string,
) {
  const aliases = uniqueImportTokens([
    maybeCodeAlias(loadCase.name, loadCase.id),
    maybeCodeAlias(calculatorPatternDisplayName, loadCase.id),
  ]);
  const duplicatedVisibleToken = buildDuplicatedVisibleCodeAlias(loadCase);

  return duplicatedVisibleToken
    ? uniqueImportTokens([...aliases, duplicatedVisibleToken])
    : aliases;
}

function maybeCodeAlias(value: string | undefined, canonicalToken: string) {
  const token = String(value ?? '').trim();
  if (!token) {
    return '';
  }
  if (!isCompactImportCode(token)) {
    return '';
  }
  if (normalizeLookupToken(token) === normalizeLookupToken(canonicalToken)) {
    return '';
  }
  return token;
}

function buildDuplicatedVisibleCodeAlias(loadCase: ProjectLoadCase) {
  const primaryVisibleToken = String(loadCase.name ?? '').trim();
  const secondaryVisibleToken = String(loadCase.id ?? '').trim();
  if (!primaryVisibleToken || !secondaryVisibleToken) {
    return '';
  }
  if (!isCompactImportCode(primaryVisibleToken) || !isCompactImportCode(secondaryVisibleToken)) {
    return '';
  }
  if (normalizeLookupToken(primaryVisibleToken) !== normalizeLookupToken(secondaryVisibleToken)) {
    return '';
  }
  return `${primaryVisibleToken}${secondaryVisibleToken}`;
}

function readMetadataImportTokens(metadata: ProjectLoadCase['metadata']) {
  const record =
    metadata && typeof metadata === 'object' && !Array.isArray(metadata)
      ? metadata
      : {};

  return uniqueImportTokens([
    ...stringArrayValue(record.importAliases),
    ...stringArrayValue(record.acceptedImportTokens),
    ...stringArrayValue(record.aliases),
    ...stringArrayValue(record.acceptedTokens),
    ...stringArrayValue(record.codes),
  ]);
}

function stringArrayValue(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry ?? '').trim())
      .filter(Boolean);
  }

  const text = String(value ?? '').trim();
  return text ? [text] : [];
}

function uniqueImportTokens(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const tokens: string[] = [];

  values.forEach((value) => {
    const token = String(value ?? '').trim();
    const normalized = normalizeLookupToken(token);
    if (!normalized || seen.has(normalized)) {
      return;
    }
    seen.add(normalized);
    tokens.push(token);
  });

  return tokens;
}

function firstImportToken(...values: Array<string | null | undefined>) {
  return values.map((value) => String(value ?? '').trim()).find(Boolean) ?? '';
}

function isCompactImportCode(value: string) {
  return /^[A-Z][A-Z0-9_-]{0,7}$/.test(value.trim());
}

function formatAcceptedAliasCell(aliasTokens: string[]) {
  return aliasTokens.length > 0 ? aliasTokens.join(', ') : 'None';
}

function serializeCsvRow(values: readonly (string | number)[]) {
  return values.map((value) => escapeCsvCell(value)).join(',');
}

function escapeCsvCell(value: string | number) {
  const text = String(value);
  if (!/[",\n]/.test(text)) {
    return text;
  }
  return `"${text.replace(/"/g, '""')}"`;
}

function addLookupToken<T>(lookup: Map<string, T>, rawValue: string, resolvedValue: T) {
  const token = normalizeLookupToken(rawValue);
  if (!token) {
    return;
  }
  lookup.set(token, resolvedValue);
}

function jointEquals(left: MultiPileJoint, right: MultiPileJoint) {
  return (
    left.id === right.id &&
    jointDisplayLabel(left) === jointDisplayLabel(right) &&
    left.x === right.x &&
    left.y === right.y &&
    left.z === right.z &&
    left.supportCount === right.supportCount &&
    left.noOfSupports === right.noOfSupports &&
    left.pileTypeId === right.pileTypeId &&
    left.active === right.active &&
    left.order === right.order
  );
}

function snapshotLoadState(
  loadRowsByKey: Map<string, MultiPileJointLoadRow>,
  blankFieldsByRowKey: Record<string, Partial<Record<MultiPileJointLoadField, true>>>,
  authoredZeroRowsByKey: Record<string, true>,
  rowKey: string,
): LoadStateSnapshot {
  return {
    row: loadRowsByKey.get(rowKey) ?? null,
    blankFields: blankFieldsByRowKey[rowKey] ?? null,
    authoredZeroRow: Boolean(authoredZeroRowsByKey[rowKey]),
  };
}

function loadStateEquals(left: LoadStateSnapshot, right: LoadStateSnapshot) {
  return (
    jointLoadRowsEqual(left.row, right.row) &&
    blankFieldsEqual(left.blankFields, right.blankFields) &&
    left.authoredZeroRow === right.authoredZeroRow
  );
}

function jointLoadRowsEqual(
  left: MultiPileJointLoadRow | null,
  right: MultiPileJointLoadRow | null,
) {
  if (!left || !right) {
    return left === right;
  }

  return (
    left.jointId === right.jointId &&
    left.patternId === right.patternId &&
    MULTI_PILE_JOINT_LOAD_FIELDS.every((field) => left[field] === right[field])
  );
}

function blankFieldsEqual(
  left: Partial<Record<MultiPileJointLoadField, true>> | null,
  right: Partial<Record<MultiPileJointLoadField, true>> | null,
) {
  const leftKeys = MULTI_PILE_JOINT_LOAD_FIELDS.filter((field) => Boolean(left?.[field]));
  const rightKeys = MULTI_PILE_JOINT_LOAD_FIELDS.filter((field) => Boolean(right?.[field]));
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every((field, index) => field === rightKeys[index])
  );
}

function jointLoadRowIsEntirelyBlank(blankFields: Partial<Record<MultiPileJointLoadField, true>>) {
  return MULTI_PILE_JOINT_LOAD_FIELDS.every((field) => Boolean(blankFields[field]));
}

function addSkip(
  skips: JointLoadImportSkipTracker,
  reason: JointLoadImportSkipReason,
  example: string,
) {
  const current = skips.get(reason) ?? { count: 0, examples: [] };
  current.count += 1;
  if (current.examples.length < 5) {
    current.examples.push(example);
  }
  skips.set(reason, current);
}

function formatSkipMessages(skips: JointLoadImportSkipTracker) {
  return Array.from(skips.entries()).map(([reason, details]) => {
    const examplesSuffix =
      details.examples.length > 0 ? ` Examples: ${details.examples.join('; ')}` : '';
    return `${details.count} row(s) skipped for ${reason}.${examplesSuffix}`;
  });
}
