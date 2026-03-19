import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

enum OrgRole {
  owner = 'owner',
  admin = 'admin',
  engineer = 'engineer',
  viewer = 'viewer',
}

export class UpdateOrgMemberRoleDto {
  @ApiProperty({ enum: OrgRole })
  @IsEnum(OrgRole)
  role!: OrgRole;
}
