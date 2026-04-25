import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createDefaultDraftingLayers, type DraftingObject } from '@eng/shared';
import { DraftingPropertiesPanel } from './drafting-properties-panel';

describe('DraftingPropertiesPanel', () => {
  it('shows compact source controls for source-linked objects', () => {
    const markup = renderToStaticMarkup(
      <DraftingPropertiesPanel
        layers={createDefaultDraftingLayers()}
        object={linkedPile()}
        onDelete={() => undefined}
        onRefreshSource={() => undefined}
        onUpdate={() => undefined}
        sourceManageHref="/projects/project-1/pile-groups"
      />,
    );

    expect(markup).toContain('Source / Provenance');
    expect(markup).toContain('Existing placed pile');
    expect(markup).toContain('P1 from calculator');
    expect(markup).toContain('Coordinates come from the Foundations source');
    expect(markup).toContain('Refresh from source');
    expect(markup).toContain('Refresh + coordinates');
    expect(markup).toContain('Manage pile types');
    expect(markup).toContain('Unlink');
    expect(markup).toContain('Convert to sketch/unlinked');
  });

  it('shows stale pile type sources without moving the drafting position automatically', () => {
    const object = linkedPile();
    object.sourceRef = {
      sourceType: 'foundation_pile_type',
      sourceId: 'group-1:type:BP1',
      sourceLabel: 'BP1',
      sourceVersion: 'old-version',
      linkedAt: '2026-04-25T00:00:00.000Z',
      status: 'current',
      snapshot: {},
    };
    if (object.type === 'pile') {
      object.metadata.sourceCompleteness = 'partial';
    }

    const markup = renderToStaticMarkup(
      <DraftingPropertiesPanel
        layers={createDefaultDraftingLayers()}
        object={object}
        onDelete={() => undefined}
        onRefreshSource={() => undefined}
        onUpdate={() => undefined}
        sourceRefreshState="stale"
        sourceManageHref="/projects/project-1/pile-groups/group-1/multi-pile"
      />,
    );

    expect(markup).toContain('Pile type library');
    expect(markup).toContain('Source may have changed');
    expect(markup).toContain('keeps the current drafting position');
    expect(markup).toContain('partial');
  });
});

function linkedPile(): DraftingObject {
  return {
    id: 'pile-1',
    type: 'pile',
    layerId: 'piles',
    name: 'P1',
    visible: true,
    locked: false,
    geometry: {
      centre: { x: 0, y: 0 },
      diameterMm: 600,
    },
    metadata: {
      pileId: 'P1',
    },
    sourceRef: {
      sourceType: 'foundation_pile',
      sourceId: 'pile-db-1',
      sourceLabel: 'P1 from calculator',
      linkedAt: '2026-04-25T00:00:00.000Z',
      status: 'linked',
      snapshot: {
        diameter: 0.6,
      },
    },
    createdAt: '2026-04-25T00:00:00.000Z',
    updatedAt: '2026-04-25T00:00:00.000Z',
  };
}
