import { describe, expect, it } from 'vitest';
import {
  DraftingModelSchema,
  createEmptyDraftingModel,
  type DraftingObjectChangeEvent,
} from '@eng/shared';
import {
  addDraftingObject,
  addDraftingUnderlay,
  appendDraftingObjectChangeEvent,
  applyTwoPointUniformCalibration,
  canEditDraftingUnderlay,
  canEditDraftingObject,
  centerDraftingViewOnPoint,
  createDraftingObject,
  fitDraftingModelView,
  fitDraftingObjectsView,
  getVisibleDraftingObjects,
  getVisibleDraftingUnderlays,
  isDraftingUnderlayRenderable,
  recordDraftingObjectChangeEvent,
  removeDraftingUnderlay,
  removeDraftingObject,
  removeDraftingObjectWithProvenance,
  replaceDraftingObjectWithProvenance,
  resetDraftingViewZoom,
  translateDraftingObject,
  updateDraftingDrawingSetup,
  updateDraftingUnderlay,
  updateDraftingObject,
  updateLayer,
  zoomDraftingViewAtPoint,
} from './model-utils';
import { createProjectGridLineObjectsFromGridSet } from './tools/project-grid-line-tool';

describe('drafting model utils', () => {
  it('updates drawing setup without moving drafting objects', () => {
    const model = createEmptyDraftingModel('drawing-setup');
    const pile = createDraftingObject('pile', { x: 1000, y: 2000 }, model);
    const withPile = { ...model, objects: [pile] };

    const updated = updateDraftingDrawingSetup(withPile, (setup) => ({
      ...setup,
      referencePoint: {
        ...setup.referencePoint,
        sitePoint: { easting: 334000, northing: 6251000, elevation: 41.2 },
        datum: 'AHD',
        coordinateSystem: 'MGA2020 Zone 56',
      },
      north: {
        ...setup.north,
        projectNorthAngleDeg: 10,
        trueNorthAngleDeg: 13.5,
      },
    }));

    expect(updated.drawingSetup?.referencePoint.sitePoint).toEqual({
      easting: 334000,
      northing: 6251000,
      elevation: 41.2,
    });
    expect(updated.drawingSetup?.north.trueNorthAngleDeg).toBe(13.5);
    expect(updated.objects[0]).toEqual(pile);
    expect(DraftingModelSchema.parse(updated).drawingSetup?.referencePoint.datum).toBe('AHD');
  });

  it('centres the canvas view on the reference point without changing scale', () => {
    const model = createEmptyDraftingModel('drawing-reference-view');
    const centred = centerDraftingViewOnPoint(
      model,
      { x: 1000, y: 2000 },
      { width: 1200, height: 640 },
    );

    expect(centred.view.scale).toBe(model.view.scale);
    expect(centred.view.offsetX).toBe(1200 / 2 - 1000 * model.view.scale);
    expect(centred.view.offsetY).toBe(640 / 2 - 2000 * model.view.scale);
  });

  it('zooms the editor view around an anchor point without changing drafting geometry', () => {
    const model = createEmptyDraftingModel('drawing-zoom');
    const pile = createDraftingObject('pile', { x: 1000, y: 500 }, model);
    if (pile.type !== 'pile') {
      throw new Error('Expected pile object');
    }
    const zoomedView = zoomDraftingViewAtPoint(
      model.view,
      pile.geometry.centre,
      { x: 400, y: 300 },
      model.view.scale * 2,
    );

    expect(zoomedView.scale).toBe(model.view.scale * 2);
    expect(zoomedView.offsetX).toBe(400 - pile.geometry.centre.x * zoomedView.scale);
    expect(zoomedView.offsetY).toBe(300 - pile.geometry.centre.y * zoomedView.scale);
    expect(pile.geometry).toEqual({ centre: { x: 1000, y: 500 }, diameterMm: 600 });
  });

  it('resets editor zoom to 100 percent around the current view centre', () => {
    const model = {
      ...createEmptyDraftingModel('drawing-reset-zoom'),
      view: { scale: 0.05, offsetX: 100, offsetY: 200 },
    };
    const reset = resetDraftingViewZoom(model, { width: 1200, height: 640 });

    expect(reset.scale).toBe(1);
    expect((1200 / 2 - reset.offsetX) / reset.scale).toBe(
      (1200 / 2 - model.view.offsetX) / model.view.scale,
    );
    expect((640 / 2 - reset.offsetY) / reset.scale).toBe(
      (640 / 2 - model.view.offsetY) / model.view.scale,
    );
  });

  it('fits the full model and selected objects using view scale only', () => {
    const model = createEmptyDraftingModel('drawing-fit-selected');
    const pileA = createDraftingObject('pile', { x: 0, y: 0 }, model);
    const pileB = createDraftingObject('pile', { x: 10000, y: 0 }, model);
    if (pileA.type !== 'pile' || pileB.type !== 'pile') {
      throw new Error('Expected pile objects');
    }
    const withObjects = { ...model, objects: [pileA, pileB] };

    const modelFit = fitDraftingModelView(withObjects, 1200, 640);
    const selectedFit = fitDraftingObjectsView([pileB], 1200, 640, model.view);
    const selectedScreenPoint = {
      x: pileB.geometry.centre.x * selectedFit.scale + selectedFit.offsetX,
      y: pileB.geometry.centre.y * selectedFit.scale + selectedFit.offsetY,
    };

    expect(modelFit.scale).toBeLessThan(selectedFit.scale);
    expect(selectedScreenPoint.x).toBeGreaterThan(64);
    expect(selectedScreenPoint.x).toBeLessThan(1200 - 64);
    expect(selectedScreenPoint.y).toBeGreaterThan(64);
    expect(selectedScreenPoint.y).toBeLessThan(640 - 64);
    expect(withObjects.objects).toEqual([pileA, pileB]);
  });

  it('updates and removes drafting objects without mutating the original model', () => {
    const model = createEmptyDraftingModel('drawing-1');
    const pile = createDraftingObject('pile', { x: 1000, y: 2000 }, model);
    const withPile = { ...model, objects: [pile] };

    const updated = updateDraftingObject(withPile, pile.id, (current) => {
      if (current.type !== 'pile') {
        return current;
      }

      return {
        ...current,
        metadata: {
          ...current.metadata,
          pileId: 'P-UPDATED',
        },
      };
    });
    const removed = removeDraftingObject(updated, pile.id);

    expect(withPile.objects[0]).toMatchObject({ metadata: { pileId: 'P1' } });
    expect(updated.objects[0]).toMatchObject({ metadata: { pileId: 'P-UPDATED' } });
    expect(removed.objects).toHaveLength(0);
  });

  it('adds provenance metadata to new objects, edits, moves, and removals', () => {
    const model = createEmptyDraftingModel('drawing-provenance');
    const pile = createDraftingObject('pile', { x: 1000, y: 2000 }, model, [], 'Avery Drafter');
    const withPile = addDraftingObject(model, pile, {
      at: '2026-04-24T00:00:00.000Z',
      by: 'Avery Drafter',
    });
    const createdPile = withPile.objects[0];
    if (!createdPile || createdPile.type !== 'pile') {
      throw new Error('Expected pile object');
    }
    const updated = replaceDraftingObjectWithProvenance(
      withPile,
      pile.id,
      {
        ...createdPile,
        metadata: {
          ...createdPile.metadata,
          pileId: 'P-UPDATED',
        },
        updatedAt: '2026-04-24T01:00:00.000Z',
      },
      {
        action: 'updated',
        at: '2026-04-24T01:00:00.000Z',
        by: 'Avery Drafter',
      },
    );
    const moved = translateDraftingObject(updated.objects[0]!, 100, 200, {
      by: 'Avery Drafter',
    });
    const movedModel = recordDraftingObjectChangeEvent({ ...updated, objects: [moved] }, moved, {
      action: 'moved',
      at: moved.provenance?.updatedAt,
      by: 'Avery Drafter',
    });
    const removed = removeDraftingObjectWithProvenance(movedModel, pile.id, {
      at: '2026-04-24T02:00:00.000Z',
      by: 'Avery Drafter',
    });

    expect(withPile.objects[0]?.provenance).toMatchObject({
      createdBy: 'Avery Drafter',
      updatedBy: 'Avery Drafter',
      lastAction: 'created',
    });
    expect(updated.objects[0]?.provenance).toMatchObject({
      lastAction: 'updated',
      updatedBy: 'Avery Drafter',
    });
    expect(moved.provenance).toMatchObject({
      lastAction: 'moved',
      updatedBy: 'Avery Drafter',
    });
    expect(removed.objects).toHaveLength(0);
    expect(removed.objectChangeEvents?.map((event) => event.action)).toEqual([
      'created',
      'updated',
      'moved',
      'deleted',
    ]);
    expect(removed.objectChangeEvents?.[3]).toMatchObject({
      action: 'deleted',
      by: 'Avery Drafter',
      objectId: pile.id,
    });
  });

  it('caps object change events deterministically to the newest entries', () => {
    const events = Array.from({ length: 205 }, (_, index) => ({
      id: `event-${index}`,
      objectId: `object-${index}`,
      objectType: 'pile' as const,
      action: 'updated' as const,
      at: new Date(Date.UTC(2026, 3, 24, 0, index)).toISOString(),
      source: 'drafting-editor' as const,
    })).reduce<DraftingObjectChangeEvent[]>(
      (currentEvents, event) => appendDraftingObjectChangeEvent(currentEvents, event),
      [],
    );

    expect(events).toHaveLength(200);
    expect(events[0]?.id).toBe('event-5');
    expect(events[199]?.id).toBe('event-204');
  });

  it('translates pile geometry without mutating the source object', () => {
    const pile = createDraftingObject('pile', { x: 1200, y: 400 }, createEmptyDraftingModel('d1'));
    const translated = translateDraftingObject(pile, 1600, 1200);
    if (pile.type !== 'pile' || translated.type !== 'pile') {
      throw new Error('Expected translated pile objects');
    }

    expect(translated.geometry.centre).toEqual({ x: 2800, y: 1600 });
    expect(pile.geometry.centre).toEqual({ x: 1200, y: 400 });
  });

  it('recalculates and preserves derived shoring object geometry across translation and reload', () => {
    const model = createEmptyDraftingModel('drawing-1');
    const secantWall = createDraftingObject('secant_pile_wall', { x: 0, y: 0 }, model);
    const soldierWall = createDraftingObject('soldier_pile_wall', { x: 0, y: 2000 }, model);
    const anchor = createDraftingObject('anchor_tieback', { x: 0, y: 4000 }, model);
    const translatedSecantWall = translateDraftingObject(secantWall, 500, 750);
    const translatedAnchor = translateDraftingObject(anchor, 1000, 500);

    if (
      secantWall.type !== 'secant_pile_wall' ||
      translatedSecantWall.type !== 'secant_pile_wall' ||
      soldierWall.type !== 'soldier_pile_wall' ||
      anchor.type !== 'anchor_tieback' ||
      translatedAnchor.type !== 'anchor_tieback'
    ) {
      throw new Error('Expected semantic drafting objects');
    }

    const parsed = DraftingModelSchema.parse({
      ...model,
      objects: [translatedSecantWall, soldierWall, translatedAnchor],
    });

    expect(translatedSecantWall.geometry.baselinePoints[0]).toEqual({ x: 500, y: 750 });
    expect(translatedSecantWall.metadata.pileCount).toBe(
      translatedSecantWall.geometry.pileCentres.length,
    );
    expect(soldierWall.metadata.pileCount).toBe(soldierWall.geometry.pilePositions.length);
    expect(translatedAnchor.geometry.headPoint).toEqual({ x: 1000, y: 4500 });
    expect(parsed.objects).toHaveLength(3);
  });

  it('preserves new semantic annotation objects across translation and reload', () => {
    const model = createEmptyDraftingModel('drawing-annotations');
    const dimensionChain = createDraftingObject('dimension_chain', { x: 1000, y: 1000 }, model);
    const callout = createDraftingObject('callout', { x: 2000, y: 2000 }, model);
    const sectionMarker = createDraftingObject('section_marker', { x: 3000, y: 3000 }, model);
    const borehole = createDraftingObject('borehole', { x: 4000, y: 4000 }, model);
    const serviceRun = createDraftingObject('service_run', { x: 5000, y: 5000 }, model);
    const serviceCrossing = createDraftingObject('service_crossing', { x: 6000, y: 6000 }, model);
    const translatedDimensionChain = translateDraftingObject(dimensionChain, 500, 200);
    const translatedServiceRun = translateDraftingObject(serviceRun, -300, 450);

    if (
      translatedDimensionChain.type !== 'dimension_chain' ||
      callout.type !== 'callout' ||
      sectionMarker.type !== 'section_marker' ||
      borehole.type !== 'borehole' ||
      translatedServiceRun.type !== 'service_run' ||
      serviceCrossing.type !== 'service_crossing'
    ) {
      throw new Error('Expected semantic annotation drafting objects');
    }

    const parsed = DraftingModelSchema.parse({
      ...model,
      objects: [
        translatedDimensionChain,
        callout,
        sectionMarker,
        borehole,
        translatedServiceRun,
        serviceCrossing,
      ],
    });

    expect(translatedDimensionChain.geometry.points[0]).toEqual({ x: 1500, y: 1200 });
    expect(translatedDimensionChain.parameters.dimensionId).toBe('DIM1');
    expect(callout.parameters.calloutId).toBe('CO1');
    expect(sectionMarker.parameters.sectionId).toBe('S1');
    expect(borehole.parameters.boreholeId).toBe('BH1');
    expect(translatedServiceRun.geometry.path[0]).toEqual({ x: 4700, y: 5450 });
    expect(serviceCrossing.parameters.crossingId).toBe('SC1');
    expect(parsed.objects).toHaveLength(6);
  });

  it('creates an excavation line from authored path vertices while preserving factory-owned defaults', () => {
    const model = createEmptyDraftingModel('drawing-excavation-line');
    const vertices = [
      { x: 0, y: 0, z: 12.5, rl: 12.5 },
      { x: 1500, y: 0, z: 12.4, rl: 12.4 },
      { x: 2100, y: 600, z: 12.3, rl: 12.3 },
    ];
    const excavationLine = createDraftingObject('excavation_line', vertices[0]!, model, vertices);

    if (excavationLine.type !== 'excavation_line') {
      throw new Error('Expected an excavation line object');
    }

    expect(excavationLine.geometry).toEqual({
      points: vertices,
      closed: false,
    });
    expect(excavationLine.metadata).toEqual({
      excavationId: 'EX1',
      stage: 'Stage 1',
    });
    expect(excavationLine.sourceRef).toBeUndefined();
    expect(excavationLine).not.toHaveProperty('designLevel');
    expect(excavationLine).not.toHaveProperty('volume');
  });

  it('creates a capping beam from authored path vertices while preserving factory-owned defaults', () => {
    const model = createEmptyDraftingModel('drawing-capping-beam');
    const vertices = [
      { x: 0, y: 0, z: 15.5, rl: 15.5 },
      { x: 1500, y: 0, z: 15.4, rl: 15.4 },
      { x: 2100, y: 450, z: 15.3, rl: 15.3 },
    ];
    const cappingBeam = createDraftingObject('capping_beam', vertices[0]!, model, vertices);

    if (cappingBeam.type !== 'capping_beam') {
      throw new Error('Expected a capping beam object');
    }

    expect(cappingBeam.geometry).toEqual({ points: vertices });
    expect(cappingBeam.parameters).toEqual({
      beamId: 'CB1',
      widthMm: 900,
      depthMm: 1200,
      levelRl: 12,
      concreteGrade: '40 MPa',
    });
    expect(cappingBeam.metadata).toEqual({
      associatedWallId: '',
      notes: '',
    });
    expect(cappingBeam.sourceRef).toBeUndefined();
    expect(cappingBeam).not.toHaveProperty('designLevel');
    expect(cappingBeam).not.toHaveProperty('load');
    expect(cappingBeam).not.toHaveProperty('capacity');
  });

  it('creates a waler from authored path vertices while preserving factory-owned defaults', () => {
    const model = createEmptyDraftingModel('drawing-waler');
    const vertices = [
      { x: 0, y: 0, z: 10.5, rl: 10.5 },
      { x: 1500, y: 0, z: 10.4, rl: 10.4 },
      { x: 2100, y: 450, z: 10.3, rl: 10.3 },
    ];
    const waler = createDraftingObject('waler', vertices[0]!, model, vertices);

    if (waler.type !== 'waler') {
      throw new Error('Expected a waler object');
    }

    expect(waler.geometry).toEqual({ points: vertices });
    expect(waler.parameters).toEqual({
      walerId: 'W1',
      sectionLabel: '2UC360',
      levelRl: 10.5,
      connectionNotes: '',
    });
    expect(waler.metadata).toEqual({
      associatedWallId: '',
      notes: '',
    });
    expect(waler.sourceRef).toBeUndefined();
    expect(waler).not.toHaveProperty('designLevel');
    expect(waler).not.toHaveProperty('load');
    expect(waler).not.toHaveProperty('capacity');
  });

  it('creates a service run from authored vertices while preserving factory-owned service fields', () => {
    const model = createEmptyDraftingModel('drawing-service-run');
    const vertices = [
      { x: 0, y: 0, z: 8.5, rl: 8.5 },
      { x: 1600, y: 0, z: 8.4, rl: 8.4 },
      { x: 2200, y: 700, z: 8.3, rl: 8.3 },
    ];
    const serviceRun = createDraftingObject('service_run', vertices[0]!, model, vertices);

    if (serviceRun.type !== 'service_run') {
      throw new Error('Expected a service run object');
    }

    expect(serviceRun.geometry).toEqual({ path: vertices });
    expect(serviceRun.parameters).toEqual({
      serviceId: 'SR1',
      serviceType: 'unknown',
      status: 'existing',
      diameterMm: 0,
      depthM: 0,
      levelRl: 0,
      authority: '',
    });
    expect(serviceRun.metadata).toEqual({
      sourceReference: '',
      surveyConfidence: '',
      notes: '',
    });
    expect(serviceRun.sourceRef).toMatchObject({
      sourceType: 'manual',
      status: 'manual',
    });
    expect(serviceRun.sourceRef?.sourceId).toBeUndefined();
    expect(serviceRun).not.toHaveProperty('clearanceMm');
    expect(serviceRun).not.toHaveProperty('riskStatus');
    expect(serviceRun).not.toHaveProperty('strata');
    expect(serviceRun).not.toHaveProperty('surface');
  });

  it('creates a secant pile wall from authored baseline vertices while preserving factory-owned generated arrays', () => {
    const model = createEmptyDraftingModel('drawing-secant-wall');
    const baselinePoints = [
      { x: 0, y: 0, z: 7.5, rl: 7.5 },
      { x: 3200, y: 0, z: 7.4, rl: 7.4 },
    ];
    const secantWall = createDraftingObject(
      'secant_pile_wall',
      baselinePoints[0]!,
      model,
      baselinePoints,
    );

    if (secantWall.type !== 'secant_pile_wall') {
      throw new Error('Expected a secant pile wall object');
    }

    expect(secantWall.geometry.baselinePoints).toEqual(baselinePoints);
    expect(secantWall.geometry.pileCentres).toHaveLength(secantWall.metadata.pileCount);
    expect(secantWall.parameters).toEqual({
      pileDiameterMm: 900,
      spacingMm: 750,
      overlapMm: 150,
      secantType: 'overlapping',
      primarySecondaryPattern: 'hard_soft',
    });
    expect(secantWall.metadata).toMatchObject({
      wallId: 'SEC1',
      constructionMethod: 'secant bored piles',
      pileCount: secantWall.geometry.pileCentres.length,
      designNotes: '',
    });
    expect(secantWall.sourceRef).toBeUndefined();
    expect(secantWall).not.toHaveProperty('pileIds');
    expect(secantWall).not.toHaveProperty('wallLengthMm');
    expect(secantWall).not.toHaveProperty('load');
    expect(secantWall).not.toHaveProperty('capacity');
  });

  it('creates a soldier pile wall from authored baseline vertices while preserving factory-owned generated arrays', () => {
    const model = createEmptyDraftingModel('drawing-soldier-wall');
    const baselinePoints = [
      { x: 0, y: 0, z: 6.5, rl: 6.5 },
      { x: 3600, y: 0, z: 6.4, rl: 6.4 },
    ];
    const soldierWall = createDraftingObject(
      'soldier_pile_wall',
      baselinePoints[0]!,
      model,
      baselinePoints,
    );

    if (soldierWall.type !== 'soldier_pile_wall') {
      throw new Error('Expected a soldier pile wall object');
    }

    expect(soldierWall.geometry.baselinePoints).toEqual(baselinePoints);
    expect(soldierWall.geometry.pilePositions).toHaveLength(soldierWall.metadata.pileCount);
    expect(soldierWall.parameters).toEqual({
      pileDiameterMm: 600,
      sectionLabel: 'UC310',
      spacingMm: 1500,
      laggingType: 'timber lagging',
      embedmentNote: '',
    });
    expect(soldierWall.metadata).toMatchObject({
      wallId: 'SOL1',
      constructionMethod: 'soldier piles with lagging',
      pileCount: soldierWall.geometry.pilePositions.length,
    });
    expect(soldierWall.sourceRef).toBeUndefined();
    expect(soldierWall).not.toHaveProperty('pileIds');
    expect(soldierWall).not.toHaveProperty('wallLengthMm');
    expect(soldierWall).not.toHaveProperty('load');
    expect(soldierWall).not.toHaveProperty('capacity');
  });

  it('keeps dimension witness anchor metadata aligned for partially snapped dimensions', () => {
    const model = createEmptyDraftingModel('dimension-witness-alignment');
    const line = createDraftingObject('draft_line', { x: 0, y: 0 }, model, [
      { x: 0, y: 0 },
      { x: 4000, y: 0 },
    ]);
    const dimensionChain = createDraftingObject('dimension_chain', { x: 0, y: 0 }, model, [
      { x: 0, y: 0 },
      {
        x: 4000,
        y: 0,
        snapRef: {
          sourceObjectId: line.id,
          anchorKind: 'endpoint',
          anchorIndex: 1,
          capturedCoordinate: { x: 4000, y: 0 },
        },
      },
      { x: 0, y: -1000 },
    ]);

    if (dimensionChain.type !== 'dimension_chain') {
      throw new Error('Expected dimension chain');
    }

    expect(dimensionChain.metadata.witnessAnchorRefs).toHaveLength(2);
    expect(dimensionChain.metadata.witnessAnchorRefs?.[0]?.anchorKind).toBe('reference');
    expect(dimensionChain.metadata.witnessAnchorRefs?.[1]?.sourceObjectId).toBe(line.id);
  });

  it('applies layer visibility and lock rules to visible/editable objects', () => {
    const model = createEmptyDraftingModel('drawing-1');
    const pile = createDraftingObject('pile', { x: 1000, y: 1000 }, model);
    const note = createDraftingObject('leader_note', { x: 2000, y: 2000 }, model);
    const withObjects = { ...model, objects: [pile, { ...note, visible: false }] };
    const pilesLayer = withObjects.layers.find((layer) => layer.id === 'piles');
    if (!pilesLayer) {
      throw new Error('Expected piles layer');
    }

    const hiddenLayerModel = updateLayer(withObjects, {
      ...pilesLayer,
      visible: false,
      locked: true,
    });

    expect(getVisibleDraftingObjects(withObjects)).toHaveLength(1);
    expect(getVisibleDraftingObjects(hiddenLayerModel)).toHaveLength(0);
    expect(canEditDraftingObject(hiddenLayerModel, pile)).toBe(false);
  });

  it('adds, updates, and removes underlays without mutating the original model', () => {
    const model = createEmptyDraftingModel('drawing-1');
    const underlay = createTestUnderlay();
    const withUnderlay = addDraftingUnderlay(model, underlay);
    const updated = updateDraftingUnderlay(withUnderlay, underlay.id, (current) => ({
      ...current,
      name: 'Updated survey underlay',
    }));
    const removed = removeDraftingUnderlay(updated, underlay.id);

    expect(model.underlays).toHaveLength(0);
    expect(withUnderlay.underlays[0]?.name).toBe('Survey underlay');
    expect(updated.underlays[0]?.name).toBe('Updated survey underlay');
    expect(removed.underlays).toHaveLength(0);
  });

  it('applies visibility and lock rules to PDF underlays', () => {
    const model = createEmptyDraftingModel('drawing-1');
    const underlay = createTestUnderlay();
    const withUnderlay = addDraftingUnderlay(model, underlay);
    const underlayLayer = withUnderlay.layers.find((layer) => layer.id === 'underlay');
    if (!underlayLayer) {
      throw new Error('Expected underlay layer');
    }

    const hiddenLayerModel = updateLayer(withUnderlay, {
      ...underlayLayer,
      visible: false,
      locked: true,
    });

    expect(getVisibleDraftingUnderlays(withUnderlay)).toHaveLength(1);
    expect(getVisibleDraftingUnderlays(hiddenLayerModel)).toHaveLength(0);
    expect(canEditDraftingUnderlay(withUnderlay, underlay)).toBe(true);
    expect(canEditDraftingUnderlay(hiddenLayerModel, underlay)).toBe(false);
    expect(canEditDraftingUnderlay(withUnderlay, { ...underlay, locked: true })).toBe(false);
  });

  it('filters malformed PDF underlay metadata before canvas rendering', () => {
    const model = createEmptyDraftingModel('drawing-1');
    const validUnderlay = createTestUnderlay();
    const malformedScale = {
      ...createTestUnderlay(),
      id: 'underlay-zero-scale',
      transform: { ...createTestUnderlay().transform, scale: 0 },
    };
    const malformedCrop = {
      ...createTestUnderlay(),
      id: 'underlay-bad-crop',
      crop: { x: 0, y: 0, width: Number.NaN, height: 100 },
    };
    const missingFileId = {
      ...createTestUnderlay(),
      id: 'underlay-missing-file',
      fileId: '',
    };

    const withUnderlays = {
      ...model,
      underlays: [
        validUnderlay,
        malformedScale,
        malformedCrop,
        missingFileId,
      ] as unknown as typeof model.underlays,
    };

    expect(isDraftingUnderlayRenderable(validUnderlay)).toBe(true);
    expect(getVisibleDraftingUnderlays(withUnderlays).map((underlay) => underlay.id)).toEqual([
      validUnderlay.id,
    ]);
  });

  it('calculates and persists uniform two-point calibration metadata', () => {
    const calibrated = applyTwoPointUniformCalibration(createTestUnderlay(), {
      pdfPointA: { x: 10, y: 10 },
      pdfPointB: { x: 210, y: 10 },
      modelDistanceMm: 2500,
      warningAcknowledged: true,
    });

    expect(calibrated.transform.scale).toBeCloseTo(12.5);
    expect(calibrated.calibration?.method).toBe('two_point_uniform_scale');
    expect(calibrated.calibration?.warningAcknowledged).toBe(true);
    expect(calibrated.calibration?.modelDistanceMm).toBe(2500);
  });

  it('requires the calibration warning acknowledgement before applying scale changes', () => {
    expect(() =>
      applyTwoPointUniformCalibration(createTestUnderlay(), {
        pdfPointA: { x: 0, y: 0 },
        pdfPointB: { x: 100, y: 0 },
        modelDistanceMm: 1000,
        warningAcknowledged: false,
      }),
    ).toThrow('Calibration warning acknowledgement is required');
  });

  it('creates primitive geometry and joint objects from authored points', () => {
    const model = createEmptyDraftingModel('drawing-1');
    const line = createDraftingObject('draft_line', { x: 0, y: 0 }, model, [
      { x: 0, y: 0 },
      { x: 2500, y: 0 },
    ]);
    const rectangle = createDraftingObject('draft_rectangle', { x: 0, y: 0 }, model, [
      { x: 0, y: 0 },
      { x: 2000, y: 1200 },
    ]);
    const joint = createDraftingObject('structural_joint', { x: 500, y: 600, rl: 12.3 }, model);

    expect(line).toMatchObject({
      type: 'draft_line',
      geometry: { endPoint: { x: 2500, y: 0 } },
      sourceRef: { sourceType: 'manual' },
    });
    expect(rectangle).toMatchObject({
      type: 'draft_rectangle',
      geometry: { cornerB: { x: 2000, y: 1200 } },
    });
    expect(joint).toMatchObject({
      type: 'structural_joint',
      geometry: { point: { x: 500, y: 600, rl: 12.3 } },
      parameters: { loadEnabled: false, units: 'kN' },
    });
  });

  it('creates project grid objects with editable modular defaults and preserves origin metadata', () => {
    const model = createEmptyDraftingModel('drawing-project-grid');
    const grid = createDraftingObject(
      'project_grid',
      {
        x: 1000,
        y: 2000,
        z: 3,
        rl: 12.5,
        snapRef: {
          anchorKind: 'origin',
          capturedCoordinate: { x: 1000, y: 2000, z: 3, rl: 12.5 },
        },
      },
      model,
    );

    expect(grid).toMatchObject({
      type: 'project_grid',
      layerId: 'grid',
      metadata: {
        moduleSizeMm: 100,
        bubblePlacement: 'both',
        as1100Profile: 'modular_grid_informed',
      },
    });
    if (grid.type !== 'project_grid') {
      throw new Error('Expected project grid');
    }
    expect(grid.geometry.xLines.map((line) => line.label)).toEqual(['A', 'B', 'C', 'D']);
    expect(grid.geometry.yLines.map((line) => line.label)).toEqual(['1', '2', '3', '4']);
    expect(grid.geometry.origin).toMatchObject({ z: 3, rl: 12.5 });
    expect(translateDraftingObject(grid, 500, -250).geometry).toMatchObject({
      origin: { x: 1500, y: 1750, z: 3, rl: 12.5 },
    });
  });

  it('creates independent project grid line and shaft objects from authored points', () => {
    const model = createEmptyDraftingModel('drawing-grid-line-shaft');
    const start = {
      x: 100,
      y: 200,
      z: 3,
      rl: 12.5,
      snapRef: {
        anchorKind: 'endpoint' as const,
        capturedCoordinate: { x: 100, y: 200, z: 3, rl: 12.5 },
      },
    };
    const end = { x: 100, y: 3200, z: 3, rl: 12.5 };
    const gridLine = createDraftingObject('project_grid_line', start, model, [start, end]);
    const shaft = createDraftingObject('shaft', { x: 500, y: 500, rl: 9.1 }, model, [
      { x: 500, y: 500, rl: 9.1 },
      { x: 2000, y: 500 },
    ]);

    expect(gridLine).toMatchObject({
      type: 'project_grid_line',
      layerId: 'grid',
      geometry: {
        start,
        end,
      },
      metadata: {
        bubblePlacement: 'both',
        lineRole: 'major',
        as1100Profile: 'modular_grid_informed',
      },
      sourceRef: { sourceType: 'manual' },
    });
    expect(shaft).toMatchObject({
      type: 'shaft',
      layerId: 'shoring',
      geometry: {
        centre: { x: 500, y: 500, rl: 9.1 },
        radiusMm: 1500,
      },
      parameters: {
        constructionType: 'secant_piles',
        sourceMode: 'manual_sketch',
      },
    });
    if (gridLine.type !== 'project_grid_line') {
      throw new Error('Expected project grid line');
    }
    if (shaft.type !== 'shaft') {
      throw new Error('Expected shaft');
    }
    const movedGridLine = translateDraftingObject(gridLine, 50, -25);
    const movedShaft = translateDraftingObject(shaft, -100, 75);
    if (movedGridLine.type !== 'project_grid_line') {
      throw new Error('Expected moved project grid line');
    }
    if (movedShaft.type !== 'shaft') {
      throw new Error('Expected moved shaft');
    }
    expect(movedGridLine.geometry.start).toMatchObject({
      x: 150,
      y: 175,
      z: 3,
      rl: 12.5,
    });
    expect(movedShaft.geometry.centre).toMatchObject({
      x: 400,
      y: 575,
      rl: 9.1,
    });
  });

  it('creates grid set estimates as independently editable grid line objects', () => {
    const model = createEmptyDraftingModel('drawing-grid-set-lines');
    const lines = createProjectGridLineObjectsFromGridSet({ x: 0, y: 0 }, model, {
      name: 'Test Grid',
      xCount: 2,
      yCount: 3,
      xSpacingMm: 1200,
      ySpacingMm: 900,
    });

    expect(lines).toHaveLength(5);
    expect(lines.every((line) => line.type === 'project_grid_line')).toBe(true);
    expect(new Set(lines.map((line) => line.id)).size).toBe(lines.length);
    expect(new Set(lines.map((line) => line.metadata.gridSetId)).size).toBe(1);
    expect(lines.map((line) => line.metadata.label)).toEqual(['A', 'B', '1', '2', '3']);

    const editedLine = {
      ...lines[0]!,
      metadata: { ...lines[0]!.metadata, label: 'A1' },
      geometry: {
        ...lines[0]!.geometry,
        end: { ...lines[0]!.geometry.end, y: 4800 },
      },
    };

    expect(editedLine.metadata.gridSetId).toBe(lines[1]!.metadata.gridSetId);
    expect(editedLine.metadata.label).not.toBe(lines[1]!.metadata.label);
    expect(editedLine.geometry.end.y).not.toBe(lines[1]!.geometry.end.y);
  });
});

function createTestUnderlay() {
  const now = new Date('2026-04-22T00:00:00.000Z').toISOString();

  return {
    id: 'underlay-1',
    name: 'Survey underlay',
    fileId: 'document-1',
    fileName: 'survey.pdf',
    pageNumber: 1,
    visible: true,
    opacity: 0.6,
    locked: false,
    transform: {
      x: 1200,
      y: 2400,
      scale: 1,
      rotationDeg: 0,
    },
    crop: null,
    calibration: null,
    createdAt: now,
    updatedAt: now,
  } as const;
}
