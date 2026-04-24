'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, FileJson, Printer, TriangleAlert } from 'lucide-react';
import type { DraftingDrawing, DraftingDrawingTransmittal, Project } from '@eng/shared';
import { PageLoading } from '@/components/loading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { RootSheetTemplate } from '@/features/templates/root-sheet-template-types';
import { useDraftingDrawing } from '@/hooks/use-drafting';
import { useRootSheetTemplates } from '@/hooks/use-root-sheet-templates';
import { downloadDraftingTransmittalManifestJson } from '../export-utils';
import { getDraftingCurrentRevisionLabel, getDraftingDrawingTitle } from '../model-utils';
import {
  buildDraftingTransmittalManifest,
  buildDraftingTransmittalWarnings,
  getDrawingTransmittals,
  isDraftingTransmittalEditable,
} from './drafting-transmittal-utils';

export function DraftingTransmittalPreviewPage({
  drawingId,
  project,
  projectId,
  transmittalId,
}: {
  drawingId: string;
  project: Project;
  projectId: string;
  transmittalId: string;
}) {
  const { data: drawing, isLoading: drawingLoading } = useDraftingDrawing(projectId, drawingId);
  const { data: rootTemplates = [], isLoading: templatesLoading } = useRootSheetTemplates();

  if (drawingLoading || templatesLoading || !drawing) {
    return <PageLoading />;
  }

  const transmittal =
    getDrawingTransmittals(drawing.model).find((candidate) => candidate.id === transmittalId) ??
    null;

  return (
    <DraftingTransmittalPreview
      drawing={drawing}
      project={project}
      projectId={projectId}
      rootTemplates={rootTemplates}
      transmittal={transmittal}
    />
  );
}

