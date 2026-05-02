import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import {
  SAP2000_BRIDGE_DEFAULT_BASE_URL,
  SAP2000_BRIDGE_ENDPOINTS,
  SAP2000_APPROVED_SMOKE_MODEL_PATH,
  Sap2000BridgeClient,
  getSap2000BridgeBaseUrl,
  parseSap2000BridgeError,
} from './sap2000-bridge-client';
import { createSap2000SmokeMockFetch } from './sap2000-smoke-mock';

describe('Sap2000BridgeClient', () => {
  it('defaults the bridge base URL to localhost port 8765 and allows configuration', () => {
    expect(getSap2000BridgeBaseUrl()).toBe(SAP2000_BRIDGE_DEFAULT_BASE_URL);
    expect(getSap2000BridgeBaseUrl('http://localhost:9876/')).toBe('http://localhost:9876');
    expect(() => getSap2000BridgeBaseUrl('http://0.0.0.0:8765')).toThrow('0.0.0.0');
  });

  it('does not expose analysis, result extraction, patch/apply, launch, or write-back endpoints', () => {
    const endpoints = Object.values(SAP2000_BRIDGE_ENDPOINTS).join('\n');

    expect(endpoints).not.toContain('/sap2000/analyze');
    expect(endpoints).not.toContain('/sap2000/analyse');
    expect(endpoints).not.toContain('/sap2000/results');
    expect(endpoints).not.toContain('/sap2000/patches');
    expect(endpoints).not.toContain('/sap2000/launch');
  });

  it('uses a browser-safe default fetch wrapper with the browser global binding', async () => {
    const fetchMock = vi.fn(function (this: unknown) {
      if (this !== globalThis) {
        throw new TypeError('Illegal invocation');
      }
      return Promise.resolve(
        new Response(
          JSON.stringify({
            ok: true,
            service: 'sap2000-local-bridge',
            version: '0.1.0',
            correlation_id: 'corr-fetch-binding',
          }),
        ),
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new Sap2000BridgeClient();
    const body = await client.health();

    expect(body.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:8765/health',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('checks an online comtypes bridge response using mocked smoke data', async () => {
    const client = new Sap2000BridgeClient(undefined, createSap2000SmokeMockFetch());

    const health = await client.health();
    const info = await client.bridgeInfo();
    const status = await client.status();

    expect(health.ok).toBe(true);
    expect(info.adapter_mode).toBe('comtypes');
    expect(status.connected).toBe(true);
    expect(status.model_open).toBe(true);
    expect(status.version_number).toBe('27.1.0');
  });

  it('connects to a running SAP2000 session with the read-only attach payload', async () => {
    const fetcher = vi.fn(createSap2000SmokeMockFetch());
    const client = new Sap2000BridgeClient(undefined, fetcher);

    const result = await client.connect();

    expect(result.connected).toBe(true);
    expect(fetcher).toHaveBeenCalledWith(
      `${SAP2000_BRIDGE_DEFAULT_BASE_URL}/sap2000/connect`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ attach_to_running: true }),
      }),
    );
  });

  it('opens the approved smoke model with the bridge contract path field', async () => {
    const fetcher = vi.fn(createSap2000SmokeMockFetch());
    const client = new Sap2000BridgeClient(undefined, fetcher);

    const result = await client.openModel(SAP2000_APPROVED_SMOKE_MODEL_PATH);

    expect(result.model_open).toBe(true);
    expect(result.model_path).toBe(SAP2000_APPROVED_SMOKE_MODEL_PATH);
    expect(fetcher).toHaveBeenCalledWith(
      `${SAP2000_BRIDGE_DEFAULT_BASE_URL}/sap2000/open-model`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          path: SAP2000_APPROVED_SMOKE_MODEL_PATH,
          copy_to_workspace: false,
        }),
      }),
    );
  });

  it('reads units and smoke metadata counts from mocked bridge responses', async () => {
    const client = new Sap2000BridgeClient(undefined, createSap2000SmokeMockFetch());

    const metadata = await client.readMetadata();

    expect(metadata.units?.units).toMatchObject({
      present: 'kN_m_C',
      database: 'kN_m_C',
      length: 'm',
      force: 'kN',
      moment: 'kN-m',
      temperature: 'C',
    });
    expect(metadata.joints).toHaveLength(2);
    expect(metadata.frames).toHaveLength(1);
    expect(metadata.materials).toHaveLength(3);
    expect(metadata.sections).toHaveLength(1);
    expect(metadata.loadPatterns).toHaveLength(1);
    expect(metadata.loadCases).toHaveLength(2);
    expect(metadata.loadCombinations).toHaveLength(0);
    expect(metadata.auditRecords).toHaveLength(41);
  });

  it('shows bridge error envelopes with bridge_code and correlation_id', async () => {
    const fetcher = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          error: {
            http_status: 409,
            bridge_code: 'NO_MODEL_OPEN',
            message: 'No SAP2000 model is open.',
            sap_context: 'ModelReader',
            retryable: false,
            correlation_id: 'corr-error-1',
          },
        }),
        { status: 409, headers: { 'Content-Type': 'application/json' } },
      );
    });
    const client = new Sap2000BridgeClient(undefined, fetcher);

    await expect(client.units()).rejects.toMatchObject({
      details: {
        bridge_code: 'NO_MODEL_OPEN',
        correlation_id: 'corr-error-1',
      },
    });
  });

  it('parses bridge error envelopes without losing retry and SAP context fields', () => {
    expect(
      parseSap2000BridgeError({
        error: {
          bridge_code: 'SAP_ERROR',
          message: 'SAP returned a non-zero code.',
          correlation_id: 'corr-parse-1',
          retryable: true,
          sap_context: 'SapModel.File.OpenFile',
        },
      }),
    ).toMatchObject({
      bridge_code: 'SAP_ERROR',
      correlation_id: 'corr-parse-1',
      retryable: true,
      sap_context: 'SapModel.File.OpenFile',
    });
  });

  it('does not include browser-side direct SAP2000 automation hooks', () => {
    const source = [
      'sap2000-bridge-client.ts',
      'sap2000-integration-panel.tsx',
      'sap2000-smoke-mock.ts',
    ]
      .map((file) => readFileSync(new URL(file, import.meta.url), 'utf8'))
      .join('\n');

    expect(source).not.toContain('ActiveXObject');
    expect(source).not.toContain('SAP2000v1.Helper');
    expect(source).not.toContain('CSiAPIv1.Helper');
    expect(source).not.toContain('SapObject');
  });
});
