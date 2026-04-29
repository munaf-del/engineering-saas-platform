import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Document, DraftingUnderlay } from '@eng/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DraftingUnderlaysPanel } from './drafting-underlays-panel';

const documentsQueryState = vi.hoisted(() => ({
  current: {
    data: [] as Document[],
    isFetching: false,
  },
}));

const pdfDocumentInfoState = vi.hoisted(() => ({
  current: {
    data: null as { pageCount: number } | null,
    error: null as Error | null,
    isLoading: false,
  },
}));

const pdfPageRenderState = vi.hoisted(() => ({
  current: {
    data: null as { height: number; imageUrl: string; pageCount: number; width: number } | null,
    error: null as Error | null,
    isLoading: false,
  },
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('@/hooks/use-documents', () => ({
  useProjectDocuments: () => ({
    data: documentsQueryState.current.data,
    isFetching: documentsQueryState.current.isFetching,
    refetch: vi.fn(),
  }),
  useUploadProjectDocument: () => ({
    isPending: false,
    mutateAsync: vi.fn(),
  }),
}));

vi.mock('../hooks/use-pdf-underlay-render', () => ({
  usePdfDocumentInfo: () => pdfDocumentInfoState.current,
  usePdfPageRender: () => pdfPageRenderState.current,
}));

describe('DraftingUnderlaysPanel', () => {
  beforeEach(() => {
    documentsQueryState.current = {
      data: [],
      isFetching: false,
    };
    pdfDocumentInfoState.current = {
      data: null,
      error: null,
      isLoading: false,
    };
    pdfPageRenderState.current = {
      data: null,
      error: null,
      isLoading: false,
    };
  });

  it('shows an unavailable state for visible underlays that are skipped by render guards', () => {
    const malformedUnderlay = {
      ...createUnderlay(),
      transform: {
        ...createUnderlay().transform,
        scale: 0,
      },
    };

    const markup = renderToStaticMarkup(
      <DraftingUnderlaysPanel {...createPanelProps([malformedUnderlay], malformedUnderlay)} />,
    );

    expect(markup).toContain('1 visible PDF underlay is unavailable and skipped on');
    expect(markup).toContain('Unavailable');
    expect(markup).toContain('This PDF underlay is unavailable and is skipped on the canvas.');
    expect(markup).toContain(
      'Calibration and crop stay disabled until the underlay can render safely again.',
    );
    expect(markup).not.toContain('Uniform Scale');
  });

  it('shows a safe empty render state when loaded underlays are hidden', () => {
    const hiddenUnderlay = {
      ...createUnderlay(),
      visible: false,
    };

    const markup = renderToStaticMarkup(
      <DraftingUnderlaysPanel {...createPanelProps([hiddenUnderlay], hiddenUnderlay)} />,
    );

    expect(markup).toContain('All loaded PDF underlays are hidden, so none render on the canvas.');
    expect(markup).toContain('Hidden');
  });

  it('shows action-specific feedback when the selected underlay is locked', () => {
    const lockedUnderlay = {
      ...createUnderlay(),
      locked: true,
    };

    const markup = renderToStaticMarkup(
      <DraftingUnderlaysPanel {...createPanelProps([lockedUnderlay], lockedUnderlay)} />,
    );

    expect(markup).toContain(
      'This underlay is locked. Unlock it to move, rotate, scale, crop, or calibrate it.',
    );
    expect(markup).toContain('Unlock the underlay before calibration.');
    expect(markup).toContain('Unlock the underlay before crop.');
  });

  it('shows action-specific feedback when the selected underlay is hidden', () => {
    const hiddenUnderlay = {
      ...createUnderlay(),
      visible: false,
    };

    const markup = renderToStaticMarkup(
      <DraftingUnderlaysPanel {...createPanelProps([hiddenUnderlay], hiddenUnderlay)} />,
    );

    expect(markup).toContain('Show the underlay before calibration.');
    expect(markup).toContain('Show the underlay before crop.');
  });

  it('shows action-specific feedback when the selected underlay page cannot render', () => {
    const selectedUnderlay = createUnderlay();
    pdfPageRenderState.current = {
      data: null,
      error: new Error('Failed to render PDF page'),
      isLoading: false,
    };

    const markup = renderToStaticMarkup(
      <DraftingUnderlaysPanel {...createPanelProps([selectedUnderlay], selectedUnderlay)} />,
    );

    expect(markup).toContain(
      'The selected PDF page cannot currently render. Calibration is disabled until the page renders again.',
    );
    expect(markup).toContain(
      'The selected PDF page cannot currently render. Crop is disabled until the page renders again.',
    );
  });

  it('shows page render feedback when an inspected PDF page cannot be rendered', () => {
    documentsQueryState.current.data = [createDocument()];
    pdfDocumentInfoState.current = {
      data: { pageCount: 2 },
      error: null,
      isLoading: false,
    };
    pdfPageRenderState.current = {
      data: null,
      error: new Error('Failed to render PDF page'),
      isLoading: false,
    };

    const markup = renderToStaticMarkup(<DraftingUnderlaysPanel {...createPanelProps([], null)} />);

    expect(markup).toContain('2 pages available.');
    expect(markup).toContain('Page 1 could not be rendered. Check the page number or PDF file.');
  });

  it('keeps valid inspected PDF page feedback unchanged', () => {
    documentsQueryState.current.data = [createDocument()];
    pdfDocumentInfoState.current = {
      data: { pageCount: 1 },
      error: null,
      isLoading: false,
    };
    pdfPageRenderState.current = {
      data: {
        height: 200,
        imageUrl: 'blob:underlay-page',
        pageCount: 1,
        width: 400,
      },
      error: null,
      isLoading: false,
    };

    const markup = renderToStaticMarkup(<DraftingUnderlaysPanel {...createPanelProps([], null)} />);

    expect(markup).toContain('1 page available.');
    expect(markup).toContain('Page 1 renders at 400 × 200 PDF units.');
  });
});

function createPanelProps(
  underlays: DraftingUnderlay[],
  selectedUnderlay: DraftingUnderlay | null,
) {
  return {
    drawingId: 'drawing-1',
    projectId: 'project-1',
    underlays,
    selectedUnderlay,
    calibrationState: null,
    cropModeUnderlayId: null,
    onAddUnderlay: vi.fn(),
    onApplyCalibration: vi.fn(),
    onBeginCalibration: vi.fn(),
    onBeginCrop: vi.fn(),
    onCancelCalibration: vi.fn(),
    onCancelCrop: vi.fn(),
    onClearCrop: vi.fn(),
    onRemoveUnderlay: vi.fn(),
    onSelectUnderlay: vi.fn(),
    onUpdateUnderlay: vi.fn(),
  };
}

function createUnderlay(): DraftingUnderlay {
  return {
    id: 'underlay-1',
    name: 'Survey PDF',
    fileId: 'document-1',
    fileName: 'survey.pdf',
    pageNumber: 1,
    visible: true,
    opacity: 0.65,
    locked: false,
    transform: {
      x: 10,
      y: 20,
      scale: 1,
      rotationDeg: 0,
    },
    crop: null,
    calibration: null,
    createdAt: '2026-04-29T00:00:00.000Z',
    updatedAt: '2026-04-29T00:00:00.000Z',
  };
}

function createDocument(): Document {
  return {
    id: 'document-1',
    organisationId: 'org-1',
    projectId: 'project-1',
    name: 'Survey PDF',
    fileName: 'survey.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 1024,
    storagePath: 'documents/survey.pdf',
    uploadedBy: 'user-1',
    createdAt: '2026-04-29T00:00:00.000Z',
  };
}
