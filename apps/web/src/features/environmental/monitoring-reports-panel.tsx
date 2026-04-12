'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileText, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageLoading } from '@/components/loading';
import { useCreateEnvironmentalMonitoringReport, useEnvironmentalMonitoringReports } from '@/hooks/use-environmental-monitoring';
import type {
  EnvironmentalMonitoringReportSummary,
  EnvironmentalMonitoringReportType,
} from './environmental-monitoring-types';
import {
  ENVIRONMENTAL_MONITORING_REPORT_TYPE_OPTIONS,
} from './environmental-monitoring-types';
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

  const visibleReports = compact ? (reports ?? []).slice(0, 4) : (reports ?? []);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => handleCreate('noise_monitoring')}
            disabled={createReport.isPending}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Noise Monitoring Report
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleCreate('vibration_monitoring')}
            disabled={createReport.isPending}
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
            <Link
              key={report.id}
              href={`/projects/${projectId}/environmental/monitoring/${report.id}`}
            >
              <Card className="h-full transition-colors hover:border-primary/50 hover:bg-accent/30">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-base">{displayReportTitle(report)}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <CardDescription>
                    {labelForReportType(report.reportType)}
                  </CardDescription>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {report.documentStatus ? (
                      <Badge variant="outline">{report.documentStatus}</Badge>
                    ) : null}
                    {report.revision ? <Badge variant="outline">Rev {report.revision}</Badge> : null}
                    {report.issueDate ? (
                      <Badge variant="outline">{new Date(report.issueDate).toLocaleDateString()}</Badge>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {report._count.locations} locations · {report._count.selectedCriteria} criteria ·{' '}
                    {report.reportType === 'noise_monitoring'
                      ? `${report._count.noiseResults} noise results`
                      : `${report._count.vibrationResults} vibration results`}
                  </p>
                </CardContent>
              </Card>
            </Link>
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
