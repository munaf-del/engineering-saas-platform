import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ProjectTransmittalItemRefDto {
  @ApiProperty()
  @IsString()
  drawingId!: string;

  @ApiProperty()
  @IsString()
  drawingSheetIssueId!: string;

  @ApiProperty()
  @IsString()
  sheetId!: string;
}

export class SaveProjectDraftingTransmittalDto {
  @ApiProperty()
  @IsString()
  transmittalNumber!: string;

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty()
  @IsString()
  purpose!: string;

  @ApiPropertyOptional({ enum: ['draft', 'issued', 'superseded', 'void'] })
  @IsOptional()
  @IsIn(['draft', 'issued', 'superseded', 'void'])
  status?: 'draft' | 'issued' | 'superseded' | 'void';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  issuedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  issuedBy?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  issuedTo?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cc?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [ProjectTransmittalItemRefDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectTransmittalItemRefDto)
  includedItems!: ProjectTransmittalItemRefDto[];
}
