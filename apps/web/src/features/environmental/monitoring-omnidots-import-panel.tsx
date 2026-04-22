'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  CloudDownload,
  Database,
  ExternalLink,
  RefreshCcw,
  ShieldCheck,
  Table2,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { toast } from 'sonner';
import type { ProjectEnvironmentalMonitoringReport } from './environmental-monitoring-types';
import {
  OMNIDOTS_IMPORT_PANEL_ID,
  OMNIDOTS_MONITORING_METRIC_OPTIONS,
  type OmnidotsDatasetPreviewRow,
  type OmnidotsMonitoringMetricKey,
} from './monitoring-omnidots-types';
import {
  useBuildEnvironmentalMonitoringOmnidotsDataset,
  useCreateEnvironmentalMonitoringOmnidotsConnection,
  useCreateVibrationResultsFromEnvironmentalMonitoringOmnidotsDataset,
  useEnvironmentalMonitoringOmnidotsConnections,
  useEnvironmentalMonitoringOmnidotsMeasuringPoints,
  useImportEnvironmentalMonitoringOmnidots,
  useSyncEnvironmentalMonitoringOmnidotsMeasuringPoints,
  useUpdateEnvironmentalMonitoringOmnidotsConnection,
  useValidateEnvironmentalMonitoringOmnidotsConnection,
} from '@/hooks/use-environmental-monitoring';
import { ApiError } from '@/lib/api-client';

const NO_CONNECTION_VALUE = '__no_connection__';
const NO_MEASURING_POINT_VALUE = '__no_measuring_point__';
const OMNIDOTS_TOKEN_HELP_ARTICLE_URL =
  'https://support.omnidots.com/where-can-i-find-omnidots-api-documentation-and-api-tokens';

type MonitoringOmnidotsImportPanelProps = {
  projectId: string;
  reportId: string;
  report: ProjectEnvironmentalMonitoringReport;
};

