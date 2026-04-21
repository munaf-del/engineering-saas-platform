import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateDraftingDrawingDto {
  @ApiProperty({ example: 'Shoring Layout GA-01' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;
}
