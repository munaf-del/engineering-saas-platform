'use client';

import React, { type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, Eye, Printer } from 'lucide-react';
import type { Project } from '@eng/shared';
import { PageHeader } from '@/components/page-header';
import { PageLoading } from '@/components/loading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { extractProjectSpecifics } from '@/features/projects/project-specifics-adapter';
import { WasteClassificationStep5Helper } from '@/features/environmental/waste-classification-step5-helper';
import { useWasteClassificationReport } from '@/hooks/use-waste-classification';
import {
  ACID_SULFATE_SOIL_CLASS_OPTIONS,
  WASTE_CLASSIFICATION_MATERIAL_PATHWAY_OUTCOME_OPTIONS,
  WASTE_CLASSIFICATION_OUTCOME_STATUS_OPTIONS,
  WASTE_CLASS_OPTIONS,
  type ProjectWasteClassificationMaterialPathway,
  type ProjectWasteClassificationReport,
  type ProjectWasteClassificationStepDecision,
} from './waste-classification-types';

type WasteClassificationPreviewProps = {
  projectId: string;
  reportId: string;
  project: Project;
};

type ProjectIdentity = {
  projectNumber: string;
  projectName: string;
  client: string;
  address: string;
};

export function WasteClassificationPreview({
  projectId,
  reportId,
  project,
}: WasteClassificationPreviewProps) {
  const { data: report, isLoading } = useWasteClassificationReport(projectId, reportId);

  if (isLoading || !report) {
    return <PageLoading />;
  }

  const projectIdentity = resolveProjectIdentity(project);
  const includedReferences = report.references.filter((reference) => reference.isIncluded);

  return (
    <div className="mx-auto max-w-5xl space-y-6 print:max-w-none">
      <div className="print:hidden">
        <Link
          href={`/projects/${projectId}/environmental/waste-classification/${reportId}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to editor
        </Link>
      </div>

      <PageHeader
        title={report.title?.trim() || 'Waste Classification Report Preview'}
        description={`${projectIdentity.projectNumber} · Read-only report preview`}
        badges={
          <>
            <Badge variant="outline">
              <Eye className="mr-1 h-3 w-3" />
              Preview
            </Badge>
            <Badge
              variant={report.finalWasteClass === 'not_yet_classified' ? 'warning' : 'success'}
            >
              {labelFor(WASTE_CLASS_OPTIONS, report.finalWasteClass)}
            </Badge>
          </>
        }
        actions={
          <>
            <Link
              href={`/projects/${projectId}/environmental/waste-classification/${reportId}`}
              className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground print:hidden"
            >
              Back to editor
            </Link>
            <Button type="button" onClick={() => window.print()} className="print:hidden">
              <Printer className="mr-2 h-4 w-4" />
              Print / Save PDF
            </Button>
          </>
        }
      />

      <PreviewCard title="Project Identity">
        <PreviewGrid>
          <PreviewField label="Project number" value={projectIdentity.projectNumber} />
          <PreviewField label="Project name" value={projectIdentity.projectName} />
          <PreviewField label="Client" value={projectIdentity.client} />
          <PreviewField label="Address" value={projectIdentity.address} className="md:col-span-2" />
        </PreviewGrid>
      </PreviewCard>

      <PreviewCard title="Document Setup">
        <PreviewGrid>
          <PreviewField label="Report title" value={report.title} />
          <PreviewField label="Revision" value={report.revision} />
          <PreviewField label="Issue date" value={formatDate(report.issueDate)} />
          <PreviewField label="Status" value={report.documentStatus} />
          <PreviewField label="Prepared by" value={report.preparedBy} />
          <PreviewField label="Checked by" value={report.checkedBy} />
          <PreviewField label="Purpose" value={report.purpose} className="md:col-span-2" />
        </PreviewGrid>
      </PreviewCard>

      <PreviewCard title="Waste Stream Summary">
        <PreviewGrid>
          <PreviewField label="Waste stream name" value={report.wasteStreamName} />
          <PreviewField label="Sampling date" value={formatDate(report.samplingDate)} />
          <PreviewField label="Quantity / volume estimate" value={report.quantityEstimate} />
          <PreviewField
            label="Proposed receiving facility note"
            value={report.proposedReceivingFacilityNote}
          />
          <PreviewField
            label="Waste source / origin"
            value={report.wasteSourceOrigin}
            className="md:col-span-2"
          />
          <PreviewField
            label="Waste description"
            value={report.wasteDescription}
            className="md:col-span-2"
          />
          <PreviewField
            label="Executive summary"
            value={report.executiveSummary}
            className="md:col-span-2"
          />
        </PreviewGrid>
      </PreviewCard>

      <PreviewCard title="Selected References">
        <div className="space-y-3">
          {includedReferences.length === 0 ? (
            <PreviewMuted>No references selected for the preview.</PreviewMuted>
          ) : (
            includedReferences.map((reference) => (
              <div key={reference.id} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-medium">{reference.title}</div>
                  {reference.isPrefilled ? <Badge variant="secondary">Prefilled</Badge> : null}
                </div>
                {reference.sourceUrl ? (
                  <a
                    href={reference.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block text-sm text-primary underline-offset-4 hover:underline"
                  >
                    {reference.sourceUrl}
                  </a>
                ) : null}
                {reference.note ? (
                  <p className="mt-2 text-sm text-muted-foreground">{reference.note}</p>
                ) : null}
              </div>
            ))
          )}
        </div>
      </PreviewCard>

      <PreviewCard title="Material / Reuse Pathways">
        <div className="space-y-4">
          {report.materialPathways.map((pathway) => (
            <PreviewMaterialPathway key={pathway.id} pathway={pathway} />
          ))}
        </div>
      </PreviewCard>

      <PreviewCard title="Step 1–6 Workflow">
        <div className="space-y-4">
          {report.stepDecisions.map((step) => (
            <PreviewStepDecision key={step.id} step={step} />
          ))}
        </div>
      </PreviewCard>

      <PreviewCard title="Step 5 Helper / Reference Notes">
        <WasteClassificationStep5Helper references={report.references} compact />
      </PreviewCard>

      <PreviewCard title="Lab / Chemical Assessment">
        <div className="space-y-3">
          {report.labResults.length === 0 ? (
            <PreviewMuted>No lab / chemical assessment rows recorded.</PreviewMuted>
          ) : (
            report.labResults.map((row) => (
              <div key={row.id} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-medium">{row.contaminant}</div>
                  {row.sampleId ? <Badge variant="outline">Sample {row.sampleId}</Badge> : null}
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <PreviewField label="Analytical method" value={row.analyticalMethod} />
                  <PreviewField label="SCC result (mg/kg)" value={row.sccMgKg} />
                  <PreviewField label="TCLP result (mg/L)" value={row.tclpMgL} />
                  <PreviewField
                    label="Threshold / reference note"
                    value={row.thresholdReferenceNote}
                    className="md:col-span-2"
                  />
                  <PreviewField
                    label="Result interpretation"
                    value={row.resultInterpretation}
                    className="md:col-span-2"
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </PreviewCard>

      <PreviewCard title="Related Parts / Special Pathways">
        <div className="space-y-3">
          {report.relatedPathways.length === 0 ? (
            <PreviewMuted>No related pathways recorded.</PreviewMuted>
          ) : (
            report.relatedPathways.map((pathway) => (
              <div key={pathway.id} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-medium">{pathway.title}</div>
                  <Badge variant={pathway.isRelevant ? 'success' : 'outline'}>
                    {pathway.isRelevant ? 'Relevant' : 'Not relevant'}
                  </Badge>
                </div>
                <div className="mt-3 space-y-3 text-sm">
                  <PreviewInline
                    label="Linked reference"
                    value={pathway.linkedReference?.title ?? null}
                  />
                  <PreviewInline label="Summary note" value={pathway.summaryNote} />
                  <PreviewInline
                    label="Resulting action / implication"
                    value={pathway.resultingAction}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </PreviewCard>

      <PreviewCard title="Final Classification Summary">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">Final waste class</span>
            <Badge
              variant={report.finalWasteClass === 'not_yet_classified' ? 'warning' : 'success'}
            >
              {labelFor(WASTE_CLASS_OPTIONS, report.finalWasteClass)}
            </Badge>
          </div>
          <PreviewField
            label="Final classification reasoning"
            value={report.finalClassificationReasoning}
          />
          <PreviewField
            label="Management / disposal recommendation"
            value={report.managementRecommendation}
          />
        </div>
      </PreviewCard>

      <PreviewCard title="Recommendations / Management Actions">
        <div className="space-y-3">
          {report.recommendations.length === 0 ? (
            <PreviewMuted>No recommendations recorded.</PreviewMuted>
          ) : (
            report.recommendations.map((recommendation) => (
              <div key={recommendation.id} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-medium">{recommendation.category}</div>
                  {recommendation.priority ? (
                    <Badge variant="outline">{recommendation.priority}</Badge>
                  ) : null}
                  {recommendation.responsibility ? (
                    <Badge variant="outline">{recommendation.responsibility}</Badge>
                  ) : null}
                </div>
                <p className="mt-2 text-sm">{recommendation.recommendation}</p>
                {recommendation.timingNote ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Timing: {recommendation.timingNote}
                  </p>
                ) : null}
              </div>
            ))
          )}
        </div>
      </PreviewCard>

      <PreviewCard title="Assumptions / Limitations">
        <PreviewField label="Assumptions and limitations" value={report.assumptionsLimitations} />
      </PreviewCard>
    </div>
  );
}

function PreviewMaterialPathway({
  pathway,
}: {
  pathway: ProjectWasteClassificationMaterialPathway;
}) {
  const checkedItems = pathway.checklistItems.filter((item) => item.isChecked);

  return (
    <div className="rounded-xl border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="font-medium">{pathway.title}</div>
        <Badge variant="outline">
          {labelFor(WASTE_CLASSIFICATION_MATERIAL_PATHWAY_OUTCOME_OPTIONS, pathway.outcomeStatus)}
        </Badge>
        {pathway.pathwayCode === 'acid_sulfate_soils' ? (
          <Badge variant={pathway.isRelevant ? 'success' : 'outline'}>
            {pathway.isRelevant ? 'Relevant' : 'Not relevant'}
          </Badge>
        ) : null}
        {pathway.assClass ? (
          <Badge variant="outline">
            {labelFor(ACID_SULFATE_SOIL_CLASS_OPTIONS, pathway.assClass)}
          </Badge>
        ) : null}
      </div>

      <div className="mt-3 space-y-3 text-sm">
        <PreviewInline label="Supporting reasoning" value={pathway.supportingReasoning} />
        <PreviewInline label="Testing / analytical note" value={pathway.testingNote} />
        <PreviewInline label="Linked reference" value={pathway.linkedReference?.title ?? null} />
        <PreviewInline label="ASS class source" value={pathway.assClassSource} />
        <PreviewInline label="Project / location note" value={pathway.projectLocationNote} />
        <PreviewInline
          label="Treatment / management note"
          value={pathway.treatmentManagementNote}
        />
        <PreviewInline
          label="Step 5 chemical assessment"
          value={
            pathway.step5ChemicalAssessmentApplies === null
              ? null
              : pathway.step5ChemicalAssessmentApplies
                ? 'Still applies'
                : 'Marked as not required'
          }
        />
        <PreviewInline
          label="ASS Order / Exemption flags"
          value={
            pathway.assOrderRelevant || pathway.assExemptionRelevant
              ? [
                  pathway.assOrderRelevant ? 'Order relevant' : null,
                  pathway.assExemptionRelevant ? 'Exemption relevant' : null,
                ]
                  .filter(Boolean)
                  .join(', ')
              : null
          }
        />
        <PreviewInline label="Order / Exemption note" value={pathway.orderExemptionNote} />
      </div>

      <div className="mt-3">
        <div className="text-sm font-medium">Criteria marked</div>
        {checkedItems.length === 0 ? (
          <PreviewMuted>No criteria marked.</PreviewMuted>
        ) : (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {checkedItems.map((item) => (
              <li key={item.id}>
                {item.label}
                {item.note ? ` — ${item.note}` : ''}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function PreviewStepDecision({ step }: { step: ProjectWasteClassificationStepDecision }) {
  const checkedItems = step.checklistItems.filter((item) => item.isChecked);

  return (
    <div className="rounded-xl border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="font-medium">{step.stepTitle}</div>
        <Badge variant="outline">
          {labelFor(WASTE_CLASSIFICATION_OUTCOME_STATUS_OPTIONS, step.outcomeStatus)}
        </Badge>
        {step.classificationReached ? (
          <Badge variant="success">Classification reached</Badge>
        ) : null}
        {step.resultingWasteClass ? (
          <Badge variant="outline">{labelFor(WASTE_CLASS_OPTIONS, step.resultingWasteClass)}</Badge>
        ) : null}
      </div>

      <div className="mt-3 space-y-3 text-sm">
        <PreviewInline label="Decision summary" value={step.decisionSummary} />
        <PreviewInline label="Detailed reasoning" value={step.detailedReasoning} />
      </div>

      <div className="mt-3">
        <div className="text-sm font-medium">Checklist items marked</div>
        {checkedItems.length === 0 ? (
          <PreviewMuted>No checklist items marked.</PreviewMuted>
        ) : (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {checkedItems.map((item) => (
              <li key={item.id}>
                {item.label}
                {item.note ? ` — ${item.note}` : ''}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function PreviewCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="print:border-zinc-300 print:shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function PreviewGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2">{children}</div>;
}

function PreviewField({
  label,
  value,
  className,
}: {
  label: string;
  value: string | null | undefined;
  className?: string;
}) {
  return (
    <div className={className ? `space-y-1 ${className}` : 'space-y-1'}>
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="whitespace-pre-wrap text-sm">{value?.trim() ? value : 'Not recorded'}</div>
    </div>
  );
}

function PreviewInline({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value?.trim()) {
    return null;
  }

  return (
    <div>
      <span className="font-medium">{label}: </span>
      <span className="whitespace-pre-wrap">{value}</span>
    </div>
  );
}

function PreviewMuted({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-sm text-muted-foreground">{children}</p>;
}

function resolveProjectIdentity(project: Project): ProjectIdentity {
  const identity = extractProjectSpecifics(project).identity;

  return {
    projectNumber: identity.projectNumber || project.code || 'Not set',
    projectName: identity.projectName || project.name || 'Untitled Project',
    client: identity.client || 'Not set',
    address: identity.address || 'Not set',
  };
}

function formatDate(value: string | null) {
  if (!value) {
    return 'Not recorded';
  }

  return new Date(value).toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function labelFor(
  options: ReadonlyArray<{ value: string; label: string }>,
  value: string | null | undefined,
) {
  if (!value) {
    return 'Not recorded';
  }

  return options.find((option) => option.value === value)?.label ?? value.replace(/_/g, ' ');
}
