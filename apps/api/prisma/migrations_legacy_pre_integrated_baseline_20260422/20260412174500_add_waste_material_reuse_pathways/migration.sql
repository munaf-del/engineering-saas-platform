-- CreateEnum
CREATE TYPE "ProjectWasteClassificationMaterialPathwayCode" AS ENUM (
    'venm',
    'enm',
    'acid_sulfate_soils'
);

-- CreateEnum
CREATE TYPE "ProjectWasteClassificationMaterialPathwayOutcomeStatus" AS ENUM (
    'not_assessed',
    'qualifies',
    'does_not_qualify',
    'requires_further_assessment'
);

-- CreateEnum
CREATE TYPE "ProjectWasteClassificationAcidSulfateSoilClass" AS ENUM (
    'class_1',
    'class_2',
    'class_3',
    'class_4',
    'class_5',
    'not_mapped_unknown'
);

-- CreateTable
CREATE TABLE "project_waste_classification_material_pathways" (
    "id" UUID NOT NULL,
    "report_id" UUID NOT NULL,
    "pathway_code" "ProjectWasteClassificationMaterialPathwayCode" NOT NULL,
    "title" TEXT NOT NULL,
    "is_relevant" BOOLEAN NOT NULL DEFAULT true,
    "outcome_status" "ProjectWasteClassificationMaterialPathwayOutcomeStatus" NOT NULL DEFAULT 'not_assessed',
    "testing_note" TEXT,
    "supporting_reasoning" TEXT,
    "linked_reference_id" UUID,
    "ass_class" "ProjectWasteClassificationAcidSulfateSoilClass",
    "ass_class_source" TEXT,
    "project_location_note" TEXT,
    "treatment_management_note" TEXT,
    "step_5_chemical_assessment_applies" BOOLEAN,
    "ass_order_relevant" BOOLEAN,
    "ass_exemption_relevant" BOOLEAN,
    "order_exemption_note" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "project_waste_classification_material_pathways_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_waste_classification_material_pathway_checklist_items" (
    "id" UUID NOT NULL,
    "material_pathway_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "is_checked" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "project_waste_classification_material_pathway_checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "project_waste_classification_material_pathways_report_id_pat_key"
ON "project_waste_classification_material_pathways"("report_id", "pathway_code");

-- CreateIndex
CREATE INDEX "project_waste_classification_material_pathways_report_id_s_idx"
ON "project_waste_classification_material_pathways"("report_id", "sort_order");

-- CreateIndex
CREATE INDEX "project_waste_classification_material_pathways_linked_refe_idx"
ON "project_waste_classification_material_pathways"("linked_reference_id");

-- CreateIndex
CREATE INDEX "project_waste_classification_material_pathway_checklist_i_idx"
ON "project_waste_classification_material_pathway_checklist_items"("material_pathway_id", "sort_order");

-- AddForeignKey
ALTER TABLE "project_waste_classification_material_pathways"
ADD CONSTRAINT "project_waste_classification_material_pathways_report_id_fkey"
FOREIGN KEY ("report_id") REFERENCES "project_waste_classification_reports"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_waste_classification_material_pathways"
ADD CONSTRAINT "project_waste_classification_material_pathways_linked_reference_fkey"
FOREIGN KEY ("linked_reference_id") REFERENCES "project_waste_classification_references"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_waste_classification_material_pathway_checklist_items"
ADD CONSTRAINT "project_waste_classification_material_pathway_checklist_items_fkey"
FOREIGN KEY ("material_pathway_id") REFERENCES "project_waste_classification_material_pathways"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
