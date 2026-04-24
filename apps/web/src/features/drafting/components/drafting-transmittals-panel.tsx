import * as React from 'react';
import Link from 'next/link';
import type { DraftingDrawingTransmittalStatus, DraftingModel } from '@eng/shared';
import { Archive, Copy, ExternalLink, FileJson, Plus, Save, TriangleAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
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
import { useRootSheetTemplates } from '@/hooks/use-root-sheet-templates';
import { downloadDraftingTransmittalManifestJson } from '../export-utils';
import {
  addDrawingTransmittal,
  buildDraftingTransmittalWarnings,
  createDraftingTransmittal,
  getDrawingTransmittals,
  getFrozenDrawingSheetIssues,
  getIssueCompletenessWarnings,
  nextTransmittalNumber,
  updateDraftingTransmittal,
} from '../transmittals/drafting-transmittal-utils';

type TransmittalFormState = {
  cc: string;
  issueDate: string;
  issuedBy: string;
  issuedTo: string;
  notes: string;
  purpose: string;
  selectedIssueIds: string[];
  status: DraftingDrawingTransmittalStatus;
  title: string;
  transmittalNumber: string;
};

export function DraftingTransmittalsPanel({
  currentUserName,
  drawingTitle,
  model,
  onModelChange,
  projectId,
}: {
  currentUserName: string | null;
  drawingTitle: string;
  model: DraftingModel;
  onModelChange: (model: DraftingModel) => void;
  projectId: string;
}) {
  const transmittals = React.useMemo(() => getDrawingTransmittals(model), [model]);
  const frozenIssues = React.useMemo(() => getFrozenDrawingSheetIssues(model), [model]);
  const { data: rootTemplates = [] } = useRootSheetTemplates();
  const rootTemplatesById = React.useMemo(
    () => new Map(rootTemplates.map((template) => [template.id, template] as const)),
    [rootTemplates],
  );
  const [selectedTransmittalId, setSelectedTransmittalId] = React.useState('');
  const [form, setForm] = React.useState<TransmittalFormState>(() =>
    createEmptyForm(transmittals.length, currentUserName),
  );
  const selectedTransmittal =
    transmittals.find((transmittal) => transmittal.id === selectedTransmittalId) ?? null;
  const selectedWarnings = selectedTransmittal
    ? buildDraftingTransmittalWarnings({
        model,
        rootTemplatesById,
        transmittal: selectedTransmittal,
      }).filter((warning) => warning.messages.length > 0)
    : [];
  const selectedIssueCount = form.selectedIssueIds.length;
  const canSave = selectedIssueCount > 0 && form.transmittalNumber.trim() && form.title.trim();

  React.useEffect(() => {
    if (!selectedTransmittalId || transmittals.some((item) => item.id === selectedTransmittalId)) {
      return;
    }
    setSelectedTransmittalId(transmittals[0]?.id ?? '');
  }, [selectedTransmittalId, transmittals]);

  function patchForm(patch: Partial<TransmittalFormState>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function handleSelectIssue(issueId: string, checked: boolean) {
    setForm((current) => ({
      ...current,
      selectedIssueIds: checked
        ? [...new Set([...current.selectedIssueIds, issueId])]
        : current.selectedIssueIds.filter((candidate) => candidate !== issueId),
    }));
  }

  function handleCreateNew() {
    setSelectedTransmittalId('');
    setForm(createEmptyForm(transmittals.length, currentUserName));
  }

  function handleEdit(transmittalId: string) {
    const transmittal = transmittals.find((candidate) => candidate.id === transmittalId);
    if (!transmittal) {
      return;
    }

    setSelectedTransmittalId(transmittal.id);
    setForm({
      cc: transmittal.cc.join(', '),
      issueDate: transmittal.issueDate.slice(0, 10),
      issuedBy: transmittal.issuedBy,
      issuedTo: transmittal.issuedTo.join(', '),
      notes: transmittal.notes ?? '',
      purpose: transmittal.purpose,
      selectedIssueIds: transmittal.includedDrawingSheetIssueIds,
      status: transmittal.status,
      title: transmittal.title,
      transmittalNumber: transmittal.transmittalNumber,
    });
  }

  function handleSave() {
    if (!canSave) {
      return;
    }

    const input = {
      cc: splitList(form.cc),
      includedDrawingSheetIssueIds: form.selectedIssueIds,
      issueDate: toIsoDate(form.issueDate),
      issuedBy: form.issuedBy,
      issuedTo: splitList(form.issuedTo),
      notes: form.notes,
      purpose: form.purpose,
      status: form.status,
      title: form.title,
      transmittalNumber: form.transmittalNumber,
    };

    if (selectedTransmittal) {
      onModelChange(updateDraftingTransmittal(model, selectedTransmittal.id, input));
      return;
    }

    const transmittal = createDraftingTransmittal(model, {
      ...input,
      id: crypto.randomUUID(),
    });
    onModelChange(addDrawingTransmittal(model, transmittal));
    setSelectedTransmittalId(transmittal.id);
    setForm({
      cc: transmittal.cc.join(', '),
      issueDate: transmittal.issueDate.slice(0, 10),
      issuedBy: transmittal.issuedBy,
      issuedTo: transmittal.issuedTo.join(', '),
      notes: transmittal.notes ?? '',
      purpose: transmittal.purpose,
      selectedIssueIds: transmittal.includedDrawingSheetIssueIds,
      status: transmittal.status,
      title: transmittal.title,
      transmittalNumber: transmittal.transmittalNumber,
    });
  }

  function handleDuplicate(transmittalId: string) {
    const transmittal = transmittals.find((candidate) => candidate.id === transmittalId);
    if (!transmittal) {
      return;
    }

    const duplicate = createDraftingTransmittal(model, {
      cc: transmittal.cc,
      id: crypto.randomUUID(),
      includedDrawingSheetIssueIds: transmittal.includedDrawingSheetIssueIds,
      issuedBy: transmittal.issuedBy,
      issuedTo: transmittal.issuedTo,
      notes: transmittal.notes,
      purpose: transmittal.purpose,
      status: 'draft',
      title: `${transmittal.title} Copy`,
      transmittalNumber: nextTransmittalNumber(transmittals.length),
    });
    onModelChange(addDrawingTransmittal(model, duplicate));
    setSelectedTransmittalId(duplicate.id);
  }

  function handleArchive(transmittalId: string) {
    const transmittal = transmittals.find((candidate) => candidate.id === transmittalId);
    if (!transmittal) {
      return;
    }

    onModelChange(
      updateDraftingTransmittal(model, transmittalId, {
        cc: transmittal.cc,
        includedDrawingSheetIssueIds: transmittal.includedDrawingSheetIssueIds,
        issuedBy: transmittal.issuedBy,
        issuedTo: transmittal.issuedTo,
        notes: transmittal.notes,
        purpose: transmittal.purpose,
        status: 'archived',
        title: transmittal.title,
        transmittalNumber: transmittal.transmittalNumber,
      }),
    );
  }

  return (
    <div className="space-y-4" data-testid="drafting-transmittals-panel">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium">Transmittal Register</div>
          <div className="text-xs text-muted-foreground">
            {transmittals.length} package{transmittals.length === 1 ? '' : 's'} from{' '}
            {frozenIssues.length} frozen drawing sheet issue snapshot
            {frozenIssues.length === 1 ? '' : 's'}
          </div>
        </div>
        <Button size="sm" type="button" onClick={handleCreateNew}>
          <Plus className="mr-2 h-4 w-4" />
          New
        </Button>
      </div>

      {transmittals.length > 0 ? (
        <div className="overflow-x-auto rounded-md border">
          <table
            className="min-w-full divide-y text-sm"
            data-testid="drafting-transmittal-register-table"
          >
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Number</th>
                <th className="px-3 py-2 text-left">Title</th>
                <th className="px-3 py-2 text-left">Purpose</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Issue date</th>
                <th className="px-3 py-2 text-left">Issued by</th>
                <th className="px-3 py-2 text-left">Sheets</th>
                <th className="px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {transmittals.map((transmittal) => (
                <tr key={transmittal.id}>
                  <td className="px-3 py-2 font-medium">{transmittal.transmittalNumber}</td>
                  <td className="px-3 py-2">{transmittal.title}</td>
                  <td className="px-3 py-2">{transmittal.purpose}</td>
                  <td className="px-3 py-2">
                    <Badge variant={transmittal.status === 'issued' ? 'default' : 'secondary'}>
                      {transmittal.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">{formatDate(transmittal.issueDate)}</td>
                  <td className="px-3 py-2">{transmittal.issuedBy || '-'}</td>
                  <td className="px-3 py-2">{transmittal.includedSheets.length}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      <Button
                        size="sm"
                        type="button"
                        variant="outline"
                        onClick={() => handleEdit(transmittal.id)}
                      >
                        Open
                      </Button>
                      <Link
                        className={buttonVariants({ size: 'sm', variant: 'outline' })}
                        href={`/projects/${projectId}/drafting/${model.drawingId}/transmittals/${transmittal.id}/preview`}
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Preview
                      </Link>
                      <Button
                        size="sm"
                        type="button"
                        variant="outline"
                        onClick={() =>
                          downloadDraftingTransmittalManifestJson({
                            model,
                            rootTemplatesById,
                            title: drawingTitle,
                            transmittal,
                          })
                        }
                      >
                        <FileJson className="mr-2 h-4 w-4" />
                        JSON
                      </Button>
                      <Button
                        aria-label={`Duplicate ${transmittal.transmittalNumber}`}
                        size="icon"
                        type="button"
                        variant="ghost"
                        onClick={() => handleDuplicate(transmittal.id)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        aria-label={`Archive ${transmittal.transmittalNumber}`}
                        disabled={transmittal.status === 'archived'}
                        size="icon"
                        type="button"
                        variant="ghost"
                        onClick={() => handleArchive(transmittal.id)}
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          No transmittals yet.
        </div>
      )}

      <div className="space-y-3 rounded-md border p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-medium">
            {selectedTransmittal ? 'Edit transmittal' : 'Create transmittal'}
          </div>
          <Button disabled={!canSave} size="sm" type="button" onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
        </div>

        {!canSave ? (
          <WarningLine message="Select at least one frozen drawing sheet issue and enter a number and title." />
        ) : null}
        {form.status === 'draft' ? (
          <WarningLine message="Draft transmittals are editable register records and are not final issued packages." />
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          <LabeledInput
            id="drafting-transmittal-number"
            label="Transmittal number"
            value={form.transmittalNumber}
            onChange={(value) => patchForm({ transmittalNumber: value })}
          />
          <LabeledInput
            id="drafting-transmittal-issue-date"
            label="Issue date"
            type="date"
            value={form.issueDate}
            onChange={(value) => patchForm({ issueDate: value })}
          />
        </div>
        <LabeledInput
          id="drafting-transmittal-title"
          label="Title"
          value={form.title}
          onChange={(value) => patchForm({ title: value })}
        />
        <LabeledInput
          id="drafting-transmittal-purpose"
          label="Purpose"
          value={form.purpose}
          onChange={(value) => patchForm({ purpose: value })}
        />
        <div className="space-y-1">
          <Label htmlFor="drafting-transmittal-status">Status</Label>
          <Select
            value={form.status}
            onValueChange={(value) =>
              patchForm({ status: value as DraftingDrawingTransmittalStatus })
            }
          >
            <SelectTrigger id="drafting-transmittal-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="issued">Issued</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <LabeledInput
          id="drafting-transmittal-issued-by"
          label="Issued by"
          value={form.issuedBy}
          onChange={(value) => patchForm({ issuedBy: value })}
        />
        <LabeledInput
          id="drafting-transmittal-issued-to"
          label="Issued to"
          value={form.issuedTo}
          onChange={(value) => patchForm({ issuedTo: value })}
        />
        <LabeledInput
          id="drafting-transmittal-cc"
          label="CC"
          value={form.cc}
          onChange={(value) => patchForm({ cc: value })}
        />
        <div className="space-y-1">
          <Label htmlFor="drafting-transmittal-notes">Notes</Label>
          <Textarea
            id="drafting-transmittal-notes"
            value={form.notes}
            onChange={(event) => patchForm({ notes: event.target.value })}
          />
        </div>

        <div className="space-y-2 rounded-md border p-2">
          <div className="text-xs font-medium uppercase text-muted-foreground">
            Frozen drawing sheet issue snapshots
          </div>
          {frozenIssues.length > 0 ? (
            frozenIssues.map((issue) => {
              const warnings = getIssueCompletenessWarnings(issue);
              return (
                <div key={issue.id} className="space-y-1">
                  <CheckboxRow
                    checked={form.selectedIssueIds.includes(issue.id)}
                    id={`drafting-transmittal-issue-${issue.id}`}
                    label={`${issue.issueNumber} - Rev ${issue.revision} - ${issue.lockedDrawingSheets.length} sheet(s)`}
                    onChange={(checked) => handleSelectIssue(issue.id, checked)}
                  />
                  {warnings.map((warning) => (
                    <WarningLine key={warning} message={warning} />
                  ))}
                </div>
              );
            })
          ) : (
            <div className="text-sm text-muted-foreground">
              Create a drawing sheet issue snapshot before assembling a transmittal.
            </div>
          )}
        </div>

        {selectedWarnings.length > 0 ? (
          <div className="space-y-1 rounded-md bg-muted p-2">
            {selectedWarnings.flatMap((warning) =>
              warning.messages.map((message) => (
                <WarningLine key={`${warning.drawingSheetIssueId}-${message}`} message={message} />
              )),
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function LabeledInput({
  id,
  label,
  onChange,
  type = 'text',
  value,
}: {
  id: string;
  label: string;
  onChange: (value: string) => void;
  type?: string;
  value: string;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function CheckboxRow({
  checked,
  id,
  label,
  onChange,
}: {
  checked: boolean;
  id: string;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm" htmlFor={id}>
      <input
        checked={checked}
        className="h-4 w-4 rounded border-border"
        id={id}
        type="checkbox"
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

function WarningLine({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 text-xs text-amber-700">
      <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function createEmptyForm(count: number, currentUserName: string | null): TransmittalFormState {
  return {
    cc: '',
    issueDate: new Date().toISOString().slice(0, 10),
    issuedBy: currentUserName ?? '',
    issuedTo: '',
    notes: '',
    purpose: 'For issue',
    selectedIssueIds: [],
    status: 'draft',
    title: 'Drawing issue package',
    transmittalNumber: nextTransmittalNumber(count),
  };
}

function splitList(value: string) {
  return value
    .split(/[,\n]/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function toIsoDate(value: string) {
  return value ? new Date(`${value}T00:00:00.000Z`).toISOString() : new Date().toISOString();
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-AU', { dateStyle: 'medium' }).format(new Date(value));
}
