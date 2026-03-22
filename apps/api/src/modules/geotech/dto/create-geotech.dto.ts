import { IsString, IsBoolean, IsOptional, IsObject, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGeotechMaterialClassDto {
  @ApiProperty({ example: 'CL' })
  @IsString()
  code!: string;

  @ApiProperty({ example: 'Clay (low plasticity)' })
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'USCS' })
  @IsOptional()
  @IsString()
  classification?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDemo?: boolean;
}

export class CreateGeotechParameterSetDto {
  @ApiProperty()
  @IsUUID()
  classId!: string;

  @ApiProperty({ example: 'Stiff Clay – Typical Parameters' })
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Source standard (required for traceability)', example: 'AS 1726' })
  @IsString()
  sourceStandard!: string;

  @ApiProperty({ description: 'Source edition (required for traceability)', example: '2017' })
  @IsString()
  sourceEdition!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceAmendment?: string;

  @ApiProperty({
    description: 'Parameter values. Each must include value and unit.',
    example: {
      unitWeight: { value: 19, unit: 'kN/m³' },
      cohesion: { value: 50, unit: 'kPa' },
      frictionAngle: { value: 25, unit: 'deg' },
    },
  })
  @IsObject()
  parameters!: Record<string, unknown>;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDemo?: boolean;
}

export class UpdateGeotechParameterSetDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

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
  parameters?: Record<string, unknown>;
}
