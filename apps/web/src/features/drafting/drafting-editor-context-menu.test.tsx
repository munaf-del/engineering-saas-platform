/* @vitest-environment jsdom */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createEmptyDraftingModel } from '@eng/shared';
import { createDraftingObject } from './model-utils';
import { DraftingContextMenu } from './components/drafting-context-menu';

describe('DraftingContextMenu', () => {
  it('shows object-specific actions and locked edit reasons', () => {
    const model = createEmptyDraftingModel('drawing-object-context-menu');
    const gridLine = {
      ...createDraftingObject('project_grid_line', { x: 0, y: 0 }, model, [
        { x: 0, y: 0 },
        { x: 3000, y: 0 },
      ]),
      locked: true,
    };
    const markup = renderToStaticMarkup(
      <DraftingContextMenu
        contextMenu={{ kind: 'object', objectId: gridLine.id, x: 100, y: 120 }}
        helperGridVisible
        model={{ ...model, objects: [gridLine] }}
        onClose={() => undefined}
        onDeleteObject={() => undefined}
        onFitModel={() => undefined}
        onObjectUpdate={() => undefined}
        onOpenProperties={() => undefined}
        onSetTool={() => undefined}
        onToggleHelperGrid={() => undefined}
        onToggleSnap={() => undefined}
        snapEnabled
      />,
    );

    expect(markup).toContain('data-testid="drafting-object-context-menu"');
    expect(markup).toContain('Open properties');
    expect(markup).toContain('Unlock object');
    expect(markup).toContain('Toggle grid bubbles');
    expect(markup).toContain('Locked object or layer blocks editing actions.');
  });

  it('shows useful empty-canvas actions without source adapter data', () => {
    const model = createEmptyDraftingModel('drawing-canvas-context-menu');
    const markup = renderToStaticMarkup(
      <DraftingContextMenu
        contextMenu={{ kind: 'canvas', x: 200, y: 240 }}
        helperGridVisible={false}
        model={model}
        onClose={() => undefined}
        onDeleteObject={() => undefined}
        onFitModel={() => undefined}
        onObjectUpdate={() => undefined}
        onOpenProperties={() => undefined}
        onSetTool={() => undefined}
        onToggleHelperGrid={() => undefined}
        onToggleSnap={() => undefined}
        snapEnabled={false}
      />,
    );

    expect(markup).toContain('data-testid="drafting-canvas-context-menu"');
    expect(markup).toContain('Select tool');
    expect(markup).toContain('Pan tool');
    expect(markup).toContain('Start grid line');
    expect(markup).toContain('Add note');
    expect(markup).toContain('Helper grid on');
    expect(markup).toContain('Snap on');
    expect(markup).not.toContain('provenance');
  });
});
