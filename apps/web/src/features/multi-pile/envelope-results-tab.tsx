'use client';

import type { MultiPileEnvelopeRunSummary, MultiPileEnvelopeValue } from '@eng/shared';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatNumber, formatTimestamp, statusBadgeVariant } from './utils';

interface EnvelopeResultsTabProps {
  latestRun: MultiPileEnvelopeRunSummary | null | undefined;
}

export function EnvelopeResultsTab({ latestRun }: EnvelopeResultsTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Latest Governing Envelope Snapshot</CardTitle>
        <CardDescription>
          This is the persisted output from the last envelope run for the current pile group.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!latestRun ? (
          <p className="text-sm text-muted-foreground">
            No envelope run yet. Save and run the slice to generate the first snapshot.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <Badge variant={statusBadgeVariant(latestRun.status)}>{latestRun.status}</Badge>
              <Badge variant="outline">{formatTimestamp(latestRun.createdAt)}</Badge>
              {latestRun.durationMs != null ? (
                <Badge variant="outline">{Math.round(latestRun.durationMs)} ms</Badge>
              ) : null}
              {latestRun.envelope ? (
                <>
                  <Badge variant="outline">{latestRun.envelope.projectSummary.jointCount} joints</Badge>
                  <Badge variant="outline">
                    {latestRun.envelope.projectSummary.evaluatedCombinationCount} combinations
                  </Badge>
                </>
              ) : null}
            </div>

            {latestRun.errors?.length ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
                {latestRun.errors.map((error) => (
                  <div key={`${error.code}:${error.message}`}>
                    <span className="font-medium">{error.code}</span>: {error.message}
                  </div>
                ))}
              </div>
            ) : null}

            {latestRun.warnings?.length ? (
              <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">
                {latestRun.warnings.map((warning) => (
                  <div key={`${warning.code}:${warning.message}`}>
                    <span className="font-medium">{warning.code}</span>: {warning.message}
                  </div>
                ))}
              </div>
            ) : null}

            {latestRun.envelope ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Joint</TableHead>
                    <TableHead>Pile Type</TableHead>
                    <TableHead>Representative</TableHead>
                    <TableHead>Active Patterns</TableHead>
                    <TableHead>Nmax</TableHead>
                    <TableHead>Nmin</TableHead>
                    <TableHead>Vx</TableHead>
                    <TableHead>Vy</TableHead>
                    <TableHead>Mx</TableHead>
                    <TableHead>My</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {latestRun.envelope.jointResults.map((row) => (
                    <TableRow key={row.jointId}>
                      <TableCell className="font-medium">{row.jointDisplayName || row.jointId}</TableCell>
                      <TableCell>{row.pileTypeId}</TableCell>
                      <TableCell>{row.representativePileId ?? '-'}</TableCell>
                      <TableCell className="text-xs">{row.activePatternIds.join(', ') || '-'}</TableCell>
                      <EnvelopeCell value={row.nMax} />
                      <EnvelopeCell value={row.nMin} />
                      <EnvelopeCell value={row.vx} />
                      <EnvelopeCell value={row.vy} />
                      <EnvelopeCell value={row.mx} />
                      <EnvelopeCell value={row.my} />
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function EnvelopeCell({ value }: { value: MultiPileEnvelopeValue }) {
  return (
    <TableCell>
      <div className="font-medium">{formatNumber(value.value)}</div>
      <div className="text-xs text-muted-foreground">{value.combinationName || '-'}</div>
    </TableCell>
  );
}
