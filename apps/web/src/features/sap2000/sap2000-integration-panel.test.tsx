/* @vitest-environment jsdom */

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Sap2000IntegrationPanel } from './sap2000-integration-panel';
import { SAP2000_READ_ONLY_WARNING } from './sap2000-bridge-client';
import { createSap2000SmokeMockFetch } from './sap2000-smoke-mock';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('Sap2000IntegrationPanel', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    vi.restoreAllMocks();
  });

  it('renders the read-only warning and omits prohibited controls', async () => {
    vi.stubGlobal('fetch', createSap2000SmokeMockFetch());
    await renderPanel();

    expect(container.textContent).toContain(SAP2000_READ_ONLY_WARNING);
    expect(buttonNamed(/analy[sz]e/i)).toBeNull();
    expect(buttonNamed(/result extraction/i)).toBeNull();
    expect(buttonNamed(/patch/i)).toBeNull();
    expect(buttonNamed(/apply/i)).toBeNull();
    expect(buttonNamed(/write-back/i)).toBeNull();
  });

  it('shows bridge offline state and error details when the bridge cannot be reached', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('fetch failed');
      }),
    );
    await renderPanel();

    await clickButton('Check Bridge');

    expect(container.textContent).toContain('Bridge offline');
    expect(container.textContent).toContain('BRIDGE_REQUEST_FAILED');
    expect(container.textContent).toContain('correlation_id');
    expect(container.textContent).toContain('unavailable');
  });

  it('shows online comtypes status, opens the smoke model, and displays units', async () => {
    vi.stubGlobal('fetch', createSap2000SmokeMockFetch());
    await renderPanel();

    await clickButton('Check Bridge');
    await clickButton('Open Approved Smoke Model');

    expect(container.textContent).toContain('Bridge online');
    expect(container.textContent).toContain('comtypes');
    expect(container.textContent).toContain('true');
    expect(container.textContent).toContain('SAP2000 27.1.0');
    expect(container.textContent).toContain('smoke_frame_2point.sdb');
    expect(container.textContent).toContain('kN_m_C');
    expect(container.textContent).toContain('kN-m');
    expect(container.textContent).toContain('C');
  });

  it('connects successfully and refreshes smoke metadata counts', async () => {
    vi.stubGlobal('fetch', createSap2000SmokeMockFetch());
    await renderPanel();

    await clickButton('Connect to Running SAP2000');
    await clickButton('Refresh Metadata');

    expect(countText('Joints')).toContain('2');
    expect(countText('Frames')).toContain('1');
    expect(countText('Materials')).toContain('3');
    expect(countText('Sections')).toContain('1');
    expect(countText('Load patterns')).toContain('1');
    expect(countText('Load cases')).toContain('2');
    expect(countText('Load combinations')).toContain('0');
    expect(countText('Audit records')).toContain('41');
    expect(container.textContent).toContain('A992Fy50');
    expect(container.textContent).toContain('FSEC1');
    expect(container.textContent).toContain('DEAD');
    expect(container.textContent).toContain('MODAL');
  });

  it('renders bridge error envelope fields returned by the bridge', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        return new Response(
          JSON.stringify({
            error: {
              http_status: 409,
              bridge_code: 'NO_MODEL_OPEN',
              message: 'No model is open.',
              retryable: false,
              correlation_id: 'corr-ui-error-1',
              sap_context: 'ModelReader',
            },
          }),
          { status: 409, headers: { 'Content-Type': 'application/json' } },
        );
      }),
    );
    await renderPanel();

    await clickButton('Refresh Metadata');

    expect(container.textContent).toContain('NO_MODEL_OPEN');
    expect(container.textContent).toContain('corr-ui-error-1');
    expect(container.textContent).toContain('ModelReader');
  });

  async function renderPanel() {
    await act(async () => {
      root.render(<Sap2000IntegrationPanel />);
    });
  }

  async function clickButton(name: string) {
    const button = buttonNamed(new RegExp(`^${escapeRegExp(name)}$`));
    expect(button).toBeTruthy();

    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
  }

  function buttonNamed(pattern: RegExp) {
    return (
      Array.from(container.querySelectorAll('button')).find((button) =>
        pattern.test(button.textContent ?? ''),
      ) ?? null
    );
  }

  function countText(label: string) {
    const card = Array.from(container.querySelectorAll('.text-sm')).find(
      (element) => element.textContent === label,
    )?.parentElement;

    return card?.textContent ?? '';
  }
});

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
