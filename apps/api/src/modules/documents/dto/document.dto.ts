import { IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDocumentDto {
  @ApiProperty({ example: 'Geotechnical Investigation Report' })
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ example: 'project' })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  entityId?: string;
}
