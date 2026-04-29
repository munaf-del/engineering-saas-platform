ALTER TABLE "organisations"
ADD COLUMN "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb;
