import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createEmptyDraftingModel } from '@eng/shared';
import { createDraftingObject } from '../model-utils';
import { DraftingStage } from './drafting-stage';

vi.mock('./drafting-pdf-underlay', () => ({
  DraftingPdfUnderlay: () => null,
}));

describe('DraftingStage', () => {
  beforeAll(() => {
    vi.stubGlobal('React', React);
  });

  it('renders canvas zoom controls separately from sheet scale', () => {
    const model = createEmptyDraftingModel('drawing-stage-zoom');
    const pile = createDraftingObject('pile', { x: 0, y: 0 }, model);
    const markup = renderToStaticMarkup(
      <DraftingStage
        canvasSize={{ width: 1200, height: 640 }}
        containerRef={React.createRef<HTMLDivElement>()}
        model={{ ...model, objects: [pile] }}
        onBackgroundPointerDown={() => undefined}
        onCanvasClick={() => undefined}
        onCanvasWheel={() => undefined}
        onCenterReference={() => undefined}
        onFitModel={() => undefined}
        onFitSelected={() => undefined}
        onObjectHandlePointerDown={() => undefined}
        onObjectPointerDown={() => undefined}
        onResetZoom={() => undefined}
        onSetZoomScale={() => undefined}
        onViewLockedChange={() => undefined}
        onUnderlayPointerDown={() => undefined}
        onZoomIn={() => undefined}
        onZoomOut={() => undefined}
        pendingLinePoints={[]}
        selectedDrawingSheet={null}
        selectedObjectId={pile.id}
        selectedUnderlayId={null}
        showDrawingSheetViewportOverlay={false}
        underlayCalibrationState={null}
        underlayCropPreview={null}
        underlayInteractionEnabled={() => false}
        view={model.view}
        viewMode="model-fit"
        viewLocked={false}
        visibleObjects={[pile]}
        visibleUnderlays={[]}
      />,
    );

    expect(markup).toContain('aria-label="Zoom in"');
    expect(markup).toContain('aria-label="Zoom out"');
    expect(markup).toContain('aria-label="Reset zoom to 100%"');
    expect(markup).toContain('aria-label="Fit model"');
    expect(markup).toContain('aria-label="Fit selected"');
    expect(markup).toContain('aria-label="Centre on reference point"');
    expect(markup).toContain('aria-label="Lock View"');
    expect(markup).toContain('Fit view (5%)');
    expect(markup).toContain('Sheet scale 1:100');
    expect(markup).toContain('vector-effect="non-scaling-stroke"');
  });

  it('renders a locked view state while preserving object editing surface', () => {
    const model = createEmptyDraftingModel('drawing-stage-locked-view');
    const pile = createDraftingObject('pile', { x: 0, y: 0 }, model);
    const markup = renderToStaticMarkup(
      <DraftingStage
        canvasSize={{ width: 1200, height: 640 }}
        containerRef={React.createRef<HTMLDivElement>()}
        model={{ ...model, objects: [pile] }}
        onBackgroundPointerDown={() => undefined}
        onCanvasClick={() => undefined}
        onCanvasWheel={() => undefined}
        onCenterReference={() => undefined}
        onFitModel={() => undefined}
        onFitSelected={() => undefined}
        onObjectHandlePointerDown={() => undefined}
        onObjectPointerDown={() => undefined}
        onResetZoom={() => undefined}
        onSetZoomScale={() => undefined}
        onViewLockedChange={() => undefined}
        onUnderlayPointerDown={() => undefined}
        onZoomIn={() => undefined}
        onZoomOut={() => undefined}
        pendingLinePoints={[]}
        selectedDrawingSheet={null}
        selectedObjectId={pile.id}
        selectedUnderlayId={null}
        showDrawingSheetViewportOverlay={false}
        underlayCalibrationState={null}
        underlayCropPreview={null}
        underlayInteractionEnabled={() => false}
        view={model.view}
        viewLocked
        visibleObjects={[pile]}
        visibleUnderlays={[]}
      />,
    );

    expect(markup).toContain('View locked');
    expect(markup).toContain('Unlock view to pan, zoom, fit, or recenter.');
    expect(markup).toContain('disabled=""');
    expect(markup).toContain('data-drafting-object="true"');
  });

  it('renders selected engineering handles and hides them when the object is locked', () => {
    const model = createEmptyDraftingModel('drawing-stage-handles');
    const pile = createDraftingObject('pile', { x: 0, y: 0 }, model);
    const editableMarkup = renderToStaticMarkup(
      <DraftingStage
        canvasSize={{ width: 1200, height: 640 }}
        containerRef={React.createRef<HTMLDivElement>()}
        model={{ ...model, objects: [pile] }}
        onBackgroundPointerDown={() => undefined}
        onCanvasClick={() => undefined}
        onCanvasWheel={() => undefined}
        onCenterReference={() => undefined}
        onFitModel={() => undefined}
        onFitSelected={() => undefined}
        onObjectHandlePointerDown={() => undefined}
        onObjectPointerDown={() => undefined}
        onResetZoom={() => undefined}
        onSetZoomScale={() => undefined}
        onViewLockedChange={() => undefined}
        onUnderlayPointerDown={() => undefined}
        onZoomIn={() => undefined}
        onZoomOut={() => undefined}
        pendingLinePoints={[]}
        selectedDrawingSheet={null}
        selectedObjectId={pile.id}
        selectedUnderlayId={null}
        showDrawingSheetViewportOverlay={false}
        underlayCalibrationState={null}
        underlayCropPreview={null}
        underlayInteractionEnabled={() => false}
        view={model.view}
        viewLocked={false}
        visibleObjects={[pile]}
        visibleUnderlays={[]}
      />,
    );

    const lockedPile = { ...pile, locked: true };
    const lockedMarkup = renderToStaticMarkup(
      <DraftingStage
        canvasSize={{ width: 1200, height: 640 }}
        containerRef={React.createRef<HTMLDivElement>()}
        model={{ ...model, objects: [lockedPile] }}
        onBackgroundPointerDown={() => undefined}
        onCanvasClick={() => undefined}
        onCanvasWheel={() => undefined}
        onCenterReference={() => undefined}
        onFitModel={() => undefined}
        onFitSelected={() => undefined}
        onObjectHandlePointerDown={() => undefined}
        onObjectPointerDown={() => undefined}
        onResetZoom={() => undefined}
        onSetZoomScale={() => undefined}
        onViewLockedChange={() => undefined}
        onUnderlayPointerDown={() => undefined}
        onZoomIn={() => undefined}
        onZoomOut={() => undefined}
        pendingLinePoints={[]}
        selectedDrawingSheet={null}
        selectedObjectId={lockedPile.id}
        selectedUnderlayId={null}
        showDrawingSheetViewportOverlay={false}
        underlayCalibrationState={null}
        underlayCropPreview={null}
        underlayInteractionEnabled={() => false}
        view={model.view}
        viewLocked={false}
        visibleObjects={[lockedPile]}
        visibleUnderlays={[]}
      />,
    );

    expect(editableMarkup).toContain('data-testid="drafting-object-handles"');
    expect(editableMarkup).toContain('data-handle-id="centre"');
    expect(editableMarkup).toContain('data-handle-id="diameter"');
    expect(lockedMarkup).not.toContain('data-testid="drafting-object-handles"');
  });
});
