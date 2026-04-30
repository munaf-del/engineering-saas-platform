import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { DraftingUnderlay } from '@eng/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DraftingPdfUnderlay } from './drafting-pdf-underlay';

const pdfPageRenderState = vi.hoisted(() => {
  const state: {
    current: {
      data: null | {
        height: number;
        imageUrl: string;
        pageCount: number;
        width: number;
      };
      error: Error | null;
      errorKind: null | import('../hooks/use-pdf-underlay-render').PdfUnderlayRenderErrorKind;
      isLoading: boolean;
    };
    usePdfPageRender?: ReturnType<typeof vi.fn>;
  } = {
    current: {
      data: null as null | {
        height: number;
        imageUrl: string;
        pageCount: number;
        width: number;
      },
      error: null as Error | null,
      errorKind: null as
        | null
        | import('../hooks/use-pdf-underlay-render').PdfUnderlayRenderErrorKind,
      isLoading: false,
    },
  };

  state.usePdfPageRender = vi.fn(() => state.current);
  return state as typeof state & { usePdfPageRender: ReturnType<typeof vi.fn> };
});

vi.mock('../hooks/use-pdf-underlay-render', () => ({
  getPdfUnderlayRenderErrorMessage: (
    kind: string | null | undefined,
    options: { fallback?: string; pageNumber?: number | null } = {},
  ) => {
    if (kind === 'page_unavailable') {
      return `Page ${options.pageNumber} is not available in the selected PDF.`;
    }

    return options.fallback ?? 'The PDF underlay could not be rendered.';
  },
  getPdfUnderlayRenderLoadingMessage: (
    kind: string,
    options: { pageNumber?: number | null } = {},
  ) => (kind === 'page_render_loading' ? `Rendering PDF page ${options.pageNumber}.` : ''),
  usePdfPageRender: pdfPageRenderState.usePdfPageRender,
}));

describe('DraftingPdfUnderlay', () => {
  beforeEach(() => {
    pdfPageRenderState.usePdfPageRender.mockClear();
  });

  it('renders a lightweight placeholder while PDF page rendering is loading', () => {
    pdfPageRenderState.current = {
      data: null,
      error: null,
      errorKind: null,
      isLoading: true,
    };

    const markup = renderToStaticMarkup(
      <svg>
        <DraftingPdfUnderlay
          calibrationPoints={null}
          cropPreview={null}
          interactionEnabled={false}
          isSelected
          underlay={createUnderlay()}
        />
      </svg>,
    );

    expect(markup).toContain('data-testid="drafting-pdf-underlay-render-fallback"');
    expect(markup).toContain('Loading PDF underlay');
    expect(markup).toContain('Rendering PDF page 1.');
    expect(markup).not.toContain('PDF underlay unavailable');
  });

  it('renders a lightweight placeholder when PDF page rendering fails', () => {
    pdfPageRenderState.current = {
      data: null,
      error: new Error('Failed to render PDF page'),
      errorKind: 'page_unavailable',
      isLoading: false,
    };

    const markup = renderToStaticMarkup(
      <svg>
        <DraftingPdfUnderlay
          calibrationPoints={null}
          cropPreview={null}
          interactionEnabled={false}
          isSelected
          underlay={createUnderlay()}
        />
      </svg>,
    );

    expect(markup).toContain('data-testid="drafting-pdf-underlay-render-fallback"');
    expect(markup).toContain('PDF underlay unavailable');
    expect(markup).toContain('survey.pdf');
    expect(markup).toContain('Page 1 is not available in the selected PDF.');
    expect(markup).toContain('stroke="#0f766e"');
  });

  it('keeps the existing image render path unchanged when PDF rendering succeeds', () => {
    pdfPageRenderState.current = {
      data: {
        height: 200,
        imageUrl: 'blob:rendered-pdf-page',
        pageCount: 2,
        width: 400,
      },
      error: null,
      errorKind: null,
      isLoading: false,
    };

    const markup = renderToStaticMarkup(
      <svg>
        <DraftingPdfUnderlay
          calibrationPoints={null}
          cropPreview={null}
          interactionEnabled={false}
          isSelected={false}
          underlay={createUnderlay()}
        />
      </svg>,
    );

    expect(markup).toContain('href="blob:rendered-pdf-page"');
    expect(markup).toContain('data-drafting-underlay="true"');
    expect(markup).not.toContain('PDF underlay unavailable');
  });

  it('keeps display-only underlay metadata out of the page render request', () => {
    pdfPageRenderState.current = {
      data: {
        height: 200,
        imageUrl: 'blob:rendered-pdf-page',
        pageCount: 2,
        width: 400,
      },
      error: null,
      errorKind: null,
      isLoading: false,
    };

    const underlay = createUnderlay({
      calibration: {
        method: 'two_point_uniform_scale',
        pdfPointA: { x: 0, y: 0 },
        pdfPointB: { x: 100, y: 0 },
        modelPointA: { x: 10, y: 20 },
        modelPointB: { x: 110, y: 20 },
        modelDistanceMm: 1000,
        calculatedScale: 10,
        calibratedAt: '2026-04-30T00:00:00.000Z',
        warningAcknowledged: true,
      },
      crop: {
        x: 20,
        y: 30,
        width: 320,
        height: 140,
      },
      locked: true,
      opacity: 0.3,
      transform: {
        x: 50,
        y: 60,
        rotationDeg: 15,
        scale: 1.25,
      },
      visible: false,
    });

    const markup = renderToStaticMarkup(
      <svg>
        <DraftingPdfUnderlay
          calibrationPoints={null}
          cropPreview={null}
          interactionEnabled={false}
          isSelected={false}
          underlay={underlay}
        />
      </svg>,
    );

    expect(pdfPageRenderState.usePdfPageRender).toHaveBeenCalledWith('document-1', 1);
    expect(pdfPageRenderState.usePdfPageRender).toHaveBeenCalledTimes(1);
    expect(markup).toContain('href="blob:rendered-pdf-page"');
    expect(markup).toContain('opacity="0.3"');
    expect(markup).toContain('clip-path="url(#drafting-underlay-clip-underlay-1)"');
  });
});

function createUnderlay(overrides: Partial<DraftingUnderlay> = {}): DraftingUnderlay {
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
      rotationDeg: 0,
      scale: 1,
    },
    crop: null,
    calibration: null,
    createdAt: '2026-04-30T00:00:00.000Z',
    updatedAt: '2026-04-30T00:00:00.000Z',
    ...overrides,
  };
}
