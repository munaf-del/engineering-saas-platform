import {
  IsString,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsObject,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const CATEGORIES = [
  'concrete', 'structural_steel', 'reinforcing_steel', 'soil', 'rock', 'timber',
] as const;

export class CreateMaterialGradeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  familyId?: string;

  @ApiProperty({ enum: CATEGORIES })
  @IsEnum(CATEGORIES)
  category: (typeof CATEGORIES)[number];

  @ApiProperty({ example: 'N40 Concrete' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'N40' })
  @IsOptional()
  @IsString()
  grade?: string;

  @ApiPropertyOptional({ example: 'AS 3600' })
  @IsOptional()
  @IsString()
  standardRef?: string;

  @ApiProperty({ description: 'Source standard code (required for traceability)', example: 'AS 3600' })
  @IsString()
  sourceStandard: string;

  @ApiProperty({ description: 'Source edition (required for traceability)', example: '2018' })
  @IsString()
  sourceEdition: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceAmendment?: string;

  @ApiProperty({
    description: 'Property values as JSON object. Each property must include value and unit.',
    example: { compressiveStrength: { value: 40, unit: 'MPa', source: 'AS 3600 Table 3.1.2' } },
  })
  @IsObject()
  properties: Record<string, unknown>;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDemo?: boolean;
}

export class UpdateMaterialGradeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  grade?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  standardRef?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceStandard?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceEdition?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceAmendment?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  properties?: Record<string, unknown>;
}
