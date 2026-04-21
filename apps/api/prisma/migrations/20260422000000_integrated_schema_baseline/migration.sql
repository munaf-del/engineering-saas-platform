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
CREATE TYPE "NoiseVibrationPublicationStatus" AS ENUM ('active', 'draft_under_review', 'superseded');

-- CreateEnum
CREATE TYPE "NoiseVibrationLegalStatus" AS ENUM ('enforceable', 'guidance_only');

-- CreateEnum
CREATE TYPE "NoiseVibrationInstrumentType" AS ENUM ('statutory', 'consent_condition', 'guidance_only', 'project_specific');

-- CreateEnum
CREATE TYPE "NoiseVibrationCriterionCategory" AS ENUM ('working_hours', 'airborne_noise_management', 'ground_borne_noise', 'vibration_human_comfort', 'vibration_structural_damage', 'blasting_airblast', 'blasting_ground_vibration', 'time_period_definition');

-- CreateEnum
CREATE TYPE "NoiseVibrationMetric" AS ENUM ('laeq_15min', 'lamax', 'laf1_1min', 'lin_peak', 'ppv', 'vdv', 'none');

-- CreateEnum
CREATE TYPE "NoiseVibrationValueBasis" AS ENUM ('absolute', 'relative_to_rbl', 'frequency_banded', 'descriptive');

-- CreateEnum
CREATE TYPE "NoiseVibrationReceiverType" AS ENUM ('residential', 'heritage', 'sensitive', 'commercial', 'industrial', 'educational', 'hospital', 'place_of_worship', 'active_recreation', 'passive_recreation', 'office_retail', 'workshop', 'critical_area');

-- CreateEnum
CREATE TYPE "NoiseVibrationTimePeriod" AS ENUM ('day', 'evening', 'night', 'standard_hours', 'outside_standard_hours', 'blasting_hours', 'any');

-- CreateEnum
CREATE TYPE "NoiseVibrationLocationBasis" AS ENUM ('property_boundary', 'internal', 'external', 'occupied_point', 'foundation', 'uppermost_storey', 'any');

-- CreateEnum
CREATE TYPE "NoiseVibrationWorkType" AS ENUM ('general_construction', 'bored_piling', 'driven_piling', 'rock_breaking', 'blasting', 'excavation', 'dynamic_compaction');

-- CreateEnum
CREATE TYPE "ProjectCnvmpSelectionPurpose" AS ENUM ('noise', 'vibration_human_comfort', 'vibration_structural', 'blasting', 'time_definition', 'other');

-- CreateEnum
CREATE TYPE "ProjectEnvironmentalMonitoringReportType" AS ENUM ('noise_monitoring', 'vibration_monitoring');

-- CreateEnum
CREATE TYPE "ProjectEnvironmentalMonitoringComplianceStatus" AS ENUM ('not_assessed', 'compliant', 'trigger_exceeded', 'criterion_exceeded', 'not_applicable', 'complies', 'exceeds', 'review_required');

-- CreateEnum
CREATE TYPE "ProjectEnvironmentalMonitoringCriterionApplicabilityStatus" AS ENUM ('applicable', 'reference_only', 'superseded_by_project_condition', 'not_applicable');

-- CreateEnum
CREATE TYPE "ProjectEnvironmentalMonitoringMetricType" AS ENUM ('ppv', 'vdv', 'lin_peak', 'other');

-- CreateEnum
CREATE TYPE "ProjectEnvironmentalMonitoringAnnexureType" AS ENUM ('spatial_sheet');

-- CreateEnum
CREATE TYPE "MonitoringProviderKey" AS ENUM ('omnidots');

-- CreateEnum
CREATE TYPE "MonitoringProviderConnectionStatus" AS ENUM ('pending', 'active', 'invalid', 'disabled', 'error');

-- CreateEnum
CREATE TYPE "MonitoringProviderAuthType" AS ENUM ('api_token');

-- CreateEnum
CREATE TYPE "MonitoringImportJobType" AS ENUM ('validate_token', 'sync_measuring_points', 'import_peak_records', 'import_vdv_records', 'import_veff_records', 'build_report_dataset');

-- CreateEnum
CREATE TYPE "MonitoringImportJobStatus" AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "ProjectEnvironmentalMonitoringDatasetSourceType" AS ENUM ('omnidots_api', 'omnidots_upload', 'manual');

-- CreateEnum
CREATE TYPE "RootSheetTemplateScopeType" AS ENUM ('global', 'org', 'project');

-- CreateEnum
CREATE TYPE "SheetTemplateSourceKind" AS ENUM ('root_sheet_template', 'built_in_sheet_template', 'legacy_spatial_layout');

-- CreateEnum
CREATE TYPE "ProjectWasteClass" AS ENUM ('special_waste', 'liquid_waste', 'hazardous_waste', 'restricted_solid_waste', 'general_solid_putrescible', 'general_solid_non_putrescible', 'not_yet_classified');

