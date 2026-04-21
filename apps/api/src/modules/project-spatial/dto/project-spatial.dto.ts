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

export const PROJECT_SPATIAL_BASEMAPS = ['osm', 'nsw_aerial_imagery', 'nsw_topographic'] as const;
export const ROOT_SHEET_TEMPLATE_SCOPE_TYPES = ['global', 'org', 'project'] as const;
export const SHEET_TEMPLATE_SOURCE_KINDS = ['root_sheet_template'] as const;
export const TEMPLATE_PAPER_SIZES = ['a0', 'a1', 'a2', 'a3', 'a4'] as const;
export const TEMPLATE_PAGE_ORIENTATIONS = ['portrait', 'landscape'] as const;

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

export class CreateProjectSpatialViewDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string | null;

  @ApiProperty({ enum: PROJECT_SPATIAL_BASEMAPS })
  @IsEnum(PROJECT_SPATIAL_BASEMAPS)
  basemap!: (typeof PROJECT_SPATIAL_BASEMAPS)[number];

  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsObject()
  viewStateJson!: Record<string, unknown>;

  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsObject()
  visibleLayersJson!: Record<string, unknown> | unknown[];

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  filtersJson?: Record<string, unknown> | null;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  labelsOrStyleJson?: Record<string, unknown> | null;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  annotationsJson?: Record<string, unknown> | null;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsString()
  capturedAt?: string | null;
}

export class UpdateProjectSpatialViewDto extends PartialType(CreateProjectSpatialViewDto) {}

export class CreateProjectSpatialSheetDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiProperty({ enum: SHEET_TEMPLATE_SOURCE_KINDS })
  @IsEnum(SHEET_TEMPLATE_SOURCE_KINDS)
  templateSourceKind!: (typeof SHEET_TEMPLATE_SOURCE_KINDS)[number];

  @ApiPropertyOptional()
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

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  templateSnapshotJson?: Record<string, unknown> | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedViewId?: string | null;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  assignedViewSnapshotJson?: Record<string, unknown> | null;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  bindingSnapshotJson?: Record<string, unknown> | null;

  @ApiProperty({ enum: TEMPLATE_PAPER_SIZES })
  @IsEnum(TEMPLATE_PAPER_SIZES)
  paperSize!: (typeof TEMPLATE_PAPER_SIZES)[number];

  @ApiProperty({ enum: TEMPLATE_PAGE_ORIENTATIONS })
  @IsEnum(TEMPLATE_PAGE_ORIENTATIONS)
  orientation!: (typeof TEMPLATE_PAGE_ORIENTATIONS)[number];
}

export class UpdateProjectSpatialSheetDto extends PartialType(CreateProjectSpatialSheetDto) {}
