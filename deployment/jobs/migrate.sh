#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# Prisma migration runner for Cloud environments
#
# Prerequisites:
#   - gcloud auth configured
#   - Cloud SQL Proxy running or Cloud Build context with SQL access
#
# Usage:
#   ./deployment/jobs/migrate.sh <environment>
#   ./deployment/jobs/migrate.sh dev
#   ./deployment/jobs/migrate.sh prod
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

ENV="${1:?Usage: migrate.sh <dev|staging|prod>}"
PROJECT_ID="engplatform-${ENV}"
REGION="australia-southeast1"
REPO="${REGION}-docker.pkg.dev/${PROJECT_ID}/engplatform"

echo "==> Running migrations for environment: ${ENV}"

# Option A: Run via Cloud Build (recommended)
gcloud builds submit \
  --project="${PROJECT_ID}" \
  --config=deployment/cloudbuild/cloudbuild-migrate.yaml \
  --substitutions="_ENVIRONMENT=${ENV}" \
  --no-source

echo "==> Migration complete for ${ENV}"
