import { IsString, IsOptional, IsEnum, IsUUID, MaxLength, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

enum ProjectStatus {
  active = 'active',
  on_hold = 'on_hold',
  completed = 'completed',
  archived = 'archived',
}

export class UpdateProjectDto {
  @ApiPropertyOptional({ example: 'Bridge Reinforcement Study v2' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ enum: ProjectStatus })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  standardsProfileId?: string;
}
