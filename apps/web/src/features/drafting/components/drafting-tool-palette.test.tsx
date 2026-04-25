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
    expect(markup.match(/data-testid="drafting-tool-group-block"/g)).toHaveLength(4);
    expect(markup.match(/data-testid="drafting-tool-group-grid"/g)).toHaveLength(4);
    expect(markup).toContain('Navigate');
    expect(markup).toContain('Shoring');
    expect(markup).toContain('Survey / Monitoring');
    expect(markup).toContain('Services');
    expect(markup).toContain('Annotation');
    expect(markup).toContain('grid-cols-4');
    expect(markup).toContain('grid-cols-2');
    expect(markup).toContain('Active Run');
    expect(markup).toContain('title="Service run"');
    expect(markup).toContain('aria-label="Service run"');
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).not.toContain('Add Secant Pile Wall');
    expect(markup).not.toContain('Add Service Crossing');
    expect(markup).not.toContain('Choose a tool, then author typed objects');
  });

  it('shows project-data choices for source-aware tools without flattening the palette', () => {
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
    expect(markup).toContain('data-testid="drafting-source-manager"');
    expect(markup).toContain('Pile source');
    expect(markup).toContain('Existing placed pile');
    expect(markup).toContain('Pile type library');
    expect(markup).toContain('Sketch pile (unlinked)');
    expect(markup).toContain('Existing placed piles / joints');
    expect(markup).toContain('Manual sketch objects');
    expect(markup).toContain('data-testid="drafting-source-pile-option"');
    expect(markup).toContain('Select placed object · P1');
    expect(markup.match(/data-testid="drafting-tool-group-block"/g)).toHaveLength(4);
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
    expect(markup).toContain('Foundation pile types');
    expect(markup).toContain('Place linked object');
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
});
