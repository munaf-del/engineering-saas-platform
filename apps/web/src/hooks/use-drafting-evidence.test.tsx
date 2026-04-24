/* @vitest-environment jsdom */

import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  useAttachDraftingTransmittalEvidence,
  useRemoveDraftingTransmittalEvidence,
  useUploadDraftingTransmittalEvidence,
} from './use-drafting';
import { api } from '@/lib/api-client';

vi.mock('@/lib/api-client', () => ({
  api: vi.fn(),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('drafting transmittal evidence API hooks', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('uploads evidence through the Drafting-scoped backend endpoint', async () => {
    vi.mocked(api).mockResolvedValue(buildDrawing());

    await renderHookAction(() => {
      const mutation = useUploadDraftingTransmittalEvidence('project-1', 'drawing-1');
      return () =>
        mutation.mutateAsync({
          file: new File(['%PDF-1.7'], 'evidence.pdf', { type: 'application/pdf' }),
          notes: 'Browser print PDF',
          transmittalId: 'transmittal-1',
        });
    });

    expect(api).toHaveBeenCalledWith(
      '/projects/project-1/drafting/drawings/drawing-1/transmittals/transmittal-1/evidence/upload',
      expect.objectContaining({
        body: expect.any(FormData),
        method: 'POST',
      }),
    );
  });

  it('attaches and removes evidence through Drafting-scoped backend endpoints', async () => {
    vi.mocked(api).mockResolvedValue(buildDrawing());

    await renderHookAction(() => {
      const attach = useAttachDraftingTransmittalEvidence('project-1', 'drawing-1');
      return () =>
        attach.mutateAsync({
          documentId: 'document-1',
          notes: 'Accepted evidence',
          transmittalId: 'transmittal-1',
        });
    });
    await renderHookAction(() => {
      const remove = useRemoveDraftingTransmittalEvidence('project-1', 'drawing-1');
      return () => remove.mutateAsync({ transmittalId: 'transmittal-1' });
    });

    expect(api).toHaveBeenNthCalledWith(
      1,
      '/projects/project-1/drafting/drawings/drawing-1/transmittals/transmittal-1/evidence/attach',
      expect.objectContaining({
        body: expect.objectContaining({ documentId: 'document-1' }),
        method: 'POST',
      }),
    );
    expect(api).toHaveBeenNthCalledWith(
      2,
      '/projects/project-1/drafting/drawings/drawing-1/transmittals/transmittal-1/evidence',
      expect.objectContaining({
        method: 'DELETE',
      }),
    );
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

function buildDrawing() {
  return {
    id: 'drawing-1',
    projectId: 'project-1',
    title: 'Drawing',
    status: 'draft',
    currentRevision: 0,
    modelVersion: 1,
    objectCount: 0,
    createdById: null,
    updatedById: null,
    createdAt: '2026-04-24T00:00:00.000Z',
    updatedAt: '2026-04-24T00:00:00.000Z',
    revisions: [],
    model: {
      version: 1,
      units: 'mm',
      drawingId: 'drawing-1',
      view: { scale: 1, offsetX: 0, offsetY: 0 },
      layers: [],
      underlays: [],
      objects: [],
      titleBlock: {},
      revisionBlock: { revisions: [] },
      scheduleSheets: [],
      schedulePackIssues: [],
      drawingSheets: [],
      drawingSheetIssues: [],
      drawingTransmittals: [],
    },
  };
}
