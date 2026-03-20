# Dev Deployment Checklist

> Single-page checklist for the **first `engplatform-dev` deployment**.
> Print or copy this file and tick boxes as you go.

---

## Phase 0 — Local Prerequisites

- [ ] **Terraform** >= 1.7 installed (`terraform version`)
- [ ] **gcloud CLI** installed and up-to-date (`gcloud version`)
- [ ] **Docker** running locally (`docker info`)
- [ ] **Node.js** 20.x and **pnpm** (or npm) available (`node -v`)
- [ ] **Python** 3.12+ available for calc-engine builds (`python3 --version`)
- [ ] Repository cloned and on the latest `main` branch
- [ ] You have Owner or Editor IAM role on the `engplatform-dev` GCP project

## Phase 1 — GCP Project Bootstrap

> These are **one-time** manual steps before Terraform runs.

- [ ] GCP project `engplatform-dev` exists (create via Console or `gcloud projects create engplatform-dev`)
- [ ] Billing account linked to the project
- [ ] Authenticate locally:
  ```bash
  gcloud auth login
  gcloud auth application-default login
  gcloud config set project engplatform-dev
  ```
- [ ] Create the Terraform state bucket:
  ```bash
  gsutil mb -p engplatform-dev -l australia-southeast1 gs://engplatform-terraform-state
  gsutil versioning set on gs://engplatform-terraform-state
  ```

## Phase 2 — Terraform Validation (Dry-Run)

> Run these **before** applying anything.

- [ ] `cd infra/terraform`
- [ ] Format check:
  ```bash
  terraform fmt -check -recursive
  ```
- [ ] Initialise with backend:
  ```bash
  terraform init -backend-config="prefix=terraform/state/dev"
  ```
- [ ] Validate:
  ```bash
  terraform validate
  ```
- [ ] Plan (review only — do **not** apply yet):
  ```bash
  terraform plan -var-file=environments/dev.tfvars -out=dev.tfplan
  ```
- [ ] Review the plan output. Expected resources (first run): ~45–55 creates, 0 changes, 0 destroys.
- [ ] Confirm no unexpected deletions or modifications.

## Phase 3 — Terraform Apply

- [ ] Apply the saved plan:
  ```bash
  terraform apply dev.tfplan
  ```
- [ ] Verify outputs:
  ```bash
  terraform output
  ```
- [ ] Note down:
  - `artifact_registry` URL → needed for docker push
  - `db_connection_name` → needed for Cloud SQL Proxy
  - `api_url`, `web_url`, `calc_engine_url` → will be Cloud Run URLs (initially unhealthy until images are pushed)

## Phase 4 — Secret Manager Setup

> Terraform creates secrets with auto-generated passwords. Verify and optionally rotate.

- [ ] Confirm secrets exist:
  ```bash
  gcloud secrets list --project=engplatform-dev --filter="labels.project=engplatform"
  ```
  Expected: `engplatform-dev-db-password`, `engplatform-dev-database-url`, `engplatform-dev-jwt-secret`
- [ ] Verify `database-url` secret contains correct connection string:
  ```bash
  gcloud secrets versions access latest --secret=engplatform-dev-database-url
  ```
  Expected format: `postgresql://engplatform-app:<password>@<private-ip>:5432/engplatform`
- [ ] (Optional) Rotate JWT secret with a strong random value:
  ```bash
  openssl rand -hex 32 | gcloud secrets versions add engplatform-dev-jwt-secret --data-file=-
  ```
- [ ] **NEVER** commit secret values to the repository.

## Phase 5 — Artifact Registry & Image Push

- [ ] Authenticate Docker to Artifact Registry:
  ```bash
  gcloud auth configure-docker australia-southeast1-docker.pkg.dev
  ```
- [ ] Build images from the repo root:
  ```bash
  REPO="australia-southeast1-docker.pkg.dev/engplatform-dev/engplatform"

  docker build -f apps/api/Dockerfile -t ${REPO}/api:initial .
  docker build -f apps/web/Dockerfile -t ${REPO}/web:initial .
  docker build -f apps/calc-engine/Dockerfile -t ${REPO}/calc-engine:initial apps/calc-engine
  ```
