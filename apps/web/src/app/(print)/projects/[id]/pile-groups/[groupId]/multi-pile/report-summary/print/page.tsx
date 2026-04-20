'use client';

import { use } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Printer } from 'lucide-react';
import { PageLoading } from '@/components/loading';
import { Button, buttonVariants } from '@/components/ui/button';
import { MultiPileReportSummaryPrintDocument } from '@/features/multi-pile/report-summary-print-document';
import {
  buildMultiPileReportSummaryData,
  buildMultiPileReportSummaryPrintPath,
  type MultiPileReportSummaryAppendixMode,
} from '@/features/multi-pile/report-summary';
import { useLatestMultiPileEnvelope, useMultiPileState } from '@/hooks/use-multi-pile';
import { usePileGroup } from '@/hooks/use-pile-groups';
import { useProject } from '@/hooks/use-projects';

export default function MultiPileReportSummaryPrintPage({
  params,
}: {
  params: Promise<{ id: string; groupId: string }>;
}) {
  const { id: projectId, groupId } = use(params);
  const searchParams = useSearchParams();
  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: group, isLoading: groupLoading } = usePileGroup(projectId, groupId);
  const { data: persistedState, isLoading: stateLoading } = useMultiPileState(projectId, groupId);
  const { data: latestRun } = useLatestMultiPileEnvelope(projectId, groupId);
  const appendixMode = normalizeAppendixMode(searchParams.get('appendix'));

  if (projectLoading || groupLoading || stateLoading || !project || !group || !persistedState) {
    return (
      <div className="mx-auto max-w-7xl">
        <PageLoading />
      </div>
    );
  }

  const reportData = buildMultiPileReportSummaryData({
    project,
    groupName: group.name,
    draft: persistedState,
    latestRun,
    appendix: appendixMode,
  });
  const multiPileHref = `/projects/${projectId}/pile-groups/${groupId}/multi-pile`;
  const compactHref = buildMultiPileReportSummaryPrintPath({ projectId, groupId });
  const justificationHref = buildMultiPileReportSummaryPrintPath({
    projectId,
    groupId,
    appendix: 'justification',
  });
  const pricingHref = buildMultiPileReportSummaryPrintPath({
    projectId,
    groupId,
    appendix: 'pricing',
  });
  const fullHref = buildMultiPileReportSummaryPrintPath({
    projectId,
    groupId,
    appendix: 'full',
  });
  const previewDescription = describeAppendixMode(appendixMode);

  return (
    <div className="mx-auto max-w-[1600px] space-y-4 print:max-w-none print:space-y-0">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="space-y-1">
          <Link
            href={multiPileHref}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Multi-Pile
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Multi-Pile Report Summary Print Preview
            </h1>
            <p className="text-sm text-muted-foreground">{previewDescription}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={compactHref}
            className={buttonVariants({ variant: appendixMode ? 'outline' : 'default' })}
          >
            Compact Report
          </Link>
          <Link
            href={justificationHref}
            className={buttonVariants({
              variant: appendixMode === 'justification' ? 'default' : 'outline',
            })}
          >
            Report + Justification Appendix
          </Link>
          <Link
            href={pricingHref}
            className={buttonVariants({
              variant: appendixMode === 'pricing' ? 'default' : 'outline',
            })}
          >
            Report + Pricing Appendix
          </Link>
          <Link
            href={fullHref}
            className={buttonVariants({ variant: appendixMode === 'full' ? 'default' : 'outline' })}
          >
            Full Report
          </Link>
          <Button
            onClick={() => window.print()}
            data-testid="multi-pile-report-summary-print-preview-button"
          >
            <Printer className="mr-2 h-4 w-4" />
            Print / Save as PDF
          </Button>
        </div>
      </div>

      <MultiPileReportSummaryPrintDocument data={reportData} />
    </div>
  );
}

function normalizeAppendixMode(value: string | null): MultiPileReportSummaryAppendixMode | null {
  if (value === 'pricing' || value === 'justification' || value === 'full') {
    return value;
  }
  return null;
}

function describeAppendixMode(mode: MultiPileReportSummaryAppendixMode | null) {
  if (mode === 'pricing') {
    return 'Review the compact summary report with the pricing appendix, then use the browser print dialog to print or Save as PDF.';
  }
  if (mode === 'justification') {
    return 'Review the compact summary report with the source-backed justification appendix, then use the browser print dialog to print or Save as PDF.';
  }
  if (mode === 'full') {
    return 'Review the compact summary report with both the justification appendix and pricing appendix, then use the browser print dialog to print or Save as PDF.';
  }
  return 'Review the compact summary report, then use the browser print dialog to print or Save as PDF.';
}
