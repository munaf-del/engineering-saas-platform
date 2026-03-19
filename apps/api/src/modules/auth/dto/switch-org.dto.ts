import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SwitchOrgDto {
  @ApiProperty({ description: 'Organisation ID to switch to' })
  @IsUUID()
  organisationId!: string;
}
