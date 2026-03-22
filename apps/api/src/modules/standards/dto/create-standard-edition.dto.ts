import {
  IsString,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsDateString,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const STATUSES = ['current', 'superseded', 'withdrawn'] as const;

export class CreateStandardEditionDto {
  @ApiProperty()
  @IsUUID()
  standardId!: string;

  @ApiProperty({ example: '2018' })
  @IsString()
  edition!: string;

  @ApiPropertyOptional({ example: 'Amdt 2 (2021)' })
  @IsOptional()
  @IsString()
  amendment?: string;

  @ApiProperty({ description: 'Source edition identifier for traceability', example: '2018' })
  @IsString()
  sourceEdition!: string;

  @ApiPropertyOptional({ description: 'Source amendment for traceability' })
  @IsOptional()
  @IsString()
  sourceAmendment?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clauseRef?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceDoc?: string;

  @ApiProperty({ example: '2018-06-29' })
  @IsDateString()
  effectiveDate!: string;

  @ApiPropertyOptional({ enum: STATUSES, default: 'current' })
  @IsOptional()
  @IsEnum(STATUSES)
  status?: (typeof STATUSES)[number];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDemo?: boolean;
}
