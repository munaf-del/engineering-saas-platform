import { PartialType, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PROJECT_SPATIAL_FEATURE_TYPES } from '@eng/shared';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const SHEET_TEMPLATE_SOURCE_KINDS = [
  'root_sheet_template',
  'built_in_sheet_template',
  'legacy_spatial_layout',
] as const;
import { Type } from 'class-transformer';
import { NOISE_VIBRATION_RECEIVER_TYPES } from '../../standards/noise-vibration/dto/noise-vibration-criteria-query.dto';

export const ENVIRONMENTAL_MONITORING_REPORT_TYPES = [
  'noise_monitoring',
  'vibration_monitoring',
] as const;

export const ENVIRONMENTAL_MONITORING_SELECTION_PURPOSES = [
  'noise',
  'vibration_human_comfort',
  'vibration_structural',
  'blasting',
  'time_definition',
  'other',
] as const;

export const ENVIRONMENTAL_MONITORING_ASSESSMENT_LOCATION_BASES = [
  'property_boundary',
  'internal',
  'external',
  'occupied_point',
  'foundation',
  'uppermost_storey',
  'any',
] as const;

export const ENVIRONMENTAL_MONITORING_COMPLIANCE_STATUSES = [
  'not_assessed',
  'compliant',
  'trigger_exceeded',
  'criterion_exceeded',
  'not_applicable',
  'complies',
  'exceeds',
  'review_required',
] as const;

export const ENVIRONMENTAL_MONITORING_CRITERION_APPLICABILITY_STATUSES = [
  'applicable',
  'reference_only',
  'superseded_by_project_condition',
  'not_applicable',
] as const;

export const ENVIRONMENTAL_MONITORING_METRIC_TYPES = ['ppv', 'vdv', 'lin_peak', 'other'] as const;

export const ENVIRONMENTAL_MONITORING_ANNEXURE_TYPES = ['spatial_sheet'] as const;

export const ENVIRONMENTAL_MONITORING_SPATIAL_ANNEXURE_TEMPLATE_IDS = [
  'builtin-spatial-annexure-a4-landscape',
  'builtin-spatial-annexure-a3-landscape',
] as const;

export const ENVIRONMENTAL_MONITORING_LOCATION_IMPORT_MODES = [
  'new_only',
  'refresh_imported',
] as const;

export class CreateProjectEnvironmentalMonitoringReportDto {
  @ApiProperty({ enum: ENVIRONMENTAL_MONITORING_REPORT_TYPES })
  @IsEnum(ENVIRONMENTAL_MONITORING_REPORT_TYPES)
  reportType!: (typeof ENVIRONMENTAL_MONITORING_REPORT_TYPES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string | null;
}

export class UpdateProjectEnvironmentalMonitoringReportDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  revision?: string | null;

  @ApiPropertyOptional({ type: String, format: 'date' })
  @IsOptional()
  @IsDateString()
  issueDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  documentStatus?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  preparedBy?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  checkedBy?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  purpose?: string | null;

  @ApiPropertyOptional({ type: String, format: 'date' })
  @IsOptional()
  @IsDateString()
  monitoringDate?: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  monitoringWindowStart?: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  monitoringWindowEnd?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  weatherConditions?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(6000)
  siteActivitySummary?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(6000)
  executiveSummary?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  generalObservations?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(6000)
  conclusion?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(6000)
  recommendationsSummary?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  assumptionsLimitations?: string | null;
}

export class CreateProjectEnvironmentalMonitoringReportPackageIssueDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  issueLabel?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  revision?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  documentStatus?: string | null;

  @ApiPropertyOptional({ type: String, format: 'date' })
  @IsOptional()
  @IsDateString()
  issueDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  preparedBy?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  checkedBy?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  approvedBy?: string | null;
}

