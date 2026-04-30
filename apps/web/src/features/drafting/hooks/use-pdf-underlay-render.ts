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

export type PdfUnderlayRenderErrorKind =
  | 'missing_document'
  | 'inaccessible_document'
  | 'not_pdf'
  | 'invalid_pdf'
  | 'page_unavailable'
  | 'render_failed'
  | 'unknown';

export type PdfUnderlayRenderLoadingKind = 'document_info_loading' | 'page_render_loading';

type PdfUnderlayRenderErrorPhase = 'document_info' | 'page_render';

type PdfUnderlayLoadState<T> = {
  data: T | null;
  error: Error | null;
  errorKind: PdfUnderlayRenderErrorKind | null;
  isLoading: boolean;
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
  const [state, setState] = React.useState<PdfUnderlayLoadState<PdfUnderlayDocumentInfo>>({
    data: null,
    error: null,
    errorKind: null,
    isLoading: Boolean(fileId),
  });

  React.useEffect(() => {
    if (!fileId) {
      setState({ data: null, error: null, errorKind: null, isLoading: false });
      return;
    }

    let cancelled = false;
    setState((current) => ({
      data: current.data,
      error: null,
      errorKind: null,
      isLoading: current.data == null,
    }));

    getPdfDocumentInfo(fileId)
      .then((data) => {
        if (!cancelled) {
          setState({ data, error: null, errorKind: null, isLoading: false });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          const classifiedError = getClassifiedPdfUnderlayError(error, 'document_info');
          setState({
            data: null,
            error: classifiedError.error,
            errorKind: classifiedError.kind,
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
  const [state, setState] = React.useState<PdfUnderlayLoadState<PdfUnderlayPageRender>>({
    data: null,
    error: null,
    errorKind: null,
    isLoading: Boolean(fileId && pageNumber),
  });

  React.useEffect(() => {
    if (!fileId || !pageNumber) {
      setState({ data: null, error: null, errorKind: null, isLoading: false });
      return;
    }

    let cancelled = false;
    setState((current) => ({
      data: current.data,
      error: null,
      errorKind: null,
      isLoading: current.data == null,
    }));

    renderPdfPage(fileId, pageNumber)
      .then((data) => {
        if (!cancelled) {
          setState({ data, error: null, errorKind: null, isLoading: false });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          const classifiedError = getClassifiedPdfUnderlayError(error, 'page_render');
          setState({
            data: null,
            error: classifiedError.error,
            errorKind: classifiedError.kind,
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

export function classifyPdfUnderlayRenderError(
  error: unknown,
  phase: PdfUnderlayRenderErrorPhase,
): PdfUnderlayRenderErrorKind {
  const status = getErrorStatus(error);
  if (status === 404) {
    return 'missing_document';
  }

  if (status === 401 || status === 403) {
    return 'inaccessible_document';
  }

  if (status === 415) {
    return 'not_pdf';
  }

  if (status === 416) {
    return 'page_unavailable';
  }

  const message = getErrorMessage(error);
  if (/\b(404|not found|missing|no such file)\b/i.test(message)) {
    return 'missing_document';
  }

  if (
    /\b(401|403|unauthori[sz]ed|forbidden|permission|access denied|inaccessible)\b/i.test(message)
  ) {
    return 'inaccessible_document';
  }

  if (/\b(non[-\s]?pdf|not a pdf|unsupported media|mime type|content type)\b/i.test(message)) {
    return 'not_pdf';
  }

  if (
    /\b(invalid pdf|malformed pdf|corrupt|corrupted|encrypted|password protected|pdf structure)\b/i.test(
      message,
    )
  ) {
    return 'invalid_pdf';
  }

  if (
    phase === 'page_render' &&
    /\b(page unavailable|page not found|invalid page|page index|page number|out of range)\b/i.test(
      message,
    )
  ) {
    return 'page_unavailable';
  }

  if (
    phase === 'page_render' &&
    /\b(render|canvas|viewport|blob|image|raster|bitmap)\b/i.test(message)
  ) {
    return 'render_failed';
  }

  return 'unknown';
}

export function getPdfUnderlayRenderErrorMessage(
  kind: PdfUnderlayRenderErrorKind | null | undefined,
  options: {
    pageNumber?: number | null;
    fallback?: string;
  } = {},
) {
  const pageLabel = options.pageNumber ? `Page ${options.pageNumber}` : 'The selected page';

  switch (kind) {
    case 'missing_document':
      return 'The referenced project PDF could not be found. It may have been removed or moved.';
    case 'inaccessible_document':
      return 'The referenced project PDF is not accessible from this project or session.';
    case 'not_pdf':
      return 'The referenced project document is not a PDF.';
    case 'invalid_pdf':
      return 'The PDF could not be read. It may be corrupt, encrypted, or unsupported.';
    case 'page_unavailable':
      return `${pageLabel} is not available in the selected PDF.`;
    case 'render_failed':
      return `${pageLabel} could not be rendered. Try refreshing or selecting another page.`;
    case 'unknown':
    case null:
    case undefined:
      return options.fallback ?? 'The PDF underlay could not be rendered.';
  }
}

export function getPdfUnderlayRenderLoadingMessage(
  kind: PdfUnderlayRenderLoadingKind,
  options: {
    pageNumber?: number | null;
  } = {},
) {
  switch (kind) {
    case 'document_info_loading':
      return 'Inspecting the selected PDF page count.';
    case 'page_render_loading':
      return options.pageNumber
        ? `Rendering PDF page ${options.pageNumber}.`
        : 'Rendering the selected PDF page.';
  }
}

function getClassifiedPdfUnderlayError(error: unknown, phase: PdfUnderlayRenderErrorPhase) {
  const fallbackMessage =
    phase === 'document_info' ? 'Failed to load PDF info' : 'Failed to render PDF page';
  const normalizedError = error instanceof Error ? error : new Error(fallbackMessage);

  return {
    error: normalizedError,
    kind: classifyPdfUnderlayRenderError(error, phase),
  };
}

function getErrorStatus(error: unknown) {
  if (!error || typeof error !== 'object' || !('status' in error)) {
    return null;
  }

  const status = (error as { status?: unknown }).status;
  return typeof status === 'number' ? status : null;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return '';
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
