'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, RotateCcw, ShieldCheck, ShieldX, Send, Zap } from 'lucide-react';
import {
  useImport,
  useImportErrors,
  useImportApprovals,
  useApplyImport,
  useRollbackImport,
  useSubmitForApproval,
  useApproveImport,
  useRejectImport,
  useActivateImport,
} from '@/hooks/use-imports';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageLoading } from '@/components/loading';
import { toast } from 'sonner';

const statusColors: Record<string, 'default' | 'success' | 'destructive' | 'warning' | 'secondary'> = {
  pending: 'secondary',
  validating: 'warning',
  validated: 'default',
  awaiting_approval: 'warning',
  approved: 'success',
  rejected: 'destructive',
  applying: 'warning',
  applied: 'success',
  rolling_back: 'warning',
  rolled_back: 'destructive',
  failed: 'destructive',
};

export default function ImportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: job, isLoading } = useImport(id);
  const { data: errors } = useImportErrors(id);
  const { data: approvals } = useImportApprovals(id);
  const applyImport = useApplyImport();
  const rollbackImport = useRollbackImport();
  const submitForApproval = useSubmitForApproval();
  const approveImport = useApproveImport();
  const rejectImport = useRejectImport();
  const activateImport = useActivateImport();

  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  if (isLoading || !job) return <PageLoading />;

  const canApply = job.status === 'validated';
  const canSubmitForApproval = job.status === 'validated';
  const canApprove = job.status === 'awaiting_approval';
  const canReject = job.status === 'awaiting_approval';
  const canActivate = job.status === 'approved';
  const canRollback = job.status === 'applied';

  const isRulePack = ['load_combination_rules', 'pile_design_rules'].includes(job.entityType);

  return (
    <>
      <div className="mb-4">
        <Link href="/imports" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Import History
        </Link>
      </div>

      <PageHeader
        title={`Import: ${job.fileName}`}
        description={`${job.entityType.replace(/_/g, ' ')} · ${job.format.toUpperCase()}`}
        badges={
          <Badge variant={statusColors[job.status] ?? 'default'}>
            {job.status.replace(/_/g, ' ')}
          </Badge>
        }
        actions={
          <div className="flex gap-2">
            {canSubmitForApproval && isRulePack && (
              <Button variant="outline" onClick={async () => {
                try { await submitForApproval.mutateAsync(id); toast.success('Submitted for approval'); }
                catch { toast.error('Submission failed'); }
              }} disabled={submitForApproval.isPending}>
                <Send className="mr-2 h-4 w-4" />Submit for Approval
              </Button>
            )}
            {canApply && !isRulePack && (
              <Button onClick={async () => {
                try { await applyImport.mutateAsync(id); toast.success('Import applied'); }
                catch { toast.error('Apply failed'); }
              }} disabled={applyImport.isPending}>
                <CheckCircle className="mr-2 h-4 w-4" />Apply Import
              </Button>
            )}
            {canApprove && (
              <Button onClick={async () => {
                try { await approveImport.mutateAsync({ id }); toast.success('Import approved'); }
                catch { toast.error('Approve failed'); }
              }} disabled={approveImport.isPending}>
                <ShieldCheck className="mr-2 h-4 w-4" />Approve
              </Button>
            )}
            {canReject && (
              <Button variant="destructive" onClick={() => setShowReject(true)}>
                <ShieldX className="mr-2 h-4 w-4" />Reject
              </Button>
            )}
            {canActivate && (
              <Button onClick={async () => {
                try { await activateImport.mutateAsync(id); toast.success('Import activated'); }
                catch { toast.error('Activation failed'); }
              }} disabled={activateImport.isPending}>
                <Zap className="mr-2 h-4 w-4" />Activate
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
              {job.approvedAt && <div className="flex justify-between"><dt className="text-muted-foreground">Approved</dt><dd>{new Date(job.approvedAt).toLocaleString()}</dd></div>}
              {job.rejectedAt && <div className="flex justify-between"><dt className="text-muted-foreground">Rejected</dt><dd>{new Date(job.rejectedAt).toLocaleString()}</dd></div>}
              {job.rejectionReason && <div className="flex justify-between"><dt className="text-muted-foreground">Rejection Reason</dt><dd className="text-red-600">{job.rejectionReason}</dd></div>}
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

      {approvals && approvals.length > 0 && (
        <Card className="mt-6">
          <CardHeader><CardTitle className="text-base">Approval History</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Action</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="w-[180px]">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approvals.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <Badge variant={a.action === 'approve' ? 'success' : 'destructive'}>{a.action}</Badge>
                    </TableCell>
                    <TableCell>{a.reason ?? '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(a.createdAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

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

      <Dialog open={showReject} onOpenChange={setShowReject}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Import</DialogTitle>
            <DialogDescription>Provide a reason for rejecting this import.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Reason</Label>
              <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason for rejection" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReject(false)}>Cancel</Button>
            <Button variant="destructive" onClick={async () => {
              try {
                await rejectImport.mutateAsync({ id, reason: rejectReason });
                toast.success('Import rejected');
                setShowReject(false);
                setRejectReason('');
              } catch { toast.error('Reject failed'); }
            }} disabled={rejectImport.isPending}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
