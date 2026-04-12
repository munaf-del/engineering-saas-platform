import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class ListAiDocumentsDto {
  @ApiProperty()
  @IsUUID()
  projectId!: string;
}
