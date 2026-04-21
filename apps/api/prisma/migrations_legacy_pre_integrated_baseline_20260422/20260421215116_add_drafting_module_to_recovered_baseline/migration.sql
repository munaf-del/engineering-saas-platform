-- CreateEnum
CREATE TYPE "DraftingDrawingStatus" AS ENUM ('draft', 'issued', 'archived');

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

-- CreateIndex
CREATE INDEX "drafting_drawings_project_id_status_updated_at_idx" ON "drafting_drawings"("project_id", "status", "updated_at");

-- CreateIndex
CREATE INDEX "drafting_drawings_project_id_updated_at_idx" ON "drafting_drawings"("project_id", "updated_at");

-- CreateIndex
CREATE INDEX "drafting_revisions_project_id_created_at_idx" ON "drafting_revisions"("project_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "drafting_revisions_drawing_id_revision_number_key" ON "drafting_revisions"("drawing_id", "revision_number");

-- AddForeignKey
ALTER TABLE "drafting_drawings" ADD CONSTRAINT "drafting_drawings_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drafting_revisions" ADD CONSTRAINT "drafting_revisions_drawing_id_fkey" FOREIGN KEY ("drawing_id") REFERENCES "drafting_drawings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drafting_revisions" ADD CONSTRAINT "drafting_revisions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

