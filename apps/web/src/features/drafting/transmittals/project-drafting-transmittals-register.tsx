'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, FileJson, Plus, Send, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import type { DraftingDrawing, DraftingProjectTransmittal, Project } from '@eng/shared';
import { useQueries } from '@tanstack/react-query';
import { PageLoading } from '@/components/loading';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
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
import { Textarea } from '@/components/ui/textarea';
import {
  useCreateProjectDraftingTransmittal,
  useDraftingDrawings,
  useProjectDraftingTransmittals,
  useUpdateProjectDraftingTransmittal,
} from '@/hooks/use-drafting';
import { api } from '@/lib/api-client';
import {
  countProjectTransmittalProfileAuditProvenance,
  downloadProjectDraftingTransmittalManifestJson,
  filterProjectTransmittalsByAuditCoverage,
  hasProjectTransmittalProfileAuditCoverageWarning,
  nextProjectTransmittalNumber,
  sortProjectTransmittalsByAuditCoverage,
  type ProjectTransmittalAuditCoverageFilter,
  type ProjectTransmittalSortMode,
} from './project-drafting-transmittal-utils';

type ItemRef = {
  drawingId: string;
  drawingSheetIssueId: string;
  sheetId: string;
};

type FormState = {
  cc: string;
  issuedBy: string;
  issuedTo: string;
  notes: string;
  purpose: string;
  title: string;
  transmittalNumber: string;
};

const emptyForm: FormState = {
  cc: '',
  issuedBy: '',
  issuedTo: '',
  notes: '',
  purpose: 'For information',
  title: 'Project drawing issue package',
  transmittalNumber: 'TRN-001',
};

