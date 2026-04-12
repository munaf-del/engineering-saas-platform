'use client';

import { useEffect, useState } from 'react';
import {
  buildMultiPileEnvelopeInputSignature,
  type MultiPileEnvelopeRunSummary,
  type MultiPileEnvelopeValue,
  type MultiPileState,
  type ProjectLoadCombination,
  type ProjectLoadDefinition,
} from '@eng/shared';
import { Badge, type BadgeProps } from '@/components/ui/badge';
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
import { MultiPileFieldFilter, MultiPileProjectLink, MultiPileStatCard } from './runtime-shell';
import { EnvelopeResultsTab } from './envelope-results-tab';
import { formatNumber, formatTimestamp, statusBadgeVariant } from './utils';

interface CombinationsEnvelopeTabProps {
  draft: MultiPileState;
  latestRun: MultiPileEnvelopeRunSummary | null | undefined;
  projectLoadDefinition: ProjectLoadDefinition;
  projectLoadCombinationsHref: string;
  onToggleSelectedCombination: (combinationId: string) => void;
  onApplySelectedCombinations: (combinationIds: string[]) => void;
  onRunEnvelope: () => void;
  isDirty: boolean;
  isRunning: boolean;
}

interface GoverningEnvelopeMetric {
  key: 'nMax' | 'nMin' | 'vx' | 'vy' | 'mx' | 'my';
  label: string;
  value: MultiPileEnvelopeValue;
  jointLabel: string;
  pileTypeId: string;
  representativePileId: string;
  activePatternIds: string[];
}

const DEFAULT_ROW_LIMIT = '25';

