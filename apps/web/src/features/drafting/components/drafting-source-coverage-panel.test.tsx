import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ProjectEngineeringSourceRegistry, ProjectSpatialFeature } from '@eng/shared';
import { createEmptyDraftingModel } from '@eng/shared';
import { describe, expect, it } from 'vitest';
import { DraftingSourceCoveragePanel } from './drafting-source-coverage-panel';

describe('DraftingSourceCoveragePanel', () => {
  it('summarizes registry-backed sources, missing sources, and sketch objects', () => {
    const model = createEmptyDraftingModel('coverage-drawing');
    model.objects = [
      {
        id: 'drafting-j1',
        name: 'J1',
        type: 'pile',
        sourceRef: {
          sourceType: 'foundation_pile',
          sourceId: 'group-1:joint:J1',
          sourceLabel: 'J1',
          sourceVersion: '2026-04-25T00:00:00.000Z',
          status: 'linked',
        },
      },
      {
        id: 'drafting-sketch',
        name: 'Sketch pile',
        type: 'pile',
      },
    ] as typeof model.objects;

    const markup = renderToStaticMarkup(
      <DraftingSourceCoveragePanel
        model={model}
        onPlacePileSource={() => undefined}
        onPlaceSpatialSource={() => undefined}
        onRefreshObject={() => undefined}
        onSelectObject={() => undefined}
        pileSourceManageHref="/projects/project-1/pile-groups/group-1/multi-pile"
        pileSources={[
          {
            sourceType: 'foundation_pile',
            sourceId: 'group-1:joint:J1',
            sourceLabel: 'J1',
            groupId: 'group-1',
            groupName: 'North wall',
            sourceVersion: '2026-04-25T00:00:00.000Z',
          },
        ]}
        registry={registry}
        spatialSources={[
          {
            sourceType: 'spatial_feature',
            sourceId: 'spatial-service-run-1',
            sourceLabel: 'Service Run 01',
            objectType: 'service_run',
            originModule: 'spatial',
            sourcePath: 'project_spatial_features',
            feature: spatialFeature({
              featureType: 'service_run',
              geometryType: 'line_string',
              geometryJson: {
                type: 'LineString',
                coordinates: [
                  [0, 0],
                  [1, 1],
                ],
              },
              label: 'Service Run 01',
            }),
          },
        ]}
      />,
    );

    expect(markup).toContain('data-testid="drafting-source-coverage-panel"');
    expect(markup).toContain('Project Source Coverage');
    expect(markup).toContain('data-testid="drafting-source-adapter-readiness"');
    expect(markup).toContain('Source linking is opt-in.');
    expect(markup).toContain('this panel does not invent missing source records');
    expect(markup).toContain('Foundation / Pile type library');
    expect(markup).toContain('BP1');
    expect(markup).toContain('Used by 0');
    expect(markup).toContain('Foundation / Existing placed piles and joints');
    expect(markup).toContain('J1');
    expect(markup).toContain('Placed');
    expect(markup).toContain('Spatial / Services / Service runs');
    expect(markup).toContain('Service Run 01');
    expect(markup).toContain('Place linked object');
    expect(markup).toContain('Sketch / Unlinked objects');
    expect(markup).toContain('Sketch pile');
    expect(markup).not.toContain('QA Service Run');
  });
});

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
          completeness: 'diameter_only',
          sourcePath: 'pile_groups.metadata.multiPile.pileTypes[0]',
          sourceVersion: '2026-04-25T00:00:00.000Z',
          usedByDraftingObjectCount: 0,
          engineering: { diameterMm: 600 },
          snapshot: { pileGroupId: 'group-1' },
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
          coordinates: { x: 0, y: 0 },
          sourcePath: 'pile_groups.metadata.multiPile.joints[0]',
          sourceVersion: '2026-04-25T00:00:00.000Z',
          engineering: { pileTypeCode: 'BP1' },
          snapshot: { joint: { id: 'J1' } },
        },
      ],
      pileGroups: [],
      capacityProfiles: [],
      designChecks: [],
    },
    geotech: { boreholes: [], strata: [] },
    monitoring: { monitoringPoints: [], omnidotsMeasuringPoints: [] },
    spatial: { boundaries: [], features: [], referencePoints: [], services: [] },
    services: {
      serviceRuns: [
        {
          sourceType: 'spatial_feature',
          sourceId: 'spatial-service-run-1',
          sourceLabel: 'Service Run 01',
          originModule: 'spatial',
          status: 'current',
          completeness: 'unknown',
          sourcePath: 'project_spatial_features',
          category: 'service_run',
          engineering: { featureType: 'service_run', geometryType: 'line_string' },
          snapshot: { objectType: 'service_run' },
        },
      ],
      serviceCrossings: [],
      warnings: [],
    },
  },
  warnings: [],
};

function spatialFeature(
  overrides: Partial<ProjectSpatialFeature> &
    Pick<ProjectSpatialFeature, 'featureType' | 'geometryJson' | 'label'>,
): ProjectSpatialFeature {
  const { featureType, geometryJson, geometryType, label, ...rest } = overrides;
  return {
    id: 'spatial-service-run-1',
    projectId: 'project-1',
    featureType,
    geometryType: geometryType ?? 'point',
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
    propertiesJson: null,
    sortOrder: 1,
    createdAt: '2026-04-25T00:00:00.000Z',
    updatedAt: '2026-04-25T00:00:00.000Z',
    ...rest,
  };
}
