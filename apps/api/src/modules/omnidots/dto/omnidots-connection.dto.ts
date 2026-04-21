import { PartialType, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateOmnidotsProviderConnectionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  displayName?: string | null;

  @ApiProperty({ writeOnly: true })
  @IsString()
  @MinLength(1)
  token!: string;
}

export class UpdateOmnidotsProviderConnectionDto extends PartialType(
  CreateOmnidotsProviderConnectionDto,
) {}
