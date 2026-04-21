import { DRAFTING_DRAWING_STATUSES } from '@eng/shared';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateDraftingDrawingDto {
  @ApiPropertyOptional({ example: 'Monitoring Layout A01' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ enum: DRAFTING_DRAWING_STATUSES })
  @IsOptional()
  @IsEnum(DRAFTING_DRAWING_STATUSES)
  status?: (typeof DRAFTING_DRAWING_STATUSES)[number];
}
