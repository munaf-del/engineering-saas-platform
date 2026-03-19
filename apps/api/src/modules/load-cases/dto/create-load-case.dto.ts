import { IsString, IsOptional, IsEnum, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLoadCaseDto {
  @ApiProperty({ example: 'Dead Load' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiProperty({ enum: ['permanent', 'imposed', 'wind', 'earthquake', 'liquid_pressure', 'earth_pressure', 'thermal'] })
  @IsEnum(['permanent', 'imposed', 'wind', 'earthquake', 'liquid_pressure', 'earth_pressure', 'thermal'], {
    message: 'category must be one of: permanent, imposed, wind, earthquake, liquid_pressure, earth_pressure, thermal',
  })
  category!: string;

  @ApiPropertyOptional({ example: 'Self-weight of structural elements' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
