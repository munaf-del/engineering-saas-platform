import {
  IsString,
  IsOptional,
  IsObject,
  IsArray,
  ValidateNested,
  IsNumber,
  IsUUID,
  IsEnum,
  IsBoolean,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InputValueDto {
  @ApiProperty({ example: 500 })
  @IsNumber()
  value!: number;

  @ApiProperty({ example: 'mm' })
  @IsString()
  unit!: string;

  @ApiProperty({ example: 'Pile diameter' })
  @IsString()
  label!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  source?: string;
}

export class RuleEntryDto {
  @ApiProperty()
  @IsString()
  clauseRef!: string;

  @ApiProperty()
  @IsString()
  description!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  value?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  table?: Record<string, number>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  formula?: string;
}

export class RulePackDto {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiProperty()
  @IsString()
  standardCode!: string;

  @ApiProperty()
  @IsString()
  version!: string;

  @ApiProperty()
  @IsObject()
  rules!: Record<string, RuleEntryDto>;
}

export class StandardRefDto {
  @ApiProperty()
  @IsString()
  code!: string;

  @ApiProperty()
  @IsString()
  edition!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  amendment?: string;
}

export class LoadCombinationFactorInputDto {
  @ApiProperty()
  @IsString()
  loadCaseId!: string;

  @ApiProperty()
  @IsNumber()
  factor!: number;

  @ApiProperty()
  @IsString()
  source!: string;
}

export class LoadCombinationInputDto {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ enum: ['strength', 'serviceability', 'stability'] })
  @IsEnum(['strength', 'serviceability', 'stability'])
  limitState!: string;

  @ApiProperty({ type: [LoadCombinationFactorInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LoadCombinationFactorInputDto)
  factors!: LoadCombinationFactorInputDto[];

  @ApiProperty()
  @IsString()
  clauseRef!: string;
}

export class CalcOptionsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  includeIntermediateSteps?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  precisionDigits?: number;
}

export class SubmitCalculationDto {
  @ApiProperty({
    example: 'pile_capacity',
    enum: [
      'pile_capacity', 'pile_settlement', 'pile_lateral', 'pile_group',
      'beam_check', 'column_check', 'connection_check', 'footing_check',
      'retaining_wall', 'bearing_capacity',
    ],
  })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  calcType!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  elementId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  calculatorVersionId?: string;

  @ApiProperty({ description: 'Map of input name to InputValue' })
  @IsObject()
  inputs!: Record<string, InputValueDto>;

  @ApiProperty({ type: [LoadCombinationInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LoadCombinationInputDto)
  loadCombinations!: LoadCombinationInputDto[];

  @ApiProperty({ type: RulePackDto })
  @ValidateNested()
  @Type(() => RulePackDto)
  rulePack!: RulePackDto;

  @ApiProperty({ type: [StandardRefDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StandardRefDto)
  standardsRefs!: StandardRefDto[];

  @ApiPropertyOptional({ type: CalcOptionsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CalcOptionsDto)
  options?: CalcOptionsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