-- CreateEnum
CREATE TYPE "ProjectWasteClassificationReferenceType" AS ENUM ('epa_guideline', 'project_reference', 'ai_report', 'lab_report', 'other');

-- CreateEnum
CREATE TYPE "ProjectWasteClassificationStepCode" AS ENUM ('step_1_special_waste', 'step_2_liquid_waste', 'step_3_preclassified', 'step_4_hazardous_characteristics', 'step_5_chemical_assessment', 'step_6_putrescible');

-- CreateEnum
CREATE TYPE "ProjectWasteClassificationOutcomeStatus" AS ENUM ('not_started', 'in_progress', 'yes', 'no', 'requires_assessment', 'complete');

-- CreateEnum
CREATE TYPE "ProjectWasteClassificationPathwayCode" AS ENUM ('part_2_immobilisation', 'part_3_radioactive_material', 'part_4_acid_sulfate_soils', 'addendum_part_1');

-- CreateEnum
CREATE TYPE "ProjectWasteClassificationMaterialPathwayCode" AS ENUM ('venm', 'enm', 'acid_sulfate_soils');

-- CreateEnum
CREATE TYPE "ProjectWasteClassificationMaterialPathwayOutcomeStatus" AS ENUM ('not_assessed', 'qualifies', 'does_not_qualify', 'requires_further_assessment');

-- CreateEnum
CREATE TYPE "ProjectWasteClassificationAcidSulfateSoilClass" AS ENUM ('class_1', 'class_2', 'class_3', 'class_4', 'class_5', 'not_mapped_unknown');

-- CreateEnum
CREATE TYPE "ProjectSpatialFeatureType" AS ENUM ('site_boundary', 'parcel_boundary', 'borehole', 'monitoring_well', 'vibration_monitor', 'noise_monitor', 'receiver', 'structure', 'excavation_area', 'work_zone', 'reference_point', 'other');

-- CreateEnum
CREATE TYPE "ProjectSpatialGeometryType" AS ENUM ('point', 'line_string', 'polygon');

-- CreateEnum
CREATE TYPE "ProjectSpatialSourceType" AS ENUM ('manual', 'imported', 'report_derived', 'reference_derived', 'other');

-- CreateEnum
CREATE TYPE "ProjectSpatialLinkedDeliverableType" AS ENUM ('cnvmp', 'noise_monitoring_report', 'vibration_monitoring_report', 'geotechnical', 'foundations', 'other');

-- CreateEnum
CREATE TYPE "DraftingDrawingStatus" AS ENUM ('draft', 'issued', 'archived');

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
CREATE TYPE "AiDocumentKind" AS ENUM ('engineering_report');

-- CreateEnum
CREATE TYPE "AiDocumentStatus" AS ENUM ('uploaded_local', 'indexing', 'indexed', 'extracting', 'extracted', 'index_failed', 'extraction_failed');

-- CreateEnum
CREATE TYPE "AiReportDocumentFamily" AS ENUM ('geotechnical', 'environmental', 'structural', 'hydrogeology_dewatering', 'inspections', 'temporary_works', 'other');

-- CreateEnum
CREATE TYPE "AiReportType" AS ENUM ('geotechnical_investigation', 'geotechnical_comment', 'dewatering_management_plan', 'contamination_assessment', 'structural_design_report', 'inspection_report', 'temporary_works_report', 'other');

-- CreateEnum
CREATE TYPE "AiReportOwnerWorkspace" AS ENUM ('project', 'project_geotechnical', 'foundations', 'structural', 'environmental', 'inspections', 'other');

