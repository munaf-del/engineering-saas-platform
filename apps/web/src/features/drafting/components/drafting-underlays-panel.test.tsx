import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { DraftingUnderlay } from '@eng/shared';
import { describe, expect, it, vi } from 'vitest';
import { DraftingUnderlaysPanel } from './drafting-underlays-panel';

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('@/hooks/use-documents', () => ({
  useProjectDocuments: () => ({
    data: [],
    isFetching: false,
    refetch: vi.fn(),
  }),
  useUploadProjectDocument: () => ({
    isPending: false,
    mutateAsync: vi.fn(),
  }),
}));

vi.mock('../hooks/use-pdf-underlay-render', () => ({
  usePdfDocumentInfo: () => ({
    data: null,
    error: null,
    isLoading: false,
  }),
  usePdfPageRender: () => ({
    data: null,
    error: null,
    isLoading: false,
  }),
}));

describe('DraftingUnderlaysPanel', () => {
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
