// ─── Web (Next.js) ──────────────────────────────────────────────────────────

resource "google_cloud_run_v2_service" "web" {
  name     = "${var.name_prefix}-web"
  location = var.region
  project  = var.project_id
  labels   = var.labels

  template {
    service_account = var.web_service_account

    containers {
      image = "${var.registry}/web:${var.web_image_tag}"

      ports {
        container_port = 3000
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
        cpu_idle = true
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "NEXT_PUBLIC_API_URL"
        value = var.api_public_url
      }
      env {
        name  = "HOSTNAME"
        value = "0.0.0.0"
      }

      startup_probe {
        http_get {
          path = "/"
          port = 3000
        }
        initial_delay_seconds = 5
        period_seconds        = 3
        failure_threshold     = 10
      }

      liveness_probe {
        http_get {
          path = "/"
          port = 3000
        }
        period_seconds    = 15
        failure_threshold = 3
      }
    }

    scaling {
      min_instance_count = var.web_min_instances
      max_instance_count = var.web_max_instances
    }

    vpc_access {
      connector = var.vpc_connector_id
      egress    = "PRIVATE_RANGES_ONLY"
    }

    timeout = "60s"
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }
}

// Public access for web
resource "google_cloud_run_v2_service_iam_member" "web_public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.web.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

// ─── API (NestJS) ───────────────────────────────────────────────────────────

resource "google_cloud_run_v2_service" "api" {
  name     = "${var.name_prefix}-api"
  location = var.region
  project  = var.project_id
  labels   = var.labels

  template {
    service_account = var.api_service_account

    containers {
      image = "${var.registry}/api:${var.api_image_tag}"

      ports {
        container_port = 4000
      }

      resources {
        limits = {
          cpu    = "2"
          memory = "1Gi"
        }
        cpu_idle = false
      }

      // Plain env vars
      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "PORT"
        value = "4000"
      }
      env {
        name  = "CALC_ENGINE_URL"
        value = "https://${var.name_prefix}-calc-engine-${var.calc_engine_hash}.a.run.app"
      }
      env {
        name  = "LOG_FORMAT"
        value = "json"
      }
      env {
        name  = "ENVIRONMENT"
        value = var.environment
      }
      env {
        name  = "GCS_IMPORTS_BUCKET"
        value = "${var.project_id}-${var.environment}-imports"
      }
      env {
        name  = "GCS_REPORTS_BUCKET"
        value = "${var.project_id}-${var.environment}-reports"
      }
      env {
        name  = "GCS_DOCUMENTS_BUCKET"
        value = "${var.project_id}-${var.environment}-documents"
      }
      env {
        name  = "CLOUD_TASKS_QUEUE_CALC"
        value = "${var.name_prefix}-calc-${var.environment}"
      }
      env {
        name  = "CLOUD_TASKS_QUEUE_REPORTS"
        value = "${var.name_prefix}-reports-${var.environment}"
      }
      env {
        name  = "CLOUD_TASKS_LOCATION"
        value = var.region
      }
      env {
        name  = "GCP_PROJECT_ID"
        value = var.project_id
      }

      // Secrets from Secret Manager
      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = "${var.name_prefix}-${var.environment}-database-url"
            version = "latest"
          }
        }
      }
      env {
        name = "JWT_SECRET"
        value_source {
          secret_key_ref {
            secret  = "${var.name_prefix}-${var.environment}-jwt-secret"
            version = "latest"
          }
        }
      }

      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }

      startup_probe {
        http_get {
          path = "/api/v1/health"
          port = 4000
        }
        initial_delay_seconds = 10
        period_seconds        = 5
        failure_threshold     = 10
      }

      liveness_probe {
        http_get {
          path = "/api/v1/health"
          port = 4000
        }
        period_seconds    = 30
        failure_threshold = 3
      }
    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [var.db_connection_name]
      }
    }

    scaling {
      min_instance_count = var.api_min_instances
      max_instance_count = var.api_max_instances
    }

    vpc_access {
      connector = var.vpc_connector_id
      egress    = "PRIVATE_RANGES_ONLY"
    }

    timeout = "300s"
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }
}

// Public access for API
resource "google_cloud_run_v2_service_iam_member" "api_public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.api.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

// ─── Calc Engine (FastAPI) ──────────────────────────────────────────────────

resource "google_cloud_run_v2_service" "calc_engine" {
  name     = "${var.name_prefix}-calc-engine"
  location = var.region
  project  = var.project_id
  labels   = var.labels

  template {
    service_account = var.calc_engine_service_account

    containers {
      image = "${var.registry}/calc-engine:${var.calc_engine_image_tag}"

      ports {
        container_port = 8000
      }

      resources {
        limits = {
          cpu    = "4"
          memory = "2Gi"
        }
        cpu_idle = false
      }

      env {
        name  = "CALC_ENGINE_ENVIRONMENT"
        value = var.environment
      }
      env {
        name  = "CALC_ENGINE_LOG_LEVEL"
        value = var.environment == "prod" ? "WARNING" : "INFO"
      }
      env {
        name  = "CALC_ENGINE_LOG_FORMAT"
        value = "json"
      }

      startup_probe {
        http_get {
          path = "/health"
          port = 8000
        }
        initial_delay_seconds = 3
        period_seconds        = 3
        failure_threshold     = 10
      }

      liveness_probe {
        http_get {
          path = "/health"
          port = 8000
        }
        period_seconds    = 15
        failure_threshold = 3
      }
    }

    scaling {
      min_instance_count = var.calc_engine_min_instances
      max_instance_count = var.calc_engine_max_instances
    }

    vpc_access {
      connector = var.vpc_connector_id
      egress    = "PRIVATE_RANGES_ONLY"
    }

    timeout = "300s"
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }
}

// Calc engine: authenticated only — API service account can invoke
resource "google_cloud_run_v2_service_iam_member" "api_invokes_calc" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.calc_engine.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${var.api_service_account}"
}
