import { describe, expect, it } from 'vitest';
import { createEmptyDraftingModel, type DraftingModel, type DraftingObject } from '@eng/shared';
import {
  buildDraftingScheduleSummary,
  getDraftingScheduleGroup,
  serializeDraftingScheduleGroupCsv,
  serializeDraftingSchedulesJson,
} from './drafting-schedule-utils';

const NOW = '2026-04-22T00:00:00.000Z';
const BASE_OBJECT_FIELDS = {
  visible: true,
  locked: false,
  createdAt: NOW,
  updatedAt: NOW,
} as const;

describe('drafting schedule utils', () => {
  it('derives shoring and pile rows from typed semantic objects', () => {
    const summary = buildDraftingScheduleSummary(
      modelWith([pileObject(), secantWallObject(), soldierWallObject(), excavationLineObject()]),
    );
    const group = getDraftingScheduleGroup(summary, 'shoring_piles');

    expect(group.rows).toHaveLength(4);
    expect(group.rows[0]?.cells).toMatchObject({
      objectType: 'pile',
      sourceType: 'manual',
      sourceId: '',
      idOrWallId: 'P1',
      pileCount: '1',
      diameterOrSection: '600 mm',
      constructionMethod: 'bored',
    });
    expect(group.rows[1]?.cells).toMatchObject({
      objectType: 'secant pile wall',
      idOrWallId: 'SEC1',
      pileCount: '5',
      spacing: '750 mm',
      overlapOrPattern: '150 mm; overlapping; hard_soft',
    });
    expect(group.rows[2]?.cells.diameterOrSection).toBe('600 mm; UC310');
    expect(group.rows[3]?.cells).toMatchObject({
      objectType: 'excavation line',
      sourceType: 'manual',
      sourceId: '',
      idOrWallId: 'EX1',
      notes: 'Stage 2; design level 8.5; Bulk excavation hold point',
    });
  });

  it('derives anchor schedule rows', () => {
    const group = getDraftingScheduleGroup(
      buildDraftingScheduleSummary(modelWith([anchorObject()])),
      'anchors',
    );

    expect(group.rows).toHaveLength(1);
    expect(group.rows[0]?.cells).toEqual({
      anchorId: 'A1',
      associatedWallId: 'SEC1',
      angle: '-15 deg',
      planLength: '4657 mm',
      freeLength: '3200 mm',
      bondLength: '1457 mm',
      designLoad: '400 kN',
      lockOffLoad: '320 kN',
      stage: 'Stage 1',
    });
  });

  it('derives beam and waler schedule rows', () => {
    const group = getDraftingScheduleGroup(
      buildDraftingScheduleSummary(modelWith([cappingBeamObject(), walerObject()])),
      'beams_walers',
    );

    expect(group.rows).toHaveLength(2);
    expect(group.rows[0]?.cells).toMatchObject({
      objectType: 'capping beam',
      beamOrWalerId: 'CB1',
      associatedWallId: 'SEC1',
      width: '900 mm',
      depth: '1200 mm',
      levelRl: 'RL 12',
      concreteGrade: '40 MPa',
    });
    expect(group.rows[1]?.cells).toMatchObject({
      objectType: 'waler',
      beamOrWalerId: 'W1',
      sectionLabel: '2UC360',
      connectionNotes: 'M24 through bolts; connect to soldier pile flanges',
    });
  });

  it('derives borehole schedule rows', () => {
    const group = getDraftingScheduleGroup(
      buildDraftingScheduleSummary(modelWith([boreholeObject()])),
      'boreholes',
    );

    expect(group.rows).toHaveLength(1);
    expect(group.rows[0]?.cells).toEqual({
      boreholeId: 'BH1',
      sourceType: 'manual',
      sourceId: '',
      label: 'BH-01',
      groundRl: 'RL 13.2',
      terminationDepth: '12 m',
      terminationRl: 'RL 1.2',
      boreholeType: 'cored',
      linkedGeotechRef: 'GEO-REF-1',
    });
  });

  it('derives service and conflict schedule rows', () => {
    const group = getDraftingScheduleGroup(
      buildDraftingScheduleSummary(modelWith([serviceRunObject(), serviceCrossingObject()])),
      'services_conflicts',
    );

    expect(group.rows).toHaveLength(2);
    expect(group.rows[0]?.cells).toMatchObject({
      objectType: 'service run',
      sourceType: 'manual',
      sourceId: '',
      serviceOrCrossingId: 'SR1',
      serviceType: 'water',
      status: 'existing',
      authority: 'Sydney Water',
      depth: '1.4 m',
      diameter: '150 mm',
    });
    expect(group.rows[1]?.cells).toMatchObject({
      objectType: 'service crossing',
      sourceType: 'manual',
      sourceId: '',
      serviceOrCrossingId: 'SC1',
      conflictType: 'crosses_anchor',
      clearance: '350 mm',
      riskStatus: 'open',
      linkedObjectRefs: 'SR1, A1',
    });
  });

  it('derives annotation and reference rows', () => {
    const group = getDraftingScheduleGroup(
      buildDraftingScheduleSummary(
        modelWith([
          sectionMarkerObject(),
          calloutObject(),
          dimensionChainObject(),
          leaderNoteObject(),
          monitoringPointObject(),
        ]),
      ),
      'annotations_references',
    );

    expect(group.rows).toHaveLength(5);
    expect(group.rows[0]?.cells).toMatchObject({
      objectType: 'section marker',
      id: 'S1',
      label: 'A',
      linkedDrawingOrSheet: 'S-201, drawing-section-a',
    });
    expect(group.rows[1]?.cells.titleOrText).toBe('Hold pour until survey sign-off');
    expect(group.rows[2]?.cells.titleOrText).toBe('total 5.00 m; segments 3.00 m / 2.00 m');
    expect(group.rows[3]?.cells.titleOrText).toBe('Existing wall to remain');
    expect(group.rows[4]?.cells).toMatchObject({
      objectType: 'monitoring point',
      id: 'MP1',
      label: 'vibration',
      titleOrText: 'trigger 5; action 8; mm/s',
    });
  });

  it('formats current schedule group CSV deterministically', () => {
    const summary = buildDraftingScheduleSummary(modelWith([calloutWithCsvTextObject()]));
    const group = getDraftingScheduleGroup(summary, 'annotations_references');

    expect(serializeDraftingScheduleGroupCsv(group)).toBe(
      [
        'Object Type,ID,Label,Title / Text,Linked Drawing / Sheet,Linked Object Refs,Notes',
        'callout,CO2,Coordination,"Review, ""hold""',
        'before pour",,SEC1,Needs review',
      ].join('\n'),
    );
  });

  it('exports all schedule groups as a JSON summary without PDF underlay content', () => {
    const model = modelWith([secantWallObject(), anchorObject(), calloutObject()]);
    model.underlays.push({
      id: 'underlay-1',
      name: 'Underlay',
      fileId: 'pdf-file-1',
      fileName: 'source.pdf',
      pageNumber: 1,
      visible: true,
      opacity: 0.6,
      locked: false,
      transform: { x: 0, y: 0, scale: 1, rotationDeg: 0 },
      crop: null,
      calibration: null,
      createdAt: NOW,
      updatedAt: NOW,
    });

    const exported = serializeDraftingSchedulesJson(buildDraftingScheduleSummary(model));
    const parsed = JSON.parse(exported);

    expect(parsed.drawingId).toBe('drawing-schedules');
    expect(parsed.groups).toHaveLength(6);
    expect(
      parsed.groups.find((group: { key: string }) => group.key === 'shoring_piles').rowCount,
    ).toBe(1);
    expect(exported).toContain('"objectType": "anchor_tieback"');
    expect(exported).not.toContain('pdf-file-1');
    expect(exported).not.toContain('data:application/pdf');
    expect(exported).not.toContain('"buffer"');
  });

  it('includes source reference metadata in schedule rows when objects are source-linked', () => {
    const pile = pileObject();
    pile.sourceRef = {
      sourceType: 'foundation_pile',
      sourceId: 'pile-db-1',
      sourceLabel: 'P1',
      status: 'linked',
    };
    if (pile.type === 'pile') {
      pile.metadata.sourceCompleteness = 'complete';
      pile.metadata.concreteGrade = 'C40';
      pile.metadata.designCompressionKn = 0;
    }

    const group = getDraftingScheduleGroup(
      buildDraftingScheduleSummary(modelWith([pile])),
      'shoring_piles',
    );

    expect(group.rows[0]?.cells).toMatchObject({
      sourceKind: 'pile instance',
      sourceType: 'foundation_pile',
      sourceId: 'pile-db-1',
      sourceStatus: 'linked',
      sourceCompleteness: 'complete',
      concreteGrade: 'C40',
      designCompressionKn: '0',
    });
  });

  it('does not fabricate row provenance for legacy objects without object provenance', () => {
    const summary = buildDraftingScheduleSummary(modelWith([pileObject()]));
    const row = getDraftingScheduleGroup(summary, 'shoring_piles').rows[0];

    expect(row?.provenance).toBeUndefined();
  });

  it('returns empty groups for an empty drafting model', () => {
    const summary = buildDraftingScheduleSummary(createEmptyDraftingModel('empty-drawing'));

    expect(summary.groups.map((group) => [group.key, group.rows.length])).toEqual([
      ['shoring_piles', 0],
      ['anchors', 0],
      ['beams_walers', 0],
      ['boreholes', 0],
      ['services_conflicts', 0],
      ['annotations_references', 0],
    ]);
  });

  it('stays compatible with older models that only contain earlier semantic objects', () => {
    const olderModel = {
      ...createEmptyDraftingModel('older-drawing'),
      objects: [pileObject(), leaderNoteObject()],
    } as DraftingModel;
    const summary = buildDraftingScheduleSummary(olderModel);

    expect(getDraftingScheduleGroup(summary, 'shoring_piles').rows).toHaveLength(1);
    expect(getDraftingScheduleGroup(summary, 'annotations_references').rows).toHaveLength(1);
    expect(getDraftingScheduleGroup(summary, 'anchors').rows).toHaveLength(0);
    expect(getDraftingScheduleGroup(summary, 'services_conflicts').rows).toHaveLength(0);
  });
});

