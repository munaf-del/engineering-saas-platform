'use client';

import * as React from 'react';
import type { Document } from '@eng/shared';
import { ArrowDownToLine, ExternalLink, RefreshCw, Search, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useDeleteProjectDocument,
  useDownloadProjectDocument,
  useProjectDocuments,
  useUploadProjectDocument,
} from '@/hooks/use-documents';
import { ApiError } from '@/lib/api-client';

export function ProjectDocumentManager({
  projectCode,
  projectId,
}: {
  projectCode?: string;
  projectId: string;
}) {
  const documentsQuery = useProjectDocuments(projectId);
  const uploadDocument = useUploadProjectDocument(projectId);
  const downloadDocument = useDownloadProjectDocument();
  const deleteDocument = useDeleteProjectDocument(projectId);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [displayName, setDisplayName] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [deleteTarget, setDeleteTarget] = React.useState<Document | null>(null);
  const [protectedDelete, setProtectedDelete] =
    React.useState<ProtectedDocumentDeleteWarning | null>(null);

  const documents = React.useMemo(() => documentsQuery.data ?? [], [documentsQuery.data]);
  const filteredDocuments = React.useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) {
      return documents;
    }

    return documents.filter((document) =>
      [document.name, document.fileName, document.mimeType, document.uploadedBy, document.projectId]
        .filter((value): value is string => typeof value === 'string' && value.length > 0)
        .some((value) => value.toLowerCase().includes(needle)),
    );
  }, [documents, search]);

  async function handleUpload(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedFile) {
      return;
    }

    try {
      await uploadDocument.mutateAsync({
        file: selectedFile,
        name: displayName.trim() || selectedFile.name,
      });
      setSelectedFile(null);
      setDisplayName('');
      const input = document.getElementById('project-document-upload') as HTMLInputElement | null;
      if (input) {
        input.value = '';
      }
      toast.success('Document uploaded');
    } catch {
      toast.error('Failed to upload document');
    }
  }

  async function handleOpen(document: Document) {
    try {
      const blob = await downloadDocument.mutateAsync(document.id);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      toast.error('Failed to open document');
    }
  }

  async function handleDelete(document: Document) {
    try {
      await deleteDocument.mutateAsync(document.id);
      setDeleteTarget(null);
      toast.success('Document deleted');
    } catch (error) {
      const warning = parseProtectedDocumentDeleteWarning(error);
      if (warning) {
        setDeleteTarget(null);
        setProtectedDelete(warning);
        return;
      }
      toast.error('Failed to delete document');
    }
  }

  return (
    <div className="space-y-6" data-testid="project-document-manager">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Upload Project Document</CardTitle>
          <CardDescription>
            Store general project files for this project. PDF evidence remains protected by drafting
            transmittal history.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(12rem,18rem)_auto]"
            onSubmit={handleUpload}
          >
            <div className="space-y-1">
              <Label htmlFor="project-document-upload">File</Label>
              <Input
                id="project-document-upload"
                type="file"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setSelectedFile(file);
                  setDisplayName((current) => current || file?.name || '');
                }}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="project-document-name">Display name</Label>
              <Input
                id="project-document-name"
                placeholder={selectedFile?.name ?? 'Optional'}
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button
                className="w-full md:w-auto"
                disabled={!selectedFile || uploadDocument.isPending}
                type="submit"
              >
                <Upload className="mr-2 h-4 w-4" />
                {uploadDocument.isPending ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle className="text-lg">Project Documents</CardTitle>
              <CardDescription>
                {projectCode ? `${projectCode} project scope` : 'Project scoped documents'} ·{' '}
                {documents.length} file{documents.length === 1 ? '' : 's'}
              </CardDescription>
            </div>
            <Button
              size="sm"
              type="button"
              variant="outline"
              onClick={() => documentsQuery.refetch()}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              aria-label="Search documents"
              className="pl-9"
              placeholder="Search filename, MIME type, uploader"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {documentsQuery.isLoading ? (
            <div className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              Loading project documents...
            </div>
          ) : filteredDocuments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Filename</TableHead>
                  <TableHead>MIME type</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>Uploader</TableHead>
                  <TableHead>Project scope</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.map((document) => (
                  <TableRow key={document.id} data-testid="project-document-row">
                    <TableCell>
                      <div className="font-medium">{document.fileName}</div>
                      {document.name && document.name !== document.fileName ? (
                        <div className="text-xs text-muted-foreground">{document.name}</div>
                      ) : null}
                    </TableCell>
                    <TableCell>{document.mimeType || 'unknown'}</TableCell>
                    <TableCell>{formatBytes(document.sizeBytes)}</TableCell>
                    <TableCell>{formatDateTime(document.createdAt)}</TableCell>
                    <TableCell>{document.uploadedBy || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{document.projectId ?? projectId}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          aria-label={`Open ${document.fileName}`}
                          size="icon"
                          type="button"
                          variant="ghost"
                          onClick={() => handleOpen(document)}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          aria-label={`Download ${document.fileName}`}
                          size="icon"
                          type="button"
                          variant="ghost"
                          onClick={() => handleOpen(document)}
                        >
                          <ArrowDownToLine className="h-4 w-4" />
                        </Button>
                        <Button
                          aria-label={`Delete ${document.fileName}`}
                          size="icon"
                          type="button"
                          variant="ghost"
                          onClick={() => setDeleteTarget(document)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              {documents.length === 0
                ? 'No project documents uploaded yet.'
                : 'No documents match this search.'}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete project document?</DialogTitle>
            <DialogDescription>
              This removes the stored file from this project when it is not referenced by protected
              evidence.
            </DialogDescription>
          </DialogHeader>
          {deleteTarget ? (
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <div className="font-medium">{deleteTarget.fileName}</div>
              <div className="text-muted-foreground">
                {deleteTarget.mimeType} · {formatBytes(deleteTarget.sizeBytes)}
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              disabled={!deleteTarget || deleteDocument.isPending}
              type="button"
              variant="destructive"
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              {deleteDocument.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(protectedDelete)}
        onOpenChange={(open) => !open && setProtectedDelete(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Document deletion blocked</DialogTitle>
            <DialogDescription>
              This document is referenced by drafting transmittal evidence or history and cannot be
              deleted.
            </DialogDescription>
          </DialogHeader>
          {protectedDelete ? <ProtectedDeleteWarning warning={protectedDelete} /> : null}
          <DialogFooter>
            <Button type="button" onClick={() => setProtectedDelete(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProtectedDeleteWarning({ warning }: { warning: ProtectedDocumentDeleteWarning }) {
  return (
    <Alert variant="destructive" data-testid="protected-document-delete-warning">
      <AlertTitle>Protected by transmittal evidence</AlertTitle>
      <AlertDescription>
        <div className="mt-2 space-y-3">
          <p>
            Document {warning.documentId} is still referenced in project {warning.projectId}.{' '}
            {warning.referencesCount} reference{warning.referencesCount === 1 ? '' : 's'} were
            reported by the document service.
          </p>
          <div className="space-y-2">
            {warning.references.map((reference, index) => (
              <div
                key={`${reference.drawingId}-${reference.transmittalId ?? index}-${reference.referenceType}`}
                className="rounded-md border border-destructive/30 bg-background p-3"
              >
                <div className="font-medium">
                  {reference.drawingName || 'Drawing'} ({reference.drawingId})
                </div>
                <dl className="mt-2 grid gap-1 text-sm md:grid-cols-2">
                  <WarningField label="Transmittal" value={reference.transmittalNumber} />
                  <WarningField label="Transmittal status" value={reference.transmittalStatus} />
                  <WarningField label="Transmittal ID" value={reference.transmittalId} />
                  <WarningField
                    label="Reference type"
                    value={formatReferenceType(reference.referenceType)}
                  />
                </dl>
              </div>
            ))}
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}

function WarningField({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase text-muted-foreground">{label}</dt>
      <dd>{value || '-'}</dd>
    </div>
  );
}

export type ProtectedDocumentDeleteWarning = {
  documentId: string;
  projectId: string;
  referencesCount: number;
  references: ProtectedDocumentReference[];
};

type ProtectedDocumentReference = {
  drawingId: string;
  drawingName?: string;
  transmittalId?: string;
  transmittalNumber?: string;
  transmittalStatus?: string;
  referenceType: string;
};

export function parseProtectedDocumentDeleteWarning(
  error: unknown,
): ProtectedDocumentDeleteWarning | null {
  if (!(error instanceof ApiError) || error.status !== 409) {
    return null;
  }
  const body = readRecord(error.body);
  const payload = readRecord(body?.message) ?? body;
  const documentId = readString(payload?.documentId);
  const projectId = readString(payload?.projectId);
  const referencesCount = readNumber(payload?.referencesCount);
  const rawReferences = Array.isArray(payload?.references) ? payload.references : [];

  if (!documentId || !projectId || referencesCount === null) {
    return null;
  }

  const references = rawReferences.reduce<ProtectedDocumentReference[]>((items, candidate) => {
    const reference = readRecord(candidate);
    const drawingId = readString(reference?.drawingId);
    const referenceType = readString(reference?.referenceType);
    if (!drawingId || !referenceType) {
      return items;
    }
    items.push({
      drawingId,
      drawingName: readString(reference?.drawingName),
      transmittalId: readString(reference?.transmittalId),
      transmittalNumber: readString(reference?.transmittalNumber),
      transmittalStatus: readString(reference?.transmittalStatus),
      referenceType,
    });
    return items;
  }, []);

  return {
    documentId,
    projectId,
    referencesCount,
    references,
  };
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
    ? (value as Record<string, unknown>)
    : null;
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function readNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return new Intl.DateTimeFormat('en-AU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatReferenceType(value: string) {
  return value.replace(/_/g, ' ');
}
