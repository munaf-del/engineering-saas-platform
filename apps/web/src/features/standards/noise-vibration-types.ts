export const NOISE_VIBRATION_PUBLICATION_STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'draft_under_review', label: 'Draft under review' },
  { value: 'superseded', label: 'Superseded' },
] as const;

export const NOISE_VIBRATION_LEGAL_STATUS_OPTIONS = [
  { value: 'enforceable', label: 'Enforceable' },
  { value: 'guidance_only', label: 'Guidance only' },
] as const;

export const NOISE_VIBRATION_INSTRUMENT_TYPE_OPTIONS = [
  { value: 'statutory', label: 'Statutory' },
  { value: 'consent_condition', label: 'Consent condition' },
  { value: 'guidance_only', label: 'Guidance only' },
  { value: 'project_specific', label: 'Project specific' },
] as const;

export const NOISE_VIBRATION_CRITERION_CATEGORY_OPTIONS = [
  { value: 'working_hours', label: 'Working hours' },
  { value: 'airborne_noise_management', label: 'Airborne noise management' },
  { value: 'ground_borne_noise', label: 'Ground-borne noise' },
  { value: 'vibration_human_comfort', label: 'Vibration human comfort' },
  { value: 'vibration_structural_damage', label: 'Vibration structural damage' },
  { value: 'blasting_airblast', label: 'Blasting airblast' },
  { value: 'blasting_ground_vibration', label: 'Blasting ground vibration' },
  { value: 'time_period_definition', label: 'Time period definition' },
] as const;

export const NOISE_VIBRATION_METRIC_OPTIONS = [
  { value: 'laeq_15min', label: 'LAeq,15min' },
  { value: 'lamax', label: 'LAmax' },
  { value: 'laf1_1min', label: 'LAF1,1min' },
  { value: 'lin_peak', label: 'Lin Peak' },
  { value: 'ppv', label: 'PPV' },
  { value: 'vdv', label: 'VDV' },
  { value: 'none', label: 'None' },
] as const;

export const NOISE_VIBRATION_RECEIVER_TYPE_OPTIONS = [
  { value: 'residential', label: 'Residential' },
  { value: 'heritage', label: 'Heritage' },
  { value: 'sensitive', label: 'Sensitive' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'educational', label: 'Educational' },
  { value: 'hospital', label: 'Hospital' },
  { value: 'place_of_worship', label: 'Place of worship' },
  { value: 'active_recreation', label: 'Active recreation' },
  { value: 'passive_recreation', label: 'Passive recreation' },
  { value: 'office_retail', label: 'Office / retail' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'critical_area', label: 'Critical area' },
] as const;

export const NOISE_VIBRATION_TIME_PERIOD_OPTIONS = [
  { value: 'day', label: 'Day' },
  { value: 'evening', label: 'Evening' },
  { value: 'night', label: 'Night' },
  { value: 'standard_hours', label: 'Standard hours' },
  { value: 'outside_standard_hours', label: 'Outside standard hours' },
  { value: 'blasting_hours', label: 'Blasting hours' },
  { value: 'any', label: 'Any' },
] as const;

export const NOISE_VIBRATION_WORK_TYPE_OPTIONS = [
  { value: 'general_construction', label: 'General construction' },
  { value: 'bored_piling', label: 'Bored piling' },
  { value: 'driven_piling', label: 'Driven piling' },
  { value: 'rock_breaking', label: 'Rock breaking' },
  { value: 'blasting', label: 'Blasting' },
  { value: 'excavation', label: 'Excavation' },
  { value: 'dynamic_compaction', label: 'Dynamic compaction' },
] as const;

export type NoiseVibrationPublicationStatus =
  (typeof NOISE_VIBRATION_PUBLICATION_STATUS_OPTIONS)[number]['value'];
export type NoiseVibrationLegalStatus =
  (typeof NOISE_VIBRATION_LEGAL_STATUS_OPTIONS)[number]['value'];
export type NoiseVibrationInstrumentType =
  (typeof NOISE_VIBRATION_INSTRUMENT_TYPE_OPTIONS)[number]['value'];
export type NoiseVibrationCriterionCategory =
  (typeof NOISE_VIBRATION_CRITERION_CATEGORY_OPTIONS)[number]['value'];
export type NoiseVibrationMetric = (typeof NOISE_VIBRATION_METRIC_OPTIONS)[number]['value'];
export type NoiseVibrationReceiverType =
  (typeof NOISE_VIBRATION_RECEIVER_TYPE_OPTIONS)[number]['value'];
export type NoiseVibrationTimePeriod =
  (typeof NOISE_VIBRATION_TIME_PERIOD_OPTIONS)[number]['value'];
export type NoiseVibrationWorkType = (typeof NOISE_VIBRATION_WORK_TYPE_OPTIONS)[number]['value'];

export type NoiseVibrationStandardSource = {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  publisher: string;
  jurisdiction: string;
  year: number;
  publicationStatus: NoiseVibrationPublicationStatus;
  legalStatus: NoiseVibrationLegalStatus;
  instrumentType: NoiseVibrationInstrumentType;
  sourceCitation: string;
  sourceUrl: string | null;
  notes: string | null;
  isSeeded: boolean;
  createdAt: string;
  updatedAt: string;
  criterionGroupCount?: number;
};

export type NoiseVibrationCriterionGroup = {
  id: string;
  standardSourceId: string;
  slug: string;
  title: string;
  criterionCategory: NoiseVibrationCriterionCategory;
  metric: NoiseVibrationMetric;
  locationBasis: string | null;
  description: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type NoiseVibrationCriterionRow = {
  id: string;
  criterionGroupId: string;
  rowKey: string;
  label: string;
  receiverType: NoiseVibrationReceiverType | null;
  structureType: string | null;
  timePeriod: NoiseVibrationTimePeriod | null;
  basisType: 'absolute' | 'relative_to_rbl' | 'frequency_banded' | 'descriptive';
  referenceBase: string | null;
  relativeOffset: string | null;
  criterionValue: string | null;
  preferredValue: string | null;
  maximumValue: string | null;
  alertValue: string | null;
  stopWorkValue: string | null;
  absoluteMaxValue: string | null;
  valueMin: string | null;
  valueMax: string | null;
  frequencyMinHz: string | null;
  frequencyMaxHz: string | null;
  weekdayStart: string | null;
  weekdayEnd: string | null;
  saturdayStart: string | null;
  saturdayEnd: string | null;
  sundayAllowed: boolean | null;
  publicHolidayAllowed: boolean | null;
  exceedanceAllowancePercent: string | null;
  exceedanceWindowText: string | null;
  unit: string | null;
  sourceClause: string | null;
  rowNotes: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  workTypes: NoiseVibrationWorkType[];
  group: NoiseVibrationCriterionGroup;
  source: NoiseVibrationStandardSource;
};

export type NoiseVibrationCriteriaFilters = {
  sourceSlug?: string;
  criterionCategory?: NoiseVibrationCriterionCategory;
  receiverType?: NoiseVibrationReceiverType;
  workType?: NoiseVibrationWorkType;
  timePeriod?: NoiseVibrationTimePeriod;
  metric?: NoiseVibrationMetric;
  legalStatus?: NoiseVibrationLegalStatus;
  instrumentType?: NoiseVibrationInstrumentType;
  publicationStatus?: NoiseVibrationPublicationStatus;
  jurisdiction?: string;
  q?: string;
};
