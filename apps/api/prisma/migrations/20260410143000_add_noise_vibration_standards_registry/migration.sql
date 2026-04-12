CREATE TYPE "NoiseVibrationPublicationStatus" AS ENUM (
  'active',
  'draft_under_review',
  'superseded'
);

CREATE TYPE "NoiseVibrationLegalStatus" AS ENUM (
  'enforceable',
  'guidance_only'
);

CREATE TYPE "NoiseVibrationInstrumentType" AS ENUM (
  'statutory',
  'consent_condition',
  'guidance_only',
  'project_specific'
);

CREATE TYPE "NoiseVibrationCriterionCategory" AS ENUM (
  'working_hours',
  'airborne_noise_management',
  'ground_borne_noise',
  'vibration_human_comfort',
  'vibration_structural_damage',
  'blasting_airblast',
  'blasting_ground_vibration',
  'time_period_definition'
);

CREATE TYPE "NoiseVibrationMetric" AS ENUM (
  'laeq_15min',
  'lamax',
  'laf1_1min',
  'lin_peak',
  'ppv',
  'vdv',
  'none'
);

CREATE TYPE "NoiseVibrationValueBasis" AS ENUM (
  'absolute',
  'relative_to_rbl',
  'frequency_banded',
  'descriptive'
);

CREATE TYPE "NoiseVibrationReceiverType" AS ENUM (
  'residential',
  'heritage',
  'sensitive',
  'commercial',
  'industrial',
  'educational',
  'hospital',
  'place_of_worship',
  'active_recreation',
  'passive_recreation',
  'office_retail',
  'workshop',
  'critical_area'
);

CREATE TYPE "NoiseVibrationTimePeriod" AS ENUM (
  'day',
  'evening',
  'night',
  'standard_hours',
  'outside_standard_hours',
  'blasting_hours',
  'any'
);

CREATE TYPE "NoiseVibrationLocationBasis" AS ENUM (
  'property_boundary',
  'internal',
  'external',
  'occupied_point',
  'foundation',
  'uppermost_storey',
  'any'
);

CREATE TYPE "NoiseVibrationWorkType" AS ENUM (
  'general_construction',
  'bored_piling',
  'driven_piling',
  'rock_breaking',
  'blasting',
  'excavation',
  'dynamic_compaction'
);

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

CREATE TABLE "noise_vibration_criterion_row_work_types" (
  "criterion_row_id" UUID NOT NULL,
  "work_type" "NoiseVibrationWorkType" NOT NULL,

  CONSTRAINT "noise_vibration_criterion_row_work_types_pkey" PRIMARY KEY ("criterion_row_id", "work_type")
);

CREATE UNIQUE INDEX "noise_vibration_standard_sources_slug_key"
ON "noise_vibration_standard_sources"("slug");

CREATE INDEX "noise_vibration_standard_sources_jurisdiction_idx"
ON "noise_vibration_standard_sources"("jurisdiction");

CREATE INDEX "noise_vibration_standard_sources_publication_status_idx"
ON "noise_vibration_standard_sources"("publication_status");

CREATE INDEX "noise_vibration_standard_sources_legal_status_idx"
ON "noise_vibration_standard_sources"("legal_status");

CREATE INDEX "noise_vibration_standard_sources_instrument_type_idx"
ON "noise_vibration_standard_sources"("instrument_type");

CREATE UNIQUE INDEX "noise_vibration_criterion_groups_standard_source_id_slug_key"
ON "noise_vibration_criterion_groups"("standard_source_id", "slug");

CREATE INDEX "noise_vibration_criterion_groups_criterion_category_idx"
ON "noise_vibration_criterion_groups"("criterion_category");

CREATE INDEX "noise_vibration_criterion_groups_metric_idx"
ON "noise_vibration_criterion_groups"("metric");

CREATE UNIQUE INDEX "noise_vibration_criterion_rows_criterion_group_id_row_key_key"
ON "noise_vibration_criterion_rows"("criterion_group_id", "row_key");

CREATE INDEX "noise_vibration_criterion_rows_receiver_type_idx"
ON "noise_vibration_criterion_rows"("receiver_type");

CREATE INDEX "noise_vibration_criterion_rows_time_period_idx"
ON "noise_vibration_criterion_rows"("time_period");

CREATE INDEX "noise_vibration_criterion_rows_basis_type_idx"
ON "noise_vibration_criterion_rows"("basis_type");

CREATE INDEX "noise_vibration_criterion_row_work_types_work_type_idx"
ON "noise_vibration_criterion_row_work_types"("work_type");

ALTER TABLE "noise_vibration_criterion_groups"
ADD CONSTRAINT "noise_vibration_criterion_groups_standard_source_id_fkey"
FOREIGN KEY ("standard_source_id") REFERENCES "noise_vibration_standard_sources"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "noise_vibration_criterion_rows"
ADD CONSTRAINT "noise_vibration_criterion_rows_criterion_group_id_fkey"
FOREIGN KEY ("criterion_group_id") REFERENCES "noise_vibration_criterion_groups"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "noise_vibration_criterion_row_work_types"
ADD CONSTRAINT "noise_vibration_criterion_row_work_types_criterion_row_id_fkey"
FOREIGN KEY ("criterion_row_id") REFERENCES "noise_vibration_criterion_rows"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
