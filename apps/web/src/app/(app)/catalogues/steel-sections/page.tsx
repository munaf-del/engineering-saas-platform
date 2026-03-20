'use client';

import { useState } from 'react';
import { Database, Pin } from 'lucide-react';
import { useSteelSectionCatalogs, useSteelSections, useActivateSteelCatalog } from '@/hooks/use-steel-sections';
import { PageHeader } from '@/components/page-header';
import { DataTable, type Column } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { StandardsBadge } from '@/components/standards-badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/empty-state';
import { PageLoading } from '@/components/loading';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import type { SteelSection } from '@eng/shared';

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

export default function SteelSectionsPage() {
  const { data: catalogs, isLoading: catsLoading } = useSteelSectionCatalogs();
  const [selectedCatalog, setSelectedCatalog] = useState<string>('');
  const [page, setPage] = useState(1);
  const activateCatalog = useActivateSteelCatalog();

  const activeCatalog = catalogs?.find((c) => c.id === selectedCatalog) ?? catalogs?.find((c) => c.status === 'active') ?? catalogs?.[0];
  const effectiveCatalogId = selectedCatalog || activeCatalog?.id || '';

  const { data: sections, isLoading: sectionsLoading } = useSteelSections(effectiveCatalogId, page, 50);

  if (catsLoading) return <PageLoading />;

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

      {!catalogs?.length ? (
        <EmptyState icon={<Database className="h-12 w-12" />} title="No catalogues" description="Import a steel section catalogue to get started." />
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
                <div className="space-y-0.5">
                  <p className="font-medium">{activeCatalog.name} — v{activeCatalog.version}</p>
                  <p className="text-xs text-muted-foreground">
                    Source: {activeCatalog.sourceStandard} ({activeCatalog.sourceEdition})
                    {activeCatalog.snapshotHash && (
                      <span className="ml-2 font-mono">Hash: {activeCatalog.snapshotHash.slice(0, 12)}…</span>
                    )}
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