export class CreateProjectEnvironmentalMonitoringAnnexureDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string | null;

  @ApiProperty({ enum: ENVIRONMENTAL_MONITORING_ANNEXURE_TYPES })
  @IsEnum(ENVIRONMENTAL_MONITORING_ANNEXURE_TYPES)
  annexureType!: (typeof ENVIRONMENTAL_MONITORING_ANNEXURE_TYPES)[number];

  @ApiPropertyOptional({
    enum: SHEET_TEMPLATE_SOURCE_KINDS,
  })
  @IsOptional()
  @IsEnum(SHEET_TEMPLATE_SOURCE_KINDS)
  templateSourceKind?: (typeof SHEET_TEMPLATE_SOURCE_KINDS)[number] | null;

  @ApiPropertyOptional({
    description:
      'Generic template reference. Root Sheet Template selections should also send rootSheetTemplateId/rootSheetTemplateVersionId.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  templateReferenceId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  rootSheetTemplateId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  rootSheetTemplateVersionId?: string | null;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  templateSnapshotJson?: Record<string, unknown> | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  sourceLabel?: string | null;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  bindingJson?: Record<string, unknown> | null;
}

export class UpdateProjectEnvironmentalMonitoringAnnexureDto extends PartialType(
  CreateProjectEnvironmentalMonitoringAnnexureDto,
) {}

export class ReorderProjectEnvironmentalMonitoringAnnexuresDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  orderedIds!: string[];
}

export class CreateProjectEnvironmentalMonitoringReferenceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  projectReferenceId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  aiDocumentId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  label?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  note?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateProjectEnvironmentalMonitoringReferenceDto extends PartialType(
  CreateProjectEnvironmentalMonitoringReferenceDto,
) {}

export class CreateProjectEnvironmentalMonitoringLocationDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  label!: string;

  @ApiPropertyOptional({ enum: NOISE_VIBRATION_RECEIVER_TYPES })
  @IsOptional()
  @IsEnum(NOISE_VIBRATION_RECEIVER_TYPES)
  receiverType?: (typeof NOISE_VIBRATION_RECEIVER_TYPES)[number] | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  sourceSpatialViewId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  sourceSpatialViewLabel?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  sourceSpatialFeatureId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  sourceSpatialFeatureLabel?: string | null;

  @ApiPropertyOptional({ enum: PROJECT_SPATIAL_FEATURE_TYPES })
  @IsOptional()
  @IsString()
  @IsIn(PROJECT_SPATIAL_FEATURE_TYPES)
  sourceSpatialFeatureType?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  locationDescription?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  distanceNote?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  chainageNote?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  coordinatesNote?: string | null;

  @ApiPropertyOptional({ enum: ENVIRONMENTAL_MONITORING_ASSESSMENT_LOCATION_BASES })
  @IsOptional()
  @IsEnum(ENVIRONMENTAL_MONITORING_ASSESSMENT_LOCATION_BASES)
  assessmentLocationBasis?:
    | (typeof ENVIRONMENTAL_MONITORING_ASSESSMENT_LOCATION_BASES)[number]
    | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateProjectEnvironmentalMonitoringLocationDto extends PartialType(
  CreateProjectEnvironmentalMonitoringLocationDto,
) {}

export class ImportProjectEnvironmentalMonitoringLocationsFromViewDto {
  @ApiProperty()
  @IsUUID()
  projectSpatialViewId!: string;

  @ApiPropertyOptional({ enum: ENVIRONMENTAL_MONITORING_LOCATION_IMPORT_MODES })
  @IsOptional()
  @IsEnum(ENVIRONMENTAL_MONITORING_LOCATION_IMPORT_MODES)
  mode?: (typeof ENVIRONMENTAL_MONITORING_LOCATION_IMPORT_MODES)[number];
}

export class CreateProjectEnvironmentalMonitoringSelectedCriterionDto {
  @ApiProperty()
  @IsUUID()
  criterionRowId!: string;

