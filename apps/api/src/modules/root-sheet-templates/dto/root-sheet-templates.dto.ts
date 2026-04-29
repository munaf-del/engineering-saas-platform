import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export const ROOT_SHEET_TEMPLATE_SCOPE_TYPES = ['global', 'org', 'project'] as const;

export class ListRootSheetTemplatesDto {
  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Type(() => Boolean)
  includeArchived?: boolean;
}

export class CreateRootSheetTemplateDto {
  @ApiProperty({
    description:
      'Human-facing Root Sheet Template label. Keep this generic and reusable across modules and reports.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  label!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  key?: string;

  @ApiPropertyOptional({
    default: 'general',
    description:
      'Generic capability classification for the Root Sheet Template, such as general or spatial.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string | null;

  @ApiPropertyOptional({ enum: ROOT_SHEET_TEMPLATE_SCOPE_TYPES, default: 'org' })
  @IsOptional()
  @IsEnum(ROOT_SHEET_TEMPLATE_SCOPE_TYPES)
  scopeType?: (typeof ROOT_SHEET_TEMPLATE_SCOPE_TYPES)[number];

  @ApiPropertyOptional({
    description:
      'Required for project scope. Organisation scope defaults to the authenticated organisation.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  scopeId?: string | null;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description:
      'Root Sheet Template layout definition only. Report-specific titles, notes, and source view labels bind later at sheet-instance or Report Annexure time.',
  })
  @IsObject()
  definitionJson!: Record<string, unknown>;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  schemaVersion?: number;

  @ApiPropertyOptional({ example: 'v1' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  versionLabel?: string;
}

export class UpdateRootSheetTemplateDto extends PartialType(CreateRootSheetTemplateDto) {}