- [ ] Push images:
  ```bash
  docker push ${REPO}/api:initial
  docker push ${REPO}/web:initial
  docker push ${REPO}/calc-engine:initial
  ```
- [ ] Verify images in registry:
  ```bash
  gcloud artifacts docker images list \
    australia-southeast1-docker.pkg.dev/engplatform-dev/engplatform
  ```

## Phase 6 — Redeploy Cloud Run with Real Images

> Cloud Run was created by Terraform with `latest` tag placeholders. Now point to real images.

- [ ] Update Cloud Run services (or re-run Terraform with image tags):
  ```bash
  terraform apply -var-file=environments/dev.tfvars \
    -var="api_image_tag=initial" \
    -var="web_image_tag=initial" \
    -var="calc_engine_image_tag=initial"
  ```

## Phase 7 — Database Migration & Seed

- [ ] Run Prisma migrations via Cloud Build:
  ```bash
  ./deployment/jobs/migrate.sh dev
  ```
- [ ] Seed dev database:
  ```bash
  ./deployment/jobs/seed.sh dev
  ```
- [ ] Verify migration status (connect via Cloud SQL Proxy or Cloud Shell):
  ```bash
  gcloud sql connect engplatform-db-dev --user=engplatform-app --database=engplatform
  # Then: SELECT * FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 5;
  ```

## Phase 8 — Smoke Tests

- [ ] API health check:
  ```bash
  API_URL=$(terraform output -raw api_url)
  curl -sf "${API_URL}/api/v1/health" | jq .
  ```
  Expected: `{ "status": "ok", ... }`
- [ ] Web loads:
  ```bash
  WEB_URL=$(terraform output -raw web_url)
  curl -sf -o /dev/null -w "%{http_code}" "${WEB_URL}"
  ```
  Expected: `200`
- [ ] Calc engine health:
  ```bash
  CALC_URL=$(terraform output -raw calc_engine_url)
  curl -sf "${CALC_URL}/health" | jq .
  ```
  Expected: `{ "status": "ok" }`
- [ ] Cloud Run services report "Serving":
  ```bash
  for svc in engplatform-api engplatform-web engplatform-calc-engine; do
    echo "=== ${svc} ==="
    gcloud run services describe ${svc} --region=australia-southeast1 \
      --format="value(status.url)"
  done
  ```
- [ ] Cloud Monitoring dashboard visible in Console → Monitoring → Dashboards → "EngPlatform dev"
- [ ] No alerts firing in Console → Monitoring → Alerting

## Phase 9 — CI/CD Wiring (Optional for First Deploy)

- [ ] Configure GitHub Actions secrets (see `deployment/README.md` § 5)
- [ ] Set up Workload Identity Federation
- [ ] Push to `main` and verify the CI pipeline builds/tests/deploys

---

## Quick Reference: Key Outputs

| Output | Command |
|--------|---------|
| API URL | `terraform output api_url` |
| Web URL | `terraform output web_url` |
| Calc Engine URL | `terraform output calc_engine_url` |
| Registry | `terraform output artifact_registry` |
| DB connection | `terraform output db_connection_name` |
| DB instance | `terraform output db_instance_name` |
| LB IP (if enabled) | `terraform output lb_ip_address` |

## Related Documents

- [Deployment Guide](./README.md) — full architecture and setup
- [First Dev Deployment Runbook](./DEV_DEPLOY_RUNBOOK.md) — step-by-step narrative
- [Rollback Checklist](./DEV_ROLLBACK_CHECKLIST.md) — if anything goes wrong
- [Environment Variables](./ENV_STRATEGY.md) — what each service needs
- [Logging & Observability](./LOGGING.md) — queries and alerting
- [Rollback Runbook](./RUNBOOK.md) — production rollback procedures
