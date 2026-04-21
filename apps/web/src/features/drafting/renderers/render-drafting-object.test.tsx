import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createEmptyDraftingModel } from '@eng/shared';
import { createDraftingObject } from '../model-utils';
import { renderDraftingObject } from './render-drafting-object';

describe('renderDraftingObject', () => {
  it('dispatches the current drafting object types to renderable SVG output', () => {
    const model = createEmptyDraftingModel('drawing-1');
    const pile = createDraftingObject('pile', { x: 1000, y: 2000 }, model);
    const monitoringPoint = createDraftingObject('monitoring_point', { x: 2000, y: 3000 }, model);
    const leaderNote = createDraftingObject('leader_note', { x: 3000, y: 4000 }, model);
    const excavationLine = createDraftingObject(
      'excavation_line',
      { x: 0, y: 0 },
      model,
      [
        { x: 0, y: 0 },
        { x: 2500, y: 500 },
        { x: 4000, y: 1500 },
      ],
    );

    const layerById = new Map(model.layers.map((layer) => [layer.id, layer]));
    const markup = renderToStaticMarkup(
      <svg>
        {[
          pile,
          monitoringPoint,
          leaderNote,
          excavationLine,
        ].map((object) => (
          <React.Fragment key={object.id}>
            {renderDraftingObject({
              isSelected: false,
              layer: layerById.get(object.layerId) ?? null,
              object,
              onPointerDown: () => undefined,
            })}
          </React.Fragment>
        ))}
      </svg>,
    );

    expect(markup).toContain('data-drafting-object="true"');
    expect(markup).toContain('P1');
    expect(markup).toContain('MP1');
    expect(markup).toContain('Draft note 1');
    expect(markup).toContain('EX1');
  });
});
