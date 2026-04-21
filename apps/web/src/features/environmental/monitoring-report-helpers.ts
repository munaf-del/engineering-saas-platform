import type {
  NoiseVibrationCriterionRow,
  NoiseVibrationMetric,
} from '@/features/standards/noise-vibration-types';
import type {
  EnvironmentalMonitoringComplianceStatus,
  EnvironmentalMonitoringCriterionApplicabilityStatus,
  ProjectEnvironmentalNoiseResultRow,
  ProjectEnvironmentalMonitoringSelectedCriterion,
} from './environmental-monitoring-types';

export function formatMonitoringCriterionApplicabilityLabel(
  value: EnvironmentalMonitoringCriterionApplicabilityStatus | null | undefined,
) {
  switch (value) {
    case 'applicable':
      return 'Applicable';
    case 'reference_only':
      return 'Reference only';
    case 'superseded_by_project_condition':
      return 'Superseded by project condition';
    case 'not_applicable':
      return 'Not applicable';
    default:
      return 'Not set';
  }
}

export function formatMonitoringComplianceStatusLabel(
  value: EnvironmentalMonitoringComplianceStatus | null | undefined,
) {
  switch (value) {
    case 'compliant':
      return 'Compliant';
    case 'trigger_exceeded':
      return 'Trigger exceeded';
    case 'criterion_exceeded':
      return 'Criterion exceeded';
    case 'not_applicable':
      return 'Not applicable';
    case 'review_required':
      return 'Manual assessment required';
    case 'complies':
      return 'Complies';
    case 'exceeds':
      return 'Exceeds';
    case 'not_assessed':
    default:
      return 'Not assessed';
  }
}

export function formatMonitoringCriterionSourceType(selection: {
  criterionRow: Pick<NoiseVibrationCriterionRow, 'source'>;
  isEnforceableOnThisProject?: boolean | null;
  projectConditionReference?: string | null;
}) {
  if (selection.projectConditionReference?.trim()) {
    return 'Project-specific';
  }

  const sourceName =
    `${selection.criterionRow.source.name} ${selection.criterionRow.source.sourceCitation}`.toLowerCase();
  switch (selection.criterionRow.source.instrumentType) {
    case 'consent_condition':
      return 'Consent condition';
    case 'guidance_only':
      return 'Guideline only';
    case 'project_specific':
      return 'Project-specific';
    case 'statutory':
    default:
      if (
        sourceName.includes('licence') ||
        sourceName.includes('license') ||
        sourceName.includes('epl')
      ) {
        return 'EPL / licence';
      }
      if (sourceName.includes('notice') || sourceName.includes('order')) {
        return 'Notice / order';
      }
      return selection.isEnforceableOnThisProject ? 'Project-specific' : 'Statutory instrument';
  }
}

export function calculateNoiseResultAssessment(args: {
  result: Pick<
    ProjectEnvironmentalNoiseResultRow,
    'criterionRow' | 'descriptorMetric' | 'measuredUnit' | 'measuredValue'
  >;
  selectedCriterion?: Pick<ProjectEnvironmentalMonitoringSelectedCriterion, 'criterionRow'> | null;
}) {
  const criterionRow = args.selectedCriterion?.criterionRow ?? args.result.criterionRow ?? null;
  const measuredValue = parseNumericValue(args.result.measuredValue);
  const criterionValue = criterionRow ? resolveNumericCriterionValue(criterionRow) : null;
  const metricLabel =
    formatNoiseMetricLabel(
      normalizeNoiseMetric(args.result.descriptorMetric) ?? criterionRow?.group.metric ?? null,
    ) ?? 'Not set';
  const criterionValueLabel =
    criterionValue !== null
      ? `${formatNumeric(criterionValue)} ${criterionRow?.unit ?? args.result.measuredUnit ?? ''}`.trim()
      : null;

  if (!criterionRow) {
    return {
      criterionValue: null,
      criterionValueLabel: null,
      exceedanceAmount: null,
      exceedanceAmountLabel: null,
      metricLabel,
      requiresManualAssessment: true,
      requiresSelection: true,
    };
  }

  if (measuredValue === null || criterionValue === null) {
    return {
      criterionValue,
      criterionValueLabel,
      exceedanceAmount: null,
      exceedanceAmountLabel: null,
      metricLabel,
      requiresManualAssessment: true,
      requiresSelection: false,
    };
  }

  const difference = measuredValue - criterionValue;
  const exceedanceAmount = difference > 0 ? Number(difference.toFixed(3)) : 0;
  const unit = criterionRow.unit ?? args.result.measuredUnit ?? '';

  return {
    criterionValue,
    criterionValueLabel,
    exceedanceAmount,
    exceedanceAmountLabel:
      difference > 0 ? `${formatNumeric(exceedanceAmount)} ${unit}`.trim() : 'No exceedance',
    metricLabel,
    requiresManualAssessment: false,
    requiresSelection: false,
  };
}

