'use client';

import { useState } from 'react';
import { Database, Pin } from 'lucide-react';
import { useRebarCatalogs, useRebarSizes, useActivateRebarCatalog } from '@/hooks/use-rebar';
import { PageHeader } from '@/components/page-header';
import { DataTable, type Column } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { StandardsBadge } from '@/components/standards-badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/empty-state';
import { PageLoading } from '@/components/loading';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import type { RebarSize } from '@eng/shared';

const sizeColumns: Column<RebarSize & Record<string, unknown>>[] = [
  { key: 'designation', header: 'Designation', cell: (row) => <span className="font-mono font-medium">{row.designation}</span> },
  { key: 'barDiameter', header: 'Dia (mm)', cell: (row) => <span className="font-mono">{row.barDiameter}</span>, className: 'w-[100px]' },
  { key: 'nominalArea', header: 'Area (mm²)', cell: (row) => <span className="font-mono">{row.nominalArea}</span>, className: 'w-[110px]' },
  { key: 'massPerMetre', header: 'Mass (kg/m)', cell: (row) => <span className="font-mono">{row.massPerMetre.toFixed(3)}</span>, className: 'w-[120px]' },
  { key: 'grade', header: 'Grade', cell: (row) => <Badge variant="outline">{row.grade}</Badge>, className: 'w-[100px]' },
  { key: 'ductilityClass', header: 'Ductility', cell: (row) => <Badge variant="outline">{row.ductilityClass}</Badge>, className: 'w-[100px]' },
];

export default function RebarPage() {
  const { data: catalogs, isLoading: catsLoading } = useRebarCatalogs();
  const [selectedCatalog, setSelectedCatalog] = useState('');
  const [page, setPage] = useState(1);
  const activateCatalog = useActivateRebarCatalog();

  const activeCatalog = catalogs?.find((c) => c.id === selectedCatalog) ?? catalogs?.find((c) => c.status === 'active') ?? catalogs?.[0];
  const effectiveCatalogId = selectedCatalog || activeCatalog?.id || '';

  const { data: sizes, isLoading: sizesLoading } = useRebarSizes(effectiveCatalogId, page, 50);

  if (catsLoading) return <PageLoading />;

  return (
    <>
      <PageHeader
        title="Reinforcement Catalogue"
        description="Steel reinforcement bar sizes per AS/NZS 4671"
        badges={<StandardsBadge code="AS/NZS 4671" edition="2019" size="sm" />}
      />

      {!catalogs?.length ? (
        <EmptyState icon={<Database className="h-12 w-12" />} title="No catalogues" description="Import a rebar catalogue to get started." />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {catalogs.map((cat) => (
              <Button
                key={cat.id}
                variant={effectiveCatalogId === cat.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setSelectedCatalog(cat.id); setPage(1); }}
              >
                {cat.name} v{cat.version}
                {cat.status === 'active' && <Badge variant="success" className="ml-2 text-[10px]">Active</Badge>}
                {cat.snapshotHash && <Pin className="ml-1 h-3 w-3" />}
              </Button>
            ))}
          </div>

          {activeCatalog && (
            <Card className="mb-4">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{activeCatalog.name} — v{activeCatalog.version}</p>
                  <p className="text-xs text-muted-foreground">
                    Source: {activeCatalog.sourceStandard} ({activeCatalog.sourceEdition})
                    {activeCatalog.snapshotHash && <span className="ml-2 font-mono">Hash: {activeCatalog.snapshotHash.slice(0, 12)}…</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={activeCatalog.status === 'active' ? 'success' : 'secondary'}>{activeCatalog.status}</Badge>
                  {activeCatalog.status !== 'active' && (
                    <Button size="sm" onClick={async () => {
                      await activateCatalog.mutateAsync(activeCatalog.id);
                      toast.success('Catalogue activated');
                    }}>Activate</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {sizesLoading ? <PageLoading /> : (
            <DataTable
              columns={sizeColumns}
              data={(sizes?.data ?? []) as (RebarSize & Record<string, unknown>)[]}
              searchKey="designation"
              searchPlaceholder="Search by designation…"
              totalFromServer={sizes?.meta?.total ?? 0}
              page={page}
              onPageChange={setPage}
              pageSize={50}
            />
          )}
        </>
      )}
    </>
  );
}
