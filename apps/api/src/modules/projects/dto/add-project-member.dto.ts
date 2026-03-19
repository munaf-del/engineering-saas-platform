import { IsEnum, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

enum ProjectRole {
  lead = 'lead',
  engineer = 'engineer',
  reviewer = 'reviewer',
  viewer = 'viewer',
}

export class AddProjectMemberDto {
  @ApiProperty()
  @IsUUID()
  userId!: string;

  @ApiProperty({ enum: ProjectRole })
  @IsEnum(ProjectRole)
  role!: ProjectRole;
}
