'use client';

import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Printer,
  Search,
} from 'lucide-react';
import type { CellObject } from 'xlsx';
import type {
  MultiPileEnvelopeRunSummary,
  MultiPileProjectSpecifics,
  MultiPileState,
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
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  buildPricingSummaryData,
  buildPricingSummaryPrintPath,
  buildPricingWorkbookFilename,
  type PricingPileScheduleRow,
  type PricingSectionElevationRow,
  type PricingTypeSummaryRow,
} from './pricing-summary';
import {
  MultiPileElevationSketch,
  MultiPileSectionSketch,
  canRenderMultiPileElevationSketch,
  canRenderMultiPileSectionSketch,
} from './struct-visuals';

interface PricingSummaryTabProps {
  projectId: string;
  groupId: string;
  draft: MultiPileState;
  projectSpecifics: MultiPileProjectSpecifics;
  projectCode?: string | null;
  projectName?: string | null;
  latestRun?: MultiPileEnvelopeRunSummary | null;
  onPreparePrint?: () => Promise<boolean>;
}

const EMPTY_VALUE = '—';
const PENDING_VALUE = 'Pending';
const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100] as const;
const VISUAL_COLLAPSE_THRESHOLD = 4;

type TypeSortValue =
  | 'pileType:asc'
  | 'pileType:desc'
  | 'count:desc'
  | 'count:asc'
  | 'diameter:desc'
  | 'diameter:asc';

