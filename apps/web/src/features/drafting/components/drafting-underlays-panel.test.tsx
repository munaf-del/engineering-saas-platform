/* @vitest-environment jsdom */

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Document, DraftingLayer, DraftingUnderlay } from '@eng/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
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
    errorKind: null as null | import('../hooks/use-pdf-underlay-render').PdfUnderlayRenderErrorKind,
    isLoading: false,
  },
}));

const pdfPageRenderState = vi.hoisted(() => ({
  current: {
    data: null as { height: number; imageUrl: string; pageCount: number; width: number } | null,
    error: null as Error | null,
    errorKind: null as null | import('../hooks/use-pdf-underlay-render').PdfUnderlayRenderErrorKind,
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
  getPdfUnderlayRenderErrorMessage: (
    kind: string | null | undefined,
    options: { fallback?: string; pageNumber?: number | null } = {},
  ) => {
    const pageLabel = options.pageNumber ? `Page ${options.pageNumber}` : 'The selected page';

    if (kind === 'missing_document') {
      return 'The referenced project PDF could not be found. It may have been removed or moved.';
    }

    if (kind === 'invalid_pdf') {
      return 'The PDF could not be read. It may be corrupt, encrypted, or unsupported.';
    }

    if (kind === 'page_unavailable') {
      return `${pageLabel} is not available in the selected PDF.`;
    }

    return options.fallback ?? 'The PDF underlay could not be rendered.';
  },
  usePdfDocumentInfo: () => pdfDocumentInfoState.current,
  usePdfPageRender: () => pdfPageRenderState.current,
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('DraftingUnderlaysPanel', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.innerHTML = '';
    document.body.appendChild(container);
    root = createRoot(container);
    documentsQueryState.current = {
      data: [createDocument()],
      isFetching: false,
    };
    pdfDocumentInfoState.current = {
      data: null,
      error: null,
      errorKind: null,
      isLoading: false,
    };
    pdfPageRenderState.current = {
      data: null,
      error: null,
      errorKind: null,
      isLoading: false,
    };
    vi.mocked(toast.error).mockReset();
    vi.mocked(toast.success).mockReset();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
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
      errorKind: null,
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

  it.each([
    {
      description: 'hidden',
      underlayLayer: {
        ...createUnderlayLayer(),
        visible: false,
      },
      calibrationMessage: 'Show the Underlay layer before calibration.',
      cropMessage: 'Show the Underlay layer before crop.',
    },
    {
      description: 'locked',
      underlayLayer: {
        ...createUnderlayLayer(),
        locked: true,
      },
      calibrationMessage: 'Unlock the Underlay layer before calibration.',
      cropMessage: 'Unlock the Underlay layer before crop.',
    },
  ])(
    'blocks calibration and crop entry when the shared Underlay layer is $description',
    async ({ underlayLayer, calibrationMessage, cropMessage }) => {
      const selectedUnderlay = createUnderlay();

      await act(async () => {
        root.render(
          <DraftingUnderlaysPanel
            {...createPanelProps([selectedUnderlay], selectedUnderlay)}
            underlayLayer={underlayLayer}
          />,
        );
      });

      expect(container.textContent).toContain(calibrationMessage);
      expect(container.textContent).toContain(cropMessage);
      expect(getButton('Start Calibration').disabled).toBe(true);
      expect(getButton('Start Crop').disabled).toBe(true);
    },
  );

  it('locks selected underlay property controls when the shared Underlay layer is locked', async () => {
    const selectedUnderlay = {
      ...createUnderlay(),
      crop: {
        x: 0,
        y: 0,
        width: 100,
        height: 80,
      },
    };

    await act(async () => {
      root.render(
        <DraftingUnderlaysPanel
          {...createPanelProps([selectedUnderlay], selectedUnderlay)}
          underlayLayer={{
            ...createUnderlayLayer(),
            locked: true,
          }}
        />,
      );
    });

    expect(container.textContent).toContain(
      'The Underlay layer is locked. Unlock the layer before editing selected underlay properties.',
    );
    expect(getButton('Hide Underlay').disabled).toBe(true);
    expect(getButton('Lock Underlay').disabled).toBe(true);
    expect(getButton('Remove Underlay').disabled).toBe(true);
    expect(getButton('Start Calibration').disabled).toBe(true);
    expect(getButton('Start Crop').disabled).toBe(true);
    expect(getButton('Clear Crop').disabled).toBe(true);
    expect(
      getInputs().some((input) => input.value === selectedUnderlay.name && input.disabled),
    ).toBe(true);
    expect(getInputs().some((input) => input.type === 'range' && input.disabled)).toBe(true);
    expect(getInputs().filter((input) => input.type === 'number' && input.disabled)).toHaveLength(
      5,
    );
  });

  it('guards selected underlay property controls when the shared Underlay layer is unavailable', async () => {
    const selectedUnderlay = createUnderlay();

    await act(async () => {
      root.render(
        <DraftingUnderlaysPanel
          {...createPanelProps([selectedUnderlay], selectedUnderlay)}
          underlayLayer={null}
        />,
      );
    });

    expect(container.textContent).toContain(
      'The Underlay layer is unavailable. Restore the layer before editing selected underlay properties.',
    );
    expect(getButton('Hide Underlay').disabled).toBe(true);
    expect(getButton('Lock Underlay').disabled).toBe(true);
    expect(getButton('Remove Underlay').disabled).toBe(true);
  });

  it('preserves direct underlay locked action behaviour while disabling property fields', async () => {
    const selectedUnderlay = {
      ...createUnderlay(),
      locked: true,
    };

    await act(async () => {
      root.render(
        <DraftingUnderlaysPanel {...createPanelProps([selectedUnderlay], selectedUnderlay)} />,
      );
    });

    expect(getButton('Hide Underlay').disabled).toBe(false);
    expect(getButton('Unlock Underlay').disabled).toBe(false);
    expect(getButton('Remove Underlay').disabled).toBe(false);
    expect(getButton('Start Calibration').disabled).toBe(true);
    expect(getButton('Start Crop').disabled).toBe(true);
    expect(
      getInputs().some((input) => input.value === selectedUnderlay.name && input.disabled),
    ).toBe(true);
  });

  it('keeps selected underlay property controls editable when the Underlay layer is visible and unlocked', async () => {
    const selectedUnderlay = createUnderlay();

    await act(async () => {
      root.render(
        <DraftingUnderlaysPanel {...createPanelProps([selectedUnderlay], selectedUnderlay)} />,
      );
    });

    expect(getButton('Hide Underlay').disabled).toBe(false);
    expect(getButton('Lock Underlay').disabled).toBe(false);
    expect(getButton('Remove Underlay').disabled).toBe(false);
    expect(getButton('Start Calibration').disabled).toBe(false);
    expect(getButton('Start Crop').disabled).toBe(false);
    expect(
      getInputs().some((input) => input.value === selectedUnderlay.name && !input.disabled),
    ).toBe(true);
    expect(getInputs().some((input) => input.type === 'range' && !input.disabled)).toBe(true);
  });

  it('shows page render feedback when an inspected PDF page cannot be rendered', () => {
    documentsQueryState.current.data = [createDocument()];
    pdfDocumentInfoState.current = {
      data: { pageCount: 2 },
      error: null,
      errorKind: null,
      isLoading: false,
    };
    pdfPageRenderState.current = {
      data: null,
      error: new Error('Failed to render PDF page'),
      errorKind: null,
      isLoading: false,
    };

    const markup = renderToStaticMarkup(<DraftingUnderlaysPanel {...createPanelProps([], null)} />);

    expect(markup).toContain('2 pages available.');
    expect(markup).toContain('Page 1 could not be rendered. Check the page number or PDF file.');
  });

  it('shows classified PDF inspection and page feedback when available', () => {
    documentsQueryState.current.data = [createDocument()];
    pdfDocumentInfoState.current = {
      data: null,
      error: new Error('API 404: Not Found'),
      errorKind: 'missing_document',
      isLoading: false,
    };
    pdfPageRenderState.current = {
      data: null,
      error: new Error('Invalid page request'),
      errorKind: 'page_unavailable',
      isLoading: false,
    };

    const markup = renderToStaticMarkup(<DraftingUnderlaysPanel {...createPanelProps([], null)} />);

    expect(markup).toContain(
      'The referenced project PDF could not be found. It may have been removed or moved.',
    );
    expect(markup).toContain('Page 1 is not available in the selected PDF.');
  });

  it('shows classified page-render feedback when selected underlay mode entry is blocked', () => {
    const selectedUnderlay = createUnderlay();
    pdfPageRenderState.current = {
      data: null,
      error: new Error('Invalid PDF structure'),
      errorKind: 'invalid_pdf',
      isLoading: false,
    };

    const markup = renderToStaticMarkup(
      <DraftingUnderlaysPanel {...createPanelProps([selectedUnderlay], selectedUnderlay)} />,
    );

    expect(markup).toContain(
      'The PDF could not be read. It may be corrupt, encrypted, or unsupported. Calibration is disabled until the page renders again.',
    );
    expect(markup).toContain(
      'The PDF could not be read. It may be corrupt, encrypted, or unsupported. Crop is disabled until the page renders again.',
    );
  });

  it('keeps valid inspected PDF page feedback unchanged', () => {
    documentsQueryState.current.data = [createDocument()];
    pdfDocumentInfoState.current = {
      data: { pageCount: 1 },
      error: null,
      errorKind: null,
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
      errorKind: null,
      isLoading: false,
    };

    const markup = renderToStaticMarkup(<DraftingUnderlaysPanel {...createPanelProps([], null)} />);

    expect(markup).toContain('1 page available.');
    expect(markup).toContain('Page 1 renders at 400 × 200 PDF units.');
  });

  it('marks selected underlays with missing project PDF references as unavailable', async () => {
    documentsQueryState.current.data = [];
    const selectedUnderlay = createUnderlay();

    await act(async () => {
      root.render(
        <DraftingUnderlaysPanel {...createPanelProps([selectedUnderlay], selectedUnderlay)} />,
      );
    });

    expect(container.textContent).toContain(
      'The referenced project PDF is missing, inaccessible, or no longer available.',
    );
    expect(container.textContent).toContain('This PDF underlay is unavailable and is skipped');
    expect(container.textContent).toContain('survey.pdf · page 1');
    expect(container.textContent).not.toContain('Start Calibration');
    expect(container.textContent).not.toContain('Start Crop');
  });

  it('does not treat non-PDF project documents as renderable underlay references', async () => {
    documentsQueryState.current.data = [
      createDocument({
        fileName: 'survey.png',
        mimeType: 'image/png',
      }),
    ];
    const selectedUnderlay = createUnderlay();

    await act(async () => {
      root.render(
        <DraftingUnderlaysPanel {...createPanelProps([selectedUnderlay], selectedUnderlay)} />,
      );
    });

    expect(container.textContent).toContain('No project PDFs uploaded yet');
    expect(container.textContent).toContain('The referenced project document is not a PDF.');
    expect(container.textContent).toContain('This PDF underlay is unavailable and is skipped');
    expect(container.textContent).not.toContain('Start Calibration');
    expect(container.textContent).not.toContain('Start Crop');
  });

  it.each([
    {
      action: 'calibration' as const,
      mutate: (handle: ActiveModeHarnessHandle, underlayId: string) =>
        handle.updateUnderlay(underlayId, (underlay) => ({ ...underlay, locked: true })),
      expectedFeedback: 'Calibration was cancelled because the active underlay is locked.',
      staleInstruction: 'Click the first reference point on the PDF underlay.',
      cancelSpy: 'calibration',
    },
    {
      action: 'calibration' as const,
      mutate: (handle: ActiveModeHarnessHandle, underlayId: string) =>
        handle.updateUnderlay(underlayId, (underlay) => ({ ...underlay, visible: false })),
      expectedFeedback: 'Calibration was cancelled because the active underlay is hidden.',
      staleInstruction: 'Click the first reference point on the PDF underlay.',
      cancelSpy: 'calibration',
    },
    {
      action: 'calibration' as const,
      mutate: (handle: ActiveModeHarnessHandle, underlayId: string) =>
        handle.updateUnderlay(underlayId, (underlay) => ({
          ...underlay,
          transform: {
            ...underlay.transform,
            scale: 0,
          },
        })),
      expectedFeedback:
        'Calibration was cancelled because the active underlay is unavailable or its page metadata is invalid.',
      staleInstruction: 'Click the first reference point on the PDF underlay.',
      cancelSpy: 'calibration',
    },
    {
      action: 'crop' as const,
      mutate: (handle: ActiveModeHarnessHandle, underlayId: string) =>
        handle.updateUnderlay(underlayId, (underlay) => ({ ...underlay, locked: true })),
      expectedFeedback: 'Crop was cancelled because the active underlay is locked.',
      staleInstruction: 'Click and drag on the selected PDF underlay to define a rectangular crop.',
      cancelSpy: 'crop',
    },
    {
      action: 'crop' as const,
      mutate: (handle: ActiveModeHarnessHandle, underlayId: string) =>
        handle.updateUnderlay(underlayId, (underlay) => ({ ...underlay, visible: false })),
      expectedFeedback: 'Crop was cancelled because the active underlay is hidden.',
      staleInstruction: 'Click and drag on the selected PDF underlay to define a rectangular crop.',
      cancelSpy: 'crop',
    },
    {
      action: 'crop' as const,
      mutate: (handle: ActiveModeHarnessHandle, underlayId: string) =>
        handle.updateUnderlay(underlayId, (underlay) => ({
          ...underlay,
          transform: {
            ...underlay.transform,
            scale: 0,
          },
        })),
      expectedFeedback:
        'Crop was cancelled because the active underlay is unavailable or its page metadata is invalid.',
      staleInstruction: 'Click and drag on the selected PDF underlay to define a rectangular crop.',
      cancelSpy: 'crop',
    },
  ])(
    'cancels active $action mode when the selected underlay becomes unsafe',
    async ({ action, mutate, expectedFeedback, staleInstruction, cancelSpy }) => {
      const selectedUnderlay = createUnderlay();
      const handle = React.createRef<ActiveModeHarnessHandle>();
      const onCancelCalibration = vi.fn();
      const onCancelCrop = vi.fn();

      await act(async () => {
        root.render(
          <ActiveModeHarness
            ref={handle}
            initialSelectedUnderlayId={selectedUnderlay.id}
            initialUnderlays={[selectedUnderlay]}
            mode={action}
            onCancelCalibration={onCancelCalibration}
            onCancelCrop={onCancelCrop}
          />,
        );
      });

      expect(container.textContent).toContain(staleInstruction);

      await act(async () => {
        mutate(handle.current!, selectedUnderlay.id);
      });

      expect(container.textContent).toContain(expectedFeedback);
      expect(container.textContent).not.toContain(staleInstruction);
      expect(onCancelCalibration).toHaveBeenCalledTimes(cancelSpy === 'calibration' ? 1 : 0);
      expect(onCancelCrop).toHaveBeenCalledTimes(cancelSpy === 'crop' ? 1 : 0);
    },
  );

  it.each([
    {
      action: 'calibration' as const,
      mutate: (handle: ActiveModeHarnessHandle) =>
        handle.updateUnderlayLayer((layer) => ({ ...layer, visible: false })),
      expectedFeedback: 'Calibration was cancelled because the Underlay layer is hidden.',
      staleInstruction: 'Click the first reference point on the PDF underlay.',
      cancelSpy: 'calibration',
    },
    {
      action: 'calibration' as const,
      mutate: (handle: ActiveModeHarnessHandle) =>
        handle.updateUnderlayLayer((layer) => ({ ...layer, locked: true })),
      expectedFeedback: 'Calibration was cancelled because the Underlay layer is locked.',
      staleInstruction: 'Click the first reference point on the PDF underlay.',
      cancelSpy: 'calibration',
    },
    {
      action: 'crop' as const,
      mutate: (handle: ActiveModeHarnessHandle) =>
        handle.updateUnderlayLayer((layer) => ({ ...layer, visible: false })),
      expectedFeedback: 'Crop was cancelled because the Underlay layer is hidden.',
      staleInstruction: 'Click and drag on the selected PDF underlay to define a rectangular crop.',
      cancelSpy: 'crop',
    },
    {
      action: 'crop' as const,
      mutate: (handle: ActiveModeHarnessHandle) =>
        handle.updateUnderlayLayer((layer) => ({ ...layer, locked: true })),
      expectedFeedback: 'Crop was cancelled because the Underlay layer is locked.',
      staleInstruction: 'Click and drag on the selected PDF underlay to define a rectangular crop.',
      cancelSpy: 'crop',
    },
  ])(
    'cancels active $action mode when the shared Underlay layer becomes unsafe',
    async ({ action, mutate, expectedFeedback, staleInstruction, cancelSpy }) => {
      const selectedUnderlay = createUnderlay();
      const handle = React.createRef<ActiveModeHarnessHandle>();
      const onCancelCalibration = vi.fn();
      const onCancelCrop = vi.fn();

      await act(async () => {
        root.render(
          <ActiveModeHarness
            ref={handle}
            initialSelectedUnderlayId={selectedUnderlay.id}
            initialUnderlays={[selectedUnderlay]}
            mode={action}
            onCancelCalibration={onCancelCalibration}
            onCancelCrop={onCancelCrop}
          />,
        );
      });

      expect(container.textContent).toContain(staleInstruction);

      await act(async () => {
        mutate(handle.current!);
      });

      expect(container.textContent).toContain(expectedFeedback);
      expect(container.textContent).not.toContain(staleInstruction);
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith(expectedFeedback);
      expect(onCancelCalibration).toHaveBeenCalledTimes(cancelSpy === 'calibration' ? 1 : 0);
      expect(onCancelCrop).toHaveBeenCalledTimes(cancelSpy === 'crop' ? 1 : 0);
    },
  );

  it('cancels active calibration when the selected PDF page starts failing to render', async () => {
    const selectedUnderlay = createUnderlay();
    const handle = React.createRef<ActiveModeHarnessHandle>();
    const onCancelCalibration = vi.fn();

    pdfPageRenderState.current = {
      data: {
        height: 200,
        imageUrl: 'blob:underlay-page',
        pageCount: 1,
        width: 400,
      },
      error: null,
      errorKind: null,
      isLoading: false,
    };

    await act(async () => {
      root.render(
        <ActiveModeHarness
          ref={handle}
          initialSelectedUnderlayId={selectedUnderlay.id}
          initialUnderlays={[selectedUnderlay]}
          mode="calibration"
          onCancelCalibration={onCancelCalibration}
        />,
      );
    });

    expect(container.textContent).toContain('Click the first reference point on the PDF underlay.');

    pdfPageRenderState.current = {
      data: null,
      error: new Error('Failed to render PDF page'),
      errorKind: null,
      isLoading: false,
    };

    await act(async () => {
      handle.current!.refresh();
    });

    expect(container.textContent).toContain(
      'Calibration was cancelled because the selected PDF page cannot currently render.',
    );
    expect(container.textContent).not.toContain(
      'Click the first reference point on the PDF underlay.',
    );
    expect(onCancelCalibration).toHaveBeenCalledTimes(1);
  });

  it('cancels active crop when the selected PDF page starts failing to render', async () => {
    const selectedUnderlay = createUnderlay();
    const handle = React.createRef<ActiveModeHarnessHandle>();
    const onCancelCrop = vi.fn();

    pdfPageRenderState.current = {
      data: {
        height: 200,
        imageUrl: 'blob:underlay-page',
        pageCount: 1,
        width: 400,
      },
      error: null,
      errorKind: null,
      isLoading: false,
    };

    await act(async () => {
      root.render(
        <ActiveModeHarness
          ref={handle}
          initialSelectedUnderlayId={selectedUnderlay.id}
          initialUnderlays={[selectedUnderlay]}
          mode="crop"
          onCancelCrop={onCancelCrop}
        />,
      );
    });

    expect(container.textContent).toContain(
      'Click and drag on the selected PDF underlay to define a rectangular crop.',
    );

    pdfPageRenderState.current = {
      data: null,
      error: new Error('Failed to render PDF page'),
      errorKind: null,
      isLoading: false,
    };

    await act(async () => {
      handle.current!.refresh();
    });

    expect(container.textContent).toContain(
      'Crop was cancelled because the selected PDF page cannot currently render.',
    );
    expect(container.textContent).not.toContain(
      'Click and drag on the selected PDF underlay to define a rectangular crop.',
    );
    expect(onCancelCrop).toHaveBeenCalledTimes(1);
  });

  it('cancels active calibration when its underlay is removed', async () => {
    const selectedUnderlay = createUnderlay();
    const handle = React.createRef<ActiveModeHarnessHandle>();
    const onCancelCalibration = vi.fn();

    await act(async () => {
      root.render(
        <ActiveModeHarness
          ref={handle}
          initialSelectedUnderlayId={selectedUnderlay.id}
          initialUnderlays={[selectedUnderlay]}
          mode="calibration"
          onCancelCalibration={onCancelCalibration}
        />,
      );
    });

    await act(async () => {
      handle.current!.removeUnderlay(selectedUnderlay.id);
    });

    expect(container.textContent).toContain(
      'Calibration was cancelled because the active underlay was removed.',
    );
    expect(container.textContent).not.toContain(
      'Click the first reference point on the PDF underlay.',
    );
    expect(onCancelCalibration).toHaveBeenCalledTimes(1);
  });

  it('cancels active crop when its underlay is no longer selected', async () => {
    const selectedUnderlay = createUnderlay();
    const otherUnderlay = {
      ...createUnderlay(),
      id: 'underlay-2',
      name: 'Other PDF',
    };
    const handle = React.createRef<ActiveModeHarnessHandle>();
    const onCancelCrop = vi.fn();

    await act(async () => {
      root.render(
        <ActiveModeHarness
          ref={handle}
          initialSelectedUnderlayId={selectedUnderlay.id}
          initialUnderlays={[selectedUnderlay, otherUnderlay]}
          mode="crop"
          onCancelCrop={onCancelCrop}
        />,
      );
    });

    await act(async () => {
      handle.current!.selectUnderlay(otherUnderlay.id);
    });

    expect(container.textContent).toContain(
      'Crop was cancelled because the active underlay is no longer selected.',
    );
    expect(container.textContent).not.toContain(
      'Click and drag on the selected PDF underlay to define a rectangular crop.',
    );
    expect(onCancelCrop).toHaveBeenCalledTimes(1);
  });

  it('keeps valid active mode instructions visible for a safe selected underlay', async () => {
    const selectedUnderlay = createUnderlay();

    await act(async () => {
      root.render(
        <ActiveModeHarness
          initialSelectedUnderlayId={selectedUnderlay.id}
          initialUnderlays={[selectedUnderlay]}
          mode="calibration"
        />,
      );
    });

    expect(container.textContent).toContain('Click the first reference point on the PDF underlay.');
    expect(container.textContent).not.toContain('was cancelled because');
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
    underlayLayer: createUnderlayLayer(),
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

function createUnderlayLayer(): DraftingLayer {
  return {
    id: 'underlay',
    name: 'Underlay',
    visible: true,
    locked: false,
    color: '#94a3b8',
    lineWeight: 1,
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

function createDocument(overrides: Partial<Document> = {}): Document {
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
    ...overrides,
  };
}

type ActiveModeHarnessHandle = {
  refresh: () => void;
  removeUnderlay: (underlayId: string) => void;
  selectUnderlay: (underlayId: string | null) => void;
  updateUnderlayLayer: (updater: (layer: DraftingLayer) => DraftingLayer) => void;
  updateUnderlay: (
    underlayId: string,
    updater: (underlay: DraftingUnderlay) => DraftingUnderlay,
  ) => void;
};

const ActiveModeHarness = React.forwardRef<
  ActiveModeHarnessHandle,
  {
    initialSelectedUnderlayId: string | null;
    initialUnderlays: DraftingUnderlay[];
    mode: 'calibration' | 'crop';
    onCancelCalibration?: () => void;
    onCancelCrop?: () => void;
  }
>(function ActiveModeHarness(
  {
    initialSelectedUnderlayId,
    initialUnderlays,
    mode,
    onCancelCalibration = vi.fn(),
    onCancelCrop = vi.fn(),
  },
  ref,
) {
  const [underlays, setUnderlays] = React.useState(initialUnderlays);
  const [underlayLayer, setUnderlayLayer] = React.useState(createUnderlayLayer());
  const [selectedUnderlayId, setSelectedUnderlayId] = React.useState(initialSelectedUnderlayId);
  const [refreshVersion, setRefreshVersion] = React.useState(0);
  const [calibrationState, setCalibrationState] = React.useState<{
    underlayId: string;
    pdfPointA: { x: number; y: number } | null;
    pdfPointB: { x: number; y: number } | null;
  } | null>(() =>
    mode === 'calibration' && initialSelectedUnderlayId
      ? {
          underlayId: initialSelectedUnderlayId,
          pdfPointA: null,
          pdfPointB: null,
        }
      : null,
  );
  const [cropModeUnderlayId, setCropModeUnderlayId] = React.useState<string | null>(
    mode === 'crop' ? initialSelectedUnderlayId : null,
  );

  void refreshVersion;

  const selectedUnderlay = underlays.find((underlay) => underlay.id === selectedUnderlayId) ?? null;

  React.useImperativeHandle(
    ref,
    () => ({
      refresh: () => setRefreshVersion((current) => current + 1),
      removeUnderlay: (underlayId: string) => {
        setUnderlays((current) => current.filter((underlay) => underlay.id !== underlayId));
        setSelectedUnderlayId((current) => (current === underlayId ? null : current));
      },
      selectUnderlay: (underlayId: string | null) => setSelectedUnderlayId(underlayId),
      updateUnderlayLayer: (updater) => setUnderlayLayer((current) => updater(current)),
      updateUnderlay: (underlayId, updater) =>
        setUnderlays((current) =>
          current.map((underlay) => (underlay.id === underlayId ? updater(underlay) : underlay)),
        ),
    }),
    [],
  );

  return (
    <DraftingUnderlaysPanel
      drawingId="drawing-1"
      projectId="project-1"
      underlays={underlays}
      underlayLayer={underlayLayer}
      selectedUnderlay={selectedUnderlay}
      calibrationState={calibrationState}
      cropModeUnderlayId={cropModeUnderlayId}
      onAddUnderlay={vi.fn()}
      onSelectUnderlay={setSelectedUnderlayId}
      onUpdateUnderlay={vi.fn()}
      onRemoveUnderlay={vi.fn()}
      onBeginCalibration={vi.fn()}
      onCancelCalibration={() => {
        onCancelCalibration();
        setCalibrationState(null);
      }}
      onApplyCalibration={vi.fn()}
      onBeginCrop={vi.fn()}
      onCancelCrop={() => {
        onCancelCrop();
        setCropModeUnderlayId(null);
      }}
      onClearCrop={vi.fn()}
    />
  );
});

function getButton(label: string) {
  const button = Array.from(document.querySelectorAll('button')).find(
    (element) => element.textContent?.trim() === label,
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Expected button with label: ${label}`);
  }

  return button;
}

function getInputs() {
  return Array.from(document.querySelectorAll('input')).filter(
    (element): element is HTMLInputElement => element instanceof HTMLInputElement,
  );
}
