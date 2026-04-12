import {
  PROJECT_SPATIAL_FEATURE_TYPES,
  PROJECT_SPATIAL_GEOMETRY_TYPES,
  PROJECT_SPATIAL_LINKED_DELIVERABLE_TYPES,
  PROJECT_SPATIAL_SOURCE_TYPES,
  type ProjectSpatialFeatureProperties,
  type ProjectSpatialGeometryJson,
} from '@eng/shared';
import { PartialType, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class ProjectSpatialFeatureFiltersDto {
  @ApiPropertyOptional({ enum: PROJECT_SPATIAL_FEATURE_TYPES })
  @IsOptional()
  @IsEnum(PROJECT_SPATIAL_FEATURE_TYPES)
  featureType?: (typeof PROJECT_SPATIAL_FEATURE_TYPES)[number];

  @ApiPropertyOptional({ enum: PROJECT_SPATIAL_GEOMETRY_TYPES })
  @IsOptional()
  @IsEnum(PROJECT_SPATIAL_GEOMETRY_TYPES)
  geometryType?: (typeof PROJECT_SPATIAL_GEOMETRY_TYPES)[number];

  @ApiPropertyOptional({ enum: PROJECT_SPATIAL_LINKED_DELIVERABLE_TYPES })
  @IsOptional()
  @IsEnum(PROJECT_SPATIAL_LINKED_DELIVERABLE_TYPES)
  linkedDeliverableType?: (typeof PROJECT_SPATIAL_LINKED_DELIVERABLE_TYPES)[number];

  @ApiPropertyOptional({ example: 'well' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;
}

export class CreateProjectSpatialFeatureDto {
  @ApiProperty({ enum: PROJECT_SPATIAL_FEATURE_TYPES })
  @IsEnum(PROJECT_SPATIAL_FEATURE_TYPES)
  featureType!: (typeof PROJECT_SPATIAL_FEATURE_TYPES)[number];

  @ApiProperty({ enum: PROJECT_SPATIAL_GEOMETRY_TYPES })
  @IsEnum(PROJECT_SPATIAL_GEOMETRY_TYPES)
  geometryType!: (typeof PROJECT_SPATIAL_GEOMETRY_TYPES)[number];

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  label!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string | null;

  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsObject()
  geometryJson!: ProjectSpatialGeometryJson;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  status?: string | null;

  @ApiPropertyOptional({ enum: PROJECT_SPATIAL_SOURCE_TYPES })
  @IsOptional()
  @IsEnum(PROJECT_SPATIAL_SOURCE_TYPES)
  sourceType?: (typeof PROJECT_SPATIAL_SOURCE_TYPES)[number] | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  sourceReference?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  linkedProjectReferenceId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  linkedAiDocumentId?: string | null;

  @ApiPropertyOptional({ enum: PROJECT_SPATIAL_LINKED_DELIVERABLE_TYPES })
  @IsOptional()
  @IsEnum(PROJECT_SPATIAL_LINKED_DELIVERABLE_TYPES)
  linkedDeliverableType?: (typeof PROJECT_SPATIAL_LINKED_DELIVERABLE_TYPES)[number] | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  linkedDeliverableId?: string | null;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  propertiesJson?: ProjectSpatialFeatureProperties | null;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateProjectSpatialFeatureDto extends PartialType(CreateProjectSpatialFeatureDto) {}

