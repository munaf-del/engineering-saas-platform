import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

const AI_ASSISTANT_MESSAGE_ROLES = ['user', 'assistant'] as const;
const AI_ASSISTANT_MODES = ['assistant', 'agent'] as const;
const AI_ASSISTANT_QUICK_ACTIONS = [
  'review_page',
  'explain_page',
  'find_missing_inputs',
  'suggest_next_steps',
  'suggest_fields',
] as const;

export type AiAssistantMode = (typeof AI_ASSISTANT_MODES)[number];
export type AiAssistantQuickAction = (typeof AI_ASSISTANT_QUICK_ACTIONS)[number];

export class AiAssistantMessageDto {
  @ApiProperty({ enum: AI_ASSISTANT_MESSAGE_ROLES })
  @IsIn(AI_ASSISTANT_MESSAGE_ROLES)
  role!: (typeof AI_ASSISTANT_MESSAGE_ROLES)[number];

  @ApiProperty()
  @IsString()
  @MaxLength(4000)
  content!: string;
}

export class AiAssistantPageContextDto {
  @ApiProperty()
  @IsString()
  @MaxLength(500)
  route!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(160)
  pageTitle!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(80)
  pageKind!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  projectId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  pileGroupId?: string | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(400, { each: true })
  visibleWarnings?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(400, { each: true })
  visibleErrors?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  saveState?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(400, { each: true })
  keyFacts?: string[];

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  pageSpecificData?: Record<string, unknown>;
}

export class RespondAiAssistantDto {
  @ApiPropertyOptional({ enum: AI_ASSISTANT_MODES })
  @IsOptional()
  @IsIn(AI_ASSISTANT_MODES)
  mode?: AiAssistantMode;

  @ApiProperty({ type: [AiAssistantMessageDto] })
  @IsArray()
  @ArrayMaxSize(24)
  @ValidateNested({ each: true })
  @Type(() => AiAssistantMessageDto)
  messages!: AiAssistantMessageDto[];

  @ApiProperty({ type: AiAssistantPageContextDto })
  @ValidateNested()
  @Type(() => AiAssistantPageContextDto)
  pageContext!: AiAssistantPageContextDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  pileGroupId?: string;

  @ApiPropertyOptional({ enum: AI_ASSISTANT_QUICK_ACTIONS })
  @IsOptional()
  @IsIn(AI_ASSISTANT_QUICK_ACTIONS)
  quickAction?: AiAssistantQuickAction;
}
