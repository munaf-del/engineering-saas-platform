import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { DraftingUnderlay } from '@eng/shared';
import { describe, expect, it, vi } from 'vitest';
import { DraftingPdfUnderlay } from './drafting-pdf-underlay';

const pdfPageRenderState = vi.hoisted(() => ({
  current: {
    data: null as null | {
      height: number;
      imageUrl: string;
      pageCount: number;
      width: number;
    },
    error: null as Error | null,
    isLoading: false,
  },
}));

vi.mock('../hooks/use-pdf-underlay-render', () => ({
  usePdfPageRender: () => pdfPageRenderState.current,
}));

describe('DraftingPdfUnderlay', () => {
  it('renders a lightweight placeholder when PDF page rendering fails', () => {
    pdfPageRenderState.current = {
      data: null,
      error: new Error('Failed to render PDF page'),
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
});

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
      rotationDeg: 0,
      scale: 1,
    },
    crop: null,
    calibration: null,
    createdAt: '2026-04-30T00:00:00.000Z',
    updatedAt: '2026-04-30T00:00:00.000Z',
  };
}
