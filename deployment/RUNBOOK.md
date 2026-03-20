# Rollback Runbook

## Quick Reference

| Scenario | Action | Time to recover |
|----------|--------|----------------|
| Bad code deploy | Roll back Cloud Run revision | < 2 min |
| Bad migration | Restore DB from backup + redeploy | 10–30 min |
| Secret compromised | Rotate in Secret Manager + redeploy | < 5 min |
| Infrastructure drift | Re-run Terraform apply | 5–15 min |
| Full outage | Follow disaster recovery procedure | 30–60 min |

---

## 1. Roll Back a Cloud Run Deployment

Cloud Run keeps previous revisions. Rolling back is instant.

### Via Console

1. Go to Cloud Run → select service → **Revisions** tab
2. Click the last known-good revision
3. Click **Manage Traffic** → route 100% to that revision

### Via CLI

```bash
# List revisions
gcloud run revisions list --service=engplatform-api --region=australia-southeast1

# Route traffic to a specific revision
gcloud run services update-traffic engplatform-api \
  --to-revisions=engplatform-api-00042-abc=100 \
  --region=australia-southeast1

# Or roll back to the previous revision
gcloud run services update-traffic engplatform-api \
  --to-revisions=LATEST=0 \
  --region=australia-southeast1
```

Repeat for `engplatform-web` and `engplatform-calc-engine` if needed.

---

## 2. Roll Back a Database Migration

### If the migration is backwards-compatible (added columns only)

1. Roll back Cloud Run to the previous revision (see above)
2. The old code works with the new schema — no DB rollback needed
3. Plan a fix-forward migration

### If the migration is destructive

1. **Stop traffic** to the API:
   ```bash
   gcloud run services update-traffic engplatform-api \
     --to-revisions=LATEST=0 \
     --region=australia-southeast1
   ```

2. **Restore the database** from the most recent backup:
   ```bash
   # List available backups
   gcloud sql backups list --instance=engplatform-db-prod

   # Restore (this causes downtime)
   gcloud sql backups restore <BACKUP_ID> \
     --restore-instance=engplatform-db-prod \
     --backup-instance=engplatform-db-prod
   ```

   Or use point-in-time recovery:
   ```bash
   gcloud sql instances clone engplatform-db-prod engplatform-db-restore \
     --point-in-time="2026-03-20T09:55:00Z"
   ```

3. **Redeploy** the previous API revision:
   ```bash
   gcloud run services update-traffic engplatform-api \
     --to-revisions=engplatform-api-<previous>=100 \
     --region=australia-southeast1
   ```

4. **Verify** the API health endpoint:
   ```bash
   curl https://<api-url>/api/v1/health
   ```

---

## 3. Rotate a Compromised Secret

```bash
# Generate new JWT secret
openssl rand -hex 32 | \
  gcloud secrets versions add engplatform-prod-jwt-secret --data-file=-

# Force redeploy to pick up new secret
gcloud run services update engplatform-api \
  --region=australia-southeast1 \
  --update-env-vars="FORCE_REDEPLOY=$(date +%s)"

# Disable the compromised version
gcloud secrets versions disable <VERSION_NUMBER> \
  --secret=engplatform-prod-jwt-secret
```

---

## 4. Investigate an Outage

### Step 1: Check service status

```bash
for svc in engplatform-api engplatform-web engplatform-calc-engine; do
  echo "=== ${svc} ==="
  gcloud run services describe ${svc} \
    --region=australia-southeast1 \
    --format="value(status.conditions)"
done
```

### Step 2: Check recent logs

```bash
# API errors in last 30 minutes
gcloud logging read \
  'resource.type="cloud_run_revision" AND resource.labels.service_name="engplatform-api" AND severity>=ERROR' \
  --limit=50 \
  --format="table(timestamp,jsonPayload.message)" \
  --freshness=30m

# Calc engine errors
gcloud logging read \
  'resource.type="cloud_run_revision" AND resource.labels.service_name="engplatform-calc-engine" AND severity>=ERROR' \
  --limit=50 \
  --freshness=30m
```

### Step 3: Check database

```bash
# Connection count
gcloud sql instances describe engplatform-db-prod \
  --format="value(settings.databaseFlags)"

# Recent slow queries (via Cloud SQL Insights in Console)
```

### Step 4: Check Cloud Tasks

```bash
gcloud tasks queues describe engplatform-calc-prod \
  --location=australia-southeast1
```

---

## 5. Terraform Recovery

### State is corrupted or lost

```bash
# Import existing resources
terraform import module.cloud_sql.google_sql_database_instance.main engplatform-db-prod

# Re-run plan to verify
terraform plan -var-file=environments/prod.tfvars
```

### Drift detected

```bash
# Refresh state
terraform refresh -var-file=environments/prod.tfvars

# Review and apply
terraform plan -var-file=environments/prod.tfvars
terraform apply -var-file=environments/prod.tfvars
```

---

## 6. Disaster Recovery

### Full region failure (unlikely)

1. Staging runs in `australia-southeast2` — can be promoted to primary
2. Cloud SQL has cross-region read replicas (enable in prod.tfvars when needed)
3. GCS buckets can be dual-region (upgrade when needed)

### Complete environment rebuild

```bash
# From scratch using Terraform
cd infra/terraform
terraform init -backend-config="prefix=terraform/state/prod"
terraform apply -var-file=environments/prod.tfvars

# Restore database
gcloud sql backups restore <BACKUP_ID> --restore-instance=engplatform-db-prod

# Rebuild and deploy images
gh workflow run deploy.yml -f environment=prod
```

---

## Escalation Path

1. **On-call engineer**: Check alerts in Cloud Monitoring, attempt rollback
2. **Platform lead**: If rollback fails, escalate for DB restore or infra rebuild
3. **Incident post-mortem**: After resolution, document root cause and preventive measures
