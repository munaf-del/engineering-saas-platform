CREATE TYPE "DraftingDrawingKind" AS ENUM ('model', 'sketch');

ALTER TABLE "drafting_drawings"
  ADD COLUMN "kind" "DraftingDrawingKind" NOT NULL DEFAULT 'sketch';

WITH ranked_active_drawings AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "project_id"
      ORDER BY
        CASE WHEN lower("title") = 'project model' THEN 0 ELSE 1 END,
        "updated_at" DESC,
        "created_at" ASC
    ) AS rank
  FROM "drafting_drawings"
  WHERE "status" <> 'archived'
)
UPDATE "drafting_drawings"
SET "kind" = 'model'
WHERE "id" IN (
  SELECT "id"
  FROM ranked_active_drawings
  WHERE rank = 1
);

CREATE UNIQUE INDEX "drafting_drawings_one_active_project_model_idx"
  ON "drafting_drawings" ("project_id")
  WHERE "kind" = 'model' AND "status" <> 'archived';