function modelWith(objects: DraftingObject[]): DraftingModel {
  return {
    ...createEmptyDraftingModel('drawing-schedules'),
    objects,
  };
}

function pileObject(): DraftingObject {
  return {
    ...BASE_OBJECT_FIELDS,
    id: 'pile-1',
    type: 'pile',
    layerId: 'piles',
    name: 'Pile 1',
    geometry: {
      centre: { x: 0, y: 0 },
      diameterMm: 600,
    },
    metadata: {
      pileId: 'P1',
      pileType: 'bored',
      material: 'reinforced_concrete',
      cutOffLevel: 12.5,
      toeLevel: -3,
      notes: 'Founding in shale',
    },
  };
}

function secantWallObject(): DraftingObject {
  return {
    ...BASE_OBJECT_FIELDS,
    id: 'secant-wall-1',
    type: 'secant_pile_wall',
    layerId: 'shoring',
    name: 'Secant Wall 1',
    geometry: {
      baselinePoints: [
        { x: 0, y: 0 },
        { x: 3000, y: 0 },
      ],
      pileCentres: [
        { x: 0, y: 0 },
        { x: 750, y: 0 },
        { x: 1500, y: 0 },
        { x: 2250, y: 0 },
        { x: 3000, y: 0 },
      ],
    },
    parameters: {
      pileDiameterMm: 900,
      spacingMm: 750,
      overlapMm: 150,
      secantType: 'overlapping',
      primarySecondaryPattern: 'hard_soft',
    },
    metadata: {
      wallId: 'SEC1',
      constructionMethod: 'secant bored piles',
      pileCount: 5,
      designNotes: 'Primary piles first',
    },
  };
}

