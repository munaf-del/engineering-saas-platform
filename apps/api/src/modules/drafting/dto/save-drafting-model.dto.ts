import { ApiProperty } from '@nestjs/swagger';
import { IsObject } from 'class-validator';

export class SaveDraftingModelDto {
  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description: 'Drafting model JSON document',
  })
  @IsObject()
  model!: Record<string, unknown>;
}
