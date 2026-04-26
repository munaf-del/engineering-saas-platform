import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createEmptyDraftingModel, type DraftingDimensionChainObject } from '@eng/shared';
import { createDraftingObject } from '../model-utils';
import { renderDraftingObject } from './render-drafting-object';

describe('renderDraftingObject', () => {
  it('dispatches the current drafting object types to renderable SVG output', () => {
    const model = createEmptyDraftingModel('drawing-1');
    const pile = createDraftingObject('pile', { x: 1000, y: 2000 }, model);
    const secantWall = createDraftingObject('secant_pile_wall', { x: 1200, y: 2200 }, model);
    const soldierWall = createDraftingObject('soldier_pile_wall', { x: 1400, y: 2400 }, model);
    const anchor = createDraftingObject('anchor_tieback', { x: 1600, y: 2600 }, model);
    const cappingBeam = createDraftingObject('capping_beam', { x: 1800, y: 2800 }, model);
    const waler = createDraftingObject('waler', { x: 2000, y: 3000 }, model);
    const monitoringPoint = createDraftingObject('monitoring_point', { x: 2000, y: 3000 }, model);
    const leaderNote = createDraftingObject('leader_note', { x: 3000, y: 4000 }, model);
    const dimensionChain = createDraftingObject('dimension_chain', { x: 3200, y: 4400 }, model);
    const callout = createDraftingObject('callout', { x: 3400, y: 4600 }, model);
    const sectionMarker = createDraftingObject('section_marker', { x: 3600, y: 4800 }, model);
    const borehole = createDraftingObject('borehole', { x: 3800, y: 5000 }, model);
    const serviceRun = createDraftingObject('service_run', { x: 4000, y: 5200 }, model);
    const serviceCrossing = createDraftingObject('service_crossing', { x: 4200, y: 5400 }, model);
    const line = createDraftingObject('draft_line', { x: 0, y: 0 }, model, [
      { x: 0, y: 0 },
      { x: 1200, y: 0 },
    ]);
    const rectangle = createDraftingObject('draft_rectangle', { x: 0, y: 0 }, model, [
      { x: 0, y: 0 },
      { x: 1200, y: 600 },
    ]);
    const circle = createDraftingObject('draft_circle', { x: 0, y: 0 }, model, [
      { x: 0, y: 0 },
      { x: 450, y: 0 },
    ]);
    const polygon = createDraftingObject('draft_polygon', { x: 0, y: 0 }, model, [
      { x: 0, y: 0 },
      { x: 800, y: 0 },
      { x: 400, y: 700 },
    ]);
    const joint = createDraftingObject('structural_joint', { x: 500, y: 500, rl: 12.3 }, model);
    const excavationLine = createDraftingObject('excavation_line', { x: 0, y: 0 }, model, [
      { x: 0, y: 0 },
      { x: 2500, y: 500 },
      { x: 4000, y: 1500 },
    ]);

    const layerById = new Map(model.layers.map((layer) => [layer.id, layer]));
    const markup = renderToStaticMarkup(
      <svg>
        {[
          pile,
          secantWall,
          soldierWall,
          anchor,
          cappingBeam,
          waler,
          monitoringPoint,
          leaderNote,
          dimensionChain,
          callout,
          sectionMarker,
          borehole,
          serviceRun,
          serviceCrossing,
          line,
          rectangle,
          circle,
          polygon,
          joint,
          excavationLine,
        ].map((object) => (
          <React.Fragment key={object.id}>
            {renderDraftingObject({
              drawingSetup: model.drawingSetup,
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
    expect(markup).toContain('SEC1');
    expect(markup).toContain('SOL1');
    expect(markup).toContain('A1');
    expect(markup).toContain('CB1');
    expect(markup).toContain('W1');
    expect(markup).toContain('MP1');
    expect(markup).toContain('Draft note 1');
    expect(markup).toContain('DIM1');
    expect(markup).toContain('Callout 1');
    expect(markup).toContain('S1');
    expect(markup).toContain('BH-01');
    expect(markup).toContain('SR1');
    expect(markup).toContain('SC1');
    expect(markup).toContain('J-NEW-001');
    expect(markup).toContain('EX1');
    expect(markup).toContain('vector-effect="non-scaling-stroke"');
  });

  it('renders dimensions as AS-style linework with witnesses and terminators', () => {
    const model = createEmptyDraftingModel('dimension-render');
    const dimension = createDraftingObject('dimension_chain', { x: 0, y: 0 }, model, [
      { x: 0, y: 0 },
      { x: 3000, y: 0 },
      { x: 5000, y: 0 },
      { x: 0, y: -900 },
    ]);
    const markup = renderToStaticMarkup(
      <svg>
        {renderDraftingObject({
          drawingSetup: model.drawingSetup,
          isSelected: false,
          layer: model.layers.find((layer) => layer.id === dimension.layerId) ?? null,
          object: dimension,
          onPointerDown: () => undefined,
        })}
      </svg>,
    );

    expect(markup).toContain('data-dimension-id="DIM1"');
    expect(markup).toContain('3000 mm');
    expect(markup).toContain('2000 mm');
    expect(markup).toContain('5000 mm');
    expect(markup.match(/3000 mm/g)).toHaveLength(1);
    expect(markup.match(/2000 mm/g)).toHaveLength(1);
    expect(markup.match(/5000 mm/g)).toHaveLength(1);
    expect(markup).toContain('paint-order="stroke"');
    expect(markup).toContain('vector-effect="non-scaling-stroke"');
    expect(markup).not.toContain(`${dimension.id}-node`);
  });

  it('resolves snapped dimension witness anchors against moved source geometry', () => {
    const model = createEmptyDraftingModel('dimension-anchor-render');
    const line = createDraftingObject('draft_line', { x: 0, y: 0 }, model, [
      { x: 0, y: 0 },
      { x: 4000, y: 0 },
    ]);
    const baseDimension = createDraftingObject('dimension_chain', { x: 0, y: 0 }, model, [
      { x: 0, y: 0 },
      { x: 3000, y: 0 },
      { x: 0, y: -900 },
    ]) as DraftingDimensionChainObject;
    const dimension: DraftingDimensionChainObject = {
      ...baseDimension,
      metadata: {
        associatedObjectIds: [line.id],
        witnessAnchorRefs: [
          {
            sourceObjectId: line.id,
            anchorKind: 'endpoint',
            anchorIndex: 0,
            capturedCoordinate: { x: 0, y: 0 },
          },
          {
            sourceObjectId: line.id,
            anchorKind: 'endpoint',
            anchorIndex: 1,
            capturedCoordinate: { x: 3000, y: 0 },
          },
        ],
      },
    };
    const markup = renderToStaticMarkup(
      <svg>
        {renderDraftingObject({
          allObjects: [line, dimension],
          drawingSetup: model.drawingSetup,
          isSelected: false,
          layer: model.layers.find((layer) => layer.id === dimension.layerId) ?? null,
          object: dimension,
          onPointerDown: () => undefined,
        })}
      </svg>,
    );

    expect(markup).toContain('4000 mm');
    expect(markup).not.toContain('3000 mm');
  });

  it('uses profile-resolved line weights without removing non-scaling strokes', () => {
    const model = {
      ...createEmptyDraftingModel('drawing-profile-render'),
      drawingSetup: {
        ...createEmptyDraftingModel('drawing-profile-render').drawingSetup!,
        outputLineWeightScale: 2,
      },
    };
    const pile = {
      ...createDraftingObject('pile', { x: 1000, y: 2000 }, model),
      style: { stroke: '#111827' },
    };
    const markup = renderToStaticMarkup(
      <svg>
        {renderDraftingObject({
          drawingSetup: model.drawingSetup,
          isSelected: false,
          layer: model.layers.find((layer) => layer.id === pile.layerId) ?? null,
          object: pile,
          onPointerDown: () => undefined,
        })}
      </svg>,
    );

    expect(markup).toContain('stroke-width="2.8"');
    expect(markup).toContain('vector-effect="non-scaling-stroke"');
  });

  it('renders sheet strokes from paper-mm line weights', () => {
    const model = createEmptyDraftingModel('drawing-profile-sheet-render');
    const pile = createDraftingObject('pile', { x: 1000, y: 2000 }, model);
    const markup = renderToStaticMarkup(
      <svg>
        {renderDraftingObject({
          drawingSetup: model.drawingSetup,
          isSelected: false,
          layer: model.layers.find((layer) => layer.id === pile.layerId) ?? null,
          object: pile,
          onPointerDown: () => undefined,
          surface: 'sheet',
        })}
      </svg>,
    );

    expect(markup).toContain('stroke-width="0.35"');
    expect(markup).not.toContain('vector-effect="non-scaling-stroke"');
  });

  it('renders drafting objects as linework-first profile-driven symbols', () => {
    const model = createEmptyDraftingModel('drawing-profile-wall-render');
    const pile = createDraftingObject('pile', { x: 1000, y: 2000 }, model);
    const secantWall = createDraftingObject('secant_pile_wall', { x: 1200, y: 2200 }, model);
    const soldierWall = createDraftingObject('soldier_pile_wall', { x: 1400, y: 2400 }, model);
    const cappingBeam = createDraftingObject('capping_beam', { x: 1800, y: 2800 }, model);
    const waler = createDraftingObject('waler', { x: 2000, y: 3000 }, model);
    const serviceRun = createDraftingObject('service_run', { x: 4000, y: 5200 }, model);
    const serviceCrossing = createDraftingObject('service_crossing', { x: 4200, y: 5400 }, model);
    const borehole = createDraftingObject('borehole', { x: 3800, y: 5000 }, model);
    const monitoringPoint = createDraftingObject('monitoring_point', { x: 2000, y: 3000 }, model);
    const callout = createDraftingObject('callout', { x: 3400, y: 4600 }, model);
    const sectionMarker = createDraftingObject('section_marker', { x: 3600, y: 4800 }, model);
    const markup = renderToStaticMarkup(
      <svg>
        {[
          pile,
          secantWall,
          soldierWall,
          cappingBeam,
          waler,
          serviceRun,
          serviceCrossing,
          borehole,
          monitoringPoint,
          callout,
          sectionMarker,
        ].map((object) => (
          <React.Fragment key={object.id}>
            {renderDraftingObject({
              drawingSetup: model.drawingSetup,
              isSelected: false,
              layer: model.layers.find((layer) => layer.id === object.layerId) ?? null,
              object,
              onPointerDown: () => undefined,
            })}
          </React.Fragment>
        ))}
      </svg>,
    );

    expect(markup).toContain('fill="none"');
    expect(markup).toContain('stroke="#111827"');
    expect(markup).toContain('paint-order="stroke"');
    expect(markup).not.toContain('stroke-width="55"');
    expect(markup).not.toContain('stroke-width="65"');
    expect(markup).not.toContain('#fdba74');
    expect(markup).not.toContain('#dcfce7');
    expect(markup).not.toContain('#fdba74');
    expect(markup).not.toContain('#dcfce7');
    expect(markup).not.toContain('#fee2e2');
  });

  it('uses profile roles for pile, secant wall, and soldier wall rendering', () => {
    const model = createEmptyDraftingModel('drawing-profile-role-render');
    const pile = createDraftingObject('pile', { x: 1000, y: 2000 }, model);
    const secantWall = createDraftingObject('secant_pile_wall', { x: 1200, y: 2200 }, model);
    const soldierWall = createDraftingObject('soldier_pile_wall', { x: 1400, y: 2400 }, model);
    const layerById = new Map(model.layers.map((layer) => [layer.id, layer]));
    const markup = renderToStaticMarkup(
      <svg>
        {[pile, secantWall, soldierWall].map((object) => (
          <React.Fragment key={object.id}>
            {renderDraftingObject({
              drawingSetup: model.drawingSetup,
              isSelected: false,
              layer: layerById.get(object.layerId) ?? null,
              object,
              onPointerDown: () => undefined,
            })}
          </React.Fragment>
        ))}
      </svg>,
    );

    expect(pile.style?.stroke).toBeUndefined();
    expect(secantWall.style?.stroke).toBeUndefined();
    expect(soldierWall.style?.stroke).toBeUndefined();
    expect(markup).toContain('stroke-width="1.4"');
    expect(markup).toContain('vector-effect="non-scaling-stroke"');
  });
});
