import { IsString, IsNumber, IsOptional, IsEnum, IsObject, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLoadActionDto {
  @ApiProperty({ example: 'Vertical dead load' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiProperty({ enum: ['fx', 'fy', 'fz', 'mx', 'my', 'mz'] })
  @IsEnum(['fx', 'fy', 'fz', 'mx', 'my', 'mz'], {
    message: 'direction must be one of: fx, fy, fz, mx, my, mz',
  })
  direction!: string;

  @ApiProperty({ example: 150.0 })
  @IsNumber()
  magnitude!: number;

  @ApiProperty({ example: 'kN' })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  unit!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
