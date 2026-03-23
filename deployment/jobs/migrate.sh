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
PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}"
if [ -z "${PROJECT_ID}" ]; then
  echo "ERROR: PROJECT_ID not set and no gcloud project configured." >&2
  exit 1
fi
REGION="australia-southeast1"

echo "==> Running migrations for environment: ${ENV} (project: ${PROJECT_ID})"

gcloud builds submit \
  --project="${PROJECT_ID}" \
  --config=deployment/cloudbuild/cloudbuild-migrate.yaml \
  --substitutions="_ENVIRONMENT=${ENV}" \
  --no-source

echo "==> Migration complete for ${ENV}"
