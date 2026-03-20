resource "google_cloud_tasks_queue" "calculations" {
  name     = "${var.name_prefix}-calc-${var.environment}"
  location = var.region
  project  = var.project_id

  rate_limits {
    max_concurrent_dispatches = var.environment == "prod" ? 20 : 5
    max_dispatches_per_second = var.environment == "prod" ? 10 : 2
  }

  retry_config {
    max_attempts       = 3
    max_backoff        = "300s"
    min_backoff        = "10s"
    max_doublings      = 3
    max_retry_duration = "600s"
  }
}

resource "google_cloud_tasks_queue" "reports" {
  name     = "${var.name_prefix}-reports-${var.environment}"
  location = var.region
  project  = var.project_id

  rate_limits {
    max_concurrent_dispatches = var.environment == "prod" ? 10 : 3
    max_dispatches_per_second = var.environment == "prod" ? 5 : 1
  }

  retry_config {
    max_attempts       = 3
    max_backoff        = "600s"
    min_backoff        = "30s"
    max_doublings      = 3
    max_retry_duration = "1200s"
  }
}
