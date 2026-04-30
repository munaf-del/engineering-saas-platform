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

    expect(markup).toContain('data-testid="drafting-compact-tool-toolbar"');
    expect(markup).toContain('data-testid="drafting-toolbar-view-row"');
    expect(markup).toContain('data-testid="drafting-toolbar-authoring-row"');
    expect(markup).toContain('data-testid="drafting-tool-palette-mode"');
    expect(markup).toContain('Manual + source-aware tools');
    expect(markup.match(/data-testid="drafting-tool-group-block"/g)).toHaveLength(6);
    expect(markup.match(/data-testid="drafting-tool-group-grid"/g)).toHaveLength(6);
    expect(markup).toContain('Navigate');
    expect(markup).toContain('Shoring');
    expect(markup).toContain('Survey / Monitoring');
    expect(markup).toContain('Services');
    expect(markup).toContain('Geometry');
    expect(markup).toContain('Reference');
    expect(markup).toContain('Annotation');
    expect(markup).toContain('grid-cols-4');
    expect(markup).toContain('grid-cols-2');
    expect(markup).toContain('Active Run');
    expect(markup).toContain('title="Service run"');
    expect(markup).toContain('aria-label="Service run"');
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain('data-testid="drafting-project-grid-line-tool"');
    expect(markup).toContain('data-testid="drafting-shaft-tool"');
    expect(markup).toContain('Project grid line');
    expect(markup).toContain('Shaft');
    expect(markup).not.toContain('Add Secant Pile Wall');
    expect(markup).not.toContain('Add Service Crossing');
    expect(markup).not.toContain('Choose a tool, then author typed objects');
  });

  it('shows a focused project grid action for independent persisted grid references', () => {
    const markup = renderToStaticMarkup(
      <DraftingToolPalette
        activeTool="project_grid_line"
        drawingUpdatedAt="2026-04-25T00:00:00.000Z"
        model={createEmptyDraftingModel('drawing-project-grid-tool')}
        onAddProjectGrid={() => undefined}
        onCancelLine={() => undefined}
        onFinishLine={() => undefined}
        onToolChange={() => undefined}
        pendingLinePointsCount={0}
      />,
    );

    expect(markup).toContain('data-testid="drafting-project-grid-tool-panel"');
    expect(markup).toContain('data-testid="drafting-project-grid-add"');
    expect(markup).toContain('Project grid references');
    expect(markup).toContain('precise two-point grid line');
    expect(markup).toContain('independent grid-line objects');
    expect(markup).toContain('Add Grid Set Estimate');
    expect(markup).toContain('AS1100-informed modular grid style');
  });

  it('shows pile-only source choices for the pile tool without flattening the palette', () => {
    const markup = renderToStaticMarkup(
      <DraftingToolPalette
        activeTool="pile"
        drawingUpdatedAt="2026-04-25T00:00:00.000Z"
        model={createEmptyDraftingModel('drawing-source-tools')}
        onCancelLine={() => undefined}
        onFinishLine={() => undefined}
        onPlacePileSource={() => undefined}
        onToolChange={() => undefined}
        pendingLinePointsCount={0}
        placedSourceIds={['pile-db-1']}
        pileSourceMode="linked_pile"
        pileTypeSources={[
          {
            sourceType: 'foundation_pile_type',
            sourceId: 'group-1:type:BP1',
            sourceLabel: 'BP1',
            groupId: 'group-1',
            groupName: 'North wall',
            pileType: pileType('BP1', 600, { concreteGrade: 'C40', socketLengthM: 3 }),
          },
        ]}
        pileSources={[
          {
            sourceType: 'foundation_pile',
            sourceId: 'pile-db-1',
            sourceLabel: 'P1',
            groupId: 'group-1',
            groupName: 'North wall',
            pile: {
              id: 'pile-db-1',
              pileGroupId: 'group-1',
              name: 'P1',
              pileType: 'bored',
              diameter: 0.6,
              length: 12,
            },
          },
        ]}
      />,
    );

    expect(markup).toContain('data-testid="drafting-source-choice-panel"');
    expect(markup).not.toContain('data-testid="drafting-source-manager"');
    expect(markup).toContain('Show Project Sources overview');
    expect(markup).toContain('Pile source');
    expect(markup).toContain('Existing placed pile');
    expect(markup).toContain('Pile type library');
    expect(markup).toContain('Sketch pile (unlinked)');
    expect(markup).toContain('Existing placed piles / joints');
    expect(markup).toContain('BP1 · 600 mm · C40 · socket 3 m');
    expect(markup).toContain('data-testid="drafting-source-pile-option"');
    expect(markup).toContain('Select placed drafting object · P1');
    expect(markup).toContain('Place linked pile');
    expect(markup.match(/data-testid="drafting-tool-group-block"/g)).toHaveLength(6);
    expect(markup).not.toContain('Linked boreholes');
  });

  it('explains when pile types exist but placed pile instances do not', () => {
    const markup = renderToStaticMarkup(
      <DraftingToolPalette
        activeTool="pile"
        drawingUpdatedAt="2026-04-25T00:00:00.000Z"
        model={createEmptyDraftingModel('drawing-source-pile-types')}
        onCancelLine={() => undefined}
        onFinishLine={() => undefined}
        onPileSourceModeChange={() => undefined}
        onSelectPileTypeSource={() => undefined}
        onToolChange={() => undefined}
        pendingLinePointsCount={0}
        pileSourceMode="pile_type"
        pileTypeSources={[
          {
            sourceType: 'foundation_pile_type',
            sourceId: 'group-1:type:BP1',
            sourceLabel: 'BP1',
            groupId: 'group-1',
            groupName: 'foundation piles',
            pileType: {
              id: 'BP1',
              displayName: 'BP1',
              sizePreset: '600',
              useCustom: false,
              customMm: 600,
              Dmm: 600,
              nominalDiameterMm: 600,
              eoop: 0.075,
              eoopM: 0.075,
              compressionUltimateMin: null,
              compressionUltimateMax: null,
              tensionUltimateMin: null,
              tensionUltimateMax: null,
              concreteGrade: 'C40',
              socketLengthM: 3,
              active: true,
              order: 0,
            },
          },
        ]}
      />,
    );

    expect(markup).toContain(
      'Pile types found, but no placed pile instances yet. Select a pile type and place it on the model, or create pile instances in Foundations.',
    );
    expect(markup).toContain('data-testid="drafting-source-pile-type-option"');
    expect(markup).toContain('Complete');
    expect(markup).toContain('BP1 · 600 mm · C40 · socket 3 m');
    expect(markup).toContain('Pile type library');
    expect(markup).toContain('Place linked pile');
    expect(markup).not.toContain('No project pile design records found');
  });

  it('labels incomplete pile type sources as diameter-only instead of a flat incomplete state', () => {
    const markup = renderToStaticMarkup(
      <DraftingToolPalette
        activeTool="pile"
        drawingUpdatedAt="2026-04-25T00:00:00.000Z"
        model={createEmptyDraftingModel('drawing-source-pile-types-diameter-only')}
        onCancelLine={() => undefined}
        onFinishLine={() => undefined}
        onPileSourceModeChange={() => undefined}
        onSelectPileTypeSource={() => undefined}
        onToolChange={() => undefined}
        pendingLinePointsCount={0}
        pileSourceMode="pile_type"
        pileTypeSources={[
          {
            sourceType: 'foundation_pile_type',
            sourceId: 'group-1:type:BP2',
            sourceLabel: 'BP2',
            groupId: 'group-1',
            groupName: 'foundation piles',
            pileType: {
              id: 'BP2',
              displayName: 'BP2',
              sizePreset: '750',
              useCustom: false,
              customMm: 600,
              Dmm: 750,
              nominalDiameterMm: 750,
              eoop: 0.075,
              eoopM: 0.075,
              compressionUltimateMin: null,
              compressionUltimateMax: null,
              tensionUltimateMin: null,
              tensionUltimateMax: null,
              active: true,
              order: 0,
            },
          },
        ]}
      />,
    );

    expect(markup).toContain('Diameter only');
    expect(markup).toContain('BP2 · 750 mm · missing concrete/socket/founding');
  });

  it('shows only borehole sources when the borehole tool is active', () => {
    const markup = renderToStaticMarkup(
      <DraftingToolPalette
        activeTool="borehole"
        drawingUpdatedAt="2026-04-25T00:00:00.000Z"
        model={createEmptyDraftingModel('drawing-borehole-source-tools')}
        onCancelLine={() => undefined}
        onFinishLine={() => undefined}
        onPlaceSpatialSource={() => undefined}
        onToolChange={() => undefined}
        pendingLinePointsCount={0}
        pileTypeSources={[
          {
            sourceType: 'foundation_pile_type',
            sourceId: 'group-1:type:BP1',
            sourceLabel: 'BP1',
            groupId: 'group-1',
            groupName: 'foundation piles',
            pileType: pileType('BP1', 600),
          },
        ]}
        spatialSources={[
          {
            sourceType: 'spatial_feature',
            sourceId: 'spatial-bh-1',
            sourceLabel: 'nh',
            objectType: 'borehole',
            feature: spatialFeature('spatial-bh-1', 'borehole', 'nh'),
          },
        ]}
      />,
    );

    expect(markup).toContain('Borehole source');
    expect(markup).toContain('Linked boreholes');
    expect(markup).toContain('Sketch borehole (unlinked)');
    expect(markup).toContain('Place linked borehole · nh');
    expect(markup).not.toContain('Pile type library');
    expect(markup).not.toContain('Manage project pile types');
    expect(markup).not.toContain('BP1');
  });

  it('does not show pile source controls for monitoring or service tools', () => {
    for (const activeTool of ['monitoring_point', 'service_run', 'service_crossing'] as const) {
      const markup = renderToStaticMarkup(
        <DraftingToolPalette
          activeTool={activeTool}
          drawingUpdatedAt="2026-04-25T00:00:00.000Z"
          model={createEmptyDraftingModel(`drawing-${activeTool}-source-tools`)}
          onCancelLine={() => undefined}
          onFinishLine={() => undefined}
          onPlaceSpatialSource={() => undefined}
          onToolChange={() => undefined}
          pendingLinePointsCount={0}
          pileTypeSources={[
            {
              sourceType: 'foundation_pile_type',
              sourceId: 'group-1:type:BP1',
              sourceLabel: 'BP1',
              groupId: 'group-1',
              groupName: 'foundation piles',
              pileType: pileType('BP1', 600),
            },
          ]}
          spatialSources={[
            {
              sourceType: 'spatial_feature',
              sourceId: `spatial-${activeTool}-1`,
              sourceLabel: activeTool === 'monitoring_point' ? 'MP01' : 'SVC01',
              objectType: activeTool,
              feature: spatialFeature(`spatial-${activeTool}-1`, activeTool, 'SVC01'),
            },
          ]}
        />,
      );

      expect(markup).not.toContain('Pile type library');
      expect(markup).not.toContain('Manage project pile types');
      expect(markup).not.toContain('BP1');
      if (activeTool === 'monitoring_point') {
        expect(markup).toContain('Linked monitoring points');
        expect(markup).toContain('Sketch monitoring point (unlinked)');
      } else if (activeTool === 'service_run') {
        expect(markup).toContain('Existing project service runs');
        expect(markup).toContain('Sketch service run (unlinked)');
      } else {
        expect(markup).toContain('Existing project crossings');
        expect(markup).toContain('Sketch crossing (unlinked)');
      }
    }
  });

  it('hides the active source picker for select and pan tools', () => {
    for (const activeTool of ['select', 'pan'] as const) {
      const markup = renderToStaticMarkup(
        <DraftingToolPalette
          activeTool={activeTool}
          drawingUpdatedAt="2026-04-25T00:00:00.000Z"
          model={createEmptyDraftingModel(`drawing-${activeTool}-hint`)}
          onCancelLine={() => undefined}
          onFinishLine={() => undefined}
          onToolChange={() => undefined}
          pendingLinePointsCount={0}
        />,
      );

      expect(markup).toContain('data-testid="drafting-tool-source-readiness-note"');
      expect(markup).toContain(
        'Select a tool to place drafting objects. Source-linked tools preserve project provenance where available.',
      );
      expect(markup).not.toContain('data-testid="drafting-source-choice-panel"');
    }
  });
});

