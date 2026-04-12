CREATE TYPE "ProjectCnvmpSelectionPurpose" AS ENUM (
  'noise',
  'vibration_human_comfort',
  'vibration_structural',
  'blasting',
  'time_definition',
  'other'
);

CREATE TABLE "project_cnvmps" (
  "id" UUID NOT NULL,
  "project_id" UUID NOT NULL,
  "title" TEXT,
  "revision" TEXT,
  "issue_date" TIMESTAMP(3),
  "prepared_by" TEXT,
  "checked_by" TEXT,
  "purpose" TEXT,
  "document_status" TEXT,
  "client" TEXT,
  "project_name" TEXT,
  "project_address" TEXT,
  "project_description" TEXT,
  "scope_of_works" TEXT,
  "construction_activities_note" TEXT,
  "standard_hours_note" TEXT,
  "out_of_hours_note" TEXT,
  "sensitive_receivers_note" TEXT,
  "community_communication_note" TEXT,
  "contact_details_note" TEXT,
  "complaints_handling_note" TEXT,
  "respite_communication_note" TEXT,
  "assumptions_limitations" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "project_cnvmps_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "project_cnvmp_references" (
  "id" UUID NOT NULL,
  "project_cnvmp_id" UUID NOT NULL,
  "project_reference_id" TEXT,
  "ai_document_id" UUID,
  "label" TEXT,
  "note" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT "project_cnvmp_references_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "project_cnvmp_receivers" (
  "id" UUID NOT NULL,
  "project_cnvmp_id" UUID NOT NULL,
  "label" TEXT NOT NULL,
  "receiver_type" "NoiseVibrationReceiverType" NOT NULL,
  "location_description" TEXT,
  "distance_note" TEXT,
  "sensitivity_note" TEXT,
  "use_period_note" TEXT,
  "is_heritage" BOOLEAN NOT NULL DEFAULT false,
  "is_critical" BOOLEAN NOT NULL DEFAULT false,
  "assessment_location_basis" "NoiseVibrationLocationBasis",
  "sort_order" INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT "project_cnvmp_receivers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "project_cnvmp_activities" (
  "id" UUID NOT NULL,
  "project_cnvmp_id" UUID NOT NULL,
  "label" TEXT NOT NULL,
  "work_type" "NoiseVibrationWorkType" NOT NULL,
  "description" TEXT,
  "timing_note" TEXT,
  "is_outside_standard_hours" BOOLEAN NOT NULL DEFAULT false,
  "noise_risk_note" TEXT,
  "vibration_risk_note" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT "project_cnvmp_activities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "project_cnvmp_selected_sources" (
  "id" UUID NOT NULL,
  "project_cnvmp_id" UUID NOT NULL,
  "standard_source_id" UUID NOT NULL,
  "is_guidance_only" BOOLEAN NOT NULL DEFAULT true,
  "is_enforceable_on_this_project" BOOLEAN NOT NULL DEFAULT false,
  "project_condition_reference" TEXT,
  "selection_note" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT "project_cnvmp_selected_sources_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "project_cnvmp_selected_criteria" (
  "id" UUID NOT NULL,
  "project_cnvmp_id" UUID NOT NULL,
  "criterion_row_id" UUID NOT NULL,
  "selection_purpose" "ProjectCnvmpSelectionPurpose" NOT NULL,
  "is_enforceable_on_this_project" BOOLEAN NOT NULL DEFAULT false,
  "project_condition_reference" TEXT,
  "selection_note" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT "project_cnvmp_selected_criteria_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "project_cnvmp_mitigation_measures" (
  "id" UUID NOT NULL,
  "project_cnvmp_id" UUID NOT NULL,
  "category" TEXT NOT NULL,
  "measure" TEXT NOT NULL,
  "trigger_note" TEXT,
  "responsibility" TEXT,
  "timing_stage" TEXT,
  "note" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT "project_cnvmp_mitigation_measures_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "project_cnvmp_monitoring_rows" (
  "id" UUID NOT NULL,
  "project_cnvmp_id" UUID NOT NULL,
  "parameter" TEXT NOT NULL,
  "method" TEXT,
  "location" TEXT,
  "frequency" TEXT,
  "trigger_action" TEXT,
  "responsibility" TEXT,
  "reporting_note" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT "project_cnvmp_monitoring_rows_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "project_cnvmps_project_id_key"
ON "project_cnvmps"("project_id");

CREATE INDEX "project_cnvmp_references_project_cnvmp_id_sort_order_idx"
ON "project_cnvmp_references"("project_cnvmp_id", "sort_order");

CREATE INDEX "project_cnvmp_references_ai_document_id_idx"
ON "project_cnvmp_references"("ai_document_id");

CREATE INDEX "project_cnvmp_receivers_project_cnvmp_id_sort_order_idx"
ON "project_cnvmp_receivers"("project_cnvmp_id", "sort_order");

CREATE INDEX "project_cnvmp_receivers_receiver_type_idx"
ON "project_cnvmp_receivers"("receiver_type");

CREATE INDEX "project_cnvmp_activities_project_cnvmp_id_sort_order_idx"
ON "project_cnvmp_activities"("project_cnvmp_id", "sort_order");

CREATE INDEX "project_cnvmp_activities_work_type_idx"
ON "project_cnvmp_activities"("work_type");

CREATE UNIQUE INDEX "project_cnvmp_selected_sources_project_cnvmp_id_standard_source_id_key"
ON "project_cnvmp_selected_sources"("project_cnvmp_id", "standard_source_id");

CREATE INDEX "project_cnvmp_selected_sources_project_cnvmp_id_sort_order_idx"
ON "project_cnvmp_selected_sources"("project_cnvmp_id", "sort_order");

CREATE INDEX "project_cnvmp_selected_sources_standard_source_id_idx"
ON "project_cnvmp_selected_sources"("standard_source_id");

CREATE UNIQUE INDEX "project_cnvmp_selected_criteria_project_cnvmp_id_criterion_row_id_selection_purpose_key"
ON "project_cnvmp_selected_criteria"("project_cnvmp_id", "criterion_row_id", "selection_purpose");

CREATE INDEX "project_cnvmp_selected_criteria_project_cnvmp_id_sort_order_idx"
ON "project_cnvmp_selected_criteria"("project_cnvmp_id", "sort_order");

CREATE INDEX "project_cnvmp_selected_criteria_criterion_row_id_idx"
ON "project_cnvmp_selected_criteria"("criterion_row_id");

CREATE INDEX "project_cnvmp_mitigation_measures_project_cnvmp_id_sort_order_idx"
ON "project_cnvmp_mitigation_measures"("project_cnvmp_id", "sort_order");

CREATE INDEX "project_cnvmp_monitoring_rows_project_cnvmp_id_sort_order_idx"
ON "project_cnvmp_monitoring_rows"("project_cnvmp_id", "sort_order");

ALTER TABLE "project_cnvmps"
ADD CONSTRAINT "project_cnvmps_project_id_fkey"
FOREIGN KEY ("project_id") REFERENCES "projects"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "project_cnvmp_references"
ADD CONSTRAINT "project_cnvmp_references_project_cnvmp_id_fkey"
FOREIGN KEY ("project_cnvmp_id") REFERENCES "project_cnvmps"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "project_cnvmp_references"
ADD CONSTRAINT "project_cnvmp_references_ai_document_id_fkey"
FOREIGN KEY ("ai_document_id") REFERENCES "ai_documents"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "project_cnvmp_receivers"
ADD CONSTRAINT "project_cnvmp_receivers_project_cnvmp_id_fkey"
FOREIGN KEY ("project_cnvmp_id") REFERENCES "project_cnvmps"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "project_cnvmp_activities"
ADD CONSTRAINT "project_cnvmp_activities_project_cnvmp_id_fkey"
FOREIGN KEY ("project_cnvmp_id") REFERENCES "project_cnvmps"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "project_cnvmp_selected_sources"
ADD CONSTRAINT "project_cnvmp_selected_sources_project_cnvmp_id_fkey"
FOREIGN KEY ("project_cnvmp_id") REFERENCES "project_cnvmps"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "project_cnvmp_selected_sources"
ADD CONSTRAINT "project_cnvmp_selected_sources_standard_source_id_fkey"
FOREIGN KEY ("standard_source_id") REFERENCES "noise_vibration_standard_sources"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "project_cnvmp_selected_criteria"
ADD CONSTRAINT "project_cnvmp_selected_criteria_project_cnvmp_id_fkey"
FOREIGN KEY ("project_cnvmp_id") REFERENCES "project_cnvmps"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "project_cnvmp_selected_criteria"
ADD CONSTRAINT "project_cnvmp_selected_criteria_criterion_row_id_fkey"
FOREIGN KEY ("criterion_row_id") REFERENCES "noise_vibration_criterion_rows"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "project_cnvmp_mitigation_measures"
ADD CONSTRAINT "project_cnvmp_mitigation_measures_project_cnvmp_id_fkey"
FOREIGN KEY ("project_cnvmp_id") REFERENCES "project_cnvmps"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "project_cnvmp_monitoring_rows"
ADD CONSTRAINT "project_cnvmp_monitoring_rows_project_cnvmp_id_fkey"
FOREIGN KEY ("project_cnvmp_id") REFERENCES "project_cnvmps"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
