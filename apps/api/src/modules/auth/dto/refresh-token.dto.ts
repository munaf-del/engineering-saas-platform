import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token received from login or previous refresh' })
  @IsString()
  refreshToken!: string;
}
