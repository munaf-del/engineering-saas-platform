import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  createDefaultDraftingLayers,
  createEmptyDraftingModel,
  type DraftingDimensionChainObject,
  type DraftingObject,
} from '@eng/shared';
import { createDraftingObject } from '../model-utils';
import { DraftingPropertiesPanel } from './drafting-properties-panel';

describe('DraftingPropertiesPanel', () => {
  it('shows a reconciled no-selection state across inspector tabs', () => {
    const markup = renderToStaticMarkup(
      <DraftingPropertiesPanel
        layers={createDefaultDraftingLayers()}
        object={null}
        onDelete={() => undefined}
        onUpdate={() => undefined}
      />,
    );

    expect(markup).toContain('No selection');
    expect(markup).toContain('Select a drafting object to edit properties');
    expect(markup).toContain('Layers, sources, underlays, sheets, and schedules');
    expect(markup).toContain('Object and layer locks are shown after selection.');
    expect(markup).toContain('Source provenance appears only for linked objects.');
  });

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
    expect(markup).toContain('Existing placed pile/joint');
    expect(markup).toContain('P1 from calculator');
    expect(markup).toContain('Coordinates come from the Foundations source');
    expect(markup).toContain('Refresh engineering fields');
    expect(markup).toContain('Refresh + coordinates');
    expect(markup).toContain('Manage source');
    expect(markup).toContain('Unlink');
    expect(markup).toContain('Convert to sketch/unlinked');
  });

  it('distinguishes selected object, layer, and hidden states', () => {
    const layers = createDefaultDraftingLayers().map((layer) =>
      layer.id === 'piles' ? { ...layer, locked: true } : layer,
    );
    const object = { ...linkedPile(), locked: true, visible: false };
    const markup = renderToStaticMarkup(
      <DraftingPropertiesPanel
        layers={layers}
        object={object}
        onDelete={() => undefined}
        onUpdate={() => undefined}
      />,
    );

    expect(markup).toContain('Object locked');
    expect(markup).toContain('Layer locked');
    expect(markup).toContain('Hidden');
    expect(markup).toContain('Layer Piles');
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
    expect(markup).toContain('Manage pile type');
  });

  it('labels linked borehole and sketch objects without pile terminology', () => {
    const markup = renderToStaticMarkup(
      <DraftingPropertiesPanel
        layers={createDefaultDraftingLayers()}
        object={linkedBorehole()}
        onDelete={() => undefined}
        onRefreshSource={() => undefined}
        onUpdate={() => undefined}
      />,
    );

    expect(markup).toContain('Linked borehole');
    expect(markup).toContain('nh');
    expect(markup).toContain('Refresh from source');
    expect(markup).not.toContain('Pile type library');
    expect(markup).not.toContain('Manage pile type');
  });

  it('shows resolved dimension witness anchor status for selected dimensions', () => {
    const line = draftLine();
    const dimension = anchoredDimension(line.id);
    const markup = renderToStaticMarkup(
      <DraftingPropertiesPanel
        layers={createDefaultDraftingLayers()}
        object={dimension}
        objects={[line, dimension]}
        onDelete={() => undefined}
        onUpdate={() => undefined}
      />,
    );

    expect(markup).toContain('Live anchors drive rendering');
    expect(markup).toContain('Resolved');
    expect(markup).toContain('draft line');
    expect(markup).toContain('endpoint 2');
  });

  it('shows project text style and child workspace controls for text-bearing objects', () => {
    const model = createEmptyDraftingModel('drawing-text-style-properties');
    const note = {
      ...createDraftingObject('leader_note', { x: 0, y: 0 }, model),
      workspaceId: 'workspace-shoring',
      style: {
        fontFamily: 'ISOCP',
        textHeightMm: 3.5,
        fontWeight: 'bold' as const,
        textAlign: 'center' as const,
      },
    };
    const markup = renderToStaticMarkup(
      <DraftingPropertiesPanel
        layers={model.layers}
        object={note}
        onDelete={() => undefined}
        onUpdate={() => undefined}
        onWorkspaceChange={() => undefined}
        workspaces={model.workspaces ?? []}
      />,
    );

    expect(markup).toContain('Text');
    expect(markup).toContain('AS1100 profile text presets');
    expect(markup).toContain('data-testid="drafting-text-font-family"');
    expect(markup).toContain('data-testid="drafting-text-height"');
    expect(markup).toContain('Custom height (mm)');
    expect(markup).toContain('Assigned workspace');
    expect(markup).toContain('data-testid="drafting-object-workspace-select"');
    expect(markup).toContain('Workspace filters model objects');
  });

  it('shows project grid editing controls and honours locked grid layers', () => {
    const model = createEmptyDraftingModel('drawing-project-grid-properties');
    const projectGrid = createDraftingObject('project_grid', { x: 0, y: 0 }, model);
    const markup = renderToStaticMarkup(
      <DraftingPropertiesPanel
        layers={model.layers}
        object={projectGrid}
        onDelete={() => undefined}
        onUpdate={() => undefined}
      />,
    );

    expect(markup).toContain('Project Grid Reference');
    expect(markup).toContain('Module size mm');
    expect(markup).toContain('X direction labels');
    expect(markup).toContain('Y direction labels');
    expect(markup).toContain('Bubble placement');
    expect(markup).toContain('requires project verification');

    const lockedMarkup = renderToStaticMarkup(
      <DraftingPropertiesPanel
        layers={model.layers.map((layer) =>
          layer.id === 'grid' ? { ...layer, locked: true } : layer,
        )}
        object={projectGrid}
        onDelete={() => undefined}
        onUpdate={() => undefined}
      />,
    );

    expect(lockedMarkup).toContain('Layer locked');
    expect(lockedMarkup).toContain(
      'Grid geometry and style edits are disabled while the object or layer is locked.',
    );
    expect(lockedMarkup).toContain('disabled=""');
  });

  it('shows independent project grid line controls without grouped spacing edits', () => {
    const model = createEmptyDraftingModel('drawing-project-grid-line-properties');
    const projectGridLine = createDraftingObject('project_grid_line', { x: 0, y: 0 }, model, [
      { x: 0, y: 0 },
      { x: 3000, y: 0 },
    ]);
    const markup = renderToStaticMarkup(
      <DraftingPropertiesPanel
        layers={model.layers}
        object={projectGridLine}
        onDelete={() => undefined}
        onUpdate={() => undefined}
      />,
    );

    expect(markup).toContain('Project Grid Line');
    expect(markup).toContain('Grid line ID');
    expect(markup).toContain('Start X');
    expect(markup).toContain('End Y');
    expect(markup).toContain('Bubble placement');
    expect(markup).toContain('Module notation');
    expect(markup).toContain('independent editable object');
    expect(markup).not.toContain('X direction labels');
    expect(markup).not.toContain('Y direction labels');
  });

  it('shows shaft controls for secant and contiguous pile layout symbols', () => {
    const model = createEmptyDraftingModel('drawing-shaft-properties');
    const shaft = createDraftingObject('shaft', { x: 0, y: 0 }, model, [
      { x: 0, y: 0 },
      { x: 1500, y: 0 },
    ]);
    const markup = renderToStaticMarkup(
      <DraftingPropertiesPanel
        layers={model.layers}
        object={shaft}
        onDelete={() => undefined}
        onUpdate={() => undefined}
      />,
    );

    expect(markup).toContain('Shaft Reference');
    expect(markup).toContain('Construction type');
    expect(markup).toContain('Secant piles');
    expect(markup).toContain('Contiguous piles');
    expect(markup).toContain('Pile diameter mm');
    expect(markup).toContain('Spacing mm');
    expect(markup).toContain('diagrammatic renderer output only');
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

function linkedBorehole(): DraftingObject {
  return {
    id: 'bh-1',
    type: 'borehole',
    layerId: 'boreholes',
    name: 'nh',
    visible: true,
    locked: false,
    geometry: {
      point: { x: 0, y: 0 },
    },
    parameters: {
      boreholeId: 'nh',
      label: 'nh',
      groundLevelRl: 12.3,
      terminationDepthM: 20,
    },
    metadata: {},
    sourceRef: {
      sourceType: 'geotech_borehole',
      sourceId: 'spatial-bh-1',
      sourceLabel: 'nh',
      linkedAt: '2026-04-25T00:00:00.000Z',
      status: 'current',
      snapshot: {},
    },
    createdAt: '2026-04-25T00:00:00.000Z',
    updatedAt: '2026-04-25T00:00:00.000Z',
  };
}

function draftLine(): DraftingObject {
  return {
    id: 'line-1',
    type: 'draft_line',
    layerId: 'notes',
    name: 'Line 1',
    visible: true,
    locked: false,
    geometry: {
      startPoint: { x: 0, y: 0 },
      endPoint: { x: 5000, y: 0 },
    },
    metadata: {
      lineId: 'L1',
    },
    createdAt: '2026-04-25T00:00:00.000Z',
    updatedAt: '2026-04-25T00:00:00.000Z',
  };
}

function anchoredDimension(sourceObjectId: string): DraftingDimensionChainObject {
  return {
    id: 'dim-1',
    type: 'dimension_chain',
    layerId: 'dimensions',
    name: 'Dimension 1',
    visible: true,
    locked: false,
    geometry: {
      points: [
        { x: 0, y: 0 },
        { x: 3000, y: 0 },
      ],
      offsetDistanceMm: 900,
    },
    parameters: {
      dimensionId: 'DIM1',
      unit: 'mm',
      precision: 0,
      showSegments: true,
      showTotal: false,
      textOverride: '',
    },
    metadata: {
      associatedObjectIds: [sourceObjectId],
      witnessAnchorRefs: [
        {
          sourceObjectId,
          anchorKind: 'endpoint',
          anchorIndex: 0,
          capturedCoordinate: { x: 0, y: 0 },
        },
        {
          sourceObjectId,
          anchorKind: 'endpoint',
          anchorIndex: 1,
          capturedCoordinate: { x: 3000, y: 0 },
        },
      ],
    },
    createdAt: '2026-04-25T00:00:00.000Z',
    updatedAt: '2026-04-25T00:00:00.000Z',
  };
}