  @ApiProperty({ enum: ENVIRONMENTAL_MONITORING_SELECTION_PURPOSES })
  @IsEnum(ENVIRONMENTAL_MONITORING_SELECTION_PURPOSES)
  selectionPurpose!: (typeof ENVIRONMENTAL_MONITORING_SELECTION_PURPOSES)[number];

  @ApiPropertyOptional({
    enum: ENVIRONMENTAL_MONITORING_CRITERION_APPLICABILITY_STATUSES,
  })
  @IsOptional()
  @IsEnum(ENVIRONMENTAL_MONITORING_CRITERION_APPLICABILITY_STATUSES)
  applicabilityStatus?:
    | (typeof ENVIRONMENTAL_MONITORING_CRITERION_APPLICABILITY_STATUSES)[number]
    | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isEnforceableOnThisProject?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(400)
  projectConditionReference?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  selectionNote?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateProjectEnvironmentalMonitoringSelectedCriterionDto extends PartialType(
  CreateProjectEnvironmentalMonitoringSelectedCriterionDto,
) {}

export class CreateProjectEnvironmentalNoiseResultRowDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  locationId?: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  observedAt?: string | null;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  activityLabel!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  instrumentNote?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  measurementPeriodNote?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  descriptorMetric?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  measuredValue?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  measuredUnit?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  laeq15min?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  lamax?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  laf1_1min?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  backgroundNote?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  selectedCriterionId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  criterionRowId?: string | null;

  @ApiPropertyOptional({ enum: ENVIRONMENTAL_MONITORING_COMPLIANCE_STATUSES })
  @IsOptional()
  @IsEnum(ENVIRONMENTAL_MONITORING_COMPLIANCE_STATUSES)
  complianceStatus?: (typeof ENVIRONMENTAL_MONITORING_COMPLIANCE_STATUSES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  resultNote?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateProjectEnvironmentalNoiseResultRowDto extends PartialType(
  CreateProjectEnvironmentalNoiseResultRowDto,
) {}

export class CreateProjectEnvironmentalVibrationResultRowDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  locationId?: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  observedAt?: string | null;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  activityLabel!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  instrumentNote?: string | null;

  @ApiProperty({ enum: ENVIRONMENTAL_MONITORING_METRIC_TYPES })
  @IsEnum(ENVIRONMENTAL_MONITORING_METRIC_TYPES)
  metricType!: (typeof ENVIRONMENTAL_MONITORING_METRIC_TYPES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  ppvValue?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  vdvValue?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  linPeakValue?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  dominantFrequencyHz?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  axisNote?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  criterionRowId?: string | null;

  @ApiPropertyOptional({ enum: ENVIRONMENTAL_MONITORING_COMPLIANCE_STATUSES })
  @IsOptional()
  @IsEnum(ENVIRONMENTAL_MONITORING_COMPLIANCE_STATUSES)
  complianceStatus?: (typeof ENVIRONMENTAL_MONITORING_COMPLIANCE_STATUSES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  resultNote?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateProjectEnvironmentalVibrationResultRowDto extends PartialType(
  CreateProjectEnvironmentalVibrationResultRowDto,
) {}

export class CreateProjectEnvironmentalMonitoringObservationDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  category!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  locationId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  noiseResultId?: string | null;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  observation!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  implicationNote?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  implicationSeverity?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  followUpRequired?: boolean | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateProjectEnvironmentalMonitoringObservationDto extends PartialType(
  CreateProjectEnvironmentalMonitoringObservationDto,
) {}

export class CreateProjectEnvironmentalMonitoringRecommendationDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  category!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  observationId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  noiseResultId?: string | null;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  recommendation!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  priority?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  responsibility?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  timingNote?: string | null;

  @ApiPropertyOptional({ type: String, format: 'date' })
  @IsOptional()
  @IsDateString()
  dueDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  status?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateProjectEnvironmentalMonitoringRecommendationDto extends PartialType(
  CreateProjectEnvironmentalMonitoringRecommendationDto,
) {}