export function MonitoringOmnidotsImportPanel({
  projectId,
  reportId,
  report,
}: MonitoringOmnidotsImportPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasManuallySelectedConnection, setHasManuallySelectedConnection] = useState(false);
  const [selectedConnectionValue, setSelectedConnectionValue] = useState('');
  const [selectedMeasuringPointId, setSelectedMeasuringPointId] = useState<string | null>(null);
  const [tokenDraft, setTokenDraft] = useState('');
  const [displayNameDraft, setDisplayNameDraft] = useState('');
  const [dateFrom, setDateFrom] = useState(toDateTimeLocalValue(report.monitoringWindowStart));
  const [dateTo, setDateTo] = useState(toDateTimeLocalValue(report.monitoringWindowEnd));
  const [selectedMetricKeys, setSelectedMetricKeys] = useState<OmnidotsMonitoringMetricKey[]>([
    'vtop',
    'vdv',
    'veff_max',
  ]);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const connectionsQuery = useEnvironmentalMonitoringOmnidotsConnections(projectId, reportId);
  const connections = useMemo(() => connectionsQuery.data ?? [], [connectionsQuery.data]);
  const selectedConnectionId =
    selectedConnectionValue && selectedConnectionValue !== NO_CONNECTION_VALUE
      ? selectedConnectionValue
      : null;
  const selectedConnection =
    connections.find((connection) => connection.id === selectedConnectionId) ?? null;

  const measuringPointsQuery = useEnvironmentalMonitoringOmnidotsMeasuringPoints(
    projectId,
    reportId,
    selectedConnectionId,
  );
  const measuringPointState = measuringPointsQuery.data;
  const measuringPoints = useMemo(
    () => measuringPointState?.measuringPoints ?? [],
    [measuringPointState?.measuringPoints],
  );

  const createConnectionMutation = useCreateEnvironmentalMonitoringOmnidotsConnection(
    projectId,
    reportId,
  );
  const updateConnectionMutation = useUpdateEnvironmentalMonitoringOmnidotsConnection(
    projectId,
    reportId,
  );
  const validateConnectionMutation = useValidateEnvironmentalMonitoringOmnidotsConnection(
    projectId,
    reportId,
  );
  const syncMeasuringPointsMutation = useSyncEnvironmentalMonitoringOmnidotsMeasuringPoints(
    projectId,
    reportId,
  );
  const importMutation = useImportEnvironmentalMonitoringOmnidots(projectId, reportId);
  const buildDatasetMutation = useBuildEnvironmentalMonitoringOmnidotsDataset(projectId, reportId);
  const createRowsMutation =
    useCreateVibrationResultsFromEnvironmentalMonitoringOmnidotsDataset(projectId, reportId);
  const latestDataset =
    buildDatasetMutation.data?.latestDataset ?? measuringPointState?.latestDataset ?? null;
  const latestImportJob =
    buildDatasetMutation.data?.latestImportJob ?? measuringPointState?.latestImportJob ?? null;
  const importSummary = importMutation.data?.importSummary ?? null;

  useEffect(() => {
    if (connections.length === 0) {
      if (selectedConnectionValue !== NO_CONNECTION_VALUE) {
        setSelectedConnectionValue(NO_CONNECTION_VALUE);
      }
      return;
    }

    if (
      (!hasManuallySelectedConnection &&
        (!selectedConnectionValue || selectedConnectionValue === NO_CONNECTION_VALUE)) ||
      (selectedConnectionValue !== NO_CONNECTION_VALUE &&
        !connections.some((connection) => connection.id === selectedConnectionValue))
    ) {
      setSelectedConnectionValue(connections[0]?.id ?? NO_CONNECTION_VALUE);
    }
  }, [connections, hasManuallySelectedConnection, selectedConnectionValue]);

  useEffect(() => {
    if (!selectedConnection) {
      setDisplayNameDraft('');
      return;
    }

    setDisplayNameDraft(selectedConnection.displayName ?? '');
  }, [selectedConnection]);

  useEffect(() => {
    if (!selectedMeasuringPointId && measuringPoints.length > 0) {
      setSelectedMeasuringPointId(measuringPoints[0]?.id ?? null);
      return;
    }

    if (
      selectedMeasuringPointId &&
      !measuringPoints.some((measuringPoint) => measuringPoint.id === selectedMeasuringPointId)
    ) {
      setSelectedMeasuringPointId(measuringPoints[0]?.id ?? null);
    }
  }, [measuringPoints, selectedMeasuringPointId]);

  useEffect(() => {
    if (latestDataset) {
      setIsExpanded(true);
    }
  }, [latestDataset]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (window.location.hash !== `#${OMNIDOTS_IMPORT_PANEL_ID}`) {
      return;
    }

    setIsExpanded(true);

    const timer = window.setTimeout(() => {
      panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      panelRef.current?.focus();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const canRunImport = !!selectedConnectionId && !!selectedMeasuringPointId && !!dateFrom && !!dateTo;

  const selectedMetricLabel = useMemo(
    () =>
      selectedMetricKeys.length === 0
        ? 'No metrics selected'
        : selectedMetricKeys
            .map(
              (metricKey) =>
                OMNIDOTS_MONITORING_METRIC_OPTIONS.find((option) => option.value === metricKey)
                  ?.label ?? metricKey,
            )
            .join(', '),
    [selectedMetricKeys],
  );

  async function handleSaveToken() {
    if (!tokenDraft.trim()) {
      toast.error('Enter an Omnidots token before saving');
      return;
    }

    try {
      if (selectedConnectionId) {
        await updateConnectionMutation.mutateAsync({
          connectionId: selectedConnectionId,
          data: {
            displayName: displayNameDraft.trim() || undefined,
            token: tokenDraft.trim(),
          },
        });
        toast.success('Omnidots token updated');
      } else {
        const connection = await createConnectionMutation.mutateAsync({
          displayName: displayNameDraft.trim() || undefined,
          token: tokenDraft.trim(),
        });
        setSelectedConnectionValue(connection.id);
        toast.success('Omnidots connection created');
      }

      setTokenDraft('');
    } catch (error) {
      toast.error(resolveApiMessage(error, 'Failed to save Omnidots token'));
    }
  }

  async function handleValidate() {
    if (!selectedConnectionId) {
      toast.error('Choose or create a connection first');
      return;
    }

    try {
      const result = await validateConnectionMutation.mutateAsync(selectedConnectionId);
      if (result.validation.valid) {
        toast.success('Omnidots token validated');
      } else {
        toast.error(result.validation.message ?? 'Token validation failed');
      }
    } catch (error) {
      toast.error(resolveApiMessage(error, 'Failed to validate Omnidots token'));
    }
  }

  async function handleSyncMeasuringPoints() {
    if (!selectedConnectionId) {
      toast.error('Choose or create a connection first');
      return;
    }

    try {
      const result = await syncMeasuringPointsMutation.mutateAsync(selectedConnectionId);
      if (result.sync.status === 'completed') {
        toast.success(
          `Measuring points synced (${result.sync.createdCount} created, ${result.sync.updatedCount} updated)`,
        );
      } else {
        toast.error(result.sync.errorMessage ?? 'Measuring point sync failed');
      }
    } catch (error) {
      toast.error(resolveApiMessage(error, 'Failed to sync Omnidots measuring points'));
    }
  }

  async function handleImport() {
    if (!selectedConnectionId || !selectedMeasuringPointId) {
      toast.error('Choose a connection and measuring point first');
      return;
    }

    if (!dateFrom || !dateTo) {
      toast.error('Choose an import date range first');
      return;
    }

    if (selectedMetricKeys.length === 0) {
      toast.error('Select at least one metric to import');
      return;
    }

    try {
      await importMutation.mutateAsync({
        connectionId: selectedConnectionId,
        measuringPointId: selectedMeasuringPointId,
        dateFrom: toIsoDateTime(dateFrom) ?? dateFrom,
        dateTo: toIsoDateTime(dateTo) ?? dateTo,
        selectedMetricKeys,
      });
      toast.success('Omnidots data imported');
    } catch (error) {
      toast.error(resolveApiMessage(error, 'Failed to import Omnidots data'));
    }
  }

  async function handleBuildDataset() {
    if (!selectedConnectionId || !selectedMeasuringPointId) {
      toast.error('Choose a connection and measuring point first');
      return;
    }

    if (!dateFrom || !dateTo) {
      toast.error('Choose an import date range first');
      return;
    }

    if (selectedMetricKeys.length === 0) {
      toast.error('Select at least one metric to include');
      return;
    }

    try {
      const result = await buildDatasetMutation.mutateAsync({
        connectionId: selectedConnectionId,
        measuringPointId: selectedMeasuringPointId,
        dateFrom: toIsoDateTime(dateFrom) ?? dateFrom,
        dateTo: toIsoDateTime(dateTo) ?? dateTo,
        selectedMetricKeys,
      });

      toast.success(
        result.created
          ? 'Frozen Omnidots dataset snapshot created'
          : 'Existing frozen Omnidots dataset snapshot refreshed',
      );
    } catch (error) {
      toast.error(resolveApiMessage(error, 'Failed to build Omnidots dataset snapshot'));
    }
  }

  async function handleCreateVibrationRows() {
    if (!latestDataset) {
      toast.error('Build or refresh a dataset snapshot first');
      return;
    }

    try {
      const result = await createRowsMutation.mutateAsync(latestDataset.id);
      toast.success(
        `Created ${result.createdCount} vibration result row${result.createdCount === 1 ? '' : 's'}`,
      );
    } catch (error) {
      toast.error(resolveApiMessage(error, 'Failed to create vibration result rows'));
    }
  }

  return (
    <Card
      id={OMNIDOTS_IMPORT_PANEL_ID}
      ref={panelRef}
      tabIndex={-1}
      className="mb-6 scroll-mt-6 border-sky-200 bg-sky-50/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Import from Omnidots Honeycomb</CardTitle>
            {selectedConnection ? (
              <Badge variant="outline">{selectedConnection.status}</Badge>
            ) : (
              <Badge variant="outline">Not connected</Badge>
            )}
          </div>
          <CardDescription>
            Sync Omnidots measuring points, import selected vibration metrics, build a frozen
            dataset snapshot, and preview imported values before creating authored result rows.
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded((current) => !current)}
        >
          {isExpanded ? <ChevronDown className="mr-2 h-4 w-4" /> : <ChevronRight className="mr-2 h-4 w-4" />}
          {isExpanded ? 'Hide Import Panel' : 'Show Import Panel'}
        </Button>
      </CardHeader>
      {isExpanded ? (
        <CardContent className="space-y-6">
          <Alert>
            <ShieldCheck className="h-4 w-4" />
            <AlertTitle>Safe token handling</AlertTitle>
            <AlertDescription>
              <div className="space-y-2">
                <p>
                  Stored Omnidots tokens are never shown back to the browser. Entering a token
                  here creates or replaces the stored token, then the field is cleared again.
                </p>
                <p>
                  Use an Omnidots Honeycomb API token. Log in to Omnidots separately, create a
                  permanent API token, then paste it here. The saved token is encrypted and never
                  displayed.
                </p>
                <p className="font-medium text-foreground">
                  Do not enter your Omnidots password here.
                </p>
                <a
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
                  href={OMNIDOTS_TOKEN_HELP_ARTICLE_URL}
                  rel="noreferrer"
                  target="_blank"
                >
                  Where to create an Omnidots API token
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </AlertDescription>
          </Alert>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Connection">
              <Select
                value={selectedConnectionValue || NO_CONNECTION_VALUE}
                onValueChange={(value) => {
                  setHasManuallySelectedConnection(true);
                  setSelectedConnectionValue(value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a saved connection" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CONNECTION_VALUE}>Create a new connection</SelectItem>
                  {connections.map((connection) => (
                    <SelectItem key={connection.id} value={connection.id}>
                      {connection.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">
                {selectedConnection
                  ? `Stored token present. Last validated ${formatDateTime(selectedConnection.lastValidatedAt)}.`
                  : 'No connection selected yet.'}
              </div>
            </Field>
            <Field label="Connection label">
              <Input
                value={displayNameDraft}
                onChange={(event) => setDisplayNameDraft(event.target.value)}
                placeholder="Omnidots Honeycomb"
              />
            </Field>
            <Field label="Omnidots API token">
              <Input
                type="password"
                value={tokenDraft}
                onChange={(event) => setTokenDraft(event.target.value)}
                placeholder={
                  selectedConnection?.hasStoredToken
                    ? 'Stored token is hidden. Enter a new token to replace it.'
                    : 'Paste Omnidots API token'
                }
              />
              <div className="text-xs text-muted-foreground">
                {selectedConnection?.hasStoredToken
                  ? 'A saved token exists, but its value is never displayed here.'
                  : 'The token is submitted to the API and then removed from this field.'}
              </div>
            </Field>
            <div className="flex flex-wrap items-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveToken}
                disabled={
                  createConnectionMutation.isPending ||
                  updateConnectionMutation.isPending ||
                  !tokenDraft.trim()
                }
              >
                <ShieldCheck className="mr-2 h-4 w-4" />
                Save Token
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleValidate}
                disabled={!selectedConnectionId || validateConnectionMutation.isPending}
              >
                <ShieldCheck className="mr-2 h-4 w-4" />
                Validate
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleSyncMeasuringPoints}
                disabled={!selectedConnectionId || syncMeasuringPointsMutation.isPending}
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Sync Measuring Points
              </Button>
            </div>
          </div>

          {selectedConnection?.lastError ? (
            <Alert variant="destructive">
              <AlertTitle>Latest connection error</AlertTitle>
              <AlertDescription>{selectedConnection.lastError}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Measuring point">
              <Select
                value={selectedMeasuringPointId ?? NO_MEASURING_POINT_VALUE}
                onValueChange={(value) =>
                  setSelectedMeasuringPointId(
                    value === NO_MEASURING_POINT_VALUE ? null : value,
                  )
                }
                disabled={!selectedConnectionId || measuringPointsQuery.isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a synced measuring point" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_MEASURING_POINT_VALUE}>No measuring point selected</SelectItem>
                  {measuringPoints.map((measuringPoint) => (
                    <SelectItem key={measuringPoint.id} value={measuringPoint.id}>
                      {measuringPoint.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">
                {measuringPointState
                  ? `${measuringPointState.measuringPoints.length} synced measuring point${measuringPointState.measuringPoints.length === 1 ? '' : 's'} available.`
                  : 'Sync the connection to load measuring points.'}
              </div>
            </Field>
            <Field label="Import from">
              <Input type="datetime-local" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
            </Field>
            <Field label="Import to">
              <Input type="datetime-local" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
            </Field>
            <Field label="Selected metrics">
              <div className="rounded-md border bg-background p-3">
                <div className="mb-2 text-sm text-muted-foreground">{selectedMetricLabel}</div>
                <div className="space-y-2">
                  {OMNIDOTS_MONITORING_METRIC_OPTIONS.map((option) => {
                    const checked = selectedMetricKeys.includes(option.value);
                    return (
                      <label key={option.value} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) =>
                            setSelectedMetricKeys((current) =>
                              event.target.checked
                                ? [...current, option.value]
                                : current.filter((metricKey) => metricKey !== option.value),
                            )
                          }
                        />
                        <span>{option.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </Field>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleImport}
              disabled={!canRunImport || importMutation.isPending || selectedMetricKeys.length === 0}
            >
              <CloudDownload className="mr-2 h-4 w-4" />
              Import Data
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleBuildDataset}
              disabled={!canRunImport || buildDatasetMutation.isPending || selectedMetricKeys.length === 0}
            >
              <Database className="mr-2 h-4 w-4" />
              Build / Refresh Dataset Snapshot
            </Button>
            <Button
              type="button"
              onClick={handleCreateVibrationRows}
              disabled={!latestDataset || createRowsMutation.isPending}
            >
              <Table2 className="mr-2 h-4 w-4" />
              Create vibration result rows from imported summary
            </Button>
          </div>

          {importSummary ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryCard label="Samples imported" value={String(importSummary.samplesImported)} />
              <SummaryCard
                label="Import period"
                value={`${formatDateTime(importSummary.dateFrom)} to ${formatDateTime(importSummary.dateTo)}`}
              />
              <SummaryCard
                label="Metric keys"
                value={importSummary.selectedMetricKeys.join(', ')}
              />
              <SummaryCard
                label="Last import status"
                value={importSummary.lastImportJobStatus ?? 'Not available'}
              />
            </div>
          ) : null}

          {latestImportJob ? (
            <Alert>
              <AlertTitle>Latest Omnidots job</AlertTitle>
              <AlertDescription>
                {latestImportJob.jobType} · {latestImportJob.status}
                {latestImportJob.completedAt
                  ? ` · completed ${formatDateTime(latestImportJob.completedAt)}`
                  : ''}
                {latestImportJob.errorMessage ? ` · ${latestImportJob.errorMessage}` : ''}
              </AlertDescription>
            </Alert>
          ) : null}

          {latestDataset ? (
            <>
              <Alert>
                <AlertTitle>Frozen dataset snapshot ready</AlertTitle>
                <AlertDescription>
                  Dataset <code>{latestDataset.id}</code> covers{' '}
                  {formatDateTime(latestDataset.dateFrom)} to {formatDateTime(latestDataset.dateTo)}
                  {' · '}
                  {latestDataset.sampleCount} samples across{' '}
                  {latestDataset.selectedMetricKeys.join(', ')}.
                </AlertDescription>
              </Alert>

              <div className="overflow-x-auto rounded-md border bg-background">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/40 text-left">
                    <tr>
                      <TableHeading>Measuring point</TableHeading>
                      <TableHeading>Metric</TableHeading>
                      <TableHeading>Highest Vtop X/Y/Z</TableHeading>
                      <TableHeading>Fdom X/Y/Z</TableHeading>
                      <TableHeading>Highest VDV X/Y/Z</TableHeading>
                      <TableHeading>Highest Veff X/Y/Z</TableHeading>
                      <TableHeading>Sample count</TableHeading>
                      <TableHeading>Import period</TableHeading>
                      <TableHeading>Source refs</TableHeading>
                    </tr>
                  </thead>
                  <tbody>
                    {latestDataset.previewRows.map((row) => (
                      <PreviewRow key={`${row.datasetId}:${row.metricKey}`} row={row} />
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="text-sm text-muted-foreground">
                Imported preview values stay separate from authored report rows until you click the
                explicit creation button above. This slice only auto-maps Vtop to PPV rows and VDV
                to VDV rows; Veff,max remains preview-only in the frozen dataset snapshot.
              </div>
            </>
          ) : (
            <div className="rounded-md border border-dashed px-4 py-6 text-sm text-muted-foreground">
              Build a dataset snapshot to preview imported values before authored result rows are
              created.
            </div>
          )}
        </CardContent>
      ) : null}
    </Card>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}

function TableHeading({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 align-top font-medium">{children}</th>;
}

function PreviewRow({ row }: { row: OmnidotsDatasetPreviewRow }) {
  return (
    <tr className="border-t">
      <td className="px-3 py-2 align-top">{row.measuringPointLabel}</td>
      <td className="px-3 py-2 align-top">
        <div>{row.metricLabel}</div>
        <div className="text-xs text-muted-foreground">
          {row.metricKey}
          {row.unit ? ` · ${row.unit}` : ''}
        </div>
      </td>
      <td className="px-3 py-2 align-top">
        {formatAxisCell('X', row.highestVtopX, row.highestVtopXAt)}
        {formatAxisCell('Y', row.highestVtopY, row.highestVtopYAt)}
        {formatAxisCell('Z', row.highestVtopZ, row.highestVtopZAt)}
      </td>
      <td className="px-3 py-2 align-top">
        {formatSimpleAxisValue('X', row.fdomX)}
        {formatSimpleAxisValue('Y', row.fdomY)}
        {formatSimpleAxisValue('Z', row.fdomZ)}
      </td>
      <td className="px-3 py-2 align-top">
        {formatAxisCell('X', row.highestVdvX, row.highestVdvXAt)}
        {formatAxisCell('Y', row.highestVdvY, row.highestVdvYAt)}
        {formatAxisCell('Z', row.highestVdvZ, row.highestVdvZAt)}
      </td>
      <td className="px-3 py-2 align-top">
        {formatAxisCell('X', row.highestVeffX, row.highestVeffXAt)}
        {formatAxisCell('Y', row.highestVeffY, row.highestVeffYAt)}
        {formatAxisCell('Z', row.highestVeffZ, row.highestVeffZAt)}
      </td>
      <td className="px-3 py-2 align-top">{row.sampleCount}</td>
      <td className="px-3 py-2 align-top">
        {formatDateTime(row.importDateFrom)}
        <div className="text-xs text-muted-foreground">to {formatDateTime(row.importDateTo)}</div>
      </td>
      <td className="px-3 py-2 align-top">
        <div>Dataset: {row.datasetId}</div>
        <div className="text-xs text-muted-foreground">
          Job: {row.importJobId ?? 'Not available'}
          {row.importJobStatus ? ` · ${row.importJobStatus}` : ''}
        </div>
      </td>
    </tr>
  );
}

function formatAxisCell(label: string, value: number | null, timestamp: string | null) {
  if (value === null || !timestamp) {
    return <div className="text-xs text-muted-foreground">{label}: —</div>;
  }

  return (
    <div className="mb-1">
      <div>
        {label}: {formatNumber(value)}
      </div>
      <div className="text-xs text-muted-foreground">{formatDateTime(timestamp)}</div>
    </div>
  );
}

function formatSimpleAxisValue(label: string, value: number | null) {
  return <div className="text-xs text-muted-foreground">{label}: {value === null ? '—' : formatNumber(value)}</div>;
}

function formatNumber(value: number) {
  return value.toFixed(3).replace(/\.?0+$/, '');
}

function formatDateTime(value: string | null) {
  if (!value) {
    return '—';
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

function toDateTimeLocalValue(value: string | null) {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  const offsetMs = parsed.getTimezoneOffset() * 60_000;
  return new Date(parsed.getTime() - offsetMs).toISOString().slice(0, 16);
}

function toIsoDateTime(value: string) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function resolveApiMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    const body = error.body;
    if (body && typeof body === 'object' && 'message' in body && typeof body.message === 'string') {
      return body.message;
    }
  }

  return fallback;
}