export function ProjectDraftingTransmittalsRegister({
  project,
  projectId,
}: {
  project: Project;
  projectId: string;
}) {
  const { data: drawings = [], isLoading: drawingsLoading } = useDraftingDrawings(projectId);
  const { data: transmittals = [], isLoading: transmittalsLoading } =
    useProjectDraftingTransmittals(projectId);
  const drawingQueries = useQueries({
    queries: drawings.map((drawing) => ({
      enabled: !!projectId,
      queryFn: () => api<DraftingDrawing>(`/projects/${projectId}/drafting/drawings/${drawing.id}`),
      queryKey: ['projects', projectId, 'drafting', 'drawings', drawing.id] as const,
    })),
  });
  const detailedDrawings = drawingQueries
    .map((query) => query.data)
    .filter((drawing): drawing is DraftingDrawing => Boolean(drawing));
  const isLoading =
    drawingsLoading || transmittalsLoading || drawingQueries.some((query) => query.isLoading);
  const createTransmittal = useCreateProjectDraftingTransmittal(projectId);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const selectedTransmittal =
    transmittals.find((transmittal) => transmittal.id === selectedId) ?? null;
  const updateTransmittal = useUpdateProjectDraftingTransmittal(
    projectId,
    selectedTransmittal?.id ?? '',
  );
  const [auditFilter, setAuditFilter] =
    React.useState<ProjectTransmittalAuditCoverageFilter>('all');
  const [sortMode, setSortMode] = React.useState<ProjectTransmittalSortMode>('newest');
  const [form, setForm] = React.useState<FormState>(emptyForm);
  const [selectedItems, setSelectedItems] = React.useState<ItemRef[]>([]);
  const visibleTransmittals = React.useMemo(
    () =>
      sortProjectTransmittalsByAuditCoverage(
        filterProjectTransmittalsByAuditCoverage(transmittals, auditFilter),
        sortMode,
      ),
    [auditFilter, sortMode, transmittals],
  );

  React.useEffect(() => {
    if (!selectedTransmittal) {
      setForm({
        ...emptyForm,
        transmittalNumber: nextProjectTransmittalNumber(transmittals),
      });
      setSelectedItems([]);
      return;
    }
    setForm({
      cc: selectedTransmittal.payload.cc.join(', '),
      issuedBy: selectedTransmittal.payload.issuedBy ?? '',
      issuedTo: selectedTransmittal.payload.issuedTo.join(', '),
      notes: selectedTransmittal.payload.notes ?? '',
      purpose: selectedTransmittal.payload.purpose,
      title: selectedTransmittal.payload.title,
      transmittalNumber: selectedTransmittal.transmittalNumber,
    });
    setSelectedItems(
      selectedTransmittal.payload.includedItems.map((item) => ({
        drawingId: item.drawingId,
        drawingSheetIssueId: item.drawingSheetIssueId,
        sheetId: item.sheetId,
      })),
    );
  }, [selectedTransmittal, transmittals]);

  if (isLoading) {
    return <PageLoading />;
  }

  const selectedKeys = new Set(selectedItems.map(itemKey));
  const frozenItems = detailedDrawings.flatMap((drawing) =>
    drawing.model.drawingSheetIssues
      .filter((issue) => issue.status !== 'draft' && issue.lockedDrawingSheets.length > 0)
      .flatMap((issue) =>
        issue.lockedDrawingSheets.map((sheet) => ({
          drawing,
          issue,
          key: itemKey({
            drawingId: drawing.id,
            drawingSheetIssueId: issue.id,
            sheetId: sheet.id,
          }),
          sheet,
        })),
      ),
  );
  const packageItems = frozenItems.filter((item) => selectedKeys.has(item.key));
  const isLocked = Boolean(selectedTransmittal && selectedTransmittal.status !== 'draft');

  function patchForm(patch: Partial<FormState>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function toggleItem(ref: ItemRef) {
    if (isLocked) {
      return;
    }
    setSelectedItems((current) => {
      const key = itemKey(ref);
      return current.some((candidate) => itemKey(candidate) === key)
        ? current.filter((candidate) => itemKey(candidate) !== key)
        : [...current, ref];
    });
  }

  async function save(status: 'draft' | 'issued' = 'draft') {
    const payload = {
      cc: splitParties(form.cc),
      includedItems: selectedItems,
      issuedAt: status === 'issued' ? new Date().toISOString() : undefined,
      issuedBy: form.issuedBy,
      issuedTo: splitParties(form.issuedTo),
      notes: form.notes,
      purpose: form.purpose,
      status,
      title: form.title,
      transmittalNumber: form.transmittalNumber,
    };
    try {
      const saved = selectedTransmittal
        ? await updateTransmittal.mutateAsync(payload)
        : await createTransmittal.mutateAsync(payload);
      setSelectedId(saved.id);
      toast.success(status === 'issued' ? 'Project transmittal issued' : 'Draft transmittal saved');
    } catch {
      toast.error('Failed to save project transmittal');
    }
  }

  return (
    <>
      <PageHeader
        title="Drafting Transmittals"
        description={`${project.code} · Project Drawing Transmittal register`}
        actions={
          <Button onClick={() => setSelectedId(null)}>
            <Plus className="mr-2 h-4 w-4" />
            New Project Transmittal
          </Button>
        }
        badges={
          <>
            <Badge variant="outline">{transmittals.length} transmittal(s)</Badge>
            <Badge variant="secondary">{frozenItems.length} issued sheet snapshot(s)</Badge>
          </>
        }
      />

      <div className="mb-4">
        <Link
          href={`/projects/${projectId}/drafting`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Drafting register
        </Link>
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="space-y-3">
          <ProjectTransmittalRegisterAuditControls
            auditFilter={auditFilter}
            onAuditFilterChange={setAuditFilter}
            onSortModeChange={setSortMode}
            sortMode={sortMode}
          />
          {visibleTransmittals.map((transmittal) => (
            <Card
              className={selectedId === transmittal.id ? 'border-primary' : ''}
              key={transmittal.id}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{transmittal.transmittalNumber}</CardTitle>
                    <CardDescription>{transmittal.payload.title}</CardDescription>
                  </div>
                  <Badge variant={transmittal.status === 'draft' ? 'warning' : 'secondary'}>
                    {transmittal.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <ProjectTransmittalProfileAuditCoverage transmittal={transmittal} />
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setSelectedId(transmittal.id)}>
                    Open
                  </Button>
                  <Link
                    className={buttonVariants({ size: 'sm', variant: 'outline' })}
                    href={`/projects/${projectId}/drafting/transmittals/${transmittal.id}/preview`}
                  >
                    Preview
                  </Link>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => downloadProjectDraftingTransmittalManifestJson(transmittal)}
                  >
                    <FileJson className="mr-2 h-4 w-4" />
                    Manifest
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {transmittals.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
              No project transmittals yet.
            </div>
          ) : visibleTransmittals.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
              No transmittals match this audit filter.
            </div>
          ) : null}
        </section>

        <section className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedTransmittal ? 'Project transmittal details' : 'Create project transmittal'}
              </CardTitle>
              <CardDescription>
                {isLocked
                  ? 'Issued, superseded, and void transmittals are frozen read-only records.'
                  : 'Draft transmittals can include issued sheet snapshots from multiple drawings.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <TextField
                disabled={isLocked}
                id="project-transmittal-number"
                label="Transmittal number"
                onChange={(value) => patchForm({ transmittalNumber: value })}
                value={form.transmittalNumber}
              />
              <TextField
                disabled={isLocked}
                id="project-transmittal-purpose"
                label="Purpose"
                onChange={(value) => patchForm({ purpose: value })}
                value={form.purpose}
              />
              <TextField
                disabled={isLocked}
                id="project-transmittal-title"
                label="Title / subject"
                onChange={(value) => patchForm({ title: value })}
                value={form.title}
              />
              <TextField
                disabled={isLocked}
                id="project-transmittal-issued-by"
                label="Issued by"
                onChange={(value) => patchForm({ issuedBy: value })}
                value={form.issuedBy}
              />
              <TextField
                disabled={isLocked}
                id="project-transmittal-issued-to"
                label="Recipients"
                onChange={(value) => patchForm({ issuedTo: value })}
                value={form.issuedTo}
              />
              <TextField
                disabled={isLocked}
                id="project-transmittal-cc"
                label="CC"
                onChange={(value) => patchForm({ cc: value })}
                value={form.cc}
              />
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="project-transmittal-notes">Notes</Label>
                <Textarea
                  disabled={isLocked}
                  id="project-transmittal-notes"
                  onChange={(event) => patchForm({ notes: event.target.value })}
                  value={form.notes}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Issued Sheet Snapshot Selection</CardTitle>
              <CardDescription>
                Available frozen drawing sheet issues grouped by project drawing.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {detailedDrawings.map((drawing) => (
                <div className="rounded-md border p-3" key={drawing.id}>
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <h3 className="font-medium">{drawing.title}</h3>
                    <Badge variant="outline">
                      {drawing.model.titleBlock?.drawingNumber ?? drawing.id}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {drawing.model.drawingSheetIssues
                      .filter(
                        (issue) => issue.status !== 'draft' && issue.lockedDrawingSheets.length > 0,
                      )
                      .flatMap((issue) =>
                        issue.lockedDrawingSheets.map((sheet) => {
                          const ref = {
                            drawingId: drawing.id,
                            drawingSheetIssueId: issue.id,
                            sheetId: sheet.id,
                          };
                          const checked = selectedKeys.has(itemKey(ref));
                          return (
                            <label
                              className="flex items-start gap-3 rounded-sm border p-2 text-sm"
                              key={itemKey(ref)}
                            >
                              <input
                                checked={checked}
                                disabled={isLocked}
                                onChange={() => toggleItem(ref)}
                                type="checkbox"
                              />
                              <span className="grid gap-1">
                                <span className="font-medium">
                                  {sheet.sheetNumber} · {sheet.title || sheet.name}
                                </span>
                                <span className="text-muted-foreground">
                                  {issue.issueNumber} · Rev {issue.revision} · {issue.status} ·
                                  frozen snapshot
                                </span>
                              </span>
                            </label>
                          );
                        }),
                      )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Transmittal Package</CardTitle>
              <CardDescription>{packageItems.length} selected sheet snapshot(s)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="p-2 text-left">Drawing</th>
                      <th className="p-2 text-left">Drawing no.</th>
                      <th className="p-2 text-left">Sheet</th>
                      <th className="p-2 text-left">Revision</th>
                      <th className="p-2 text-left">Issue</th>
                      <th className="p-2 text-left">Snapshot</th>
                    </tr>
                  </thead>
                  <tbody>
                    {packageItems.map(({ drawing, issue, sheet, key }) => (
                      <tr className="border-b" key={key}>
                        <td className="p-2">{drawing.title}</td>
                        <td className="p-2">{issue.lockedTitleBlock.drawingNumber ?? '-'}</td>
                        <td className="p-2">
                          {sheet.sheetNumber} · {sheet.title || sheet.name}
                        </td>
                        <td className="p-2">{issue.revision}</td>
                        <td className="p-2">
                          {issue.issueNumber} · {formatDate(issue.issueDate)}
                        </td>
                        <td className="p-2">Frozen</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={
                    isLocked ||
                    selectedItems.length === 0 ||
                    createTransmittal.isPending ||
                    updateTransmittal.isPending
                  }
                  onClick={() => save('draft')}
                  type="button"
                >
                  Save Draft
                </Button>
                <Button
                  disabled={
                    isLocked ||
                    selectedItems.length === 0 ||
                    createTransmittal.isPending ||
                    updateTransmittal.isPending
                  }
                  onClick={() => save('issued')}
                  type="button"
                  variant="outline"
                >
                  <Send className="mr-2 h-4 w-4" />
                  Issue and Lock
                </Button>
                {selectedTransmittal ? (
                  <Link
                    className={buttonVariants({ variant: 'ghost' })}
                    href={`/projects/${projectId}/drafting/transmittals/${selectedTransmittal.id}/preview`}
                  >
                    Preview
                  </Link>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </>
  );
}

export function ProjectTransmittalRegisterAuditControls({
  auditFilter,
  onAuditFilterChange,
  onSortModeChange,
  sortMode,
}: {
  auditFilter: ProjectTransmittalAuditCoverageFilter;
  onAuditFilterChange: (value: ProjectTransmittalAuditCoverageFilter) => void;
  onSortModeChange: (value: ProjectTransmittalSortMode) => void;
  sortMode: ProjectTransmittalSortMode;
}) {
  return (
    <div className="grid gap-3 rounded-md border bg-card p-3 text-sm sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="project-transmittal-audit-filter">Audit filter</Label>
        <Select
          onValueChange={(value) =>
            onAuditFilterChange(value as ProjectTransmittalAuditCoverageFilter)
          }
          value={auditFilter}
        >
          <SelectTrigger id="project-transmittal-audit-filter">
            <SelectValue placeholder="All transmittals" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All transmittals</SelectItem>
            <SelectItem value="needs_review">Needs audit review</SelectItem>
            <SelectItem value="frozen_only">Frozen only</SelectItem>
            <SelectItem value="fallback_resolved">Fallback resolved</SelectItem>
            <SelectItem value="missing_audit">Missing audit</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="project-transmittal-audit-sort">Sort</Label>
        <Select
          onValueChange={(value) => onSortModeChange(value as ProjectTransmittalSortMode)}
          value={sortMode}
        >
          <SelectTrigger id="project-transmittal-audit-sort">
            <SelectValue placeholder="Newest first" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
            <SelectItem value="audit_review">Audit review first</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export function ProjectTransmittalProfileAuditCoverage({
  transmittal,
}: {
  transmittal: DraftingProjectTransmittal;
}) {
  const summary = countProjectTransmittalProfileAuditProvenance(transmittal.payload.includedItems);
  const hasWarning = hasProjectTransmittalProfileAuditCoverageWarning(summary);

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      <ProfileAuditCoverageChip label="Frozen" value={summary.frozen} />
      <ProfileAuditCoverageChip label="Fallback" value={summary.fallbackResolved} />
      <ProfileAuditCoverageChip label="Missing" value={summary.missing} />
      {hasWarning ? (
        <span
          className="inline-flex items-center gap-1 rounded-sm border border-amber-300 bg-amber-50 px-2 py-1 text-amber-900"
          title="Some included sheets rely on fallback-resolved or missing profile audit metadata. Open preview for details."
        >
          <TriangleAlert className="h-3 w-3" />
          Review audit coverage
        </span>
      ) : null}
    </div>
  );
}

function ProfileAuditCoverageChip({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-sm border bg-muted/40 px-2 py-1 text-muted-foreground">
      {label}: {value}
    </span>
  );
}

function TextField({
  disabled,
  id,
  label,
  onChange,
  value,
}: {
  disabled: boolean;
  id: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        disabled={disabled}
        id={id}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </div>
  );
}

function itemKey(ref: ItemRef) {
  return `${ref.drawingId}:${ref.drawingSheetIssueId}:${ref.sheetId}`;
}

function splitParties(value: string) {
  return value
    .split(/[,\n]/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-AU', { dateStyle: 'medium' }).format(new Date(value));
}
