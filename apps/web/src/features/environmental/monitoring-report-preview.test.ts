import { describe, expect, it } from 'vitest';
import type { Project } from '@eng/shared';
import { createBuiltInGenericTemplateLibrary } from '@/features/templates/persistence/generic-template-library';
import type { NoiseVibrationCriterionRow } from '@/features/standards/noise-vibration-types';
import type {
  ProjectEnvironmentalMonitoringAnnexure,
  ProjectEnvironmentalMonitoringReport,
  ProjectEnvironmentalMonitoringSelectedCriterion,
  ProjectEnvironmentalNoiseResultRow,
} from './environmental-monitoring-types';
import {
  buildMonitoringPackageArtifactFromDraft,
  buildMonitoringPackageTextIndex,
} from './monitoring-report-preview';

describe('monitoring report preview golden path', () => {
  it('indexes saved monitoring content and generic Root Sheet Template labels for preview output', () => {
    const report = createReport();
    const artifact = buildMonitoringPackageArtifactFromDraft(createProject(), report);
    const previewText = buildMonitoringPackageTextIndex(artifact);

    expect(previewText).toContain('Golden Path Monitoring Report');
    expect(previewText).toContain('VM3');
    expect(previewText).toContain('Residential standard-hours noise affected management level');
    expect(previewText).toContain('Saw cutting near portal');
    expect(previewText).toContain(
      'Levels exceeded the selected management criterion during saw cutting.',
    );
    expect(previewText).toContain('Review shielding and saw-cutting setup before the next shift.');
    expect(previewText).toContain('Monitoring Location Plan');
    expect(previewText).toContain('Stage 2 Monitoring Locations');
    expect(previewText).toContain('AS 1100 A3 Landscape');
    expect(previewText).toContain('Root Sheet Template');
    expect(previewText).not.toContain('Built-in Sheet Template fallback');
    expect(previewText).not.toContain('EngPlatform');
  });
});

function createProject(): Project {
  return {
    id: 'project-1',
    organisationId: 'org-1',
    code: 'NS-001',
    name: 'NORTH SYDNEY',
    status: 'active',
    createdAt: '2026-04-19T00:00:00.000Z',
    updatedAt: '2026-04-19T00:00:00.000Z',
    metadata: {
      projectSpecifics: {
        identity: {
          address: '100 Miller Street, North Sydney NSW',
          client: 'Demo Client',
          projectName: 'NORTH SYDNEY',
          projectNumber: 'NS-001',
        },
      },
    },
  } as unknown as Project;
}