export function DraftingTransmittalPreview({
  drawing,
  project,
  projectId,
  rootTemplates,
  transmittal,
}: {
  drawing: DraftingDrawing;
  project: Project;
  projectId: string;
  rootTemplates: RootSheetTemplate[];
  transmittal: DraftingDrawingTransmittal | null;
}) {
  const rootTemplatesById = React.useMemo(
    () => new Map(rootTemplates.map((template) => [template.id, template] as const)),
    [rootTemplates],
  );
  const drawingTitle = getDraftingDrawingTitle(drawing.model, drawing.title);
  const revision = getDraftingCurrentRevisionLabel(drawing.model);
  const manifest = transmittal
    ? buildDraftingTransmittalManifest({
        model: drawing.model,
        rootTemplatesById,
        transmittal,
      })
    : null;
  const warnings = transmittal
    ? buildDraftingTransmittalWarnings({
        model: drawing.model,
        rootTemplatesById,
        transmittal,
      }).filter((warning) => warning.messages.length > 0)
    : [];

  if (!transmittal || !manifest) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <BackLink drawingId={drawing.id} projectId={projectId} />
        <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          Transmittal not found.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-6 print:max-w-none print:space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4 print:hidden">
        <div className="space-y-2">
          <BackLink drawingId={drawing.id} projectId={projectId} />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Transmittal Preview</h1>
            <p className="text-sm text-muted-foreground">
              Browser Print / Save PDF remains the PDF path for this cover manifest.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              downloadDraftingTransmittalManifestJson({
                model: drawing.model,
                rootTemplatesById,
                title: drawingTitle,
                transmittal,
              })
            }
          >
            <FileJson className="mr-2 h-4 w-4" />
            Manifest JSON
          </Button>
          <Button type="button" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      <section
        className="space-y-6 bg-white text-black print:bg-white"
        data-testid="drafting-transmittal-preview"
      >
        <div className="border-b pb-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-sm uppercase tracking-wide text-slate-600">
                Drawing Transmittal
              </div>
              <h2 className="text-3xl font-bold">{transmittal.transmittalNumber}</h2>
              <p className="text-lg">{transmittal.title}</p>
            </div>
            <Badge variant={transmittal.status === 'issued' ? 'default' : 'secondary'}>
              {transmittal.status === 'void' ? 'void' : transmittal.status}
            </Badge>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <MetadataBlock
            rows={[
              ['Project', `${project.name} (${project.code})`],
              ['Drawing', drawingTitle],
              ['Drawing revision', revision ?? '-'],
              ['Issue date', formatDate(transmittal.issueDate)],
              ['Purpose', transmittal.purpose],
              [
                'Lifecycle state',
                `${transmittal.status} / ${
                  isDraftingTransmittalEditable(transmittal) ? 'editable draft' : 'read-only locked'
                }`,
              ],
            ]}
            title="Project / Drawing"
          />
          <MetadataBlock
            rows={[
              ['Issued by', transmittal.issuedBy || '-'],
              ['Issued at', transmittal.issuedAt ? formatDateTime(transmittal.issuedAt) : '-'],
              ['Issued to', transmittal.issuedTo.join(', ') || '-'],
              ['CC', transmittal.cc.join(', ') || '-'],
              ['Notes', transmittal.notes || '-'],
            ]}
            title="Distribution"
          />
        </div>

        {transmittal.status === 'draft' ? (
          <WarningLine message="This transmittal is draft and is not issued evidence." />
        ) : (
          <WarningLine message="This transmittal is locked; included drawing sheet issue references are read-only." />
        )}
        {!manifest.artifactEvidence && transmittal.status !== 'draft' ? (
          <WarningLine message="PDF evidence metadata is not attached yet. Browser Print / Save PDF remains the PDF path." />
        ) : null}
        {warnings.flatMap((warning) =>
          warning.messages.map((message) => (
            <WarningLine key={`${warning.drawingSheetIssueId}-${message}`} message={message} />
          )),
        )}

        <div>
          <h3 className="mb-2 text-lg font-semibold">Included Sheet Issue List</h3>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-slate-100">
                <th className="p-2 text-left">Sheet</th>
                <th className="p-2 text-left">Name</th>
                <th className="p-2 text-left">Revision</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Issue</th>
                <th className="p-2 text-left">Snapshot reference</th>
              </tr>
            </thead>
            <tbody>
              {transmittal.includedSheets.map((sheet) => (
                <tr key={`${sheet.drawingSheetIssueId}-${sheet.sheetId}`} className="border-b">
                  <td className="p-2 font-medium">{sheet.sheetNumber}</td>
                  <td className="p-2">{sheet.sheetName}</td>
                  <td className="p-2">{sheet.revision}</td>
                  <td className="p-2">{sheet.status}</td>
                  <td className="p-2">{sheet.issueNumber}</td>
                  <td className="p-2">{sheet.snapshotLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <MetadataBlock
            rows={[
              ['Drawing sheet issue IDs', transmittal.includedDrawingSheetIssueIds.join(', ')],
              ['Locked sheet records', String(transmittal.includedSheets.length)],
              ['Issue action ID', manifest.finalisation.issueActionId ?? '-'],
              ['Manifest signature', manifest.manifestSignature ?? '-'],
              ['Created', formatDateTime(transmittal.createdAt)],
              ['Updated', formatDateTime(transmittal.updatedAt)],
            ]}
            title="Manifest / Provenance"
          />
          <MetadataBlock
            rows={[
              ['Live drift detected', manifest.comparisonSummary.hasDrift ? 'Yes' : 'No'],
              [
                'Object provenance records',
                String(
                  manifest.issueManifests.reduce(
                    (total, issue) => total + issue.objectProvenanceSummary.length,
                    0,
                  ),
                ),
              ],
              [
                'Template snapshots',
                String(
                  manifest.issueManifests.reduce(
                    (total, issue) => total + issue.lockedTemplateMetadata.length,
                    0,
                  ),
                ),
              ],
              [
                'Last manifest JSON export',
                transmittal.lastExportedAt ? formatDateTime(transmittal.lastExportedAt) : '-',
              ],
              ['Export limitation', 'Use Browser Print / Save PDF for this cover sheet preview.'],
            ]}
            title="Summary"
          />
        </div>

        <MetadataBlock
          rows={[
            ['Artifact file', manifest.artifactEvidence?.artifactFileName ?? '-'],
            ['Artifact document ID', manifest.artifactEvidence?.artifactDocumentId ?? '-'],
            [
              'Artifact added',
              manifest.artifactEvidence?.artifactAddedAt
                ? formatDateTime(manifest.artifactEvidence.artifactAddedAt)
                : '-',
            ],
            ['Artifact added by', manifest.artifactEvidence?.artifactAddedBy ?? '-'],
            ['Artifact notes', manifest.artifactEvidence?.artifactNotes ?? '-'],
          ]}
          title="PDF Evidence"
        />
      </section>
    </div>
  );
}

function BackLink({ drawingId, projectId }: { drawingId: string; projectId: string }) {
  return (
    <Link
      href={`/projects/${projectId}/drafting/${drawingId}`}
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      Back to Drafting editor
    </Link>
  );
}

function MetadataBlock({ rows, title }: { rows: [string, string][]; title: string }) {
  return (
    <div className="rounded-sm border p-3">
      <h3 className="mb-2 font-semibold">{title}</h3>
      <dl className="space-y-1 text-sm">
        {rows.map(([label, value]) => (
          <div className="grid grid-cols-[140px_minmax(0,1fr)] gap-2" key={label}>
            <dt className="text-slate-600">{label}</dt>
            <dd className="break-words">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function WarningLine({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-sm border border-amber-300 bg-amber-50 p-2 text-sm text-amber-900">
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-AU', { dateStyle: 'medium' }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-AU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
