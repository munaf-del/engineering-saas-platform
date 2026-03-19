import { IsString, IsOptional, IsEnum, IsArray, ValidateNested, IsNumber, MaxLength, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoadCombinationFactorDto {
  @ApiProperty()
  @IsString()
  loadCaseId!: string;

  @ApiProperty({ example: 1.2 })
  @IsNumber()
  factor!: number;

  @ApiProperty({ example: 'AS/NZS 1170.0 Table 4.1' })
  @IsString()
  source!: string;
}

export class CreateLoadCombinationDto {
  @ApiProperty({ example: '1.35G' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiProperty({ enum: ['strength', 'serviceability', 'stability'] })
  @IsEnum(['strength', 'serviceability', 'stability'], {
    message: 'limitState must be one of: strength, serviceability, stability',
  })
  limitState!: string;

  @ApiPropertyOptional({ example: 'Cl 4.2.1' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  clauseRef?: string;

  @ApiProperty({ type: [LoadCombinationFactorDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LoadCombinationFactorDto)
  factors!: LoadCombinationFactorDto[];
}
