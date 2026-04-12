import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional } from 'class-validator';

export class RunMultiPileEnvelopeDto {
  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    description: 'Optional normalized multi-pile state payload to run without reloading from persistence first.',
  })
  @IsOptional()
  @IsObject()
  state?: Record<string, unknown>;
}
