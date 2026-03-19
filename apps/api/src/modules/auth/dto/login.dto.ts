import { IsEmail, IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'jane@acme.com.au' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'SecureP@ss1' })
  @IsString()
  password!: string;

  @ApiPropertyOptional({
    description: 'Organisation to scope the session to. If omitted, defaults to the sole membership (if exactly one).',
  })
  @IsOptional()
  @IsUUID()
  organisationId?: string;
}
