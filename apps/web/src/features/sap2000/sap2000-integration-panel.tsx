'use client';

import React, { useMemo, useState } from 'react';
import { AlertTriangle, Cable, DatabaseZap, RefreshCw, Server, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  SAP2000_APPROVED_SMOKE_MODEL_PATH,
  SAP2000_BRIDGE_DEFAULT_BASE_URL,
  SAP2000_READ_ONLY_WARNING,
  Sap2000BridgeClient,
  Sap2000BridgeError,
  type Sap2000BridgeErrorDetails,
  type Sap2000BridgeInfoResponse,
  type Sap2000Frame,
  type Sap2000Joint,
  type Sap2000LoadCase,
  type Sap2000LoadCombination,
  type Sap2000LoadPattern,
  type Sap2000Material,
  type Sap2000Metadata,
  type Sap2000Section,
  type Sap2000StatusResponse,
  type Sap2000UnitsResponse,
  parseSap2000BridgeError,
} from './sap2000-bridge-client';

type BridgeConnectionState = 'unchecked' | 'online' | 'offline';
type ActionName = 'check' | 'connect' | 'open' | 'refresh';

const emptyMetadata: Sap2000Metadata = {
  units: null,
  joints: [],
  frames: [],
  materials: [],
  sections: [],
  loadPatterns: [],
  loadCases: [],
  loadCombinations: [],
  auditRecords: [],
};

