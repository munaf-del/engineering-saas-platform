# Deployment Guide

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Google Cloud Platform                       │
│                                                               │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐   │
│  │  Cloud Run   │  │  Cloud Run   │  │    Cloud Run      │   │
│  │  (Web)       │  │  (API)       │  │  (Calc Engine)    │   │
│  │  Next.js     │  │  NestJS      │  │  FastAPI          │   │
│  │  :3000       │  │  :4000       │  │  :8000            │   │
│  └──────┬───────┘  └──────┬───────┘  └────────┬──────────┘   │
│         │                 │                    │              │
│         │          ┌──────┴──────┐             │              │
│         │          │  Cloud SQL  │             │              │
│         │          │ PostgreSQL  │             │              │
│         │          │   (private) │             │              │
│         │          └─────────────┘             │              │
│         │                 │                    │              │
│    ┌────┴─────────────────┴────────────────────┴────┐        │
│    │              VPC (private network)              │        │
│    └────────────────────────────────────────────────┘        │
│                                                               │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌──────────────┐   │
│  │  Secret  │ │  Cloud   │ │  Cloud    │ │  Artifact    │   │
│  │  Manager │ │  Storage │ │  Tasks    │ │  Registry    │   │
│  └──────────┘ └──────────┘ └───────────┘ └──────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

## Environments

| Environment | Project ID            | Region                 | Purpose                       |
| ----------- | --------------------- | ---------------------- | ----------------------------- |
| dev         | `engine-dev-487802`   | `australia-southeast1` | Development / feature testing |
| staging     | `engplatform-staging` | `australia-southeast2` | Pre-production validation     |
| prod        | `engplatform-prod`    | `australia-southeast1` | Production                    |

## Prerequisites

1. **GCP projects** created for each environment
2. **Terraform state bucket** created:
   ```bash
   gsutil mb -l australia-southeast1 gs://engplatform-terraform-state
   gsutil versioning set on gs://engplatform-terraform-state
   ```
3. **gcloud CLI** authenticated with appropriate permissions
4. **Terraform** >= 1.7 installed
5. **Workload Identity Federation** configured for GitHub Actions (see below)

## First-Time Setup

### 1. Initialise Terraform

```bash
cd infra/terraform

# For dev environment
terraform init -backend-config="prefix=terraform/state/dev"
terraform plan -var-file=environments/dev.tfvars
terraform apply -var-file=environments/dev.tfvars
```

### 2. Set real secret values

After Terraform creates the Secret Manager secrets with placeholder values:

```bash
# Generate and set the DATABASE_URL
# Format: postgresql://engplatform-app:<password>@<private-ip>:5432/engplatform
DB_PASSWORD=$(terraform output -raw db_password 2>/dev/null || echo "check-secret-manager")
DB_IP=$(terraform output -raw db_private_ip 2>/dev/null || echo "check-cloud-sql")

echo -n "postgresql://engplatform-app:${DB_PASSWORD}@${DB_IP}:5432/engplatform" | \
  gcloud secrets versions add engine-dev-487802-database-url --data-file=-

# JWT secret is auto-generated; rotate if needed:
openssl rand -hex 32 | gcloud secrets versions add engine-dev-487802-jwt-secret --data-file=-
```

### 3. Build and push initial images

```bash
REGION=australia-southeast1
PROJECT_ID=engine-dev-487802
REPO="${REGION}-docker.pkg.dev/${PROJECT_ID}/engplatform"

# Authenticate Docker
gcloud auth configure-docker ${REGION}-docker.pkg.dev

# Build and push
docker build -f apps/api/Dockerfile -t ${REPO}/api:initial .
docker build -f apps/web/Dockerfile -t ${REPO}/web:initial .
docker build -f apps/calc-engine/Dockerfile -t ${REPO}/calc-engine:initial apps/calc-engine

docker push ${REPO}/api:initial
docker push ${REPO}/web:initial
docker push ${REPO}/calc-engine:initial
```

### 4. Run initial migrations

```bash
./deployment/jobs/migrate.sh dev
```

### 5. Set up GitHub Actions

Required repository secrets:

| Secret                           | Description                                                                         |
| -------------------------------- | ----------------------------------------------------------------------------------- |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | `projects/<num>/locations/global/workloadIdentityPools/<pool>/providers/<provider>` |
| `GCP_SERVICE_ACCOUNT`            | `github-actions@engine-dev-487802.iam.gserviceaccount.com`                          |
| `GCP_PROJECT_ID`                 | `engine-dev-487802` (or per-environment)                                            |

#### Workload Identity Federation setup

