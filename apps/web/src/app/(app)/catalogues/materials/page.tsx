'use client';

import { useState } from 'react';
import { Database } from 'lucide-react';
import { useMaterials, useMaterialFamilies } from '@/hooks/use-materials';
import { PageHeader } from '@/components/page-header';
import { DataTable, type Column } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { StandardsBadge } from '@/components/standards-badge';
import { EmptyState } from '@/components/empty-state';
import { PageLoading } from '@/components/loading';
import type { Material } from '@eng/shared';

const columns: Column<Material & Record<string, unknown>>[] = [
  { key: 'name', header: 'Name', cell: (row) => <span className="font-medium">{row.name}</span> },
  {
    key: 'category',
    header: 'Category',
    cell: (row) => <Badge variant="outline">{row.category.replace('_', ' ')}</Badge>,
    className: 'w-[150px]',
  },
  {
    key: 'grade',
    header: 'Grade',
    cell: (row) => <span className="font-mono text-sm">{row.grade ?? '—'}</span>,
    className: 'w-[120px]',
  },
  {
    key: 'sourceStandard',
    header: 'Standard',
    cell: (row) =>
      row.sourceStandard ? (
        <StandardsBadge code={row.sourceStandard as string} edition={row.sourceEdition as string | undefined} size="sm" />
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
    className: 'w-[180px]',
  },
  {
    key: 'properties',
    header: 'Properties',
    cell: (row) => {
      const keys = Object.keys(row.properties ?? {});
      return <span className="text-sm text-muted-foreground">{keys.length} property(ies)</span>;
    },
    className: 'w-[120px]',
  },
];

export default function MaterialsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useMaterials(page);
  const { data: families } = useMaterialFamilies();

  const materials = data?.data ?? [];
  const total = data?.meta?.total ?? 0;

  return (
    <>
      <PageHeader
        title="Structural Materials"
        description={`${total} material grade(s) · ${families?.length ?? 0} families`}
        badges={
          <>
            <StandardsBadge code="AS 3600" edition="2018" size="sm" />
            <StandardsBadge code="AS 4100" edition="2020" size="sm" />
          </>
        }
      />

      {isLoading ? (
        <PageLoading />
      ) : materials.length === 0 ? (
        <EmptyState icon={<Database className="h-12 w-12" />} title="No materials" description="Import or create material grades to populate the catalogue." />
      ) : (
        <DataTable
          columns={columns}
          data={materials as (Material & Record<string, unknown>)[]}
          searchKey="name"
          searchPlaceholder="Search materials…"
          totalFromServer={total}
          page={page}
          onPageChange={setPage}
        />
      )}
    </>
  );
}
