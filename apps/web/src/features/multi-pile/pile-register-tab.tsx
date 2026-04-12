'use client';

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import type {
  MultiPileEnvelopeRunSummary,
  MultiPileEnvelopeValue,
  MultiPileGeoResultRow,
  MultiPileJointEnvelopeSnapshot,
  MultiPileState,
  MultiPileStructResult,
} from '@eng/shared';
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
import { cn } from '@/lib/utils';
import { MultiPileFieldFilter, MultiPileStatCard } from './runtime-shell';
import { derivePileRegisterRows, formatTimestamp } from './utils';

export interface MultiPileRegisterSelection {
  pileId: string;
  jointId: string;
  pileTypeId: string;
}

interface PileRegisterTabProps {
  draft: MultiPileState;
  latestRun: MultiPileEnvelopeRunSummary | null | undefined;
  selectedPileId?: string | null;
  onSelectPile: (selection: MultiPileRegisterSelection) => void;
  onJumpToGeo: (selection: MultiPileRegisterSelection) => void;
  onJumpToStruct: (selection: MultiPileRegisterSelection) => void;
  onJumpToLoads: (selection: MultiPileRegisterSelection) => void;
}

type RegisterStatusKey = 'pass' | 'fail' | 'warning' | 'pending' | 'not-run' | 'excluded';
type RegisterFlag = 'fail' | 'warn' | 'unresolved' | null;

type GoverningSourceSummary = {
  label: string;
  detail: string;
};

type RegisterRow = {
  pileId: string;
  jointId: string;
  jointLabel: string;
  supportIndex: number;
  supportCount: number;
  pileTypeId: string;
  pileTypeLabel: string;
  includedInAnalysis: boolean;
  authoringStatus: string;
  geoStatusKey: RegisterStatusKey;
  geoStatusLabel: string;
  geoCompUtil: number | null;
  geoUpliftUtil: number | null;
  structStatusKey: RegisterStatusKey;
  structStatusLabel: string;
  structAxialUtil: number | null;
  structPmUtil: number | null;
  structShearUtil: number | null;
  governingSource: GoverningSourceSummary | null;
  noteSummary: string;
  notes: string[];
  flag: RegisterFlag;
  geoResult: MultiPileGeoResultRow | null;
  structResult: MultiPileStructResult | null;
  jointEnvelope: MultiPileJointEnvelopeSnapshot | null;
  geoBasisLabel: string;
  structBasisLabel: string;
  geoUpdatedAt: string | null;
  structUpdatedAt: string | null;
  equalSupportSharingNote: string | null;
};

const DEFAULT_ROW_LIMIT = '50';

