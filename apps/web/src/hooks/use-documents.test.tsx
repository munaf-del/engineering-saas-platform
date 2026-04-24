/* @vitest-environment jsdom */

import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  useDeleteProjectDocument,
  useDownloadProjectDocument,
  useProjectDocuments,
  useUploadProjectDocument,
} from './use-documents';
import { api, apiBlob } from '@/lib/api-client';

vi.mock('@/lib/api-client', () => ({
  api: vi.fn(),
  apiBlob: vi.fn(),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('project document API hooks', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('lists project-scoped documents through the existing documents endpoint', async () => {
    vi.mocked(api).mockResolvedValue({ data: [], meta: { page: 1, limit: 100, total: 0 } });

    await renderHookAction(() => {
      useProjectDocuments('project-1');
      return async () => undefined;
    });

    expect(api).toHaveBeenCalledWith('/documents', {
      params: {
        limit: 100,
        mimeType: undefined,
        projectId: 'project-1',
      },
    });
  });

  it('uploads generic non-PDF project documents through the existing upload endpoint', async () => {
    vi.mocked(api).mockResolvedValue(buildDocument({ mimeType: 'text/plain' }));

    await renderHookAction(() => {
      const mutation = useUploadProjectDocument('project-1');
      return () =>
        mutation.mutateAsync({
          file: new File(['hello'], 'notes.txt', { type: 'text/plain' }),
          name: 'Site notes',
        });
    });

    expect(api).toHaveBeenCalledWith(
      '/documents',
      expect.objectContaining({
        body: expect.any(FormData),
        method: 'POST',
      }),
    );
    const body = vi.mocked(api).mock.calls[0]?.[1]?.body as FormData;
    expect(body.get('projectId')).toBe('project-1');
    expect(body.get('name')).toBe('Site notes');
    expect((body.get('file') as File).type).toBe('text/plain');
  });

  it('downloads and deletes through existing document endpoints', async () => {
    vi.mocked(api).mockResolvedValue(buildDocument());
    vi.mocked(apiBlob).mockResolvedValue(new Blob(['pdf'], { type: 'application/pdf' }));

    await renderHookAction(() => {
      const download = useDownloadProjectDocument();
      return () => download.mutateAsync('document-1');
    });
    await renderHookAction(() => {
      const remove = useDeleteProjectDocument('project-1');
      return () => remove.mutateAsync('document-1');
    });

    expect(apiBlob).toHaveBeenCalledWith('/documents/document-1/download');
    expect(api).toHaveBeenCalledWith('/documents/document-1', { method: 'DELETE' });
  });
});

async function renderHookAction(useAction: () => () => Promise<unknown>) {
  const element = document.createElement('div');
  const root = createRoot(element);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  let action: (() => Promise<unknown>) | null = null;

  function Harness() {
    action = useAction();
    return null;
  }

  await act(async () => {
    root.render(
      <QueryClientProvider client={queryClient}>
        <Harness />
      </QueryClientProvider>,
    );
  });
  await act(async () => {
    await action?.();
  });
  await act(async () => {
    root.unmount();
  });
}

function buildDocument(overrides: Partial<ReturnType<typeof buildBaseDocument>> = {}) {
  return {
    ...buildBaseDocument(),
    ...overrides,
  };
}

function buildBaseDocument() {
  return {
    id: 'document-1',
    organisationId: 'org-1',
    projectId: 'project-1',
    name: 'Evidence',
    fileName: 'evidence.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 1024,
    storagePath: '/secret/storage/path/evidence.pdf',
    uploadedBy: 'user-1',
    createdAt: '2026-04-24T00:00:00.000Z',
  };
}
