'use client';

import { useState } from 'react';
import { History } from 'lucide-react';
import { useAuditLogs } from '@/hooks/use-audit';
import { PageHeader } from '@/components/page-header';
import { DataTable, type Column } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/empty-state';
import { PageLoading } from '@/components/loading';

interface AuditEntry {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  createdAt: string;
  user?: { name: string; email: string };
}

const columns: Column<AuditEntry & Record<string, unknown>>[] = [
  {
    key: 'action',
    header: 'Action',
    cell: (row) => {
      const method = row.action.split(' ')[0];
      const color = method === 'POST' ? 'success' : method === 'DELETE' ? 'destructive' : 'default';
      return <Badge variant={color as 'success' | 'destructive' | 'default'}>{row.action}</Badge>;
    },
  },
  { key: 'entityType', header: 'Entity', cell: (row) => <span className="font-mono text-xs">{row.entityType}</span> },
  {
    key: 'entityId',
    header: 'Entity ID',
    cell: (row) => <span className="font-mono text-xs text-muted-foreground">{row.entityId ? row.entityId.slice(0, 8) + '…' : '—'}</span>,
    className: 'w-[120px]',
  },
  {
    key: 'user',
    header: 'User',
    cell: (row) => <span className="text-sm">{row.user?.name ?? row.userId.slice(0, 8)}</span>,
  },
  {
    key: 'createdAt',
    header: 'Timestamp',
    cell: (row) => <span className="text-sm text-muted-foreground">{new Date(row.createdAt).toLocaleString()}</span>,
    className: 'w-[200px]',
  },
];

export default function AuditPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAuditLogs(page);

  if (isLoading) return <PageLoading />;

  const logs = (data?.data ?? []) as (AuditEntry & Record<string, unknown>)[];
  const total = data?.meta?.total ?? 0;

  return (
    <>
      <PageHeader title="Audit Trail" description="Organisation activity log" />

      {logs.length === 0 ? (
        <EmptyState icon={<History className="h-12 w-12" />} title="No audit entries" description="Actions performed in this organisation will appear here." />
      ) : (
        <DataTable
          columns={columns}
          data={logs}
          totalFromServer={total}
          page={page}
          onPageChange={setPage}
          pageSize={50}
        />
      )}
    </>
  );
}
