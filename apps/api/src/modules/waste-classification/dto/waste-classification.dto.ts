import { Type } from 'class-transformer';
import { PartialType, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export const PROJECT_WASTE_CLASSES = [
  'special_waste',
  'liquid_waste',
  'hazardous_waste',
  'restricted_solid_waste',
  'general_solid_putrescible',
  'general_solid_non_putrescible',
  'not_yet_classified',
] as const;

export const PROJECT_WASTE_CLASSIFICATION_REFERENCE_TYPES = [
  'epa_guideline',
  'project_reference',
  'ai_report',
  'lab_report',
  'other',
] as const;

export const PROJECT_WASTE_CLASSIFICATION_STEP_CODES = [
  'step_1_special_waste',
  'step_2_liquid_waste',
  'step_3_preclassified',
  'step_4_hazardous_characteristics',
  'step_5_chemical_assessment',
  'step_6_putrescible',
] as const;

export const PROJECT_WASTE_CLASSIFICATION_OUTCOME_STATUSES = [
  'not_started',
  'in_progress',
  'yes',
  'no',
  'requires_assessment',
  'complete',
] as const;

export const PROJECT_WASTE_CLASSIFICATION_PATHWAY_CODES = [
  'part_2_immobilisation',
  'part_3_radioactive_material',
  'part_4_acid_sulfate_soils',
  'addendum_part_1',
] as const;

export const PROJECT_WASTE_CLASSIFICATION_MATERIAL_PATHWAY_CODES = [
  'venm',
  'enm',
  'acid_sulfate_soils',
] as const;

export const PROJECT_WASTE_CLASSIFICATION_MATERIAL_PATHWAY_OUTCOME_STATUSES = [
  'not_assessed',
  'qualifies',
  'does_not_qualify',
  'requires_further_assessment',
] as const;

export const PROJECT_WASTE_CLASSIFICATION_ACID_SULFATE_SOIL_CLASSES = [
  'class_1',
  'class_2',
  'class_3',
  'class_4',
  'class_5',
  'not_mapped_unknown',
] as const;

export class CreateProjectWasteClassificationReportDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string | null;
}

export class UpdateProjectWasteClassificationReportDto {
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  wasteStreamName?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  wasteSourceOrigin?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(6000)
  wasteDescription?: string | null;

  @ApiPropertyOptional({ type: String, format: 'date' })
  @IsOptional()
  @IsDateString()
  samplingDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  quantityEstimate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  proposedReceivingFacilityNote?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  executiveSummary?: string | null;

