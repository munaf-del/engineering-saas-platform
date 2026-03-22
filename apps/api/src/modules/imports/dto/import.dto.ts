import { IsString, IsBoolean, IsOptional, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const ENTITY_TYPES = [
  'steel_section', 'rebar_size', 'material', 'geotech_parameter',
  'standards_registry', 'load_combination_rules', 'pile_design_rules',
] as const;
const FORMATS = ['csv', 'xlsx', 'json', 'yaml'] as const;

export class CreateImportJobDto {
  @ApiProperty({ enum: ENTITY_TYPES })
  @IsEnum(ENTITY_TYPES, {
    message: `entityType must be one of: ${ENTITY_TYPES.join(', ')}`,
  })
  entityType!: (typeof ENTITY_TYPES)[number];

  @ApiProperty({ enum: FORMATS })
  @IsEnum(FORMATS)
  format!: (typeof FORMATS)[number];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  dryRun?: boolean;

  @ApiProperty({ description: 'Catalog name for snapshot creation', example: 'ASI Open Sections' })
  @IsString()
  catalogName!: string;

  @ApiProperty({ description: 'Snapshot version', example: '2024.2' })
  @IsString()
  catalogVersion!: string;

  @ApiProperty({ description: 'Source standard (required)', example: 'AS/NZS 3679.1' })
  @IsString()
  sourceStandard!: string;

  @ApiProperty({ description: 'Source edition (required)', example: '2016' })
  @IsString()
  sourceEdition!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceAmendment?: string;
}
