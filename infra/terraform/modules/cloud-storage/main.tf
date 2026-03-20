// ─── Buckets ────────────────────────────────────────────────────────────────
// Three purpose-built buckets: imports, reports, documents

locals {
  bucket_prefix = "${var.project_id}-${var.environment}"
}

resource "google_storage_bucket" "imports" {
  name          = "${local.bucket_prefix}-imports"
  location      = var.region
  project       = var.project_id
  force_destroy = var.environment != "prod"
  labels        = var.labels

  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
  }

  lifecycle_rule {
    condition {
      age = 365
    }
    action {
      type = "Delete"
    }
  }

  cors {
    origin          = ["*"]
    method          = ["GET", "PUT", "POST"]
    response_header = ["Content-Type"]
    max_age_seconds = 3600
  }
}

resource "google_storage_bucket" "reports" {
  name          = "${local.bucket_prefix}-reports"
  location      = var.region
  project       = var.project_id
  force_destroy = var.environment != "prod"
  labels        = var.labels

  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  lifecycle_rule {
    condition {
      age = 180
    }
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
  }

  versioning {
    enabled = true
  }
}

resource "google_storage_bucket" "documents" {
  name          = "${local.bucket_prefix}-documents"
  location      = var.region
  project       = var.project_id
  force_destroy = false
  labels        = var.labels

  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  versioning {
    enabled = true
  }
}

// ─── IAM ────────────────────────────────────────────────────────────────────

resource "google_storage_bucket_iam_member" "api_imports" {
  bucket = google_storage_bucket.imports.name
  role   = "roles/storage.objectUser"
  member = "serviceAccount:${var.api_service_account}"
}

resource "google_storage_bucket_iam_member" "api_reports" {
  bucket = google_storage_bucket.reports.name
  role   = "roles/storage.objectUser"
  member = "serviceAccount:${var.api_service_account}"
}

resource "google_storage_bucket_iam_member" "api_documents" {
  bucket = google_storage_bucket.documents.name
  role   = "roles/storage.objectUser"
  member = "serviceAccount:${var.api_service_account}"
}
