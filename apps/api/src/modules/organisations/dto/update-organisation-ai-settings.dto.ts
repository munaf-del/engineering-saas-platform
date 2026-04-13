import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  AI_ASSISTANT_MODEL_OPTIONS,
  AI_ASSISTANT_PROVIDER_OPTIONS,
  AI_MODEL_OPTIONS,
} from '@eng/shared';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateOrganisationAiSettingsDto {
  @ApiPropertyOptional({ enum: AI_ASSISTANT_PROVIDER_OPTIONS })
  @IsOptional()
  @IsIn(AI_ASSISTANT_PROVIDER_OPTIONS)
  assistantProvider?: (typeof AI_ASSISTANT_PROVIDER_OPTIONS)[number];

  @ApiPropertyOptional({ enum: AI_ASSISTANT_MODEL_OPTIONS })
  @IsOptional()
  @IsIn(AI_ASSISTANT_MODEL_OPTIONS)
  assistantModel?: (typeof AI_ASSISTANT_MODEL_OPTIONS)[number];

  @ApiPropertyOptional({ enum: AI_MODEL_OPTIONS })
  @IsOptional()
  @IsIn(AI_MODEL_OPTIONS)
  agentModel?: (typeof AI_MODEL_OPTIONS)[number];

  @ApiPropertyOptional({
    writeOnly: true,
    description: 'Optional organisation-scoped OpenAI API key for assistant mode only',
  })
  @IsOptional()
  @IsString()
  @MinLength(20)
  @MaxLength(512)
  openaiApiKey?: string;

  @ApiPropertyOptional({
    writeOnly: true,
    description: 'Remove the stored organisation-scoped OpenAI API key',
  })
  @IsOptional()
  @IsBoolean()
  removeOpenaiApiKey?: boolean;

  @ApiPropertyOptional({
    writeOnly: true,
    description: 'Optional organisation-scoped Anthropic API key for assistant mode only',
  })
  @IsOptional()
  @IsString()
  @MinLength(20)
  @MaxLength(512)
  anthropicApiKey?: string;

  @ApiPropertyOptional({
    writeOnly: true,
    description: 'Remove the stored organisation-scoped Anthropic API key',
  })
  @IsOptional()
  @IsBoolean()
  removeAnthropicApiKey?: boolean;

  @ApiPropertyOptional({
    writeOnly: true,
    description: 'Optional organisation-scoped Gemini API key for assistant mode only',
  })
  @IsOptional()
  @IsString()
  @MinLength(20)
  @MaxLength(512)
  geminiApiKey?: string;

  @ApiPropertyOptional({
    writeOnly: true,
    description: 'Remove the stored organisation-scoped Gemini API key',
  })
  @IsOptional()
  @IsBoolean()
  removeGeminiApiKey?: boolean;

  @ApiPropertyOptional({
    writeOnly: true,
    description: 'Optional organisation-scoped DeepSeek API key for assistant mode only',
  })
  @IsOptional()
  @IsString()
  @MinLength(20)
  @MaxLength(512)
  deepseekApiKey?: string;

  @ApiPropertyOptional({
    writeOnly: true,
    description: 'Remove the stored organisation-scoped DeepSeek API key',
  })
  @IsOptional()
  @IsBoolean()
  removeDeepseekApiKey?: boolean;
}
