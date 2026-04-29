import { DRAFTING_DRAWING_KINDS } from '@eng/shared';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateDraftingDrawingDto {
  @ApiProperty({ example: 'Shoring Layout GA-01' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiProperty({ enum: DRAFTING_DRAWING_KINDS, required: false })
  @IsOptional()
  @IsEnum(DRAFTING_DRAWING_KINDS)
  kind?: (typeof DRAFTING_DRAWING_KINDS)[number];
}