function spatialFeature(
  id: string,
  objectType: 'borehole' | 'monitoring_point' | 'service_run' | 'service_crossing',
  label: string,
) {
  return {
    id,
    projectId: 'project-1',
    featureType:
      objectType === 'borehole'
        ? ('borehole' as const)
        : objectType === 'monitoring_point'
          ? ('vibration_monitor' as const)
          : objectType,
    geometryType: objectType === 'service_run' ? ('line_string' as const) : ('point' as const),
    label,
    description: null,
    geometryJson:
      objectType === 'service_run'
        ? {
            type: 'LineString' as const,
            coordinates: [[0, 0] as [number, number], [10, 0] as [number, number]],
          }
        : { type: 'Point' as const, coordinates: [0, 0] as [number, number] },
    status: 'current',
    sourceType: null,
    sourceReference: null,
    linkedProjectReferenceId: null,
    linkedAiDocumentId: null,
    linkedDeliverableType: null,
    linkedDeliverableId: null,
    propertiesJson: null,
    sortOrder: 0,
    createdAt: '2026-04-25T00:00:00.000Z',
    updatedAt: '2026-04-25T00:00:00.000Z',
  };
}

function pileType(
  id: string,
  diameterMm: number,
  overrides: Partial<{
    concreteGrade: string;
    socketLengthM: number;
  }> = {},
) {
  return {
    id,
    displayName: id,
    sizePreset: String(diameterMm),
    useCustom: false,
    customMm: diameterMm,
    Dmm: diameterMm,
    nominalDiameterMm: diameterMm,
    eoop: 0.075,
    eoopM: 0.075,
    compressionUltimateMin: null,
    compressionUltimateMax: null,
    tensionUltimateMin: null,
    tensionUltimateMax: null,
    active: true,
    order: 0,
    ...overrides,
  };
}
