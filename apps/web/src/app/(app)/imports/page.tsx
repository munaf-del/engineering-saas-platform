'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Import, Upload } from 'lucide-react';
import { useImports, useUploadImport } from '@/hooks/use-imports';
import { PageHeader } from '@/components/page-header';
import { DataTable, type Column } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/empty-state';
import { PageLoading } from '@/components/loading';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { IMPORT_ENTITY_TYPES, IMPORT_FORMATS, type ImportJob } from '@eng/shared';

const statusColors: Record<string, 'default' | 'success' | 'destructive' | 'warning' | 'secondary'> = {
  pending: 'secondary',
  validating: 'warning',
  validated: 'default',
  applying: 'warning',
  applied: 'success',
  rolling_back: 'warning',
  rolled_back: 'destructive',
  failed: 'destructive',
};

const columns: Column<ImportJob & Record<string, unknown>>[] = [
  { key: 'entityType', header: 'Entity Type', cell: (row) => <Badge variant="outline">{row.entityType.replace('_', ' ')}</Badge>, className: 'w-[140px]' },
  { key: 'fileName', header: 'File', cell: (row) => <span className="font-medium">{row.fileName}</span> },
  { key: 'status', header: 'Status', cell: (row) => <Badge variant={statusColors[row.status] ?? 'default'}>{row.status.replace('_', ' ')}</Badge>, className: 'w-[130px]' },
  {
    key: 'rows',
    header: 'Rows',
    cell: (row) => (
      <span className="text-sm">
        {row.validRows}/{row.totalRows}
        {row.errorRows > 0 && <span className="ml-1 text-destructive">({row.errorRows} errors)</span>}
      </span>
    ),
    className: 'w-[150px]',
  },
  { key: 'format', header: 'Format', cell: (row) => <Badge variant="outline" className="text-xs">{row.format}</Badge>, className: 'w-[80px]' },
  {
    key: 'createdAt',
    header: 'Date',
    cell: (row) => <span className="text-sm text-muted-foreground">{new Date(row.createdAt).toLocaleString()}</span>,
    className: 'w-[180px]',
  },
];

export default function ImportsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useImports(page);
  const upload = useUploadImport();
  const [showUpload, setShowUpload] = useState(false);
  const [entityType, setEntityType] = useState('steel_section');
  const [format, setFormat] = useState('csv');
  const [file, setFile] = useState<File | null>(null);
  const [catalogName, setCatalogName] = useState('');
  const [catalogVersion, setCatalogVersion] = useState('');
  const [sourceStandard, setSourceStandard] = useState('');
  const [sourceEdition, setSourceEdition] = useState('');

  const imports = data?.data ?? [];
  const total = data?.meta?.total ?? 0;

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('entityType', entityType);
    fd.append('format', format);
    fd.append('catalogName', catalogName);
    fd.append('catalogVersion', catalogVersion);
    fd.append('sourceStandard', sourceStandard);
    fd.append('sourceEdition', sourceEdition);
    try {
      const job = await upload.mutateAsync(fd);
      toast.success('Import uploaded');
      setShowUpload(false);
      router.push(`/imports/${job.id}`);
    } catch {
      toast.error('Upload failed');
    }
  }

  return (
    <>
      <PageHeader
        title="Import History"
        description={`${total} import job(s)`}
        actions={
          <Button onClick={() => setShowUpload(true)}>
            <Upload className="mr-2 h-4 w-4" /> Upload Import
          </Button>
        }
      />

      {isLoading ? (
        <PageLoading />
      ) : imports.length === 0 ? (
        <EmptyState icon={<Import className="h-12 w-12" />} title="No imports" description="Upload catalogue data to populate materials, sections, or rebar." />
      ) : (
        <DataTable
          columns={columns}
          data={imports as (ImportJob & Record<string, unknown>)[]}
          onRowClick={(row) => router.push(`/imports/${row.id}`)}
          totalFromServer={total}
          page={page}
          onPageChange={setPage}
        />
      )}

      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Import</DialogTitle>
            <DialogDescription>Upload a CSV, XLSX, or JSON file to import catalogue data.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Entity Type</Label>
                <Select value={entityType} onValueChange={setEntityType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {IMPORT_ENTITY_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Format</Label>
                <Select value={format} onValueChange={setFormat}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {IMPORT_FORMATS.map((f) => <SelectItem key={f} value={f}>{f.toUpperCase()}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Catalogue Name</Label>
                <Input value={catalogName} onChange={(e) => setCatalogName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Version</Label>
                <Input value={catalogVersion} onChange={(e) => setCatalogVersion(e.target.value)} required placeholder="1.0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Source Standard</Label>
                <Input value={sourceStandard} onChange={(e) => setSourceStandard(e.target.value)} required placeholder="AS 4100" />
              </div>
              <div className="space-y-2">
                <Label>Source Edition</Label>
                <Input value={sourceEdition} onChange={(e) => setSourceEdition(e.target.value)} required placeholder="2020" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>File</Label>
              <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required accept=".csv,.xlsx,.json" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowUpload(false)}>Cancel</Button>
              <Button type="submit" disabled={upload.isPending}>{upload.isPending ? 'Uploading…' : 'Upload'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
