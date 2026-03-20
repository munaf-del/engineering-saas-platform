// ─── Service Accounts (one per service, least privilege) ────────────────────

resource "google_service_account" "web" {
  account_id   = "${var.name_prefix}-web"
  display_name = "EngPlatform Web (Next.js)"
  project      = var.project_id
}

resource "google_service_account" "api" {
  account_id   = "${var.name_prefix}-api"
  display_name = "EngPlatform API (NestJS)"
  project      = var.project_id
}

resource "google_service_account" "calc_engine" {
  account_id   = "${var.name_prefix}-calc"
  display_name = "EngPlatform Calc Engine (FastAPI)"
  project      = var.project_id
}

resource "google_service_account" "cloud_build" {
  account_id   = "${var.name_prefix}-build"
  display_name = "EngPlatform Cloud Build"
  project      = var.project_id
}

resource "google_service_account" "migrate" {
  account_id   = "${var.name_prefix}-migrate"
  display_name = "EngPlatform DB Migration Runner"
  project      = var.project_id
}

// ─── API service permissions ────────────────────────────────────────────────

resource "google_project_iam_member" "api_cloudsql" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.api.email}"
}

resource "google_project_iam_member" "api_storage" {
  project = var.project_id
  role    = "roles/storage.objectUser"
  member  = "serviceAccount:${google_service_account.api.email}"
}

resource "google_project_iam_member" "api_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.api.email}"
}

resource "google_project_iam_member" "api_tasks_enqueuer" {
  project = var.project_id
  role    = "roles/cloudtasks.enqueuer"
  member  = "serviceAccount:${google_service_account.api.email}"
}

resource "google_project_iam_member" "api_pubsub_publisher" {
  project = var.project_id
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${google_service_account.api.email}"
}

resource "google_project_iam_member" "api_logging" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.api.email}"
}

resource "google_project_iam_member" "api_monitoring" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.api.email}"
}

// ─── Web service permissions ────────────────────────────────────────────────

resource "google_project_iam_member" "web_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.web.email}"
}

resource "google_project_iam_member" "web_logging" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.web.email}"
}

// ─── Calc-engine permissions ────────────────────────────────────────────────

resource "google_project_iam_member" "calc_logging" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.calc_engine.email}"
}

resource "google_project_iam_member" "calc_monitoring" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.calc_engine.email}"
}

// ─── Migration runner permissions ───────────────────────────────────────────

resource "google_project_iam_member" "migrate_cloudsql" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.migrate.email}"
}

resource "google_project_iam_member" "migrate_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.migrate.email}"
}

// ─── Cloud Build permissions ────────────────────────────────────────────────

resource "google_project_iam_member" "build_run_admin" {
  project = var.project_id
  role    = "roles/run.admin"
  member  = "serviceAccount:${google_service_account.cloud_build.email}"
}

resource "google_project_iam_member" "build_artifact_writer" {
  project = var.project_id
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${google_service_account.cloud_build.email}"
}

resource "google_project_iam_member" "build_logging" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.cloud_build.email}"
}

resource "google_project_iam_member" "build_sa_user" {
  project = var.project_id
  role    = "roles/iam.serviceAccountUser"
  member  = "serviceAccount:${google_service_account.cloud_build.email}"
}

resource "google_project_iam_member" "build_deploy" {
  project = var.project_id
  role    = "roles/clouddeploy.operator"
  member  = "serviceAccount:${google_service_account.cloud_build.email}"
}

// Cross-service invocation (api → calc-engine) is configured in the
// cloud-run module to avoid circular dependencies.
