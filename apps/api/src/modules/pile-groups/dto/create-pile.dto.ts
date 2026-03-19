import { IsString, IsNumber, IsOptional, IsEnum, IsObject, IsUUID, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePileDto {
  @ApiProperty({ example: 'Pile P1' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiProperty({ enum: ['bored', 'driven', 'cfa', 'micropile', 'screw'] })
  @IsEnum(['bored', 'driven', 'cfa', 'micropile', 'screw'], {
    message: 'pileType must be one of: bored, driven, cfa, micropile, screw',
  })
  pileType!: string;

  @ApiProperty({ example: 0.6, description: 'Pile diameter in metres' })
  @IsNumber()
  diameter!: number;

  @ApiProperty({ example: 15.0, description: 'Pile length in metres' })
  @IsNumber()
  length!: number;

  @ApiPropertyOptional({ example: 12.0, description: 'Embedment depth in metres' })
  @IsOptional()
  @IsNumber()
  embedmentDepth?: number;

  @ApiPropertyOptional({ example: 0.0, description: 'Rake angle in degrees' })
  @IsOptional()
  @IsNumber()
  rakeAngle?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  materialId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  properties?: Record<string, unknown>;
}
