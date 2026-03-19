import { IsString, IsOptional, IsObject, IsUUID, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePileCapacityProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  pileId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  soilProfileId?: string;

  @ApiProperty({ example: 'as2159_static', description: 'Capacity calculation method' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  method!: string;

  @ApiPropertyOptional({ example: 'AS 2159:2009' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  standardRef?: string;

  @ApiProperty({ description: 'Method-specific parameters' })
  @IsObject()
  parameters!: Record<string, unknown>;
}
