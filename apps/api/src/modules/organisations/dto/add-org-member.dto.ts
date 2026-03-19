import { IsEnum, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

enum OrgRole {
  owner = 'owner',
  admin = 'admin',
  engineer = 'engineer',
  viewer = 'viewer',
}

export class AddOrgMemberDto {
  @ApiProperty()
  @IsUUID()
  userId!: string;

  @ApiProperty({ enum: OrgRole })
  @IsEnum(OrgRole)
  role!: OrgRole;
}
