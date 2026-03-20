# Dev Deployment Rollback Checklist

> What to do when the first dev deployment fails at each phase.
> Reference this alongside the [Dev Deploy Checklist](./DEV_DEPLOY_CHECKLIST.md).

---

## General Principles

1. **Don't panic.** Dev is not production. Nothing customer-facing is at risk.
2. **Check logs first.** Most failures have a clear error message.
3. **Terraform is idempotent.** Re-running `terraform apply` after fixing an issue is safe.
4. **Cloud Run keeps revisions.** Rolling back a service is a one-line command.

---

## Rollback by Phase

### Phase 2 failure — Terraform init/validate

| Symptom | Fix |
|---------|-----|
| `backend bucket does not exist` | Create the bucket (Phase 1 step) and re-run `terraform init` |
| `provider version constraint` | Run `terraform init -upgrade` to fetch the latest matching provider |
| Validation errors | Fix the `.tf` file and re-run `terraform validate` |

No cloud resources exist yet — nothing to roll back.

---

### Phase 3 failure — Terraform apply

| Symptom | Fix |
|---------|-----|
| API not enabled | Terraform enables APIs automatically, but propagation can take 60s. Wait and re-run `terraform apply`. |
| Quota exceeded | Request quota increase in Console → IAM & Admin → Quotas, then re-apply |
| Permission denied | Ensure your account has Owner role. Re-authenticate: `gcloud auth application-default login` |
| Cloud SQL timeout | Cloud SQL takes 8–15 min. If it times out, just re-run `terraform apply` — it will pick up where it left off. |
| Partial apply (some resources created) | Fix the error and re-run `terraform apply`. Terraform tracks created resources in state. |

**Nuclear option** — tear down everything and start fresh:

```bash
terraform destroy -var-file=environments/dev.tfvars
# Then start again from Phase 2
```

---

### Phase 4 failure — Secrets

| Symptom | Fix |
|---------|-----|
| Secret not found | Re-run `terraform apply` — the secret-manager module creates them |
| DATABASE_URL has wrong IP | Wait for Cloud SQL to finish provisioning, then re-apply Terraform. The secret module reads the DB private IP from the cloud-sql module output. |
| Want to rotate a secret | Add a new version: `echo -n "new-value" \| gcloud secrets versions add <secret-name> --data-file=-` |

---

### Phase 5 failure — Docker build/push

| Symptom | Fix |
|---------|-----|
| `unauthorized` on push | Re-run `gcloud auth configure-docker australia-southeast1-docker.pkg.dev` |
| Build fails | Fix the Dockerfile or app code locally, rebuild, push again |
| Wrong architecture | If building on Apple Silicon for Cloud Run (amd64), use: `docker build --platform linux/amd64 ...` |

No rollback needed — just fix and re-push. Artifact Registry accepts overwrites of the same tag.

---

### Phase 6 failure — Cloud Run update

| Symptom | Fix |
|---------|-----|
| Image not found | Verify the image tag matches what you pushed. Check: `gcloud artifacts docker images list ...` |
| Service crashes on start | Check logs: `gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="engplatform-api"' --limit=20 --freshness=15m` |
| Env vars / secrets misconfigured | Check the Cloud Run service env: `gcloud run services describe engplatform-api --region=australia-southeast1 --format=yaml` |

**Roll back a Cloud Run service:**

```bash
# List revisions
gcloud run revisions list --service=engplatform-api --region=australia-southeast1

# Route traffic to the previous working revision
gcloud run services update-traffic engplatform-api \
  --to-revisions=<previous-revision-name>=100 \
  --region=australia-southeast1
```

---

### Phase 7 failure — Migrations

| Symptom | Fix |
|---------|-----|
| Cloud Build fails | Check build logs: `gcloud builds log $(gcloud builds list --project=engplatform-dev --limit=1 --format='value(id)')` |
| Migration SQL error | Fix the Prisma schema/migration locally, rebuild the API image, push, then re-run `./deployment/jobs/migrate.sh dev` |
| Can't connect to DB | Verify Cloud SQL has a private IP and the VPC connector is healthy. Check: `gcloud sql instances describe engplatform-db-dev --format="value(ipAddresses)"` |

**If a migration left the DB in a bad state (dev only):**

```bash
# Option A: Re-create the database
gcloud sql databases delete engplatform --instance=engplatform-db-dev --quiet
gcloud sql databases create engplatform --instance=engplatform-db-dev
# Then re-run migrations from scratch

# Option B: Restore from backup
gcloud sql backups list --instance=engplatform-db-dev
gcloud sql backups restore <BACKUP_ID> --restore-instance=engplatform-db-dev
```

---

### Phase 8 failure — Smoke tests

| Symptom | Fix |
|---------|-----|
| API returns 5xx | Check API logs (see Phase 6). Common cause: DATABASE_URL secret is wrong or DB not migrated. |
| Web returns 502/503 | The container may still be starting. Wait 30s and retry. Check `NEXT_PUBLIC_API_URL` is set correctly. |
| Calc engine 502 | Check calc-engine logs. Common cause: Python dependency missing or port mismatch. |
| Connection refused | Cloud Run needs 1–2 min for the first cold start with min_instances=0. Retry after a pause. |

**Quick service status sweep:**

```bash
for svc in engplatform-api engplatform-web engplatform-calc-engine; do
  echo "=== ${svc} ==="
  gcloud run services describe ${svc} --region=australia-southeast1 \
    --format="table(status.conditions.type,status.conditions.status,status.conditions.message)"
done
```

---

## Full Teardown (Last Resort)

If the dev environment is unsalvageable and you want to start from scratch:

```bash
cd infra/terraform
terraform destroy -var-file=environments/dev.tfvars
```

Review the destroy plan carefully, then confirm. After destroy completes, you can re-run the deployment from Phase 2.

**Note:** `terraform destroy` will delete the Cloud SQL instance and all its data. This is fine for dev but **never** do this in staging/prod without a backup.

---

## Escalation

If you're stuck after 30 minutes of debugging:

1. Capture the error: `terraform apply ... 2>&1 | tee deploy-error.log`
2. Capture Cloud Run logs: `gcloud logging read ... > cloud-run-errors.log`
3. Share both files with the platform lead for review
