'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, FileJson, Printer, TriangleAlert } from 'lucide-react';
import type {
  DraftingProjectTransmittal,
  DraftingProjectTransmittalItem,
  DraftingSheetProfileAuditProvenance,
  Project,
} from '@eng/shared';
import { PageLoading } from '@/components/loading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useProjectDraftingTransmittal } from '@/hooks/use-drafting';
import {
  buildProjectDraftingTransmittalManifest,
  downloadProjectDraftingTransmittalManifestJson,
} from './project-drafting-transmittal-utils';

export function ProjectDraftingTransmittalPreviewPage({
  project,
  projectId,
  transmittalId,
}: {
  project: Project;
  projectId: string;
  transmittalId: string;
}) {
  const { data: transmittal, isLoading } = useProjectDraftingTransmittal(projectId, transmittalId);

  if (isLoading) {
    return <PageLoading />;
  }

  if (!transmittal) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <BackLink projectId={projectId} />
        <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          Project transmittal not found.
        </div>
      </div>
    );
  }

  return (
    <ProjectDraftingTransmittalPreview
      project={project}
      projectId={projectId}
      transmittal={transmittal}
    />
  );
}

export function ProjectDraftingTransmittalPreview({
  project,
  projectId,
  transmittal,
}: {
  project: Project;
  projectId: string;
  transmittal: DraftingProjectTransmittal;
}) {
  const manifest = React.useMemo(
    () => buildProjectDraftingTransmittalManifest(transmittal),
    [transmittal],
  );
  const isLocked = transmittal.status !== 'draft';
  const profileAuditSummary = React.useMemo(
    () => countProfileAuditProvenance(transmittal.payload.includedItems),
    [transmittal.payload.includedItems],
  );
  const hasFallbackProfileAudit = profileAuditSummary.fallbackResolved > 0;

  return (
    <div className="mx-auto max-w-[1100px] space-y-6 print:max-w-none print:space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4 print:hidden">
        <div className="space-y-2">
          <BackLink projectId={projectId} />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Project Drawing Transmittal</h1>
            <p className="text-sm text-muted-foreground">
              Browser Print / Save PDF remains the PDF path for this project transmittal cover.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => downloadProjectDraftingTransmittalManifestJson(transmittal)}
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
        data-testid="project-drafting-transmittal-preview"
      >
        <div className="border-b pb-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-sm uppercase tracking-wide text-slate-600">
                Project Drawing Transmittal
              </div>
              <h2 className="text-3xl font-bold">{transmittal.transmittalNumber}</h2>
              <p className="text-lg">{transmittal.payload.title}</p>
            </div>
            <Badge variant={transmittal.status === 'issued' ? 'default' : 'secondary'}>
              {transmittal.status}
            </Badge>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <MetadataBlock
            rows={[
              ['Project', `${project.name} (${project.code})`],
              ['Purpose', transmittal.payload.purpose],
              [
                'Lifecycle state',
                `${transmittal.status} / ${isLocked ? 'read-only locked' : 'editable draft'}`,
              ],
              ['Created', formatDateTime(transmittal.createdAt)],
              ['Updated', formatDateTime(transmittal.updatedAt)],
            ]}
            title="Project"
          />
          <MetadataBlock
            rows={[
              ['Issued by', transmittal.payload.issuedBy || '-'],
              [
                'Issued at',
                transmittal.payload.issuedAt ? formatDateTime(transmittal.payload.issuedAt) : '-',
              ],
              ['Recipients', transmittal.payload.issuedTo.join(', ') || '-'],
              ['CC', transmittal.payload.cc.join(', ') || '-'],
              ['Notes', transmittal.payload.notes || '-'],
            ]}
            title="Distribution"
          />
        </div>

        {isLocked ? (
          <WarningLine message="This issued project transmittal is locked; included drawing sheet issue references are read-only." />
        ) : (
          <WarningLine message="This project transmittal is draft and can still be edited from the register." />
        )}
        {transmittal.payload.warningSummary.map((warning) => (
          <WarningLine key={warning} message={warning} />
        ))}
        {hasFallbackProfileAudit ? (
          <WarningLine message="Some included sheets show fallback-resolved profile audit metadata; values may differ from the original issued output." />
        ) : null}

        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold">Included Drawing Sheet Snapshots</h3>
            <div
              className="flex flex-wrap gap-2 text-xs"
              aria-label="Profile audit provenance summary"
            >
              <ProfileAuditCountBadge label="Frozen" value={profileAuditSummary.frozen} />
              <ProfileAuditCountBadge
                label="Fallback"
                value={profileAuditSummary.fallbackResolved}
              />
              <ProfileAuditCountBadge label="Missing" value={profileAuditSummary.missing} />
            </div>
          </div>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-slate-100">
                <th className="p-2 text-left">Drawing</th>
                <th className="p-2 text-left">Drawing no.</th>
                <th className="p-2 text-left">Sheet</th>
                <th className="p-2 text-left">Revision</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Issue</th>
                <th className="p-2 text-left">Snapshot</th>
                <th className="p-2 text-left">Profile Audit</th>
              </tr>
            </thead>
            <tbody>
              {transmittal.payload.includedItems.map((item) => {
                const profileAuditStatus = resolveProfileAuditStatus(item);
                return (
                  <tr
                    className="border-b"
                    key={`${item.drawingId}-${item.drawingSheetIssueId}-${item.sheetId}`}
                  >
                    <td className="p-2">{item.drawingName}</td>
                    <td className="p-2">{item.drawingNumber ?? '-'}</td>
                    <td className="p-2">
                      {item.sheetNumber} · {item.sheetTitle}
                    </td>
                    <td className="p-2">{item.revision}</td>
                    <td className="p-2">{item.status}</td>
                    <td className="p-2">
                      {item.issueNumber} · {formatDate(item.issueDate)}
                    </td>
                    <td className="p-2">Frozen</td>
                    <td className="p-2">
                      <ProfileAuditStatusBadge
                        status={profileAuditStatus}
                        warning={item.profileAuditProvenance?.warning}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <MetadataBlock
            rows={[
              ['Manifest schema', manifest.manifestSchemaVersion],
              ['Manifest signature', manifest.manifestSignature ?? '-'],
              ['Drawings', String(manifest.provenanceSummary.drawingCount)],
              ['Frozen issues', String(manifest.provenanceSummary.frozenIssueCount)],
              ['Sheets', String(manifest.provenanceSummary.sheetCount)],
            ]}
            title="Manifest / Provenance"
          />
          <MetadataBlock
            rows={[
              ['Source', manifest.provenanceSummary.source],
              ['Warnings', String(manifest.warningSummary.length)],
              ['Binary policy', manifest.binaryPolicy],
            ]}
            title="Controls"
          />
        </div>
      </section>
    </div>
  );
}

function countProfileAuditProvenance(items: DraftingProjectTransmittalItem[]) {
  return items.reduce(
    (summary, item) => {
      const status = resolveProfileAuditStatus(item);
      if (status === 'frozen') {
        summary.frozen += 1;
      } else if (status === 'fallback_resolved') {
        summary.fallbackResolved += 1;
      } else {
        summary.missing += 1;
      }
      return summary;
    },
    {
      fallbackResolved: 0,
      frozen: 0,
      missing: 0,
    },
  );
}

function resolveProfileAuditStatus(
  item: DraftingProjectTransmittalItem,
): DraftingSheetProfileAuditProvenance['status'] {
  if (item.profileAuditProvenance?.status) {
    return item.profileAuditProvenance.status;
  }
  if (item.profileAudit?.provenance?.status) {
    return item.profileAudit.provenance.status;
  }
  if (item.profileAudit) {
    return 'frozen';
  }
  return 'missing';
}

function ProfileAuditCountBadge({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-sm border bg-slate-50 px-2 py-1 text-slate-700">
      {label}: {value}
    </span>
  );
}

function ProfileAuditStatusBadge({
  status,
  warning,
}: {
  status: DraftingSheetProfileAuditProvenance['status'];
  warning?: string;
}) {
  const label = formatProfileAuditStatus(status);
  const helper = warning ?? profileAuditStatusHelper(status);
  return (
    <Badge title={helper} variant={status === 'frozen' ? 'secondary' : 'outline'}>
      {label}
    </Badge>
  );
}

function formatProfileAuditStatus(status: DraftingSheetProfileAuditProvenance['status']) {
  if (status === 'frozen') {
    return 'Frozen profile audit';
  }
  if (status === 'fallback_resolved') {
    return 'Fallback resolved profile audit';
  }
  return 'Missing profile audit';
}

function profileAuditStatusHelper(status: DraftingSheetProfileAuditProvenance['status']) {
  if (status === 'frozen') {
    return 'Stored profile audit metadata was frozen with the issued sheet snapshot.';
  }
  if (status === 'fallback_resolved') {
    return 'Profile audit metadata was resolved from current model/profile data and may differ from original issued output.';
  }
  return 'No profile audit metadata is stored on this included sheet item.';
}

function BackLink({ projectId }: { projectId: string }) {
  return (
    <Link
      href={`/projects/${projectId}/drafting/transmittals`}
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      Back to project transmittals
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
