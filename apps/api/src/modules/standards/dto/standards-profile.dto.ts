import { IsString, IsBoolean, IsOptional, IsUUID, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStandardsProfileDto {
  @ApiProperty({ example: 'AS Loading + Concrete 2021' })
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateStandardsProfileDto {
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
  @IsBoolean()
  isDefault?: boolean;
}

export class PinStandardDto {
  @ApiProperty({ description: 'Standard edition ID to pin' })
  @IsUUID()
  standardEditionId!: string;
}

export class BulkPinStandardsDto {
  @ApiProperty({ type: [String], description: 'Standard edition IDs to pin' })
  @IsArray()
  @IsUUID('4', { each: true })
  standardEditionIds!: string[];
}

export class AssignProjectStandardDto {
  @ApiProperty()
  @IsUUID()
  standardEditionId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
