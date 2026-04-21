'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Copy, FileText, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PageLoading } from '@/components/loading';
import {
  useCreateEnvironmentalMonitoringReport,
  useDeleteEnvironmentalMonitoringReport,
  useDuplicateEnvironmentalMonitoringReport,
  useEnvironmentalMonitoringReports,
} from '@/hooks/use-environmental-monitoring';
import type {
  EnvironmentalMonitoringReportSummary,
  EnvironmentalMonitoringReportType,
} from './environmental-monitoring-types';
import { ENVIRONMENTAL_MONITORING_REPORT_TYPE_OPTIONS } from './environmental-monitoring-types';
import { toast } from 'sonner';

type MonitoringReportsPanelProps = {
  projectId: string;
  compact?: boolean;
  showOpenAllLink?: boolean;
};

export function MonitoringReportsPanel({
  projectId,
  compact = false,
  showOpenAllLink = false,
}: MonitoringReportsPanelProps) {
  const router = useRouter();
  const { data: reports, isLoading } = useEnvironmentalMonitoringReports(projectId);
  const createReport = useCreateEnvironmentalMonitoringReport(projectId);
  const deleteReport = useDeleteEnvironmentalMonitoringReport(projectId);
  const duplicateReport = useDuplicateEnvironmentalMonitoringReport(projectId);

  async function handleCreate(reportType: EnvironmentalMonitoringReportType) {
    try {
      const report = await createReport.mutateAsync({ reportType });
      toast.success(
        reportType === 'noise_monitoring'
          ? 'Noise monitoring report created'
          : 'Vibration monitoring report created',
      );
      router.push(`/projects/${projectId}/environmental/monitoring/${report.id}`);
    } catch {
      toast.error('Failed to create monitoring report');
    }
  }

  async function handleDuplicate(report: EnvironmentalMonitoringReportSummary) {
    try {
      const duplicatedReport = await duplicateReport.mutateAsync(report.id);
      toast.success('Monitoring report duplicated');
      router.push(`/projects/${projectId}/environmental/monitoring/${duplicatedReport.id}`);
    } catch {
      toast.error('Failed to duplicate monitoring report');
    }
  }

  async function handleDelete(report: EnvironmentalMonitoringReportSummary) {
    if (
      typeof window !== 'undefined' &&
      !window.confirm(`Delete monitoring report "${displayReportTitle(report)}"?`)
    ) {
      return;
    }

    try {
      await deleteReport.mutateAsync(report.id);
      toast.success('Monitoring report deleted');
    } catch {
      toast.error('Failed to delete monitoring report');
    }
  }

  const visibleReports = compact ? (reports ?? []).slice(0, 4) : (reports ?? []);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => handleCreate('noise_monitoring')}
            disabled={createReport.isPending || duplicateReport.isPending || deleteReport.isPending}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Noise Monitoring Report
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleCreate('vibration_monitoring')}
            disabled={createReport.isPending || duplicateReport.isPending || deleteReport.isPending}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Vibration Monitoring Report
          </Button>
        </div>

        {showOpenAllLink ? (
          <Link
            href={`/projects/${projectId}/environmental/monitoring`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Open monitoring reports
          </Link>
        ) : null}
      </div>

      {isLoading ? (
        <PageLoading />
      ) : visibleReports.length === 0 ? (
        <div className="rounded-md border border-dashed border-border/80 px-4 py-6 text-sm text-muted-foreground">
          No monitoring reports created yet.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleReports.map((report) => (
            <Card
              key={report.id}
              className="flex h-full flex-col transition-colors hover:border-primary/50 hover:bg-accent/30"
            >
              <Link
                href={`/projects/${projectId}/environmental/monitoring/${report.id}`}
                className="flex flex-1 flex-col"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-base">{displayReportTitle(report)}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <CardDescription>{labelForReportType(report.reportType)}</CardDescription>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {report.documentStatus ? (
                      <Badge variant="outline">{report.documentStatus}</Badge>
                    ) : null}
                    {report.revision ? (
                      <Badge variant="outline">Rev {report.revision}</Badge>
                    ) : null}
                    {report.issueDate ? (
                      <Badge variant="outline">
                        {new Date(report.issueDate).toLocaleDateString()}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {report._count.annexures} annexures · {report._count.locations} locations ·{' '}
                    {report._count.selectedCriteria} criteria ·{' '}
                    {report.reportType === 'noise_monitoring'
                      ? `${report._count.noiseResults} noise results`
                      : `${report._count.vibrationResults} vibration results`}
                  </p>
                </CardContent>
              </Link>
              <CardFooter className="justify-end gap-2 border-t px-6 py-4">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void handleDuplicate(report)}
                  disabled={
                    createReport.isPending || duplicateReport.isPending || deleteReport.isPending
                  }
                >
                  <Copy className="mr-2 h-4 w-4" />
                  {duplicateReport.isPending && duplicateReport.variables === report.id
                    ? 'Duplicating…'
                    : 'Duplicate'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => void handleDelete(report)}
                  disabled={
                    createReport.isPending || duplicateReport.isPending || deleteReport.isPending
                  }
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {deleteReport.isPending && deleteReport.variables === report.id
                    ? 'Deleting…'
                    : 'Delete'}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function labelForReportType(reportType: EnvironmentalMonitoringReportType) {
  return (
    ENVIRONMENTAL_MONITORING_REPORT_TYPE_OPTIONS.find((option) => option.value === reportType)
      ?.label ?? reportType.replace(/_/g, ' ')
  );
}

function displayReportTitle(report: EnvironmentalMonitoringReportSummary) {
  if (report.title?.trim()) {
    return report.title;
  }

  return labelForReportType(report.reportType);
}
