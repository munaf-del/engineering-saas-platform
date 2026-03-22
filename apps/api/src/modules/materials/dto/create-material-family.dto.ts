import { IsString, IsEnum, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const CATEGORIES = [
  'concrete', 'structural_steel', 'reinforcing_steel', 'soil', 'rock', 'timber',
] as const;

export class CreateMaterialFamilyDto {
  @ApiProperty({ example: 'CONCRETE' })
  @IsString()
  code!: string;

  @ApiProperty({ example: 'Concrete' })
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: CATEGORIES })
  @IsEnum(CATEGORIES)
  category!: (typeof CATEGORIES)[number];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDemo?: boolean;
}
