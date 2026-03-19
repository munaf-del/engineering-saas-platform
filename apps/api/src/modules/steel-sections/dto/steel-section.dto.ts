import {
  IsString,
  IsBoolean,
  IsOptional,
  IsObject,
  IsEnum,
  IsDateString,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const CATALOG_STATUSES = ['draft', 'active', 'superseded', 'archived'] as const;

export class CreateSteelSectionCatalogDto {
  @ApiProperty({ example: 'ASI Open Sections' })
  @IsString()
  name: string;

  @ApiProperty({ example: '2024.1' })
  @IsString()
  version: string;

  @ApiProperty({ description: 'Source standard (required)', example: 'AS/NZS 3679.1' })
  @IsString()
  sourceStandard: string;

  @ApiProperty({ description: 'Source edition (required)', example: '2016' })
  @IsString()
  sourceEdition: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceAmendment?: string;

  @ApiPropertyOptional({ enum: CATALOG_STATUSES, default: 'draft' })
  @IsOptional()
  @IsEnum(CATALOG_STATUSES)
  status?: (typeof CATALOG_STATUSES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveDate?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDemo?: boolean;
}

export class UpdateSteelSectionCatalogDto {
  @ApiPropertyOptional({ enum: CATALOG_STATUSES })
  @IsOptional()
  @IsEnum(CATALOG_STATUSES)
  status?: (typeof CATALOG_STATUSES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveDate?: string;
}

export class CreateSteelSectionDto {
  @ApiProperty()
  @IsUUID()
  catalogId: string;

  @ApiProperty({ example: '200UB25.4' })
  @IsString()
  designation: string;

  @ApiProperty({ example: 'UB' })
  @IsString()
  sectionType: string;

  @ApiProperty({
    description: 'Section properties with units',
    example: {
      massPerMetre: 25.4,
      depth: 203,
      flangeWidth: 133,
      flangeThickness: 7.8,
      webThickness: 5.8,
    },
  })
  @IsObject()
  properties: Record<string, number>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  standardRef?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceDoc?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDemo?: boolean;
}
