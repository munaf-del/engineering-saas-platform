import { IsString, IsOptional, Matches, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrganisationDto {
  @ApiProperty({ example: 'Acme Engineering Pty Ltd' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name!: string;

  @ApiProperty({ example: 'acme-engineering' })
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'slug must be lowercase alphanumeric with hyphens' })
  @MinLength(2)
  @MaxLength(100)
  slug!: string;

  @ApiProperty({ example: '12345678901', required: false })
  @IsOptional()
  @IsString()
  abn?: string;
}
