#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# Database seed runner (dev/staging only)
#
# Usage:
#   ./deployment/jobs/seed.sh <environment>
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

ENV="${1:?Usage: seed.sh <dev|staging|prod>}"

if [ "${ENV}" = "prod" ]; then
  echo "ERROR: Seeding production is not allowed by default."
  echo "If you really need to seed prod, edit this script."
  exit 1
fi

PROJECT_ID="engplatform-${ENV}"

echo "==> Seeding database for environment: ${ENV}"

gcloud builds submit \
  --project="${PROJECT_ID}" \
  --config=deployment/cloudbuild/cloudbuild-migrate.yaml \
  --substitutions="_ENVIRONMENT=${ENV}" \
  --no-source

echo "==> Seed complete for ${ENV}"
