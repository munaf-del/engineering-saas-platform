import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCalculatorDto {
  @ApiProperty({ example: 'pile-capacity-as2159' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  code!: string;

  @ApiProperty({ example: 'Pile Capacity (AS 2159)' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name!: string;

  @ApiProperty({ example: 'pile_capacity' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  calcType!: string;

  @ApiPropertyOptional({ example: 'Single pile axial capacity to AS 2159' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ example: 'geotechnical' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  category!: string;
}
