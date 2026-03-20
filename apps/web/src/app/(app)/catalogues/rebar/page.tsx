'use client';

import { useState } from 'react';
import { Database, Pin, Check, AlertTriangle } from 'lucide-react';
import { useRebarCatalogs, useRebarSizes, useActivateRebarCatalog } from '@/hooks/use-rebar';
import { PageHeader } from '@/components/page-header';
import { DataTable, type Column } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { StandardsBadge } from '@/components/standards-badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/empty-state';
import { PageLoading } from '@/components/loading';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import type { RebarSize, RebarCatalog } from '@eng/shared';

const sizeColumns: Column<RebarSize & Record<string, unknown>>[] = [
  { key: 'designation', header: 'Designation', cell: (row) => <span className="font-mono font-medium">{row.designation}</span> },
  { key: 'barDiameter', header: 'Dia (mm)', cell: (row) => <span className="font-mono">{row.barDiameter}</span>, className: 'w-[100px]' },
  { key: 'nominalArea', header: 'Area (mm²)', cell: (row) => <span className="font-mono">{row.nominalArea}</span>, className: 'w-[110px]' },
  { key: 'massPerMetre', header: 'Mass (kg/m)', cell: (row) => <span className="font-mono">{row.massPerMetre.toFixed(3)}</span>, className: 'w-[120px]' },
  { key: 'grade', header: 'Grade', cell: (row) => <Badge variant="outline">{row.grade}</Badge>, className: 'w-[100px]' },
  { key: 'ductilityClass', header: 'Ductility', cell: (row) => <Badge variant="outline">{row.ductilityClass}</Badge>, className: 'w-[100px]' },
];

function SnapshotBadge({ catalog }: { catalog: RebarCatalog }) {
  if (catalog.status === 'active' && catalog.snapshotHash) {
    return (
      <Badge variant="success" className="gap-1 text-[10px]">
        <Pin className="h-3 w-3" /> Pinned · {catalog.snapshotHash.slice(0, 8)}
      </Badge>
    );
  }
  if (catalog.snapshotHash) {
    return (
      <Badge variant="secondary" className="gap-1 text-[10px]">
        <Pin className="h-3 w-3" /> Snapshot: {catalog.snapshotHash.slice(0, 8)}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px] text-muted-foreground">No snapshot</Badge>
  );
}

export default function RebarPage() {
  const { data: catalogs, isLoading: catsLoading } = useRebarCatalogs();
  const [selectedCatalog, setSelectedCatalog] = useState('');
  const [page, setPage] = useState(1);
  const activateCatalog = useActivateRebarCatalog();

  const activeCatalog = catalogs?.find((c) => c.id === selectedCatalog) ?? catalogs?.find((c) => c.status === 'active') ?? catalogs?.[0];
  const effectiveCatalogId = selectedCatalog || activeCatalog?.id || '';

  const { data: sizes, isLoading: sizesLoading } = useRebarSizes(effectiveCatalogId, page, 50);

  const hasActive = catalogs?.some((c) => c.status === 'active');

  return (
    <>
      <PageHeader
        title="Reinforcement Catalogue"
        description="Browse steel reinforcement bar sizes and designations"
        badges={<StandardsBadge code="AS/NZS 4671" edition="2019" size="sm" />}
      />

      {catsLoading ? (
        <PageLoading />
      ) : !catalogs?.length ? (
        <EmptyState icon={<Database className="h-12 w-12" />} title="No catalogues" description="Import a rebar catalogue to get started." />
      ) : (
        <>
          {!hasActive && (
            <Alert variant="warning" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>No Active Catalogue</AlertTitle>
              <AlertDescription>
                No catalogue version is currently active. Activate a version to pin its snapshot for use in calculations.
              </AlertDescription>
            </Alert>
          )}

          <div className="mb-4 flex flex-wrap gap-2">
            {catalogs.map((cat) => (
              <Button
                key={cat.id}
                variant={effectiveCatalogId === cat.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setSelectedCatalog(cat.id); setPage(1); }}
                className="gap-1.5"
              >
                {cat.name} v{cat.version}
                {cat.status === 'active' && <Check className="h-3 w-3" />}
              </Button>
            ))}
          </div>

          {activeCatalog && (
            <Card className="mb-4">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Catalogue Snapshot Status</CardTitle>
                  <SnapshotBadge catalog={activeCatalog} />
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="font-medium">{activeCatalog.name} — v{activeCatalog.version}</p>
                  <p className="text-xs text-muted-foreground">
                    Source: {activeCatalog.sourceStandard} ({activeCatalog.sourceEdition})
                  </p>
                  {activeCatalog.snapshotHash && (
                    <p className="font-mono text-xs text-muted-foreground">
                      Snapshot hash: {activeCatalog.snapshotHash}
                    </p>
                  )}
                  {activeCatalog.effectiveDate && (
                    <p className="text-xs text-muted-foreground">
                      Effective: {new Date(activeCatalog.effectiveDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={activeCatalog.status === 'active' ? 'success' : 'secondary'}>
                    {activeCatalog.status}
                  </Badge>
                  {activeCatalog.status !== 'active' && (
                    <Button
                      size="sm"
                      onClick={async () => {
                        try {
                          await activateCatalog.mutateAsync(activeCatalog.id);
                          toast.success('Catalogue activated and snapshot pinned');
                        } catch {
                          toast.error('Failed to activate catalogue');
                        }
                      }}
                      disabled={activateCatalog.isPending}
                    >
                      <Pin className="mr-1.5 h-3 w-3" />
                      {activateCatalog.isPending ? 'Activating…' : 'Activate & Pin Snapshot'}
                    </Button>
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
