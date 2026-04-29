'use client';

import * as React from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api';
import { apiArrayBuffer } from '@/lib/api-client';

export type PdfUnderlayDocumentInfo = {
  pageCount: number;
};

export type PdfUnderlayPageMetrics = {
  width: number;
  height: number;
  pageCount: number;
};

export type PdfUnderlayPageRender = PdfUnderlayPageMetrics & {
  imageUrl: string;
};

const PDF_RENDER_SCALE = 2;
const documentCache = new Map<string, Promise<PDFDocumentProxy>>();
const pageInfoCache = new Map<string, Promise<PdfUnderlayDocumentInfo>>();
const pageRenderCache = new Map<string, Promise<PdfUnderlayPageRender>>();
const pageImageUrlCache = new Map<string, string>();

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();
}

export function usePdfDocumentInfo(fileId: string | null | undefined) {
  const [state, setState] = React.useState<{
    data: PdfUnderlayDocumentInfo | null;
    error: Error | null;
    isLoading: boolean;
  }>({
    data: null,
    error: null,
    isLoading: Boolean(fileId),
  });

  React.useEffect(() => {
    if (!fileId) {
      setState({ data: null, error: null, isLoading: false });
      return;
    }

    let cancelled = false;
    setState((current) => ({
      data: current.data,
      error: null,
      isLoading: current.data == null,
    }));

    getPdfDocumentInfo(fileId)
      .then((data) => {
        if (!cancelled) {
          setState({ data, error: null, isLoading: false });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            data: null,
            error: error instanceof Error ? error : new Error('Failed to load PDF info'),
            isLoading: false,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [fileId]);

  return state;
}

export function usePdfPageRender(
  fileId: string | null | undefined,
  pageNumber: number | null | undefined,
) {
  const [state, setState] = React.useState<{
    data: PdfUnderlayPageRender | null;
    error: Error | null;
    isLoading: boolean;
  }>({
    data: null,
    error: null,
    isLoading: Boolean(fileId && pageNumber),
  });

  React.useEffect(() => {
    if (!fileId || !pageNumber) {
      setState({ data: null, error: null, isLoading: false });
      return;
    }

    let cancelled = false;
    setState((current) => ({
      data: current.data,
      error: null,
      isLoading: current.data == null,
    }));

    renderPdfPage(fileId, pageNumber)
      .then((data) => {
        if (!cancelled) {
          setState({ data, error: null, isLoading: false });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            data: null,
            error: error instanceof Error ? error : new Error('Failed to render PDF page'),
            isLoading: false,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [fileId, pageNumber]);

  return state;
}

async function getPdfDocumentInfo(fileId: string) {
  const cached = pageInfoCache.get(fileId);
  if (cached) {
    return cached;
  }

  const promise = loadPdfDocument(fileId)
    .then((document) => ({
      pageCount: document.numPages,
    }))
    .catch((error: unknown) => {
      pageInfoCache.delete(fileId);
      throw error;
    });
  pageInfoCache.set(fileId, promise);
  return promise;
}

async function renderPdfPage(fileId: string, pageNumber: number) {
  const cacheKey = `${fileId}:${pageNumber}`;
  const cached = pageRenderCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const promise = (async () => {
    try {
      const pdf = await loadPdfDocument(fileId);
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: PDF_RENDER_SCALE });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);

      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Canvas rendering context is unavailable');
      }

      await page.render({
        canvas,
        canvasContext: context,
        viewport,
      }).promise;

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((value) => {
          if (value) {
            resolve(value);
            return;
          }

          reject(new Error('Failed to convert rendered PDF page to an image'));
        }, 'image/png');
      });

      const existingUrl = pageImageUrlCache.get(cacheKey);
      if (existingUrl) {
        URL.revokeObjectURL(existingUrl);
      }

      const imageUrl = URL.createObjectURL(blob);
      pageImageUrlCache.set(cacheKey, imageUrl);

      return {
        imageUrl,
        width: viewport.width / PDF_RENDER_SCALE,
        height: viewport.height / PDF_RENDER_SCALE,
        pageCount: pdf.numPages,
      } satisfies PdfUnderlayPageRender;
    } catch (error) {
      pageRenderCache.delete(cacheKey);
      throw error;
    }
  })();

  pageRenderCache.set(cacheKey, promise);
  return promise;
}

async function loadPdfDocument(fileId: string) {
  const cached = documentCache.get(fileId);
  if (cached) {
    return cached;
  }

  const promise = apiArrayBuffer(`/documents/${fileId}/download`)
    .then((data) => pdfjsLib.getDocument({ data }).promise)
    .catch((error: unknown) => {
      documentCache.delete(fileId);
      throw error;
    });

  documentCache.set(fileId, promise);
  return promise;
}
