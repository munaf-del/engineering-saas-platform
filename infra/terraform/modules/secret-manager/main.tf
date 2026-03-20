// ─── Secrets ────────────────────────────────────────────────────────────────
// Secrets are created with auto-generated initial values. Real values MUST be
// set manually (or via CI) before the first deploy:
//   gcloud secrets versions add <secret-id> --data-file=-

resource "random_password" "db_password" {
  length  = 32
  special = true
}

resource "random_password" "jwt_secret" {
  length  = 64
  special = false
}

// ── Database password ───────────────────────────────────────────────────────

resource "google_secret_manager_secret" "db_password" {
  secret_id = "${var.name_prefix}-${var.environment}-db-password"
  project   = var.project_id

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "db_password" {
  secret      = google_secret_manager_secret.db_password.id
  secret_data = random_password.db_password.result
}

// ── DATABASE_URL (assembled from components) ────────────────────────────────

resource "google_secret_manager_secret" "database_url" {
  secret_id = "${var.name_prefix}-${var.environment}-database-url"
  project   = var.project_id

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "database_url" {
  secret      = google_secret_manager_secret.database_url.id
  secret_data = "placeholder://set-after-cloud-sql-provision"

  lifecycle {
    ignore_changes = [secret_data]
  }
}

// ── JWT secret ──────────────────────────────────────────────────────────────

resource "google_secret_manager_secret" "jwt_secret" {
  secret_id = "${var.name_prefix}-${var.environment}-jwt-secret"
  project   = var.project_id

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "jwt_secret" {
  secret      = google_secret_manager_secret.jwt_secret.id
  secret_data = random_password.jwt_secret.result
}

// ─── IAM: allow service accounts to read secrets ────────────────────────────

resource "google_secret_manager_secret_iam_member" "api_db_url" {
  secret_id = google_secret_manager_secret.database_url.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.api_service_account}"
}

resource "google_secret_manager_secret_iam_member" "api_jwt" {
  secret_id = google_secret_manager_secret.jwt_secret.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.api_service_account}"
}

resource "google_secret_manager_secret_iam_member" "api_db_pw" {
  secret_id = google_secret_manager_secret.db_password.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.api_service_account}"
}

resource "google_secret_manager_secret_iam_member" "web_jwt" {
  secret_id = google_secret_manager_secret.jwt_secret.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.web_service_account}"
}
