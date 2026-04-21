-- CreateEnum
CREATE TYPE "ProjectWasteClass" AS ENUM (
    'special_waste',
    'liquid_waste',
    'hazardous_waste',
    'restricted_solid_waste',
    'general_solid_putrescible',
    'general_solid_non_putrescible',
    'not_yet_classified'
);

-- CreateEnum
CREATE TYPE "ProjectWasteClassificationReferenceType" AS ENUM (
    'epa_guideline',
    'project_reference',
    'ai_report',
    'lab_report',
    'other'
);

-- CreateEnum
CREATE TYPE "ProjectWasteClassificationStepCode" AS ENUM (
    'step_1_special_waste',
    'step_2_liquid_waste',
    'step_3_preclassified',
    'step_4_hazardous_characteristics',
    'step_5_chemical_assessment',
    'step_6_putrescible'
);

-- CreateEnum
CREATE TYPE "ProjectWasteClassificationOutcomeStatus" AS ENUM (
    'not_started',
    'in_progress',
    'yes',
    'no',
    'requires_assessment',
    'complete'
);

-- CreateEnum
CREATE TYPE "ProjectWasteClassificationPathwayCode" AS ENUM (
    'part_2_immobilisation',
    'part_3_radioactive_material',
    'part_4_acid_sulfate_soils',
    'addendum_part_1'
);

