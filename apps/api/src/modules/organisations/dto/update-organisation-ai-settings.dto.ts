import { ApiPropertyOptional } from '@nestjs/swagger';
import { AI_MODEL_OPTIONS } from '@eng/shared';
import { IsIn, IsOptional } from 'class-validator';

export class UpdateOrganisationAiSettingsDto {
  @ApiPropertyOptional({ enum: AI_MODEL_OPTIONS })
  @IsOptional()
  @IsIn(AI_MODEL_OPTIONS)
  assistantModel?: (typeof AI_MODEL_OPTIONS)[number];

  @ApiPropertyOptional({ enum: AI_MODEL_OPTIONS })
  @IsOptional()
  @IsIn(AI_MODEL_OPTIONS)
  agentModel?: (typeof AI_MODEL_OPTIONS)[number];
}
