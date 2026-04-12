CREATE TYPE "ProjectSpatialFeatureType" AS ENUM (
  'site_boundary',
  'parcel_boundary',
  'borehole',
  'monitoring_well',
  'vibration_monitor',
  'noise_monitor',
  'receiver',
  'structure',
  'excavation_area',
  'work_zone',
  'reference_point',
  'other'
);

CREATE TYPE "ProjectSpatialGeometryType" AS ENUM ('point', 'line_string', 'polygon');

CREATE TYPE "ProjectSpatialSourceType" AS ENUM (
  'manual',
  'imported',
  'report_derived',
  'reference_derived',
  'other'
);

CREATE TYPE "ProjectSpatialLinkedDeliverableType" AS ENUM (
  'cnvmp',
  'noise_monitoring_report',
  'vibration_monitoring_report',
  'geotechnical',
  'foundations',
  'other'
);

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

CREATE INDEX "project_spatial_features_project_id_sort_order_idx"
ON "project_spatial_features"("project_id", "sort_order");

CREATE INDEX "project_spatial_features_project_id_feature_type_idx"
ON "project_spatial_features"("project_id", "feature_type");

CREATE INDEX "project_spatial_features_project_id_geometry_type_idx"
ON "project_spatial_features"("project_id", "geometry_type");

CREATE INDEX "project_spatial_features_project_id_linked_deliverable_type_idx"
ON "project_spatial_features"("project_id", "linked_deliverable_type");

CREATE INDEX "project_spatial_features_linked_ai_document_id_idx"
ON "project_spatial_features"("linked_ai_document_id");

ALTER TABLE "project_spatial_features"
ADD CONSTRAINT "project_spatial_features_project_id_fkey"
FOREIGN KEY ("project_id") REFERENCES "projects"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "project_spatial_features"
ADD CONSTRAINT "project_spatial_features_linked_ai_document_id_fkey"
FOREIGN KEY ("linked_ai_document_id") REFERENCES "ai_documents"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
