import { describe, expect, it } from 'vitest';
import type { NoiseVibrationCriterionRow } from '@/features/standards/noise-vibration-types';
import type {
  ProjectEnvironmentalMonitoringSelectedCriterion,
  ProjectEnvironmentalNoiseResultRow,
} from './environmental-monitoring-types';
import {
  calculateNoiseResultAssessment,
  formatMonitoringCriterionApplicabilityLabel,
  formatMonitoringCriterionSourceType,
} from './monitoring-report-helpers';

describe('monitoring report helpers', () => {
  it('formats criterion applicability states for report output', () => {
    expect(formatMonitoringCriterionApplicabilityLabel('reference_only')).toBe('Reference only');
    expect(formatMonitoringCriterionApplicabilityLabel('superseded_by_project_condition')).toBe(
      'Superseded by project condition',
    );
  });

  it('distinguishes guideline criteria from project-specific conditions', () => {
    const guidelineSelection = {
      criterionRow: {
        source: {
          name: 'Interim Construction Noise Guideline',
          sourceCitation: 'DECCW 2009',
          instrumentType: 'guidance_only',
        },
      },
      isEnforceableOnThisProject: false,
      projectConditionReference: null,
    } as Pick<
      ProjectEnvironmentalMonitoringSelectedCriterion,
      'criterionRow' | 'isEnforceableOnThisProject' | 'projectConditionReference'
    >;
    const projectConditionSelection = {
      ...guidelineSelection,
      projectConditionReference: 'SSI-123 Condition E12',
    };

    expect(formatMonitoringCriterionSourceType(guidelineSelection)).toBe('Guideline only');
    expect(formatMonitoringCriterionSourceType(projectConditionSelection)).toBe('Project-specific');
  });

  it('calculates exceedance when both measured and criterion values are numeric', () => {
    const criterionRow = createCriterionRow({
      basisType: 'absolute',
      criterionValue: '45',
      groupMetric: 'laeq_15min',
      unit: 'dB(A)',
    });
    const result = createNoiseResultRow({
      descriptorMetric: 'laeq_15min',
      measuredUnit: 'dB(A)',
      measuredValue: '47.2',
    });

    expect(
      calculateNoiseResultAssessment({
        result,
        selectedCriterion: { criterionRow } as Pick<
          ProjectEnvironmentalMonitoringSelectedCriterion,
          'criterionRow'
        >,
      }),
    ).toMatchObject({
      criterionValue: 45,
      criterionValueLabel: '45 dB(A)',
      exceedanceAmount: 2.2,
      exceedanceAmountLabel: '2.2 dB(A)',
      metricLabel: 'LAeq,15min',
      requiresManualAssessment: false,
      requiresSelection: false,
    });
  });

  it('requires manual assessment for descriptive or non-numeric criteria', () => {
    const criterionRow = createCriterionRow({
      basisType: 'descriptive',
      criterionValue: null,
      groupMetric: 'none',
      unit: null,
    });
    const result = createNoiseResultRow({
      descriptorMetric: 'laeq_15min',
      measuredUnit: 'dB(A)',
      measuredValue: '52',
    });

    expect(
      calculateNoiseResultAssessment({
        result,
        selectedCriterion: { criterionRow } as Pick<
          ProjectEnvironmentalMonitoringSelectedCriterion,
          'criterionRow'
        >,
      }),
    ).toMatchObject({
      criterionValue: null,
      exceedanceAmount: null,
      requiresManualAssessment: true,
      requiresSelection: false,
    });
  });
});

function createCriterionRow(
  overrides: Partial<NoiseVibrationCriterionRow> & {
    groupMetric?: NoiseVibrationCriterionRow['group']['metric'];
  },
): NoiseVibrationCriterionRow {
  const {
    group: groupOverrides,
    groupMetric,
    source: sourceOverrides,
    ...rowOverrides
  } = overrides;
  const baseGroup: NoiseVibrationCriterionRow['group'] = {
    id: 'group-1',
    standardSourceId: 'source-1',
    slug: 'airborne-noise',
    title: 'Airborne noise',
    criterionCategory: 'airborne_noise_management',
    metric: groupMetric ?? 'laeq_15min',
    locationBasis: null,
    description: null,
    sortOrder: 0,
    createdAt: '2026-04-19T00:00:00.000Z',
    updatedAt: '2026-04-19T00:00:00.000Z',
  };
  const baseSource: NoiseVibrationCriterionRow['source'] = {
    id: 'source-1',
    slug: 'icng',
    name: 'Interim Construction Noise Guideline',
    shortName: 'ICNG',
    publisher: 'DECCW',
    jurisdiction: 'NSW',
    year: 2009,
    publicationStatus: 'active',
    legalStatus: 'guidance_only',
    instrumentType: 'guidance_only',
    sourceCitation: 'DECCW 2009',
    sourceUrl: null,
    notes: null,
    isSeeded: true,
    createdAt: '2026-04-19T00:00:00.000Z',
    updatedAt: '2026-04-19T00:00:00.000Z',
  };

  return {
    id: 'criterion-1',
    criterionGroupId: 'group-1',
    rowKey: 'row-1',
    label: 'Residential daytime criterion',
    receiverType: 'residential',
    structureType: null,
    timePeriod: 'day',
    basisType: 'absolute',
    referenceBase: null,
    relativeOffset: null,
    criterionValue: '45',
    preferredValue: null,
    maximumValue: null,
    alertValue: null,
    stopWorkValue: null,
    absoluteMaxValue: null,
    valueMin: null,
    valueMax: null,
    frequencyMinHz: null,
    frequencyMaxHz: null,
    weekdayStart: null,
    weekdayEnd: null,
    saturdayStart: null,
    saturdayEnd: null,
    sundayAllowed: null,
    publicHolidayAllowed: null,
    exceedanceAllowancePercent: null,
    exceedanceWindowText: null,
    unit: 'dB(A)',
    sourceClause: 'Clause 1',
    rowNotes: null,
    sortOrder: 0,
    createdAt: '2026-04-19T00:00:00.000Z',
    updatedAt: '2026-04-19T00:00:00.000Z',
    workTypes: ['general_construction'],
    ...rowOverrides,
    group: { ...baseGroup, ...(groupOverrides ?? {}) },
    source: { ...baseSource, ...(sourceOverrides ?? {}) },
  };
}

function createNoiseResultRow(
  overrides: Partial<ProjectEnvironmentalNoiseResultRow>,
): ProjectEnvironmentalNoiseResultRow {
  return {
    id: 'result-1',
    monitoringReportId: 'report-1',
    observedAt: '2026-04-19T00:00:00.000Z',
    locationId: 'location-1',
    activityLabel: 'Saw cutting',
    instrumentNote: null,
    measurementPeriodNote: null,
    descriptorMetric: 'laeq_15min',
    measuredValue: '47.2',
    measuredUnit: 'dB(A)',
    laeq15min: null,
    lamax: null,
    laf1_1min: null,
    backgroundNote: null,
    selectedCriterionId: 'selected-criterion-1',
    criterionRowId: 'criterion-1',
    complianceStatus: 'not_assessed',
    resultNote: null,
    sortOrder: 0,
    location: null,
    criterionRow: null,
    ...overrides,
  };
}
