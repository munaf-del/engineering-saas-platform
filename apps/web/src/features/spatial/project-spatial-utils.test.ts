import { describe, expect, it } from 'vitest';
import {
  getProjectSpatialMetadataFields,
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
  });
});
