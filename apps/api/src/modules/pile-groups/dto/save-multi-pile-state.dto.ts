import { IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SaveMultiPileStateDto {
  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description: 'Multi-pile authored state document',
  })
  @IsObject()
  state!: Record<string, unknown>;
}
