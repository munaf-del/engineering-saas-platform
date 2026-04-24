import * as React from 'react';
import Link from 'next/link';
import type { Document, DraftingDrawingTransmittalStatus, DraftingModel } from '@eng/shared';
import {
  Ban,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileText,
  FileJson,
  LockKeyhole,
  Plus,
  Save,
  TriangleAlert,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
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
import { useProjectDocuments } from '@/hooks/use-documents';
import {
  useAttachDraftingTransmittalEvidence,
  useRemoveDraftingTransmittalEvidence,
  useUploadDraftingTransmittalEvidence,
} from '@/hooks/use-drafting';
import { useRootSheetTemplates } from '@/hooks/use-root-sheet-templates';
import { downloadDraftingTransmittalManifestJson } from '../export-utils';
import {
  addDrawingTransmittal,
  buildDraftingTransmittalWarnings,
  createDraftingTransmittal,
  duplicateDraftingTransmittalToDraft,
  findDuplicateActiveTransmittalNumbers,
  getDrawingTransmittals,
  getFrozenDrawingSheetIssues,
  getIssueCompletenessWarnings,
  isDraftingTransmittalEditable,
  issueDraftingTransmittal,
  recordDraftingTransmittalManifestExport,
  suggestNextTransmittalNumber,
  supersedeDraftingTransmittal,
  updateDraftingTransmittal,
  voidDraftingTransmittal,
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
  drawingId,
  drawingTitle,
  model,
  onModelChange,
  projectId,
}: {
  currentUserName: string | null;
  drawingId: string;
  drawingTitle: string;
  model: DraftingModel;
  onModelChange: (model: DraftingModel) => void;
  projectId: string;
}) {
  const transmittals = React.useMemo(() => getDrawingTransmittals(model), [model]);
  const frozenIssues = React.useMemo(() => getFrozenDrawingSheetIssues(model), [model]);
  const documentsQuery = useProjectDocuments(projectId, 'application/pdf');
  const uploadEvidence = useUploadDraftingTransmittalEvidence(projectId, drawingId);
  const attachEvidence = useAttachDraftingTransmittalEvidence(projectId, drawingId);
  const removeEvidence = useRemoveDraftingTransmittalEvidence(projectId, drawingId);
  const { data: rootTemplates = [] } = useRootSheetTemplates();
  const rootTemplatesById = React.useMemo(
    () => new Map(rootTemplates.map((template) => [template.id, template] as const)),
    [rootTemplates],
  );
  const [selectedTransmittalId, setSelectedTransmittalId] = React.useState('');
  const [form, setForm] = React.useState<TransmittalFormState>(() =>
    createEmptyForm(currentUserName, suggestNextTransmittalNumber(model)),
  );
  const [evidenceDocumentId, setEvidenceDocumentId] = React.useState('');
  const [evidenceNotes, setEvidenceNotes] = React.useState('');
  const [evidenceUploadFile, setEvidenceUploadFile] = React.useState<File | null>(null);
  const selectedTransmittal =
    transmittals.find((transmittal) => transmittal.id === selectedTransmittalId) ?? null;
  const projectPdfDocuments = React.useMemo(() => documentsQuery.data ?? [], [documentsQuery.data]);
  const selectedEvidenceDocument =
    projectPdfDocuments.find((document) => document.id === evidenceDocumentId) ??
    projectPdfDocuments[0] ??
    null;
  const selectedWarnings = selectedTransmittal
    ? buildDraftingTransmittalWarnings({
        model,
        rootTemplatesById,
        transmittal: selectedTransmittal,
      }).filter((warning) => warning.messages.length > 0)
    : [];
  const selectedIssueCount = form.selectedIssueIds.length;
  const selectedIsLocked = selectedTransmittal
    ? !isDraftingTransmittalEditable(selectedTransmittal)
    : false;
  const duplicateNumbers = React.useMemo(
    () => findDuplicateActiveTransmittalNumbers(model),
    [model],
  );
  const duplicateFormNumber = transmittals.some(
    (transmittal) =>
      transmittal.id !== selectedTransmittal?.id &&
      !['void', 'archived'].includes(transmittal.status) &&
      transmittal.transmittalNumber.trim().toUpperCase() ===
        form.transmittalNumber.trim().toUpperCase(),
  );
  const canSave = Boolean(
    !selectedIsLocked &&
    selectedIssueCount > 0 &&
    form.transmittalNumber.trim() &&
    form.title.trim() &&
    !duplicateFormNumber,
  );

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
    setForm(createEmptyForm(currentUserName, suggestNextTransmittalNumber(model)));
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
    setEvidenceDocumentId(transmittal.artifactDocumentId ?? projectPdfDocuments[0]?.id ?? '');
    setEvidenceNotes(transmittal.artifactNotes ?? '');
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
    const id = crypto.randomUUID();
    onModelChange(
      duplicateDraftingTransmittalToDraft({ id, model, sourceTransmittalId: transmittalId }),
    );
    setSelectedTransmittalId(id);
  }

  function handleIssue(transmittalId: string) {
    onModelChange(
      issueDraftingTransmittal({
        issuedBy: currentUserName ?? form.issuedBy,
        model,
        rootTemplatesById,
        transmittalId,
      }),
    );
  }

  function handleSupersede(transmittalId: string) {
    onModelChange(
      supersedeDraftingTransmittal({
        by: currentUserName ?? undefined,
        model,
        transmittalId,
      }),
    );
  }

  function handleVoid(transmittalId: string) {
    const reason = window.prompt('Void reason');
    if (reason === null) {
      return;
    }
    onModelChange(
      voidDraftingTransmittal({
        by: currentUserName ?? undefined,
        model,
        reason,
        transmittalId,
      }),
    );
  }

  function handleManifestJson(transmittalId: string) {
    const transmittal = transmittals.find((candidate) => candidate.id === transmittalId);
    if (!transmittal) {
      return;
    }
    downloadDraftingTransmittalManifestJson({
      model,
      rootTemplatesById,
      title: drawingTitle,
      transmittal,
    });
    onModelChange(
      recordDraftingTransmittalManifestExport({
        exportedBy: currentUserName ?? undefined,
        model,
        transmittalId,
      }),
    );
  }

  async function handleUploadEvidencePdf() {
    if (!evidenceUploadFile || !selectedTransmittal) {
      return;
    }
    if (!canAttachEvidence(selectedTransmittal.status)) {
      toast.error('Issue or finalise the transmittal before attaching PDF evidence');
      return;
    }
    if (
      evidenceUploadFile.type !== 'application/pdf' &&
      !evidenceUploadFile.name.toLowerCase().endsWith('.pdf')
    ) {
      toast.error('Only PDF files can be attached as transmittal evidence');
      return;
    }
    if (selectedTransmittal.artifactDocumentId) {
      const confirmed = window.confirm(
        'Upload and replace the currently attached PDF evidence metadata? The issued sheet package stays locked.',
      );
      if (!confirmed) {
        return;
      }
    }

    try {
      const drawing = await uploadEvidence.mutateAsync({
        file: evidenceUploadFile,
        name: evidenceUploadFile.name.replace(/\.pdf$/i, ''),
        notes: evidenceNotes,
        transmittalId: selectedTransmittal.id,
      });
      setEvidenceUploadFile(null);
      const nextTransmittal = drawing.model.drawingTransmittals.find(
        (candidate) => candidate.id === selectedTransmittal.id,
      );
      setEvidenceDocumentId(nextTransmittal?.artifactDocumentId ?? '');
      onModelChange(drawing.model);
      toast.success('PDF evidence uploaded and attached');
    } catch (error) {
      toast.error(formatDraftingEvidenceApiError(error, 'Failed to upload PDF evidence'));
    }
  }

  async function handleAttachSelectedEvidence() {
    if (!selectedEvidenceDocument) {
      return;
    }
    await attachEvidenceDocument(selectedEvidenceDocument, evidenceNotes, false);
  }

  async function attachEvidenceDocument(
    document: Document,
    notes: string,
    fromUpload: boolean,
    options: { skipReplaceConfirm?: boolean } = {},
  ) {
    if (!selectedTransmittal) {
      return;
    }
    if (!canAttachEvidence(selectedTransmittal.status)) {
      toast.error('Issue or finalise the transmittal before attaching PDF evidence');
      return;
    }
    if (selectedTransmittal.artifactDocumentId && !options.skipReplaceConfirm) {
      const confirmed = window.confirm(
        'Replace the currently attached PDF evidence metadata? The issued sheet package stays locked.',
      );
      if (!confirmed) {
        return;
      }
    }

    try {
      const drawing = await attachEvidence.mutateAsync({
        artifactSource: fromUpload ? 'manual_upload' : 'browser_print_pdf',
        documentId: document.id,
        notes,
        transmittalId: selectedTransmittal.id,
      });
      onModelChange(drawing.model);
      toast.success('PDF evidence attached');
    } catch (error) {
      toast.error(formatDraftingEvidenceApiError(error, 'Failed to attach PDF evidence'));
    }
  }

  async function handleRemoveEvidence() {
    if (!selectedTransmittal?.artifactDocumentId && !selectedTransmittal?.artifactFileName) {
      return;
    }
    const confirmed = window.confirm(
      'Remove the attached PDF evidence metadata from this transmittal? The project document file is not deleted.',
    );
    if (!confirmed) {
      return;
    }
    try {
      const drawing = await removeEvidence.mutateAsync({
        notes: evidenceNotes,
        transmittalId: selectedTransmittal.id,
      });
      onModelChange(drawing.model);
      toast.success('PDF evidence removed');
    } catch (error) {
      toast.error(formatDraftingEvidenceApiError(error, 'Failed to remove PDF evidence'));
    }
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
                    <LifecycleBadge status={transmittal.status} />
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
                        onClick={() => handleManifestJson(transmittal.id)}
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
                        aria-label={`Issue ${transmittal.transmittalNumber}`}
                        disabled={!isDraftingTransmittalEditable(transmittal)}
                        size="icon"
                        type="button"
                        variant="ghost"
                        onClick={() => handleIssue(transmittal.id)}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                      {transmittal.status === 'issued' ? (
                        <>
                          <Button
                            aria-label={`Supersede ${transmittal.transmittalNumber}`}
                            size="icon"
                            type="button"
                            variant="ghost"
                            onClick={() => handleSupersede(transmittal.id)}
                          >
                            <LockKeyhole className="h-4 w-4" />
                          </Button>
                          <Button
                            aria-label={`Void ${transmittal.transmittalNumber}`}
                            size="icon"
                            type="button"
                            variant="ghost"
                            onClick={() => handleVoid(transmittal.id)}
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        </>
                      ) : null}
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
            {selectedTransmittal ? 'Transmittal details' : 'Create draft transmittal'}
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
        {selectedIsLocked ? (
          <WarningLine message="Issued, superseded, void, and archived transmittals are locked. Duplicate to draft for changes." />
        ) : null}
        {duplicateFormNumber ? (
          <WarningLine message="Active transmittal numbers must be unique within this drawing." />
        ) : null}
        {duplicateNumbers.length > 0 ? (
          <WarningLine
            message={`Legacy duplicate active transmittal number warning: ${duplicateNumbers.join(', ')}.`}
          />
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          <LabeledInput
            id="drafting-transmittal-number"
            label="Transmittal number"
            disabled={selectedIsLocked}
            value={form.transmittalNumber}
            onChange={(value) => patchForm({ transmittalNumber: value })}
          />
          <LabeledInput
            id="drafting-transmittal-issue-date"
            label="Issue date"
            disabled={selectedIsLocked}
            type="date"
            value={form.issueDate}
            onChange={(value) => patchForm({ issueDate: value })}
          />
        </div>
        <LabeledInput
          id="drafting-transmittal-title"
          label="Title"
          disabled={selectedIsLocked}
          value={form.title}
          onChange={(value) => patchForm({ title: value })}
        />
        <LabeledInput
          id="drafting-transmittal-purpose"
          label="Purpose"
          disabled={selectedIsLocked}
          value={form.purpose}
          onChange={(value) => patchForm({ purpose: value })}
        />
        <div className="space-y-1">
          <Label htmlFor="drafting-transmittal-status">Status</Label>
          <Select
            disabled
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
              <SelectItem value="superseded">Superseded</SelectItem>
              <SelectItem value="void">Void</SelectItem>
              <SelectItem value="archived">Archived legacy</SelectItem>
            </SelectContent>
          </Select>
          <div className="text-xs text-muted-foreground">
            Use Issue / Finalise for draft records; issued records can only be superseded or voided.
          </div>
        </div>
        <LabeledInput
          id="drafting-transmittal-issued-by"
          label="Issued by"
          disabled={selectedIsLocked}
          value={form.issuedBy}
          onChange={(value) => patchForm({ issuedBy: value })}
        />
        <LabeledInput
          id="drafting-transmittal-issued-to"
          label="Issued to"
          disabled={selectedIsLocked}
          value={form.issuedTo}
          onChange={(value) => patchForm({ issuedTo: value })}
        />
        <LabeledInput
          id="drafting-transmittal-cc"
          label="CC"
          disabled={selectedIsLocked}
          value={form.cc}
          onChange={(value) => patchForm({ cc: value })}
        />
        <div className="space-y-1">
          <Label htmlFor="drafting-transmittal-notes">Notes</Label>
          <Textarea
            id="drafting-transmittal-notes"
            disabled={selectedIsLocked}
            value={form.notes}
            onChange={(event) => patchForm({ notes: event.target.value })}
          />
        </div>

        <EvidencePdfSection
          documents={projectPdfDocuments}
          documentsLoading={documentsQuery.isLoading}
          evidenceDocumentId={selectedEvidenceDocument?.id ?? ''}
          evidenceNotes={evidenceNotes}
          isEvidenceMutationPending={
            uploadEvidence.isPending || attachEvidence.isPending || removeEvidence.isPending
          }
          selectedTransmittal={selectedTransmittal}
          uploadFile={evidenceUploadFile}
          onAttachSelected={handleAttachSelectedEvidence}
          onRefreshDocuments={() => documentsQuery.refetch()}
          onRemove={handleRemoveEvidence}
          onSelectDocument={setEvidenceDocumentId}
          onSetNotes={setEvidenceNotes}
          onSetUploadFile={setEvidenceUploadFile}
          onUpload={handleUploadEvidencePdf}
        />

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
                    disabled={selectedIsLocked}
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
  disabled = false,
  id,
  label,
  onChange,
  type = 'text',
  value,
}: {
  id: string;
  disabled?: boolean;
  label: string;
  onChange: (value: string) => void;
  type?: string;
  value: string;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input
        disabled={disabled}
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function CheckboxRow({
  checked,
  disabled = false,
  id,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  id: string;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm" htmlFor={id}>
      <input
        checked={checked}
        className="h-4 w-4 rounded border-border"
        disabled={disabled}
        id={id}
        type="checkbox"
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

function LifecycleBadge({ status }: { status: DraftingDrawingTransmittalStatus }) {
  const label = status === 'void' ? 'void' : status;
  const variant = status === 'issued' ? 'default' : 'secondary';
  return <Badge variant={variant}>{label}</Badge>;
}

function WarningLine({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 text-xs text-amber-700">
      <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function createEmptyForm(
  currentUserName: string | null,
  transmittalNumber: string,
): TransmittalFormState {
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
    transmittalNumber,
  };
}

function EvidencePdfSection({
  documents,
  documentsLoading,
  evidenceDocumentId,
  evidenceNotes,
  isEvidenceMutationPending,
  onAttachSelected,
  onRefreshDocuments,
  onRemove,
  onSelectDocument,
  onSetNotes,
  onSetUploadFile,
  onUpload,
  selectedTransmittal,
  uploadFile,
}: {
  documents: Document[];
  documentsLoading: boolean;
  evidenceDocumentId: string;
  evidenceNotes: string;
  isEvidenceMutationPending: boolean;
  selectedTransmittal: ReturnType<typeof getDrawingTransmittals>[number] | null;
  uploadFile: File | null;
  onAttachSelected: () => void;
  onRefreshDocuments: () => void;
  onRemove: () => void;
  onSelectDocument: (documentId: string) => void;
  onSetNotes: (notes: string) => void;
  onSetUploadFile: (file: File | null) => void;
  onUpload: () => void;
}) {
  const canAttach = selectedTransmittal ? canAttachEvidence(selectedTransmittal.status) : false;
  const hasAttachedEvidence = Boolean(
    selectedTransmittal?.artifactDocumentId || selectedTransmittal?.artifactFileName,
  );

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
            <FileText className="h-3.5 w-3.5" />
            Evidence PDF
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Use Browser Print / Save PDF from the preview, then attach the saved PDF evidence here.
          </p>
        </div>
        {selectedTransmittal?.artifactStatus ? (
          <Badge variant={hasAttachedEvidence ? 'default' : 'secondary'}>
            {hasAttachedEvidence ? 'Attached' : selectedTransmittal.artifactStatus}
          </Badge>
        ) : null}
      </div>

      {!selectedTransmittal ? (
        <WarningLine message="Save a draft transmittal before evidence can be attached." />
      ) : null}
      {selectedTransmittal?.status === 'draft' ? (
        <WarningLine message="Issue/finalise before attaching PDF evidence." />
      ) : null}
      {selectedTransmittal && canAttach && !hasAttachedEvidence ? (
        <WarningLine message="No PDF evidence attached." />
      ) : null}

      {hasAttachedEvidence && selectedTransmittal ? (
        <div className="rounded-md bg-muted/40 p-3 text-sm">
          <div className="font-medium">
            {selectedTransmittal.artifactFileName ?? 'PDF evidence'}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {selectedTransmittal.artifactSizeBytes
              ? `${formatBytes(selectedTransmittal.artifactSizeBytes)} · `
              : ''}
            attached{' '}
            {selectedTransmittal.artifactAttachedAt
              ? formatDateTime(selectedTransmittal.artifactAttachedAt)
              : '-'}
            {selectedTransmittal.artifactAttachedBy
              ? ` by ${selectedTransmittal.artifactAttachedBy}`
              : ''}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Uploaded{' '}
            {selectedTransmittal.artifactUploadedAt
              ? formatDateTime(selectedTransmittal.artifactUploadedAt)
              : '-'}
            {selectedTransmittal.artifactDocumentId
              ? ` · document ${selectedTransmittal.artifactDocumentId}`
              : ''}
          </div>
          {selectedTransmittal.artifactNotes ? (
            <p className="mt-2 text-xs">{selectedTransmittal.artifactNotes}</p>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-1">
        <Label htmlFor="drafting-transmittal-evidence-document">Project PDF document</Label>
        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!canAttach || documentsLoading || documents.length === 0}
          id="drafting-transmittal-evidence-document"
          value={evidenceDocumentId}
          onChange={(event) => onSelectDocument(event.target.value)}
        >
          {documents.length === 0 ? <option value="">No project PDFs uploaded yet</option> : null}
          {documents.map((document) => (
            <option key={document.id} value={document.id}>
              {document.name} ({document.fileName})
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="drafting-transmittal-evidence-notes">Evidence notes</Label>
        <Input
          disabled={!canAttach}
          id="drafting-transmittal-evidence-notes"
          value={evidenceNotes}
          onChange={(event) => onSetNotes(event.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          disabled={!canAttach || !evidenceDocumentId || isEvidenceMutationPending}
          size="sm"
          type="button"
          variant={hasAttachedEvidence ? 'outline' : 'default'}
          onClick={onAttachSelected}
        >
          {hasAttachedEvidence ? 'Replace evidence' : 'Attach selected PDF'}
        </Button>
        <Button
          disabled={!canAttach}
          size="sm"
          type="button"
          variant="outline"
          onClick={onRefreshDocuments}
        >
          Refresh PDFs
        </Button>
        <Button
          disabled={!canAttach || !hasAttachedEvidence || isEvidenceMutationPending}
          size="sm"
          type="button"
          variant="outline"
          onClick={onRemove}
        >
          Remove evidence
        </Button>
      </div>

      <div className="rounded-md border p-3">
        <p className="mb-3 text-sm font-medium">Upload new evidence PDF</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            accept=".pdf,application/pdf"
            disabled={!canAttach}
            type="file"
            onChange={(event) => onSetUploadFile(event.target.files?.[0] ?? null)}
          />
          <Button
            disabled={!canAttach || !uploadFile || isEvidenceMutationPending}
            size="sm"
            type="button"
            variant="outline"
            onClick={onUpload}
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload and attach
          </Button>
        </div>
      </div>
    </div>
  );
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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-AU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatBytes(value: number) {
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDraftingEvidenceApiError(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'body' in error) {
    const body = (error as { body?: unknown }).body;
    if (body && typeof body === 'object' && 'message' in body) {
      const message = (body as { message?: unknown }).message;
      if (Array.isArray(message)) {
        return message.filter((entry) => typeof entry === 'string').join('; ') || fallback;
      }
      if (typeof message === 'string' && message.trim()) {
        return message;
      }
    }
  }
  return fallback;
}

function canAttachEvidence(status: DraftingDrawingTransmittalStatus) {
  return status === 'issued' || status === 'superseded' || status === 'void';
}
