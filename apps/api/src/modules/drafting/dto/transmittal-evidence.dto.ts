import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class AttachDraftingTransmittalEvidenceDto {
  @IsString()
  documentId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({ enum: ['browser_print_pdf', 'manual_upload'] })
  @IsOptional()
  @IsIn(['browser_print_pdf', 'manual_upload'])
  artifactSource?: 'browser_print_pdf' | 'manual_upload';
}

export class UploadDraftingTransmittalEvidenceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
