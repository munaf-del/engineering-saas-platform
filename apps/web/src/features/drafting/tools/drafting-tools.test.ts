import { describe, expect, it } from 'vitest';
import { DraftingModelSchema, createEmptyDraftingModel } from '@eng/shared';
import { createAnchorTiebackObject } from './anchor-tieback-tool';
import { createBoreholeObject } from './borehole-tool';
import { createCalloutObject } from './callout-tool';
import { createCappingBeamObject } from './capping-beam-tool';
import { createDimensionChainObject } from './dimension-chain-tool';
import { createExcavationLineObject } from './excavation-line-tool';
import { createLeaderNoteObject } from './leader-note-tool';
import { createMonitoringPointObject } from './monitoring-point-tool';
import { createPileObject } from './pile-tool';
import { createSecantPileWallObject } from './secant-pile-wall-tool';
import { createSectionMarkerObject } from './section-marker-tool';
import { createServiceCrossingObject } from './service-crossing-tool';
import { createServiceRunObject } from './service-run-tool';
import { createSoldierPileWallObject } from './soldier-pile-wall-tool';
import { createWalerObject } from './waler-tool';

describe('drafting object creation helpers', () => {
  it('creates typed engineering objects with expected defaults', () => {
    const model = createEmptyDraftingModel('drawing-1');
    const pile = createPileObject({ x: 1000, y: 2000 }, model);
    const secantWall = createSecantPileWallObject({ x: 1500, y: 2400 }, model);
    const soldierWall = createSoldierPileWallObject({ x: 1800, y: 2800 }, model);
    const anchor = createAnchorTiebackObject({ x: 2200, y: 3200 }, model);
    const cappingBeam = createCappingBeamObject({ x: 2600, y: 3600 }, model);
    const waler = createWalerObject({ x: 3000, y: 4200 }, model);
    const monitoringPoint = createMonitoringPointObject({ x: 2000, y: 3000 }, model);
    const leaderNote = createLeaderNoteObject({ x: 3000, y: 4000 }, model);
    const dimensionChain = createDimensionChainObject({ x: 3200, y: 4400 }, model);
    const callout = createCalloutObject({ x: 3400, y: 4600 }, model);
    const sectionMarker = createSectionMarkerObject({ x: 3600, y: 4800 }, model);
    const borehole = createBoreholeObject({ x: 3800, y: 5000 }, model);
    const serviceRun = createServiceRunObject({ x: 4000, y: 5200 }, model);
    const serviceCrossing = createServiceCrossingObject({ x: 4200, y: 5400 }, model);
    const excavationLine = createExcavationLineObject({ x: 0, y: 0 }, model, [
      { x: 0, y: 0 },
      { x: 2500, y: 500 },
      { x: 4000, y: 1500 },
    ]);

    expect(pile.metadata.pileId).toBe('P1');
    expect(pile.layerId).toBe('piles');
    expect(secantWall.metadata.wallId).toBe('SEC1');
    expect(secantWall.layerId).toBe('shoring');
    expect(secantWall.parameters.pileDiameterMm).toBe(900);
    expect(secantWall.parameters.spacingMm).toBe(750);
    expect(secantWall.parameters.overlapMm).toBe(150);
    expect(secantWall.metadata.pileCount).toBe(secantWall.geometry.pileCentres.length);
    expect(soldierWall.metadata.wallId).toBe('SOL1');
    expect(soldierWall.parameters.pileDiameterMm).toBe(600);
    expect(soldierWall.parameters.spacingMm).toBe(1500);
    expect(soldierWall.metadata.pileCount).toBe(soldierWall.geometry.pilePositions.length);
    expect(anchor.parameters.anchorId).toBe('A1');
    expect(anchor.layerId).toBe('anchors');
    expect(cappingBeam.parameters.beamId).toBe('CB1');
    expect(cappingBeam.layerId).toBe('beams_walers');
    expect(waler.parameters.walerId).toBe('W1');
    expect(waler.layerId).toBe('beams_walers');
    expect(monitoringPoint.metadata.monitoringType).toBe('vibration');
    expect(monitoringPoint.layerId).toBe('monitoring');
    expect(leaderNote.metadata.text).toBe('Draft note 1');
    expect(leaderNote.layerId).toBe('notes');
    expect(dimensionChain.parameters.dimensionId).toBe('DIM1');
    expect(dimensionChain.layerId).toBe('dimensions');
    expect(callout.parameters.calloutId).toBe('CO1');
    expect(callout.layerId).toBe('notes');
    expect(sectionMarker.parameters.sectionId).toBe('S1');
    expect(sectionMarker.layerId).toBe('sections');
    expect(borehole.parameters.boreholeId).toBe('BH1');
    expect(borehole.layerId).toBe('boreholes');
    expect(serviceRun.parameters.serviceId).toBe('SR1');
    expect(serviceRun.layerId).toBe('services');
    expect(serviceCrossing.parameters.crossingId).toBe('SC1');
    expect(serviceCrossing.layerId).toBe('services_conflicts');
    expect(excavationLine.metadata.excavationId).toBe('EX1');
    expect(excavationLine.geometry.points).toHaveLength(3);
    expect(excavationLine.layerId).toBe('excavation');

    const parsed = DraftingModelSchema.parse({
      ...model,
      objects: [
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
        excavationLine,
      ],
    });

    expect(parsed.objects).toHaveLength(15);
  });
});
