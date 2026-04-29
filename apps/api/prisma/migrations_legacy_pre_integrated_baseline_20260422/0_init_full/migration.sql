-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "OrgRole" AS ENUM ('owner', 'admin', 'engineer', 'viewer');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('active', 'on_hold', 'completed', 'archived');

-- CreateEnum
CREATE TYPE "ProjectRole" AS ENUM ('lead', 'engineer', 'reviewer', 'viewer');

-- CreateEnum
CREATE TYPE "StandardCategory" AS ENUM ('loading', 'concrete', 'steel', 'reinforcement', 'geotech', 'general');

-- CreateEnum
CREATE TYPE "StandardStatus" AS ENUM ('current', 'superseded', 'withdrawn');

-- CreateEnum
CREATE TYPE "MaterialCategory" AS ENUM ('concrete', 'structural_steel', 'reinforcing_steel', 'soil', 'rock', 'timber');

-- CreateEnum
CREATE TYPE "CatalogStatus" AS ENUM ('draft', 'active', 'superseded', 'archived');

-- CreateEnum
CREATE TYPE "ImportFormat" AS ENUM ('csv', 'xlsx', 'json', 'yaml');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('pending', 'validating', 'validated', 'awaiting_approval', 'approved', 'rejected', 'applying', 'applied', 'rolling_back', 'rolled_back', 'failed');

-- CreateEnum
CREATE TYPE "ImportErrorSeverity" AS ENUM ('error', 'warning');

-- CreateEnum
CREATE TYPE "LoadCategory" AS ENUM ('permanent', 'imposed', 'wind', 'earthquake', 'liquid_pressure', 'earth_pressure', 'thermal');

-- CreateEnum
CREATE TYPE "LoadActionDirection" AS ENUM ('fx', 'fy', 'fz', 'mx', 'my', 'mz');

-- CreateEnum
CREATE TYPE "LimitState" AS ENUM ('strength', 'serviceability', 'stability');

-- CreateEnum
CREATE TYPE "CalculatorStatus" AS ENUM ('draft', 'active', 'deprecated');