function soldierWallObject(): DraftingObject {
  return {
    ...BASE_OBJECT_FIELDS,
    id: 'soldier-wall-1',
    type: 'soldier_pile_wall',
    layerId: 'shoring',
    name: 'Soldier Wall 1',
    geometry: {
      baselinePoints: [
        { x: 0, y: 1000 },
        { x: 3000, y: 1000 },
      ],
      pilePositions: [
        { x: 0, y: 1000 },
        { x: 1500, y: 1000 },
        { x: 3000, y: 1000 },
      ],
    },
    parameters: {
      pileDiameterMm: 600,
      sectionLabel: 'UC310',
      spacingMm: 1500,
      laggingType: 'timber lagging',
      embedmentNote: 'socket 1.5 m',
    },
    metadata: {
      wallId: 'SOL1',
      constructionMethod: 'soldier piles with lagging',
      pileCount: 3,
    },
  };
}

function excavationLineObject(): DraftingObject {
  return {
    ...BASE_OBJECT_FIELDS,
    id: 'excavation-1',
    type: 'excavation_line',
    layerId: 'excavation',
    name: 'Excavation Line 1',
    geometry: {
      points: [
        { x: 0, y: 0 },
        { x: 1000, y: 0 },
      ],
    },
    metadata: {
      excavationId: 'EX1',
      stage: 'Stage 2',
      designLevel: 8.5,
      notes: 'Bulk excavation hold point',
    },
  };
}

