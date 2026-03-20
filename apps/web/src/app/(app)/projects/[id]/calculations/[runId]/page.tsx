'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle, FileText } from 'lucide-react';
import { useCalculation, useCalculationSnapshot, useCalculationDesignChecks, useCalculationReports, useCreateReport } from '@/hooks/use-calculations';
import { useProject } from '@/hooks/use-projects';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DesignCheckIndicator, UtilisationBar } from '@/components/design-check-indicator';
import { PageLoading } from '@/components/loading';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

export default function CalculationDetailPage({
  params,
}: {
  params: Promise<{ id: string; runId: string }>;
}) {
  const { id: projectId, runId } = use(params);
  const { data: project } = useProject(projectId);
  const { data: run, isLoading } = useCalculation(projectId, runId);
  const { data: snapshot } = useCalculationSnapshot(projectId, runId);
  const { data: designChecks } = useCalculationDesignChecks(projectId, runId);
  const { data: reports } = useCalculationReports(projectId, runId);
  const createReport = useCreateReport(projectId, runId);

  if (isLoading || !run) return <PageLoading />;

  const result = run.resultSnapshot;
  const hasUnapproved = designChecks?.some((dc) => dc.status === 'warning' || dc.status === 'fail');

  return (
    <>
      <div className="mb-4">
        <Link href={`/projects/${projectId}/calculations`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Calculation History
        </Link>
      </div>

      <PageHeader
        title={`${run.calcType.replace(/_/g, ' ')} — ${run.status}`}
        description={`${project?.code ?? ''} · Run ${new Date(run.createdAt).toLocaleString()}`}
        badges={
          <Badge variant={run.status === 'completed' ? 'success' : run.status === 'failed' ? 'destructive' : 'secondary'}>
            {run.status}
          </Badge>
        }
        actions={
          <div className="flex gap-2">
            <Link href={`/projects/${projectId}/calculations/${runId}/report`}>
              <Button variant="outline"><FileText className="mr-2 h-4 w-4" />View Report</Button>
            </Link>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  await createReport.mutateAsync({ title: `Report — ${run.calcType}` });
                  toast.success('Report generation requested');
                } catch {
                  toast.error('Failed to create report');
                }
              }}
              disabled={createReport.isPending}
            >
              <FileText className="mr-2 h-4 w-4" />
              Generate Report
            </Button>
          </div>
        }
      />

      {hasUnapproved && (
        <Alert variant="warning" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Engineer Review Required</AlertTitle>
          <AlertDescription>
            One or more design checks have warnings or failures. Results must be reviewed by a qualified engineer before use.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="summary" className="space-y-4">
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="design-checks">Design Checks ({designChecks?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="steps">Calculation Steps</TabsTrigger>
          <TabsTrigger value="snapshot">Snapshot</TabsTrigger>
          <TabsTrigger value="reports">Reports ({reports?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Inputs</CardTitle></CardHeader>
              <CardContent>
                {run.requestSnapshot?.inputs ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Parameter</TableHead>
                        <TableHead className="text-right">Value</TableHead>
                        <TableHead>Unit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(run.requestSnapshot.inputs).map(([key, val]) => (
                        <TableRow key={key}>
                          <TableCell className="font-medium">{val.label ?? key}</TableCell>
                          <TableCell className="text-right font-mono">{val.value}</TableCell>
                          <TableCell>{val.unit}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground">No input data available.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Outputs</CardTitle></CardHeader>
              <CardContent>
                {result?.outputs ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Result</TableHead>
                        <TableHead className="text-right">Value</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Clause</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(result.outputs).map(([key, val]) => (
                        <TableRow key={key}>
                          <TableCell className="font-medium">{val.label ?? key}</TableCell>
                          <TableCell className="text-right font-mono">{val.value}</TableCell>
                          <TableCell>{val.unit}</TableCell>
                          <TableCell className="font-mono text-xs">{val.clauseRef ?? '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground">No output data available.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {result?.warnings && result.warnings.length > 0 && (
            <Card className="mt-4">
              <CardHeader><CardTitle className="text-base text-amber-600">Warnings</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm">
                  {result.warnings.map((w, i) => (
                    <li key={i} className="text-amber-700">
                      <strong>{w.code}:</strong> {w.message}
                      {w.clauseRef && <span className="ml-1 font-mono text-xs">({w.clauseRef})</span>}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="design-checks">
          {designChecks?.length ? (
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Check</TableHead>
                      <TableHead>Limit State</TableHead>
                      <TableHead className="text-right">Demand</TableHead>
                      <TableHead className="text-right">Capacity</TableHead>
                      <TableHead>Utilisation</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Clause</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {designChecks.map((dc) => (
                      <TableRow key={dc.id}>
                        <TableCell className="font-medium">{dc.checkType}</TableCell>
                        <TableCell><Badge variant="outline">{dc.limitState}</Badge></TableCell>
                        <TableCell className="text-right font-mono">{dc.demandValue.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono">{dc.capacityValue.toFixed(2)}</TableCell>
                        <TableCell className="w-[180px]">
                          <UtilisationBar ratio={dc.utilisationRatio} />
                        </TableCell>
                        <TableCell>
                          <DesignCheckIndicator status={dc.status as 'pass' | 'fail' | 'warning' | 'not_checked'} compact />
                        </TableCell>
                        <TableCell className="font-mono text-xs">{dc.clauseRef ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <p className="text-sm text-muted-foreground">No design checks for this run.</p>
          )}
        </TabsContent>

        <TabsContent value="steps">
          {result?.steps?.length ? (
            <div className="space-y-3">
              {result.steps.map((step, i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">{step.name}</CardTitle>
                      <Badge variant="outline" className="font-mono text-xs">{step.clauseRef}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                    <div className="rounded bg-muted px-3 py-2 font-mono text-sm">{step.formula}</div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-muted-foreground">Result:</span>
                      <span className="font-mono font-medium">
                        {step.result.value} {step.result.unit}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No intermediate steps available.</p>
          )}
        </TabsContent>

        <TabsContent value="snapshot">
          {snapshot ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Calculation Snapshot</CardTitle>
                  <Badge variant="outline" className="font-mono text-xs">
                    Hash: {snapshot.combinedHash.slice(0, 12)}…
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium">Input Hash</h4>
                  <code className="text-xs text-muted-foreground">{snapshot.inputHash}</code>
                </div>
                <div>
                  <h4 className="text-sm font-medium">Standards Hash</h4>
                  <code className="text-xs text-muted-foreground">{snapshot.standardsHash}</code>
                </div>
                <div>
                  <h4 className="text-sm font-medium">Rule Pack Hash</h4>
                  <code className="text-xs text-muted-foreground">{snapshot.rulePackHash}</code>
                </div>
                {snapshot.outputHash && (
                  <div>
                    <h4 className="text-sm font-medium">Output Hash</h4>
                    <code className="text-xs text-muted-foreground">{snapshot.outputHash}</code>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <p className="text-sm text-muted-foreground">No snapshot available.</p>
          )}
        </TabsContent>

        <TabsContent value="reports">
          {reports?.length ? (
            <div className="space-y-2">
              {reports.map((r) => (
                <Card key={r.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium">{r.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.format} · {r.status} · {r.generatedAt ? new Date(r.generatedAt).toLocaleString() : 'Pending'}
                      </p>
                    </div>
                    <Badge variant={r.status === 'completed' ? 'success' : 'secondary'}>{r.status}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No reports generated yet.</p>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
