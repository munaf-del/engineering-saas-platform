'use client';

import * as React from 'react';
import {
  DRAFTING_TITLE_BLOCK_STATUSES,
  type DraftingModel,
  type DraftingRevisionBlockRow,
  type DraftingTitleBlockMetadata,
  type DraftingTitleBlockStatus,
} from '@eng/shared';
import { CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

const NO_STATUS_VALUE = '__not_set__';
const TITLE_BLOCK_FIELDS = [
  ['projectName', 'Project name'],
  ['projectNumber', 'Project number'],
  ['clientName', 'Client'],
  ['drawingTitle', 'Drawing title'],
  ['drawingNumber', 'Drawing number'],
  ['sheetNumber', 'Sheet number'],
  ['sheetTotal', 'Sheet total'],
  ['scale', 'Scale'],
  ['discipline', 'Discipline'],
  ['designedBy', 'Designed by'],
  ['drawnBy', 'Drawn by'],
  ['checkedBy', 'Checked by'],
  ['approvedBy', 'Approved by'],
  ['organisationName', 'Organisation'],
] as const satisfies ReadonlyArray<readonly [keyof DraftingTitleBlockMetadata, string]>;

const REVISION_FIELDS = [
  ['revision', 'Rev'],
  ['date', 'Date'],
  ['description', 'Description'],
  ['issuedFor', 'Issued for'],
  ['drawnBy', 'Drawn'],
  ['checkedBy', 'Checked'],
  ['approvedBy', 'Approved'],
  ['status', 'Status'],
] as const satisfies ReadonlyArray<readonly [keyof DraftingRevisionBlockRow, string]>;

const STATUS_LABELS: Record<DraftingTitleBlockStatus, string> = {
  as_built: 'As built',
  draft: 'Draft',
  for_construction: 'For construction',
  for_information: 'For information',
  for_review: 'For review',
  superseded: 'Superseded',
};

export function DraftingTitleRevisionDialog({
  model,
  onModelChange,
  onOpenChange,
  open,
}: {
  model: DraftingModel;
  onModelChange: (updater: (current: DraftingModel) => DraftingModel) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const titleBlock = model.titleBlock ?? {};
  const revisionBlock = model.revisionBlock ?? { revisions: [] };

  function updateTitleBlockField(field: keyof DraftingTitleBlockMetadata, value: string) {
    onModelChange((current) => updateDraftingTitleBlockField(current, field, value));
  }

  function updateTitleBlockStatus(value: string) {
    onModelChange((current) =>
      updateDraftingTitleBlockStatus(
        current,
        value === NO_STATUS_VALUE ? undefined : (value as DraftingTitleBlockMetadata['status']),
      ),
    );
  }

  function addRevisionRow() {
    onModelChange((current) => addDraftingRevisionBlockRow(current, crypto.randomUUID()));
  }

  function updateRevisionRow(
    row: DraftingRevisionBlockRow,
    field: keyof DraftingRevisionBlockRow,
    value: string,
  ) {
    onModelChange((current) => updateDraftingRevisionBlockRow(current, row.id, field, value));
  }

  function deleteRevisionRow(row: DraftingRevisionBlockRow) {
    onModelChange((current) => deleteDraftingRevisionBlockRow(current, row.id));
  }

  function markCurrentRevision(row: DraftingRevisionBlockRow) {
    onModelChange((current) => markDraftingRevisionBlockCurrent(current, row.id));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-6xl">
        <DialogHeader>
          <DialogTitle>Title Block / Revision Block</DialogTitle>
          <DialogDescription>
            Metadata saved with the DraftingModel for deliverable headers, previews, and exports.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[72vh] pr-4">
          <div className="space-y-6">
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold">Title block</h2>
                  <p className="text-sm text-muted-foreground">
                    Drawing-level identification and authorship metadata.
                  </p>
                </div>
                <div className="w-[220px]">
                  <Label htmlFor="drafting-title-block-status">Status</Label>
                  <Select
                    value={titleBlock.status ?? NO_STATUS_VALUE}
                    onValueChange={updateTitleBlockStatus}
                  >
                    <SelectTrigger id="drafting-title-block-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_STATUS_VALUE}>Not set</SelectItem>
                      {DRAFTING_TITLE_BLOCK_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {STATUS_LABELS[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {TITLE_BLOCK_FIELDS.map(([field, label]) => (
                  <div className="space-y-1.5" key={field}>
                    <Label htmlFor={`drafting-title-block-${field}`}>{label}</Label>
                    <Input
                      id={`drafting-title-block-${field}`}
                      value={titleBlock[field] ?? ''}
                      onChange={(event) => updateTitleBlockField(field, event.target.value)}
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="drafting-title-block-notes">Notes</Label>
                <Textarea
                  id="drafting-title-block-notes"
                  value={titleBlock.notes ?? ''}
                  onChange={(event) => updateTitleBlockField('notes', event.target.value)}
                />
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold">Revision block</h2>
                  <p className="text-sm text-muted-foreground">
                    Drawing metadata only; issued schedule pack snapshots remain separate.
                  </p>
                </div>
                <Button type="button" variant="outline" onClick={addRevisionRow}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add revision row
                </Button>
              </div>

              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">Current</TableHead>
                      {REVISION_FIELDS.map(([, label]) => (
                        <TableHead key={label} className="min-w-[130px]">
                          {label}
                        </TableHead>
                      ))}
                      <TableHead className="w-[72px]">Delete</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {revisionBlock.revisions.length === 0 ? (
                      <TableRow>
                        <TableCell
                          className="h-20 text-center text-sm text-muted-foreground"
                          colSpan={REVISION_FIELDS.length + 2}
                        >
                          No revision rows yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      revisionBlock.revisions.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>
                            <Button
                              aria-label={`Mark revision ${row.revision || row.id} current`}
                              disabled={revisionBlock.currentRevision === row.revision}
                              size="sm"
                              type="button"
                              variant={
                                revisionBlock.currentRevision === row.revision
                                  ? 'secondary'
                                  : 'outline'
                              }
                              onClick={() => markCurrentRevision(row)}
                            >
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              {revisionBlock.currentRevision === row.revision ? 'Current' : 'Mark'}
                            </Button>
                          </TableCell>
                          {REVISION_FIELDS.map(([field]) => (
                            <TableCell key={field}>
                              <Input
                                aria-label={`${field} for revision ${row.revision || row.id}`}
                                value={row[field] ?? ''}
                                onChange={(event) =>
                                  updateRevisionRow(row, field, event.target.value)
                                }
                              />
                            </TableCell>
                          ))}
                          <TableCell>
                            <Button
                              aria-label={`Delete revision ${row.revision || row.id}`}
                              size="icon"
                              type="button"
                              variant="ghost"
                              onClick={() => deleteRevisionRow(row)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </section>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function normalizeOptionalText(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function updateDraftingTitleBlockField(
  model: DraftingModel,
  field: keyof DraftingTitleBlockMetadata,
  value: string,
): DraftingModel {
  return {
    ...model,
    titleBlock: {
      ...(model.titleBlock ?? {}),
      [field]: normalizeOptionalText(value),
    },
  };
}

export function updateDraftingTitleBlockStatus(
  model: DraftingModel,
  status: DraftingTitleBlockMetadata['status'],
): DraftingModel {
  return {
    ...model,
    titleBlock: {
      ...(model.titleBlock ?? {}),
      status,
    },
  };
}

export function addDraftingRevisionBlockRow(
  model: DraftingModel,
  id: string,
  date = new Date().toISOString().slice(0, 10),
): DraftingModel {
  const titleBlock = model.titleBlock ?? {};
  const revisions = model.revisionBlock?.revisions ?? [];
  const nextRevision = nextRevisionLabel(revisions);
  const row: DraftingRevisionBlockRow = {
    approvedBy: titleBlock.approvedBy ?? '',
    checkedBy: titleBlock.checkedBy ?? '',
    date,
    description: '',
    drawnBy: titleBlock.drawnBy ?? '',
    id,
    issuedFor: '',
    revision: nextRevision,
    status: titleBlock.status ?? '',
  };

  return {
    ...model,
    revisionBlock: {
      currentRevision: model.revisionBlock?.currentRevision ?? nextRevision,
      revisions: [...revisions, row],
    },
  };
}

export function updateDraftingRevisionBlockRow(
  model: DraftingModel,
  rowId: string,
  field: keyof DraftingRevisionBlockRow,
  value: string,
): DraftingModel {
  const revisions = model.revisionBlock?.revisions ?? [];
  const existingRow = revisions.find((row) => row.id === rowId);
  const currentRevision = model.revisionBlock?.currentRevision;
  const shouldMoveCurrentRevision =
    field === 'revision' &&
    currentRevision !== undefined &&
    currentRevision === existingRow?.revision;

  return {
    ...model,
    revisionBlock: {
      currentRevision: shouldMoveCurrentRevision ? value : currentRevision,
      revisions: revisions.map((row) => (row.id === rowId ? { ...row, [field]: value } : row)),
    },
  };
}

export function deleteDraftingRevisionBlockRow(model: DraftingModel, rowId: string): DraftingModel {
  const existingRow = model.revisionBlock?.revisions.find((row) => row.id === rowId);
  const revisions = (model.revisionBlock?.revisions ?? []).filter((row) => row.id !== rowId);
  const currentRevision =
    existingRow && model.revisionBlock?.currentRevision === existingRow.revision
      ? revisions.at(-1)?.revision
      : model.revisionBlock?.currentRevision;

  return {
    ...model,
    revisionBlock: {
      currentRevision,
      revisions,
    },
  };
}

export function markDraftingRevisionBlockCurrent(
  model: DraftingModel,
  rowId: string,
): DraftingModel {
  const row = model.revisionBlock?.revisions.find((candidate) => candidate.id === rowId);

  return {
    ...model,
    revisionBlock: {
      currentRevision: row?.revision ?? model.revisionBlock?.currentRevision,
      revisions: model.revisionBlock?.revisions ?? [],
    },
  };
}

function nextRevisionLabel(revisions: DraftingRevisionBlockRow[]) {
  const lastRevision = revisions.at(-1)?.revision.trim().toUpperCase();
  if (lastRevision && /^[A-Y]$/.test(lastRevision)) {
    return String.fromCharCode(lastRevision.charCodeAt(0) + 1);
  }

  return revisions.length === 0 ? 'A' : `${revisions.length + 1}`;
}
