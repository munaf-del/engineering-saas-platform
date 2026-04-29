import { describe, expect, it } from 'vitest';
import { createEmptyDraftingModel, type DraftingDimensionChainObject } from '@eng/shared';
import { createDraftingObject } from '../model-utils';
import {
  createManualDraftingPointAnchorRef,
  resolveDraftingDimensionAnchoredObject,
  resolveDraftingDimensionWitnessAnchors,
  resolveDraftingPointAnchor,
} from './drafting-anchor-resolution';

describe('drafting anchor resolution', () => {
  it('resolves dimension witness points against moved draft line endpoints', () => {
    const model = createEmptyDraftingModel('anchor-line');
    const line = createDraftingObject('draft_line', { x: 0, y: 0 }, model, [
      { x: 0, y: 0 },
      { x: 4000, y: 0 },
    ]);
    if (line.type !== 'draft_line') {
      throw new Error('Expected draft line');
    }

    const dimension = createAnchoredDimension(line.id);
    const movedLine = {
      ...line,
      geometry: {
        ...line.geometry,
        endPoint: { x: 5200, y: 300 },
      },
    };

    const resolved = resolveDraftingDimensionAnchoredObject(dimension, [movedLine, dimension]);

    expect(resolved.geometry.points[0]).toEqual({ x: 0, y: 0 });
    expect(resolved.geometry.points[1]).toEqual({ x: 5200, y: 300 });
  });

  it('reports missing source anchors while keeping captured fallback coordinates visible', () => {
    const dimension = createAnchoredDimension('missing-line');
    const [start, end] = resolveDraftingDimensionWitnessAnchors(dimension, []);

    expect(start?.status).toBe('missing');
    expect(start?.point).toEqual({ x: 0, y: 0 });
    expect(end?.status).toBe('missing');
    expect(end?.point).toEqual({ x: 3000, y: 0 });
  });

  it('falls back when the source exists but the indexed vertex is unavailable', () => {
    const model = createEmptyDraftingModel('anchor-polyline');
    const polyline = createDraftingObject('draft_polyline', { x: 0, y: 0 }, model, [
      { x: 0, y: 0 },
      { x: 1000, y: 0 },
    ]);
    if (polyline.type !== 'draft_polyline') {
      throw new Error('Expected draft polyline');
    }

    const resolved = resolveDraftingPointAnchor(
      {
        sourceObjectId: polyline.id,
        anchorKind: 'vertex',
        anchorIndex: 4,
        capturedCoordinate: { x: 4000, y: 0 },
      },
      [polyline],
    );

    expect(resolved.status).toBe('fallback');
    expect(resolved.point).toEqual({ x: 4000, y: 0 });
    expect(resolved.sourceObjectType).toBe('draft_polyline');
  });

  it('resolves service vertices, wall baseline endpoints, and pile centres', () => {
    const model = createEmptyDraftingModel('anchor-families');
    const serviceRun = createDraftingObject('service_run', { x: 0, y: 0 }, model, [
      { x: 0, y: 0 },
      { x: 1000, y: 500 },
      { x: 2400, y: 500 },
    ]);
    const wall = createDraftingObject('secant_pile_wall', { x: 0, y: 0 }, model, [
      { x: 10, y: 20 },
      { x: 3010, y: 20 },
    ]);
    const pile = createDraftingObject('pile', { x: 700, y: 800 }, model);
    if (
      serviceRun.type !== 'service_run' ||
      wall.type !== 'secant_pile_wall' ||
      pile.type !== 'pile'
    ) {
      throw new Error('Expected drafting object families');
    }

    expect(
      resolveDraftingPointAnchor(
        {
          sourceObjectId: serviceRun.id,
          anchorKind: 'vertex',
          anchorIndex: 1,
          capturedCoordinate: { x: 0, y: 0 },
        },
        [serviceRun],
      ).point,
    ).toEqual({ x: 1000, y: 500 });
    expect(
      resolveDraftingPointAnchor(
        {
          sourceObjectId: wall.id,
          anchorKind: 'endpoint',
          anchorIndex: 1,
          capturedCoordinate: { x: 0, y: 0 },
        },
        [wall],
      ).point,
    ).toEqual({ x: 3010, y: 20 });
    expect(
      resolveDraftingPointAnchor(
        {
          sourceObjectId: pile.id,
          anchorKind: 'centre',
          anchorIndex: 0,
          capturedCoordinate: { x: 0, y: 0 },
        },
        [pile],
      ).point,
    ).toEqual({ x: 700, y: 800 });
  });

  it('prefers per-point snap refs over compressed legacy metadata arrays', () => {
    const model = createEmptyDraftingModel('anchor-legacy');
    const line = createDraftingObject('draft_line', { x: 0, y: 0 }, model, [
      { x: 0, y: 0 },
      { x: 4200, y: 0 },
    ]);
    if (line.type !== 'draft_line') {
      throw new Error('Expected draft line');
    }
    const dimension = createAnchoredDimension(line.id);
    const legacyDimension: DraftingDimensionChainObject = {
      ...dimension,
      geometry: {
        ...dimension.geometry,
        points: [
          { x: 0, y: 0 },
          {
            x: 3000,
            y: 0,
            snapRef: {
              sourceObjectId: line.id,
              anchorKind: 'endpoint',
              anchorIndex: 1,
              capturedCoordinate: { x: 3000, y: 0 },
            },
          },
        ],
      },
      metadata: {
        ...dimension.metadata,
        witnessAnchorRefs: [
          createManualDraftingPointAnchorRef({ x: 0, y: 0 }, 'Legacy manual point'),
        ],
      },
    };

    const resolved = resolveDraftingDimensionAnchoredObject(legacyDimension, [line]);

    expect(resolved.geometry.points[0]).toEqual({ x: 0, y: 0 });
    expect(resolved.geometry.points[1]).toEqual({ x: 4200, y: 0 });
  });
});

function createAnchoredDimension(sourceObjectId: string): DraftingDimensionChainObject {
  const model = createEmptyDraftingModel('dimension');
  const dimension = createDraftingObject('dimension_chain', { x: 0, y: 0 }, model, [
    { x: 0, y: 0 },
    { x: 3000, y: 0 },
    { x: 0, y: -900 },
  ]);
  if (dimension.type !== 'dimension_chain') {
    throw new Error('Expected dimension chain');
  }

  return {
    ...dimension,
    geometry: {
      ...dimension.geometry,
      points: [
        { x: 0, y: 0 },
        { x: 3000, y: 0 },
      ],
    },
    metadata: {
      ...dimension.metadata,
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
  };
}
