/* @vitest-environment jsdom */

import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import * as pdfjsLib from 'pdfjs-dist';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiArrayBuffer } from '@/lib/api-client';
import { usePdfDocumentInfo, usePdfPageRender } from './use-pdf-underlay-render';

vi.mock('@/lib/api-client', () => ({
  apiArrayBuffer: vi.fn(),
}));

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: {
    workerSrc: '',
  },
  getDocument: vi.fn(),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('PDF underlay render hooks', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:pdf-render'),
      revokeObjectURL: vi.fn(),
    });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      {} as CanvasRenderingContext2D,
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function toBlob(callback) {
      callback(new Blob(['png'], { type: 'image/png' }));
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('retries PDF document inspection after a transient load failure', async () => {
    vi.mocked(apiArrayBuffer)
      .mockRejectedValueOnce(new Error('temporary document failure'))
      .mockResolvedValueOnce(new ArrayBuffer(8));
    vi.mocked(pdfjsLib.getDocument).mockReturnValueOnce({
      promise: Promise.resolve({ numPages: 3 }),
    } as ReturnType<typeof pdfjsLib.getDocument>);

    const first = await renderDocumentInfoHook('document-retry-info');
    await waitFor(() => first.current.error != null);
    await first.unmount();

    const second = await renderDocumentInfoHook('document-retry-info');
    await waitFor(() => second.current.data != null);
    await second.unmount();

    expect(apiArrayBuffer).toHaveBeenCalledTimes(2);
    expect(second.current.data).toEqual({ pageCount: 3 });
  });

  it('retries PDF page rendering after a transient page render failure', async () => {
    const getPage = vi
      .fn()
      .mockRejectedValueOnce(new Error('temporary page failure'))
      .mockResolvedValueOnce({
        getViewport: vi.fn(() => ({ width: 400, height: 200 })),
        render: vi.fn(() => ({ promise: Promise.resolve() })),
      });

    vi.mocked(apiArrayBuffer).mockResolvedValue(new ArrayBuffer(8));
    vi.mocked(pdfjsLib.getDocument).mockReturnValue({
      promise: Promise.resolve({ numPages: 1, getPage }),
    } as unknown as ReturnType<typeof pdfjsLib.getDocument>);

    const first = await renderPageRenderHook('document-retry-render', 1);
    await waitFor(() => first.current.error != null);
    await first.unmount();

    const second = await renderPageRenderHook('document-retry-render', 1);
    await waitFor(() => second.current.data != null);
    await second.unmount();

    expect(getPage).toHaveBeenCalledTimes(2);
    expect(second.current.data).toMatchObject({
      height: 100,
      imageUrl: 'blob:pdf-render',
      pageCount: 1,
      width: 200,
    });
  });
});

async function renderDocumentInfoHook(fileId: string) {
  return renderHook(() => usePdfDocumentInfo(fileId));
}

async function renderPageRenderHook(fileId: string, pageNumber: number) {
  return renderHook(() => usePdfPageRender(fileId, pageNumber));
}

async function renderHook<T>(useValue: () => T) {
  const element = document.createElement('div');
  const root = createRoot(element);
  const result: { current: T } = { current: null as T };

  function Harness() {
    result.current = useValue();
    return null;
  }

  await act(async () => {
    root.render(<Harness />);
  });

  return {
    get current() {
      return result.current;
    },
    async unmount() {
      await act(async () => {
        root.unmount();
      });
    },
  };
}

async function waitFor(assertion: () => boolean) {
  const deadline = Date.now() + 1000;

  while (!assertion()) {
    if (Date.now() > deadline) {
      throw new Error('Timed out waiting for hook state');
    }

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
  }
}
