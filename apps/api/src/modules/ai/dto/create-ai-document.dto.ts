import { AiDocumentKind } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsOptional, IsUUID } from 'class-validator';
import {
  AI_REPORT_DOCUMENT_FAMILIES,
  AI_REPORT_OWNER_WORKSPACES,
  AI_REPORT_TYPES,
  type AiReportDocumentFamily,
  type AiReportOwnerWorkspace,
  type AiReportType,
} from './ai-document-classification.dto';

export class CreateAiDocumentDto {
  @ApiProperty()
  @IsUUID()
  projectId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  pileGroupId?: string;

  @ApiPropertyOptional({ enum: AiDocumentKind, default: AiDocumentKind.engineering_report })
  @IsOptional()
  @IsEnum(AiDocumentKind)
  kind?: AiDocumentKind;

  @ApiPropertyOptional({ enum: AI_REPORT_DOCUMENT_FAMILIES })
  @IsOptional()
  @IsIn([...AI_REPORT_DOCUMENT_FAMILIES])
  documentFamily?: AiReportDocumentFamily;

  @ApiPropertyOptional({ enum: AI_REPORT_TYPES })
  @IsOptional()
  @IsIn([...AI_REPORT_TYPES])
  reportType?: AiReportType;

  @ApiPropertyOptional({ enum: AI_REPORT_OWNER_WORKSPACES })
  @IsOptional()
  @IsIn([...AI_REPORT_OWNER_WORKSPACES])
  ownerWorkspace?: AiReportOwnerWorkspace;
}
