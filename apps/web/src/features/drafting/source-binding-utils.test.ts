import { describe, expect, it, vi } from 'vitest';
import type { ProjectSpatialFeature } from '@eng/shared';
import { createEmptyDraftingModel } from '@eng/shared';
import {
  buildDraftingPileSourceRecords,
  buildDraftingSpatialSourceRecords,
  createDraftingObjectFromSpatialSource,
  createPileObjectFromSource,
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

  it('maps service-like spatial features where existing spatial data carries utility labels', () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('drafting-service-1');
    const model = createEmptyDraftingModel('drawing-source-services');
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
        propertiesJson: { serviceType: 'water', status: 'existing', authority: 'Sydney Water' },
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
        authority: 'Sydney Water',
      },
      sourceRef: {
        sourceType: 'spatial_feature',
        sourceId: 'spatial-1',
      },
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
