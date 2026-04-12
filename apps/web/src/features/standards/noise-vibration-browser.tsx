'use client';

import { useMemo, useState } from 'react';
import { BookOpen, Search, SlidersHorizontal } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { PageLoading } from '@/components/loading';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useNoiseVibrationCriteria, useNoiseVibrationSources } from '@/hooks/use-standards';
import {
  NOISE_VIBRATION_CRITERION_CATEGORY_OPTIONS,
  NOISE_VIBRATION_INSTRUMENT_TYPE_OPTIONS,
  NOISE_VIBRATION_LEGAL_STATUS_OPTIONS,
  NOISE_VIBRATION_METRIC_OPTIONS,
  NOISE_VIBRATION_RECEIVER_TYPE_OPTIONS,
  NOISE_VIBRATION_TIME_PERIOD_OPTIONS,
  NOISE_VIBRATION_WORK_TYPE_OPTIONS,
  type NoiseVibrationCriteriaFilters,
  type NoiseVibrationCriterionRow,
  type NoiseVibrationStandardSource,
} from './noise-vibration-types';

const ALL_FILTER = '__all__';

export function NoiseVibrationStandardsBrowser() {
  const [filters, setFilters] = useState<NoiseVibrationCriteriaFilters>({});
  const { data: sources, isLoading: sourcesLoading } = useNoiseVibrationSources();
  const { data: criteria, isLoading: criteriaLoading } = useNoiseVibrationCriteria(filters);

  const groupedCriteria = useMemo(() => groupCriteria(criteria ?? []), [criteria]);
  const loading = sourcesLoading || criteriaLoading;

  function setFilter(key: keyof NoiseVibrationCriteriaFilters, value: string) {
    setFilters((current) => ({
      ...current,
      [key]: value === ALL_FILTER ? undefined : value,
    }));
  }

  return (
    <>
      <PageHeader
        title="Noise and Vibration Standards"
        description="A structured reference registry for construction noise and vibration criteria. It is not a calculator, CNVMP builder, monitoring workflow, or project-specific compliance engine."
        badges={<Badge variant="outline">Reference data only</Badge>}
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </CardTitle>
          <CardDescription>
            Browse seeded NSW and commonly conditioned criteria by source, receiver, activity,
            time period, and metric.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <FilterSelect
              label="Source"
              value={filters.sourceSlug}
              placeholder="All sources"
              options={(sources ?? []).map((source) => ({
                value: source.slug,
                label: source.shortName,
              }))}
              onChange={(value) => setFilter('sourceSlug', value)}
            />
            <FilterSelect
              label="Category"
              value={filters.criterionCategory}
              placeholder="All categories"
              options={NOISE_VIBRATION_CRITERION_CATEGORY_OPTIONS}
              onChange={(value) => setFilter('criterionCategory', value)}
            />
            <FilterSelect
              label="Receiver"
              value={filters.receiverType}
              placeholder="All receivers"
              options={NOISE_VIBRATION_RECEIVER_TYPE_OPTIONS}
              onChange={(value) => setFilter('receiverType', value)}
            />
            <FilterSelect
              label="Work type"
              value={filters.workType}
              placeholder="All work types"
              options={NOISE_VIBRATION_WORK_TYPE_OPTIONS}
              onChange={(value) => setFilter('workType', value)}
            />
            <FilterSelect
              label="Time period"
              value={filters.timePeriod}
              placeholder="All time periods"
              options={NOISE_VIBRATION_TIME_PERIOD_OPTIONS}
              onChange={(value) => setFilter('timePeriod', value)}
            />
            <FilterSelect
              label="Legal status"
              value={filters.legalStatus}
              placeholder="All legal statuses"
              options={NOISE_VIBRATION_LEGAL_STATUS_OPTIONS}
              onChange={(value) => setFilter('legalStatus', value)}
            />
            <FilterSelect
              label="Instrument"
              value={filters.instrumentType}
              placeholder="All instruments"
              options={NOISE_VIBRATION_INSTRUMENT_TYPE_OPTIONS}
              onChange={(value) => setFilter('instrumentType', value)}
            />
            <FilterSelect
              label="Metric"
              value={filters.metric}
              placeholder="All metrics"
              options={NOISE_VIBRATION_METRIC_OPTIONS}
              onChange={(value) => setFilter('metric', value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="noise-vibration-search">Search</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="noise-vibration-search"
                value={filters.q ?? ''}
                onChange={(event) => setFilter('q', event.target.value)}
                placeholder="Search RBL, DIN, VDV, airblast, receiver type, or clause"
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <BookOpen className="h-4 w-4" />
        <span>
          {criteria?.length ?? 0} criterion row{criteria?.length === 1 ? '' : 's'} across{' '}
          {sources?.length ?? 0} seeded source{sources?.length === 1 ? '' : 's'}
        </span>
      </div>

      {loading ? (
        <PageLoading />
      ) : groupedCriteria.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No criteria found</CardTitle>
            <CardDescription>
              Adjust the filters to browse the seeded reference registry.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-5">
          {groupedCriteria.map((sourceGroup) => (
            <Card key={sourceGroup.source.slug}>
              <CardHeader className="space-y-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <CardTitle className="text-lg">{sourceGroup.source.name}</CardTitle>
                    <CardDescription>
                      {sourceGroup.source.publisher} · {sourceGroup.source.jurisdiction} ·{' '}
                      {sourceGroup.source.year}
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={sourceGroup.source.publicationStatus === 'active' ? 'success' : 'warning'}>
                      {formatStatus(sourceGroup.source.publicationStatus)}
                    </Badge>
                    <Badge variant={sourceGroup.source.legalStatus === 'enforceable' ? 'success' : 'secondary'}>
                      {formatStatus(sourceGroup.source.legalStatus)}
                    </Badge>
                    <Badge variant="outline">{formatStatus(sourceGroup.source.instrumentType)}</Badge>
                    {sourceGroup.source.notes?.toLowerCase().includes('commonly conditioned') ? (
                      <Badge variant="warning">Commonly conditioned in NSW</Badge>
                    ) : null}
                  </div>
                </div>
                {sourceGroup.source.notes ? (
                  <p className="text-sm text-muted-foreground">{sourceGroup.source.notes}</p>
                ) : null}
              </CardHeader>
              <CardContent className="space-y-5">
                {sourceGroup.groups.map((group) => (
                  <section key={`${sourceGroup.source.slug}-${group.group.slug}`} className="space-y-3">
                    <div className="border-b pb-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-semibold">{group.group.title}</h2>
                        <Badge variant="outline">
                          {labelFor(NOISE_VIBRATION_CRITERION_CATEGORY_OPTIONS, group.group.criterionCategory)}
                        </Badge>
                        <Badge variant="secondary">
                          {labelFor(NOISE_VIBRATION_METRIC_OPTIONS, group.group.metric)}
                        </Badge>
                        {group.group.locationBasis ? (
                          <Badge variant="outline">{formatStatus(group.group.locationBasis)}</Badge>
                        ) : null}
                      </div>
                      {group.group.description ? (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {group.group.description}
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      {group.rows.map((row) => (
                        <CriterionRowItem key={row.id} row={row} />
                      ))}
                    </div>
                  </section>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

function FilterSelect({
  label,
  value,
  placeholder,
  options,
  onChange,
}: {
  label: string;
  value?: string;
  placeholder: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  onChange: (value: string | typeof ALL_FILTER) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value ?? ALL_FILTER} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_FILTER}>{placeholder}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function CriterionRowItem({ row }: { row: NoiseVibrationCriterionRow }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div>
            <h3 className="font-medium">{row.label}</h3>
            <p className="text-xs text-muted-foreground">
              {row.source.shortName} · {row.source.jurisdiction} · {row.source.year} ·{' '}
              {formatStatus(row.source.publicationStatus)} · {formatStatus(row.source.legalStatus)} ·{' '}
              {formatStatus(row.source.instrumentType)}
            </p>
          </div>
          <p className="text-sm font-semibold">{formatCriterionExpression(row)}</p>
          <div className="flex flex-wrap gap-1.5">
            {row.receiverType ? (
              <Badge variant="secondary">
                {labelFor(NOISE_VIBRATION_RECEIVER_TYPE_OPTIONS, row.receiverType)}
              </Badge>
            ) : null}
            {row.structureType ? <Badge variant="secondary">{row.structureType}</Badge> : null}
            {row.timePeriod ? (
              <Badge variant="outline">
                {labelFor(NOISE_VIBRATION_TIME_PERIOD_OPTIONS, row.timePeriod)}
              </Badge>
            ) : null}
            <Badge variant="outline">{labelFor(NOISE_VIBRATION_METRIC_OPTIONS, row.group.metric)}</Badge>
            {row.workTypes.map((workType) => (
              <Badge key={workType} variant="outline">
                {labelFor(NOISE_VIBRATION_WORK_TYPE_OPTIONS, workType)}
              </Badge>
            ))}
          </div>
        </div>
        <div className="text-left text-xs text-muted-foreground lg:max-w-sm lg:text-right">
          {row.sourceClause ? <p>{row.sourceClause}</p> : null}
          {row.rowNotes ? <p className="mt-1">{row.rowNotes}</p> : null}
        </div>
      </div>
    </div>
  );
}

function groupCriteria(rows: NoiseVibrationCriterionRow[]) {
  const sourceMap = new Map<
    string,
    {
      source: NoiseVibrationStandardSource;
      groups: Array<{
        group: NoiseVibrationCriterionRow['group'];
        rows: NoiseVibrationCriterionRow[];
      }>;
    }
  >();

  for (const row of rows) {
    const sourceGroup =
      sourceMap.get(row.source.slug) ?? { source: row.source, groups: [] };
    let group = sourceGroup.groups.find((entry) => entry.group.id === row.group.id);
    if (!group) {
      group = { group: row.group, rows: [] };
      sourceGroup.groups.push(group);
    }
    group.rows.push(row);
    sourceMap.set(row.source.slug, sourceGroup);
  }

  return Array.from(sourceMap.values()).map((sourceGroup) => ({
    ...sourceGroup,
    groups: sourceGroup.groups
      .map((group) => ({
        ...group,
        rows: [...group.rows].sort((left, right) => left.sortOrder - right.sortOrder),
      }))
      .sort((left, right) => left.group.sortOrder - right.group.sortOrder),
  }));
}

function formatCriterionExpression(row: NoiseVibrationCriterionRow) {
  if (row.weekdayStart || row.saturdayStart) {
    return formatWorkingHours(row);
  }

  if (row.basisType === 'relative_to_rbl') {
    return `${row.referenceBase ?? 'RBL'} + ${formatNumber(row.relativeOffset)} ${row.unit ?? 'dB'}`;
  }

  const parts: string[] = [];
  const frequency = formatFrequency(row);
  if (row.preferredValue !== null || row.maximumValue !== null) {
    parts.push(
      [
        row.preferredValue !== null
          ? `preferred ${formatNumber(row.preferredValue)} ${row.unit ?? ''}`.trim()
          : null,
        row.maximumValue !== null
          ? `maximum ${formatNumber(row.maximumValue)} ${row.unit ?? ''}`.trim()
          : null,
      ]
        .filter(Boolean)
        .join(', '),
    );
  }
  if (row.valueMin !== null || row.valueMax !== null) {
    parts.push(
      `${formatNumber(row.valueMin)}-${formatNumber(row.valueMax)} ${row.unit ?? ''}${frequency}`.trim(),
    );
  }
  if (row.criterionValue !== null) {
    parts.push(`${formatNumber(row.criterionValue)} ${row.unit ?? ''}${frequency}`.trim());
  }
  if (row.alertValue !== null) {
    parts.push(`alert ${formatNumber(row.alertValue)} ${row.unit ?? ''}`.trim());
  }
  if (row.stopWorkValue !== null) {
    parts.push(`stop work ${formatNumber(row.stopWorkValue)} ${row.unit ?? ''}`.trim());
  }
  if (row.absoluteMaxValue !== null) {
    parts.push(`absolute max ${formatNumber(row.absoluteMaxValue)} ${row.unit ?? ''}`.trim());
  }
  if (row.exceedanceAllowancePercent !== null) {
    parts.push(
      `${formatNumber(row.exceedanceAllowancePercent)}% exceedance allowance${
        row.exceedanceWindowText ? ` over ${row.exceedanceWindowText.replace(/^5% of blasts over /, '')}` : ''
      }`,
    );
  }

  return parts.filter(Boolean).join('; ') || 'Descriptive criterion';
}

function formatWorkingHours(row: NoiseVibrationCriterionRow) {
  const parts = [
    row.weekdayStart && row.weekdayEnd ? `Mon-Fri ${row.weekdayStart}-${row.weekdayEnd}` : null,
    row.saturdayStart && row.saturdayEnd ? `Sat ${row.saturdayStart}-${row.saturdayEnd}` : null,
    row.sundayAllowed === false ? 'no Sunday work' : row.sundayAllowed === true ? 'Sunday allowed' : null,
    row.publicHolidayAllowed === false
      ? 'no public holiday work'
      : row.publicHolidayAllowed === true
        ? 'public holidays allowed'
        : null,
  ];
  return parts.filter(Boolean).join('; ');
}

function formatFrequency(row: NoiseVibrationCriterionRow) {
  if (row.frequencyMinHz !== null && row.frequencyMaxHz !== null) {
    return ` @ ${formatNumber(row.frequencyMinHz)}-${formatNumber(row.frequencyMaxHz)} Hz`;
  }
  if (row.frequencyMinHz !== null) {
    return ` @ >=${formatNumber(row.frequencyMinHz)} Hz`;
  }
  if (row.frequencyMaxHz !== null) {
    return ` @ <${formatNumber(row.frequencyMaxHz)} Hz`;
  }
  return '';
}

function formatNumber(value: string | null) {
  if (value === null) {
    return '';
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return value;
  }
  return Number.isInteger(numeric) ? String(numeric) : String(numeric);
}

function labelFor<T extends string>(
  options: ReadonlyArray<{ value: T; label: string }>,
  value: T,
) {
  return options.find((option) => option.value === value)?.label ?? formatStatus(value);
}

function formatStatus(value: string) {
  return value.replace(/_/g, ' ');
}
