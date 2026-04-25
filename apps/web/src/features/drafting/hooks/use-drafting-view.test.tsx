/* @vitest-environment jsdom */

import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmptyDraftingModel } from '@eng/shared';
import {
  createDraftingEditorViewState,
  getDraftingEditorViewStorageKey,
  parseStoredDraftingEditorView,
  resolveInitialDraftingEditorView,
  serializeDraftingEditorView,
  useDraftingView,
} from './use-drafting-view';
import { serializeDraftingModelJson } from '../export-utils';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

class ResizeObserverStub {
  observe() {}
  disconnect() {}
}

vi.stubGlobal('ResizeObserver', ResizeObserverStub);

describe('useDraftingView', () => {
  let localStorageMock: Storage;

  beforeEach(() => {
    const storage = new Map<string, string>();
    localStorageMock = {
      clear: vi.fn(() => storage.clear()),
      getItem: vi.fn((key: string) => storage.get(key) ?? null),
      key: vi.fn((index: number) => Array.from(storage.keys())[index] ?? null),
      get length() {
        return storage.size;
      },
      removeItem: vi.fn((key: string) => storage.delete(key)),
      setItem: vi.fn((key: string, value: string) => {
        storage.set(key, value);
      }),
    };
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: localStorageMock,
    });
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  it('uses a per-drawing localStorage viewport before legacy model.view', () => {
    const model = {
      ...createEmptyDraftingModel('drawing-local-view'),
      view: { scale: 0.1, offsetX: 11, offsetY: 22 },
    };
    const stored = createDraftingEditorViewState(
      { scale: 0.75, offsetX: 300, offsetY: 400 },
      true,
      '2026-04-25T00:00:00.000Z',
    );
    const storage = new Map([
      [getDraftingEditorViewStorageKey(model.drawingId), serializeDraftingEditorView(stored)],
    ]);

    const restored = resolveInitialDraftingEditorView(model.drawingId, model, {
      getItem: (key) => storage.get(key) ?? null,
    });

    expect(restored).toMatchObject({
      locked: true,
      offsetX: 300,
      offsetY: 400,
      scale: 0.75,
    });
  });

  it('falls back to legacy model.view when no stored viewport exists', () => {
    const model = {
      ...createEmptyDraftingModel('drawing-legacy-view'),
      view: { scale: 0.2, offsetX: 80, offsetY: 90 },
    };

    expect(resolveInitialDraftingEditorView(model.drawingId, model, null)).toMatchObject({
      locked: false,
      offsetX: 80,
      offsetY: 90,
      scale: 0.2,
    });
  });

  it('updates local editor view without mutating DraftingModel.view', async () => {
    const model = {
      ...createEmptyDraftingModel('drawing-hook-view'),
      view: { scale: 0.05, offsetX: 160, offsetY: 160 },
    };
    const hook = await renderDraftingViewHook(model);

    await act(async () => {
      hook.current.handleZoomIn();
    });

    expect(hook.current.currentView.scale).toBeGreaterThan(model.view.scale);
    expect(model.view).toEqual({ scale: 0.05, offsetX: 160, offsetY: 160 });
    expect(JSON.parse(serializeDraftingModelJson(model)).view).toEqual({
      scale: 0.05,
      offsetX: 160,
      offsetY: 160,
    });
    expect(window.localStorage.getItem(getDraftingEditorViewStorageKey(model.drawingId))).toContain(
      '"scale"',
    );

    await hook.unmount();
  });

  it('does not overwrite a stored viewport with legacy view during initial hydration', async () => {
    const model = {
      ...createEmptyDraftingModel('drawing-stored-hook-view'),
      view: { scale: 0.05, offsetX: 160, offsetY: 160 },
    };
    const stored = createDraftingEditorViewState(
      { scale: 1.25, offsetX: 600, offsetY: 700 },
      false,
      '2026-04-25T00:00:00.000Z',
    );
    window.localStorage.setItem(
      getDraftingEditorViewStorageKey(model.drawingId),
      serializeDraftingEditorView(stored),
    );

    const hook = await renderDraftingViewHook(model);

    expect(hook.current.currentView).toMatchObject({
      offsetX: 600,
      offsetY: 700,
      scale: 1.25,
    });
    expect(
      parseStoredDraftingEditorView(
        window.localStorage.getItem(getDraftingEditorViewStorageKey(model.drawingId)),
      ),
    ).toMatchObject({
      offsetX: 600,
      offsetY: 700,
      scale: 1.25,
    });

    await hook.unmount();
  });

  it('persists lock state and blocks zoom, fit, reset, centre, and wheel changes while locked', async () => {
    const model = createEmptyDraftingModel('drawing-locked-hook-view');
    const hook = await renderDraftingViewHook(model);

    await act(async () => {
      hook.current.setViewLocked(true);
    });
    const lockedView = hook.current.currentView;

    await act(async () => {
      hook.current.handleZoomIn();
      hook.current.handleZoomOut();
      hook.current.handleFitView();
      hook.current.handleResetZoom();
      hook.current.handleCenterViewOnPoint({ x: 1000, y: 2000 });
      hook.current.handleCanvasWheel({
        clientX: 200,
        clientY: 200,
        deltaY: -100,
        preventDefault: () => undefined,
      } as React.WheelEvent<SVGSVGElement>);
    });

    expect(hook.current.currentView).toMatchObject({
      locked: true,
      offsetX: lockedView.offsetX,
      offsetY: lockedView.offsetY,
      scale: lockedView.scale,
    });
    expect(
      parseStoredDraftingEditorView(
        window.localStorage.getItem(getDraftingEditorViewStorageKey(model.drawingId)),
      ),
    ).toMatchObject({
      locked: true,
    });

    await hook.unmount();
  });
});

async function renderDraftingViewHook(model: ReturnType<typeof createEmptyDraftingModel>) {
  const element = document.createElement('div');
  const root = createRoot(element);
  let current: ReturnType<typeof useDraftingView> | null = null;

  function Harness() {
    current = useDraftingView({
      activeTool: 'select',
      drawingId: model.drawingId,
      model,
    });

    React.useEffect(() => {
      if (current?.containerRef) {
        Object.defineProperty(current.containerRef, 'current', {
          configurable: true,
          value: {
            getBoundingClientRect: () => ({ height: 640, left: 0, top: 0, width: 1200 }),
          },
        });
      }
    });

    return null;
  }

  await act(async () => {
    root.render(<Harness />);
  });

  if (!current) {
    throw new Error('Expected Drafting view hook to render');
  }

  return {
    get current() {
      return current!;
    },
    unmount: async () => {
      await act(async () => root.unmount());
    },
  };
}
