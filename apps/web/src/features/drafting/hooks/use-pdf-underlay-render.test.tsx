/* @vitest-environment jsdom */

import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import * as pdfjsLib from 'pdfjs-dist';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiArrayBuffer } from '@/lib/api-client';
import {
  classifyPdfUnderlayRenderError,
  usePdfDocumentInfo,
  usePdfPageRender,
} from './use-pdf-underlay-render';

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

  it('exposes page-render loading state without stale error feedback', async () => {
    vi.mocked(apiArrayBuffer).mockResolvedValue(new ArrayBuffer(8));
    vi.mocked(pdfjsLib.getDocument).mockReturnValue({
      promise: new Promise(() => undefined),
    } as unknown as ReturnType<typeof pdfjsLib.getDocument>);

    const loading = await renderPageRenderHook('loading-document', 1);
    await waitFor(() => loading.current.isLoading);
    await loading.unmount();

    expect(loading.current.data).toBeNull();
    expect(loading.current.error).toBeNull();
    expect(loading.current.errorKind).toBeNull();
  });

  it('renders page bitmaps at the fixed PDF viewport scale used by the cache key', async () => {
    const page = createPdfPage({
      height: 400,
      renderPromise: Promise.resolve(),
      width: 800,
    });
    const getPage = vi.fn(() => Promise.resolve(page));

    vi.mocked(apiArrayBuffer).mockResolvedValue(new ArrayBuffer(8));
    vi.mocked(pdfjsLib.getDocument).mockReturnValue({
      promise: Promise.resolve({ numPages: 1, getPage }),
    } as unknown as ReturnType<typeof pdfjsLib.getDocument>);

    const hook = await renderPageRenderHook('fixed-render-scale-document', 1);
    await waitFor(() => hook.current.data != null);
    await hook.unmount();

    expect(page.getViewport).toHaveBeenCalledWith({ scale: 2 });
    expect(hook.current.data).toMatchObject({
      height: 200,
      imageUrl: 'blob:pdf-render',
      pageCount: 1,
      width: 400,
    });
  });

  it('shares cached render output for concurrent hooks with the same file and page', async () => {
    vi.mocked(URL.createObjectURL).mockReturnValueOnce('blob:shared-cache-key');
    const getPage = vi.fn(() =>
      Promise.resolve(createPdfPage({ height: 200, renderPromise: Promise.resolve(), width: 400 })),
    );

    vi.mocked(apiArrayBuffer).mockResolvedValue(new ArrayBuffer(8));
    vi.mocked(pdfjsLib.getDocument).mockReturnValue({
      promise: Promise.resolve({ numPages: 1, getPage }),
    } as unknown as ReturnType<typeof pdfjsLib.getDocument>);

    const first = await renderPageRenderHook('shared-cache-key-document', 1);
    const second = await renderPageRenderHook('shared-cache-key-document', 1);
    await waitFor(() => first.current.data != null && second.current.data != null);

    expect(getPage).toHaveBeenCalledTimes(1);
    expect(first.current.data?.imageUrl).toBe('blob:shared-cache-key');
    expect(second.current.data?.imageUrl).toBe('blob:shared-cache-key');

    await first.unmount();
    expect(URL.revokeObjectURL).not.toHaveBeenCalledWith('blob:shared-cache-key');

    await second.unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:shared-cache-key');
  });

  it('clears stale rendered page data when switching file IDs', async () => {
    const fileBRender = createDeferred<void>();

    vi.mocked(apiArrayBuffer).mockResolvedValue(new ArrayBuffer(8));
    vi.mocked(pdfjsLib.getDocument)
      .mockImplementationOnce(
        () =>
          ({
            promise: Promise.resolve({
              numPages: 1,
              getPage: vi.fn(() =>
                Promise.resolve(
                  createPdfPage({ height: 200, renderPromise: Promise.resolve(), width: 400 }),
                ),
              ),
            }),
          }) as unknown as ReturnType<typeof pdfjsLib.getDocument>,
      )
      .mockImplementationOnce(
        () =>
          ({
            promise: Promise.resolve({
              numPages: 1,
              getPage: vi.fn(() =>
                Promise.resolve(
                  createPdfPage({ height: 300, renderPromise: fileBRender.promise, width: 600 }),
                ),
              ),
            }),
          }) as unknown as ReturnType<typeof pdfjsLib.getDocument>,
      );

    const hook = await renderMutablePageRenderHook('lifecycle-file-a', 1);
    await waitFor(() => hook.current.data != null);

    expect(hook.current.data).toMatchObject({ height: 100, width: 200 });

    await hook.setArgs('lifecycle-file-b', 1);

    expect(hook.current.data).toBeNull();
    expect(hook.current.error).toBeNull();
    expect(hook.current.errorKind).toBeNull();
    expect(hook.current.isLoading).toBe(true);

    await act(async () => {
      fileBRender.resolve();
      await fileBRender.promise;
    });
    await waitFor(() => hook.current.data?.width === 300);
    await hook.unmount();
  });

  it('ignores stale page render successes after switching page numbers and releases object URLs', async () => {
    let imageUrlIndex = 0;
    vi.mocked(URL.createObjectURL).mockImplementation(() => `blob:render-${++imageUrlIndex}`);

    const pageOneRender = createDeferred<void>();
    const pageTwoRender = createDeferred<void>();
    const getPage = vi.fn((pageNumber: number) =>
      Promise.resolve(
        createPdfPage({
          height: pageNumber === 1 ? 200 : 400,
          renderPromise: pageNumber === 1 ? pageOneRender.promise : pageTwoRender.promise,
          width: pageNumber === 1 ? 400 : 800,
        }),
      ),
    );

    vi.mocked(apiArrayBuffer).mockResolvedValue(new ArrayBuffer(8));
    vi.mocked(pdfjsLib.getDocument).mockReturnValue({
      promise: Promise.resolve({ numPages: 2, getPage }),
    } as unknown as ReturnType<typeof pdfjsLib.getDocument>);

    const hook = await renderMutablePageRenderHook('lifecycle-page-switch', 1);
    await waitFor(() => getPage.mock.calls.some(([pageNumber]) => pageNumber === 1));

    await hook.setArgs('lifecycle-page-switch', 2);
    await waitFor(() => getPage.mock.calls.some(([pageNumber]) => pageNumber === 2));

    await act(async () => {
      pageTwoRender.resolve();
      await pageTwoRender.promise;
    });
    await waitFor(() => hook.current.data?.imageUrl === 'blob:render-1');

    await act(async () => {
      pageOneRender.resolve();
      await pageOneRender.promise;
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(hook.current.data).toMatchObject({
      height: 200,
      imageUrl: 'blob:render-1',
      width: 400,
    });
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:render-2');

    await hook.unmount();

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:render-1');
  });

  it('ignores stale page render failures after switching page numbers', async () => {
    const pageOneRender = createDeferred<void>();
    const pageTwoRender = createDeferred<void>();
    const getPage = vi.fn((pageNumber: number) =>
      Promise.resolve(
        createPdfPage({
          height: pageNumber === 1 ? 200 : 400,
          renderPromise: pageNumber === 1 ? pageOneRender.promise : pageTwoRender.promise,
          width: pageNumber === 1 ? 400 : 800,
        }),
      ),
    );

    vi.mocked(apiArrayBuffer).mockResolvedValue(new ArrayBuffer(8));
    vi.mocked(pdfjsLib.getDocument).mockReturnValue({
      promise: Promise.resolve({ numPages: 2, getPage }),
    } as unknown as ReturnType<typeof pdfjsLib.getDocument>);

    const hook = await renderMutablePageRenderHook('lifecycle-page-error-switch', 1);
    await waitFor(() => getPage.mock.calls.some(([pageNumber]) => pageNumber === 1));

    await hook.setArgs('lifecycle-page-error-switch', 2);
    await waitFor(() => getPage.mock.calls.some(([pageNumber]) => pageNumber === 2));

    await act(async () => {
      pageTwoRender.resolve();
      await pageTwoRender.promise;
    });
    await waitFor(() => hook.current.data?.width === 400);

    await act(async () => {
      pageOneRender.reject(new Error('PDF render task failed'));
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(hook.current.error).toBeNull();
    expect(hook.current.errorKind).toBeNull();
    expect(hook.current.data).toMatchObject({
      height: 200,
      width: 400,
    });

    await hook.unmount();
  });

  it('revokes a rendered page object URL when the hook unmounts', async () => {
    vi.mocked(URL.createObjectURL).mockReturnValueOnce('blob:owned-render');
    vi.mocked(apiArrayBuffer).mockResolvedValue(new ArrayBuffer(8));
    vi.mocked(pdfjsLib.getDocument).mockReturnValue({
      promise: Promise.resolve({
        numPages: 1,
        getPage: vi.fn(() =>
          Promise.resolve(
            createPdfPage({ height: 200, renderPromise: Promise.resolve(), width: 400 }),
          ),
        ),
      }),
    } as unknown as ReturnType<typeof pdfjsLib.getDocument>);

    const hook = await renderPageRenderHook('lifecycle-unmount', 1);
    await waitFor(() => hook.current.data?.imageUrl === 'blob:owned-render');
    await hook.unmount();

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:owned-render');
  });

  it('classifies missing and inaccessible document download failures', async () => {
    vi.mocked(apiArrayBuffer).mockRejectedValueOnce(createApiError(404, 'Not Found'));

    const missing = await renderDocumentInfoHook('missing-document');
    await waitFor(() => missing.current.error != null);
    await missing.unmount();

    vi.mocked(apiArrayBuffer).mockRejectedValueOnce(createApiError(403, 'Forbidden'));

    const inaccessible = await renderDocumentInfoHook('inaccessible-document');
    await waitFor(() => inaccessible.current.error != null);
    await inaccessible.unmount();

    expect(missing.current.errorKind).toBe('missing_document');
    expect(missing.current.error).toBeInstanceOf(Error);
    expect(inaccessible.current.errorKind).toBe('inaccessible_document');
    expect(inaccessible.current.error).toBeInstanceOf(Error);
  });

  it('classifies non-PDF and invalid PDF document load failures', async () => {
    vi.mocked(apiArrayBuffer).mockResolvedValue(new ArrayBuffer(8));
    vi.mocked(pdfjsLib.getDocument)
      .mockImplementationOnce(
        () =>
          ({
            promise: Promise.reject(new Error('The selected document is not a PDF')),
          }) as ReturnType<typeof pdfjsLib.getDocument>,
      )
      .mockImplementationOnce(
        () =>
          ({
            promise: Promise.reject(new Error('Invalid PDF structure')),
          }) as ReturnType<typeof pdfjsLib.getDocument>,
      );

    const nonPdf = await renderDocumentInfoHook('non-pdf-document');
    await waitFor(() => nonPdf.current.error != null);
    await nonPdf.unmount();

    const invalidPdf = await renderDocumentInfoHook('invalid-pdf-document');
    await waitFor(() => invalidPdf.current.error != null);
    await invalidPdf.unmount();

    expect(nonPdf.current.errorKind).toBe('not_pdf');
    expect(invalidPdf.current.errorKind).toBe('invalid_pdf');
  });

  it('classifies page-unavailable and render failures while preserving valid renders', async () => {
    const getPage = vi
      .fn()
      .mockRejectedValueOnce(new Error('Invalid page request'))
      .mockResolvedValueOnce({
        getViewport: vi.fn(() => ({ width: 400, height: 200 })),
        render: vi.fn(() => ({
          promise: Promise.reject(new Error('PDF render task failed')),
        })),
      })
      .mockResolvedValueOnce({
        getViewport: vi.fn(() => ({ width: 400, height: 200 })),
        render: vi.fn(() => ({ promise: Promise.resolve() })),
      });

    vi.mocked(apiArrayBuffer).mockResolvedValue(new ArrayBuffer(8));
    vi.mocked(pdfjsLib.getDocument).mockReturnValue({
      promise: Promise.resolve({ numPages: 3, getPage }),
    } as unknown as ReturnType<typeof pdfjsLib.getDocument>);

    const pageUnavailable = await renderPageRenderHook('page-unavailable-document', 9);
    await waitFor(() => pageUnavailable.current.error != null);
    await pageUnavailable.unmount();

    const renderFailed = await renderPageRenderHook('render-failed-document', 1);
    await waitFor(() => renderFailed.current.error != null);
    await renderFailed.unmount();

    const valid = await renderPageRenderHook('valid-render-document', 1);
    await waitFor(() => valid.current.data != null);
    await valid.unmount();

    expect(pageUnavailable.current.errorKind).toBe('page_unavailable');
    expect(renderFailed.current.errorKind).toBe('render_failed');
    expect(valid.current.errorKind).toBeNull();
    expect(valid.current.data).toMatchObject({
      height: 100,
      imageUrl: 'blob:pdf-render',
      pageCount: 3,
      width: 200,
    });
  });

  it('keeps unknown render failures classified conservatively with the original error', async () => {
    const unknownError = new Error('Socket melted');

    vi.mocked(apiArrayBuffer).mockRejectedValueOnce(unknownError);

    const info = await renderDocumentInfoHook('unknown-document-error');
    await waitFor(() => info.current.error != null);
    await info.unmount();

    expect(info.current.errorKind).toBe('unknown');
    expect(info.current.error).toBe(unknownError);
    expect(classifyPdfUnderlayRenderError(unknownError, 'page_render')).toBe('unknown');
  });
});

function createApiError(status: number, statusText: string) {
  return Object.assign(new Error(`API ${status}: ${statusText}`), {
    status,
    statusText,
  });
}

async function renderDocumentInfoHook(fileId: string) {
  return renderHook(() => usePdfDocumentInfo(fileId));
}

async function renderPageRenderHook(fileId: string, pageNumber: number) {
  return renderHook(() => usePdfPageRender(fileId, pageNumber));
}

async function renderMutablePageRenderHook(fileId: string, pageNumber: number) {
  const element = document.createElement('div');
  const root = createRoot(element);
  const result: { current: ReturnType<typeof usePdfPageRender> } = {
    current: null as unknown as ReturnType<typeof usePdfPageRender>,
  };
  let setArgs: React.Dispatch<React.SetStateAction<{ fileId: string; pageNumber: number }>>;

  function Harness() {
    const [args, setCurrentArgs] = React.useState({ fileId, pageNumber });
    setArgs = setCurrentArgs;
    result.current = usePdfPageRender(args.fileId, args.pageNumber);
    return null;
  }

  await act(async () => {
    root.render(<Harness />);
  });

  return {
    get current() {
      return result.current;
    },
    async setArgs(nextFileId: string, nextPageNumber: number) {
      await act(async () => {
        setArgs({ fileId: nextFileId, pageNumber: nextPageNumber });
      });
    },
    async unmount() {
      await act(async () => {
        root.unmount();
      });
    },
  };
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

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return {
    promise,
    resolve,
    reject,
  };
}

function createPdfPage({
  height,
  renderPromise,
  width,
}: {
  height: number;
  renderPromise: Promise<void>;
  width: number;
}) {
  return {
    getViewport: vi.fn(() => ({ height, width })),
    render: vi.fn(() => ({ promise: renderPromise })),
  };
}
