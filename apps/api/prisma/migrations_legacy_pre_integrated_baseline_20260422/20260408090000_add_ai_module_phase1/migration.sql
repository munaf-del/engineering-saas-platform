CREATE TYPE "AiDocumentKind" AS ENUM ('engineering_report');

CREATE TYPE "AiDocumentStatus" AS ENUM (
  'uploaded_local',
  'indexing',
  'indexed',
  'extracting',
  'extracted',
  'index_failed',
  'extraction_failed'
);

CREATE TYPE "AiExtractionRunStatus" AS ENUM ('pending', 'completed', 'failed');

CREATE TABLE "ai_documents" (
  "id" UUID NOT NULL,
  "organisation_id" UUID NOT NULL,
  "project_id" UUID NOT NULL,
  "pile_group_id" UUID,
  "kind" "AiDocumentKind" NOT NULL DEFAULT 'engineering_report',
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

CREATE INDEX "ai_documents_organisation_id_idx" ON "ai_documents"("organisation_id");
CREATE INDEX "ai_documents_project_id_created_at_idx" ON "ai_documents"("project_id", "created_at");
CREATE INDEX "ai_documents_pile_group_id_idx" ON "ai_documents"("pile_group_id");
CREATE INDEX "ai_extraction_runs_document_id_created_at_idx" ON "ai_extraction_runs"("document_id", "created_at");

ALTER TABLE "ai_documents"
ADD CONSTRAINT "ai_documents_organisation_id_fkey"
FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_documents"
ADD CONSTRAINT "ai_documents_project_id_fkey"
FOREIGN KEY ("project_id") REFERENCES "projects"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_documents"
ADD CONSTRAINT "ai_documents_pile_group_id_fkey"
FOREIGN KEY ("pile_group_id") REFERENCES "pile_groups"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ai_extraction_runs"
ADD CONSTRAINT "ai_extraction_runs_document_id_fkey"
FOREIGN KEY ("document_id") REFERENCES "ai_documents"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
