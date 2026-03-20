'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, RotateCcw } from 'lucide-react';
import { useImport, useImportErrors, useApplyImport, useRollbackImport } from '@/hooks/use-imports';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageLoading } from '@/components/loading';
import { toast } from 'sonner';

export default function ImportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: job, isLoading } = useImport(id);
  const { data: errors } = useImportErrors(id);
  const applyImport = useApplyImport();
  const rollbackImport = useRollbackImport();

  if (isLoading || !job) return <PageLoading />;

  const canApply = job.status === 'validated';
  const canRollback = job.status === 'applied';

  return (
    <>
      <div className="mb-4">
        <Link href="/imports" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Import History
        </Link>
      </div>

      <PageHeader
        title={`Import: ${job.fileName}`}
        description={`${job.entityType.replace('_', ' ')} · ${job.format.toUpperCase()}`}
        badges={
          <Badge variant={job.status === 'applied' ? 'success' : job.status === 'failed' ? 'destructive' : 'secondary'}>
            {job.status.replace('_', ' ')}
          </Badge>
        }
        actions={
          <div className="flex gap-2">
            {canApply && (
              <Button onClick={async () => {
                try { await applyImport.mutateAsync(id); toast.success('Import applied'); }
                catch { toast.error('Apply failed'); }
              }} disabled={applyImport.isPending}>
                <CheckCircle className="mr-2 h-4 w-4" />Apply Import
              </Button>
            )}
            {canRollback && (
              <Button variant="destructive" onClick={async () => {
                if (!confirm('Rollback this import?')) return;
                try { await rollbackImport.mutateAsync(id); toast.success('Import rolled back'); }
                catch { toast.error('Rollback failed'); }
              }} disabled={rollbackImport.isPending}>
                <RotateCcw className="mr-2 h-4 w-4" />Rollback
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Summary</CardTitle></CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Total Rows</dt><dd className="font-mono">{job.totalRows}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Valid Rows</dt><dd className="font-mono text-emerald-600">{job.validRows}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Error Rows</dt><dd className="font-mono text-red-600">{job.errorRows}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Dry Run</dt><dd>{job.dryRun ? 'Yes' : 'No'}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Created</dt><dd>{new Date(job.createdAt).toLocaleString()}</dd></div>
              {job.completedAt && <div className="flex justify-between"><dt className="text-muted-foreground">Completed</dt><dd>{new Date(job.completedAt).toLocaleString()}</dd></div>}
              {job.snapshotId && <div className="flex justify-between"><dt className="text-muted-foreground">Snapshot ID</dt><dd className="font-mono text-xs">{job.snapshotId}</dd></div>}
            </dl>
          </CardContent>
        </Card>

        {job.diff && (
          <Card>
            <CardHeader><CardTitle className="text-base">Diff Summary</CardTitle></CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">Added</dt><dd className="font-mono text-emerald-600">+{job.diff.added}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Modified</dt><dd className="font-mono text-amber-600">~{job.diff.modified}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Removed</dt><dd className="font-mono text-red-600">-{job.diff.removed}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Unchanged</dt><dd className="font-mono">{job.diff.unchanged}</dd></div>
              </dl>
            </CardContent>
          </Card>
        )}
      </div>

      {errors && errors.length > 0 && (
        <Card className="mt-6">
          <CardHeader><CardTitle className="text-base text-destructive">Validation Errors ({errors.length})</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Row</TableHead>
                  <TableHead className="w-[120px]">Field</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead className="w-[100px]">Severity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {errors.map((err) => (
                  <TableRow key={err.id}>
                    <TableCell className="font-mono">{err.rowNumber}</TableCell>
                    <TableCell className="font-mono text-xs">{err.field ?? '—'}</TableCell>
                    <TableCell>{err.message}</TableCell>
                    <TableCell>
                      <Badge variant={err.severity === 'error' ? 'destructive' : 'warning'}>{err.severity}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </>
  );
}