export function CombinationsEnvelopeTab({
  draft,
  latestRun,
  projectLoadDefinition,
  projectLoadCombinationsHref,
  onToggleSelectedCombination,
  onApplySelectedCombinations,
  onRunEnvelope,
  isDirty,
  isRunning,
}: CombinationsEnvelopeTabProps) {
  const [searchText, setSearchText] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'built-in' | 'custom'>('all');
  const [selectionFilter, setSelectionFilter] = useState<
    'all' | 'selected' | 'project-default' | 'enabled'
  >('all');
  const [rowLimit, setRowLimit] = useState(DEFAULT_ROW_LIMIT);
  const [page, setPage] = useState(0);
  const [selectedCombinationId, setSelectedCombinationId] = useState('');

  const projectLoadCombinations = projectLoadDefinition.loadCombinations
    .slice()
    .sort((left, right) => left.order - right.order);
  const selectedCombinationIds = new Set(
    draft.selectedCombinations.filter((id) =>
      projectLoadCombinations.some((combination) => combination.id === id),
    ),
  );
  const enabledProjectCombinations = projectLoadCombinations.filter(
    (combination) => combination.enabled,
  );
  const builtInCount = projectLoadCombinations.filter(
    (combination) => combination.source === 'built-in',
  ).length;
  const customCount = projectLoadCombinations.filter(
    (combination) => combination.source === 'custom',
  ).length;
  const projectDefaultCount = projectLoadCombinations.filter(
    (combination) => combination.includeInEnvelope,
  ).length;
  const effectiveSelectedCombinationCount = enabledProjectCombinations.filter((combination) =>
    selectedCombinationIds.has(combination.id),
  ).length;
  const currentInputSignature = buildMultiPileEnvelopeInputSignature(draft);
  const envelopeContext = readEnvelopeContext(draft.uiState);
  const envelopeStatus = deriveEnvelopeStatus({
    latestRun,
    currentInputSignature,
    lastRunInputSignature: envelopeContext.lastRunInputSignature,
    isDirty,
  });
  const projectWideEnvelope = deriveProjectWideEnvelope(latestRun);

  const filteredCombinations = projectLoadCombinations.filter((combination) => {
    if (sourceFilter !== 'all' && combination.source !== sourceFilter) {
      return false;
    }
    if (selectionFilter === 'selected' && !selectedCombinationIds.has(combination.id)) {
      return false;
    }
    if (selectionFilter === 'project-default' && !combination.includeInEnvelope) {
      return false;
    }
    if (selectionFilter === 'enabled' && !combination.enabled) {
      return false;
    }

    if (!searchText.trim()) {
      return true;
    }

    const search = searchText.trim().toLowerCase();
    return [
      combination.id,
      combination.name,
      combination.reference,
      combination.expressionSummary,
      combination.kind,
      combination.source,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(search);
  });

  const numericRowLimit = Math.max(1, Number(rowLimit) || Number(DEFAULT_ROW_LIMIT));
  const totalPages = Math.max(1, Math.ceil(filteredCombinations.length / numericRowLimit));
  const pagedCombinations = filteredCombinations.slice(
    page * numericRowLimit,
    (page + 1) * numericRowLimit,
  );
  const selectedCombination =
    projectLoadCombinations.find((combination) => combination.id === selectedCombinationId) ?? null;

  useEffect(() => {
    setPage(0);
  }, [rowLimit, searchText, selectionFilter, sourceFilter]);

  useEffect(() => {
    if (!selectedCombinationId && projectLoadCombinations[0]) {
      setSelectedCombinationId(projectLoadCombinations[0].id);
      return;
    }
    if (
      selectedCombinationId &&
      !projectLoadCombinations.some((combination) => combination.id === selectedCombinationId)
    ) {
      setSelectedCombinationId(projectLoadCombinations[0]?.id ?? '');
    }
  }, [projectLoadCombinations, selectedCombinationId]);

  useEffect(() => {
    if (page > totalPages - 1) {
      setPage(totalPages - 1);
    }
  }, [page, totalPages]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <CardTitle className="text-base">Combinations / Envelope</CardTitle>
              <CardDescription>
                Select which project combinations feed the Multi-Pile envelope run. Combination
                authoring stays on the Project page.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <MultiPileProjectLink href={projectLoadCombinationsHref}>
                Open Project Load Combinations
              </MultiPileProjectLink>
              <Button onClick={onRunEnvelope} disabled={isRunning}>
                Run Envelope
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <MultiPileStatCard
              label="Project combinations"
              value={`${projectLoadCombinations.length}`}
              detail={`${enabledProjectCombinations.length} enabled on the Project page`}
              className="bg-muted/20 p-4"
            />
            <MultiPileStatCard
              label="Selected combinations"
              value={`${effectiveSelectedCombinationCount}`}
              detail={`${selectedCombinationIds.size} stored in calculator metadata`}
              className="bg-muted/20 p-4"
            />
            <MultiPileStatCard
              label="Built-in / custom"
              value={`${builtInCount} / ${customCount}`}
              detail={`${projectDefaultCount} project-default envelope rows`}
              className="bg-muted/20 p-4"
            />
            <MultiPileStatCard
              label="Envelope status"
              value={envelopeStatus.label}
              detail={envelopeStatus.detail}
              valueVariant={envelopeStatus.variant}
              className="bg-muted/20 p-4"
            />
            <MultiPileStatCard
              label="Last run"
              value={latestRun ? formatTimestamp(latestRun.createdAt) : 'Not run'}
              detail={
                latestRun?.envelope
                  ? `${latestRun.envelope.projectSummary.jointCount} joints · ${latestRun.envelope.projectSummary.evaluatedCombinationCount} evaluated combinations`
                  : 'Run envelope to compute a governing snapshot'
              }
              className="bg-muted/20 p-4"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                onApplySelectedCombinations(
                  projectLoadCombinations
                    .filter((combination) => combination.enabled && combination.includeInEnvelope)
                    .map((combination) => combination.id),
                )
              }
              disabled={isRunning}
            >
              Use Project Included
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                onApplySelectedCombinations(
                  projectLoadCombinations
                    .filter((combination) => combination.enabled)
                    .map((combination) => combination.id),
                )
              }
              disabled={isRunning}
            >
              Select All Enabled
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onApplySelectedCombinations([])}
              disabled={isRunning}
            >
              Clear Selection
            </Button>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(280px,360px)]">
            <div className="space-y-4">
              <div className="sticky top-16 z-10 -mx-6 border-y bg-background/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  <MultiPileFieldFilter label="Source">
                    <Select
                      value={sourceFilter}
                      onValueChange={(value) => setSourceFilter(value as typeof sourceFilter)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All sources</SelectItem>
                        <SelectItem value="built-in">Project built-in</SelectItem>
                        <SelectItem value="custom">Project custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </MultiPileFieldFilter>

                  <MultiPileFieldFilter label="Selection">
                    <Select
                      value={selectionFilter}
                      onValueChange={(value) => setSelectionFilter(value as typeof selectionFilter)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All rows</SelectItem>
                        <SelectItem value="selected">Selected only</SelectItem>
                        <SelectItem value="project-default">Project default only</SelectItem>
                        <SelectItem value="enabled">Enabled only</SelectItem>
                      </SelectContent>
                    </Select>
                  </MultiPileFieldFilter>

                  <MultiPileFieldFilter label="Search">
                    <Input
                      value={searchText}
                      onChange={(event) => setSearchText(event.target.value)}
                      placeholder="Name, reference, expression"
                    />
                  </MultiPileFieldFilter>

                  <MultiPileFieldFilter label="Rows per page">
                    <Select value={rowLimit} onValueChange={setRowLimit}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['25', '50', '100'].map((value) => (
                          <SelectItem key={value} value={value}>
                            {value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </MultiPileFieldFilter>

                  <div className="flex items-end justify-end gap-2">
                    <Badge variant="outline">{filteredCombinations.length} filtered rows</Badge>
                  </div>
                </div>
              </div>

              {projectLoadCombinations.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No project-owned load combinations are available yet. Author them on the Project
                  page first, then return here to select the envelope set.
                </p>
              ) : filteredCombinations.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No combinations match the current filters.
                </p>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-lg border">
                    <Table className="text-xs">
                      <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-background">
                        <TableRow>
                          <TableHead>Combination</TableHead>
                          <TableHead>Type / source</TableHead>
                          <TableHead>Project</TableHead>
                          <TableHead>Envelope</TableHead>
                          <TableHead>Selection</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pagedCombinations.map((combination) => {
                          const isSelected =
                            combination.enabled && selectedCombinationIds.has(combination.id);
                          const isActiveRow = selectedCombinationId === combination.id;

                          return (
                            <TableRow
                              key={combination.id}
                              className={isActiveRow ? 'bg-muted/40' : undefined}
                              onClick={() => setSelectedCombinationId(combination.id)}
                            >
                              <TableCell className="cursor-pointer py-2">
                                <div className="font-medium">{combination.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {combination.reference ||
                                    combination.expressionSummary ||
                                    combination.id}
                                </div>
                              </TableCell>
                              <TableCell className="cursor-pointer py-2">
                                <div className="font-medium">
                                  {combinationTypeLabel(combination)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {combination.kind === 'envelope' ? 'Envelope' : 'Linear'} ·{' '}
                                  {combination.source === 'built-in'
                                    ? 'Project built-in'
                                    : 'Project custom'}
                                </div>
                              </TableCell>
                              <TableCell className="cursor-pointer py-2">
                                <div className="flex flex-wrap gap-2">
                                  <Badge variant={combination.enabled ? 'success' : 'outline'}>
                                    {combination.enabled ? 'Enabled' : 'Disabled'}
                                  </Badge>
                                  <Badge
                                    variant={combination.includeInEnvelope ? 'success' : 'outline'}
                                  >
                                    {combination.includeInEnvelope
                                      ? 'Project default'
                                      : 'Not default'}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell className="cursor-pointer py-2">
                                <Badge variant="outline">
                                  {combination.expressionSummary || 'Combination library row'}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-2">
                                <Button
                                  variant={isSelected ? 'secondary' : 'outline'}
                                  size="sm"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    onToggleSelectedCombination(combination.id);
                                  }}
                                  disabled={!combination.enabled || isRunning}
                                >
                                  {isSelected ? 'Included' : 'Excluded'}
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-muted-foreground">
                      Page {page + 1} of {totalPages}. Selecting a row opens the detail panel
                      without expanding the whole library.
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
            </div>

            <Card className="h-fit border-dashed">
              <CardHeader>
                <CardTitle className="text-sm">Selected Combination</CardTitle>
                <CardDescription>
                  Compact detail panel for the currently selected library row.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {!selectedCombination ? (
                  <p className="text-sm text-muted-foreground">
                    Select a combination row to view details.
                  </p>
                ) : (
                  <>
                    <div className="space-y-1">
                      <div className="text-sm font-semibold">{selectedCombination.name}</div>
                      <div className="text-xs text-muted-foreground">{selectedCombination.id}</div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{combinationTypeLabel(selectedCombination)}</Badge>
                      <Badge variant="outline">
                        {selectedCombination.source === 'built-in'
                          ? 'Project built-in'
                          : 'Project custom'}
                      </Badge>
                      <Badge variant={selectedCombination.enabled ? 'success' : 'outline'}>
                        {selectedCombination.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                      <Badge
                        variant={selectedCombination.includeInEnvelope ? 'success' : 'outline'}
                      >
                        {selectedCombination.includeInEnvelope ? 'Project default' : 'Not default'}
                      </Badge>
                    </div>

                    <DetailLine
                      label="Expression"
                      value={
                        selectedCombination.expressionSummary || 'No expression summary recorded'
                      }
                    />
                    <DetailLine
                      label="Reference"
                      value={selectedCombination.reference || 'No project reference recorded'}
                    />
                    <DetailLine
                      label="Calculator selection"
                      value={
                        selectedCombinationIds.has(selectedCombination.id)
                          ? 'Included in current Multi-Pile selection set'
                          : 'Excluded from current Multi-Pile selection set'
                      }
                    />

                    <Button
                      className="w-full"
                      variant={
                        selectedCombination.enabled &&
                        selectedCombinationIds.has(selectedCombination.id)
                          ? 'secondary'
                          : 'outline'
                      }
                      size="sm"
                      onClick={() => onToggleSelectedCombination(selectedCombination.id)}
                      disabled={!selectedCombination.enabled || isRunning}
                    >
                      {selectedCombination.enabled &&
                      selectedCombinationIds.has(selectedCombination.id)
                        ? 'Remove from selection'
                        : 'Add to selection'}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Envelope Summary</CardTitle>
          <CardDescription>
            Project-wide governing results stay summary-first here, with full run detail available
            on demand below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant={envelopeStatus.variant}>{envelopeStatus.label}</Badge>
            {latestRun ? (
              <>
                <Badge variant={statusBadgeVariant(latestRun.status)}>{latestRun.status}</Badge>
                <Badge variant="outline">{formatTimestamp(latestRun.createdAt)}</Badge>
                {latestRun.durationMs != null ? (
                  <Badge variant="outline">{Math.round(latestRun.durationMs)} ms</Badge>
                ) : null}
              </>
            ) : null}
          </div>

          {projectWideEnvelope ? (
            <div className="overflow-x-auto rounded-lg border">
              <Table className="text-xs">
                <TableHeader className="[&_th]:bg-background">
                  <TableRow>
                    <TableHead>Result</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Governing combination</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Joint / type</TableHead>
                    <TableHead>Representative pile</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectWideEnvelope.map((metric) => (
                    <TableRow key={metric.key}>
                      <TableCell className="py-2 font-medium">{metric.label}</TableCell>
                      <TableCell className="py-2">{formatNumber(metric.value.value)}</TableCell>
                      <TableCell className="py-2">
                        <div className="font-medium">{metric.value.combinationName || '-'}</div>
                        <div className="text-xs text-muted-foreground">
                          {metric.value.expressionSummary || 'Combination snapshot only'}
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        <Badge variant="outline">{governingSourceLabel(metric.value.source)}</Badge>
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="font-medium">{metric.jointLabel}</div>
                        <div className="text-xs text-muted-foreground">
                          {metric.pileTypeId || '-'}
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="font-medium">{metric.representativePileId || '-'}</div>
                        <div className="text-xs text-muted-foreground">
                          {metric.activePatternIds.join(', ') || 'No active patterns'}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Run envelope to compute.</p>
          )}

          <details className="rounded-lg border bg-muted/10 p-4">
            <summary className="cursor-pointer text-sm font-semibold">
              View latest envelope run detail
            </summary>
            <div className="mt-4">
              <EnvelopeResultsTab latestRun={latestRun} />
            </div>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/10 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-sm text-muted-foreground">{value}</div>
    </div>
  );
}

function combinationTypeLabel(combination: ProjectLoadCombination) {
  if (combination.source === 'custom') {
    return 'Custom';
  }

  const combinedText = [combination.name, combination.reference, combination.expressionSummary]
    .filter(Boolean)
    .join(' ')
    .toUpperCase();

  return combinedText.includes('SLS') || combinedText.includes('SERVICE') ? 'SLS' : 'ULS';
}

function governingSourceLabel(source: MultiPileEnvelopeValue['source']) {
  return source === 'built-in' ? 'Project built-in' : 'Project custom';
}

function readEnvelopeContext(uiState: Record<string, unknown> | undefined) {
  const envelope = objectValue(objectValue(uiState).envelope);
  return {
    lastRunInputSignature: stringValue(envelope.lastRunInputSignature),
  };
}

function deriveEnvelopeStatus({
  latestRun,
  currentInputSignature,
  lastRunInputSignature,
  isDirty,
}: {
  latestRun: MultiPileEnvelopeRunSummary | null | undefined;
  currentInputSignature: string;
  lastRunInputSignature: string;
  isDirty: boolean;
}): { label: string; detail: string; variant: BadgeProps['variant'] } {
  if (!latestRun) {
    return {
      label: 'Not run',
      detail: 'No persisted envelope snapshot exists for this pile group yet.',
      variant: 'outline',
    };
  }

  if (
    isDirty ||
    latestRun.status !== 'completed' ||
    !lastRunInputSignature ||
    lastRunInputSignature !== currentInputSignature
  ) {
    return {
      label: 'Stale',
      detail: 'The current Multi-Pile state differs from the last successful envelope run.',
      variant: 'warning',
    };
  }

  return {
    label: 'Up to date',
    detail: `Snapshot matches the current saved Multi-Pile state from ${formatTimestamp(latestRun.createdAt)}.`,
    variant: 'success',
  };
}

function deriveProjectWideEnvelope(
  latestRun: MultiPileEnvelopeRunSummary | null | undefined,
): GoverningEnvelopeMetric[] | null {
  const rows = latestRun?.envelope?.jointResults ?? [];
  if (rows.length === 0) {
    return null;
  }

  const nMax = rows.reduce(
    (best, row) => (!best || row.nMax.value > best.nMax.value ? row : best),
    null as (typeof rows)[number] | null,
  );
  const nMin = rows.reduce(
    (best, row) => (!best || row.nMin.value < best.nMin.value ? row : best),
    null as (typeof rows)[number] | null,
  );
  const vx = rows.reduce(
    (best, row) => (!best || row.vx.value > best.vx.value ? row : best),
    null as (typeof rows)[number] | null,
  );
  const vy = rows.reduce(
    (best, row) => (!best || row.vy.value > best.vy.value ? row : best),
    null as (typeof rows)[number] | null,
  );
  const mx = rows.reduce(
    (best, row) => (!best || row.mx.value > best.mx.value ? row : best),
    null as (typeof rows)[number] | null,
  );
  const my = rows.reduce(
    (best, row) => (!best || row.my.value > best.my.value ? row : best),
    null as (typeof rows)[number] | null,
  );

  return [
    metricFromJointResult('nMax', 'Nmax', nMax),
    metricFromJointResult('nMin', 'Nmin', nMin),
    metricFromJointResult('mx', 'Mx,max', mx),
    metricFromJointResult('my', 'My,max', my),
    metricFromJointResult('vx', 'Vx', vx),
    metricFromJointResult('vy', 'Vy', vy),
  ].filter(Boolean) as GoverningEnvelopeMetric[];
}

function metricFromJointResult(
  key: GoverningEnvelopeMetric['key'],
  label: string,
  row: {
    jointId: string;
    jointDisplayName?: string;
    pileTypeId: string;
    representativePileId?: string;
    activePatternIds: string[];
    nMax: MultiPileEnvelopeValue;
    nMin: MultiPileEnvelopeValue;
    vx: MultiPileEnvelopeValue;
    vy: MultiPileEnvelopeValue;
    mx: MultiPileEnvelopeValue;
    my: MultiPileEnvelopeValue;
  } | null,
): GoverningEnvelopeMetric | null {
  if (!row) {
    return null;
  }

  return {
    key,
    label,
    value: row[key],
    jointLabel: row.jointDisplayName || row.jointId,
    pileTypeId: row.pileTypeId,
    representativePileId: row.representativePileId || '',
    activePatternIds: row.activePatternIds,
  };
}

function objectValue(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : '';
}
