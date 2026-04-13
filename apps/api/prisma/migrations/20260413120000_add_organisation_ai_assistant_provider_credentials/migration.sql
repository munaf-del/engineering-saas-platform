CREATE TABLE "organisation_ai_assistant_provider_credentials" (
    "id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "provider" VARCHAR(32) NOT NULL,
    "encrypted_secret" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organisation_ai_assistant_provider_credentials_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "organisation_ai_assistant_provider_credentials_organisation_id_p_key"
ON "organisation_ai_assistant_provider_credentials"("organisation_id", "provider");

ALTER TABLE "organisation_ai_assistant_provider_credentials"
ADD CONSTRAINT "organisation_ai_assistant_provider_credentials_organisation_id_fkey"
FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
