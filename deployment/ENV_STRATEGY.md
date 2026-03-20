# Environment Variables Strategy

## Overview

All services follow a consistent pattern for environment configuration:

| Layer | Source | Who sets it |
|-------|--------|-------------|
| **Infrastructure constants** | Terraform → Cloud Run env vars | Automatic |
| **Secrets** | Secret Manager → Cloud Run secret refs | Terraform + manual rotate |
| **Build-time** | Cloud Build substitutions | CI/CD pipeline |
| **Runtime toggles** | Cloud Run env vars (Terraform) | Terraform tfvars |

## API (NestJS) — `apps/api`

| Variable | Source | Description |
|----------|--------|-------------|
| `NODE_ENV` | Plain env | Always `production` in deployed envs |
| `PORT` | Plain env | `4000` |
| `ENVIRONMENT` | Plain env | `dev`, `staging`, or `prod` |
| `DATABASE_URL` | Secret Manager | PostgreSQL connection string (via Cloud SQL Proxy socket) |
| `JWT_SECRET` | Secret Manager | Token signing key |
| `CALC_ENGINE_URL` | Plain env | Internal Cloud Run URL for calc-engine |
| `LOG_FORMAT` | Plain env | `json` for deployed, `pretty` for local |
| `GCS_IMPORTS_BUCKET` | Plain env | Bucket name for file imports |
| `GCS_REPORTS_BUCKET` | Plain env | Bucket name for generated reports |
| `GCS_DOCUMENTS_BUCKET` | Plain env | Bucket name for project documents |
| `CLOUD_TASKS_QUEUE_CALC` | Plain env | Queue name for calculation tasks |
| `CLOUD_TASKS_QUEUE_REPORTS` | Plain env | Queue name for report generation tasks |
| `CLOUD_TASKS_LOCATION` | Plain env | GCP region for Cloud Tasks |
| `GCP_PROJECT_ID` | Plain env | GCP project ID |

### DATABASE_URL format (Cloud SQL)

When running on Cloud Run with the Cloud SQL Auth Proxy sidecar:
```
postgresql://engplatform-app:<password>@localhost/engplatform?host=/cloudsql/<connection-name>
```

For direct private IP access:
```
postgresql://engplatform-app:<password>@<private-ip>:5432/engplatform
```

## Web (Next.js) — `apps/web`

| Variable | Source | Description |
|----------|--------|-------------|
| `NODE_ENV` | Plain env | Always `production` |
| `HOSTNAME` | Plain env | `0.0.0.0` for Cloud Run |
| `NEXT_PUBLIC_API_URL` | Build-time env | Public URL of the API (baked into client JS) |

**Important:** `NEXT_PUBLIC_*` vars are embedded at build time. To change them, a new image build is required.

## Calc Engine (FastAPI) — `apps/calc-engine`

| Variable | Source | Description |
|----------|--------|-------------|
| `CALC_ENGINE_ENVIRONMENT` | Plain env | `dev`, `staging`, or `prod` |
| `CALC_ENGINE_LOG_LEVEL` | Plain env | `DEBUG`, `INFO`, or `WARNING` |
| `CALC_ENGINE_LOG_FORMAT` | Plain env | `json` for deployed, `pretty` for local |

All calc-engine env vars use the `CALC_ENGINE_` prefix (via pydantic-settings).

## Secret Rotation

1. Generate new secret value
2. Add new version in Secret Manager:
   ```bash
   echo -n "new-value" | gcloud secrets versions add engplatform-<env>-jwt-secret --data-file=-
   ```
3. Redeploy the service (Cloud Run pulls `latest` version on cold start):
   ```bash
   gcloud run services update engplatform-api --region=australia-southeast1
   ```

## Local Development

Use `.env` files (gitignored) and `docker-compose.yml`:

```bash
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env with local values
docker compose up -d
```
