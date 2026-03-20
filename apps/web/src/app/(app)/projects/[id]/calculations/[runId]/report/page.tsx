'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Printer } from 'lucide-react';
import { useCalculation, useCalculationDesignChecks } from '@/hooks/use-calculations';
import { useProject } from '@/hooks/use-projects';
import { PageLoading } from '@/components/loading';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

export default function CalculationReportPage({
  params,
}: {
  params: Promise<{ id: string; runId: string }>;
}) {
  const { id: projectId, runId } = use(params);
  const { data: project } = useProject(projectId);
  const { data: run, isLoading } = useCalculation(projectId, runId);
  const { data: designChecks } = useCalculationDesignChecks(projectId, runId);

  if (isLoading || !run) return <PageLoading />;

  const result = run.resultSnapshot;
  const hasFailures = designChecks?.some((dc) => dc.status === 'fail' || dc.status === 'warning');

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href={`/projects/${projectId}/calculations/${runId}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to calculation
        </Link>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" /> Print Report
        </Button>
      </div>

      <div className="space-y-6 rounded-lg border bg-white p-8 shadow-sm print:border-0 print:shadow-none">
        <header className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">Engineering Calculation Report</h1>
              <p className="text-sm text-muted-foreground">EngPlatform — Automated Engineering Computation</p>
            </div>
            <div className="text-right text-sm">
              <p className="font-medium">{project?.code}</p>
              <p className="text-muted-foreground">{project?.name}</p>
            </div>
          </div>
        </header>

        <section>
          <h2 className="mb-2 text-lg font-semibold">1. Calculation Details</h2>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b"><td className="py-1.5 font-medium w-40">Calc Type</td><td>{run.calcType.replace(/_/g, ' ')}</td></tr>
              <tr className="border-b"><td className="py-1.5 font-medium">Status</td><td>{run.status}</td></tr>
              <tr className="border-b"><td className="py-1.5 font-medium">Run Date</td><td>{new Date(run.createdAt).toLocaleString()}</td></tr>
              <tr className="border-b"><td className="py-1.5 font-medium">Duration</td><td>{run.durationMs ? `${run.durationMs} ms` : 'N/A'}</td></tr>
              <tr className="border-b"><td className="py-1.5 font-medium">Request Hash</td><td className="font-mono text-xs">{run.requestHash}</td></tr>
              {run.notes && <tr className="border-b"><td className="py-1.5 font-medium">Notes</td><td>{run.notes}</td></tr>}
            </tbody>
          </table>
        </section>

        {hasFailures && (
          <Alert variant="warning">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Engineer Review Required</AlertTitle>
            <AlertDescription>This calculation contains design check warnings or failures requiring engineer review.</AlertDescription>
          </Alert>
        )}

        {run.requestSnapshot?.inputs && (
          <section>
            <h2 className="mb-2 text-lg font-semibold">2. Input Parameters</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b"><th className="py-1.5 text-left font-medium">Parameter</th><th className="py-1.5 text-right font-medium">Value</th><th className="py-1.5 text-left pl-4 font-medium">Unit</th></tr>
              </thead>
              <tbody>
                {Object.entries(run.requestSnapshot.inputs).map(([key, val]) => (
                  <tr key={key} className="border-b">
                    <td className="py-1">{val.label ?? key}</td>
                    <td className="py-1 text-right font-mono">{val.value}</td>
                    <td className="py-1 pl-4">{val.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {result?.outputs && (
          <section>
            <h2 className="mb-2 text-lg font-semibold">3. Results</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b"><th className="py-1.5 text-left font-medium">Output</th><th className="py-1.5 text-right font-medium">Value</th><th className="py-1.5 text-left pl-4 font-medium">Unit</th><th className="py-1.5 text-left pl-4 font-medium">Clause</th></tr>
              </thead>
              <tbody>
                {Object.entries(result.outputs).map(([key, val]) => (
                  <tr key={key} className="border-b">
                    <td className="py-1">{val.label ?? key}</td>
                    <td className="py-1 text-right font-mono">{val.value}</td>
                    <td className="py-1 pl-4">{val.unit}</td>
                    <td className="py-1 pl-4 font-mono text-xs">{val.clauseRef ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {designChecks && designChecks.length > 0 && (
          <section>
            <h2 className="mb-2 text-lg font-semibold">4. Design Checks</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-1.5 text-left font-medium">Check</th>
                  <th className="py-1.5 text-left font-medium">Limit State</th>
                  <th className="py-1.5 text-right font-medium">D/C Ratio</th>
                  <th className="py-1.5 text-left pl-4 font-medium">Status</th>
                  <th className="py-1.5 text-left pl-4 font-medium">Clause</th>
                </tr>
              </thead>
              <tbody>
                {designChecks.map((dc) => (
                  <tr key={dc.id} className="border-b">
                    <td className="py-1">{dc.checkType}</td>
                    <td className="py-1">{dc.limitState}</td>
                    <td className="py-1 text-right font-mono">{(dc.utilisationRatio * 100).toFixed(1)}%</td>
                    <td className="py-1 pl-4 font-medium">{dc.status.toUpperCase()}</td>
                    <td className="py-1 pl-4 font-mono text-xs">{dc.clauseRef ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {result?.steps && result.steps.length > 0 && (
          <section>
            <h2 className="mb-2 text-lg font-semibold">5. Calculation Steps</h2>
            <div className="space-y-3">
              {result.steps.map((step, i) => (
                <div key={i} className="rounded border p-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">{step.name}</h3>
                    <span className="font-mono text-xs text-muted-foreground">{step.clauseRef}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
                  <p className="mt-1 font-mono text-sm">{step.formula}</p>
                  <p className="mt-1 text-sm">
                    <strong>Result:</strong> {step.result.value} {step.result.unit}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        <footer className="border-t pt-4 text-center text-xs text-muted-foreground">
          <p>This report was generated by EngPlatform. All calculations must be independently verified by a qualified engineer.</p>
          <p className="mt-1">Report generated: {new Date().toLocaleString()}</p>
        </footer>
      </div>
    </div>
  );
}