```bash
# Create pool
gcloud iam workload-identity-pools create "github-pool" \
  --location="global" \
  --display-name="GitHub Actions Pool"

# Create provider
gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --display-name="GitHub OIDC" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --issuer-uri="https://token.actions.githubusercontent.com"

# Grant permissions to the GitHub repo
gcloud iam service-accounts add-iam-policy-binding \
  github-actions@${PROJECT_ID}.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/<PROJECT_NUM>/locations/global/workloadIdentityPools/github-pool/attribute.repository/<GITHUB_ORG>/<REPO>"
```

## Deployment Pipeline

### Automatic (CI/CD)

```
Push to main → CI tests pass → Build images → Run migrations → Deploy to dev
```

### Manual promotion

```bash
# Deploy to staging
gh workflow run deploy.yml -f environment=staging

# Deploy to production (requires approval in GitHub Environments)
gh workflow run deploy.yml -f environment=prod
```

### Cloud Deploy pipeline (alternative)

```bash
# Apply the pipeline definition
gcloud deploy apply --file=deployment/clouddeploy/clouddeploy.yaml \
  --region=australia-southeast1

# Create a release
gcloud deploy releases create release-$(date +%Y%m%d-%H%M) \
  --delivery-pipeline=engplatform-pipeline \
  --region=australia-southeast1 \
  --skaffold-file=deployment/clouddeploy/skaffold.yaml

# Promote to next stage
gcloud deploy releases promote --release=<release-name> \
  --delivery-pipeline=engplatform-pipeline \
  --region=australia-southeast1
```

## Terraform Module Structure

```
infra/terraform/
├── main.tf                      # Root orchestration
├── variables.tf                 # All input variables
├── outputs.tf                   # All outputs
├── versions.tf                  # Provider version constraints
├── backend.tf                   # GCS remote state
├── locals.tf                    # Shared naming and labels
├── terraform.tfvars.example     # Example variable values
├── environments/
│   ├── dev.tfvars               # Dev overrides
│   ├── staging.tfvars           # Staging overrides
│   └── prod.tfvars              # Production overrides
└── modules/
    ├── networking/              # VPC, subnet, VPC connector, private services
    ├── iam/                     # Service accounts and IAM bindings
    ├── artifact-registry/       # Docker image repository
    ├── secret-manager/          # Secrets with IAM
    ├── cloud-sql/               # PostgreSQL with backups
    ├── cloud-storage/           # Import, report, document buckets
    ├── cloud-run/               # Web, API, calc-engine services
    ├── cloud-tasks/             # Calculation and report queues
    ├── pubsub/                  # Domain event topics (optional)
    ├── monitoring/              # Alerts, dashboard, uptime checks
    └── load-balancer/           # HTTPS LB + Cloud Armor (optional)
```

## Custom Domain Setup

1. Set `enable_load_balancer = true` and `domain_name = "app.engplatform.com.au"` in tfvars
2. Run `terraform apply`
3. Get the load balancer IP: `terraform output lb_ip_address`
4. Create DNS records:
   - `A` record: `app.engplatform.com.au` → `<lb-ip>`
   - `AAAA` record (if IPv6): same target
5. Wait for SSL certificate provisioning (up to 24 hours)
6. Verify: `curl -I https://app.engplatform.com.au`

## Backup & Restore

### Automated backups

Cloud SQL is configured with:

- Daily automated backups at 03:00 AEST
- Point-in-time recovery (PITR) enabled
- Retention: 7 days (dev) / 30 days (prod)

### Manual backup

```bash
gcloud sql backups create --instance=engplatform-db-prod
```

### Restore from backup

```bash
# List backups
gcloud sql backups list --instance=engplatform-db-prod

# Restore (creates downtime!)
gcloud sql backups restore <BACKUP_ID> \
  --restore-instance=engplatform-db-prod
```

### Point-in-time restore

```bash
gcloud sql instances clone engplatform-db-prod engplatform-db-prod-restore \
  --point-in-time="2026-03-20T10:00:00Z"
```

## Cost Estimates (Early Stage)

| Resource                     | Dev         | Staging     | Prod          |
| ---------------------------- | ----------- | ----------- | ------------- |
| Cloud Run (3 services)       | ~$15/mo     | ~$30/mo     | ~$80/mo       |
| Cloud SQL (db-custom-1-3840) | ~$40/mo     | ~$40/mo     | ~$120/mo (HA) |
| Cloud Storage                | < $1/mo     | < $1/mo     | ~$5/mo        |
| Secret Manager               | < $1/mo     | < $1/mo     | < $1/mo       |
| Cloud Tasks                  | < $1/mo     | < $1/mo     | < $5/mo       |
| Networking                   | ~$5/mo      | ~$5/mo      | ~$10/mo       |
| **Total**                    | **~$65/mo** | **~$80/mo** | **~$220/mo**  |

Scale-to-zero on dev keeps costs minimal. Production estimates assume moderate traffic.

## Related Docs

- [Environment Variables Strategy](./ENV_STRATEGY.md)
- [Logging & Observability](./LOGGING.md)
- [Rollback Runbook](./RUNBOOK.md)
