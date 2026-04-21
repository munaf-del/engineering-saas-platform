-- CreateEnum
CREATE TYPE "ProjectEnvironmentalMonitoringCriterionApplicabilityStatus" AS ENUM ('applicable', 'reference_only', 'superseded_by_project_condition', 'not_applicable');

-- CreateEnum
CREATE TYPE "ProjectEnvironmentalMonitoringAnnexureType" AS ENUM ('spatial_sheet');

-- CreateEnum
CREATE TYPE "RootSheetTemplateScopeType" AS ENUM ('global', 'org', 'project');

-- CreateEnum
CREATE TYPE "SheetTemplateSourceKind" AS ENUM ('root_sheet_template', 'built_in_sheet_template', 'legacy_spatial_layout');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ProjectEnvironmentalMonitoringComplianceStatus" ADD VALUE 'compliant';
ALTER TYPE "ProjectEnvironmentalMonitoringComplianceStatus" ADD VALUE 'trigger_exceeded';
ALTER TYPE "ProjectEnvironmentalMonitoringComplianceStatus" ADD VALUE 'criterion_exceeded';
ALTER TYPE "ProjectEnvironmentalMonitoringComplianceStatus" ADD VALUE 'not_applicable';

-- AlterTable
ALTER TABLE "project_environmental_monitoring_locations" ADD COLUMN     "source_spatial_feature_id" UUID,
ADD COLUMN     "source_spatial_feature_label" TEXT,
ADD COLUMN     "source_spatial_feature_type" "ProjectSpatialFeatureType",
ADD COLUMN     "source_spatial_view_id" UUID,
ADD COLUMN     "source_spatial_view_label" TEXT,
ALTER COLUMN "receiver_type" DROP NOT NULL;

-- AlterTable
ALTER TABLE "project_environmental_monitoring_observations" ADD COLUMN     "follow_up_required" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "implication_severity" TEXT,
ADD COLUMN     "location_id" UUID,
ADD COLUMN     "noise_result_id" UUID;

-- AlterTable
ALTER TABLE "project_environmental_monitoring_recommendations" ADD COLUMN     "due_date" TIMESTAMP(3),
ADD COLUMN     "noise_result_id" UUID,
ADD COLUMN     "observation_id" UUID,
ADD COLUMN     "status" TEXT;

-- AlterTable
ALTER TABLE "project_environmental_monitoring_selected_criteria" ADD COLUMN     "applicability_status" "ProjectEnvironmentalMonitoringCriterionApplicabilityStatus" NOT NULL DEFAULT 'applicable';

-- AlterTable
ALTER TABLE "project_environmental_noise_result_rows" ADD COLUMN     "descriptor_metric" TEXT,
ADD COLUMN     "measured_unit" TEXT,
ADD COLUMN     "measured_value" DECIMAL(12,3),
ADD COLUMN     "selected_criterion_id" UUID;

