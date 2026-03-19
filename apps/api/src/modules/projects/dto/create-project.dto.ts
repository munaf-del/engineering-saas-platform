import {
  IsString,
  IsOptional,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiProperty({ example: 'Bridge Reinforcement Study' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name!: string;

  @ApiProperty({ example: 'BRS-001' })
  @IsString()
  @Matches(/^[A-Za-z0-9_-]+$/, {
    message: 'code must be alphanumeric with hyphens or underscores',
  })
  @MinLength(2)
  @MaxLength(50)
  code!: string;

  @ApiPropertyOptional({ example: 'Assessment of reinforced concrete bridge deck' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  standardsProfileId?: string;
}