export function PileRegisterTab({
  draft,
  latestRun,
  selectedPileId,
  onSelectPile,
  onJumpToGeo,
  onJumpToStruct,
  onJumpToLoads,
}: PileRegisterTabProps) {
  const [searchText, setSearchText] = useState('');
  const [pileTypeFilter, setPileTypeFilter] = useState('all');
  const [geoStatusFilter, setGeoStatusFilter] = useState<RegisterStatusKey | 'all'>('all');
  const [structStatusFilter, setStructStatusFilter] = useState<RegisterStatusKey | 'all'>('all');
  const [failOnly, setFailOnly] = useState(false);
  const [warnOnly, setWarnOnly] = useState(false);
  const [unresolvedOnly, setUnresolvedOnly] = useState(false);
  const [includedOnly, setIncludedOnly] = useState(false);
  const [rowLimit, setRowLimit] = useState(DEFAULT_ROW_LIMIT);
  const [page, setPage] = useState(0);
  const deferredSearchText = useDeferredValue(searchText);

  const envelopeByJointId = useMemo(
    () =>
      new Map((latestRun?.envelope?.jointResults ?? []).map((row) => [row.jointId, row] as const)),
    [latestRun],
  );

  const registerRows = useMemo<RegisterRow[]>(
    () => {
      const structResultsByTypeId = latestRun?.envelope?.structResults ?? {};

      return derivePileRegisterRows(draft).map((row) => {
        const jointEnvelope = envelopeByJointId.get(row.parentJointId) ?? null;
        const storedGeoResult = draft.geoResults[row.parentJointId];
        const geoResult =
          storedGeoResult && storedGeoResult.typeId === row.pileTypeId ? storedGeoResult : null;
        const structResult = structResultsByTypeId[row.pileTypeId] ?? null;
        const geoStatus = resolveGeoStatus(row.includedInAnalysis, geoResult);
        const structStatus = resolveStructStatus(row.includedInAnalysis, structResult);
        const equalSupportSharingNote =
          row.supportCount > 1
            ? `Joint-level loads are shared equally across ${row.supportCount} supports, so sibling piles under ${row.parentJointLabel} carry the same current envelope actions.`
            : null;
        const notes = buildNotes({
          authoringStatus: row.status,
          includedInAnalysis: row.includedInAnalysis,
          geoResult,
          structResult,
        });
        const flag = resolveRegisterFlag({
          includedInAnalysis: row.includedInAnalysis,
          geoStatusKey: geoStatus.key,
          structStatusKey: structStatus.key,
          notes,
        });

        return {
          pileId: row.id,
          jointId: row.parentJointId,
          jointLabel: row.parentJointLabel,
          supportIndex: row.supportIndex,
          supportCount: row.supportCount,
          pileTypeId: row.pileTypeId,
          pileTypeLabel: row.pileTypeLabel,
          includedInAnalysis: row.includedInAnalysis,
          authoringStatus: row.status,
          geoStatusKey: geoStatus.key,
          geoStatusLabel: geoStatus.label,
          geoCompUtil: geoResult?.utilComp ?? null,
          geoUpliftUtil: geoResult?.utilTen ?? null,
          structStatusKey: structStatus.key,
          structStatusLabel: structStatus.label,
          structAxialUtil: structResult?.utilisation.axial ?? null,
          structPmUtil: structResult?.utilisation.moment ?? null,
          structShearUtil: structResult?.utilisation.shear ?? null,
          governingSource: resolveGoverningSource({ geoResult, jointEnvelope, structResult }),
          noteSummary: summarizeNotes(notes),
          notes,
          flag,
          geoResult,
          structResult,
          jointEnvelope,
          geoBasisLabel: buildGeoBasisLabel({
            geoResult,
            jointLabel: row.parentJointLabel,
            supportCount: row.supportCount,
          }),
          structBasisLabel: buildStructBasisLabel({
            structResult,
            pileTypeLabel: row.pileTypeLabel,
          }),
          geoUpdatedAt: geoResult?.updatedAt ?? null,
          structUpdatedAt: structResult?.updatedAt ?? null,
          equalSupportSharingNote,
        };
      });
    },
    [draft, envelopeByJointId, latestRun],
  );

  const filteredRows = useMemo(() => {
    const normalizedSearch = deferredSearchText.trim().toLowerCase();

    return registerRows.filter((row) => {
      if (includedOnly && !row.includedInAnalysis) {
        return false;
      }
      if (pileTypeFilter !== 'all' && row.pileTypeId !== pileTypeFilter) {
        return false;
      }
      if (geoStatusFilter !== 'all' && row.geoStatusKey !== geoStatusFilter) {
        return false;
      }
      if (structStatusFilter !== 'all' && row.structStatusKey !== structStatusFilter) {
        return false;
      }
      if (failOnly && row.flag !== 'fail') {
        return false;
      }
      if (warnOnly && row.flag !== 'warn') {
        return false;
      }
      if (unresolvedOnly && row.flag !== 'unresolved') {
        return false;
      }
      if (!normalizedSearch) {
        return true;
      }

      return [row.pileId, row.jointId, row.jointLabel, row.pileTypeId, row.pileTypeLabel]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [
    deferredSearchText,
    failOnly,
    geoStatusFilter,
    includedOnly,
    pileTypeFilter,
    registerRows,
    structStatusFilter,
    unresolvedOnly,
    warnOnly,
  ]);

  const rowLimitNumber = Math.max(1, Number(rowLimit) || Number(DEFAULT_ROW_LIMIT));
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / rowLimitNumber));
  const pagedRows = filteredRows.slice(page * rowLimitNumber, (page + 1) * rowLimitNumber);
  const selectedRow =
    registerRows.find((row) => row.pileId === selectedPileId) ?? registerRows[0] ?? null;

  const failCount = registerRows.filter((row) => row.flag === 'fail').length;
  const warnCount = registerRows.filter((row) => row.flag === 'warn').length;
  const unresolvedCount = registerRows.filter((row) => row.flag === 'unresolved').length;

  useEffect(() => {
    setPage(0);
  }, [
    deferredSearchText,
    failOnly,
    geoStatusFilter,
    includedOnly,
    pileTypeFilter,
    rowLimit,
    structStatusFilter,
    unresolvedOnly,
    warnOnly,
  ]);

  useEffect(() => {
    if (page > totalPages - 1) {
      setPage(totalPages - 1);
    }
  }, [page, totalPages]);

  useEffect(() => {
    if (!selectedRow) {
      return;
    }
    if (selectedRow.pileId === selectedPileId) {
      return;
    }
    onSelectPile(toSelection(selectedRow));
  }, [onSelectPile, selectedPileId, selectedRow]);

  if (registerRows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pile Register</CardTitle>
          <CardDescription>
            No derived pile rows exist yet. Add joints and support counts on the Pile Types &amp;
            Pattern Assignment tab to generate the register.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pile Verification Register</CardTitle>
          <CardDescription>
            Compact register of the current derived piles with fast filters, sticky headers, and
            drill-down into GEO, STRUCT, and joint loads.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MultiPileStatCard
              label="Rows"
              value={`${registerRows.length}`}
              detail="One row per current derived pile"
            />
            <MultiPileStatCard
              label="Fail"
              value={`${failCount}`}
              detail="Any GEO or STRUCT failure on the row"
              valueVariant={failCount > 0 ? 'destructive' : 'outline'}
            />
            <MultiPileStatCard
              label="Warn"
              value={`${warnCount}`}
              detail="Stored warnings without a hard fail"
              valueVariant={warnCount > 0 ? 'warning' : 'outline'}
            />
            <MultiPileStatCard
              label="Unresolved"
              value={`${unresolvedCount}`}
              detail="Missing run, pending, or excluded rows"
              valueVariant={unresolvedCount > 0 ? 'warning' : 'outline'}
            />
          </div>

          <div className="rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
            GEO columns read the stored parent-joint result row for each pile. STRUCT columns carry
            the latest type-level result for that pile&apos;s pile type. The detail panel calls out
            that basis explicitly so no support-specific STRUCT result is implied.
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="text-base">Register Table</CardTitle>
            <CardDescription>
              Search by pile or joint, filter by result state, and page through the live pile
              register without leaving Multi-Pile.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="sticky top-16 z-10 -mx-6 border-y bg-background/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <MultiPileFieldFilter label="Search">
                  <Input
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    placeholder="Pile ID or joint"
                  />
                </MultiPileFieldFilter>

                <MultiPileFieldFilter label="Pile Type">
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

                <MultiPileFieldFilter label="GEO Status">
                  <Select
                    value={geoStatusFilter}
                    onValueChange={(value) => setGeoStatusFilter(value as typeof geoStatusFilter)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All GEO statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All GEO statuses</SelectItem>
                      <SelectItem value="pass">Pass</SelectItem>
                      <SelectItem value="fail">Fail</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="not-run">Not run</SelectItem>
                      <SelectItem value="excluded">Excluded</SelectItem>
                    </SelectContent>
                  </Select>
                </MultiPileFieldFilter>

                <MultiPileFieldFilter label="STRUCT Status">
                  <Select
                    value={structStatusFilter}
                    onValueChange={(value) =>
                      setStructStatusFilter(value as typeof structStatusFilter)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All STRUCT statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All STRUCT statuses</SelectItem>
                      <SelectItem value="pass">Pass</SelectItem>
                      <SelectItem value="fail">Fail</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="not-run">Not run</SelectItem>
                      <SelectItem value="excluded">Excluded</SelectItem>
                    </SelectContent>
                  </Select>
                </MultiPileFieldFilter>

                <MultiPileFieldFilter label="Rows per Page">
                  <Select value={rowLimit} onValueChange={setRowLimit}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['25', '50', '100', '200'].map((value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </MultiPileFieldFilter>
              </div>

              <div className="mt-3 flex flex-wrap gap-3">
                <ToggleFilter label="Show FAIL only" checked={failOnly} onChange={setFailOnly} />
                <ToggleFilter label="Show WARN only" checked={warnOnly} onChange={setWarnOnly} />
                <ToggleFilter
                  label="Show unresolved only"
                  checked={unresolvedOnly}
                  onChange={setUnresolvedOnly}
                />
                <ToggleFilter
                  label="Show included only"
                  checked={includedOnly}
                  onChange={setIncludedOnly}
                />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline">
                  Showing {pagedRows.length} of {filteredRows.length} filtered rows
                </Badge>
                <Badge variant="outline">{registerRows.length} total derived piles</Badge>
                <Badge variant="outline">
                  Page {Math.min(page + 1, totalPages)} of {totalPages}
                </Badge>
              </div>
            </div>

            {filteredRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No pile register rows match the current filters.
              </p>
            ) : (
              <>
                <div className="overflow-x-auto rounded-lg border">
                  <Table className="text-xs">
                    <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-background">
                      <TableRow>
                        <TableHead className="w-28">Pile ID</TableHead>
                        <TableHead className="w-44">Parent Joint</TableHead>
                        <TableHead className="w-24">Support</TableHead>
                        <TableHead className="w-40">Pile Type</TableHead>
                        <TableHead className="w-24">Included</TableHead>
                        <TableHead className="w-24">GEO Status</TableHead>
                        <TableHead className="w-24">GEO Comp</TableHead>
                        <TableHead className="w-24">GEO Uplift</TableHead>
                        <TableHead className="w-28">STRUCT Status</TableHead>
                        <TableHead className="w-24">Axial</TableHead>
                        <TableHead className="w-24">P-M</TableHead>
                        <TableHead className="w-24">Shear</TableHead>
                        <TableHead className="w-56">Governing Combination / Source</TableHead>
                        <TableHead className="w-48">Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagedRows.map((row) => {
                        const isSelected = row.pileId === selectedRow?.pileId;

                        return (
                          <TableRow
                            key={row.pileId}
                            className={cn(
                              'cursor-pointer',
                              isSelected && 'bg-muted/40',
                              !isSelected && row.flag === 'fail' && 'bg-rose-50/40',
                              !isSelected && row.flag === 'warn' && 'bg-amber-50/30',
                            )}
                            onClick={() => onSelectPile(toSelection(row))}
                          >
                            <TableCell className="py-2 font-mono text-[11px]">
                              {row.pileId}
                            </TableCell>
                            <TableCell className="py-2">
                              <div className="font-medium">{row.jointId}</div>
                              <div className="text-xs text-muted-foreground">{row.jointLabel}</div>
                            </TableCell>
                            <TableCell className="py-2">
                              {row.supportIndex}/{row.supportCount}
                            </TableCell>
                            <TableCell className="py-2">{row.pileTypeLabel}</TableCell>
                            <TableCell className="py-2">
                              <Badge variant={row.includedInAnalysis ? 'success' : 'outline'}>
                                {row.includedInAnalysis ? 'Included' : 'Excluded'}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-2">
                              <Badge variant={statusVariant(row.geoStatusKey)}>
                                {row.geoStatusLabel}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-2">
                              {formatGeoPercent(row.geoCompUtil)}
                            </TableCell>
                            <TableCell className="py-2">
                              {formatGeoPercent(row.geoUpliftUtil)}
                            </TableCell>
                            <TableCell className="py-2">
                              <Badge variant={statusVariant(row.structStatusKey)}>
                                {row.structStatusLabel}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-2">
                              {formatStructPercent(row.structAxialUtil)}
                            </TableCell>
                            <TableCell className="py-2">
                              {formatStructPercent(row.structPmUtil)}
                            </TableCell>
                            <TableCell className="py-2">
                              {formatStructPercent(row.structShearUtil)}
                            </TableCell>
                            <TableCell className="py-2">
                              {row.governingSource ? (
                                <>
                                  <div className="font-medium">{row.governingSource.label}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {row.governingSource.detail}
                                  </div>
                                </>
                              ) : (
                                '—'
                              )}
                            </TableCell>
                            <TableCell className="py-2">
                              {row.noteSummary === '—' ? (
                                '—'
                              ) : (
                                <Badge variant={row.flag === 'fail' ? 'destructive' : 'warning'}>
                                  {row.noteSummary}
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    The register stays row-per-derived-pile, while GEO and STRUCT continue to use
                    their existing result ownership models.
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

        <Card className="h-fit xl:sticky xl:top-20">
          <CardHeader>
            <CardTitle className="text-base">Selected Pile Detail</CardTitle>
            <CardDescription>
              Row selection identifies the active pile, summarizes the current basis, and hands off
              into the existing GEO, STRUCT, and joint load tabs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedRow ? (
              <p className="text-sm text-muted-foreground">
                Select a pile row to inspect its current verification basis.
              </p>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {selectedRow.pileId}
                  </div>
                  <div className="text-sm font-semibold">
                    {selectedRow.jointLabel} · {selectedRow.pileTypeLabel}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={selectedRow.includedInAnalysis ? 'success' : 'outline'}>
                      {selectedRow.includedInAnalysis ? 'Included' : 'Excluded'}
                    </Badge>
                    <Badge variant={statusVariant(selectedRow.geoStatusKey)}>
                      GEO {selectedRow.geoStatusLabel}
                    </Badge>
                    <Badge variant={statusVariant(selectedRow.structStatusKey)}>
                      STRUCT {selectedRow.structStatusLabel}
                    </Badge>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <DetailStat
                    label="Parent Joint"
                    value={selectedRow.jointId}
                    detail={`${selectedRow.supportIndex} of ${selectedRow.supportCount} supports`}
                  />
                  <DetailStat
                    label="Governing Source"
                    value={selectedRow.governingSource?.label ?? '—'}
                    detail={selectedRow.governingSource?.detail ?? 'No stored envelope source yet'}
                  />
                  <DetailStat
                    label="GEO Basis"
                    value={selectedRow.geoBasisLabel}
                    detail={
                      selectedRow.geoUpdatedAt
                        ? `Updated ${formatTimestamp(selectedRow.geoUpdatedAt)}`
                        : 'No stored GEO row'
                    }
                  />
                  <DetailStat
                    label="STRUCT Basis"
                    value={selectedRow.structBasisLabel}
                    detail={
                      selectedRow.structUpdatedAt
                        ? `Updated ${formatTimestamp(selectedRow.structUpdatedAt)}`
                        : 'No stored STRUCT row'
                    }
                  />
                </div>

                <div className="grid gap-3 rounded-lg border bg-muted/10 p-3 sm:grid-cols-2 xl:grid-cols-1">
                  <MiniUtil
                    label="GEO compression"
                    value={formatGeoPercent(selectedRow.geoCompUtil)}
                  />
                  <MiniUtil
                    label="GEO uplift"
                    value={formatGeoPercent(selectedRow.geoUpliftUtil)}
                  />
                  <MiniUtil
                    label="STRUCT axial"
                    value={formatStructPercent(selectedRow.structAxialUtil)}
                  />
                  <MiniUtil
                    label="STRUCT P-M"
                    value={formatStructPercent(selectedRow.structPmUtil)}
                  />
                  <MiniUtil
                    label="STRUCT shear"
                    value={formatStructPercent(selectedRow.structShearUtil)}
                  />
                </div>

                {selectedRow.equalSupportSharingNote ? (
                  <div className="rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
                    {selectedRow.equalSupportSharingNote}
                  </div>
                ) : null}

                <div className="space-y-2">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Notes
                  </div>
                  {selectedRow.notes.length ? (
                    <div className="space-y-2 rounded-lg border bg-muted/10 p-3 text-sm">
                      {selectedRow.notes.map((note, index) => (
                        <div key={`${selectedRow.pileId}-note-${index}`}>{note}</div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No unresolved notes on the selected row.
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Button variant="outline" onClick={() => onJumpToGeo(toSelection(selectedRow))}>
                    Open GEO for this pile
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => onJumpToStruct(toSelection(selectedRow))}
                  >
                    Open STRUCT for this type
                  </Button>
                  <Button variant="outline" onClick={() => onJumpToLoads(toSelection(selectedRow))}>
                    Filter Joint Loads to this joint
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ToggleFilter({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
      <input
        type="checkbox"
        className="h-4 w-4 rounded border border-input"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}

function DetailStat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-lg border bg-muted/10 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold">{value}</div>
      <div className="mt-1 text-sm text-muted-foreground">{detail}</div>
    </div>
  );
}

function MiniUtil({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
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

function resolveRegisterFlag({
  includedInAnalysis,
  geoStatusKey,
  structStatusKey,
  notes,
}: {
  includedInAnalysis: boolean;
  geoStatusKey: RegisterStatusKey;
  structStatusKey: RegisterStatusKey;
  notes: string[];
}): RegisterFlag {
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
  return null;
}

function buildNotes({
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

function resolveGoverningSource({
  geoResult,
  jointEnvelope,
  structResult,
}: {
  geoResult: MultiPileGeoResultRow | null;
  jointEnvelope: MultiPileJointEnvelopeSnapshot | null;
  structResult: MultiPileStructResult | null;
}): GoverningSourceSummary | null {
  if (!jointEnvelope) {
    return null;
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
    const useCompression =
      structResult.axial.compressionUtilisation >= structResult.axial.tensionUtilisation;
    const axialSource = useCompression ? jointEnvelope.nMax : jointEnvelope.nMin;
    candidates.push({
      score: Math.max(
        structResult.axial.compressionUtilisation,
        structResult.axial.tensionUtilisation,
      ),
      label: `STRUCT axial · ${compactCombinationLabel(axialSource)}`,
      detail: sourceLabel(axialSource),
    });

    const momentSource =
      Math.abs(jointEnvelope.mx.value) >= Math.abs(jointEnvelope.my.value)
        ? jointEnvelope.mx
        : jointEnvelope.my;
    candidates.push({
      score: structResult.utilisation.moment,
      label: `STRUCT P-M · ${compactCombinationLabel(momentSource)}`,
      detail: sourceLabel(momentSource),
    });

    const shearSource =
      Math.abs(jointEnvelope.vx.value) >= Math.abs(jointEnvelope.vy.value)
        ? jointEnvelope.vx
        : jointEnvelope.vy;
    candidates.push({
      score: structResult.utilisation.shear,
      label: `STRUCT shear · ${compactCombinationLabel(shearSource)}`,
      detail: sourceLabel(shearSource),
    });
  }

  if (!candidates.length) {
    return {
      label: `Envelope · ${compactCombinationLabel(jointEnvelope.nMax)}`,
      detail: sourceLabel(jointEnvelope.nMax),
    };
  }

  candidates.sort((left, right) => right.score - left.score);
  return candidates[0] ?? null;
}

function buildGeoBasisLabel({
  geoResult,
  jointLabel,
  supportCount,
}: {
  geoResult: MultiPileGeoResultRow | null;
  jointLabel: string;
  supportCount: number;
}) {
  if (!geoResult) {
    return 'Parent-joint GEO row not yet stored';
  }
  if (supportCount > 1) {
    return `Parent joint ${jointLabel} (${supportCount}-support shared result)`;
  }
  return `Parent joint ${jointLabel}`;
}

function buildStructBasisLabel({
  structResult,
  pileTypeLabel,
}: {
  structResult: MultiPileStructResult | null;
  pileTypeLabel: string;
}) {
  if (!structResult) {
    return 'Type-level STRUCT row not yet stored';
  }
  return `Pile type ${pileTypeLabel}`;
}

function summarizeNotes(notes: string[]) {
  if (notes.length === 0) {
    return '—';
  }
  if (notes.length === 1) {
    return clipText(notes[0] ?? '', 40);
  }
  return `${notes.length} notes`;
}

function statusVariant(status: RegisterStatusKey) {
  if (status === 'pass') return 'success' as const;
  if (status === 'fail') return 'destructive' as const;
  if (status === 'warning' || status === 'pending') return 'warning' as const;
  return 'outline' as const;
}

function formatGeoPercent(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) {
    return '—';
  }
  return `${value.toFixed(1)}%`;
}

function formatStructPercent(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) {
    return '—';
  }
  return `${(value * 100).toFixed(1).replace(/\.0$/, '')}%`;
}

function compactCombinationLabel(value: MultiPileEnvelopeValue) {
  return clipText(value.combinationName || value.combinationId || '—', 28);
}

function sourceLabel(value: MultiPileEnvelopeValue) {
  return value.source === 'built-in' ? 'Built-in source' : 'Custom source';
}

function clipText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function toSelection(row: Pick<RegisterRow, 'pileId' | 'jointId' | 'pileTypeId'>) {
  return {
    pileId: row.pileId,
    jointId: row.jointId,
    pileTypeId: row.pileTypeId,
  };
}
