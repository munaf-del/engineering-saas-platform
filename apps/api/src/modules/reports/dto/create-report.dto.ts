import { IsString, IsOptional, IsEnum, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReportDto {
  @ApiProperty({ example: 'Pile Capacity Check - Group A' })
  @IsString()
  @MinLength(2)
  @MaxLength(300)
  title!: string;

  @ApiPropertyOptional({ example: 'json', enum: ['json', 'pdf', 'html'], default: 'json' })
  @IsOptional()
  @IsEnum(['json', 'pdf', 'html'], {
    message: 'format must be one of: json, pdf, html',
  })
  format?: string;
}
