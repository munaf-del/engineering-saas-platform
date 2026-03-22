import { IsString, IsBoolean, IsOptional, IsInt, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePropertySchemaDto {
  @ApiProperty()
  @IsUUID()
  familyId!: string;

  @ApiProperty({ example: 'compressiveStrength' })
  @IsString()
  key!: string;

  @ApiProperty({ example: 'Characteristic Compressive Strength' })
  @IsString()
  label!: string;

  @ApiProperty({ description: 'Unit is required', example: 'MPa' })
  @IsString()
  unit!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