function anchorObject(): DraftingObject {
  return {
    ...BASE_OBJECT_FIELDS,
    id: 'anchor-1',
    type: 'anchor_tieback',
    layerId: 'anchors',
    name: 'Anchor 1',
    geometry: {
      headPoint: { x: 0, y: 0 },
      tailPoint: { x: 4500, y: -1200 },
    },
    parameters: {
      anchorId: 'A1',
      angleDeg: -15,
      planLengthMm: 4657,
      freeLengthMm: 3200,
      bondLengthMm: 1457,
      designLoadKn: 400,
      lockOffLoadKn: 320,
      stage: 'Stage 1',
    },
    metadata: {
      associatedWallId: 'SEC1',
      installationStage: 'Stage 1',
      notes: 'Stress after capping beam',
    },
  };
}

function cappingBeamObject(): DraftingObject {
  return {
    ...BASE_OBJECT_FIELDS,
    id: 'capping-beam-1',
    type: 'capping_beam',
    layerId: 'beams_walers',
    name: 'Capping Beam 1',
    geometry: {
      points: [
        { x: 0, y: 0 },
        { x: 5000, y: 0 },
      ],
    },
    parameters: {
      beamId: 'CB1',
      widthMm: 900,
      depthMm: 1200,
      levelRl: 12,
      concreteGrade: '40 MPa',
    },
    metadata: {
      associatedWallId: 'SEC1',
      notes: 'Cast after pile trim',
    },
  };
}

function walerObject(): DraftingObject {
  return {
    ...BASE_OBJECT_FIELDS,
    id: 'waler-1',
    type: 'waler',
    layerId: 'beams_walers',
    name: 'Waler 1',
    geometry: {
      points: [
        { x: 0, y: -1000 },
        { x: 5000, y: -1000 },
      ],
    },
    parameters: {
      walerId: 'W1',
      sectionLabel: '2UC360',
      levelRl: 10.5,
      connectionNotes: 'M24 through bolts',
    },
    metadata: {
      associatedWallId: 'SOL1',
      notes: 'connect to soldier pile flanges',
    },
  };
}

function boreholeObject(): DraftingObject {
  return {
    ...BASE_OBJECT_FIELDS,
    id: 'borehole-1',
    type: 'borehole',
    layerId: 'boreholes',
    name: 'Borehole 1',
    geometry: {
      point: { x: 0, y: 0 },
    },
    parameters: {
      boreholeId: 'BH1',
      label: 'BH-01',
      groundLevelRl: 13.2,
      terminationDepthM: 12,
      terminationLevelRl: 1.2,
      boreholeType: 'cored',
    },
    metadata: {
      linkedGeotechEntityId: 'GEO-REF-1',
      sourceReference: 'GI report table 2',
      notes: 'Logged in fill over shale',
    },
  };
}

function serviceRunObject(): DraftingObject {
  return {
    ...BASE_OBJECT_FIELDS,
    id: 'service-run-1',
    type: 'service_run',
    layerId: 'services',
    name: 'Service Run 1',
    geometry: {
      path: [
        { x: 0, y: 0 },
        { x: 1000, y: 0 },
      ],
    },
    parameters: {
      serviceId: 'SR1',
      serviceType: 'water',
      status: 'existing',
      diameterMm: 150,
      depthM: 1.4,
      levelRl: 10.9,
      authority: 'Sydney Water',
    },
    metadata: {
      sourceReference: 'Dial before you dig',
      surveyConfidence: 'B',
      notes: 'Pothole before anchors',
    },
  };
}

