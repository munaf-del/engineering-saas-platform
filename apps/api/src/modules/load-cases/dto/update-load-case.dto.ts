import { IsString, IsOptional, IsEnum, MaxLength, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateLoadCaseDto {
  @ApiPropertyOptional({ example: 'Updated Dead Load' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ enum: ['permanent', 'imposed', 'wind', 'earthquake', 'liquid_pressure', 'earth_pressure', 'thermal'] })
  @IsOptional()
  @IsEnum(['permanent', 'imposed', 'wind', 'earthquake', 'liquid_pressure', 'earth_pressure', 'thermal'], {
    message: 'category must be one of: permanent, imposed, wind, earthquake, liquid_pressure, earth_pressure, thermal',
  })
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
