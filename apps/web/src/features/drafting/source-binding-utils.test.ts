import { describe, expect, it, vi } from 'vitest';
import type { ProjectEngineeringSourceRegistry, ProjectSpatialFeature } from '@eng/shared';
import { createEmptyDraftingModel } from '@eng/shared';
import {
  buildDraftingPileSourceRecords,
  buildDraftingPileSourceRecordsFromRegistry,
  buildDraftingPileTypeSourceRecords,
  buildDraftingPileTypeSourceRecordsFromRegistry,
  buildDraftingSpatialSourceRecords,
  buildDraftingSpatialSourceRecordsFromRegistry,
  createDraftingObjectFromSpatialSource,
  createPileObjectFromSource,
  createPileObjectFromTypeSource,
  getPileTypeCompleteness,
  refreshPileObjectFromSource,
  refreshSpatialObjectFromSource,
} from './source-binding-utils';

describe('drafting source binding utils', () => {
  it('maps persisted pile records to source-linked drafting piles', () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('drafting-pile-1');
    const model = createEmptyDraftingModel('drawing-source-piles');
    const [source] = buildDraftingPileSourceRecords([
      {
        id: 'group-1',
        projectId: 'project-1',
        name: 'North wall pile group',
        piles: [
          {
            id: 'pile-db-1',
            pileGroupId: 'group-1',
            name: 'P1',
            pileType: 'bored',
            diameter: 0.75,
            length: 18,
            embedmentDepth: 4.5,
          },
        ],
        layoutPoints: [
          {
            id: 'layout-1',
            pileGroupId: 'group-1',
            pileId: 'pile-db-1',
            x: 1000,
            y: 2000,
            z: 9.5,
            label: 'P1',
          },
        ],
      },
    ]);

    const object = createPileObjectFromSource({
      fallbackPoint: { x: 0, y: 0 },
      model,
      source: source!,
    });

    expect(object).toMatchObject({
      id: 'drafting-pile-1',
      type: 'pile',
      name: 'P1',
      geometry: {
        centre: { x: 1000, y: 2000, z: 9.5 },
        diameterMm: 750,
      },
      metadata: {
        pileId: 'P1',
        pileType: 'bored',
      },
      sourceRef: {
        sourceType: 'foundation_pile',
        sourceId: 'pile-db-1',
        sourceLabel: 'P1',
        status: 'linked',
      },
    });
    expect(object.sourceRef?.snapshot).toMatchObject({
      pileGroupName: 'North wall pile group',
      pileType: 'bored',
      diameter: 0.75,
      diameterMm: 750,
      length: 18,
      embedmentDepth: 4.5,
    });
  });

  it('maps persisted multi-pile type library entries to drafting pile type sources', () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('drafting-pile-type-1');
    const model = createEmptyDraftingModel('drawing-source-pile-types');
    const [source] = buildDraftingPileTypeSourceRecords([
      {
        id: 'group-1',
        projectId: 'project-1',
        name: 'foundation piles',
        updatedAt: '2026-04-25T00:00:00.000Z',
        metadata: {
          multiPile: {
            pileTypes: [
              {
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
                compressionUltimateMax: 3200,
                tensionUltimateMin: null,
                tensionUltimateMax: 900,
                pileSystem: 'bored pile',
                concreteGrade: 'C40',
                socketLengthM: 3,
                foundingStratum: 'weathered shale',
                designLateralKn: 120,
                status: 'active',
                active: true,
                order: 0,
              },
            ],
            joints: [],
          },
        },
      },
    ]);

    expect(source).toMatchObject({
      sourceType: 'foundation_pile_type',
      sourceId: 'group-1:type:BP1',
      sourceLabel: 'BP1',
      groupName: 'foundation piles',
    });

    const object = createPileObjectFromTypeSource({
      model,
      point: { x: 100, y: 200 },
      source: source!,
    });

    expect(object).toMatchObject({
      id: 'drafting-pile-type-1',
      type: 'pile',
      geometry: { centre: { x: 100, y: 200 }, diameterMm: 600 },
      metadata: {
        pileId: 'P-NEW-001',
        pileTypeCode: 'BP1',
        pileSystem: 'bored pile',
        concreteGrade: 'C40',
        socketLengthM: 3,
        foundingStratum: 'weathered shale',
        designCompressionKn: 3200,
        designTensionKn: 900,
        designLateralKn: 120,
        sourceCompleteness: 'complete',
        sourceStatus: 'active',
      },
      sourceRef: {
        sourceType: 'foundation_pile_type',
        sourceId: 'group-1:type:BP1',
        sourceLabel: 'BP1',
        status: 'current',
      },
    });
    expect(object.sourceRef?.snapshot).toMatchObject({
      completeness: { status: 'complete', missing: [] },
    });
  });

  it('maps multi-pile joints as structural joint sources', () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('drafting-joint-1');
    const [source] = buildDraftingPileSourceRecords([
      {
        id: 'group-1',
        projectId: 'project-1',
        name: 'foundation piles',
        metadata: {
          multiPile: {
            pileTypes: [
              {
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
                active: true,
                order: 0,
              },
            ],
            joints: [
              {
                id: 'J1',
                x: 0,
                y: 0,
                z: 0,
                supportCount: 1,
                noOfSupports: 1,
                pileTypeId: 'BP1',
                assignmentMode: 'manual',
                active: true,
                order: 0,
              },
            ],
          },
        },
      },
    ]);

    expect(source).toMatchObject({
      sourceType: 'foundation_pile',
      sourceId: 'group-1:joint:J1',
      sourceLabel: 'J1',
      pileType: { id: 'BP1' },
      joint: { x: 0, y: 0, pileTypeId: 'BP1' },
    });

    const object = createPileObjectFromSource({
      fallbackPoint: { x: 100, y: 100 },
      model: createEmptyDraftingModel('drawing-source-joints'),
      source: source!,
    });

    expect(object).toMatchObject({
      id: 'drafting-joint-1',
      type: 'structural_joint',
      name: 'J1',
      geometry: { point: { x: 0, y: 0, z: 0 } },
      parameters: {
        jointId: 'J1',
        label: 'J1',
      },
      sourceRef: {
        sourceType: 'foundation_joint',
        sourceId: 'group-1:joint:J1',
        sourceLabel: 'J1',
        status: 'linked',
      },
    });
  });

  it('classifies pile type completeness for source manager badges', () => {
    expect(
      getPileTypeCompleteness({
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
        active: true,
        order: 0,
      }).status,
    ).toBe('diameter_only');
    expect(
      getPileTypeCompleteness({
        id: 'BP2',
        displayName: 'BP2',
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
        active: true,
        order: 0,
      }).status,
    ).toBe('partial');
  });

  it('refreshes pile type sources and marks missing source records', () => {
    const model = createEmptyDraftingModel('drawing-refresh-pile-type');
    const [source] = buildDraftingPileTypeSourceRecords([
      {
        id: 'group-1',
        projectId: 'project-1',
        name: 'foundation piles',
        metadata: {
          multiPile: {
            pileTypes: [
              {
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
            ],
            joints: [],
          },
        },
      },
    ]);
    const object = createPileObjectFromTypeSource({
      model,
      point: { x: 10, y: 20 },
      source: source!,
    });

    const refreshed = refreshPileObjectFromSource({
      object,
      pileSources: [],
      pileTypeSources: [source!],
    });
    expect(refreshed.geometry.centre).toEqual({ x: 10, y: 20 });
    expect(refreshed.geometry.diameterMm).toBe(750);
    expect(refreshed.sourceRef?.status).toBe('current');

    const missing = refreshPileObjectFromSource({
      object,
      pileSources: [],
      pileTypeSources: [],
    });
    expect(missing.sourceRef?.status).toBe('missing_source');
  });

  it('maps borehole spatial features to source-linked drafting boreholes', () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('drafting-bh-1');
    const model = createEmptyDraftingModel('drawing-source-boreholes');
    const [source] = buildDraftingSpatialSourceRecords([
      spatialFeature({
        featureType: 'borehole',
        geometryJson: { type: 'Point', coordinates: [300, 400, 12.5] },
        label: 'BH-01',
        propertiesJson: { boreholeId: 'BH1', depthM: '18.2', rlM: '12.45' },
      }),
    ]);

    const object = createDraftingObjectFromSpatialSource({
      fallbackPoint: { x: 0, y: 0 },
      model,
      source: source!,
    });

    expect(object).toMatchObject({
      type: 'borehole',
      geometry: { point: { x: 300, y: 400, z: 12.5 } },
      parameters: {
        boreholeId: 'BH1',
        label: 'BH-01',
        groundLevelRl: 12.45,
        terminationDepthM: 18.2,
        terminationLevelRl: -5.75,
      },
      sourceRef: {
        sourceType: 'geotech_borehole',
        sourceId: 'spatial-1',
        sourceLabel: 'BH-01',
        status: 'linked',
      },
    });
  });

  it('maps explicit service run spatial features to linked drafting service runs', () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('drafting-service-1');
    const model = createEmptyDraftingModel('drawing-source-services');
    const [source] = buildDraftingSpatialSourceRecords([
      spatialFeature({
        featureType: 'service_run',
        geometryType: 'line_string',
        geometryJson: {
          type: 'LineString',
          coordinates: [
            [0, 0],
            [1000, 0],
          ],
        },
        label: 'Existing water service',
        propertiesJson: {
          serviceType: 'water',
          status: 'existing',
          authority: 'Sydney Water',
          diameterMm: '150',
          sourceReference: 'DBYD 240423',
        },
      }),
    ]);

    const object = createDraftingObjectFromSpatialSource({
      fallbackPoint: { x: 0, y: 0 },
      model,
      source: source!,
    });

    expect(source?.objectType).toBe('service_run');
    expect(object).toMatchObject({
      type: 'service_run',
      geometry: {
        path: [
          { x: 0, y: 0 },
          { x: 1000, y: 0 },
        ],
      },
      parameters: {
        serviceId: 'Existing water service',
        serviceType: 'water',
        status: 'existing',
        diameterMm: 150,
        authority: 'Sydney Water',
      },
      metadata: { sourceReference: 'DBYD 240423' },
      sourceRef: {
        sourceType: 'spatial_feature',
        sourceId: 'spatial-1',
      },
    });
  });

  it('does not infer service sources from generic spatial labels', () => {
    const [source] = buildDraftingSpatialSourceRecords([
      spatialFeature({
        featureType: 'other',
        geometryType: 'line_string',
        geometryJson: {
          type: 'LineString',
          coordinates: [
            [0, 0],
            [1000, 0],
          ],
        },
        label: 'Existing water service',
        propertiesJson: { serviceType: 'water' },
      }),
    ]);

    expect(source).toBeUndefined();
  });

  it('refreshes linked service run objects from explicit project service sources', () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('drafting-service-refresh');
    const model = createEmptyDraftingModel('drawing-source-service-refresh');
    const [source] = buildDraftingSpatialSourceRecords([
      spatialFeature({
        id: 'spatial-service-refresh',
        featureType: 'service_run',
        geometryType: 'line_string',
        geometryJson: {
          type: 'LineString',
          coordinates: [
            [0, 0],
            [1000, 0],
          ],
        },
        label: 'W-EX-01',
        propertiesJson: { serviceType: 'water', status: 'existing', diameterMm: '150' },
      }),
    ]);
    const object = createDraftingObjectFromSpatialSource({
      fallbackPoint: { x: 500, y: 500 },
      model,
      source: source!,
    });
    expect(object.type).toBe('service_run');
    if (object.type !== 'service_run') {
      throw new Error('Expected service run object');
    }
    const refreshed = refreshSpatialObjectFromSource({
      object: {
        ...object,
        parameters: { ...object.parameters, diameterMm: 100 },
        geometry: {
          path: [
            { x: 99, y: 99 },
            { x: 199, y: 99 },
          ],
        },
      },
      spatialSources: [
        {
          ...source!,
          feature: {
            ...source!.feature,
            geometryJson: {
              type: 'LineString',
              coordinates: [
                [10, 20],
                [30, 20],
              ],
            },
            propertiesJson: {
              serviceType: 'water',
              status: 'existing',
              diameterMm: '225',
              authority: 'Sydney Water',
            },
          },
        },
      ],
    });

    expect(refreshed).toMatchObject({
      id: object.id,
      type: 'service_run',
      geometry: {
        path: [
          { x: 99, y: 99 },
          { x: 199, y: 99 },
        ],
      },
      parameters: {
        diameterMm: 225,
        authority: 'Sydney Water',
      },
      sourceRef: {
        sourceId: 'spatial-service-refresh',
        status: 'linked',
      },
    });
  });

  it('derives drafting source records from the project engineering source registry', () => {
    const registry: ProjectEngineeringSourceRegistry = {
      projectId: 'project-1',
      generatedAt: '2026-04-25T00:00:00.000Z',
      sources: {
        foundation: {
          pileTypes: [
            {
              sourceType: 'foundation_pile_type',
              sourceId: 'group-1:type:BP1',
              sourceLabel: 'BP1',
              sourceCode: 'BP1',
              originModule: 'foundations',
              status: 'current',
              completeness: 'complete',
              sourcePath: 'pile_groups.metadata.multiPile.pileTypes[0]',
              sourceVersion: '2026-04-25T00:00:00.000Z',
              engineering: { diameterMm: 600, concreteGrade: 'C40' },
              snapshot: {
                pileGroupId: 'group-1',
                pileGroupName: 'foundation piles',
                pileTypeDefinition: pileType('BP1', 600, {
                  concreteGrade: 'C40',
                  socketLengthM: 3,
                }),
              },
            },
          ],
          placedPiles: [
            {
              sourceType: 'foundation_pile',
              sourceId: 'group-1:joint:J1',
              sourceLabel: 'J1',
              sourceCode: 'J1',
              originModule: 'foundations',
              status: 'current',
              completeness: 'complete',
              coordinates: { x: 0, y: 0, z: 0 },
              sourcePath: 'pile_groups.metadata.multiPile.joints[0]',
              engineering: { pileTypeCode: 'BP1', diameterMm: 600 },
              snapshot: {
                pileGroupId: 'group-1',
                pileGroupName: 'foundation piles',
                joint: {
                  id: 'J1',
                  x: 0,
                  y: 0,
                  z: 0,
                  supportCount: 1,
                  noOfSupports: 1,
                  pileTypeId: 'BP1',
                  assignmentMode: 'manual',
                  active: true,
                  order: 0,
                },
                pileTypeDefinition: pileType('BP1', 600),
              },
            },
          ],
          pileGroups: [],
          capacityProfiles: [],
          designChecks: [],
        },
        geotech: {
          boreholes: [
            {
              sourceType: 'geotech_borehole',
              sourceId: 'spatial-bh-1',
              sourceLabel: 'nh',
              originModule: 'spatial',
              status: 'current',
              completeness: 'partial',
              coordinates: { x: 1, y: 2 },
              sourcePath: 'project_spatial_features',
              engineering: { boreholeId: 'nh' },
              snapshot: {
                feature: spatialFeature({
                  featureType: 'borehole',
                  geometryJson: { type: 'Point', coordinates: [1, 2] },
                  label: 'nh',
                }),
              },
            },
          ],
          strata: [],
        },
        monitoring: {
          monitoringPoints: [],
          omnidotsMeasuringPoints: [],
        },
        spatial: {
          referencePoints: [],
          boundaries: [],
          features: [],
          services: [],
        },
        services: {
          serviceRuns: [
            serviceSource({
              sourceId: 'spatial-service-1',
              sourceLabel: 'W-EX-01',
              category: 'service_run',
              objectType: 'service_run',
              featureType: 'service_run',
              geometryType: 'line_string',
              geometryJson: {
                type: 'LineString',
                coordinates: [
                  [0, 0],
                  [1000, 0],
                ],
              },
            }),
          ],
          serviceCrossings: [],
          warnings: [],
        },
      },
      warnings: [],
    };

    expect(buildDraftingPileTypeSourceRecordsFromRegistry(registry)[0]).toMatchObject({
      sourceLabel: 'BP1',
      originModule: 'foundations',
      sourcePath: 'pile_groups.metadata.multiPile.pileTypes[0]',
    });
    expect(buildDraftingPileSourceRecordsFromRegistry(registry)[0]).toMatchObject({
      sourceLabel: 'J1',
      joint: { id: 'J1' },
      pileType: { id: 'BP1' },
    });
    expect(buildDraftingSpatialSourceRecordsFromRegistry(registry)[0]).toMatchObject({
      sourceLabel: 'nh',
      objectType: 'borehole',
      originModule: 'spatial',
    });
    expect(buildDraftingSpatialSourceRecordsFromRegistry(registry)[1]).toMatchObject({
      sourceLabel: 'W-EX-01',
      objectType: 'service_run',
      originModule: 'spatial',
    });
  });
});

