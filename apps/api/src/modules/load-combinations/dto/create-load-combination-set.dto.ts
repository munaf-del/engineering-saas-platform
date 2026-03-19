import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLoadCombinationSetDto {
  @ApiProperty({ example: 'AS/NZS 1170.0 Combinations' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({ example: 'AS/NZS 1170.0:2002' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  standardRef?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