  @ApiPropertyOptional({ enum: PROJECT_WASTE_CLASSES })
  @IsOptional()
  @IsEnum(PROJECT_WASTE_CLASSES)
  finalWasteClass?: (typeof PROJECT_WASTE_CLASSES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  finalClassificationReasoning?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  managementRecommendation?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  assumptionsLimitations?: string | null;
}

export class CreateProjectWasteClassificationReferenceDto {
  @ApiPropertyOptional({ enum: PROJECT_WASTE_CLASSIFICATION_REFERENCE_TYPES })
  @IsOptional()
  @IsEnum(PROJECT_WASTE_CLASSIFICATION_REFERENCE_TYPES)
  referenceType?: (typeof PROJECT_WASTE_CLASSIFICATION_REFERENCE_TYPES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  sourceUrl?: string | null;

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
  @MaxLength(3000)
  note?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrefilled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isIncluded?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateProjectWasteClassificationReferenceDto extends PartialType(
  CreateProjectWasteClassificationReferenceDto,
) {}

export class CreateProjectWasteClassificationStepDecisionDto {
  @ApiProperty({ enum: PROJECT_WASTE_CLASSIFICATION_STEP_CODES })
  @IsEnum(PROJECT_WASTE_CLASSIFICATION_STEP_CODES)
  stepCode!: (typeof PROJECT_WASTE_CLASSIFICATION_STEP_CODES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  stepTitle?: string | null;

  @ApiPropertyOptional({ enum: PROJECT_WASTE_CLASSIFICATION_OUTCOME_STATUSES })
  @IsOptional()
  @IsEnum(PROJECT_WASTE_CLASSIFICATION_OUTCOME_STATUSES)
  outcomeStatus?: (typeof PROJECT_WASTE_CLASSIFICATION_OUTCOME_STATUSES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  classificationReached?: boolean;

  @ApiPropertyOptional({ enum: PROJECT_WASTE_CLASSES })
  @IsOptional()
  @IsEnum(PROJECT_WASTE_CLASSES)
  resultingWasteClass?: (typeof PROJECT_WASTE_CLASSES)[number] | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  decisionSummary?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(12000)
  detailedReasoning?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isApplicable?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateProjectWasteClassificationStepDecisionDto extends PartialType(
  CreateProjectWasteClassificationStepDecisionDto,
) {}

export class CreateProjectWasteClassificationChecklistItemDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(400)
  label!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isChecked?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  note?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateProjectWasteClassificationChecklistItemDto extends PartialType(
  CreateProjectWasteClassificationChecklistItemDto,
) {}

export class UpdateProjectWasteClassificationMaterialPathwayChecklistItemDto extends PartialType(
  CreateProjectWasteClassificationChecklistItemDto,
) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  id?: string;
}

export class CreateProjectWasteClassificationLabResultDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  contaminant!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  sampleId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  analyticalMethod?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  sccMgKg?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  tclpMgL?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  thresholdReferenceNote?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  resultInterpretation?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateProjectWasteClassificationLabResultDto extends PartialType(
  CreateProjectWasteClassificationLabResultDto,
) {}

export class CreateProjectWasteClassificationRecommendationDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  category!: string;

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
  @MaxLength(1000)
  timingNote?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateProjectWasteClassificationRecommendationDto extends PartialType(
  CreateProjectWasteClassificationRecommendationDto,
) {}

export class CreateProjectWasteClassificationMaterialPathwayDto {
  @ApiProperty({ enum: PROJECT_WASTE_CLASSIFICATION_MATERIAL_PATHWAY_CODES })
  @IsEnum(PROJECT_WASTE_CLASSIFICATION_MATERIAL_PATHWAY_CODES)
  pathwayCode!: (typeof PROJECT_WASTE_CLASSIFICATION_MATERIAL_PATHWAY_CODES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isRelevant?: boolean;

  @ApiPropertyOptional({ enum: PROJECT_WASTE_CLASSIFICATION_MATERIAL_PATHWAY_OUTCOME_STATUSES })
  @IsOptional()
  @IsEnum(PROJECT_WASTE_CLASSIFICATION_MATERIAL_PATHWAY_OUTCOME_STATUSES)
  outcomeStatus?: (typeof PROJECT_WASTE_CLASSIFICATION_MATERIAL_PATHWAY_OUTCOME_STATUSES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  testingNote?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  supportingReasoning?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  linkedReferenceId?: string | null;

  @ApiPropertyOptional({ enum: PROJECT_WASTE_CLASSIFICATION_ACID_SULFATE_SOIL_CLASSES })
  @IsOptional()
  @IsEnum(PROJECT_WASTE_CLASSIFICATION_ACID_SULFATE_SOIL_CLASSES)
  assClass?: (typeof PROJECT_WASTE_CLASSIFICATION_ACID_SULFATE_SOIL_CLASSES)[number] | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  assClassSource?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  projectLocationNote?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(6000)
  treatmentManagementNote?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  step5ChemicalAssessmentApplies?: boolean | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  assOrderRelevant?: boolean | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  assExemptionRelevant?: boolean | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(6000)
  orderExemptionNote?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ type: [UpdateProjectWasteClassificationMaterialPathwayChecklistItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateProjectWasteClassificationMaterialPathwayChecklistItemDto)
  checklistItems?: UpdateProjectWasteClassificationMaterialPathwayChecklistItemDto[];
}

export class UpdateProjectWasteClassificationMaterialPathwayDto extends PartialType(
  CreateProjectWasteClassificationMaterialPathwayDto,
) {}

export class CreateProjectWasteClassificationRelatedPathwayDto {
  @ApiProperty({ enum: PROJECT_WASTE_CLASSIFICATION_PATHWAY_CODES })
  @IsEnum(PROJECT_WASTE_CLASSIFICATION_PATHWAY_CODES)
  pathwayCode!: (typeof PROJECT_WASTE_CLASSIFICATION_PATHWAY_CODES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isRelevant?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(6000)
  summaryNote?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  linkedReferenceId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  resultingAction?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateProjectWasteClassificationRelatedPathwayDto extends PartialType(
  CreateProjectWasteClassificationRelatedPathwayDto,
) {}

export class GenerateProjectWasteClassificationDraftRecommendationDto {
  @ApiPropertyOptional({ enum: PROJECT_WASTE_CLASSES })
  @IsOptional()
  @IsEnum(PROJECT_WASTE_CLASSES)
  finalWasteClass?: (typeof PROJECT_WASTE_CLASSES)[number];
}
