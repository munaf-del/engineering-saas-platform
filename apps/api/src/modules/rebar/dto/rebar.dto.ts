import {
  IsString,
  IsBoolean,
  IsOptional,
  IsEnum,
  IsDateString,
  IsUUID,
  IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const CATALOG_STATUSES = ['draft', 'active', 'superseded', 'archived'] as const;

export class CreateRebarCatalogDto {
  @ApiProperty({ example: 'AS/NZS 4671 Rebar Catalogue' })
  @IsString()
  name: string;

  @ApiProperty({ example: '2024.1' })
  @IsString()
  version: string;

  @ApiProperty({ description: 'Source standard (required)', example: 'AS/NZS 4671' })
  @IsString()
  sourceStandard: string;

  @ApiProperty({ description: 'Source edition (required)', example: '2019' })
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

export class UpdateRebarCatalogDto {
  @ApiPropertyOptional({ enum: CATALOG_STATUSES })
  @IsOptional()
  @IsEnum(CATALOG_STATUSES)
  status?: (typeof CATALOG_STATUSES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveDate?: string;
}

export class CreateRebarSizeDto {
  @ApiProperty()
  @IsUUID()
  catalogId: string;

  @ApiProperty({ example: 'N12' })
  @IsString()
  designation: string;

  @ApiProperty({ example: 12.0 })
  @IsNumber()
  barDiameter: number;

  @ApiProperty({ example: 113.1 })
  @IsNumber()
  nominalArea: number;

  @ApiProperty({ example: 0.888 })
  @IsNumber()
  massPerMetre: number;

  @ApiProperty({ example: 'D500N' })
  @IsString()
  grade: string;

  @ApiProperty({ example: 'N' })
  @IsString()
  ductilityClass: string;

  @ApiPropertyOptional({ example: 'AS/NZS 4671:2019' })
  @IsOptional()
  @IsString()
  standardRef?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDemo?: boolean;
}
