import { IsString, IsOptional, IsObject, IsEnum, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCalculatorVersionDto {
  @ApiProperty({ example: '1.0.0' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  version!: string;

  @ApiProperty({ description: 'JSON Schema for required inputs' })
  @IsObject()
  inputSchema!: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'JSON Schema for outputs' })
  @IsOptional()
  @IsObject()
  outputSchema?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Default input values' })
  @IsOptional()
  @IsObject()
  defaultInputs?: Record<string, unknown>;

  @ApiPropertyOptional({ enum: ['draft', 'active', 'deprecated'], default: 'draft' })
  @IsOptional()
  @IsEnum(['draft', 'active', 'deprecated'], {
    message: 'status must be one of: draft, active, deprecated',
  })
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  releaseNotes?: string;
}