function serviceCrossingObject(): DraftingObject {
  return {
    ...BASE_OBJECT_FIELDS,
    id: 'service-crossing-1',
    type: 'service_crossing',
    layerId: 'services_conflicts',
    name: 'Service Crossing 1',
    geometry: {
      crossingPoint: { x: 100, y: 50 },
    },
    parameters: {
      crossingId: 'SC1',
      serviceType: 'water',
      conflictType: 'crosses_anchor',
      clearanceMm: 350,
      riskStatus: 'open',
    },
    metadata: {
      linkedServiceRunId: 'SR1',
      linkedObjectId: 'A1',
      notes: 'Review anchor fan',
    },
  };
}

function sectionMarkerObject(): DraftingObject {
  return {
    ...BASE_OBJECT_FIELDS,
    id: 'section-marker-1',
    type: 'section_marker',
    layerId: 'sections',
    name: 'Section A',
    geometry: {
      startPoint: { x: 0, y: 0 },
      endPoint: { x: 3000, y: 0 },
    },
    parameters: {
      sectionId: 'S1',
      sectionLabel: 'A',
      sheetReference: 'S-201',
      arrowDirection: 'both',
    },
    metadata: {
      linkedDrawingId: 'drawing-section-a',
      notes: 'Cut through deepest excavation',
    },
  };
}

function calloutObject(): DraftingObject {
  return {
    ...BASE_OBJECT_FIELDS,
    id: 'callout-1',
    type: 'callout',
    layerId: 'notes',
    name: 'Callout 1',
    geometry: {
      anchorPoint: { x: 0, y: 0 },
      labelPoint: { x: 1000, y: -500 },
    },
    parameters: {
      calloutId: 'CO1',
      title: 'Pour hold',
      body: 'Hold pour until survey sign-off',
      leaderStyle: 'dogleg',
      arrowStyle: 'filled',
    },
    metadata: {
      associatedObjectId: 'CB1',
      notes: 'Issue for review',
    },
  };
}

function calloutWithCsvTextObject(): DraftingObject {
  const object = calloutObject() as Extract<DraftingObject, { type: 'callout' }>;

  return {
    ...object,
    id: 'callout-2',
    parameters: {
      calloutId: 'CO2',
      title: 'Coordination',
      body: 'Review, "hold"\nbefore pour',
      leaderStyle: 'dogleg',
      arrowStyle: 'filled',
    },
    metadata: {
      associatedObjectId: 'SEC1',
      notes: 'Needs review',
    },
  };
}

function dimensionChainObject(): DraftingObject {
  return {
    ...BASE_OBJECT_FIELDS,
    id: 'dimension-chain-1',
    type: 'dimension_chain',
    layerId: 'dimensions',
    name: 'Boundary Setback',
    geometry: {
      points: [
        { x: 0, y: 0 },
        { x: 3000, y: 0 },
        { x: 3000, y: 2000 },
      ],
      offsetDistanceMm: 1200,
    },
    parameters: {
      dimensionId: 'DIM1',
      unit: 'm',
      precision: 2,
      showSegments: true,
      showTotal: true,
      textOverride: '',
    },
    metadata: {
      associatedObjectIds: ['SEC1'],
      notes: 'Check title block later',
    },
  };
}

function leaderNoteObject(): DraftingObject {
  return {
    ...BASE_OBJECT_FIELDS,
    id: 'leader-note-1',
    type: 'leader_note',
    layerId: 'notes',
    name: 'Existing wall note',
    geometry: {
      anchor: { x: 0, y: 0 },
      textPoint: { x: 1000, y: -500 },
    },
    metadata: {
      text: 'Existing wall to remain',
    },
  };
}

function monitoringPointObject(): DraftingObject {
  return {
    ...BASE_OBJECT_FIELDS,
    id: 'monitoring-point-1',
    type: 'monitoring_point',
    layerId: 'monitoring',
    name: 'Monitoring Point 1',
    geometry: {
      point: { x: 0, y: 0 },
    },
    metadata: {
      pointId: 'MP1',
      monitoringType: 'vibration',
      triggerLevel: 5,
      actionLevel: 8,
      units: 'mm/s',
      notes: 'Boundary wall',
    },
  };
}