-- CreateTable
CREATE TABLE "project_waste_classification_reports" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "title" TEXT,
    "revision" TEXT,
    "issue_date" TIMESTAMP(3),
    "document_status" TEXT,
    "prepared_by" TEXT,
    "checked_by" TEXT,
    "purpose" TEXT,
    "waste_stream_name" TEXT,
    "waste_source_origin" TEXT,
    "waste_description" TEXT,
    "sampling_date" TIMESTAMP(3),
    "quantity_estimate" TEXT,
    "proposed_receiving_facility_note" TEXT,
    "executive_summary" TEXT,
    "final_waste_class" "ProjectWasteClass" NOT NULL DEFAULT 'not_yet_classified',
    "final_classification_reasoning" TEXT,
    "management_recommendation" TEXT,
    "assumptions_limitations" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_waste_classification_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_waste_classification_references" (
    "id" UUID NOT NULL,
    "report_id" UUID NOT NULL,
    "reference_type" "ProjectWasteClassificationReferenceType" NOT NULL,
    "title" TEXT NOT NULL,
    "source_url" TEXT,
    "project_reference_id" TEXT,
    "ai_document_id" UUID,
    "note" TEXT,
    "is_prefilled" BOOLEAN NOT NULL DEFAULT false,
    "is_included" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "project_waste_classification_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_waste_classification_step_decisions" (
    "id" UUID NOT NULL,
    "report_id" UUID NOT NULL,
    "step_code" "ProjectWasteClassificationStepCode" NOT NULL,
    "step_title" TEXT NOT NULL,
    "outcome_status" "ProjectWasteClassificationOutcomeStatus" NOT NULL DEFAULT 'not_started',
    "classification_reached" BOOLEAN NOT NULL DEFAULT false,
    "resulting_waste_class" "ProjectWasteClass",
    "decision_summary" TEXT,
    "detailed_reasoning" TEXT,
    "is_applicable" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "project_waste_classification_step_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_waste_classification_checklist_items" (
    "id" UUID NOT NULL,
    "step_decision_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "is_checked" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "project_waste_classification_checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_waste_classification_lab_results" (
    "id" UUID NOT NULL,
    "report_id" UUID NOT NULL,
    "contaminant" TEXT NOT NULL,
    "sample_id" TEXT,
    "analytical_method" TEXT,
    "scc_mg_kg" DECIMAL(12,3),
    "tclp_mg_l" DECIMAL(12,3),
    "threshold_reference_note" TEXT,
    "result_interpretation" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "project_waste_classification_lab_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_waste_classification_recommendations" (
    "id" UUID NOT NULL,
    "report_id" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "priority" TEXT,
    "responsibility" TEXT,
    "timing_note" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "project_waste_classification_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_waste_classification_related_pathways" (
    "id" UUID NOT NULL,
    "report_id" UUID NOT NULL,
    "pathway_code" "ProjectWasteClassificationPathwayCode" NOT NULL,
    "title" TEXT NOT NULL,
    "is_relevant" BOOLEAN NOT NULL DEFAULT false,
    "summary_note" TEXT,
    "linked_reference_id" UUID,
    "resulting_action" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "project_waste_classification_related_pathways_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_waste_classification_reports_project_id_created_at_idx"
ON "project_waste_classification_reports"("project_id", "created_at");

-- CreateIndex
CREATE INDEX "project_waste_classification_reports_project_id_final_wast_idx"
ON "project_waste_classification_reports"("project_id", "final_waste_class");

-- CreateIndex
CREATE INDEX "project_waste_classification_references_report_id_sort_ord_idx"
ON "project_waste_classification_references"("report_id", "sort_order");

-- CreateIndex
CREATE INDEX "project_waste_classification_references_ai_document_id_idx"
ON "project_waste_classification_references"("ai_document_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_waste_classification_step_decisions_report_id_ste_key"
ON "project_waste_classification_step_decisions"("report_id", "step_code");

-- CreateIndex
CREATE INDEX "project_waste_classification_step_decisions_report_id_sor_idx"
ON "project_waste_classification_step_decisions"("report_id", "sort_order");

-- CreateIndex
CREATE INDEX "project_waste_classification_checklist_items_step_decision_idx"
ON "project_waste_classification_checklist_items"("step_decision_id", "sort_order");

-- CreateIndex
CREATE INDEX "project_waste_classification_lab_results_report_id_sort_or_idx"
ON "project_waste_classification_lab_results"("report_id", "sort_order");

-- CreateIndex
CREATE INDEX "project_waste_classification_recommendations_report_id_so_idx"
ON "project_waste_classification_recommendations"("report_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "project_waste_classification_related_pathways_report_id_key"
ON "project_waste_classification_related_pathways"("report_id", "pathway_code");

-- CreateIndex
CREATE INDEX "project_waste_classification_related_pathways_report_id_so_idx"
ON "project_waste_classification_related_pathways"("report_id", "sort_order");

-- CreateIndex
CREATE INDEX "project_waste_classification_related_pathways_linked_refe_idx"
ON "project_waste_classification_related_pathways"("linked_reference_id");

-- AddForeignKey
ALTER TABLE "project_waste_classification_reports"
ADD CONSTRAINT "project_waste_classification_reports_project_id_fkey"
FOREIGN KEY ("project_id") REFERENCES "projects"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_waste_classification_references"
ADD CONSTRAINT "project_waste_classification_references_report_id_fkey"
FOREIGN KEY ("report_id") REFERENCES "project_waste_classification_reports"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_waste_classification_references"
ADD CONSTRAINT "project_waste_classification_references_ai_document_id_fkey"
FOREIGN KEY ("ai_document_id") REFERENCES "ai_documents"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_waste_classification_step_decisions"
ADD CONSTRAINT "project_waste_classification_step_decisions_report_id_fkey"
FOREIGN KEY ("report_id") REFERENCES "project_waste_classification_reports"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_waste_classification_checklist_items"
ADD CONSTRAINT "project_waste_classification_checklist_items_step_decision_i_fkey"
FOREIGN KEY ("step_decision_id") REFERENCES "project_waste_classification_step_decisions"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_waste_classification_lab_results"
ADD CONSTRAINT "project_waste_classification_lab_results_report_id_fkey"
FOREIGN KEY ("report_id") REFERENCES "project_waste_classification_reports"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_waste_classification_recommendations"
ADD CONSTRAINT "project_waste_classification_recommendations_report_id_fkey"
FOREIGN KEY ("report_id") REFERENCES "project_waste_classification_reports"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_waste_classification_related_pathways"
ADD CONSTRAINT "project_waste_classification_related_pathways_report_id_fkey"
FOREIGN KEY ("report_id") REFERENCES "project_waste_classification_reports"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_waste_classification_related_pathways"
ADD CONSTRAINT "project_waste_classification_related_pathways_linked_referen_fkey"
FOREIGN KEY ("linked_reference_id") REFERENCES "project_waste_classification_references"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
