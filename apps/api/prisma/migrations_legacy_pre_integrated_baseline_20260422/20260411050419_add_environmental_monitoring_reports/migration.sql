-- CreateEnum
CREATE TYPE "ProjectEnvironmentalMonitoringReportType" AS ENUM ('noise_monitoring', 'vibration_monitoring');

-- CreateEnum
CREATE TYPE "ProjectEnvironmentalMonitoringComplianceStatus" AS ENUM ('not_assessed', 'complies', 'exceeds', 'review_required');

-- CreateEnum
CREATE TYPE "ProjectEnvironmentalMonitoringMetricType" AS ENUM ('ppv', 'vdv', 'lin_peak', 'other');

-- CreateTable
CREATE TABLE "project_environmental_monitoring_reports" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "report_type" "ProjectEnvironmentalMonitoringReportType" NOT NULL,
    "title" TEXT,
    "revision" TEXT,
    "issue_date" TIMESTAMP(3),
    "document_status" TEXT,
    "prepared_by" TEXT,
    "checked_by" TEXT,
    "purpose" TEXT,
    "monitoring_date" TIMESTAMP(3),
    "monitoring_window_start" TIMESTAMP(3),
    "monitoring_window_end" TIMESTAMP(3),
    "weather_conditions" TEXT,
    "site_activity_summary" TEXT,
    "executive_summary" TEXT,
    "general_observations" TEXT,
    "conclusion" TEXT,
    "recommendations_summary" TEXT,
    "assumptions_limitations" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_environmental_monitoring_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_environmental_monitoring_references" (
    "id" UUID NOT NULL,
    "monitoring_report_id" UUID NOT NULL,
    "project_reference_id" TEXT,
    "ai_document_id" UUID,
    "label" TEXT,
    "note" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "project_environmental_monitoring_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_environmental_monitoring_locations" (
    "id" UUID NOT NULL,
    "monitoring_report_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "receiver_type" "NoiseVibrationReceiverType" NOT NULL,
    "location_description" TEXT,
    "distance_note" TEXT,
    "chainage_note" TEXT,
    "coordinates_note" TEXT,
    "assessment_location_basis" "NoiseVibrationLocationBasis",
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "project_environmental_monitoring_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_environmental_monitoring_selected_criteria" (
    "id" UUID NOT NULL,
    "monitoring_report_id" UUID NOT NULL,
    "criterion_row_id" UUID NOT NULL,
    "selection_purpose" "ProjectCnvmpSelectionPurpose" NOT NULL,
    "is_enforceable_on_this_project" BOOLEAN NOT NULL DEFAULT false,
    "project_condition_reference" TEXT,
    "selection_note" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "project_environmental_monitoring_selected_criteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_environmental_noise_result_rows" (
    "id" UUID NOT NULL,
    "monitoring_report_id" UUID NOT NULL,
    "location_id" UUID,
    "observed_at" TIMESTAMP(3),
    "activity_label" TEXT NOT NULL,
    "instrument_note" TEXT,
    "measurement_period_note" TEXT,
    "laeq_15min" DECIMAL(12,3),
    "lamax" DECIMAL(12,3),
    "laf1_1min" DECIMAL(12,3),
    "background_note" TEXT,
    "criterion_row_id" UUID,
    "compliance_status" "ProjectEnvironmentalMonitoringComplianceStatus" NOT NULL DEFAULT 'not_assessed',
    "result_note" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "project_environmental_noise_result_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_environmental_vibration_result_rows" (
    "id" UUID NOT NULL,
    "monitoring_report_id" UUID NOT NULL,
    "location_id" UUID,
    "observed_at" TIMESTAMP(3),
    "activity_label" TEXT NOT NULL,
    "instrument_note" TEXT,
    "metric_type" "ProjectEnvironmentalMonitoringMetricType" NOT NULL,
    "ppv_value" DECIMAL(12,3),
    "vdv_value" DECIMAL(12,3),
    "lin_peak_value" DECIMAL(12,3),
    "dominant_frequency_hz" DECIMAL(12,3),
    "axis_note" TEXT,
    "criterion_row_id" UUID,
    "compliance_status" "ProjectEnvironmentalMonitoringComplianceStatus" NOT NULL DEFAULT 'not_assessed',
    "result_note" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "project_environmental_vibration_result_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_environmental_monitoring_observations" (
    "id" UUID NOT NULL,
    "monitoring_report_id" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "observation" TEXT NOT NULL,
    "implication_note" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "project_environmental_monitoring_observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_environmental_monitoring_recommendations" (
    "id" UUID NOT NULL,
    "monitoring_report_id" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "priority" TEXT,
    "responsibility" TEXT,
    "timing_note" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "project_environmental_monitoring_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_environmental_monitoring_reports_project_id_created_idx" ON "project_environmental_monitoring_reports"("project_id", "created_at");

-- CreateIndex
CREATE INDEX "project_environmental_monitoring_reports_project_id_report__idx" ON "project_environmental_monitoring_reports"("project_id", "report_type");

-- CreateIndex
CREATE INDEX "project_environmental_monitoring_references_monitoring_repo_idx" ON "project_environmental_monitoring_references"("monitoring_report_id", "sort_order");

-- CreateIndex
CREATE INDEX "project_environmental_monitoring_references_ai_document_id_idx" ON "project_environmental_monitoring_references"("ai_document_id");

-- CreateIndex
CREATE INDEX "project_environmental_monitoring_locations_monitoring_repor_idx" ON "project_environmental_monitoring_locations"("monitoring_report_id", "sort_order");

-- CreateIndex
CREATE INDEX "project_environmental_monitoring_locations_receiver_type_idx" ON "project_environmental_monitoring_locations"("receiver_type");

-- CreateIndex
CREATE INDEX "project_environmental_monitoring_selected_criteria_monitori_idx" ON "project_environmental_monitoring_selected_criteria"("monitoring_report_id", "sort_order");

-- CreateIndex
CREATE INDEX "project_environmental_monitoring_selected_criteria_criterio_idx" ON "project_environmental_monitoring_selected_criteria"("criterion_row_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_environmental_monitoring_selected_criteria_monitori_key" ON "project_environmental_monitoring_selected_criteria"("monitoring_report_id", "criterion_row_id", "selection_purpose");

-- CreateIndex
CREATE INDEX "project_environmental_noise_result_rows_monitoring_report_i_idx" ON "project_environmental_noise_result_rows"("monitoring_report_id", "sort_order");

-- CreateIndex
CREATE INDEX "project_environmental_noise_result_rows_location_id_idx" ON "project_environmental_noise_result_rows"("location_id");

-- CreateIndex
CREATE INDEX "project_environmental_noise_result_rows_criterion_row_id_idx" ON "project_environmental_noise_result_rows"("criterion_row_id");

-- CreateIndex
CREATE INDEX "project_environmental_vibration_result_rows_monitoring_repo_idx" ON "project_environmental_vibration_result_rows"("monitoring_report_id", "sort_order");

-- CreateIndex
CREATE INDEX "project_environmental_vibration_result_rows_location_id_idx" ON "project_environmental_vibration_result_rows"("location_id");

-- CreateIndex
CREATE INDEX "project_environmental_vibration_result_rows_criterion_row_i_idx" ON "project_environmental_vibration_result_rows"("criterion_row_id");

-- CreateIndex
CREATE INDEX "project_environmental_monitoring_observations_monitoring_re_idx" ON "project_environmental_monitoring_observations"("monitoring_report_id", "sort_order");

-- CreateIndex
CREATE INDEX "project_environmental_monitoring_recommendations_monitoring_idx" ON "project_environmental_monitoring_recommendations"("monitoring_report_id", "sort_order");

-- AddForeignKey
ALTER TABLE "project_environmental_monitoring_reports" ADD CONSTRAINT "project_environmental_monitoring_reports_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_environmental_monitoring_references" ADD CONSTRAINT "project_environmental_monitoring_references_monitoring_rep_fkey" FOREIGN KEY ("monitoring_report_id") REFERENCES "project_environmental_monitoring_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_environmental_monitoring_references" ADD CONSTRAINT "project_environmental_monitoring_references_ai_document_id_fkey" FOREIGN KEY ("ai_document_id") REFERENCES "ai_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_environmental_monitoring_locations" ADD CONSTRAINT "project_environmental_monitoring_locations_monitoring_repo_fkey" FOREIGN KEY ("monitoring_report_id") REFERENCES "project_environmental_monitoring_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_environmental_monitoring_selected_criteria" ADD CONSTRAINT "project_environmental_monitoring_selected_criteria_monitor_fkey" FOREIGN KEY ("monitoring_report_id") REFERENCES "project_environmental_monitoring_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_environmental_monitoring_selected_criteria" ADD CONSTRAINT "project_environmental_monitoring_selected_criteria_criteri_fkey" FOREIGN KEY ("criterion_row_id") REFERENCES "noise_vibration_criterion_rows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_environmental_noise_result_rows" ADD CONSTRAINT "project_environmental_noise_result_rows_monitoring_report__fkey" FOREIGN KEY ("monitoring_report_id") REFERENCES "project_environmental_monitoring_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_environmental_noise_result_rows" ADD CONSTRAINT "project_environmental_noise_result_rows_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "project_environmental_monitoring_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_environmental_noise_result_rows" ADD CONSTRAINT "project_environmental_noise_result_rows_criterion_row_id_fkey" FOREIGN KEY ("criterion_row_id") REFERENCES "noise_vibration_criterion_rows"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_environmental_vibration_result_rows" ADD CONSTRAINT "project_environmental_vibration_result_rows_monitoring_rep_fkey" FOREIGN KEY ("monitoring_report_id") REFERENCES "project_environmental_monitoring_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_environmental_vibration_result_rows" ADD CONSTRAINT "project_environmental_vibration_result_rows_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "project_environmental_monitoring_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_environmental_vibration_result_rows" ADD CONSTRAINT "project_environmental_vibration_result_rows_criterion_row__fkey" FOREIGN KEY ("criterion_row_id") REFERENCES "noise_vibration_criterion_rows"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_environmental_monitoring_observations" ADD CONSTRAINT "project_environmental_monitoring_observations_monitoring_r_fkey" FOREIGN KEY ("monitoring_report_id") REFERENCES "project_environmental_monitoring_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_environmental_monitoring_recommendations" ADD CONSTRAINT "project_environmental_monitoring_recommendations_monitorin_fkey" FOREIGN KEY ("monitoring_report_id") REFERENCES "project_environmental_monitoring_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "project_cnvmp_mitigation_measures_project_cnvmp_id_sort_order_i" RENAME TO "project_cnvmp_mitigation_measures_project_cnvmp_id_sort_ord_idx";

-- RenameIndex
ALTER INDEX "project_cnvmp_selected_criteria_project_cnvmp_id_criterion_row_" RENAME TO "project_cnvmp_selected_criteria_project_cnvmp_id_criterion__key";

-- RenameIndex
ALTER INDEX "project_cnvmp_selected_sources_project_cnvmp_id_standard_source" RENAME TO "project_cnvmp_selected_sources_project_cnvmp_id_standard_so_key";
