CREATE TABLE "project_drafting_transmittals" (
  "id" UUID NOT NULL,
  "project_id" UUID NOT NULL,
  "organisation_id" UUID NOT NULL,
  "transmittal_number" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "payload_json" JSONB NOT NULL,
  "created_by_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "project_drafting_transmittals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "project_drafting_transmittals_project_id_transmittal_number_key"
  ON "project_drafting_transmittals"("project_id", "transmittal_number");

CREATE INDEX "project_drafting_transmittals_organisation_id_project_id_updated_at_idx"
  ON "project_drafting_transmittals"("organisation_id", "project_id", "updated_at");

CREATE INDEX "project_drafting_transmittals_project_id_status_updated_at_idx"
  ON "project_drafting_transmittals"("project_id", "status", "updated_at");

ALTER TABLE "project_drafting_transmittals"
  ADD CONSTRAINT "project_drafting_transmittals_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "project_drafting_transmittals"
  ADD CONSTRAINT "project_drafting_transmittals_organisation_id_fkey"
  FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