-- CreateEnum
CREATE TYPE "CalcStatus" AS ENUM ('draft', 'running', 'completed', 'failed', 'superseded');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('draft', 'generating', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "PileType" AS ENUM ('bored', 'driven', 'cfa', 'micropile', 'screw');

-- CreateEnum
CREATE TYPE "DesignCheckStatus" AS ENUM ('pass', 'fail', 'warning', 'not_checked');

-- CreateTable
CREATE TABLE "organisations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "abn" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organisations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organisation_members" (
    "id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "OrgRole" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organisation_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'active',
    "standards_profile_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_members" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "ProjectRole" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "elements" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "element_type" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "elements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "standards" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "StandardCategory" NOT NULL,
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "standards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "standard_editions" (
    "id" UUID NOT NULL,
    "standard_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "edition" TEXT NOT NULL,
    "amendment" TEXT,
    "source_edition" TEXT NOT NULL,
    "source_amendment" TEXT,
    "clause_ref" TEXT,
    "note" TEXT,
    "source_doc" TEXT,
    "effective_date" TIMESTAMP(3) NOT NULL,
    "status" "StandardStatus" NOT NULL DEFAULT 'current',
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "rule_pack_id" UUID,

    CONSTRAINT "standard_editions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rule_packs" (
    "id" UUID NOT NULL,
    "standard_code" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "content_hash" TEXT NOT NULL,
    "rules" JSONB NOT NULL,
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "imported_by" TEXT NOT NULL,
    "imported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rule_packs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "standard_clause_refs" (
    "id" UUID NOT NULL,
    "standard_edition_id" UUID NOT NULL,
    "clause" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "is_demo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "standard_clause_refs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "standards_profiles" (
    "id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "standards_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pinned_standards" (
    "id" UUID NOT NULL,
    "standards_profile_id" UUID NOT NULL,
    "standard_edition_id" UUID NOT NULL,

    CONSTRAINT "pinned_standards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_standard_assignments" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "standard_edition_id" UUID NOT NULL,
    "notes" TEXT,
    "pinned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pinned_by" UUID NOT NULL,

    CONSTRAINT "project_standard_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_families" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "MaterialCategory" NOT NULL,
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_families_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materials" (
    "id" UUID NOT NULL,
    "organisation_id" UUID,
    "family_id" UUID,
    "category" "MaterialCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "grade" TEXT,
    "standard_ref" TEXT,
    "source_standard" TEXT,
    "source_edition" TEXT,
    "source_amendment" TEXT,
    "properties" JSONB NOT NULL,
    "is_system_default" BOOLEAN NOT NULL DEFAULT false,
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_property_schemas" (
    "id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "material_property_schemas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_property_sets" (
    "id" UUID NOT NULL,
    "material_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "source" TEXT,
    "clause_ref" TEXT,

    CONSTRAINT "material_property_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "geotech_material_classes" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "classification" TEXT,
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "geotech_material_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "geotech_parameter_sets" (
    "id" UUID NOT NULL,
    "organisation_id" UUID,
    "class_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "source_standard" TEXT,
    "source_edition" TEXT,
    "source_amendment" TEXT,
    "parameters" JSONB NOT NULL,
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "geotech_parameter_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "steel_section_catalogs" (
    "id" UUID NOT NULL,
    "organisation_id" UUID,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "source_standard" TEXT NOT NULL,
    "source_edition" TEXT NOT NULL,
    "source_amendment" TEXT,
    "snapshot_hash" TEXT,
    "status" "CatalogStatus" NOT NULL DEFAULT 'draft',
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "import_job_id" UUID,
    "created_by" UUID,
    "effective_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "steel_section_catalogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "steel_sections" (
    "id" UUID NOT NULL,
    "catalog_id" UUID NOT NULL,
    "designation" TEXT NOT NULL,
    "section_type" TEXT NOT NULL,
    "properties" JSONB NOT NULL,
    "standard_ref" TEXT,
    "source_doc" TEXT,
    "is_demo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "steel_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rebar_catalogs" (
    "id" UUID NOT NULL,
    "organisation_id" UUID,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "source_standard" TEXT NOT NULL,
    "source_edition" TEXT NOT NULL,
    "source_amendment" TEXT,
    "snapshot_hash" TEXT,
    "status" "CatalogStatus" NOT NULL DEFAULT 'draft',
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "import_job_id" UUID,
    "created_by" UUID,
    "effective_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rebar_catalogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rebar_sizes" (
    "id" UUID NOT NULL,
    "catalog_id" UUID NOT NULL,
    "designation" TEXT NOT NULL,
    "bar_diameter" DOUBLE PRECISION NOT NULL,
    "nominal_area" DOUBLE PRECISION NOT NULL,
    "mass_per_metre" DOUBLE PRECISION NOT NULL,
    "grade" TEXT NOT NULL,
    "ductility_class" TEXT NOT NULL,
    "standard_ref" TEXT,
    "is_demo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "rebar_sizes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_jobs" (
    "id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "entity_type" TEXT NOT NULL,
    "format" "ImportFormat" NOT NULL,
    "file_name" TEXT NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'pending',
    "total_rows" INTEGER NOT NULL DEFAULT 0,
    "valid_rows" INTEGER NOT NULL DEFAULT 0,
    "error_rows" INTEGER NOT NULL DEFAULT 0,
    "dry_run" BOOLEAN NOT NULL DEFAULT false,
    "snapshot_id" UUID,
    "diff" JSONB,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "rolled_back_at" TIMESTAMP(3),
    "rolled_back_by" UUID,
    "approved_at" TIMESTAMP(3),
    "approved_by" UUID,
    "rejected_at" TIMESTAMP(3),
    "rejected_by" UUID,
    "rejection_reason" TEXT,

    CONSTRAINT "import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_item_errors" (
    "id" UUID NOT NULL,
    "import_job_id" UUID NOT NULL,
    "row_number" INTEGER NOT NULL,
    "field" TEXT,
    "message" TEXT NOT NULL,
    "severity" "ImportErrorSeverity" NOT NULL DEFAULT 'error',

    CONSTRAINT "import_item_errors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_approvals" (
    "id" UUID NOT NULL,
    "import_job_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rule_pack_activations" (
    "id" UUID NOT NULL,
    "rule_pack_id" UUID NOT NULL,
    "import_job_id" UUID,
    "activated_by" UUID NOT NULL,
    "activated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deactivated_at" TIMESTAMP(3),
    "deactivated_by" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,

    CONSTRAINT "rule_pack_activations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "project_id" UUID,
    "entity_type" TEXT,
    "entity_id" UUID,
    "name" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "storage_path" TEXT NOT NULL,
    "uploaded_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "load_cases" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" "LoadCategory" NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "load_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "load_actions" (
    "id" UUID NOT NULL,
    "load_case_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "direction" "LoadActionDirection" NOT NULL,
    "magnitude" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "load_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "load_combination_sets" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "standard_ref" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "load_combination_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "load_combinations" (
    "id" UUID NOT NULL,
    "set_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "limit_state" "LimitState" NOT NULL,
    "clause_ref" TEXT,
    "factors" JSONB NOT NULL,

    CONSTRAINT "load_combinations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calculator_definitions" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "calc_type" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calculator_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calculator_versions" (
    "id" UUID NOT NULL,
    "definition_id" UUID NOT NULL,
    "version" TEXT NOT NULL,
    "input_schema" JSONB NOT NULL,
    "output_schema" JSONB,
    "default_inputs" JSONB,
    "status" "CalculatorStatus" NOT NULL DEFAULT 'draft',
    "release_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calculator_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calculation_runs" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "element_id" UUID,
    "calculator_version_id" UUID,
    "calc_type" TEXT NOT NULL,
    "status" "CalcStatus" NOT NULL DEFAULT 'draft',
    "request_snapshot" JSONB NOT NULL,
    "result_snapshot" JSONB,
    "request_hash" TEXT NOT NULL,
    "duration_ms" INTEGER,
    "notes" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calculation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calculation_snapshots" (
    "id" UUID NOT NULL,
    "calculation_run_id" UUID NOT NULL,
    "input_snapshot" JSONB NOT NULL,
    "input_hash" TEXT NOT NULL,
    "standards_snapshot" JSONB NOT NULL,
    "standards_hash" TEXT NOT NULL,
    "rule_pack_snapshot" JSONB NOT NULL,
    "rule_pack_hash" TEXT NOT NULL,
    "output_snapshot" JSONB,
    "output_hash" TEXT,
    "combined_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calculation_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calculation_reports" (
    "id" UUID NOT NULL,
    "calculation_run_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'json',
    "status" "ReportStatus" NOT NULL DEFAULT 'draft',
    "evidence_bundle" JSONB,
    "generated_by" UUID NOT NULL,
    "generated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calculation_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pile_groups" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pile_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "piles" (
    "id" UUID NOT NULL,
    "pile_group_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "pile_type" "PileType" NOT NULL,
    "diameter" DOUBLE PRECISION NOT NULL,
    "length" DOUBLE PRECISION NOT NULL,
    "embedment_depth" DOUBLE PRECISION,
    "rake_angle" DOUBLE PRECISION,
    "material_id" UUID,
    "properties" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "piles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pile_layout_points" (
    "id" UUID NOT NULL,
    "pile_group_id" UUID NOT NULL,
    "pile_id" UUID,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "z" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "label" TEXT,

    CONSTRAINT "pile_layout_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pile_capacity_profiles" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "pile_id" UUID,
    "soil_profile_id" UUID,
    "method" TEXT NOT NULL,
    "standard_ref" TEXT,
    "parameters" JSONB NOT NULL,
    "input_snapshot" JSONB NOT NULL,
    "input_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pile_capacity_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pile_design_checks" (
    "id" UUID NOT NULL,
    "calculation_run_id" UUID NOT NULL,
    "pile_id" UUID,
    "pile_group_id" UUID,
    "check_type" TEXT NOT NULL,
    "limit_state" "LimitState" NOT NULL,
    "demand_value" DOUBLE PRECISION NOT NULL,
    "capacity_value" DOUBLE PRECISION NOT NULL,
    "utilisation_ratio" DOUBLE PRECISION NOT NULL,
    "status" "DesignCheckStatus" NOT NULL,
    "clause_ref" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pile_design_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "organisation_id" UUID,
    "user_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organisations_slug_key" ON "organisations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "organisation_members_organisation_id_user_id_key" ON "organisation_members"("organisation_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "projects_organisation_id_code_key" ON "projects"("organisation_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "project_members_project_id_user_id_key" ON "project_members"("project_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "standards_code_key" ON "standards"("code");

-- CreateIndex
CREATE UNIQUE INDEX "standard_editions_code_edition_key" ON "standard_editions"("code", "edition");

-- CreateIndex
CREATE UNIQUE INDEX "rule_packs_standard_code_version_key" ON "rule_packs"("standard_code", "version");

-- CreateIndex
CREATE UNIQUE INDEX "standard_clause_refs_standard_edition_id_clause_key" ON "standard_clause_refs"("standard_edition_id", "clause");

-- CreateIndex
CREATE UNIQUE INDEX "pinned_standards_standards_profile_id_standard_edition_id_key" ON "pinned_standards"("standards_profile_id", "standard_edition_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_standard_assignments_project_id_standard_edition_id_key" ON "project_standard_assignments"("project_id", "standard_edition_id");

-- CreateIndex
CREATE UNIQUE INDEX "material_families_code_key" ON "material_families"("code");

-- CreateIndex
CREATE UNIQUE INDEX "material_property_schemas_family_id_key_key" ON "material_property_schemas"("family_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "material_property_sets_material_id_key_key" ON "material_property_sets"("material_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "geotech_material_classes_code_key" ON "geotech_material_classes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "steel_section_catalogs_name_version_key" ON "steel_section_catalogs"("name", "version");

-- CreateIndex
CREATE UNIQUE INDEX "steel_sections_catalog_id_designation_key" ON "steel_sections"("catalog_id", "designation");

-- CreateIndex
CREATE UNIQUE INDEX "rebar_catalogs_name_version_key" ON "rebar_catalogs"("name", "version");

-- CreateIndex
CREATE UNIQUE INDEX "rebar_sizes_catalog_id_designation_key" ON "rebar_sizes"("catalog_id", "designation");

-- CreateIndex
CREATE INDEX "import_jobs_organisation_id_created_at_idx" ON "import_jobs"("organisation_id", "created_at");

-- CreateIndex
CREATE INDEX "import_item_errors_import_job_id_idx" ON "import_item_errors"("import_job_id");

-- CreateIndex
CREATE INDEX "import_approvals_import_job_id_idx" ON "import_approvals"("import_job_id");

-- CreateIndex
CREATE INDEX "rule_pack_activations_rule_pack_id_idx" ON "rule_pack_activations"("rule_pack_id");

-- CreateIndex
CREATE INDEX "documents_organisation_id_idx" ON "documents"("organisation_id");

-- CreateIndex
CREATE INDEX "documents_project_id_idx" ON "documents"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "calculator_definitions_code_key" ON "calculator_definitions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "calculator_versions_definition_id_version_key" ON "calculator_versions"("definition_id", "version");

-- CreateIndex
CREATE INDEX "calculation_runs_project_id_idx" ON "calculation_runs"("project_id");

-- CreateIndex
CREATE INDEX "calculation_runs_request_hash_idx" ON "calculation_runs"("request_hash");

-- CreateIndex
CREATE UNIQUE INDEX "calculation_snapshots_calculation_run_id_key" ON "calculation_snapshots"("calculation_run_id");

-- CreateIndex
CREATE INDEX "calculation_snapshots_combined_hash_idx" ON "calculation_snapshots"("combined_hash");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_organisation_id_created_at_idx" ON "audit_logs"("organisation_id", "created_at");

-- AddForeignKey
ALTER TABLE "organisation_members" ADD CONSTRAINT "organisation_members_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organisation_members" ADD CONSTRAINT "organisation_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_standards_profile_id_fkey" FOREIGN KEY ("standards_profile_id") REFERENCES "standards_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "elements" ADD CONSTRAINT "elements_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "standard_editions" ADD CONSTRAINT "standard_editions_standard_id_fkey" FOREIGN KEY ("standard_id") REFERENCES "standards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "standard_editions" ADD CONSTRAINT "standard_editions_rule_pack_id_fkey" FOREIGN KEY ("rule_pack_id") REFERENCES "rule_packs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "standard_clause_refs" ADD CONSTRAINT "standard_clause_refs_standard_edition_id_fkey" FOREIGN KEY ("standard_edition_id") REFERENCES "standard_editions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "standards_profiles" ADD CONSTRAINT "standards_profiles_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pinned_standards" ADD CONSTRAINT "pinned_standards_standards_profile_id_fkey" FOREIGN KEY ("standards_profile_id") REFERENCES "standards_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pinned_standards" ADD CONSTRAINT "pinned_standards_standard_edition_id_fkey" FOREIGN KEY ("standard_edition_id") REFERENCES "standard_editions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_standard_assignments" ADD CONSTRAINT "project_standard_assignments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_standard_assignments" ADD CONSTRAINT "project_standard_assignments_standard_edition_id_fkey" FOREIGN KEY ("standard_edition_id") REFERENCES "standard_editions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "material_families"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_property_schemas" ADD CONSTRAINT "material_property_schemas_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "material_families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_property_sets" ADD CONSTRAINT "material_property_sets_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "geotech_parameter_sets" ADD CONSTRAINT "geotech_parameter_sets_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "geotech_material_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "geotech_parameter_sets" ADD CONSTRAINT "geotech_parameter_sets_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "steel_section_catalogs" ADD CONSTRAINT "steel_section_catalogs_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "steel_sections" ADD CONSTRAINT "steel_sections_catalog_id_fkey" FOREIGN KEY ("catalog_id") REFERENCES "steel_section_catalogs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rebar_catalogs" ADD CONSTRAINT "rebar_catalogs_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rebar_sizes" ADD CONSTRAINT "rebar_sizes_catalog_id_fkey" FOREIGN KEY ("catalog_id") REFERENCES "rebar_catalogs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_item_errors" ADD CONSTRAINT "import_item_errors_import_job_id_fkey" FOREIGN KEY ("import_job_id") REFERENCES "import_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_approvals" ADD CONSTRAINT "import_approvals_import_job_id_fkey" FOREIGN KEY ("import_job_id") REFERENCES "import_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rule_pack_activations" ADD CONSTRAINT "rule_pack_activations_rule_pack_id_fkey" FOREIGN KEY ("rule_pack_id") REFERENCES "rule_packs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "load_cases" ADD CONSTRAINT "load_cases_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "load_actions" ADD CONSTRAINT "load_actions_load_case_id_fkey" FOREIGN KEY ("load_case_id") REFERENCES "load_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "load_combination_sets" ADD CONSTRAINT "load_combination_sets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "load_combinations" ADD CONSTRAINT "load_combinations_set_id_fkey" FOREIGN KEY ("set_id") REFERENCES "load_combination_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculator_versions" ADD CONSTRAINT "calculator_versions_definition_id_fkey" FOREIGN KEY ("definition_id") REFERENCES "calculator_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculation_runs" ADD CONSTRAINT "calculation_runs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculation_runs" ADD CONSTRAINT "calculation_runs_element_id_fkey" FOREIGN KEY ("element_id") REFERENCES "elements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculation_runs" ADD CONSTRAINT "calculation_runs_calculator_version_id_fkey" FOREIGN KEY ("calculator_version_id") REFERENCES "calculator_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculation_runs" ADD CONSTRAINT "calculation_runs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculation_snapshots" ADD CONSTRAINT "calculation_snapshots_calculation_run_id_fkey" FOREIGN KEY ("calculation_run_id") REFERENCES "calculation_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculation_reports" ADD CONSTRAINT "calculation_reports_calculation_run_id_fkey" FOREIGN KEY ("calculation_run_id") REFERENCES "calculation_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculation_reports" ADD CONSTRAINT "calculation_reports_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pile_groups" ADD CONSTRAINT "pile_groups_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "piles" ADD CONSTRAINT "piles_pile_group_id_fkey" FOREIGN KEY ("pile_group_id") REFERENCES "pile_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pile_layout_points" ADD CONSTRAINT "pile_layout_points_pile_group_id_fkey" FOREIGN KEY ("pile_group_id") REFERENCES "pile_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pile_layout_points" ADD CONSTRAINT "pile_layout_points_pile_id_fkey" FOREIGN KEY ("pile_id") REFERENCES "piles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pile_capacity_profiles" ADD CONSTRAINT "pile_capacity_profiles_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pile_capacity_profiles" ADD CONSTRAINT "pile_capacity_profiles_pile_id_fkey" FOREIGN KEY ("pile_id") REFERENCES "piles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pile_design_checks" ADD CONSTRAINT "pile_design_checks_calculation_run_id_fkey" FOREIGN KEY ("calculation_run_id") REFERENCES "calculation_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pile_design_checks" ADD CONSTRAINT "pile_design_checks_pile_id_fkey" FOREIGN KEY ("pile_id") REFERENCES "piles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pile_design_checks" ADD CONSTRAINT "pile_design_checks_pile_group_id_fkey" FOREIGN KEY ("pile_group_id") REFERENCES "pile_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