function spatialFeature(
  overrides: Partial<ProjectSpatialFeature> &
    Pick<ProjectSpatialFeature, 'featureType' | 'geometryJson' | 'label'>,
): ProjectSpatialFeature {
  const { featureType, geometryJson, geometryType, label, propertiesJson, ...rest } = overrides;
  return {
    id: 'spatial-1',
    projectId: 'project-1',
    featureType,
    geometryType: geometryType ?? (geometryJson.type === 'LineString' ? 'line_string' : 'point'),
    label,
    description: null,
    geometryJson,
    status: null,
    sourceType: 'manual',
    sourceReference: null,
    linkedProjectReferenceId: null,
    linkedAiDocumentId: null,
    linkedDeliverableType: null,
    linkedDeliverableId: null,
    propertiesJson: propertiesJson ?? null,
    sortOrder: 1,
    createdAt: '2026-04-25T00:00:00.000Z',
    updatedAt: '2026-04-25T00:00:00.000Z',
    ...rest,
  };
}

function serviceSource({
  category,
  featureType,
  geometryJson,
  geometryType,
  objectType,
  sourceId,
  sourceLabel,
}: {
  category: 'service_run' | 'service_crossing';
  featureType: 'service_run' | 'service_crossing';
  geometryJson: ProjectSpatialFeature['geometryJson'];
  geometryType: ProjectSpatialFeature['geometryType'];
  objectType: 'service_run' | 'service_crossing';
  sourceId: string;
  sourceLabel: string;
}) {
  return {
    sourceType: 'spatial_feature' as const,
    sourceId,
    sourceLabel,
    originModule: 'spatial' as const,
    status: 'current' as const,
    completeness: 'partial' as const,
    sourcePath: 'project_spatial_features',
    engineering: {
      featureType,
      geometryType,
      serviceType: 'water',
      serviceStatus: 'existing',
    },
    category,
    snapshot: {
      objectType,
      feature: spatialFeature({
        featureType,
        geometryType,
        geometryJson,
        label: sourceLabel,
      }),
    },
  };
}

function pileType(id: string, diameterMm: number, overrides: Record<string, unknown> = {}) {
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