export function resolveNoiseResultMetricLabel(
  result: Pick<ProjectEnvironmentalNoiseResultRow, 'criterionRow' | 'descriptorMetric'>,
) {
  return (
    formatNoiseMetricLabel(
      normalizeNoiseMetric(result.descriptorMetric) ?? result.criterionRow?.group.metric ?? null,
    ) ?? 'Not set'
  );
}

export function resolveNoiseResultMeasuredValueLabel(
  result: Pick<
    ProjectEnvironmentalNoiseResultRow,
    'descriptorMetric' | 'measuredUnit' | 'measuredValue' | 'laeq15min' | 'laf1_1min' | 'lamax'
  >,
) {
  const metric = normalizeNoiseMetric(result.descriptorMetric);
  const measuredValue =
    normalizeMeasurementText(result.measuredValue) ??
    (metric === 'laeq_15min'
      ? normalizeMeasurementText(result.laeq15min)
      : metric === 'lamax'
        ? normalizeMeasurementText(result.lamax)
        : metric === 'laf1_1min'
          ? normalizeMeasurementText(result.laf1_1min)
          : null);
  if (!measuredValue) {
    return null;
  }

  return `${measuredValue}${result.measuredUnit?.trim() ? ` ${result.measuredUnit.trim()}` : ''}`.trim();
}

function resolveNumericCriterionValue(row: NoiseVibrationCriterionRow) {
  if (row.basisType !== 'absolute') {
    return null;
  }

  return (
    parseNumericValue(row.criterionValue) ??
    parseNumericValue(row.maximumValue) ??
    parseNumericValue(row.alertValue) ??
    parseNumericValue(row.absoluteMaxValue)
  );
}

function normalizeNoiseMetric(value: string | null | undefined): NoiseVibrationMetric | null {
  if (!value) {
    return null;
  }

  switch (value.trim().toLowerCase()) {
    case 'laeq,15min':
    case 'laeq15min':
    case 'laeq_15min':
      return 'laeq_15min';
    case 'lamax':
      return 'lamax';
    case 'laf1,1min':
    case 'laf1_1min':
      return 'laf1_1min';
    case 'lin_peak':
      return 'lin_peak';
    case 'ppv':
      return 'ppv';
    case 'vdv':
      return 'vdv';
    default:
      return null;
  }
}

function formatNoiseMetricLabel(metric: NoiseVibrationMetric | null) {
  switch (metric) {
    case 'laeq_15min':
      return 'LAeq,15min';
    case 'lamax':
      return 'LAmax';
    case 'laf1_1min':
      return 'LAF1,1min';
    case 'lin_peak':
      return 'Lin Peak';
    case 'ppv':
      return 'PPV';
    case 'vdv':
      return 'VDV';
    default:
      return null;
  }
}

function normalizeMeasurementText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function parseNumericValue(value: string | null | undefined) {
  if (!value?.trim()) {
    return null;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function formatNumeric(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '');
}
