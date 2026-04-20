'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileText, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageLoading } from '@/components/loading';
import { toast } from 'sonner';
import {
  useCreateWasteClassificationReport,
  useWasteClassificationReports,
} from '@/hooks/use-waste-classification';
import { ApiError } from '@/lib/api-client';
import {
  WASTE_CLASS_OPTIONS,
  type ProjectWasteClassificationReportSummary,
} from './waste-classification-types';

type WasteClassificationReportsPanelProps = {
  projectId: string;
  compact?: boolean;
  showOpenAllLink?: boolean;
};

export function WasteClassificationReportsPanel({
  projectId,
  compact = false,
  showOpenAllLink = false,
}: WasteClassificationReportsPanelProps) {
  const router = useRouter();
  const { data: reports, isLoading } = useWasteClassificationReports(projectId);
  const createReport = useCreateWasteClassificationReport(projectId);

  async function handleCreate() {
    try {
      const report = await createReport.mutateAsync({});
      toast.success('Waste classification report created');
      router.push(`/projects/${projectId}/environmental/waste-classification/${report.id}`);
    } catch (error) {
      toast.error(extractCreateErrorMessage(error));
    }
  }

  const visibleReports = compact ? (reports ?? []).slice(0, 4) : (reports ?? []);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Button type="button" onClick={handleCreate} disabled={createReport.isPending}>
          <Plus className="mr-2 h-4 w-4" />
          Create Waste Classification Report
        </Button>

        {showOpenAllLink ? (
          <Link
            href={`/projects/${projectId}/environmental/waste-classification`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Open waste classification reports
          </Link>
        ) : null}
      </div>

      {isLoading ? (
        <PageLoading />
      ) : visibleReports.length === 0 ? (
        <div className="rounded-md border border-dashed border-border/80 px-4 py-6 text-sm text-muted-foreground">
          No waste classification reports created yet.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleReports.map((report) => (
            <Link
              key={report.id}
              href={`/projects/${projectId}/environmental/waste-classification/${report.id}`}
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
                    NSW EPA step-based waste classification deliverables
                  </CardDescription>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {report.documentStatus ? (
                      <Badge variant="outline">{report.documentStatus}</Badge>
                    ) : null}
                    {report.revision ? (
                      <Badge variant="outline">Rev {report.revision}</Badge>
                    ) : null}
                    {report.finalWasteClass ? (
                      <Badge
                        variant={
                          report.finalWasteClass === 'not_yet_classified' ? 'warning' : 'success'
                        }
                      >
                        {labelForWasteClass(report.finalWasteClass)}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {report._count.references} references · {report._count.stepDecisions} steps ·{' '}
                    {report._count.labResults} lab results
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

function labelForWasteClass(value: string) {
  return (
    WASTE_CLASS_OPTIONS.find((option) => option.value === value)?.label ?? value.replace(/_/g, ' ')
  );
}

function displayReportTitle(report: ProjectWasteClassificationReportSummary) {
  if (report.title?.trim()) {
    return report.title;
  }

  return 'Waste Classification Report';
}

function extractCreateErrorMessage(error: unknown) {
  const fallback = 'Failed to create waste classification report';

  if (process.env.NODE_ENV === 'production') {
    return fallback;
  }

  if (error instanceof ApiError) {
    const body = asRecord(error.body);
    const message = extractFirstErrorMessage(body.message) ?? extractFirstErrorMessage(body.errors);

    return message || error.message || fallback;
  }

  if (error instanceof Error) {
    return error.message || fallback;
  }

  return fallback;
}

function extractFirstErrorMessage(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  if (!Array.isArray(value)) {
    return null;
  }

  for (const entry of value) {
    if (typeof entry === 'string' && entry.trim()) {
      return entry.trim();
    }

    if (entry && typeof entry === 'object') {
      const nestedMessage = extractFirstErrorMessage(asRecord(entry).message);
      if (nestedMessage) {
        return nestedMessage;
      }
    }
  }

  return null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
