-- CreateEnum
CREATE TYPE "MonitoringProviderKey" AS ENUM ('omnidots');

-- CreateEnum
CREATE TYPE "MonitoringProviderConnectionStatus" AS ENUM ('pending', 'active', 'invalid', 'disabled', 'error');

-- CreateEnum
CREATE TYPE "MonitoringProviderAuthType" AS ENUM ('api_token');

-- CreateEnum
CREATE TYPE "MonitoringImportJobType" AS ENUM (
  'validate_token',
  'sync_measuring_points',
  'import_peak_records',
  'import_vdv_records',
  'import_veff_records',
  'build_report_dataset'
);

-- CreateEnum
CREATE TYPE "MonitoringImportJobStatus" AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "ProjectEnvironmentalMonitoringDatasetSourceType" AS ENUM ('omnidots_api', 'omnidots_upload', 'manual');

-- CreateTable
CREATE TABLE "omnidots_provider_connections" (
  "id" UUID NOT NULL,
  "organisation_id" UUID NOT NULL,
  "provider_key" "MonitoringProviderKey" NOT NULL DEFAULT 'omnidots',
  "display_name" TEXT NOT NULL DEFAULT 'Omnidots Honeycomb',
  "status" "MonitoringProviderConnectionStatus" NOT NULL DEFAULT 'pending',
  "auth_type" "MonitoringProviderAuthType" NOT NULL DEFAULT 'api_token',
  "encrypted_credentials" JSONB NOT NULL,
  "last_validated_at" TIMESTAMP(3),
  "last_sync_at" TIMESTAMP(3),
  "last_error" TEXT,
  "created_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "omnidots_provider_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "omnidots_measuring_points" (
  "id" UUID NOT NULL,
  "connection_id" UUID NOT NULL,
  "external_measuring_point_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL,
  "timezone" TEXT,
  "guide_line" TEXT,
  "category" TEXT,
  "measuring_type" TEXT,
  "vibration_type" TEXT,
  "user_latitude" DOUBLE PRECISION,
  "user_longitude" DOUBLE PRECISION,
  "sensor_name" TEXT,
  "sensor_online" BOOLEAN,
  "sensor_lastseen_at" TIMESTAMP(3),
  "sensor_connected_using" TEXT,
  "sensor_battery_charge" DOUBLE PRECISION,
  "sensor_latitude" DOUBLE PRECISION,
  "sensor_longitude" DOUBLE PRECISION,
  "deep_link_url" TEXT,
  "raw_payload_json" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "omnidots_measuring_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monitoring_series" (
  "id" UUID NOT NULL,
  "organisation_id" UUID NOT NULL,
  "measuring_point_id" UUID NOT NULL,
  "provider_key" "MonitoringProviderKey" NOT NULL DEFAULT 'omnidots',
  "metric_key" TEXT NOT NULL,
  "metric_label" TEXT NOT NULL,
  "unit" TEXT NOT NULL,
  "axis_mode" TEXT NOT NULL,
  "source_endpoint" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "monitoring_series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monitoring_samples" (
  "id" UUID NOT NULL,
  "series_id" UUID NOT NULL,
  "measuring_point_id" UUID NOT NULL,
  "sampled_at" TIMESTAMP(3) NOT NULL,
  "source_timezone" TEXT,
  "metric_key" TEXT NOT NULL,
  "x_value" DOUBLE PRECISION,
  "y_value" DOUBLE PRECISION,
  "z_value" DOUBLE PRECISION,
  "pvs_value" DOUBLE PRECISION,
  "fdom_x" DOUBLE PRECISION,
  "fdom_y" DOUBLE PRECISION,
  "fdom_z" DOUBLE PRECISION,
  "category" TEXT,
  "guide_line" TEXT,
  "measuring_type" TEXT,
  "vibration_type" TEXT,
  "raw_payload_json" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "monitoring_samples_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monitoring_import_jobs" (
  "id" UUID NOT NULL,
  "connection_id" UUID NOT NULL,
  "organisation_id" UUID NOT NULL,
  "job_type" "MonitoringImportJobType" NOT NULL,
  "status" "MonitoringImportJobStatus" NOT NULL DEFAULT 'pending',
  "date_from" TIMESTAMP(3),
  "date_to" TIMESTAMP(3),
  "request_params_json" JSONB,
  "result_summary_json" JSONB,
  "error_message" TEXT,
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "monitoring_import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_environmental_monitoring_datasets" (
  "id" UUID NOT NULL,
  "monitoring_report_id" UUID NOT NULL,
  "source_type" "ProjectEnvironmentalMonitoringDatasetSourceType" NOT NULL,
  "connection_id" UUID,
  "measuring_point_id" UUID,
  "date_from" TIMESTAMP(3) NOT NULL,
  "date_to" TIMESTAMP(3) NOT NULL,
  "timezone" TEXT NOT NULL,
  "dataset_hash" TEXT NOT NULL,
  "snapshot_json" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "project_environmental_monitoring_datasets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "omnidots_provider_connections_organisation_id_created_at_idx"
ON "omnidots_provider_connections"("organisation_id", "created_at");

-- CreateIndex
CREATE INDEX "omnidots_provider_connections_org_provider_status_idx"
ON "omnidots_provider_connections"("organisation_id", "provider_key", "status");

-- CreateIndex
CREATE UNIQUE INDEX "omnidots_measuring_points_conn_external_id_key"
ON "omnidots_measuring_points"("connection_id", "external_measuring_point_id");

-- CreateIndex
CREATE INDEX "omnidots_measuring_points_connection_id_created_at_idx"
ON "omnidots_measuring_points"("connection_id", "created_at");

-- CreateIndex
CREATE INDEX "omnidots_measuring_points_connection_id_active_idx"
ON "omnidots_measuring_points"("connection_id", "active");

-- CreateIndex
CREATE UNIQUE INDEX "monitoring_series_point_metric_endpoint_key"
ON "monitoring_series"("measuring_point_id", "metric_key", "source_endpoint");

-- CreateIndex
CREATE INDEX "monitoring_series_organisation_id_metric_key_idx"
ON "monitoring_series"("organisation_id", "metric_key");

-- CreateIndex
CREATE INDEX "monitoring_series_measuring_point_id_created_at_idx"
ON "monitoring_series"("measuring_point_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "monitoring_samples_series_id_sampled_at_key"
ON "monitoring_samples"("series_id", "sampled_at");

-- CreateIndex
CREATE INDEX "monitoring_samples_measuring_point_id_sampled_at_idx"
ON "monitoring_samples"("measuring_point_id", "sampled_at");

-- CreateIndex
CREATE INDEX "monitoring_samples_series_id_sampled_at_idx"
ON "monitoring_samples"("series_id", "sampled_at");

-- CreateIndex
CREATE INDEX "monitoring_samples_measuring_point_id_metric_key_sampled_at_idx"
ON "monitoring_samples"("measuring_point_id", "metric_key", "sampled_at");

-- CreateIndex
CREATE INDEX "monitoring_import_jobs_organisation_id_created_at_idx"
ON "monitoring_import_jobs"("organisation_id", "created_at");

-- CreateIndex
CREATE INDEX "monitoring_import_jobs_connection_id_created_at_idx"
ON "monitoring_import_jobs"("connection_id", "created_at");

-- CreateIndex
CREATE INDEX "monitoring_import_jobs_connection_id_status_idx"
ON "monitoring_import_jobs"("connection_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "pem_datasets_report_hash_key"
ON "project_environmental_monitoring_datasets"("monitoring_report_id", "dataset_hash");

-- CreateIndex
CREATE INDEX "pem_datasets_report_created_idx"
ON "project_environmental_monitoring_datasets"("monitoring_report_id", "created_at");

-- CreateIndex
CREATE INDEX "pem_datasets_connection_idx"
ON "project_environmental_monitoring_datasets"("connection_id");

-- CreateIndex
CREATE INDEX "pem_datasets_measuring_point_idx"
ON "project_environmental_monitoring_datasets"("measuring_point_id");

-- CreateIndex
CREATE INDEX "pem_datasets_hash_idx"
ON "project_environmental_monitoring_datasets"("dataset_hash");

-- AddForeignKey
ALTER TABLE "omnidots_provider_connections"
ADD CONSTRAINT "omnidots_provider_connections_organisation_id_fkey"
FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "omnidots_measuring_points"
ADD CONSTRAINT "omnidots_measuring_points_connection_id_fkey"
FOREIGN KEY ("connection_id") REFERENCES "omnidots_provider_connections"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring_series"
ADD CONSTRAINT "monitoring_series_organisation_id_fkey"
FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring_series"
ADD CONSTRAINT "monitoring_series_measuring_point_id_fkey"
FOREIGN KEY ("measuring_point_id") REFERENCES "omnidots_measuring_points"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring_samples"
ADD CONSTRAINT "monitoring_samples_series_id_fkey"
FOREIGN KEY ("series_id") REFERENCES "monitoring_series"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring_samples"
ADD CONSTRAINT "monitoring_samples_measuring_point_id_fkey"
FOREIGN KEY ("measuring_point_id") REFERENCES "omnidots_measuring_points"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring_import_jobs"
ADD CONSTRAINT "monitoring_import_jobs_connection_id_fkey"
FOREIGN KEY ("connection_id") REFERENCES "omnidots_provider_connections"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring_import_jobs"
ADD CONSTRAINT "monitoring_import_jobs_organisation_id_fkey"
FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_environmental_monitoring_datasets"
ADD CONSTRAINT "pem_datasets_report_fkey"
FOREIGN KEY ("monitoring_report_id") REFERENCES "project_environmental_monitoring_reports"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_environmental_monitoring_datasets"
ADD CONSTRAINT "pem_datasets_connection_fkey"
FOREIGN KEY ("connection_id") REFERENCES "omnidots_provider_connections"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_environmental_monitoring_datasets"
ADD CONSTRAINT "pem_datasets_measuring_point_fkey"
FOREIGN KEY ("measuring_point_id") REFERENCES "omnidots_measuring_points"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
