import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export const NOISE_VIBRATION_PUBLICATION_STATUSES = [
  'active',
  'draft_under_review',
  'superseded',
] as const;

export const NOISE_VIBRATION_LEGAL_STATUSES = ['enforceable', 'guidance_only'] as const;

export const NOISE_VIBRATION_INSTRUMENT_TYPES = [
  'statutory',
  'consent_condition',
  'guidance_only',
  'project_specific',
] as const;

export const NOISE_VIBRATION_CRITERION_CATEGORIES = [
  'working_hours',
  'airborne_noise_management',
  'ground_borne_noise',
  'vibration_human_comfort',
  'vibration_structural_damage',
  'blasting_airblast',
  'blasting_ground_vibration',
  'time_period_definition',
] as const;

export const NOISE_VIBRATION_METRICS = [
  'laeq_15min',
  'lamax',
  'laf1_1min',
  'lin_peak',
  'ppv',
  'vdv',
  'none',
] as const;

export const NOISE_VIBRATION_RECEIVER_TYPES = [
  'residential',
  'heritage',
  'sensitive',
  'commercial',
  'industrial',
  'educational',
  'hospital',
  'place_of_worship',
  'active_recreation',
  'passive_recreation',
  'office_retail',
  'workshop',
  'critical_area',
] as const;

export const NOISE_VIBRATION_TIME_PERIODS = [
  'day',
  'evening',
  'night',
  'standard_hours',
  'outside_standard_hours',
  'blasting_hours',
  'any',
] as const;

export const NOISE_VIBRATION_WORK_TYPES = [
  'general_construction',
  'bored_piling',
  'driven_piling',
  'rock_breaking',
  'blasting',
  'excavation',
  'dynamic_compaction',
] as const;

export class NoiseVibrationCriteriaQueryDto {
  @ApiPropertyOptional({ example: 'nsw-epa-icng-2009' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  sourceSlug?: string;

  @ApiPropertyOptional({ enum: NOISE_VIBRATION_CRITERION_CATEGORIES })
  @IsOptional()
  @IsEnum(NOISE_VIBRATION_CRITERION_CATEGORIES)
  criterionCategory?: (typeof NOISE_VIBRATION_CRITERION_CATEGORIES)[number];

  @ApiPropertyOptional({ enum: NOISE_VIBRATION_RECEIVER_TYPES })
  @IsOptional()
  @IsEnum(NOISE_VIBRATION_RECEIVER_TYPES)
  receiverType?: (typeof NOISE_VIBRATION_RECEIVER_TYPES)[number];

  @ApiPropertyOptional({ enum: NOISE_VIBRATION_TIME_PERIODS })
  @IsOptional()
  @IsEnum(NOISE_VIBRATION_TIME_PERIODS)
  timePeriod?: (typeof NOISE_VIBRATION_TIME_PERIODS)[number];

  @ApiPropertyOptional({ enum: NOISE_VIBRATION_WORK_TYPES })
  @IsOptional()
  @IsEnum(NOISE_VIBRATION_WORK_TYPES)
  workType?: (typeof NOISE_VIBRATION_WORK_TYPES)[number];

  @ApiPropertyOptional({ enum: NOISE_VIBRATION_METRICS })
  @IsOptional()
  @IsEnum(NOISE_VIBRATION_METRICS)
  metric?: (typeof NOISE_VIBRATION_METRICS)[number];

  @ApiPropertyOptional({ enum: NOISE_VIBRATION_LEGAL_STATUSES })
  @IsOptional()
  @IsEnum(NOISE_VIBRATION_LEGAL_STATUSES)
  legalStatus?: (typeof NOISE_VIBRATION_LEGAL_STATUSES)[number];

  @ApiPropertyOptional({ enum: NOISE_VIBRATION_INSTRUMENT_TYPES })
  @IsOptional()
  @IsEnum(NOISE_VIBRATION_INSTRUMENT_TYPES)
  instrumentType?: (typeof NOISE_VIBRATION_INSTRUMENT_TYPES)[number];

  @ApiPropertyOptional({ enum: NOISE_VIBRATION_PUBLICATION_STATUSES })
  @IsOptional()
  @IsEnum(NOISE_VIBRATION_PUBLICATION_STATUSES)
  publicationStatus?: (typeof NOISE_VIBRATION_PUBLICATION_STATUSES)[number];

  @ApiPropertyOptional({ example: 'NSW' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  jurisdiction?: string;

  @ApiPropertyOptional({ example: 'RBL + 10' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;
}
