'use client';

import { useState } from 'react';
import { Database, Pin, Check, AlertTriangle } from 'lucide-react';
import { useSteelSectionCatalogs, useSteelSections, useActivateSteelCatalog } from '@/hooks/use-steel-sections';
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
import type { SteelSection, SteelSectionCatalog } from '@eng/shared';

const sectionColumns: Column<SteelSection & Record<string, unknown>>[] = [
  { key: 'designation', header: 'Designation', cell: (row) => <span className="font-mono font-medium">{row.designation}</span> },
  { key: 'sectionType', header: 'Type', cell: (row) => <Badge variant="outline">{row.sectionType}</Badge>, className: 'w-[120px]' },
  {
    key: 'mass',
    header: 'Mass (kg/m)',
    cell: (row) => <span className="font-mono">{(row.properties as Record<string, number>)?.massPerMetre?.toFixed(1) ?? '—'}</span>,
    className: 'w-[110px]',
  },
  {
    key: 'depth',
    header: 'd (mm)',
    cell: (row) => <span className="font-mono">{(row.properties as Record<string, number>)?.depth?.toFixed(0) ?? '—'}</span>,
    className: 'w-[90px]',
  },
  {
    key: 'Ix',
    header: 'Ix (mm⁴)',
    cell: (row) => <span className="font-mono">{(row.properties as Record<string, number>)?.momentOfInertiaX?.toExponential(2) ?? '—'}</span>,
    className: 'w-[120px]',
  },
  {
    key: 'Zx',
    header: 'Zx (mm³)',
    cell: (row) => <span className="font-mono">{(row.properties as Record<string, number>)?.sectionModulusX?.toExponential(2) ?? '—'}</span>,
    className: 'w-[120px]',
  },
];

function SnapshotBadge({ catalog }: { catalog: SteelSectionCatalog }) {
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

export default function SteelSectionsPage() {
  const { data: catalogs, isLoading: catsLoading } = useSteelSectionCatalogs();
  const [selectedCatalog, setSelectedCatalog] = useState<string>('');
  const [page, setPage] = useState(1);
  const activateCatalog = useActivateSteelCatalog();

  const activeCatalog = catalogs?.find((c) => c.id === selectedCatalog) ?? catalogs?.find((c) => c.status === 'active') ?? catalogs?.[0];
  const effectiveCatalogId = selectedCatalog || activeCatalog?.id || '';

  const { data: sections, isLoading: sectionsLoading } = useSteelSections(effectiveCatalogId, page, 50);

  const hasActive = catalogs?.some((c) => c.status === 'active');

  return (
    <>
      <PageHeader
        title="Steel Sections Catalogue"
        description="Hot-rolled and welded structural steel sections"
        badges={
          <>
            <StandardsBadge code="AS 4100" edition="2020" size="sm" />
            <StandardsBadge code="AS/NZS 3679.1" edition="2016" size="sm" />
          </>
        }
      />

      {catsLoading ? (
        <PageLoading />
      ) : !catalogs?.length ? (
        <EmptyState icon={<Database className="h-12 w-12" />} title="No catalogues" description="Import a steel section catalogue to get started." />
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

          {sectionsLoading ? (
            <PageLoading />
          ) : (
            <DataTable
              columns={sectionColumns}
              data={(sections?.data ?? []) as (SteelSection & Record<string, unknown>)[]}
              searchKey="designation"
              searchPlaceholder="Search by designation…"
              totalFromServer={sections?.meta?.total ?? 0}
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
