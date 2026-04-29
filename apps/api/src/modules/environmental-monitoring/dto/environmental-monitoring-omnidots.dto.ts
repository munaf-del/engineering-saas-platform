import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';

export const ENVIRONMENTAL_MONITORING_OMNIDOTS_METRIC_KEYS = ['vtop', 'vdv', 'veff_max'] as const;

export class ProjectEnvironmentalMonitoringOmnidotsImportDto {
  @ApiProperty()
  @IsUUID()
  connectionId!: string;

  @ApiProperty()
  @IsUUID()
  measuringPointId!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  @IsDateString()
  dateFrom!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  @IsDateString()
  dateTo!: string;

  @ApiProperty({ enum: ENVIRONMENTAL_MONITORING_OMNIDOTS_METRIC_KEYS, isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsEnum(ENVIRONMENTAL_MONITORING_OMNIDOTS_METRIC_KEYS, { each: true })
  selectedMetricKeys!: Array<(typeof ENVIRONMENTAL_MONITORING_OMNIDOTS_METRIC_KEYS)[number]>;
}

export class ProjectEnvironmentalMonitoringOmnidotsBuildDatasetDto extends ProjectEnvironmentalMonitoringOmnidotsImportDto {}

export class CreateProjectEnvironmentalMonitoringVibrationResultsFromOmnidotsDatasetDto {
  @ApiProperty()
  @IsUUID()
  datasetId!: string;
}

export class UpdateProjectEnvironmentalMonitoringOmnidotsConnectionDto {
  @ApiPropertyOptional({ writeOnly: true })
  @IsOptional()
  @IsUUID()
  connectionId?: string;
}