export function PricingSummaryTab({
  projectId,
  groupId,
  draft,
  projectSpecifics,
  projectCode,
  projectName,
  latestRun,
  onPreparePrint,
}: PricingSummaryTabProps) {
  const router = useRouter();
  const [isExporting, setIsExporting] = useState(false);
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pileTypeFilter, setPileTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [rowsPerPage, setRowsPerPage] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPileId, setSelectedPileId] = useState<string | null>(null);
  const [typeSortValue, setTypeSortValue] = useState<TypeSortValue>('count:desc');
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [expandedVisualTypeId, setExpandedVisualTypeId] = useState<string | null>(null);
  const deferredSearchQuery = useDeferredValue(searchQuery.trim().toLowerCase());

  const data = useMemo(
    () => buildPricingSummaryData({ draft, projectSpecifics, latestRun, projectCode, projectName }),
    [draft, latestRun, projectCode, projectName, projectSpecifics],
  );

  const pileTypeOptions = useMemo(() => {
    const options = new Map<string, { label: string; count: number }>();
    data.pileRows.forEach((row) => {
      const entry = options.get(row.pileTypeId);
      if (entry) {
        entry.count += 1;
        return;
      }
      options.set(row.pileTypeId, { label: row.pileType, count: 1 });
    });
    return Array.from(options.entries())
      .map(([value, entry]) => ({ value, ...entry }))
      .sort((left, right) => left.label.localeCompare(right.label, undefined, { numeric: true }));
  }, [data.pileRows]);

  const statusOptions = useMemo(() => {
    const counts = new Map<string, number>();
    data.pileRows.forEach((row) => {
      buildStatusTokens(row.statusNotes).forEach((token) => {
        counts.set(token, (counts.get(token) ?? 0) + 1);
      });
    });
    return Array.from(counts.entries())
      .map(([value, count]) => ({
        value,
        count,
        label: compactStatusToken(value),
      }))
      .sort((left, right) => {
        if (left.value === 'Ready') {
          return -1;
        }
        if (right.value === 'Ready') {
          return 1;
        }
        return left.label.localeCompare(right.label, undefined, { numeric: true });
      });
  }, [data.pileRows]);

  const filteredPileRows = useMemo(() => {
    return data.pileRows.filter((row) => {
      if (pileTypeFilter !== 'all' && row.pileTypeId !== pileTypeFilter) {
        return false;
      }
      if (statusFilter !== 'all' && !buildStatusTokens(row.statusNotes).includes(statusFilter)) {
        return false;
      }
      if (!deferredSearchQuery) {
        return true;
      }
      const haystack = [
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
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(deferredSearchQuery);
    });
  }, [data.pileRows, deferredSearchQuery, pileTypeFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredPileRows.length / rowsPerPage));
  const currentPageSafe = Math.min(currentPage, totalPages);
  const pageStartIndex = (currentPageSafe - 1) * rowsPerPage;
  const pagedPileRows = filteredPileRows.slice(pageStartIndex, pageStartIndex + rowsPerPage);
  const pageRangeLabel = filteredPileRows.length
    ? `${pageStartIndex + 1}-${Math.min(pageStartIndex + rowsPerPage, filteredPileRows.length)} of ${filteredPileRows.length}`
    : '0 results';

  const sortedTypeSummaryRows = useMemo(() => {
    const [sortKey, sortDirection] = typeSortValue.split(':') as [
      'pileType' | 'count' | 'diameter',
      'asc' | 'desc',
    ];
    const directionMultiplier = sortDirection === 'asc' ? 1 : -1;
    return [...data.typeSummaryRows].sort((left, right) => {
      if (sortKey === 'pileType') {
        return (
          left.pileType.localeCompare(right.pileType, undefined, { numeric: true }) *
          directionMultiplier
        );
      }
      if (sortKey === 'count') {
        if (left.count === right.count) {
          return left.pileType.localeCompare(right.pileType, undefined, { numeric: true });
        }
        return (left.count - right.count) * directionMultiplier;
      }

      const leftDiameter = extractFirstNumber(left.diameter);
      const rightDiameter = extractFirstNumber(right.diameter);
      if (leftDiameter === rightDiameter) {
        return left.pileType.localeCompare(right.pileType, undefined, { numeric: true });
      }
      return (leftDiameter - rightDiameter) * directionMultiplier;
    });
  }, [data.typeSummaryRows, typeSortValue]);

  const typeSummaryById = useMemo(
    () => new Map(data.typeSummaryRows.map((row) => [row.pileTypeId, row] as const)),
    [data.typeSummaryRows],
  );

  const selectedPileRow =
    pagedPileRows.find((row) => row.pileId === selectedPileId) ?? pagedPileRows[0] ?? null;
  const selectedTypeRow =
    sortedTypeSummaryRows.find((row) => row.pileTypeId === selectedTypeId) ??
    sortedTypeSummaryRows[0] ??
    null;
  const expandedVisualRow =
    data.sectionElevationRows.find((row) => row.pileTypeId === expandedVisualTypeId) ?? null;

  useEffect(() => {
    if (currentPage !== currentPageSafe) {
      setCurrentPage(currentPageSafe);
    }
  }, [currentPage, currentPageSafe]);

  useEffect(() => {
    if (!pagedPileRows.length) {
      if (selectedPileId !== null) {
        setSelectedPileId(null);
      }
      return;
    }
    const firstPagedRow = pagedPileRows[0];
    if (selectedPileRow && selectedPileRow.pileId === selectedPileId) {
      return;
    }
    if (firstPagedRow) {
      setSelectedPileId(firstPagedRow.pileId);
    }
  }, [pagedPileRows, selectedPileId, selectedPileRow]);

  useEffect(() => {
    if (!sortedTypeSummaryRows.length) {
      if (selectedTypeId !== null) {
        setSelectedTypeId(null);
      }
      return;
    }
    const firstTypeRow = sortedTypeSummaryRows[0];
    if (selectedTypeRow && selectedTypeRow.pileTypeId === selectedTypeId) {
      return;
    }
    if (firstTypeRow) {
      setSelectedTypeId(firstTypeRow.pileTypeId);
    }
  }, [selectedTypeId, selectedTypeRow, sortedTypeSummaryRows]);

  useEffect(() => {
    if (!data.sectionElevationRows.length) {
      if (expandedVisualTypeId !== null) {
        setExpandedVisualTypeId(null);
      }
      return;
    }
    const hasCurrentSelection = data.sectionElevationRows.some(
      (row) => row.pileTypeId === expandedVisualTypeId,
    );
    if (hasCurrentSelection) {
      return;
    }
    setExpandedVisualTypeId(
      data.sectionElevationRows.length > VISUAL_COLLAPSE_THRESHOLD
        ? null
        : (data.sectionElevationRows[0]?.pileTypeId ?? null),
    );
  }, [data.sectionElevationRows, expandedVisualTypeId]);

  async function handlePrintPricingSummary() {
    try {
      setIsPreparingPrint(true);
      const canOpenPreview = (await onPreparePrint?.()) ?? true;
      if (!canOpenPreview) {
        return;
      }
      router.push(buildPricingSummaryPrintPath({ projectId, groupId }));
    } catch (error) {
      console.error('Pricing print preview failed', error);
      toast.error('Failed to open Pricing Summary print preview');
    } finally {
      setIsPreparingPrint(false);
    }
  }

  async function handleExportPricingXlsx() {
    try {
      setIsExporting(true);
      const XLSX = await import('xlsx');
      const workbook = XLSX.utils.book_new();

      data.workbookSheets.forEach((sheet) => {
        const worksheet = XLSX.utils.aoa_to_sheet([sheet.columns, ...sheet.rows]) as Record<
          string,
          CellObject | unknown
        > & {
          '!cols'?: Array<{ wch?: number }>;
          '!rows'?: Array<{ hpt?: number }>;
        };
        worksheet['!cols'] = sheet.columns.map((column, index) => ({
          wch: sheet.columnWidths?.[index] ?? Math.min(42, Math.max(column.length + 2, 14)),
        }));
        if (sheet.rowHeights?.length) {
          worksheet['!rows'] = sheet.rowHeights.map((height) => ({ hpt: height }));
        }
        if (sheet.wrapTextColumnIndexes?.length) {
          applyWorksheetWrapText({
            XLSX,
            worksheet,
            rowCount: sheet.rows.length + 1,
            columnIndexes: sheet.wrapTextColumnIndexes,
          });
        }
        XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
      });

      XLSX.writeFile(workbook, buildPricingWorkbookFilename(data), {
        bookType: 'xlsx',
        compression: true,
        cellStyles: true,
      });
      toast.success('Pricing XLSX exported');
    } catch (error) {
      console.error('Pricing XLSX export failed', error);
      toast.error('Failed to export Pricing XLSX');
    } finally {
      setIsExporting(false);
    }
  }

  function handlePileFilterChange(nextValue: string) {
    setPileTypeFilter(nextValue);
    setCurrentPage(1);
  }

  function handleStatusFilterChange(nextValue: string) {
    setStatusFilter(nextValue);
    setCurrentPage(1);
  }

  function handleRowsPerPageChange(nextValue: string) {
    setRowsPerPage(Number(nextValue));
    setCurrentPage(1);
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex flex-col gap-3 pb-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">Pricing Summary</CardTitle>
            <CardDescription>
              Estimator view from the current shared pricing summary.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={handlePrintPricingSummary}
              disabled={isPreparingPrint || isExporting}
              data-testid="pricing-summary-print-button"
            >
              <Printer className="mr-2 h-4 w-4" />
              Print Pricing Summary
            </Button>
            <Button onClick={handleExportPricingXlsx} disabled={isExporting || isPreparingPrint}>
              <Download className="mr-2 h-4 w-4" />
              Export Pricing XLSX
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <HeaderStat label="Project Number" value={data.header.projectNumber} />
            <HeaderStat label="Project Name" value={data.header.projectName} />
            <HeaderStat label="Client" value={data.header.client} />
            <HeaderStat label="Location" value={data.header.location} />
            <HeaderStat label="Revision" value={data.header.revision} />
            <HeaderStat label="Issue Date" value={data.header.issueDate} />
            <HeaderStat label="Pile Count" value={`${data.header.pileCount}`} />
            <HeaderStat label="Active Pile Types" value={`${data.header.activePileTypeCount}`} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{data.header.pileCount} derived piles</Badge>
            <Badge variant="outline">{filteredPileRows.length} matching rows</Badge>
            <Badge variant="outline">{data.header.activePileTypeCount} active pile types</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base">Per-Pile Pricing Schedule</CardTitle>
              <CardDescription>
                Search, filter, and page the pile schedule. Select a row to open full read-only
                detail.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{pageRangeLabel}</Badge>
              <Badge variant="outline">Sticky header</Badge>
              <Badge variant="outline">Full detail on selection</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            data-testid="pricing-summary-filter-bar"
            className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.8fr)]"
          >
            <ControlField label="Search rows">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setCurrentPage(1);
                  }}
                  aria-label="Search per-pile pricing rows"
                  placeholder="Search pile, joint, type, material, or notes"
                  className="pl-9"
                />
              </div>
            </ControlField>

            <ControlField label="Pile type">
              <Select value={pileTypeFilter} onValueChange={handlePileFilterChange}>
                <SelectTrigger aria-label="Filter per-pile pricing rows by pile type">
                  <SelectValue placeholder="All pile types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All pile types</SelectItem>
                  {pileTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label} ({option.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ControlField>

            <ControlField label="Status / notes">
              <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                <SelectTrigger aria-label="Filter per-pile pricing rows by status">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label} ({option.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ControlField>

            <ControlField label="Rows per page">
              <Select value={`${rowsPerPage}`} onValueChange={handleRowsPerPageChange}>
                <SelectTrigger aria-label="Set per-pile pricing rows per page">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROWS_PER_PAGE_OPTIONS.map((value) => (
                    <SelectItem key={value} value={`${value}`}>
                      {value} rows
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ControlField>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                <div>
                  Showing <span className="font-semibold text-foreground">{pageRangeLabel}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPageSafe <= 1}
                    aria-label="Go to first pricing schedule page"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    disabled={currentPageSafe <= 1}
                    aria-label="Go to previous pricing schedule page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="min-w-[5.5rem] text-center text-xs font-semibold uppercase tracking-[0.16em]">
                    Page {currentPageSafe} / {totalPages}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    disabled={currentPageSafe >= totalPages}
                    aria-label="Go to next pricing schedule page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPageSafe >= totalPages}
                    aria-label="Go to last pricing schedule page"
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border">
                <div className="max-h-[36rem] overflow-auto">
                  <table
                    data-testid="pricing-per-pile-table"
                    className="min-w-[1180px] w-full border-collapse text-sm"
                  >
                    <thead>
                      <tr>
                        <StickyTableHead>Pile / Joint</StickyTableHead>
                        <StickyTableHead>Type / Dia</StickyTableHead>
                        <StickyTableHead>Concrete / Cover</StickyTableHead>
                        <StickyTableHead>Reinforcement</StickyTableHead>
                        <StickyTableHead>Socket / Cage</StickyTableHead>
                        <StickyTableHead>Section / Elevation</StickyTableHead>
                        <StickyTableHead>Status</StickyTableHead>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedPileRows.length > 0 ? (
                        pagedPileRows.map((row) => {
                          const isSelected = row.pileId === selectedPileRow?.pileId;
                          return (
                            <tr
                              key={`${row.pileId}-${row.parentJoint}-${row.pileTypeId}`}
                              className={cn(
                                'cursor-pointer align-top transition-colors hover:bg-muted/40',
                                isSelected && 'bg-muted/60',
                              )}
                              aria-selected={isSelected}
                              tabIndex={0}
                              onClick={() => setSelectedPileId(row.pileId)}
                              onKeyDown={(event) =>
                                handleSelectableRowKeyDown(event, () =>
                                  setSelectedPileId(row.pileId),
                                )
                              }
                            >
                              <td className="border-b px-3 py-3 align-top">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="font-semibold text-foreground">
                                      {row.pileId}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {row.parentJoint}
                                    </div>
                                  </div>
                                  {isSelected ? (
                                    <Badge variant="secondary" className="shrink-0">
                                      Selected
                                    </Badge>
                                  ) : null}
                                </div>
                              </td>
                              <td className="border-b px-3 py-3 align-top">
                                <CompactPrimarySecondary
                                  primary={row.pileType}
                                  secondary={row.diameter}
                                />
                              </td>
                              <td className="border-b px-3 py-3 align-top">
                                <CompactPrimarySecondary
                                  primary={primaryCommercialLabel(row.concreteGrade)}
                                  secondary={primaryCommercialLabel(row.coverDurability)}
                                  title={`${row.concreteGrade}\n${row.coverDurability}`}
                                />
                              </td>
                              <td className="border-b px-3 py-3 align-top">
                                <CompactBadgeGroup
                                  value={row.reinforcementSummary}
                                  fallbackLabel="Reo pending"
                                  maxVisible={2}
                                />
                              </td>
                              <td className="border-b px-3 py-3 align-top">
                                <div
                                  className="space-y-2"
                                  title={[
                                    row.foundingSocketMaterial,
                                    row.adoptedSocketLength,
                                    row.cageLength,
                                    formatDetailValue('tendon', row.tendonSummary),
                                  ].join('\n')}
                                >
                                  <div className="flex flex-wrap gap-1">
                                    <CompactInlineBadge
                                      label={compactSocketMaterialLabel(row.foundingSocketMaterial)}
                                      variant={
                                        row.foundingSocketMaterial === PENDING_VALUE
                                          ? 'warning'
                                          : 'outline'
                                      }
                                    />
                                    <CompactInlineBadge
                                      label={compactSocketLengthLabel(row.adoptedSocketLength)}
                                      variant={
                                        row.adoptedSocketLength === PENDING_VALUE
                                          ? 'warning'
                                          : 'outline'
                                      }
                                    />
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {compactCageLengthLabel(row.cageLength)} ·{' '}
                                    {compactTendonLabel(row.tendonSummary)}
                                  </div>
                                </div>
                              </td>
                              <td className="border-b px-3 py-3 align-top">
                                <div className="space-y-2">
                                  <CompactBadgeGroup
                                    value={row.structuralSectionSummary}
                                    fallbackLabel="Section pending"
                                    maxVisible={2}
                                  />
                                  <div
                                    className="text-xs text-muted-foreground"
                                    title={row.elevationSummary}
                                  >
                                    {firstCompactSummaryLine(row.elevationSummary)}
                                  </div>
                                </div>
                              </td>
                              <td className="border-b px-3 py-3 align-top">
                                <CompactStatusBadges value={row.statusNotes} maxVisible={2} />
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-4 py-8 text-center text-sm text-muted-foreground"
                          >
                            No matching pricing rows.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div
              data-testid="pricing-row-detail-panel"
              className="h-fit rounded-xl border bg-muted/10 p-4 xl:sticky xl:top-4"
            >
              {selectedPileRow ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Selected row detail
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-base font-semibold text-foreground">
                          {selectedPileRow.pileId}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {selectedPileRow.parentJoint} · {selectedPileRow.pileType}
                        </div>
                      </div>
                      <Badge variant="outline">{selectedPileRow.diameter}</Badge>
                    </div>
                    <CompactStatusBadges value={selectedPileRow.statusNotes} maxVisible={3} />
                  </div>

                  <div className="grid gap-3">
                    <DetailField label="Concrete Grade" value={selectedPileRow.concreteGrade} />
                    <DetailField
                      label="Cover / Durability"
                      value={selectedPileRow.coverDurability}
                    />
                    <DetailField
                      label="Reinforcement Summary"
                      value={selectedPileRow.reinforcementSummary}
                    />
                    <DetailField
                      label="Tendon Summary"
                      value={formatDetailValue('tendon', selectedPileRow.tendonSummary)}
                    />
                    <DetailField
                      label="Founding / Socket Material"
                      value={formatDetailValue(
                        'foundingSocketMaterial',
                        selectedPileRow.foundingSocketMaterial,
                      )}
                    />
                    <DetailField
                      label="Adopted Socket Length"
                      value={formatDetailValue(
                        'adoptedSocketLength',
                        selectedPileRow.adoptedSocketLength,
                      )}
                    />
                    <DetailField label="Cage Length" value={selectedPileRow.cageLength} />
                    <DetailField
                      label="Structural Section Summary"
                      value={selectedPileRow.structuralSectionSummary}
                    />
                    <DetailField
                      label="Elevation Summary"
                      value={selectedPileRow.elevationSummary}
                    />
                    <DetailField label="Status / Notes" value={selectedPileRow.statusNotes} />
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Select a pricing row to review the full read-only schedule detail.
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base">Type Quantity Summary</CardTitle>
              <CardDescription>Primary compact takeoff table grouped by pile type.</CardDescription>
            </div>
            <div className="w-full max-w-xs">
              <ControlField label="Sort rows">
                <Select
                  value={typeSortValue}
                  onValueChange={(value) => setTypeSortValue(value as TypeSortValue)}
                >
                  <SelectTrigger aria-label="Sort type quantity summary rows">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="count:desc">Count (high to low)</SelectItem>
                    <SelectItem value="count:asc">Count (low to high)</SelectItem>
                    <SelectItem value="pileType:asc">Pile type (A-Z)</SelectItem>
                    <SelectItem value="pileType:desc">Pile type (Z-A)</SelectItem>
                    <SelectItem value="diameter:desc">Diameter (large to small)</SelectItem>
                    <SelectItem value="diameter:asc">Diameter (small to large)</SelectItem>
                  </SelectContent>
                </Select>
              </ControlField>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-hidden rounded-lg border">
            <div className="overflow-auto">
              <table className="min-w-[980px] w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <StickyTableHead>Pile Type</StickyTableHead>
                    <StickyTableHead>Count</StickyTableHead>
                    <StickyTableHead>Diameter</StickyTableHead>
                    <StickyTableHead>Concrete / Cover</StickyTableHead>
                    <StickyTableHead>Reinforcement</StickyTableHead>
                    <StickyTableHead>Socket / Cage</StickyTableHead>
                    <StickyTableHead>Section / Elevation</StickyTableHead>
                  </tr>
                </thead>
                <tbody>
                  {sortedTypeSummaryRows.length > 0 ? (
                    sortedTypeSummaryRows.map((row) => {
                      const isSelected = row.pileTypeId === selectedTypeRow?.pileTypeId;
                      return (
                        <tr
                          key={row.pileTypeId}
                          className={cn(
                            'cursor-pointer align-top transition-colors hover:bg-muted/40',
                            isSelected && 'bg-muted/60',
                          )}
                          aria-selected={isSelected}
                          tabIndex={0}
                          onClick={() => setSelectedTypeId(row.pileTypeId)}
                          onKeyDown={(event) =>
                            handleSelectableRowKeyDown(event, () =>
                              setSelectedTypeId(row.pileTypeId),
                            )
                          }
                        >
                          <td className="border-b px-3 py-3 align-top">
                            <div className="flex items-start justify-between gap-2">
                              <div className="font-semibold text-foreground">{row.pileType}</div>
                              {isSelected ? (
                                <Badge variant="secondary" className="shrink-0">
                                  Focus
                                </Badge>
                              ) : null}
                            </div>
                          </td>
                          <td className="border-b px-3 py-3 align-top">
                            <span className="font-semibold">{row.count}</span>
                          </td>
                          <td className="border-b px-3 py-3 align-top">{row.diameter}</td>
                          <td className="border-b px-3 py-3 align-top">
                            <CompactPrimarySecondary
                              primary={primaryCommercialLabel(row.concreteGrade)}
                              secondary={primaryCommercialLabel(row.coverDurability)}
                              title={`${row.concreteGrade}\n${row.coverDurability}`}
                            />
                          </td>
                          <td className="border-b px-3 py-3 align-top">
                            <CompactBadgeGroup
                              value={row.reinforcementSummary}
                              fallbackLabel="Reo pending"
                              maxVisible={2}
                            />
                          </td>
                          <td className="border-b px-3 py-3 align-top">
                            <div
                              className="space-y-2"
                              title={[
                                row.typicalSocketMaterial,
                                row.typicalSocketLength,
                                row.typicalCageLength,
                                formatDetailValue('tendon', row.tendonSummary),
                              ].join('\n')}
                            >
                              <div className="flex flex-wrap gap-1">
                                <CompactInlineBadge
                                  label={compactSocketMaterialLabel(row.typicalSocketMaterial)}
                                />
                                <CompactInlineBadge
                                  label={compactSocketLengthLabel(row.typicalSocketLength)}
                                />
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {compactCageLengthLabel(row.typicalCageLength)} ·{' '}
                                {compactTendonLabel(row.tendonSummary)}
                              </div>
                            </div>
                          </td>
                          <td className="border-b px-3 py-3 align-top">
                            <div className="space-y-2">
                              <CompactBadgeGroup
                                value={row.structuralSectionSummary}
                                fallbackLabel="Section pending"
                                maxVisible={2}
                              />
                              <div
                                className="text-xs text-muted-foreground"
                                title={row.elevationSummary}
                              >
                                {firstCompactSummaryLine(row.elevationSummary)}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-8 text-center text-sm text-muted-foreground"
                      >
                        No active pile types yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {selectedTypeRow ? (
            <div
              data-testid="pricing-type-detail-panel"
              className="rounded-xl border bg-muted/10 p-4"
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Selected type detail
                  </div>
                  <div className="text-base font-semibold text-foreground">
                    {selectedTypeRow.pileType}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{selectedTypeRow.count} piles</Badge>
                  <Badge variant="outline">{selectedTypeRow.diameter}</Badge>
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <DetailField label="Concrete Grade" value={selectedTypeRow.concreteGrade} />
                <DetailField label="Cover / Durability" value={selectedTypeRow.coverDurability} />
                <DetailField
                  label="Reinforcement Summary"
                  value={selectedTypeRow.reinforcementSummary}
                />
                <DetailField
                  label="Tendon Summary"
                  value={formatDetailValue('tendon', selectedTypeRow.tendonSummary)}
                />
                <DetailField
                  label="Typical Socket Material"
                  value={formatDetailValue(
                    'foundingSocketMaterial',
                    selectedTypeRow.typicalSocketMaterial,
                  )}
                />
                <DetailField
                  label="Typical Socket Length"
                  value={formatDetailValue(
                    'adoptedSocketLength',
                    selectedTypeRow.typicalSocketLength,
                  )}
                />
                <DetailField
                  label="Typical Cage Length"
                  value={selectedTypeRow.typicalCageLength}
                />
                <DetailField
                  label="Structural Section Summary"
                  value={selectedTypeRow.structuralSectionSummary}
                />
                <DetailField label="Elevation Summary" value={selectedTypeRow.elevationSummary} />
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base">Pile Type Visual Summary</CardTitle>
              <CardDescription>
                One visual card at a time so large projects stay light to scan.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{data.sectionElevationRows.length} visual types</Badge>
              {data.sectionElevationRows.length > VISUAL_COLLAPSE_THRESHOLD ? (
                <Badge variant="outline">Collapsed by default for larger jobs</Badge>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.sectionElevationRows.length > 0 ? (
            <>
              <div
                data-testid="pricing-type-visual-strip"
                className="flex flex-wrap gap-2 rounded-xl border bg-muted/10 p-3"
              >
                {data.sectionElevationRows.map((row) => {
                  const typeSummary = typeSummaryById.get(row.pileTypeId);
                  const isExpanded = row.pileTypeId === expandedVisualTypeId;
                  return (
                    <button
                      key={row.pileTypeId}
                      type="button"
                      className={cn(
                        'rounded-lg border px-3 py-2 text-left transition-colors',
                        isExpanded
                          ? 'border-primary bg-primary/5 text-foreground'
                          : 'border-border bg-background hover:bg-muted/60',
                      )}
                      onClick={() =>
                        setExpandedVisualTypeId((current) =>
                          current === row.pileTypeId ? null : row.pileTypeId,
                        )
                      }
                    >
                      <div className="text-sm font-semibold">{row.pileType}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {typeSummary ? `${typeSummary.count} piles` : 'Pile type'} ·{' '}
                        {typeSummary?.diameter ?? 'Diameter pending'}
                      </div>
                    </button>
                  );
                })}
              </div>

              {expandedVisualRow ? (
                <SectionElevationCard
                  row={expandedVisualRow}
                  countLabel={
                    typeSummaryById.has(expandedVisualRow.pileTypeId)
                      ? `${typeSummaryById.get(expandedVisualRow.pileTypeId)?.count ?? 0} piles`
                      : undefined
                  }
                />
              ) : (
                <div
                  data-testid="pricing-type-visual-collapsed"
                  className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground"
                >
                  Select a pile type to reveal its section and elevation visual.
                </div>
              )}
            </>
          ) : (
            <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
              No pile type visuals yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function HeaderStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background px-3 py-2.5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1.5 text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

function ControlField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-1.5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
      {children}
    </label>
  );
}

function StickyTableHead({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        'sticky top-0 z-10 border-b bg-background px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground',
        className,
      )}
    >
      {children}
    </th>
  );
}

function CompactPrimarySecondary({
  primary,
  secondary,
  title,
}: {
  primary: string;
  secondary: string;
  title?: string;
}) {
  return (
    <div className="space-y-1" title={title}>
      <div className="font-medium text-foreground">{primary}</div>
      <div className="text-xs text-muted-foreground">{secondary}</div>
    </div>
  );
}

function CompactInlineBadge({
  label,
  variant = 'outline',
}: {
  label: string;
  variant?: 'outline' | 'secondary' | 'warning';
}) {
  return (
    <Badge variant={variant} className="max-w-[12rem] truncate">
      {label}
    </Badge>
  );
}

function CompactBadgeGroup({
  value,
  fallbackLabel,
  maxVisible = 2,
}: {
  value: string;
  fallbackLabel: string;
  maxVisible?: number;
}) {
  const segments = compactSummarySegments(value);

  if (!segments.length) {
    return <CompactInlineBadge label={fallbackLabel} variant="warning" />;
  }

  const visibleSegments = segments.slice(0, maxVisible);
  const hiddenCount = Math.max(0, segments.length - visibleSegments.length);

  return (
    <div className="flex flex-wrap gap-1" title={value}>
      {visibleSegments.map((segment) => (
        <CompactInlineBadge key={`${value}-${segment}`} label={segment} variant="secondary" />
      ))}
      {hiddenCount > 0 ? <CompactInlineBadge label={`+${hiddenCount} more`} /> : null}
    </div>
  );
}

function CompactStatusBadges({ value, maxVisible = 2 }: { value: string; maxVisible?: number }) {
  const tokens = buildStatusTokens(value);
  const visibleTokens = tokens.slice(0, maxVisible);
  const hiddenCount = Math.max(0, tokens.length - visibleTokens.length);

  return (
    <div className="flex flex-wrap gap-1" title={value}>
      {visibleTokens.map((token) => (
        <Badge
          key={`${value}-${token}`}
          variant={statusBadgeVariant(token)}
          className="max-w-[13rem] truncate"
        >
          {compactStatusToken(token)}
        </Badge>
      ))}
      {hiddenCount > 0 ? <CompactInlineBadge label={`+${hiddenCount} more`} /> : null}
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 whitespace-pre-wrap text-sm text-foreground">{value}</div>
    </div>
  );
}

function SectionElevationCard({
  row,
  countLabel,
}: {
  row: PricingSectionElevationRow;
  countLabel?: string;
}) {
  const canRenderSectionVisual = canRenderMultiPileSectionSketch(
    row.pileTypeDefinition,
    row.structSettings,
  );
  const canRenderElevationVisual = canRenderMultiPileElevationSketch(
    row.pileTypeDefinition,
    row.structSettings,
  );

  return (
    <div data-testid="pricing-type-visual-card" className="rounded-xl border bg-muted/10 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-base font-semibold text-foreground">{row.pileType}</div>
          <div className="text-sm text-muted-foreground">
            {countLabel ?? 'Selected pile type visual'}
          </div>
        </div>
        <Badge variant="outline">One type expanded</Badge>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <VisualSummaryPanel title="Section Sketch">
          {canRenderSectionVisual && row.pileTypeDefinition && row.structSettings ? (
            <MultiPileSectionSketch
              type={row.pileTypeDefinition}
              settings={row.structSettings}
              className="max-w-[220px]"
            />
          ) : (
            <VisualFallback />
          )}
        </VisualSummaryPanel>

        <VisualSummaryPanel title="Reinforcement Elevation">
          {canRenderElevationVisual && row.pileTypeDefinition && row.structSettings ? (
            <MultiPileElevationSketch
              type={row.pileTypeDefinition}
              settings={row.structSettings}
              className="max-w-[220px]"
            />
          ) : (
            <VisualFallback />
          )}
        </VisualSummaryPanel>
      </div>

      <div className="mt-4 grid gap-3 text-sm lg:grid-cols-2">
        <CaptionBlock label="Structural Section Summary" value={row.structuralSectionSummary} />
        <CaptionBlock label="Elevation Summary" value={row.elevationSummary} />
      </div>
    </div>
  );
}

function VisualSummaryPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </div>
      <div className="mt-3 flex min-h-[220px] items-center justify-center">{children}</div>
    </div>
  );
}

function VisualFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center rounded-lg border border-dashed bg-muted/40 p-4 text-center text-sm text-muted-foreground">
      Text-only summary below
    </div>
  );
}

function CaptionBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-foreground">{value}</div>
    </div>
  );
}

function handleSelectableRowKeyDown(event: KeyboardEvent<HTMLElement>, onSelect: () => void) {
  if (event.key !== 'Enter' && event.key !== ' ') {
    return;
  }
  event.preventDefault();
  onSelect();
}

function applyWorksheetWrapText({
  XLSX,
  worksheet,
  rowCount,
  columnIndexes,
}: {
  XLSX: typeof import('xlsx');
  worksheet: Record<string, CellObject | unknown>;
  rowCount: number;
  columnIndexes: number[];
}) {
  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    columnIndexes.forEach((columnIndex) => {
      const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
      const cell = worksheet[cellAddress] as CellObject | undefined;
      if (!cell) {
        return;
      }
      cell.s = {
        ...(cell.s ?? {}),
        alignment: {
          ...(cell.s?.alignment ?? {}),
          vertical: 'top',
          wrapText: true,
        },
      };
    });
  }
}

function buildStatusTokens(statusNotes: string) {
  if (!statusNotes || statusNotes === 'Ready') {
    return ['Ready'];
  }
  return statusNotes
    .split('·')
    .map((token) => token.trim())
    .filter(Boolean);
}

function compactStatusToken(token: string) {
  switch (token) {
    case 'Ready':
      return 'Ready';
    case 'Pile type pending':
      return 'Type pending';
    case 'Founding material pending':
      return 'Material pending';
    case 'Socket pending':
      return 'Socket pending';
    case 'No stored GEO result':
      return 'No stored GEO result';
    case 'No stored struct selection':
      return 'Struct pending';
    case 'Project structural defaults unresolved':
      return 'Project detail missing';
    default:
      return token;
  }
}

function statusBadgeVariant(token: string) {
  if (token === 'Ready') {
    return 'success' as const;
  }
  const normalized = token.toLowerCase();
  if (
    normalized.includes('pending') ||
    normalized.includes('missing') ||
    normalized.includes('no stored') ||
    normalized.startsWith('no ') ||
    normalized.includes('unresolved')
  ) {
    return 'warning' as const;
  }
  return 'outline' as const;
}

function compactSummarySegments(value: string) {
  if (!value || value === EMPTY_VALUE || value === PENDING_VALUE) {
    return [];
  }
  return value
    .split(';')
    .map((segment) => compactSummarySegment(segment.trim()))
    .filter(Boolean);
}

function compactSummarySegment(segment: string) {
  return segment
    .replace(/^Plain circular pile$/i, 'Plain pile')
    .replace(/^Partially reinforced circular pile$/i, 'Partial pile')
    .replace(/^Reinforced circular pile$/i, 'Reinf pile')
    .replace(/^Full-depth cage to toe$/i, 'Full-depth cage')
    .replace(/^Perimeter cage full depth to toe$/i, 'Perim cage full-depth')
    .replace(/^Perimeter cage /i, 'Perim cage ')
    .replace(/^Head detail: /i, 'Head: ')
    .replace(/^Central head detail: /i, 'Ctr head: ')
    .replace(/\bperimeter\b/gi, 'perim')
    .replace(/\bcentral\b/gi, 'ctr')
    .replace(/\bspiral\b/gi, 'spir')
    .replace(/\bprojection\b/gi, 'proj')
    .replace(/\bdevelopment\b/gi, 'dev')
    .replace(/\bcut off\b/gi, 'cut')
    .replace(/^perim /i, 'Perim ')
    .replace(/^ctr /i, 'Ctr ')
    .trim();
}

function firstCompactSummaryLine(value: string) {
  const [firstSegment] = compactSummarySegments(value);
  if (firstSegment) {
    return firstSegment;
  }
  if (value === PENDING_VALUE) {
    return 'Pending';
  }
  return value || EMPTY_VALUE;
}

function primaryCommercialLabel(value: string) {
  if (!value || value === EMPTY_VALUE) {
    return EMPTY_VALUE;
  }
  if (value === PENDING_VALUE) {
    return 'Pending';
  }
  const [primary] = value
    .split('·')
    .map((part) => part.trim())
    .filter(Boolean);
  return primary || value;
}

function compactSocketMaterialLabel(value: string) {
  if (!value || value === EMPTY_VALUE) {
    return 'Material pending';
  }
  if (value === PENDING_VALUE) {
    return 'Material pending';
  }
  const [primary] = value
    .split('—')
    .map((part) => part.trim())
    .filter(Boolean);
  return primary || value;
}

function compactSocketLengthLabel(value: string) {
  if (!value || value === EMPTY_VALUE || value === PENDING_VALUE) {
    return 'Socket pending';
  }
  return value;
}

function compactCageLengthLabel(value: string) {
  if (!value || value === EMPTY_VALUE) {
    return 'Cage pending';
  }
  if (value === PENDING_VALUE) {
    return 'Cage pending';
  }
  return value
    .replace(/^Full depth$/i, 'Full-depth cage')
    .replace(/^Full depth \(to toe\)$/i, 'Full-depth cage')
    .replace(/^Partial cage/i, 'Partial cage')
    .replace(/^No cage$/i, 'No cage');
}

function compactTendonLabel(value: string) {
  if (!value || value === EMPTY_VALUE) {
    return 'No tendon';
  }
  if (value === PENDING_VALUE) {
    return 'Tendon pending';
  }
  return primaryCommercialLabel(value);
}

function formatDetailValue(
  field: 'tendon' | 'foundingSocketMaterial' | 'adoptedSocketLength' | 'default',
  value: string,
) {
  if (field === 'tendon') {
    if (!value || value === EMPTY_VALUE) {
      return 'No tendon';
    }
    return value;
  }
  if (field === 'foundingSocketMaterial' && value === PENDING_VALUE) {
    return 'Socket pending';
  }
  if (field === 'adoptedSocketLength' && value === PENDING_VALUE) {
    return 'Socket pending';
  }
  return value || EMPTY_VALUE;
}

function extractFirstNumber(value: string) {
  const match = value.match(/-?\d+(?:\.\d+)?/);
  if (!match) {
    return Number.NaN;
  }
  return Number(match[0]);
}
