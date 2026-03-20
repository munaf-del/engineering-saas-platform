'use client';

import { useState } from 'react';
import { Database } from 'lucide-react';
import { useGeotechClasses, useGeotechParameters } from '@/hooks/use-geotech';
import { PageHeader } from '@/components/page-header';
import { DataTable, type Column } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { StandardsBadge } from '@/components/standards-badge';
import { EmptyState } from '@/components/empty-state';
import { PageLoading } from '@/components/loading';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { GeotechMaterialClass, GeotechParameterSet } from '@eng/shared';

export default function GeotechPage() {
  const { data: classes, isLoading: classesLoading } = useGeotechClasses();
  const [page, setPage] = useState(1);
  const { data: params, isLoading: paramsLoading } = useGeotechParameters(page);

  const parameterSets = params?.data ?? [];
  const total = params?.meta?.total ?? 0;

  const paramColumns: Column<GeotechParameterSet & Record<string, unknown>>[] = [
    { key: 'name', header: 'Name', cell: (row) => <span className="font-medium">{row.name}</span> },
    {
      key: 'classId',
      header: 'Class',
      cell: (row) => {
        const cls = classes?.find((c) => c.id === row.classId);
        return <Badge variant="outline">{cls?.name ?? row.classId}</Badge>;
      },
    },
    {
      key: 'sourceStandard',
      header: 'Standard',
      cell: (row) =>
        row.sourceStandard ? (
          <StandardsBadge code={row.sourceStandard} edition={row.sourceEdition} size="sm" />
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'parameters',
      header: 'Parameters',
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {Object.keys(row.parameters ?? {}).length} param(s)
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Geotechnical Materials"
        description={`${classes?.length ?? 0} class(es) · ${total} parameter set(s)`}
        badges={
          <>
            <StandardsBadge code="AS 1726" edition="2017" size="sm" />
            <StandardsBadge code="AS 2159" edition="2009" size="sm" />
          </>
        }
      />

      {(classesLoading || paramsLoading) ? (
        <PageLoading />
      ) : (
      <Tabs defaultValue="parameters">
        <TabsList>
          <TabsTrigger value="parameters">Parameter Sets ({total})</TabsTrigger>
          <TabsTrigger value="classes">Material Classes ({classes?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="parameters">
          {parameterSets.length === 0 ? (
            <EmptyState icon={<Database className="h-12 w-12" />} title="No parameter sets" description="Import or define geotechnical parameter sets." />
          ) : (
            <DataTable
              columns={paramColumns}
              data={parameterSets as (GeotechParameterSet & Record<string, unknown>)[]}
              searchKey="name"
              searchPlaceholder="Search parameters…"
              totalFromServer={total}
              page={page}
              onPageChange={setPage}
            />
          )}
        </TabsContent>

        <TabsContent value="classes">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {classes?.map((cls) => (
              <Card key={cls.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{cls.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-mono text-xs text-muted-foreground">{cls.code}</p>
                  {cls.classification && <Badge variant="outline" className="mt-1">{cls.classification}</Badge>}
                  {cls.description && <p className="mt-1 text-xs text-muted-foreground">{cls.description}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
      )}
    </>
  );
}
