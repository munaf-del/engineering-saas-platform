'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Printer } from 'lucide-react';
import { PageLoading } from '@/components/loading';
import { Button } from '@/components/ui/button';
import { PricingSummaryPrintDocument } from '@/features/multi-pile/pricing-summary-print-document';
import { buildPricingSummaryData } from '@/features/multi-pile/pricing-summary';
import { extractProjectSpecifics } from '@/features/projects/project-specifics-adapter';
import { useLatestMultiPileEnvelope, useMultiPileState } from '@/hooks/use-multi-pile';
import { usePileGroup } from '@/hooks/use-pile-groups';
import { useProject } from '@/hooks/use-projects';

export default function MultiPilePricingSummaryPrintPage({
  params,
}: {
  params: Promise<{ id: string; groupId: string }>;
}) {
  const { id: projectId, groupId } = use(params);
  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: group, isLoading: groupLoading } = usePileGroup(projectId, groupId);
  const { data: persistedState, isLoading: stateLoading } = useMultiPileState(projectId, groupId);
  const { data: latestRun } = useLatestMultiPileEnvelope(projectId, groupId);

  if (projectLoading || groupLoading || stateLoading || !project || !group || !persistedState) {
    return (
      <div className="mx-auto max-w-7xl">
        <PageLoading />
      </div>
    );
  }

  const projectSpecifics = extractProjectSpecifics(project);
  const pricingData = buildPricingSummaryData({
    draft: persistedState,
    projectSpecifics,
    latestRun,
    projectCode: project.code,
    projectName: project.name,
  });
  const multiPileHref = `/projects/${projectId}/pile-groups/${groupId}/multi-pile`;

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
            <h1 className="text-2xl font-bold tracking-tight">Pricing Summary Print Preview</h1>
            <p className="text-sm text-muted-foreground">
              Review the estimator schedule, then use the browser print dialog to print or Save as
              PDF.
            </p>
          </div>
        </div>

        <Button onClick={() => window.print()} data-testid="pricing-summary-print-preview-button">
          <Printer className="mr-2 h-4 w-4" />
          Print / Save as PDF
        </Button>
      </div>

      <PricingSummaryPrintDocument
        data={pricingData}
        groupName={group.name || project.name || project.code}
      />
    </div>
  );
}
