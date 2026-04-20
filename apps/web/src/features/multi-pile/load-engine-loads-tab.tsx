'use client';

import type { ChangeEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Copy, Download, FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import type {
  MultiPileEnvelopeRunSummary,
  MultiPileJointLoadRow,
  MultiPileState,
  ProjectLoadCase,
  ProjectLoadDefinition,
} from '@eng/shared';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import {
  applyJointLoadImportFromSheetRows,
  buildJointLoadImportReferenceData,
  buildJointLoadImportWorkbookData,
  MULTI_PILE_JOINT_LOAD_IMPORT_SHEET_NAME,
  MULTI_PILE_JOINT_LOAD_REFERENCE_SHEET_NAME,
  MULTI_PILE_JOINT_LOAD_SAMPLE_SHEET_NAME,
  MULTI_PILE_JOINT_LOAD_IMPORT_COLUMNS,
  type JointLoadImportSummary,
} from './joint-load-import';
import { JointAuthoringCard } from './joint-authoring-card';
import { MultiPileFieldFilter, MultiPileProjectLink, MultiPileStatCard } from './runtime-shell';
import {
  formatNumber,
  getJointLoadAuthoringUiState,
  MULTI_PILE_JOINT_LOAD_FIELDS,
  isJointLoadFieldBlank,
  materializeAutoAssignedPileTypes,
  nullableNumberFromInput,
  nullableNumberToInput,
  type MultiPileDraftUpdater,
} from './utils';

interface LoadEngineLoadsTabProps {
  draft: MultiPileState;
  latestRun: MultiPileEnvelopeRunSummary | null | undefined;
  projectLoadDefinition: ProjectLoadDefinition;
  projectLoadCasesHref: string;
  projectLoadCombinationsHref: string;
  preferredJointId?: string | null;
  preferredPileTypeId?: string | null;
  updateDraft: MultiPileDraftUpdater;
  addJoint: () => void;
  removeJoint: (jointId: string) => void;
  updateJointLoad: (
    jointId: string,
    patternId: string,
    field: keyof Omit<MultiPileJointLoadRow, 'jointId' | 'patternId'>,
    value: number | null,
  ) => void;
  getJointLoad: (jointId: string, patternId: string) => MultiPileJointLoadRow;
}

type MatrixRow = {
  key: string;
  pileTypeId: string;
  pileTypeLabel: string;
  jointId: string;
  jointLabel: string;
  jointActive: boolean;
  supportCount: number;
  loadCase: ProjectLoadCase;
  row: MultiPileJointLoadRow;
  hasAuthoredRow: boolean;
  hasVector: boolean;
};

const DEFAULT_ROW_LIMIT = '50';

export function LoadEngineLoadsTab({
  draft,
  latestRun,
  projectLoadDefinition,
  projectLoadCasesHref,
  projectLoadCombinationsHref,
  preferredJointId,
  preferredPileTypeId,
  updateDraft,
  addJoint,
  removeJoint,
  updateJointLoad,
  getJointLoad,
}: LoadEngineLoadsTabProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pileTypeFilter, setPileTypeFilter] = useState('all');
  const [jointFilter, setJointFilter] = useState('all');
  const [rowStateFilter, setRowStateFilter] = useState<'all' | 'assigned' | 'blank' | 'incomplete'>(
    'all',
  );
  const [searchText, setSearchText] = useState('');
  const [rowLimit, setRowLimit] = useState(DEFAULT_ROW_LIMIT);
  const [page, setPage] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [isCopyingSampleCsv, setIsCopyingSampleCsv] = useState(false);
  const [lastImportSummary, setLastImportSummary] = useState<JointLoadImportSummary | null>(null);
  const effectiveDraft = materializeAutoAssignedPileTypes(draft, latestRun);

  const projectLoadCases = projectLoadDefinition.loadCases
    .slice()
    .sort((left, right) => left.order - right.order);
  const jointLoadImportReference = buildJointLoadImportReferenceData({
    draft,
    projectLoadCases,
  });
  const activeProjectLoadCases = projectLoadCases.filter((loadCase) => loadCase.enabled);
  const projectLoadCombinations = projectLoadDefinition.loadCombinations
    .slice()
    .sort((left, right) => left.order - right.order);
  const builtInCombinationCount = projectLoadCombinations.filter(
    (row) => row.source === 'built-in',
  ).length;
  const customCombinationCount = projectLoadCombinations.filter(
    (row) => row.source === 'custom',
  ).length;
  const envelopeCombinationCount = projectLoadCombinations.filter(
    (row) => row.includeInEnvelope,
  ).length;
  const calculatorPatternById = new Map(draft.loadPatterns.map((pattern) => [pattern.id, pattern]));
  const jointLoadRowByKey = new Map<string, MultiPileJointLoadRow>(
    draft.jointLoads.map((row) => [`${row.jointId}::${row.patternId}`, row] as const),
  );
  const jointLoadAuthoringUiState = getJointLoadAuthoringUiState(draft);
  const pileTypeById = new Map(
    effectiveDraft.pileTypes.map((pileType) => [pileType.id, pileType.displayName || pileType.id]),
  );
  const minimumPermanentReductionNote = projectLoadDefinition.combinationSettings
    .reduceMinimumPermanentWithPointNine
    ? '0.9 reduction to minimum permanent factor enabled'
    : 'Minimum permanent factor applied directly';

  const matrixRows: MatrixRow[] = effectiveDraft.joints
    .slice()
    .sort((left, right) => left.order - right.order)
    .flatMap((joint) =>
      activeProjectLoadCases.map((loadCase) => {
        const rowKey = `${joint.id}::${loadCase.id}`;
        const row = jointLoadRowByKey.get(rowKey) ?? getJointLoad(joint.id, loadCase.id);
        const blankFields = jointLoadAuthoringUiState.blankFieldsByRowKey[rowKey] ?? {};
        const hasAuthoredRow =
          Boolean(jointLoadRowByKey.get(rowKey)) ||
          Boolean(jointLoadAuthoringUiState.authoredZeroRowsByKey[rowKey]);
        const pileTypeLabel =
          (pileTypeById.get(joint.pileTypeId) ?? joint.pileTypeId) || 'Unassigned';
        return {
          key: rowKey,
          pileTypeId: joint.pileTypeId || 'UNASSIGNED',
          pileTypeLabel,
          jointId: joint.id,
          jointLabel: joint.displayName || joint.jointDisplayName || joint.id,
          jointActive: joint.active,
          supportCount: Math.max(1, joint.supportCount || joint.noOfSupports || 1),
          loadCase,
          row,
          hasAuthoredRow,
          hasVector:
            hasAuthoredRow && MULTI_PILE_JOINT_LOAD_FIELDS.some((field) => !blankFields[field]),
        };
      }),
    );

  const authoredJointLoads = matrixRows.filter((row) => row.hasVector);
  const assignedActiveRows = matrixRows.filter((row) => row.hasVector && row.jointActive).length;
  const blankActiveRows = matrixRows.filter((row) => !row.hasVector && row.jointActive).length;
  const matrixScope = matrixRows.length;
  const activeMatrixScope =
    effectiveDraft.joints.filter((joint) => joint.active).length * activeProjectLoadCases.length;
  const activePileTypeIds = Array.from(
    new Set(
      effectiveDraft.joints
        .filter((joint) => joint.active)
        .map((joint) => joint.pileTypeId || 'UNASSIGNED'),
    ),
  );

  const filteredRows = matrixRows.filter((matrixRow) => {
    if (pileTypeFilter !== 'all' && matrixRow.pileTypeId !== pileTypeFilter) {
      return false;
    }
    if (jointFilter !== 'all' && matrixRow.jointId !== jointFilter) {
      return false;
    }
    if (rowStateFilter === 'assigned' && !matrixRow.hasVector) {
      return false;
    }
    if (rowStateFilter === 'blank' && matrixRow.hasVector) {
      return false;
    }
    if (rowStateFilter === 'incomplete' && (matrixRow.hasVector || !matrixRow.jointActive)) {
      return false;
    }

    if (!searchText.trim()) {
      return true;
    }

    const search = searchText.trim().toLowerCase();
    return [
      matrixRow.jointId,
      matrixRow.jointLabel,
      matrixRow.pileTypeId,
      matrixRow.pileTypeLabel,
      matrixRow.loadCase.id,
      matrixRow.loadCase.name,
      matrixRow.loadCase.type,
    ]
      .join(' ')
      .toLowerCase()
      .includes(search);
  });

  const numericRowLimit = Math.max(1, Number(rowLimit) || Number(DEFAULT_ROW_LIMIT));
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / numericRowLimit));
  const pagedRows = filteredRows.slice(page * numericRowLimit, (page + 1) * numericRowLimit);
  const loadLibraryMirrorAlignedCount = projectLoadCases.filter((loadCase) => {
    const calculatorPattern = calculatorPatternById.get(loadCase.id);
    if (!calculatorPattern) {
      return false;
    }

    return (
      calculatorPattern.displayName === loadCase.name &&
      calculatorPattern.patternType === loadCase.type &&
      calculatorPattern.reversible === loadCase.reversible &&
      calculatorPattern.enabled === loadCase.enabled
    );
  }).length;

  useEffect(() => {
    setPage(0);
  }, [jointFilter, pileTypeFilter, rowLimit, rowStateFilter, searchText]);

  useEffect(() => {
    if (page > totalPages - 1) {
      setPage(totalPages - 1);
    }
  }, [page, totalPages]);

  useEffect(() => {
    if (!preferredJointId) {
      return;
    }
    if (!draft.joints.some((joint) => joint.id === preferredJointId)) {
      return;
    }
    setJointFilter(preferredJointId);
    setRowStateFilter('all');
    setSearchText('');
    setPage(0);
  }, [draft.joints, preferredJointId]);

  useEffect(() => {
    if (!preferredPileTypeId) {
      return;
    }
    if (!draft.pileTypes.some((pileType) => pileType.id === preferredPileTypeId)) {
      return;
    }
    setPileTypeFilter(preferredPileTypeId);
    setPage(0);
  }, [draft.pileTypes, preferredPileTypeId]);

  async function handleImportFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    setIsImporting(true);
    try {
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const targetSheetName =
        workbook.SheetNames.find(
          (sheetName) => sheetName === MULTI_PILE_JOINT_LOAD_IMPORT_SHEET_NAME,
        ) ?? workbook.SheetNames[0];
      if (!targetSheetName) {
        throw new Error('The selected file does not contain any sheets.');
      }

      const worksheet = workbook.Sheets[targetSheetName];
      if (!worksheet) {
        throw new Error('The selected file could not be read.');
      }
      const sheetRows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
        header: 1,
        defval: null,
        raw: true,
      }) as unknown[][];

      const result = applyJointLoadImportFromSheetRows({
        draft,
        projectLoadCases,
        sheetRows,
      });
      updateDraft(() => result.nextState);
      const resolvedImportSummary = result.summary;

      setLastImportSummary(resolvedImportSummary);
      if (resolvedImportSummary.appliedRowCount === 0) {
        toast.error('No import rows were applied');
      } else if (resolvedImportSummary.skippedRowCount > 0) {
        toast.success(`Imported ${resolvedImportSummary.appliedRowCount} row(s) with warnings`);
      } else {
        toast.success(`Imported ${resolvedImportSummary.appliedRowCount} row(s)`);
      }
    } catch (error) {
      console.error('Joint load import failed', error);
      toast.error(error instanceof Error ? error.message : 'Failed to import joint loads');
    } finally {
      setIsImporting(false);
    }
  }

  async function handleDownloadTemplate() {
    setIsDownloadingTemplate(true);
    try {
      const XLSX = await import('xlsx');
      const workbook = XLSX.utils.book_new();
      const workbookData = buildJointLoadImportWorkbookData({
        draft,
        projectLoadCases,
      });
      const templateSheet = XLSX.utils.aoa_to_sheet(workbookData.templateRows);
      const sampleSheet = XLSX.utils.aoa_to_sheet(workbookData.sampleRows);
      const referenceSheet = XLSX.utils.aoa_to_sheet(workbookData.referenceRows);
      templateSheet['!cols'] = workbookData.templateColumnWidths.map((width) => ({ wch: width }));
      sampleSheet['!cols'] = workbookData.sampleColumnWidths.map((width) => ({ wch: width }));
      referenceSheet['!cols'] = workbookData.referenceColumnWidths.map((width) => ({ wch: width }));

      XLSX.utils.book_append_sheet(
        workbook,
        templateSheet,
        MULTI_PILE_JOINT_LOAD_IMPORT_SHEET_NAME,
      );
      XLSX.utils.book_append_sheet(workbook, sampleSheet, MULTI_PILE_JOINT_LOAD_SAMPLE_SHEET_NAME);
      XLSX.utils.book_append_sheet(
        workbook,
        referenceSheet,
        MULTI_PILE_JOINT_LOAD_REFERENCE_SHEET_NAME,
      );
      XLSX.writeFile(workbook, 'multi-pile-joint-load-template.xlsx', {
        bookType: 'xlsx',
        compression: true,
      });
      toast.success('Joint load import template downloaded');
    } catch (error) {
      console.error('Joint load template export failed', error);
      toast.error('Failed to download the joint load import template');
    } finally {
      setIsDownloadingTemplate(false);
    }
  }

  async function handleCopySampleCsv() {
    setIsCopyingSampleCsv(true);
    try {
      const copied = await copyTextToClipboard(jointLoadImportReference.sampleCsv);
      if (!copied) {
        throw new Error('Clipboard copy was blocked');
      }
      toast.success('Sample CSV copied');
    } catch (error) {
      console.error('Sample CSV copy failed', error);
      toast.error('Failed to copy the sample CSV');
    } finally {
      setIsCopyingSampleCsv(false);
    }
  }

  return (
    <div className="space-y-6">
      <JointAuthoringCard
        draft={draft}
        latestRun={latestRun}
        updateDraft={updateDraft}
        addJoint={addJoint}
        removeJoint={removeJoint}
      />

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <CardTitle className="text-base">Joint Load Matrix</CardTitle>
              <CardDescription>
                Compact joint-load matrix authoring for project load cases. Load cases and
                combinations stay managed on the Project page.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <MultiPileProjectLink href={projectLoadCasesHref}>
                Open Project Load Cases
              </MultiPileProjectLink>
              <MultiPileProjectLink href={projectLoadCombinationsHref}>
                Open Project Load Combinations
              </MultiPileProjectLink>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <MultiPileStatCard
              label="Project Load Cases"
              value={`${projectLoadCases.length}`}
              detail={`${activeProjectLoadCases.length} enabled patterns mirrored into Multi-Pile`}
              className="bg-muted/20 p-4"
            />
            <MultiPileStatCard
              label="Assigned Rows"
              value={`${assignedActiveRows}`}
              detail={`${authoredJointLoads.length} authored row(s) currently in enabled matrix scope`}
              className="bg-muted/20 p-4"
            />
            <MultiPileStatCard
              label="Blank Active Rows"
              value={`${blankActiveRows}`}
              detail={`${activeMatrixScope} active joint-pattern slots currently in scope`}
              className="bg-muted/20 p-4"
            />
            <MultiPileStatCard
              label="Active Joints"
              value={`${effectiveDraft.joints.filter((joint) => joint.active).length}`}
              detail={`${activePileTypeIds.length} active pile type filter option(s)`}
              className="bg-muted/20 p-4"
            />
            <MultiPileStatCard
              label="Load Library"
              value={`${projectLoadCombinations.length} combos`}
              detail={`${builtInCombinationCount} built-in · ${customCombinationCount} custom · ${envelopeCombinationCount} in envelope`}
              className="bg-muted/20 p-4"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <details className="rounded-lg border bg-muted/10 p-4">
            <summary className="cursor-pointer text-sm font-semibold">
              View project load library summary
            </summary>
            <div className="mt-4 space-y-4">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <MiniStat
                  label="Pattern mirror alignment"
                  value={`${loadLibraryMirrorAlignedCount}/${projectLoadCases.length}`}
                />
                <MiniStat
                  label="Project combinations"
                  value={`${projectLoadCombinations.length}`}
                />
                <MiniStat label="Envelope defaults" value={`${envelopeCombinationCount}`} />
                <MiniStat
                  label="Settings"
                  value={`alpha ${formatNumber(projectLoadDefinition.combinationSettings.alpha)}`}
                />
              </div>

              {projectLoadCases.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No project load cases are currently authored. Add them on the Project page before
                  assigning joint load rows here.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <Table className="text-xs">
                    <TableHeader className="[&_th]:bg-background">
                      <TableRow>
                        <TableHead>Load case</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Mirror</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projectLoadCases.map((loadCase) => {
                        const calculatorPattern = calculatorPatternById.get(loadCase.id);
                        const mirrorAligned = Boolean(
                          calculatorPattern &&
                          calculatorPattern.displayName === loadCase.name &&
                          calculatorPattern.patternType === loadCase.type &&
                          calculatorPattern.reversible === loadCase.reversible &&
                          calculatorPattern.enabled === loadCase.enabled,
                        );

                        return (
                          <TableRow key={loadCase.id}>
                            <TableCell className="py-2">
                              <div className="font-medium">{loadCase.name}</div>
                              <div className="text-xs text-muted-foreground">{loadCase.id}</div>
                            </TableCell>
                            <TableCell className="py-2">
                              <div className="font-medium">{loadCase.type}</div>
                              <div className="text-xs text-muted-foreground">
                                {loadCase.reversible ? 'Reversible' : 'One-way'}
                              </div>
                            </TableCell>
                            <TableCell className="py-2">
                              <Badge variant={loadCase.enabled ? 'success' : 'outline'}>
                                {loadCase.enabled ? 'Enabled' : 'Disabled'}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-2">
                              <div className="flex flex-wrap gap-2">
                                <Badge variant="outline">
                                  {calculatorPattern ? 'Mirrored' : 'Pending mirror'}
                                </Badge>
                                {calculatorPattern ? (
                                  <Badge variant={mirrorAligned ? 'success' : 'warning'}>
                                    {mirrorAligned ? 'Aligned' : 'Review'}
                                  </Badge>
                                ) : null}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              <p className="text-sm text-muted-foreground">
                Combination settings: alpha{' '}
                {formatNumber(projectLoadDefinition.combinationSettings.alpha)}, psiC{' '}
                {formatNumber(projectLoadDefinition.combinationSettings.psiC)}, psiE{' '}
                {formatNumber(projectLoadDefinition.combinationSettings.psiE)}, psiL{' '}
                {formatNumber(projectLoadDefinition.combinationSettings.psiL)}, groundwater factor{' '}
                {formatNumber(projectLoadDefinition.combinationSettings.groundwaterFactor)}, minimum
                permanent factor{' '}
                {formatNumber(projectLoadDefinition.combinationSettings.minPermanentFactor)}.{' '}
                {minimumPermanentReductionNote}.
              </p>
            </div>
          </details>

          <div className="rounded-lg border border-dashed bg-muted/10 p-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xls,.xlsx"
              className="hidden"
              onChange={handleImportFileChange}
            />

            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-1">
                <div className="text-sm font-semibold">Import Joints + Load Rows</div>
                <p className="text-sm text-muted-foreground">
                  Import flat Excel or CSV rows for multiple joints and their project load cases.
                  The import upserts by `jointId` and `jointId + loadCase`, skips unknown or
                  disabled references, and leaves unrelated state untouched.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting || isDownloadingTemplate}
                >
                  {isImporting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Import
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownloadTemplate}
                  disabled={isImporting || isDownloadingTemplate}
                >
                  {isDownloadingTemplate ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Download Template
                </Button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <FileSpreadsheet className="h-4 w-4" />
              <span>Accepted formats: `.xlsx`, `.xls`, `.csv`</span>
              <span>Template columns: {MULTI_PILE_JOINT_LOAD_IMPORT_COLUMNS.join(', ')}</span>
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <div className="rounded-lg border bg-background/70 p-4">
                <div className="text-sm font-semibold">Exact values to use</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Use these exact `pileType` and `loadCase` tokens in your file. Descriptive text
                  like `Permanent` is not accepted unless it is listed below as an alias for this
                  project.
                </p>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className="space-y-2">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Pile types you can use
                    </div>
                    {jointLoadImportReference.pileTypes.length > 0 ? (
                      <div className="space-y-2">
                        {jointLoadImportReference.pileTypes.map((pileType) => (
                          <div
                            key={pileType.id}
                            className="rounded-md border bg-muted/20 px-3 py-2"
                          >
                            <code className="text-sm font-semibold">{pileType.id}</code>
                            {pileType.uiLabel !== pileType.id ? (
                              <div className="text-xs text-muted-foreground">
                                {pileType.uiLabel}
                              </div>
                            ) : null}
                            {!pileType.active ? (
                              <div className="text-xs text-muted-foreground">
                                Currently inactive, but still recognized by import.
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No pile types are currently available.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Load cases you can use now
                    </div>
                    {jointLoadImportReference.enabledLoadCases.length > 0 ? (
                      <div className="space-y-2">
                        {jointLoadImportReference.enabledLoadCases.map((loadCase) => (
                          <div
                            key={loadCase.loadCaseId}
                            className="rounded-md border bg-muted/20 px-3 py-2"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <code className="text-sm font-semibold">
                                {loadCase.canonicalToken}
                              </code>
                              <span className="text-xs text-muted-foreground">{loadCase.type}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {loadCase.aliasTokens.length > 0
                                ? `Also accepts: ${loadCase.aliasTokens.join(', ')}`
                                : 'No additional aliases are currently exposed for this load case.'}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No enabled project load cases are currently available for import on this
                        tab.
                      </p>
                    )}

                    {jointLoadImportReference.disabledLoadCases.length > 0 ? (
                      <div className="rounded-md border border-dashed bg-muted/10 px-3 py-2">
                        <div className="text-xs font-semibold text-foreground">
                          Recognized but currently disabled
                        </div>
                        <div className="mt-1 space-y-1 text-xs text-muted-foreground">
                          {jointLoadImportReference.disabledLoadCases.map((loadCase) => (
                            <div key={loadCase.loadCaseId}>
                              <code className="font-semibold">{loadCase.canonicalToken}</code>
                              {loadCase.aliasTokens.length > 0
                                ? ` also accepts ${loadCase.aliasTokens.join(', ')}`
                                : ''}
                              {' · '}
                              import will skip this while the project load case stays disabled.
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border bg-background/70 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-sm font-semibold">Copy sample CSV</div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Example only. One row = one joint + one load case, repeated rows reuse the
                      same joint fields, and explicit zeros stay as zero.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopySampleCsv}
                    disabled={isCopyingSampleCsv}
                  >
                    {isCopyingSampleCsv ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Copy className="mr-2 h-4 w-4" />
                    )}
                    Copy sample CSV
                  </Button>
                </div>

                <pre className="mt-4 max-h-72 overflow-auto rounded-md border bg-muted/20 p-3 text-xs leading-5">
                  {jointLoadImportReference.sampleCsv}
                </pre>
              </div>
            </div>

            {lastImportSummary ? (
              <Alert
                variant={lastImportSummary.skippedRowCount > 0 ? 'warning' : 'success'}
                className="mt-4"
              >
                <AlertTitle>Last import summary</AlertTitle>
                <AlertDescription className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">
                      Applied {lastImportSummary.appliedRowCount}/{lastImportSummary.totalRows}{' '}
                      row(s)
                    </Badge>
                    <Badge variant="outline">
                      Skipped {lastImportSummary.skippedRowCount} row(s)
                    </Badge>
                    <Badge variant="outline">
                      Joints +{lastImportSummary.insertedJointCount} inserted /{' '}
                      {lastImportSummary.updatedJointCount} updated
                    </Badge>
                    <Badge variant="outline">
                      Load rows +{lastImportSummary.insertedLoadRowCount} inserted /{' '}
                      {lastImportSummary.updatedLoadRowCount} updated
                    </Badge>
                  </div>

                  {lastImportSummary.warningMessages.length > 0 ? (
                    <div className="space-y-1">
                      {lastImportSummary.warningMessages.map((message) => (
                        <p key={message} className="text-sm">
                          {message}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm">
                      All import rows matched the current pile types and enabled project load cases.
                    </p>
                  )}
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Compact Joint Load Matrix</CardTitle>
          <CardDescription>
            Filter by pile type, joint, or row state, then page through the joint-pattern matrix
            instead of expanding every pile and pattern as separate cards.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="sticky top-16 z-10 -mx-6 border-y bg-background/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <MultiPileFieldFilter label="Pile type">
                <Select value={pileTypeFilter} onValueChange={setPileTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All pile types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All pile types</SelectItem>
                    {draft.pileTypes
                      .slice()
                      .sort((left, right) => left.order - right.order)
                      .map((pileType) => (
                        <SelectItem key={pileType.id} value={pileType.id}>
                          {pileType.displayName || pileType.id}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </MultiPileFieldFilter>

              <MultiPileFieldFilter label="Joint">
                <Select value={jointFilter} onValueChange={setJointFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All joints" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All joints</SelectItem>
                    {draft.joints
                      .slice()
                      .sort((left, right) => left.order - right.order)
                      .map((joint) => (
                        <SelectItem key={joint.id} value={joint.id}>
                          {joint.displayName || joint.jointDisplayName || joint.id}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </MultiPileFieldFilter>

              <MultiPileFieldFilter label="Row state">
                <Select
                  value={rowStateFilter}
                  onValueChange={(value) => setRowStateFilter(value as typeof rowStateFilter)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All rows" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All rows</SelectItem>
                    <SelectItem value="assigned">Assigned only</SelectItem>
                    <SelectItem value="blank">Blank only</SelectItem>
                    <SelectItem value="incomplete">Incomplete active only</SelectItem>
                  </SelectContent>
                </Select>
              </MultiPileFieldFilter>

              <MultiPileFieldFilter label="Search">
                <Input
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Type, joint, load case"
                />
              </MultiPileFieldFilter>

              <MultiPileFieldFilter label="Rows per page">
                <Select value={rowLimit} onValueChange={setRowLimit}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['25', '50', '100', '250'].map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </MultiPileFieldFilter>

              <div className="flex items-end justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(0)}
                  disabled={page === 0}
                >
                  First page
                </Button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">
                Showing {pagedRows.length} of {filteredRows.length} filtered rows
              </Badge>
              <Badge variant="outline">Matrix scope {matrixScope} rows</Badge>
              <Badge variant="outline">Active scope {activeMatrixScope} rows</Badge>
              <Badge variant="outline">Sign convention +P compression / -P uplift</Badge>
            </div>
          </div>

          {projectLoadCases.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No project load cases are available yet. Use the Project Load Cases page to create the
              source library first.
            </p>
          ) : activeProjectLoadCases.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No enabled project load cases are currently in matrix scope. Enable at least one load
              case on the Project Load Cases page to author joint loads here.
            </p>
          ) : draft.joints.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No calculator joints exist yet. Add a joint above before assigning project patterns
              here.
            </p>
          ) : filteredRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No matrix rows match the current filters.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border">
                <Table className="text-xs">
                  <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-background">
                    <TableRow>
                      <TableHead className="w-[15rem]">Joint / pile type</TableHead>
                      <TableHead className="w-[12rem]">Project pattern</TableHead>
                      <TableHead className="w-[11rem]">Status</TableHead>
                      <TableHead className="w-24">P</TableHead>
                      <TableHead className="w-24">Vx</TableHead>
                      <TableHead className="w-24">Vy</TableHead>
                      <TableHead className="w-24">Mx</TableHead>
                      <TableHead className="w-24">My</TableHead>
                      <TableHead className="w-24">Mz</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedRows.map((matrixRow) => (
                      <TableRow
                        key={matrixRow.key}
                        className={matrixRow.hasVector ? 'bg-emerald-50/40' : undefined}
                      >
                        <TableCell className="py-2 align-top">
                          <div className="font-medium">{matrixRow.jointLabel}</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {matrixRow.jointId} · {matrixRow.pileTypeLabel}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Badge variant={matrixRow.jointActive ? 'success' : 'outline'}>
                              {matrixRow.jointActive ? 'Active joint' : 'Inactive joint'}
                            </Badge>
                            <Badge variant="outline">
                              {matrixRow.supportCount} support
                              {matrixRow.supportCount === 1 ? '' : 's'}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="py-2 align-top">
                          <div className="font-medium">{matrixRow.loadCase.name}</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {matrixRow.loadCase.id} · {matrixRow.loadCase.type}
                          </div>
                          <div className="mt-2 text-xs text-muted-foreground">
                            {matrixRow.loadCase.reversible ? 'Reversible' : 'One-way'}
                          </div>
                        </TableCell>
                        <TableCell className="py-2 align-top">
                          <div className="flex flex-wrap gap-2">
                            <Badge variant={matrixRow.hasVector ? 'success' : 'outline'}>
                              {matrixRow.hasVector ? 'Assigned' : 'Blank'}
                            </Badge>
                          </div>
                          {!matrixRow.hasVector && matrixRow.jointActive ? (
                            <div className="mt-2 text-xs text-amber-700">
                              Active matrix row still incomplete
                            </div>
                          ) : null}
                        </TableCell>
                        <EditableCell
                          value={
                            !matrixRow.hasAuthoredRow ||
                            isJointLoadFieldBlank(
                              draft,
                              matrixRow.jointId,
                              matrixRow.loadCase.id,
                              'p',
                            )
                              ? null
                              : matrixRow.row.p
                          }
                          onChange={(value) =>
                            updateJointLoad(matrixRow.jointId, matrixRow.loadCase.id, 'p', value)
                          }
                        />
                        <EditableCell
                          value={
                            !matrixRow.hasAuthoredRow ||
                            isJointLoadFieldBlank(
                              draft,
                              matrixRow.jointId,
                              matrixRow.loadCase.id,
                              'vx',
                            )
                              ? null
                              : matrixRow.row.vx
                          }
                          onChange={(value) =>
                            updateJointLoad(matrixRow.jointId, matrixRow.loadCase.id, 'vx', value)
                          }
                        />
                        <EditableCell
                          value={
                            !matrixRow.hasAuthoredRow ||
                            isJointLoadFieldBlank(
                              draft,
                              matrixRow.jointId,
                              matrixRow.loadCase.id,
                              'vy',
                            )
                              ? null
                              : matrixRow.row.vy
                          }
                          onChange={(value) =>
                            updateJointLoad(matrixRow.jointId, matrixRow.loadCase.id, 'vy', value)
                          }
                        />
                        <EditableCell
                          value={
                            !matrixRow.hasAuthoredRow ||
                            isJointLoadFieldBlank(
                              draft,
                              matrixRow.jointId,
                              matrixRow.loadCase.id,
                              'mx',
                            )
                              ? null
                              : matrixRow.row.mx
                          }
                          onChange={(value) =>
                            updateJointLoad(matrixRow.jointId, matrixRow.loadCase.id, 'mx', value)
                          }
                        />
                        <EditableCell
                          value={
                            !matrixRow.hasAuthoredRow ||
                            isJointLoadFieldBlank(
                              draft,
                              matrixRow.jointId,
                              matrixRow.loadCase.id,
                              'my',
                            )
                              ? null
                              : matrixRow.row.my
                          }
                          onChange={(value) =>
                            updateJointLoad(matrixRow.jointId, matrixRow.loadCase.id, 'my', value)
                          }
                        />
                        <EditableCell
                          value={
                            !matrixRow.hasAuthoredRow ||
                            isJointLoadFieldBlank(
                              draft,
                              matrixRow.jointId,
                              matrixRow.loadCase.id,
                              'mz',
                            )
                              ? null
                              : matrixRow.row.mz
                          }
                          onChange={(value) =>
                            updateJointLoad(matrixRow.jointId, matrixRow.loadCase.id, 'mz', value)
                          }
                        />
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Page {page + 1} of {totalPages}. Downstream Envelope, GEO, and STRUCT workflows
                  consume this authored matrix without owning the project load library.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((current) => Math.max(0, current - 1))}
                    disabled={page === 0}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
                    disabled={page >= totalPages - 1}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EditableCell({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <TableCell className="py-2">
      <Input
        className="h-8 min-w-20 px-2 text-xs"
        type="number"
        step="any"
        value={nullableNumberToInput(value)}
        onChange={(event) => onChange(nullableNumberFromInput(event.target.value))}
      />
    </TableCell>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold">{value}</div>
    </div>
  );
}

async function copyTextToClipboard(text: string) {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the legacy copy path below.
  }

  if (typeof document === 'undefined') {
    return false;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();

  let copied = false;
  try {
    copied = document.execCommand('copy');
  } finally {
    document.body.removeChild(textarea);
  }

  return copied;
}
