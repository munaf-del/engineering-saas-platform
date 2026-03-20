// ─── Domain event topics ────────────────────────────────────────────────────

resource "google_pubsub_topic" "project_events" {
  name    = "${var.name_prefix}-project-events"
  project = var.project_id
  labels  = var.labels

  message_retention_duration = "86400s"
}

resource "google_pubsub_topic" "calculation_events" {
  name    = "${var.name_prefix}-calculation-events"
  project = var.project_id
  labels  = var.labels

  message_retention_duration = "86400s"
}

resource "google_pubsub_topic" "dead_letter" {
  name    = "${var.name_prefix}-dead-letter"
  project = var.project_id
  labels  = var.labels

  message_retention_duration = "604800s"
}

// ─── Subscriptions ──────────────────────────────────────────────────────────

resource "google_pubsub_subscription" "calculation_processor" {
  name    = "${var.name_prefix}-calc-processor"
  topic   = google_pubsub_topic.calculation_events.id
  project = var.project_id
  labels  = var.labels

  ack_deadline_seconds = 60

  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "300s"
  }

  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.dead_letter.id
    max_delivery_attempts = 5
  }
}

// ─── IAM ────────────────────────────────────────────────────────────────────

resource "google_pubsub_topic_iam_member" "api_publish_projects" {
  topic   = google_pubsub_topic.project_events.id
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${var.api_service_account}"
}

resource "google_pubsub_topic_iam_member" "api_publish_calculations" {
  topic   = google_pubsub_topic.calculation_events.id
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${var.api_service_account}"
}
