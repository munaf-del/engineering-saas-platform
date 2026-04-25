import { describe, expect, it } from 'vitest';
import {
  canClassifyProjectSpatialFeatureAsService,
  getProjectSpatialServiceGeometryType,
  getProjectSpatialMetadataFields,
  isProjectSpatialServiceFeatureType,
  PROJECT_SPATIAL_FEATURE_TYPE_OPTIONS,
} from './project-spatial-utils';

describe('project spatial utilities', () => {
  it('exposes explicit service utility source feature types and metadata fields', () => {
    expect(PROJECT_SPATIAL_FEATURE_TYPE_OPTIONS.map((option) => option.value)).toEqual(
      expect.arrayContaining(['service_run', 'service_crossing']),
    );

    expect(getProjectSpatialMetadataFields('service_run').map((field) => field.key)).toEqual(
      expect.arrayContaining([
        'serviceType',
        'status',
        'diameterMm',
        'depthM',
        'levelRL',
        'authority',
        'material',
        'sourceReference',
        'surveyConfidence',
      ]),
    );
    expect(getProjectSpatialMetadataFields('service_crossing').map((field) => field.key)).toEqual(
      expect.arrayContaining([
        'linkedServiceSourceId',
        'conflictType',
        'clearanceMm',
        'riskStatus',
      ]),
    );
    expect(getProjectSpatialMetadataFields('service_run')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'serviceType',
          kind: 'select',
          options: expect.arrayContaining([
            expect.objectContaining({ value: 'stormwater' }),
            expect.objectContaining({ value: 'communication' }),
            expect.objectContaining({ value: 'unknown' }),
          ]),
        }),
        expect.objectContaining({
          key: 'status',
          kind: 'select',
          options: expect.arrayContaining([expect.objectContaining({ value: 'existing' })]),
        }),
      ]),
    );
  });

  it('requires explicit service source types with matching geometry', () => {
    expect(isProjectSpatialServiceFeatureType('service_run')).toBe(true);
    expect(isProjectSpatialServiceFeatureType('service_crossing')).toBe(true);
    expect(isProjectSpatialServiceFeatureType('other')).toBe(false);

    expect(getProjectSpatialServiceGeometryType('service_run')).toBe('line_string');
    expect(getProjectSpatialServiceGeometryType('service_crossing')).toBe('point');
    expect(canClassifyProjectSpatialFeatureAsService('line_string', 'service_run')).toBe(true);
    expect(canClassifyProjectSpatialFeatureAsService('point', 'service_crossing')).toBe(true);
    expect(canClassifyProjectSpatialFeatureAsService('point', 'service_run')).toBe(false);
    expect(canClassifyProjectSpatialFeatureAsService('line_string', 'service_crossing')).toBe(
      false,
    );
  });
});
