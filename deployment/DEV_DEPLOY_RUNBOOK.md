# First Dev Deployment Runbook

> Step-by-step narrative for deploying `engplatform-dev` from a blank GCP project.
> Estimated wall-clock time: **45–90 minutes** (most of it waiting on Terraform and Docker builds).

---

## Before You Start

**What you need on your machine:**

| Tool | Minimum version | Check command |
|------|----------------|---------------|
| Terraform | 1.7 | `terraform version` |
| gcloud CLI | Latest | `gcloud version` |
| Docker Desktop | Running | `docker info` |
| Node.js | 20.x | `node -v` |
| Python | 3.12 | `python3 --version` |

**What you need in GCP:**

- A project called `engplatform-dev` with billing enabled.
- Your Google account has the **Owner** role on that project (or at minimum: Editor + Secret Manager Admin + IAM Admin).

---

## Step 1: Authenticate (~2 min)

```bash
gcloud auth login
gcloud auth application-default login
gcloud config set project engplatform-dev
```

Verify: `gcloud config get project` should print `engplatform-dev`.

---

## Step 2: Create the Terraform State Bucket (~1 min)

This bucket stores Terraform's knowledge of what it has already created. It must exist *before* `terraform init`.

```bash
gsutil mb -p engplatform-dev -l australia-southeast1 gs://engplatform-terraform-state
gsutil versioning set on gs://engplatform-terraform-state
```

If the bucket already exists (from a previous attempt), this step is safe to skip.

---

## Step 3: Initialise Terraform (~1 min)

```bash
cd infra/terraform
terraform init -backend-config="prefix=terraform/state/dev"
```

You should see "Terraform has been successfully initialized!" with three providers installed (google, google-beta, random).

---

## Step 4: Plan (~2 min)

```bash
terraform plan -var-file=environments/dev.tfvars -out=dev.tfplan
```

**What to look for:**

- ~45–55 resources to create on first run.
- Zero destroys. Zero changes.
- No errors.

Read through the plan. The major resources are:
- VPC + subnet + VPC connector
- 5 service accounts + IAM bindings
- Artifact Registry repository
- 3 Secret Manager secrets (db-password, database-url, jwt-secret)
- Cloud SQL instance (PostgreSQL 16, `db-custom-1-3840`)
- 3 GCS buckets (imports, reports, documents)
- 2 Cloud Tasks queues (calc, reports)
- 3 Pub/Sub topics + 1 subscription
- 3 Cloud Run services (web, api, calc-engine)
- Monitoring alerts + dashboard + uptime check
- ~14 GCP API enablements

If anything looks wrong, **do not apply**. Fix the tfvars and re-plan.

---

## Step 5: Apply (~10–20 min)

```bash
terraform apply dev.tfplan
```

The longest resource is Cloud SQL (~8–15 min to provision). Everything else completes within a few minutes.

When it finishes, capture the outputs:

```bash
terraform output
```

Save these somewhere — you'll need the registry URL and service URLs for the next steps.

---

## Step 6: Verify Secrets (~2 min)

Terraform auto-generates a database password, builds the `DATABASE_URL`, and generates a JWT secret. Verify they exist:

```bash
gcloud secrets list --project=engplatform-dev --filter="labels.project=engplatform"
```

You should see three secrets. Verify the database URL is correct:

```bash
gcloud secrets versions access latest --secret=engplatform-dev-database-url
```

It should look like: `postgresql://engplatform-app:<password>@<private-ip>:5432/engplatform`

If the password or IP is wrong, add a corrected version:

```bash
echo -n "postgresql://engplatform-app:<correct-password>@<correct-ip>:5432/engplatform" | \
  gcloud secrets versions add engplatform-dev-database-url --data-file=-
```

---

## Step 7: Build and Push Docker Images (~10–15 min)

From the repository root:

```bash
REPO="australia-southeast1-docker.pkg.dev/engplatform-dev/engplatform"

# Authenticate Docker
gcloud auth configure-docker australia-southeast1-docker.pkg.dev

# Build (each takes 2–5 min depending on cache)
docker build -f apps/api/Dockerfile -t ${REPO}/api:initial .
docker build -f apps/web/Dockerfile -t ${REPO}/web:initial .
docker build -f apps/calc-engine/Dockerfile -t ${REPO}/calc-engine:initial apps/calc-engine

# Push
docker push ${REPO}/api:initial
docker push ${REPO}/web:initial
docker push ${REPO}/calc-engine:initial
```

Verify the images are in the registry:

```bash
gcloud artifacts docker images list \
  australia-southeast1-docker.pkg.dev/engplatform-dev/engplatform \
  --format="table(package,version,createTime)"
```

---

## Step 8: Deploy Images to Cloud Run (~3 min)

Re-run Terraform to update Cloud Run to the real image tags:

```bash
cd infra/terraform
terraform apply -var-file=environments/dev.tfvars \
  -var="api_image_tag=initial" \
  -var="web_image_tag=initial" \
  -var="calc_engine_image_tag=initial"
```

Review the plan (should only modify the 3 Cloud Run services) and approve.

---

## Step 9: Run Migrations (~3 min)

```bash
cd ../..  # back to repo root
./deployment/jobs/migrate.sh dev
```

This triggers a Cloud Build job that runs `prisma migrate deploy` against the Cloud SQL instance.

Watch progress:

```bash
gcloud builds list --project=engplatform-dev --limit=1
```

---

## Step 10: Seed the Database (~2 min)

```bash
./deployment/jobs/seed.sh dev
```

This creates the demo organisation, admin user, sample project, and standard material/standards data.

---

## Step 11: Smoke Tests (~3 min)

```bash
cd infra/terraform
API_URL=$(terraform output -raw api_url)
WEB_URL=$(terraform output -raw web_url)
CALC_URL=$(terraform output -raw calc_engine_url)

# API health
echo "--- API Health ---"
curl -sf "${API_URL}/api/v1/health" | jq .

# Web loads
echo "--- Web Status ---"
curl -sf -o /dev/null -w "HTTP %{http_code}\n" "${WEB_URL}"

# Calc engine health
echo "--- Calc Engine Health ---"
curl -sf "${CALC_URL}/health" | jq .
```

**Expected results:**
- API: `{ "status": "ok" }` (or similar)
- Web: `HTTP 200`
- Calc Engine: `{ "status": "ok" }`

If any service fails, check logs:

```bash
gcloud logging read \
  'resource.type="cloud_run_revision" AND severity>=ERROR' \
  --project=engplatform-dev --limit=20 --freshness=15m \
  --format="table(timestamp,resource.labels.service_name,jsonPayload.message)"
```

---

## Step 12: Verify Monitoring (~1 min)

- Open GCP Console → Monitoring → Dashboards → "EngPlatform dev"
- Confirm all 6 dashboard tiles are rendering (may show "no data" initially — that's fine)
- Open Monitoring → Alerting → Policies → verify 7 policies exist
- No alerts should be firing

---

## What's Next

1. **CI/CD**: Set up GitHub Actions Workload Identity Federation (see `deployment/README.md` § 5)
2. **Custom domain**: When ready, set `enable_load_balancer = true` in `dev.tfvars` and re-apply
3. **Notification channels**: Create an email/Slack channel in Cloud Monitoring, paste the ID into `alert_notification_channels` in `dev.tfvars`

---

## If Something Goes Wrong

See [Dev Rollback Checklist](./DEV_ROLLBACK_CHECKLIST.md) for recovery steps at each phase.
