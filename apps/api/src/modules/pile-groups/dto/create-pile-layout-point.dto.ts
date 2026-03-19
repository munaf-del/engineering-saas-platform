import { IsNumber, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePileLayoutPointDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  pileId?: string;

  @ApiProperty({ example: 0.0, description: 'X coordinate in metres' })
  @IsNumber()
  x!: number;

  @ApiProperty({ example: 0.0, description: 'Y coordinate in metres' })
  @IsNumber()
  y!: number;

  @ApiPropertyOptional({ example: 0.0, description: 'Z coordinate in metres' })
  @IsOptional()
  @IsNumber()
  z?: number;

  @ApiPropertyOptional({ example: 'P1' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  label?: string;
}