function createReport(): ProjectEnvironmentalMonitoringReport {
  const criterionRow = createCriterionRow();
  const selectedCriterion = {
    id: 'selected-criterion-1',
    monitoringReportId: 'report-1',
    criterionRowId: criterionRow.id,
    selectionPurpose: 'noise',
    applicabilityStatus: 'reference_only',
    isEnforceableOnThisProject: false,
    projectConditionReference: null,
    selectionNote: 'Reference only until project-specific conditions are confirmed.',
    sortOrder: 0,
    criterionRow,
  } satisfies ProjectEnvironmentalMonitoringSelectedCriterion;
  const rootSheetTemplate = createBuiltInGenericTemplateLibrary().find(
    (template) => template.paperSize === 'a3' && template.orientation === 'landscape',
  );
  if (!rootSheetTemplate) {
    throw new Error('Missing built-in AS 1100 A3 landscape template');
  }
  const annexure = {
    id: 'annexure-1',
    monitoringReportId: 'report-1',
    title: 'Monitoring Location Plan',
    annexureType: 'spatial_sheet',
    templateSourceKind: 'root_sheet_template',
    templateReferenceId: 'root-template-1',
    rootSheetTemplateId: 'root-template-1',
    rootSheetTemplateVersionId: 'root-template-version-1',
    templateSnapshotJson: rootSheetTemplate,
    sourceLabel: 'Stage 2 Monitoring Locations',
    bindingJson: {
      activeBasemap: 'nsw_topographic',
      rootSheetTemplateSnapshot: {
        id: 'root-template-1',
        label: rootSheetTemplate.name,
        templateDocument: rootSheetTemplate,
        versionId: 'root-template-version-1',
      },
      showGeologyOverlay: false,
      viewState: {
        centerLonLat: [151.2, -33.8],
        rotation: 0,
        zoom: 16.2,
      },
      visibleFeatureTypes: ['noise_monitor', 'receiver'],
    },
    sortOrder: 0,
    createdAt: '2026-04-19T00:00:00.000Z',
    updatedAt: '2026-04-19T00:00:00.000Z',
  } satisfies ProjectEnvironmentalMonitoringAnnexure;
  const noiseResult = createNoiseResultRow({
    activityLabel: 'Saw cutting near portal',
    complianceStatus: 'criterion_exceeded',
    criterionRow: criterionRow,
    criterionRowId: criterionRow.id,
    descriptorMetric: 'laeq_15min',
    location: { id: 'location-1', label: 'VM3' },
    locationId: 'location-1',
    measuredUnit: 'dB(A)',
    measuredValue: '48',
    resultNote: 'Temporary shielding was not installed during this interval.',
    selectedCriterionId: selectedCriterion.id,
  });

  return {
    id: 'report-1',
    projectId: 'project-1',
    reportType: 'noise_monitoring',
    title: 'Golden Path Monitoring Report',
    revision: 'A',
    issueDate: '2026-04-19T00:00:00.000Z',
    documentStatus: 'Draft',
    preparedBy: 'Demo Admin',
    checkedBy: 'QA Reviewer',
    purpose: 'Verify the end-to-end monitoring report golden path.',
    monitoringDate: '2026-04-19T00:00:00.000Z',
    monitoringWindowStart: '2026-04-19T09:00:00.000Z',
    monitoringWindowEnd: '2026-04-19T11:00:00.000Z',
    weatherConditions: 'Fine, light winds',
    siteActivitySummary: 'Saw cutting and light plant movement near the portal.',
    executiveSummary: 'The report body contains real monitoring data for QA review.',
    generalObservations:
      'Monitoring locations were imported from the selected Project Spatial View.',
    conclusion: 'One monitored activity exceeded the selected management criterion.',
    recommendationsSummary: 'Install shielding and review setup before the next shift.',
    assumptionsLimitations: 'Results represent the monitored interval only.',
    createdAt: '2026-04-19T00:00:00.000Z',
    updatedAt: '2026-04-19T00:00:00.000Z',
    packageIssues: [],
    annexures: [annexure],
    references: [],
    locations: [
      {
        id: 'location-1',
        monitoringReportId: 'report-1',
        label: 'VM3',
        receiverType: 'residential',
        sourceSpatialViewId: 'view-1',
        sourceSpatialViewLabel: 'Stage 2 Monitoring Locations',
        sourceSpatialFeatureId: 'feature-vm3',
        sourceSpatialFeatureLabel: 'VM3',
        sourceSpatialFeatureType: 'noise_monitor',
        locationDescription: 'Portal edge monitor',
        distanceNote: 'Approx. 20 m from active saw cutting',
        chainageNote: 'Ch 1+240',
        coordinatesNote: '151.20000, -33.80000',
        assessmentLocationBasis: 'external',
        sortOrder: 0,
      },
      {
        id: 'location-2',
        monitoringReportId: 'report-1',
        label: 'Receiver R1',
        receiverType: 'residential',
        sourceSpatialViewId: 'view-1',
        sourceSpatialViewLabel: 'Stage 2 Monitoring Locations',
        sourceSpatialFeatureId: 'feature-r1',
        sourceSpatialFeatureLabel: 'Receiver R1',
        sourceSpatialFeatureType: 'receiver',
        locationDescription: 'Nearest receiver façade',
        distanceNote: 'Approx. 45 m from portal',
        chainageNote: null,
        coordinatesNote: '151.20045, -33.79972',
        assessmentLocationBasis: 'external',
        sortOrder: 1,
      },
    ],
    selectedCriteria: [
      selectedCriterion,
      {
        ...selectedCriterion,
        id: 'selected-criterion-2',
        selectionPurpose: 'time_definition',
        criterionRow: createCriterionRow({
          id: 'criterion-2',
          basisType: 'descriptive',
          criterionValue: null,
          label: 'General construction standard hours',
          rowNotes: 'Standard hours: Monday to Friday 7am to 6pm, Saturday 8am to 1pm.',
          unit: null,
        }),
      },
    ],
    noiseResults: [noiseResult],
    vibrationResults: [],
    observations: [
      {
        id: 'observation-1',
        monitoringReportId: 'report-1',
        category: 'Noise',
        locationId: 'location-1',
        noiseResultId: noiseResult.id,
        observation: 'Levels exceeded the selected management criterion during saw cutting.',
        implicationNote:
          'Temporary shielding was absent and the activity was close to the monitor.',
        implicationSeverity: 'Medium',
        followUpRequired: true,
        sortOrder: 0,
      },
    ],
    recommendations: [
      {
        id: 'recommendation-1',
        monitoringReportId: 'report-1',
        category: 'Mitigation',
        observationId: 'observation-1',
        noiseResultId: noiseResult.id,
        recommendation: 'Review shielding and saw-cutting setup before the next shift.',
        priority: 'High',
        responsibility: 'Construction team',
        timingNote: null,
        dueDate: '2026-04-20T00:00:00.000Z',
        status: 'Open',
        sortOrder: 0,
      },
    ],
  };
}

function createCriterionRow(
  overrides: Partial<NoiseVibrationCriterionRow> = {},
): NoiseVibrationCriterionRow {
  return {
    id: 'criterion-1',
    criterionGroupId: 'group-1',
    rowKey: 'row-1',
    label: 'Residential standard-hours noise affected management level',
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
    sourceClause: 'ICNG Table 3',
    rowNotes: null,
    sortOrder: 0,
    createdAt: '2026-04-19T00:00:00.000Z',
    updatedAt: '2026-04-19T00:00:00.000Z',
    workTypes: ['general_construction'],
    group: {
      id: 'group-1',
      standardSourceId: 'source-1',
      slug: 'airborne-noise',
      title: 'Airborne noise',
      criterionCategory: 'airborne_noise_management',
      metric: 'laeq_15min',
      locationBasis: null,
      description: null,
      sortOrder: 0,
      createdAt: '2026-04-19T00:00:00.000Z',
      updatedAt: '2026-04-19T00:00:00.000Z',
    },
    source: {
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
    },
    ...overrides,
  };
}

function createNoiseResultRow(
  overrides: Partial<ProjectEnvironmentalNoiseResultRow>,
): ProjectEnvironmentalNoiseResultRow {
  return {
    id: 'result-1',
    monitoringReportId: 'report-1',
    locationId: 'location-1',
    observedAt: '2026-04-19T10:00:00.000Z',
    activityLabel: 'Saw cutting',
    instrumentNote: null,
    measurementPeriodNote: null,
    descriptorMetric: 'laeq_15min',
    measuredValue: '48',
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
    location: { id: 'location-1', label: 'VM3' },
    criterionRow: null,
    ...overrides,
  };
}
