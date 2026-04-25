import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createEmptyDraftingModel } from '@eng/shared';
import { DraftingToolPalette } from './drafting-tool-palette';

describe('DraftingToolPalette', () => {
  it('renders compact grouped tools with an obvious active state', () => {
    const markup = renderToStaticMarkup(
      <DraftingToolPalette
        activeTool="service_run"
        drawingUpdatedAt="2026-04-25T00:00:00.000Z"
        model={createEmptyDraftingModel('drawing-tools')}
        onCancelLine={() => undefined}
        onFinishLine={() => undefined}
        onToolChange={() => undefined}
        pendingLinePointsCount={0}
      />,
    );

    expect(markup).toContain('Navigate');
    expect(markup).toContain('Shoring');
    expect(markup).toContain('Survey / Monitoring');
    expect(markup).toContain('Services');
    expect(markup).toContain('Annotation');
    expect(markup).toContain('title="Service run"');
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).not.toContain('Add Secant Pile Wall');
    expect(markup).not.toContain('Add Service Crossing');
  });
});
