import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export const AI_REPORT_DOCUMENT_FAMILIES = [
  'geotechnical',
  'environmental',
  'structural',
  'hydrogeology_dewatering',
  'inspections',
  'temporary_works',
  'other',
] as const;

export const AI_REPORT_TYPES = [
  'geotechnical_investigation',
  'geotechnical_comment',
  'dewatering_management_plan',
  'contamination_assessment',
  'structural_design_report',
  'inspection_report',
  'temporary_works_report',
  'other',
] as const;

export const AI_REPORT_OWNER_WORKSPACES = [
  'project',
  'project_geotechnical',
  'foundations',
  'structural',
  'environmental',
  'inspections',
  'other',
] as const;

export type AiReportDocumentFamily = (typeof AI_REPORT_DOCUMENT_FAMILIES)[number];
export type AiReportType = (typeof AI_REPORT_TYPES)[number];
export type AiReportOwnerWorkspace = (typeof AI_REPORT_OWNER_WORKSPACES)[number];

export type AiReportClassification = {
  documentFamily: AiReportDocumentFamily;
  reportType: AiReportType;
  ownerWorkspace: AiReportOwnerWorkspace;
};

export class UpdateAiDocumentClassificationDto implements AiReportClassification {
  @ApiProperty({ enum: AI_REPORT_DOCUMENT_FAMILIES })
  @IsIn([...AI_REPORT_DOCUMENT_FAMILIES])
  documentFamily!: AiReportDocumentFamily;

  @ApiProperty({ enum: AI_REPORT_TYPES })
  @IsIn([...AI_REPORT_TYPES])
  reportType!: AiReportType;

  @ApiProperty({ enum: AI_REPORT_OWNER_WORKSPACES })
  @IsIn([...AI_REPORT_OWNER_WORKSPACES])
  ownerWorkspace!: AiReportOwnerWorkspace;
}
