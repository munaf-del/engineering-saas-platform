variable "project_id" { type = string }

resource "google_service_account" "api" {
  account_id   = "engplatform-api"
  display_name = "EngPlatform API Service"
  project      = var.project_id
}

resource "google_service_account" "calc_engine" {
  account_id   = "engplatform-calc-engine"
  display_name = "EngPlatform Calc Engine Service"
  project      = var.project_id
}

resource "google_service_account" "web" {
  account_id   = "engplatform-web"
  display_name = "EngPlatform Web Service"
  project      = var.project_id
}

resource "google_project_iam_member" "api_sql" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.api.email}"
}

resource "google_project_iam_member" "api_storage" {
  project = var.project_id
  role    = "roles/storage.objectUser"
  member  = "serviceAccount:${google_service_account.api.email}"
}

resource "google_project_iam_member" "api_secret" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.api.email}"
}

resource "google_project_iam_member" "api_tasks" {
  project = var.project_id
  role    = "roles/cloudtasks.enqueuer"
  member  = "serviceAccount:${google_service_account.api.email}"
}

output "api_service_account" {
  value = google_service_account.api.email
}

output "calc_engine_service_account" {
  value = google_service_account.calc_engine.email
}
