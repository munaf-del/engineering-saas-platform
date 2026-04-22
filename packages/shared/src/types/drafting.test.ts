import { describe, expect, it } from 'vitest';
import {
  createEmptyDraftingModel,
  createDefaultDraftingLayers,
  defaultLayerIdForDraftingObjectType,
  ensureDraftingModelLayers,
} from './drafting.js';
import { DraftingModelSchema, DraftingUnderlaySchema } from '../schemas/drafting.js';

describe('drafting defaults', () => {
  it('creates a valid empty drafting model', () => {
    const model = createEmptyDraftingModel('drawing-123');
    const parsed = DraftingModelSchema.parse(model);

    expect(parsed.drawingId).toBe('drawing-123');
    expect(parsed.units).toBe('mm');
    expect(parsed.layers).toHaveLength(11);
    expect(parsed.objects).toHaveLength(0);
  });

  it('clones the default layers instead of reusing references', () => {
    const left = createDefaultDraftingLayers();
    const right = createDefaultDraftingLayers();

    left[0]!.visible = false;

    expect(right[0]!.visible).toBe(true);
  });

  it('maps authored object types to the expected default layer', () => {
    expect(defaultLayerIdForDraftingObjectType('pile')).toBe('piles');
    expect(defaultLayerIdForDraftingObjectType('secant_pile_wall')).toBe('shoring');
    expect(defaultLayerIdForDraftingObjectType('soldier_pile_wall')).toBe('shoring');
    expect(defaultLayerIdForDraftingObjectType('anchor_tieback')).toBe('anchors');
    expect(defaultLayerIdForDraftingObjectType('capping_beam')).toBe('beams_walers');
    expect(defaultLayerIdForDraftingObjectType('waler')).toBe('beams_walers');
    expect(defaultLayerIdForDraftingObjectType('excavation_line')).toBe('excavation');
    expect(defaultLayerIdForDraftingObjectType('monitoring_point')).toBe('monitoring');
    expect(defaultLayerIdForDraftingObjectType('leader_note')).toBe('notes');
  });

  it('hydrates missing default layers without disturbing existing layer settings', () => {
    const model = createEmptyDraftingModel('drawing-789');
    const withoutBeamLayer = {
      ...model,
      layers: model.layers
        .filter((layer) => layer.id !== 'beams_walers')
        .map((layer) => (layer.id === 'anchors' ? { ...layer, visible: false } : layer)),
    };

    const hydrated = ensureDraftingModelLayers(withoutBeamLayer);

    expect(hydrated.layers.find((layer) => layer.id === 'anchors')?.visible).toBe(false);
    expect(hydrated.layers.find((layer) => layer.id === 'beams_walers')).toMatchObject({
      name: 'Beams / Walers',
      visible: true,
    });
  });

  it('validates PDF underlay configuration with uniform calibration metadata', () => {
    const parsed = DraftingUnderlaySchema.parse({
      id: 'underlay-1',
      name: 'Existing survey sheet',
      fileId: 'document-1',
      fileName: 'survey.pdf',
      pageNumber: 1,
      visible: true,
      opacity: 0.65,
      locked: false,
      transform: {
        x: 1200,
        y: 2400,
        scale: 1.25,
        rotationDeg: 12,
      },
      crop: {
        x: 10,
        y: 20,
        width: 300,
        height: 450,
      },
      calibration: {
        method: 'two_point_uniform_scale',
        pdfPointA: { x: 10, y: 20 },
        pdfPointB: { x: 210, y: 20 },
        modelPointA: { x: 1200, y: 2400 },
        modelPointB: { x: 3700, y: 2400 },
        modelDistanceMm: 2500,
        calculatedScale: 12.5,
        calibratedAt: new Date('2026-04-22T00:00:00.000Z').toISOString(),
        warningAcknowledged: true,
      },
      createdAt: new Date('2026-04-22T00:00:00.000Z').toISOString(),
      updatedAt: new Date('2026-04-22T00:00:00.000Z').toISOString(),
    });

    expect(parsed.calibration?.warningAcknowledged).toBe(true);
    expect(parsed.transform.scale).toBe(1.25);
  });

  it('preserves saved underlay configuration when a drafting model is parsed and reloaded', () => {
    const model = createEmptyDraftingModel('drawing-456');
    model.underlays.push({
      id: 'underlay-3',
      name: 'Reloaded PDF',
      fileId: 'document-3',
      fileName: 'reloaded.pdf',
      pageNumber: 2,
      visible: true,
      opacity: 0.5,
      locked: true,
      transform: {
        x: 500,
        y: 750,
        scale: 0.3527777778,
        rotationDeg: 8,
      },
      crop: {
        x: 12,
        y: 18,
        width: 280,
        height: 360,
      },
      calibration: null,
      createdAt: new Date('2026-04-22T00:00:00.000Z').toISOString(),
      updatedAt: new Date('2026-04-22T00:00:00.000Z').toISOString(),
    });

    const parsed = DraftingModelSchema.parse(JSON.parse(JSON.stringify(model)));

    expect(parsed.underlays).toHaveLength(1);
    expect(parsed.underlays[0]).toEqual(model.underlays[0]);
  });

  it('accepts and preserves semantic shoring drafting objects', () => {
    const model = createEmptyDraftingModel('drawing-semantic');
    const now = new Date('2026-04-22T00:00:00.000Z').toISOString();

    model.objects.push(
      {
        id: 'secant-wall-1',
        type: 'secant_pile_wall',
        layerId: 'shoring',
        name: 'Secant Wall 1',
        visible: true,
        locked: false,
        style: {
          stroke: '#9a3412',
          fill: '#fed7aa',
          lineWeight: 2,
        },
        geometry: {
          baselinePoints: [
            { x: 0, y: 0 },
            { x: 6000, y: 0 },
          ],
          pileCentres: [
            { x: 0, y: 0 },
            { x: 1500, y: 0 },
            { x: 3000, y: 0 },
            { x: 4500, y: 0 },
            { x: 6000, y: 0 },
          ],
        },
        parameters: {
          pileDiameterMm: 900,
          spacingMm: 1500,
          overlapMm: 100,
          secantType: 'overlapping',
          primarySecondaryPattern: 'hard_firm',
        },
        metadata: {
          wallId: 'SEC1',
          constructionMethod: 'secant bored piles',
          pileCount: 5,
          designNotes: 'Primary and secondary piles alternate.',
        },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'soldier-wall-1',
        type: 'soldier_pile_wall',
        layerId: 'shoring',
        name: 'Soldier Wall 1',
        visible: true,
        locked: false,
        style: {
          stroke: '#92400e',
          lineWeight: 2,
        },
        geometry: {
          baselinePoints: [
            { x: 0, y: 2000 },
            { x: 6000, y: 2000 },
          ],
          pilePositions: [
            { x: 0, y: 2000 },
            { x: 2000, y: 2000 },
            { x: 4000, y: 2000 },
            { x: 6000, y: 2000 },
          ],
        },
        parameters: {
          sectionLabel: 'UC310',
          spacingMm: 2000,
          laggingType: 'timber lagging',
        },
        metadata: {
          wallId: 'SOL1',
          constructionMethod: 'soldier piles with lagging',
          pileCount: 4,
        },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'anchor-1',
        type: 'anchor_tieback',
        layerId: 'anchors',
        name: 'Anchor 1',
        visible: true,
        locked: false,
        style: {
          stroke: '#0f766e',
          lineWeight: 2,
        },
        geometry: {
          headPoint: { x: 0, y: 4000 },
          tailPoint: { x: 3500, y: 3000 },
        },
        parameters: {
          anchorId: 'A1',
          angleDeg: -15,
          planLengthMm: 3640,
          freeLengthMm: 2500,
          bondLengthMm: 1140,
          designLoadKn: 400,
          lockOffLoadKn: 320,
          stage: 'Stage 1',
        },
        metadata: {
          associatedWallId: 'SEC1',
          installationStage: 'Excavate to RL 9.5',
          notes: 'Stress anchor after capping beam cure.',
        },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'beam-1',
        type: 'capping_beam',
        layerId: 'beams_walers',
        name: 'Capping Beam 1',
        visible: true,
        locked: false,
        style: {
          stroke: '#78350f',
          lineWeight: 3,
        },
        geometry: {
          points: [
            { x: 0, y: 5000 },
            { x: 5000, y: 5000 },
          ],
        },
        parameters: {
          beamId: 'CB1',
          widthMm: 900,
          depthMm: 1200,
          levelRl: 12.45,
          concreteGrade: '40 MPa',
        },
        metadata: {
          associatedWallId: 'SEC1',
          notes: 'Top of wall beam.',
        },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'waler-1',
        type: 'waler',
        layerId: 'beams_walers',
        name: 'Waler 1',
        visible: true,
        locked: false,
        style: {
          stroke: '#7c2d12',
          lineWeight: 2,
        },
        geometry: {
          points: [
            { x: 0, y: 6500 },
            { x: 4500, y: 6500 },
          ],
        },
        parameters: {
          walerId: 'W1',
          sectionLabel: '2UC360',
          levelRl: 10.8,
          connectionNotes: 'Bolted to soldier pile flange.',
        },
        metadata: {
          associatedWallId: 'SOL1',
          notes: 'Temporary walers only.',
        },
        createdAt: now,
        updatedAt: now,
      },
    );

    const parsed = DraftingModelSchema.parse(JSON.parse(JSON.stringify(model)));

    expect(parsed.objects).toHaveLength(5);
    expect(parsed.objects.map((object) => object.type)).toEqual([
      'secant_pile_wall',
      'soldier_pile_wall',
      'anchor_tieback',
      'capping_beam',
      'waler',
    ]);
  });

  it('rejects invalid semantic shoring object parameters', () => {
    const now = new Date('2026-04-22T00:00:00.000Z').toISOString();

    expect(() =>
      DraftingModelSchema.parse({
        ...createEmptyDraftingModel('drawing-invalid'),
        objects: [
          {
            id: 'secant-invalid',
            type: 'secant_pile_wall',
            layerId: 'shoring',
            geometry: {
              baselinePoints: [
                { x: 0, y: 0 },
                { x: 6000, y: 0 },
              ],
              pileCentres: [
                { x: 0, y: 0 },
                { x: 1500, y: 0 },
              ],
            },
            parameters: {
              pileDiameterMm: 900,
              spacingMm: 1500,
              primarySecondaryPattern: 'hard_soft',
            },
            metadata: {
              wallId: 'SEC1',
              constructionMethod: 'secant bored piles',
              pileCount: 3,
            },
            createdAt: now,
            updatedAt: now,
          },
        ],
      }),
    ).toThrow();
  });

  it('rejects saved calibration metadata when the warning has not been acknowledged', () => {
    expect(() =>
      DraftingUnderlaySchema.parse({
        id: 'underlay-2',
        name: 'Unacknowledged calibration',
        fileId: 'document-2',
        fileName: 'calibration.pdf',
        pageNumber: 1,
        visible: true,
        opacity: 1,
        locked: false,
        transform: {
          x: 0,
          y: 0,
          scale: 1,
          rotationDeg: 0,
        },
        calibration: {
          method: 'two_point_uniform_scale',
          pdfPointA: { x: 0, y: 0 },
          pdfPointB: { x: 100, y: 0 },
          modelPointA: { x: 0, y: 0 },
          modelPointB: { x: 1000, y: 0 },
          modelDistanceMm: 1000,
          calculatedScale: 10,
          calibratedAt: new Date('2026-04-22T00:00:00.000Z').toISOString(),
          warningAcknowledged: false,
        },
        createdAt: new Date('2026-04-22T00:00:00.000Z').toISOString(),
        updatedAt: new Date('2026-04-22T00:00:00.000Z').toISOString(),
      }),
    ).toThrow();
  });
});
