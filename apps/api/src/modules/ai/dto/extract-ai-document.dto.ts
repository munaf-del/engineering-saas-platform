import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ExtractAiDocumentDto {
  @ApiPropertyOptional({
    description:
      'Optional override for the extraction model. Defaults to AI_OPENAI_MODEL or gpt-4.1.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string;
}
