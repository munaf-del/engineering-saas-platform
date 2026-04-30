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

    expect(markup).toContain('data-testid="drafting-canvas-stage"');
    expect(markup).toContain('data-testid="drafting-canvas-controls"');
    expect(markup).toContain('data-testid="drafting-canvas-status-bar"');
    expect(markup).toContain('aria-label="Zoom in"');
    expect(markup).toContain('aria-label="Zoom out"');
    expect(markup).toContain('aria-label="Reset zoom to 100%"');
    expect(markup).toContain('aria-label="Fit model"');
    expect(markup).toContain('aria-label="Fit selected"');
    expect(markup).toContain('aria-label="Centre on reference point"');
    expect(markup).toContain('aria-label="Lock View"');
    expect(markup).toContain('data-testid="drafting-helper-grid-toggle"');
    expect(markup).toContain('aria-label="Maximize canvas"');
    expect(markup).toContain('aria-label="Enter full screen"');
    expect(markup).toContain('Fit view (5%)');
    expect(markup).toContain('Sheet scale 1:100');
    expect(markup).toContain('Helper grid on');
    expect(markup).toContain('vector-effect="non-scaling-stroke"');
  });

  it('can hide the helper display grid without hiding model objects', () => {
    const model = createEmptyDraftingModel('drawing-stage-helper-grid');
    const pile = createDraftingObject('pile', { x: 0, y: 0 }, model);
    const markup = renderToStaticMarkup(
      <DraftingStage
        canvasSize={{ width: 1200, height: 640 }}
        containerRef={React.createRef<HTMLDivElement>()}
        helperGridVisible={false}
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

    expect(markup).not.toContain('data-testid="drafting-helper-grid"');
    expect(markup).toContain('Helper Off');
    expect(markup).toContain('data-drafting-object="true"');
  });

  it('renders compact floating controls in canvas focus mode', () => {
    const model = createEmptyDraftingModel('drawing-stage-focus-mode');
    const projectGrid = createDraftingObject('project_grid_line', { x: 0, y: 0 }, model, [
      { x: 0, y: 0 },
      { x: 3000, y: 0 },
    ]);
    const markup = renderToStaticMarkup(
      <DraftingStage
        activeTool="project_grid_line"
        activeToolLabel="Grid"
        canvasSize={{ width: 1200, height: 640 }}
        containerRef={React.createRef<HTMLDivElement>()}
        initialCanvasFocusMode
        model={{ ...model, objects: [projectGrid] }}
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
        onToolChange={() => undefined}
        onViewLockedChange={() => undefined}
        onUnderlayPointerDown={() => undefined}
        onZoomIn={() => undefined}
        onZoomOut={() => undefined}
        pendingLinePoints={[]}
        selectedDrawingSheet={null}
        selectedObjectId={projectGrid.id}
        selectedUnderlayId={null}
        showDrawingSheetViewportOverlay={false}
        underlayCalibrationState={null}
        underlayCropPreview={null}
        underlayInteractionEnabled={() => false}
        view={model.view}
        viewLocked={false}
        visibleObjects={[projectGrid]}
        visibleUnderlays={[]}
      />,
    );

    expect(markup).toContain('data-testid="drafting-floating-controls"');
    expect(markup).toContain('data-testid="drafting-floating-tool-cluster"');
    expect(markup).toContain('data-testid="drafting-floating-tools-trigger"');
    expect(markup).toContain('data-testid="drafting-floating-view-cluster"');
    expect(markup).toContain('data-testid="drafting-floating-aids-cluster"');
    expect(markup).toContain('data-testid="drafting-floating-inspector-cluster"');
    expect(markup).toContain('data-testid="drafting-canvas-focus-restore"');
    expect(markup).toContain('data-testid="drafting-tool-button-project-grid-line"');
    expect(markup).toContain('data-testid="drafting-tool-button-shaft"');
    expect(markup).toContain('data-testid="drafting-tool-button-select"');
    expect(markup).toContain('data-testid="drafting-tool-button-pan"');
    expect(markup).toContain('Grid Line');
    expect(markup).toContain('Shaft');
    expect(markup).toContain('Tools');
    expect(markup).not.toContain('data-testid="drafting-canvas-controls"');
    expect(markup).toContain('aria-label="Restore canvas"');
    expect(markup).toContain('data-testid="drafting-project-grid-bubble"');
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
    expect(markup).toContain(
      'View lock protects pan/zoom only; object, layer, and underlay locks stay separate.',
    );
    expect(markup).toContain('View lock disables pan, zoom, fit, and recenter controls only.');
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

  it('renders generated wall handles as visible but non-editable', () => {
    const model = createEmptyDraftingModel('drawing-stage-generated-handles');
    const wall = createDraftingObject('secant_pile_wall', { x: 0, y: 0 }, model);
    const markup = renderToStaticMarkup(
      <DraftingStage
        canvasSize={{ width: 1200, height: 640 }}
        containerRef={React.createRef<HTMLDivElement>()}
        model={{ ...model, objects: [wall] }}
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
        selectedObjectId={wall.id}
        selectedUnderlayId={null}
        showDrawingSheetViewportOverlay={false}
        underlayCalibrationState={null}
        underlayCropPreview={null}
        underlayInteractionEnabled={() => false}
        view={model.view}
        viewLocked={false}
        visibleObjects={[wall]}
        visibleUnderlays={[]}
      />,
    );

    expect(markup).toContain('data-handle-id="baseline-0"');
    expect(markup).toContain('data-drafting-handle-editable="true"');
    expect(markup).toContain('data-handle-id="pile-centre-0"');
    expect(markup).toContain('data-drafting-handle-editable="false"');
    expect(markup).toContain('Generated from baseline points');
  });

  it('renders the active command prompt in the canvas status bar', () => {
    const model = createEmptyDraftingModel('drawing-stage-command-prompt');
    const markup = renderToStaticMarkup(
      <DraftingStage
        canvasSize={{ width: 1200, height: 640 }}
        commandPrompt="Pick start point"
        containerRef={React.createRef<HTMLDivElement>()}
        model={model}
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
        selectedObjectId={null}
        selectedUnderlayId={null}
        showDrawingSheetViewportOverlay={false}
        underlayCalibrationState={null}
        underlayCropPreview={null}
        underlayInteractionEnabled={() => false}
        view={model.view}
        viewLocked={false}
        visibleObjects={[]}
        visibleUnderlays={[]}
      />,
    );

    expect(markup).toContain('Pick start point');
  });
});