-- CreateTable
CREATE TABLE "root_sheet_templates" (
    "id" UUID NOT NULL,
    "organisation_id" UUID,
    "scope_type" "RootSheetTemplateScopeType" NOT NULL,
    "scope_id" TEXT,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT,
    "archived_at" TIMESTAMP(3),
    "current_version_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,

    CONSTRAINT "root_sheet_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "root_sheet_template_versions" (
    "id" UUID NOT NULL,
    "root_sheet_template_id" UUID NOT NULL,
    "version_label" TEXT NOT NULL,
    "schema_version" INTEGER NOT NULL DEFAULT 1,
    "definition_json" JSONB NOT NULL,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "root_sheet_template_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_environmental_monitoring_report_package_issues" (
    "id" UUID NOT NULL,
    "monitoring_report_id" UUID NOT NULL,
    "issue_label" TEXT NOT NULL,
    "revision" TEXT,
    "document_status" TEXT,
    "issue_date" TIMESTAMP(3),
    "prepared_by" TEXT,
    "checked_by" TEXT,
    "approved_by" TEXT,
    "report_snapshot_json" JSONB NOT NULL,
    "package_snapshot_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "project_environmental_monitoring_report_package_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_environmental_monitoring_annexures" (
    "id" UUID NOT NULL,
    "monitoring_report_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "annexure_type" "ProjectEnvironmentalMonitoringAnnexureType" NOT NULL,
    "template_source_kind" "SheetTemplateSourceKind" NOT NULL DEFAULT 'built_in_sheet_template',
    "template_reference_id" TEXT,
    "root_sheet_template_id" UUID,
    "root_sheet_template_version_id" UUID,
    "template_snapshot_json" JSONB,
    "source_label" TEXT,
    "binding_json" JSONB,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_environmental_monitoring_annexures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_spatial_views" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "basemap" TEXT NOT NULL,
    "view_state_json" JSONB NOT NULL,
    "visible_layers_json" JSONB NOT NULL,
    "filters_json" JSONB,
    "labels_or_style_json" JSONB,
    "annotations_json" JSONB,
    "captured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,

    CONSTRAINT "project_spatial_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_spatial_sheets" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "template_source_kind" "SheetTemplateSourceKind" NOT NULL DEFAULT 'root_sheet_template',
    "template_reference_id" TEXT,
    "root_sheet_template_id" UUID,
    "root_sheet_template_version_id" UUID,
    "template_snapshot_json" JSONB,
    "assigned_view_id" UUID,
    "assigned_view_snapshot_json" JSONB,
    "binding_snapshot_json" JSONB,
    "paper_size" TEXT NOT NULL,
    "orientation" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,

    CONSTRAINT "project_spatial_sheets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "root_sheet_templates_current_version_id_key" ON "root_sheet_templates"("current_version_id");

-- CreateIndex
CREATE INDEX "root_sheet_templates_org_updated_idx" ON "root_sheet_templates"("organisation_id", "archived_at", "updated_at");

-- CreateIndex
CREATE INDEX "root_sheet_templates_scope_archived_idx" ON "root_sheet_templates"("scope_type", "scope_id", "archived_at");

-- CreateIndex
CREATE UNIQUE INDEX "root_sheet_templates_scope_key" ON "root_sheet_templates"("scope_type", "scope_id", "key");

-- CreateIndex
CREATE INDEX "root_sheet_template_versions_template_created_idx" ON "root_sheet_template_versions"("root_sheet_template_id", "created_at");

-- CreateIndex
CREATE INDEX "pem_report_package_issues_report_created_idx" ON "project_environmental_monitoring_report_package_issues"("monitoring_report_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "pem_report_package_issues_report_label_key" ON "project_environmental_monitoring_report_package_issues"("monitoring_report_id", "issue_label");

-- CreateIndex
CREATE INDEX "project_environmental_monitoring_annexures_template_idx" ON "project_environmental_monitoring_annexures"("root_sheet_template_id");

-- CreateIndex
CREATE INDEX "project_environmental_monitoring_annexures_template_version_idx" ON "project_environmental_monitoring_annexures"("root_sheet_template_version_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_environmental_monitoring_annexures_report_order_key" ON "project_environmental_monitoring_annexures"("monitoring_report_id", "sort_order");

-- CreateIndex
CREATE INDEX "project_spatial_views_project_updated_idx" ON "project_spatial_views"("project_id", "updated_at");

-- CreateIndex
CREATE INDEX "project_spatial_sheets_project_updated_idx" ON "project_spatial_sheets"("project_id", "updated_at");

-- CreateIndex
CREATE INDEX "project_spatial_sheets_view_idx" ON "project_spatial_sheets"("assigned_view_id");

-- CreateIndex
CREATE INDEX "project_spatial_sheets_template_idx" ON "project_spatial_sheets"("root_sheet_template_id");

-- CreateIndex
CREATE INDEX "project_spatial_sheets_template_version_idx" ON "project_spatial_sheets"("root_sheet_template_version_id");

-- CreateIndex
CREATE INDEX "pem_locations_source_feature_idx" ON "project_environmental_monitoring_locations"("source_spatial_feature_id");

-- CreateIndex
CREATE INDEX "pem_observations_location_idx" ON "project_environmental_monitoring_observations"("location_id");

-- CreateIndex
CREATE INDEX "pem_observations_noise_result_idx" ON "project_environmental_monitoring_observations"("noise_result_id");

-- CreateIndex
CREATE INDEX "pem_recommendations_observation_idx" ON "project_environmental_monitoring_recommendations"("observation_id");

-- CreateIndex
CREATE INDEX "pem_recommendations_noise_result_idx" ON "project_environmental_monitoring_recommendations"("noise_result_id");

-- CreateIndex
CREATE INDEX "project_environmental_noise_result_rows_selected_criterion__idx" ON "project_environmental_noise_result_rows"("selected_criterion_id");

-- AddForeignKey
ALTER TABLE "root_sheet_templates" ADD CONSTRAINT "root_sheet_templates_organisation_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "root_sheet_templates" ADD CONSTRAINT "root_sheet_templates_current_version_fkey" FOREIGN KEY ("current_version_id") REFERENCES "root_sheet_template_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "root_sheet_template_versions" ADD CONSTRAINT "root_sheet_template_versions_template_fkey" FOREIGN KEY ("root_sheet_template_id") REFERENCES "root_sheet_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_environmental_monitoring_report_package_issues" ADD CONSTRAINT "pem_report_package_issues_report_fkey" FOREIGN KEY ("monitoring_report_id") REFERENCES "project_environmental_monitoring_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_environmental_monitoring_annexures" ADD CONSTRAINT "project_environmental_monitoring_annexures_monitoring_repo_fkey" FOREIGN KEY ("monitoring_report_id") REFERENCES "project_environmental_monitoring_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_environmental_monitoring_annexures" ADD CONSTRAINT "pem_annexures_template_fkey" FOREIGN KEY ("root_sheet_template_id") REFERENCES "root_sheet_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_environmental_monitoring_annexures" ADD CONSTRAINT "pem_annexures_template_ver_fkey" FOREIGN KEY ("root_sheet_template_version_id") REFERENCES "root_sheet_template_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_spatial_views" ADD CONSTRAINT "project_spatial_views_project_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_spatial_sheets" ADD CONSTRAINT "project_spatial_sheets_project_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_spatial_sheets" ADD CONSTRAINT "ps_sheets_template_fkey" FOREIGN KEY ("root_sheet_template_id") REFERENCES "root_sheet_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_spatial_sheets" ADD CONSTRAINT "ps_sheets_template_ver_fkey" FOREIGN KEY ("root_sheet_template_version_id") REFERENCES "root_sheet_template_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_spatial_sheets" ADD CONSTRAINT "project_spatial_sheets_view_fkey" FOREIGN KEY ("assigned_view_id") REFERENCES "project_spatial_views"("id") ON DELETE SET NULL ON UPDATE CASCADE;