-- CreateEnum
CREATE TYPE "AiExtractionRunStatus" AS ENUM ('pending', 'completed', 'failed');

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
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organisations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organisation_ai_assistant_provider_credentials" (
    "id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "provider" VARCHAR(32) NOT NULL,
    "encrypted_secret" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organisation_ai_assistant_provider_credentials_pkey" PRIMARY KEY ("id")
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
    "metadata" JSONB NOT NULL DEFAULT '{}',
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
CREATE TABLE "noise_vibration_standard_sources" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "short_name" TEXT NOT NULL,
    "publisher" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "publication_status" "NoiseVibrationPublicationStatus" NOT NULL,
    "legal_status" "NoiseVibrationLegalStatus" NOT NULL,
    "instrument_type" "NoiseVibrationInstrumentType" NOT NULL,
    "source_citation" TEXT NOT NULL,
    "source_url" TEXT,
    "notes" TEXT,
    "is_seeded" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "noise_vibration_standard_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "noise_vibration_criterion_groups" (
    "id" UUID NOT NULL,
    "standard_source_id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "criterion_category" "NoiseVibrationCriterionCategory" NOT NULL,
    "metric" "NoiseVibrationMetric" NOT NULL,
    "location_basis" "NoiseVibrationLocationBasis",
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "noise_vibration_criterion_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "noise_vibration_criterion_rows" (
    "id" UUID NOT NULL,
    "criterion_group_id" UUID NOT NULL,
    "row_key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "receiver_type" "NoiseVibrationReceiverType",
    "structure_type" TEXT,
    "time_period" "NoiseVibrationTimePeriod",
    "basis_type" "NoiseVibrationValueBasis" NOT NULL,
    "reference_base" TEXT,
    "relative_offset" DECIMAL(12,3),
    "criterion_value" DECIMAL(12,3),
    "preferred_value" DECIMAL(12,3),
    "maximum_value" DECIMAL(12,3),
    "alert_value" DECIMAL(12,3),
    "stop_work_value" DECIMAL(12,3),
    "absolute_max_value" DECIMAL(12,3),
    "value_min" DECIMAL(12,3),
    "value_max" DECIMAL(12,3),
    "frequency_min_hz" DECIMAL(12,3),
    "frequency_max_hz" DECIMAL(12,3),
    "weekday_start" TEXT,
    "weekday_end" TEXT,
    "saturday_start" TEXT,
    "saturday_end" TEXT,
    "sunday_allowed" BOOLEAN,
    "public_holiday_allowed" BOOLEAN,
    "exceedance_allowance_percent" DECIMAL(12,3),
    "exceedance_window_text" TEXT,
    "unit" TEXT,
    "source_clause" TEXT,
    "row_notes" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "noise_vibration_criterion_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "noise_vibration_criterion_row_work_types" (
    "criterion_row_id" UUID NOT NULL,
    "work_type" "NoiseVibrationWorkType" NOT NULL,

    CONSTRAINT "noise_vibration_criterion_row_work_types_pkey" PRIMARY KEY ("criterion_row_id","work_type")
);

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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
    "receiver_type" "NoiseVibrationReceiverType",
    "source_spatial_view_id" UUID,
    "source_spatial_view_label" TEXT,
    "source_spatial_feature_id" UUID,
    "source_spatial_feature_label" TEXT,
    "source_spatial_feature_type" "ProjectSpatialFeatureType",
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
    "applicability_status" "ProjectEnvironmentalMonitoringCriterionApplicabilityStatus" NOT NULL DEFAULT 'applicable',
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
    "descriptor_metric" TEXT,
    "measured_value" DECIMAL(12,3),
    "measured_unit" TEXT,
    "laeq_15min" DECIMAL(12,3),
    "lamax" DECIMAL(12,3),
    "laf1_1min" DECIMAL(12,3),
    "background_note" TEXT,
    "selected_criterion_id" UUID,
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
    "location_id" UUID,
    "noise_result_id" UUID,
    "observation" TEXT NOT NULL,
    "implication_note" TEXT,
    "implication_severity" TEXT,
    "follow_up_required" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "project_environmental_monitoring_observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_environmental_monitoring_recommendations" (
    "id" UUID NOT NULL,
    "monitoring_report_id" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "observation_id" UUID,
    "noise_result_id" UUID,
    "recommendation" TEXT NOT NULL,
    "priority" TEXT,
    "responsibility" TEXT,
    "timing_note" TEXT,
    "due_date" TIMESTAMP(3),
    "status" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "project_environmental_monitoring_recommendations_pkey" PRIMARY KEY ("id")
);

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

    CONSTRAINT "project_waste_classification_material_pathway_checklist_it_pkey" PRIMARY KEY ("id")
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

-- CreateTable
CREATE TABLE "project_spatial_features" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "feature_type" "ProjectSpatialFeatureType" NOT NULL,
    "geometry_type" "ProjectSpatialGeometryType" NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "geometry_json" JSONB NOT NULL,
    "status" TEXT,
    "source_type" "ProjectSpatialSourceType",
    "source_reference" TEXT,
    "linked_project_reference_id" TEXT,
    "linked_ai_document_id" UUID,
    "linked_deliverable_type" "ProjectSpatialLinkedDeliverableType",
    "linked_deliverable_id" TEXT,
    "properties_json" JSONB,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_spatial_features_pkey" PRIMARY KEY ("id")
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