export function Sap2000IntegrationPanel() {
  const [baseUrl, setBaseUrl] = useState(SAP2000_BRIDGE_DEFAULT_BASE_URL);
  const [modelPath, setModelPath] = useState(SAP2000_APPROVED_SMOKE_MODEL_PATH);
  const [connectionState, setConnectionState] = useState<BridgeConnectionState>('unchecked');
  const [bridgeInfo, setBridgeInfo] = useState<Sap2000BridgeInfoResponse | null>(null);
  const [status, setStatus] = useState<Sap2000StatusResponse | null>(null);
  const [metadata, setMetadata] = useState<Sap2000Metadata>(emptyMetadata);
  const [error, setError] = useState<Sap2000BridgeErrorDetails | null>(null);
  const [loadingAction, setLoadingAction] = useState<ActionName | null>(null);

  const counts = useMemo(
    () => [
      { label: 'Joints', value: metadata.joints.length },
      { label: 'Frames', value: metadata.frames.length },
      { label: 'Materials', value: metadata.materials.length },
      { label: 'Sections', value: metadata.sections.length },
      { label: 'Load patterns', value: metadata.loadPatterns.length },
      { label: 'Load cases', value: metadata.loadCases.length },
      { label: 'Load combinations', value: metadata.loadCombinations.length },
      { label: 'Audit records', value: metadata.auditRecords.length },
    ],
    [metadata],
  );

  async function runBridgeAction(
    action: ActionName,
    callback: (client: Sap2000BridgeClient) => Promise<void>,
  ) {
    setLoadingAction(action);
    setError(null);

    try {
      const client = new Sap2000BridgeClient(baseUrl);
      await callback(client);
    } catch (caught) {
      setConnectionState(action === 'check' ? 'offline' : connectionState);
      setError(toBridgeErrorDetails(caught));
    } finally {
      setLoadingAction(null);
    }
  }

  async function checkBridge() {
    await runBridgeAction('check', async (client) => {
      await client.health();
      const [info, nextStatus] = await Promise.all([client.bridgeInfo(), client.status()]);
      setBridgeInfo(info);
      setStatus(nextStatus);
      setConnectionState('online');
    });
  }

  async function connectToSap2000() {
    await runBridgeAction('connect', async (client) => {
      await client.connect();
      const nextStatus = await client.status();
      setStatus(nextStatus);
      setConnectionState('online');
    });
  }

  async function openApprovedSmokeModel() {
    await runBridgeAction('open', async (client) => {
      const openModel = await client.openModel(modelPath);
      const nextStatus: Sap2000StatusResponse = {
        connected: true,
        launched_by_bridge: false,
        model_open: openModel.model_open,
        model_path: openModel.model_path,
        model_name: openModel.model_name,
        version_label: openModel.version_label,
        version_number: openModel.version_number,
        adapter_mode: openModel.adapter_mode,
        correlation_id: openModel.correlation_id,
      };
      setStatus(nextStatus);
      setMetadata((current) => ({ ...current, units: openModelToUnitsResponse(openModel) }));
      setConnectionState('online');
    });
  }

  async function refreshMetadata() {
    await runBridgeAction('refresh', async (client) => {
      const nextMetadata = await client.readMetadata();
      const [info, nextStatus] = await Promise.all([client.bridgeInfo(), client.status()]);
      setMetadata(nextMetadata);
      setBridgeInfo(info);
      setStatus(nextStatus);
      setConnectionState('online');
    });
  }

  const units = metadata.units?.units ?? null;
  const adapterMode = status?.adapter_mode ?? bridgeInfo?.adapter_mode ?? 'Unknown';
  const sapVersion = status?.version_label ?? status?.version_number ?? 'Unknown';

  return (
    <>
      <PageHeader
        title="SAP2000 Integration"
        description="Read-only metadata bridge for local SAP2000 smoke verification."
        badges={
          <>
            <Badge variant={connectionState === 'online' ? 'success' : 'secondary'}>
              Bridge{' '}
              {connectionState === 'online'
                ? 'online'
                : connectionState === 'offline'
                  ? 'offline'
                  : 'unchecked'}
            </Badge>
            <Badge variant="outline">Browser-local bridge URL</Badge>
          </>
        }
      />

      <div className="space-y-6">
        <Alert variant="warning">
          <ShieldCheck className="h-4 w-4" />
          <AlertTitle>Read-only connector</AlertTitle>
          <AlertDescription>{SAP2000_READ_ONLY_WARNING}</AlertDescription>
        </Alert>

        {error ? <BridgeErrorAlert error={error} /> : null}

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Server className="h-4 w-4" />
                Local bridge controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="sap2000-bridge-url">Bridge base URL</Label>
                  <Input
                    id="sap2000-bridge-url"
                    value={baseUrl}
                    onChange={(event) => setBaseUrl(event.target.value)}
                    spellCheck={false}
                  />
                  <p className="text-xs text-muted-foreground">
                    Evaluated from the current browser or runtime machine.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sap2000-model-path">Approved smoke model path</Label>
                  <Input
                    id="sap2000-model-path"
                    value={modelPath}
                    onChange={(event) => setModelPath(event.target.value)}
                    spellCheck={false}
                  />
                  <p className="text-xs text-muted-foreground">
                    Editable text only; no file browsing.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={loadingAction !== null}
                  onClick={checkBridge}
                  type="button"
                  variant="outline"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Check Bridge
                </Button>
                <Button
                  disabled={loadingAction !== null}
                  onClick={connectToSap2000}
                  type="button"
                  variant="outline"
                >
                  <Cable className="mr-2 h-4 w-4" />
                  Connect to Running SAP2000
                </Button>
                <Button
                  disabled={loadingAction !== null}
                  onClick={openApprovedSmokeModel}
                  type="button"
                  variant="outline"
                >
                  <DatabaseZap className="mr-2 h-4 w-4" />
                  Open Approved Smoke Model
                </Button>
                <Button disabled={loadingAction !== null} onClick={refreshMetadata} type="button">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Metadata
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Session metadata</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <MetadataTerm label="adapter_mode" value={adapterMode} />
                <MetadataTerm label="connected" value={formatBoolean(status?.connected)} />
                <MetadataTerm label="model_open" value={formatBoolean(status?.model_open)} />
                <MetadataTerm label="SAP2000 version" value={String(sapVersion)} />
                <MetadataTerm
                  className="col-span-2"
                  label="model path"
                  value={status?.model_path ?? 'Not open'}
                />
                <MetadataTerm label="model name" value={status?.model_name ?? 'Not open'} />
                <MetadataTerm label="units present" value={units?.present ?? 'Unknown'} />
                <MetadataTerm label="units database" value={units?.database ?? 'Unknown'} />
                <MetadataTerm label="length" value={units?.length ?? 'Unknown'} />
                <MetadataTerm label="force" value={units?.force ?? 'Unknown'} />
                <MetadataTerm label="moment" value={units?.moment ?? 'Unknown'} />
                <MetadataTerm label="temperature" value={units?.temperature ?? 'Unknown'} />
              </dl>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {counts.map((count) => (
            <Card key={count.label}>
              <CardContent className="p-4">
                <div className="text-2xl font-semibold">{count.value}</div>
                <div className="text-sm text-muted-foreground">{count.label}</div>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="space-y-6">
          <JointTable joints={metadata.joints} />
          <FrameTable frames={metadata.frames} />
          <NameTable
            title="Materials"
            rows={metadata.materials}
            extraLabel="Type"
            extraValue={(row) => row.material_type ?? 'Unspecified'}
          />
          <NameTable
            title="Sections"
            rows={metadata.sections}
            extraLabel="Material"
            extraValue={(row) => row.material ?? 'Unspecified'}
          />
          <NameTable
            title="Load patterns"
            rows={metadata.loadPatterns}
            extraLabel="Type"
            extraValue={(row) => row.load_type ?? 'Unspecified'}
          />
          <NameTable
            title="Load cases"
            rows={metadata.loadCases}
            extraLabel="Type"
            extraValue={(row) => row.case_type ?? 'Unspecified'}
          />
          <LoadCombinationTable combinations={metadata.loadCombinations} />
        </section>
      </div>
    </>
  );
}

function BridgeErrorAlert({ error }: { error: Sap2000BridgeErrorDetails }) {
  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>SAP2000 bridge error</AlertTitle>
      <AlertDescription>
        <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
          <MetadataTerm label="bridge_code" value={error.bridge_code} />
          <MetadataTerm label="message" value={error.message} />
          <MetadataTerm label="correlation_id" value={error.correlation_id} />
          <MetadataTerm label="retryable" value={formatBoolean(error.retryable)} />
          {error.sap_context ? (
            <MetadataTerm className="sm:col-span-2" label="sap_context" value={error.sap_context} />
          ) : null}
        </dl>
      </AlertDescription>
    </Alert>
  );
}

function MetadataTerm({
  label,
  value,
  className = '',
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium uppercase text-muted-foreground">{label}</dt>
      <dd className="break-words font-mono text-sm">{value}</dd>
    </div>
  );
}

function JointTable({ joints }: { joints: Sap2000Joint[] }) {
  return (
    <TableCard title="Joints">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Coord system</TableHead>
            <TableHead>X</TableHead>
            <TableHead>Y</TableHead>
            <TableHead>Z</TableHead>
            <TableHead>Units</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {joints.length ? (
            joints.map((joint) => (
              <TableRow key={joint.name}>
                <TableCell>{joint.name}</TableCell>
                <TableCell>{joint.coord_system}</TableCell>
                <TableCell>{joint.x}</TableCell>
                <TableCell>{joint.y}</TableCell>
                <TableCell>{joint.z}</TableCell>
                <TableCell>{joint.units_ref}</TableCell>
              </TableRow>
            ))
          ) : (
            <EmptyRow colSpan={6} />
          )}
        </TableBody>
      </Table>
    </TableCard>
  );
}

function FrameTable({ frames }: { frames: Sap2000Frame[] }) {
  return (
    <TableCard title="Frames">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Start joint</TableHead>
            <TableHead>End joint</TableHead>
            <TableHead>Section</TableHead>
            <TableHead>Coord system</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {frames.length ? (
            frames.map((frame) => (
              <TableRow key={frame.name}>
                <TableCell>{frame.name}</TableCell>
                <TableCell>{frame.start_joint ?? 'Unknown'}</TableCell>
                <TableCell>{frame.end_joint ?? 'Unknown'}</TableCell>
                <TableCell>{frame.section ?? 'Unknown'}</TableCell>
                <TableCell>{frame.coord_system}</TableCell>
              </TableRow>
            ))
          ) : (
            <EmptyRow colSpan={5} />
          )}
        </TableBody>
      </Table>
    </TableCard>
  );
}

function NameTable<
  T extends Sap2000Material | Sap2000Section | Sap2000LoadPattern | Sap2000LoadCase,
>({
  title,
  rows,
  extraLabel,
  extraValue,
}: {
  title: string;
  rows: T[];
  extraLabel: string;
  extraValue: (row: T) => string | number;
}) {
  return (
    <TableCard title={title}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>{extraLabel}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length ? (
            rows.map((row) => (
              <TableRow key={row.name}>
                <TableCell>{row.name}</TableCell>
                <TableCell>{extraValue(row)}</TableCell>
              </TableRow>
            ))
          ) : (
            <EmptyRow colSpan={2} />
          )}
        </TableBody>
      </Table>
    </TableCard>
  );
}

function LoadCombinationTable({ combinations }: { combinations: Sap2000LoadCombination[] }) {
  return (
    <TableCard title="Load combinations">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Items</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {combinations.length ? (
            combinations.map((combination) => (
              <TableRow key={combination.name}>
                <TableCell>{combination.name}</TableCell>
                <TableCell>
                  {combination.items
                    .map((item) => `${item.name} x ${item.scale_factor ?? 1}`)
                    .join(', ')}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <EmptyRow colSpan={2} />
          )}
        </TableBody>
      </Table>
    </TableCard>
  );
}

function TableCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">{children}</CardContent>
    </Card>
  );
}

function EmptyRow({ colSpan }: { colSpan: number }) {
  return (
    <TableRow>
      <TableCell className="h-20 text-center text-muted-foreground" colSpan={colSpan}>
        No records returned.
      </TableCell>
    </TableRow>
  );
}

function formatBoolean(value: boolean | undefined) {
  if (value === undefined) return 'Unknown';
  return value ? 'true' : 'false';
}

function openModelToUnitsResponse(openModel: {
  model_path: string;
  model_name: string;
  version_label: string;
  version_number: number | string;
  adapter_mode: string;
  units: Sap2000UnitsResponse['units'];
  correlation_id: string;
}): Sap2000UnitsResponse {
  return {
    model_path: openModel.model_path,
    model_name: openModel.model_name,
    version_label: openModel.version_label,
    version_number: openModel.version_number,
    adapter_mode: openModel.adapter_mode,
    units: openModel.units,
    correlation_id: openModel.correlation_id,
  };
}

function toBridgeErrorDetails(caught: unknown): Sap2000BridgeErrorDetails {
  if (caught instanceof Sap2000BridgeError) {
    return caught.details;
  }

  return parseSap2000BridgeError({
    error: {
      bridge_code: 'BRIDGE_REQUEST_FAILED',
      message: caught instanceof Error ? caught.message : 'SAP2000 bridge request failed.',
      retryable: false,
      correlation_id: 'unavailable',
    },
  });
}
