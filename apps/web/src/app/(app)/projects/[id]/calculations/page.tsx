'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, History, Plus } from 'lucide-react';
import { useCalculations } from '@/hooks/use-calculations';
import { useProject } from '@/hooks/use-projects';
import { PageHeader } from '@/components/page-header';
import { DataTable, type Column } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/empty-state';
import { PageLoading } from '@/components/loading';
import type { CalculationRun } from '@eng/shared';

const statusColors: Record<string, 'default' | 'success' | 'destructive' | 'warning' | 'secondary'> = {
  draft: 'secondary',
  running: 'warning',
  completed: 'success',
  failed: 'destructive',
  superseded: 'default',
};

const columns: Column<CalculationRun & Record<string, unknown>>[] = [
  {
    key: 'calcType',
    header: 'Type',
    cell: (row) => <Badge variant="outline" className="font-mono">{row.calcType}</Badge>,
    className: 'w-[150px]',
  },
  {
    key: 'status',
    header: 'Status',
    cell: (row) => <Badge variant={statusColors[row.status] ?? 'default'}>{row.status}</Badge>,
    className: 'w-[110px]',
  },
  {
    key: 'notes',
    header: 'Notes',
    cell: (row) => <span className="text-sm">{row.notes ?? '—'}</span>,
  },
  {
    key: 'durationMs',
    header: 'Duration',
    cell: (row) => (
      <span className="font-mono text-sm text-muted-foreground">
        {row.durationMs ? `${row.durationMs}ms` : '—'}
      </span>
    ),
    className: 'w-[100px]',
  },
  {
    key: 'createdAt',
    header: 'Run Date',
    cell: (row) => (
      <span className="text-sm text-muted-foreground">
        {new Date(row.createdAt).toLocaleString()}
      </span>
    ),
    className: 'w-[180px]',
  },
];

export default function CalculationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const router = useRouter();
  const { data: project } = useProject(projectId);
  const [page, setPage] = useState(1);
  const { data, isLoading } = useCalculations(projectId, page);

  if (isLoading) return <PageLoading />;

  const runs = data?.data ?? [];
  const total = data?.meta?.total ?? 0;

  return (
    <>
      <div className="mb-4">
        <Link href={`/projects/${projectId}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to project
        </Link>
      </div>

      <PageHeader
        title="Calculation History"
        description={`${project?.code ?? ''} · ${total} calculation run(s)`}
        actions={
          <Link href={`/projects/${projectId}/calculations/new`}>
            <Button><Plus className="mr-2 h-4 w-4" /> New Calculation</Button>
          </Link>
        }
      />

      {runs.length === 0 ? (
        <EmptyState
          icon={<History className="h-12 w-12" />}
          title="No calculations yet"
          description="Submit a new calculation to see results here."
        />
      ) : (
        <DataTable
          columns={columns}
          data={runs as (CalculationRun & Record<string, unknown>)[]}
          onRowClick={(row) => router.push(`/projects/${projectId}/calculations/${row.id}`)}
          totalFromServer={total}
          page={page}
          onPageChange={setPage}
        />
      )}
    </>
  );
}
