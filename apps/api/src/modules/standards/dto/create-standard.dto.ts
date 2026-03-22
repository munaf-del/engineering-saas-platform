import { IsString, IsEnum, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const CATEGORIES = ['loading', 'concrete', 'steel', 'reinforcement', 'geotech', 'general'] as const;

export class CreateStandardDto {
  @ApiProperty({ example: 'AS 3600' })
  @IsString()
  code!: string;

  @ApiProperty({ example: 'Concrete structures' })
  @IsString()
  title!: string;

  @ApiProperty({ enum: CATEGORIES, example: 'concrete' })
  @IsEnum(CATEGORIES, { message: `category must be one of: ${CATEGORIES.join(', ')}` })
  category!: (typeof CATEGORIES)[number];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDemo?: boolean;
}

export class UpdateStandardDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ enum: CATEGORIES })
  @IsOptional()
  @IsEnum(CATEGORIES)
  category?: (typeof CATEGORIES)[number];
}