-- CreateTable
CREATE TABLE "drafting_drawings" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "status" "DraftingDrawingStatus" NOT NULL DEFAULT 'draft',
    "current_revision" INTEGER NOT NULL DEFAULT 0,
    "model_version" INTEGER NOT NULL DEFAULT 1,
    "model_json" JSONB NOT NULL,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drafting_drawings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drafting_revisions" (
    "id" UUID NOT NULL,
    "drawing_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "revision_number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "model_json_snapshot" JSONB NOT NULL,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drafting_revisions_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "ai_documents" (
    "id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "pile_group_id" UUID,
    "kind" "AiDocumentKind" NOT NULL DEFAULT 'engineering_report',
    "document_family" "AiReportDocumentFamily" NOT NULL DEFAULT 'other',
    "report_type" "AiReportType" NOT NULL DEFAULT 'other',
    "owner_workspace" "AiReportOwnerWorkspace" NOT NULL DEFAULT 'project',
    "filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "openai_file_id" TEXT,
    "openai_vector_store_id" TEXT,
    "status" "AiDocumentStatus" NOT NULL DEFAULT 'uploaded_local',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_extraction_runs" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "model" TEXT NOT NULL,
    "status" "AiExtractionRunStatus" NOT NULL DEFAULT 'pending',
    "request_json" JSONB NOT NULL,
    "result_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_extraction_runs_pkey" PRIMARY KEY ("id")
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
CREATE UNIQUE INDEX "organisation_ai_assistant_provider_credentials_organisation_key" ON "organisation_ai_assistant_provider_credentials"("organisation_id", "provider");

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
CREATE UNIQUE INDEX "noise_vibration_standard_sources_slug_key" ON "noise_vibration_standard_sources"("slug");

-- CreateIndex
CREATE INDEX "noise_vibration_standard_sources_jurisdiction_idx" ON "noise_vibration_standard_sources"("jurisdiction");

-- CreateIndex
CREATE INDEX "noise_vibration_standard_sources_publication_status_idx" ON "noise_vibration_standard_sources"("publication_status");

-- CreateIndex
CREATE INDEX "noise_vibration_standard_sources_legal_status_idx" ON "noise_vibration_standard_sources"("legal_status");

-- CreateIndex
CREATE INDEX "noise_vibration_standard_sources_instrument_type_idx" ON "noise_vibration_standard_sources"("instrument_type");

-- CreateIndex
CREATE INDEX "noise_vibration_criterion_groups_criterion_category_idx" ON "noise_vibration_criterion_groups"("criterion_category");

-- CreateIndex
CREATE INDEX "noise_vibration_criterion_groups_metric_idx" ON "noise_vibration_criterion_groups"("metric");

-- CreateIndex
CREATE UNIQUE INDEX "noise_vibration_criterion_groups_standard_source_id_slug_key" ON "noise_vibration_criterion_groups"("standard_source_id", "slug");

-- CreateIndex
CREATE INDEX "noise_vibration_criterion_rows_receiver_type_idx" ON "noise_vibration_criterion_rows"("receiver_type");

-- CreateIndex
CREATE INDEX "noise_vibration_criterion_rows_time_period_idx" ON "noise_vibration_criterion_rows"("time_period");

-- CreateIndex
CREATE INDEX "noise_vibration_criterion_rows_basis_type_idx" ON "noise_vibration_criterion_rows"("basis_type");

-- CreateIndex
CREATE UNIQUE INDEX "noise_vibration_criterion_rows_criterion_group_id_row_key_key" ON "noise_vibration_criterion_rows"("criterion_group_id", "row_key");

-- CreateIndex
CREATE INDEX "noise_vibration_criterion_row_work_types_work_type_idx" ON "noise_vibration_criterion_row_work_types"("work_type");

-- CreateIndex
CREATE UNIQUE INDEX "project_cnvmps_project_id_key" ON "project_cnvmps"("project_id");

-- CreateIndex
CREATE INDEX "project_cnvmp_references_project_cnvmp_id_sort_order_idx" ON "project_cnvmp_references"("project_cnvmp_id", "sort_order");

-- CreateIndex
CREATE INDEX "project_cnvmp_references_ai_document_id_idx" ON "project_cnvmp_references"("ai_document_id");

-- CreateIndex
CREATE INDEX "project_cnvmp_receivers_project_cnvmp_id_sort_order_idx" ON "project_cnvmp_receivers"("project_cnvmp_id", "sort_order");

-- CreateIndex
CREATE INDEX "project_cnvmp_receivers_receiver_type_idx" ON "project_cnvmp_receivers"("receiver_type");

-- CreateIndex
CREATE INDEX "project_cnvmp_activities_project_cnvmp_id_sort_order_idx" ON "project_cnvmp_activities"("project_cnvmp_id", "sort_order");

-- CreateIndex
CREATE INDEX "project_cnvmp_activities_work_type_idx" ON "project_cnvmp_activities"("work_type");

-- CreateIndex
CREATE INDEX "project_cnvmp_selected_sources_project_cnvmp_id_sort_order_idx" ON "project_cnvmp_selected_sources"("project_cnvmp_id", "sort_order");

-- CreateIndex
CREATE INDEX "project_cnvmp_selected_sources_standard_source_id_idx" ON "project_cnvmp_selected_sources"("standard_source_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_cnvmp_selected_sources_project_cnvmp_id_standard_so_key" ON "project_cnvmp_selected_sources"("project_cnvmp_id", "standard_source_id");

-- CreateIndex
CREATE INDEX "project_cnvmp_selected_criteria_project_cnvmp_id_sort_order_idx" ON "project_cnvmp_selected_criteria"("project_cnvmp_id", "sort_order");

-- CreateIndex
CREATE INDEX "project_cnvmp_selected_criteria_criterion_row_id_idx" ON "project_cnvmp_selected_criteria"("criterion_row_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_cnvmp_selected_criteria_project_cnvmp_id_criterion__key" ON "project_cnvmp_selected_criteria"("project_cnvmp_id", "criterion_row_id", "selection_purpose");

-- CreateIndex
CREATE INDEX "project_cnvmp_mitigation_measures_project_cnvmp_id_sort_ord_idx" ON "project_cnvmp_mitigation_measures"("project_cnvmp_id", "sort_order");

-- CreateIndex
CREATE INDEX "project_cnvmp_monitoring_rows_project_cnvmp_id_sort_order_idx" ON "project_cnvmp_monitoring_rows"("project_cnvmp_id", "sort_order");

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
CREATE INDEX "project_environmental_monitoring_reports_project_id_created_idx" ON "project_environmental_monitoring_reports"("project_id", "created_at");

-- CreateIndex
CREATE INDEX "project_environmental_monitoring_reports_project_id_report__idx" ON "project_environmental_monitoring_reports"("project_id", "report_type");

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
CREATE INDEX "project_environmental_monitoring_references_monitoring_repo_idx" ON "project_environmental_monitoring_references"("monitoring_report_id", "sort_order");

-- CreateIndex
CREATE INDEX "project_environmental_monitoring_references_ai_document_id_idx" ON "project_environmental_monitoring_references"("ai_document_id");

-- CreateIndex
CREATE INDEX "project_environmental_monitoring_locations_monitoring_repor_idx" ON "project_environmental_monitoring_locations"("monitoring_report_id", "sort_order");

-- CreateIndex
CREATE INDEX "project_environmental_monitoring_locations_receiver_type_idx" ON "project_environmental_monitoring_locations"("receiver_type");

-- CreateIndex
CREATE INDEX "pem_locations_source_feature_idx" ON "project_environmental_monitoring_locations"("source_spatial_feature_id");

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
CREATE INDEX "project_environmental_noise_result_rows_selected_criterion__idx" ON "project_environmental_noise_result_rows"("selected_criterion_id");

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
CREATE INDEX "pem_observations_location_idx" ON "project_environmental_monitoring_observations"("location_id");

-- CreateIndex
CREATE INDEX "pem_observations_noise_result_idx" ON "project_environmental_monitoring_observations"("noise_result_id");

-- CreateIndex
CREATE INDEX "project_environmental_monitoring_recommendations_monitoring_idx" ON "project_environmental_monitoring_recommendations"("monitoring_report_id", "sort_order");

-- CreateIndex
CREATE INDEX "pem_recommendations_observation_idx" ON "project_environmental_monitoring_recommendations"("observation_id");

-- CreateIndex
CREATE INDEX "pem_recommendations_noise_result_idx" ON "project_environmental_monitoring_recommendations"("noise_result_id");

-- CreateIndex
CREATE INDEX "omnidots_provider_connections_organisation_id_created_at_idx" ON "omnidots_provider_connections"("organisation_id", "created_at");

-- CreateIndex
CREATE INDEX "omnidots_provider_connections_org_provider_status_idx" ON "omnidots_provider_connections"("organisation_id", "provider_key", "status");

-- CreateIndex
CREATE INDEX "omnidots_measuring_points_connection_id_created_at_idx" ON "omnidots_measuring_points"("connection_id", "created_at");

-- CreateIndex
CREATE INDEX "omnidots_measuring_points_connection_id_active_idx" ON "omnidots_measuring_points"("connection_id", "active");

-- CreateIndex
CREATE UNIQUE INDEX "omnidots_measuring_points_conn_external_id_key" ON "omnidots_measuring_points"("connection_id", "external_measuring_point_id");

-- CreateIndex
CREATE INDEX "monitoring_series_organisation_id_metric_key_idx" ON "monitoring_series"("organisation_id", "metric_key");

-- CreateIndex
CREATE INDEX "monitoring_series_measuring_point_id_created_at_idx" ON "monitoring_series"("measuring_point_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "monitoring_series_point_metric_endpoint_key" ON "monitoring_series"("measuring_point_id", "metric_key", "source_endpoint");

-- CreateIndex
CREATE INDEX "monitoring_samples_measuring_point_id_sampled_at_idx" ON "monitoring_samples"("measuring_point_id", "sampled_at");

-- CreateIndex
CREATE INDEX "monitoring_samples_series_id_sampled_at_idx" ON "monitoring_samples"("series_id", "sampled_at");

-- CreateIndex
CREATE INDEX "monitoring_samples_measuring_point_id_metric_key_sampled_at_idx" ON "monitoring_samples"("measuring_point_id", "metric_key", "sampled_at");

-- CreateIndex
CREATE UNIQUE INDEX "monitoring_samples_series_id_sampled_at_key" ON "monitoring_samples"("series_id", "sampled_at");

-- CreateIndex
CREATE INDEX "monitoring_import_jobs_organisation_id_created_at_idx" ON "monitoring_import_jobs"("organisation_id", "created_at");

-- CreateIndex
CREATE INDEX "monitoring_import_jobs_connection_id_created_at_idx" ON "monitoring_import_jobs"("connection_id", "created_at");

-- CreateIndex
CREATE INDEX "monitoring_import_jobs_connection_id_status_idx" ON "monitoring_import_jobs"("connection_id", "status");

-- CreateIndex
CREATE INDEX "pem_datasets_report_created_idx" ON "project_environmental_monitoring_datasets"("monitoring_report_id", "created_at");

-- CreateIndex
CREATE INDEX "pem_datasets_connection_idx" ON "project_environmental_monitoring_datasets"("connection_id");

-- CreateIndex
CREATE INDEX "pem_datasets_measuring_point_idx" ON "project_environmental_monitoring_datasets"("measuring_point_id");

-- CreateIndex
CREATE INDEX "pem_datasets_hash_idx" ON "project_environmental_monitoring_datasets"("dataset_hash");

-- CreateIndex
CREATE UNIQUE INDEX "pem_datasets_report_hash_key" ON "project_environmental_monitoring_datasets"("monitoring_report_id", "dataset_hash");

-- CreateIndex
CREATE INDEX "project_waste_classification_reports_project_id_created_at_idx" ON "project_waste_classification_reports"("project_id", "created_at");

-- CreateIndex
CREATE INDEX "project_waste_classification_reports_project_id_final_waste_idx" ON "project_waste_classification_reports"("project_id", "final_waste_class");

-- CreateIndex
CREATE INDEX "project_waste_classification_references_report_id_sort_orde_idx" ON "project_waste_classification_references"("report_id", "sort_order");

-- CreateIndex
CREATE INDEX "project_waste_classification_references_ai_document_id_idx" ON "project_waste_classification_references"("ai_document_id");

-- CreateIndex
CREATE INDEX "project_waste_classification_step_decisions_report_id_sort__idx" ON "project_waste_classification_step_decisions"("report_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "project_waste_classification_step_decisions_report_id_step__key" ON "project_waste_classification_step_decisions"("report_id", "step_code");

-- CreateIndex
CREATE INDEX "project_waste_classification_checklist_items_step_decision__idx" ON "project_waste_classification_checklist_items"("step_decision_id", "sort_order");

-- CreateIndex
CREATE INDEX "project_waste_classification_lab_results_report_id_sort_ord_idx" ON "project_waste_classification_lab_results"("report_id", "sort_order");

-- CreateIndex
CREATE INDEX "project_waste_classification_recommendations_report_id_sort_idx" ON "project_waste_classification_recommendations"("report_id", "sort_order");

-- CreateIndex
CREATE INDEX "project_waste_classification_material_pathways_report_id_so_idx" ON "project_waste_classification_material_pathways"("report_id", "sort_order");

-- CreateIndex
CREATE INDEX "project_waste_classification_material_pathways_linked_refer_idx" ON "project_waste_classification_material_pathways"("linked_reference_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_waste_classification_material_pathways_report_id_pa_key" ON "project_waste_classification_material_pathways"("report_id", "pathway_code");

-- CreateIndex
CREATE INDEX "project_waste_classification_material_pathway_checklist_ite_idx" ON "project_waste_classification_material_pathway_checklist_items"("material_pathway_id", "sort_order");

-- CreateIndex
CREATE INDEX "project_waste_classification_related_pathways_report_id_sor_idx" ON "project_waste_classification_related_pathways"("report_id", "sort_order");

-- CreateIndex
CREATE INDEX "project_waste_classification_related_pathways_linked_refere_idx" ON "project_waste_classification_related_pathways"("linked_reference_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_waste_classification_related_pathways_report_id_pat_key" ON "project_waste_classification_related_pathways"("report_id", "pathway_code");

-- CreateIndex
CREATE INDEX "project_spatial_features_project_id_sort_order_idx" ON "project_spatial_features"("project_id", "sort_order");

-- CreateIndex
CREATE INDEX "project_spatial_features_project_id_feature_type_idx" ON "project_spatial_features"("project_id", "feature_type");

-- CreateIndex
CREATE INDEX "project_spatial_features_project_id_geometry_type_idx" ON "project_spatial_features"("project_id", "geometry_type");

-- CreateIndex
CREATE INDEX "project_spatial_features_project_id_linked_deliverable_type_idx" ON "project_spatial_features"("project_id", "linked_deliverable_type");

-- CreateIndex
CREATE INDEX "project_spatial_features_linked_ai_document_id_idx" ON "project_spatial_features"("linked_ai_document_id");

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
CREATE INDEX "drafting_drawings_project_id_status_updated_at_idx" ON "drafting_drawings"("project_id", "status", "updated_at");

-- CreateIndex
CREATE INDEX "drafting_drawings_project_id_updated_at_idx" ON "drafting_drawings"("project_id", "updated_at");

-- CreateIndex
CREATE INDEX "drafting_revisions_project_id_created_at_idx" ON "drafting_revisions"("project_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "drafting_revisions_drawing_id_revision_number_key" ON "drafting_revisions"("drawing_id", "revision_number");

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
CREATE INDEX "ai_documents_organisation_id_idx" ON "ai_documents"("organisation_id");

-- CreateIndex
CREATE INDEX "ai_documents_project_id_created_at_idx" ON "ai_documents"("project_id", "created_at");

-- CreateIndex
CREATE INDEX "ai_documents_pile_group_id_idx" ON "ai_documents"("pile_group_id");

-- CreateIndex
CREATE INDEX "ai_extraction_runs_document_id_created_at_idx" ON "ai_extraction_runs"("document_id", "created_at");

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
ALTER TABLE "organisation_ai_assistant_provider_credentials" ADD CONSTRAINT "organisation_ai_assistant_provider_credentials_organisatio_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "noise_vibration_criterion_groups" ADD CONSTRAINT "noise_vibration_criterion_groups_standard_source_id_fkey" FOREIGN KEY ("standard_source_id") REFERENCES "noise_vibration_standard_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "noise_vibration_criterion_rows" ADD CONSTRAINT "noise_vibration_criterion_rows_criterion_group_id_fkey" FOREIGN KEY ("criterion_group_id") REFERENCES "noise_vibration_criterion_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "noise_vibration_criterion_row_work_types" ADD CONSTRAINT "noise_vibration_criterion_row_work_types_criterion_row_id_fkey" FOREIGN KEY ("criterion_row_id") REFERENCES "noise_vibration_criterion_rows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_cnvmps" ADD CONSTRAINT "project_cnvmps_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_cnvmp_references" ADD CONSTRAINT "project_cnvmp_references_project_cnvmp_id_fkey" FOREIGN KEY ("project_cnvmp_id") REFERENCES "project_cnvmps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_cnvmp_references" ADD CONSTRAINT "project_cnvmp_references_ai_document_id_fkey" FOREIGN KEY ("ai_document_id") REFERENCES "ai_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_cnvmp_receivers" ADD CONSTRAINT "project_cnvmp_receivers_project_cnvmp_id_fkey" FOREIGN KEY ("project_cnvmp_id") REFERENCES "project_cnvmps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_cnvmp_activities" ADD CONSTRAINT "project_cnvmp_activities_project_cnvmp_id_fkey" FOREIGN KEY ("project_cnvmp_id") REFERENCES "project_cnvmps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_cnvmp_selected_sources" ADD CONSTRAINT "project_cnvmp_selected_sources_project_cnvmp_id_fkey" FOREIGN KEY ("project_cnvmp_id") REFERENCES "project_cnvmps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_cnvmp_selected_sources" ADD CONSTRAINT "project_cnvmp_selected_sources_standard_source_id_fkey" FOREIGN KEY ("standard_source_id") REFERENCES "noise_vibration_standard_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_cnvmp_selected_criteria" ADD CONSTRAINT "project_cnvmp_selected_criteria_project_cnvmp_id_fkey" FOREIGN KEY ("project_cnvmp_id") REFERENCES "project_cnvmps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_cnvmp_selected_criteria" ADD CONSTRAINT "project_cnvmp_selected_criteria_criterion_row_id_fkey" FOREIGN KEY ("criterion_row_id") REFERENCES "noise_vibration_criterion_rows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_cnvmp_mitigation_measures" ADD CONSTRAINT "project_cnvmp_mitigation_measures_project_cnvmp_id_fkey" FOREIGN KEY ("project_cnvmp_id") REFERENCES "project_cnvmps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_cnvmp_monitoring_rows" ADD CONSTRAINT "project_cnvmp_monitoring_rows_project_cnvmp_id_fkey" FOREIGN KEY ("project_cnvmp_id") REFERENCES "project_cnvmps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "root_sheet_templates" ADD CONSTRAINT "root_sheet_templates_organisation_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "root_sheet_templates" ADD CONSTRAINT "root_sheet_templates_current_version_fkey" FOREIGN KEY ("current_version_id") REFERENCES "root_sheet_template_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "root_sheet_template_versions" ADD CONSTRAINT "root_sheet_template_versions_template_fkey" FOREIGN KEY ("root_sheet_template_id") REFERENCES "root_sheet_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_environmental_monitoring_reports" ADD CONSTRAINT "project_environmental_monitoring_reports_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_environmental_monitoring_report_package_issues" ADD CONSTRAINT "pem_report_package_issues_report_fkey" FOREIGN KEY ("monitoring_report_id") REFERENCES "project_environmental_monitoring_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_environmental_monitoring_annexures" ADD CONSTRAINT "project_environmental_monitoring_annexures_monitoring_repo_fkey" FOREIGN KEY ("monitoring_report_id") REFERENCES "project_environmental_monitoring_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_environmental_monitoring_annexures" ADD CONSTRAINT "pem_annexures_template_fkey" FOREIGN KEY ("root_sheet_template_id") REFERENCES "root_sheet_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_environmental_monitoring_annexures" ADD CONSTRAINT "pem_annexures_template_ver_fkey" FOREIGN KEY ("root_sheet_template_version_id") REFERENCES "root_sheet_template_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "omnidots_provider_connections" ADD CONSTRAINT "omnidots_provider_connections_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "omnidots_measuring_points" ADD CONSTRAINT "omnidots_measuring_points_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "omnidots_provider_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring_series" ADD CONSTRAINT "monitoring_series_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring_series" ADD CONSTRAINT "monitoring_series_measuring_point_id_fkey" FOREIGN KEY ("measuring_point_id") REFERENCES "omnidots_measuring_points"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring_samples" ADD CONSTRAINT "monitoring_samples_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "monitoring_series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring_samples" ADD CONSTRAINT "monitoring_samples_measuring_point_id_fkey" FOREIGN KEY ("measuring_point_id") REFERENCES "omnidots_measuring_points"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring_import_jobs" ADD CONSTRAINT "monitoring_import_jobs_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "omnidots_provider_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring_import_jobs" ADD CONSTRAINT "monitoring_import_jobs_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_environmental_monitoring_datasets" ADD CONSTRAINT "pem_datasets_report_fkey" FOREIGN KEY ("monitoring_report_id") REFERENCES "project_environmental_monitoring_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_environmental_monitoring_datasets" ADD CONSTRAINT "pem_datasets_connection_fkey" FOREIGN KEY ("connection_id") REFERENCES "omnidots_provider_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_environmental_monitoring_datasets" ADD CONSTRAINT "pem_datasets_measuring_point_fkey" FOREIGN KEY ("measuring_point_id") REFERENCES "omnidots_measuring_points"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_waste_classification_reports" ADD CONSTRAINT "project_waste_classification_reports_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_waste_classification_references" ADD CONSTRAINT "project_waste_classification_references_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "project_waste_classification_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_waste_classification_references" ADD CONSTRAINT "project_waste_classification_references_ai_document_id_fkey" FOREIGN KEY ("ai_document_id") REFERENCES "ai_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_waste_classification_step_decisions" ADD CONSTRAINT "project_waste_classification_step_decisions_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "project_waste_classification_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_waste_classification_checklist_items" ADD CONSTRAINT "project_waste_classification_checklist_items_step_decision_fkey" FOREIGN KEY ("step_decision_id") REFERENCES "project_waste_classification_step_decisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_waste_classification_lab_results" ADD CONSTRAINT "project_waste_classification_lab_results_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "project_waste_classification_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_waste_classification_recommendations" ADD CONSTRAINT "project_waste_classification_recommendations_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "project_waste_classification_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_waste_classification_material_pathways" ADD CONSTRAINT "project_waste_classification_material_pathways_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "project_waste_classification_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_waste_classification_material_pathways" ADD CONSTRAINT "project_waste_classification_material_pathways_linked_refe_fkey" FOREIGN KEY ("linked_reference_id") REFERENCES "project_waste_classification_references"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_waste_classification_material_pathway_checklist_items" ADD CONSTRAINT "project_waste_classification_material_pathway_checklist_it_fkey" FOREIGN KEY ("material_pathway_id") REFERENCES "project_waste_classification_material_pathways"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_waste_classification_related_pathways" ADD CONSTRAINT "project_waste_classification_related_pathways_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "project_waste_classification_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_waste_classification_related_pathways" ADD CONSTRAINT "project_waste_classification_related_pathways_linked_refer_fkey" FOREIGN KEY ("linked_reference_id") REFERENCES "project_waste_classification_references"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_spatial_features" ADD CONSTRAINT "project_spatial_features_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_spatial_features" ADD CONSTRAINT "project_spatial_features_linked_ai_document_id_fkey" FOREIGN KEY ("linked_ai_document_id") REFERENCES "ai_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "drafting_drawings" ADD CONSTRAINT "drafting_drawings_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drafting_revisions" ADD CONSTRAINT "drafting_revisions_drawing_id_fkey" FOREIGN KEY ("drawing_id") REFERENCES "drafting_drawings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drafting_revisions" ADD CONSTRAINT "drafting_revisions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "ai_documents" ADD CONSTRAINT "ai_documents_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_documents" ADD CONSTRAINT "ai_documents_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_documents" ADD CONSTRAINT "ai_documents_pile_group_id_fkey" FOREIGN KEY ("pile_group_id") REFERENCES "pile_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_extraction_runs" ADD CONSTRAINT "ai_extraction_runs_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "ai_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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

