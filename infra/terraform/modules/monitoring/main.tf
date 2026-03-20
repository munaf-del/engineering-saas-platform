// ─── Log-based metrics ──────────────────────────────────────────────────────

resource "google_logging_metric" "api_5xx" {
  name    = "${var.name_prefix}-api-5xx"
  project = var.project_id

  filter = <<-EOT
    resource.type="cloud_run_revision"
    resource.labels.service_name="${var.api_service_name}"
    httpRequest.status>=500
  EOT

  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
  }
}

resource "google_logging_metric" "calc_errors" {
  name    = "${var.name_prefix}-calc-errors"
  project = var.project_id

  filter = <<-EOT
    resource.type="cloud_run_revision"
    resource.labels.service_name="${var.calc_engine_service_name}"
    severity>=ERROR
  EOT

  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
  }
}

// ─── Alert: API 5xx rate ────────────────────────────────────────────────────

resource "google_monitoring_alert_policy" "api_5xx_rate" {
  display_name = "[${var.environment}] API 5xx Error Rate"
  project      = var.project_id
  combiner     = "OR"

  conditions {
    display_name = "5xx rate > 5% over 5 min"

    condition_threshold {
      filter          = "metric.type=\"logging.googleapis.com/user/${google_logging_metric.api_5xx.name}\" AND resource.type=\"cloud_run_revision\""
      comparison      = "COMPARISON_GT"
      threshold_value = 5
      duration        = "300s"

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_RATE"
      }
    }
  }

  notification_channels = var.notification_channels

  alert_strategy {
    auto_close = "3600s"
  }
}

// ─── Alert: API latency ────────────────────────────────────────────────────

resource "google_monitoring_alert_policy" "api_latency" {
  display_name = "[${var.environment}] API p95 Latency > 2s"
  project      = var.project_id
  combiner     = "OR"

  conditions {
    display_name = "Request latency p95 > 2000ms"

    condition_threshold {
      filter          = "metric.type=\"run.googleapis.com/request_latencies\" AND resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${var.api_service_name}\""
      comparison      = "COMPARISON_GT"
      threshold_value = 2000
      duration        = "300s"

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_PERCENTILE_95"
      }
    }
  }

  notification_channels = var.notification_channels

  alert_strategy {
    auto_close = "3600s"
  }
}

// ─── Alert: Calc engine errors ──────────────────────────────────────────────

resource "google_monitoring_alert_policy" "calc_failures" {
  display_name = "[${var.environment}] Calc Engine Error Spike"
  project      = var.project_id
  combiner     = "OR"

  conditions {
    display_name = "Calc engine errors > 3/min"

    condition_threshold {
      filter          = "metric.type=\"logging.googleapis.com/user/${google_logging_metric.calc_errors.name}\" AND resource.type=\"cloud_run_revision\""
      comparison      = "COMPARISON_GT"
      threshold_value = 3
      duration        = "300s"

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_RATE"
      }
    }
  }

  notification_channels = var.notification_channels

  alert_strategy {
    auto_close = "3600s"
  }
}

// ─── Alert: Cloud SQL CPU ───────────────────────────────────────────────────

resource "google_monitoring_alert_policy" "db_cpu" {
  display_name = "[${var.environment}] Cloud SQL CPU > 80%"
  project      = var.project_id
  combiner     = "OR"

  conditions {
    display_name = "Database CPU utilisation > 80%"

    condition_threshold {
      filter          = "metric.type=\"cloudsql.googleapis.com/database/cpu/utilization\" AND resource.type=\"cloudsql_database\" AND resource.labels.database_id=\"${var.project_id}:${var.db_instance_name}\""
      comparison      = "COMPARISON_GT"
      threshold_value = 0.8
      duration        = "600s"

      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }

  notification_channels = var.notification_channels

  alert_strategy {
    auto_close = "3600s"
  }
}

// ─── Alert: Cloud SQL disk ──────────────────────────────────────────────────

resource "google_monitoring_alert_policy" "db_disk" {
  display_name = "[${var.environment}] Cloud SQL Disk > 85%"
  project      = var.project_id
  combiner     = "OR"

  conditions {
    display_name = "Database disk utilisation > 85%"

    condition_threshold {
      filter          = "metric.type=\"cloudsql.googleapis.com/database/disk/utilization\" AND resource.type=\"cloudsql_database\" AND resource.labels.database_id=\"${var.project_id}:${var.db_instance_name}\""
      comparison      = "COMPARISON_GT"
      threshold_value = 0.85
      duration        = "300s"

      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }

  notification_channels = var.notification_channels

  alert_strategy {
    auto_close = "3600s"
  }
}

// ─── Alert: Cloud Tasks queue depth ─────────────────────────────────────────

resource "google_monitoring_alert_policy" "queue_backlog" {
  display_name = "[${var.environment}] Task Queue Backlog"
  project      = var.project_id
  combiner     = "OR"

  conditions {
    display_name = "Calculation queue depth > 100 for 10 min"

    condition_threshold {
      filter          = "metric.type=\"cloudtasks.googleapis.com/queue/depth\" AND resource.type=\"cloud_tasks_queue\" AND resource.labels.queue_id=\"${var.calculation_queue_name}\""
      comparison      = "COMPARISON_GT"
      threshold_value = 100
      duration        = "600s"

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }

  notification_channels = var.notification_channels

  alert_strategy {
    auto_close = "3600s"
  }
}

// ─── Uptime check: API health ───────────────────────────────────────────────

resource "google_monitoring_uptime_check_config" "api_health" {
  display_name = "[${var.environment}] API Health Check"
  project      = var.project_id
  timeout      = "10s"
  period       = "60s"

  http_check {
    path         = "/api/v1/health"
    port         = 443
    use_ssl      = true
    validate_ssl = true
  }

  monitored_resource {
    type = "uptime_url"
    labels = {
      project_id = var.project_id
      host       = "" # Set after first deploy: the Cloud Run URL without https://
    }
  }

  lifecycle {
    ignore_changes = [monitored_resource[0].labels["host"]]
  }
}

// ─── Dashboard ──────────────────────────────────────────────────────────────

resource "google_monitoring_dashboard" "main" {
  dashboard_json = jsonencode({
    displayName = "EngPlatform ${var.environment}"
    mosaicLayout = {
      tiles = [
        {
          width  = 6
          height = 4
          widget = {
            title = "API Request Count"
            xyChart = {
              dataSets = [{
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "metric.type=\"run.googleapis.com/request_count\" AND resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${var.api_service_name}\""
                    aggregation = {
                      alignmentPeriod  = "60s"
                      perSeriesAligner = "ALIGN_RATE"
                    }
                  }
                }
              }]
            }
          }
        },
        {
          xPos   = 6
          width  = 6
          height = 4
          widget = {
            title = "API Latency (p50/p95/p99)"
            xyChart = {
              dataSets = [
                for p in ["ALIGN_PERCENTILE_50", "ALIGN_PERCENTILE_95", "ALIGN_PERCENTILE_99"] : {
                  timeSeriesQuery = {
                    timeSeriesFilter = {
                      filter = "metric.type=\"run.googleapis.com/request_latencies\" AND resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${var.api_service_name}\""
                      aggregation = {
                        alignmentPeriod  = "60s"
                        perSeriesAligner = p
                      }
                    }
                  }
                }
              ]
            }
          }
        },
        {
          yPos   = 4
          width  = 6
          height = 4
          widget = {
            title = "Calc Engine Request Count"
            xyChart = {
              dataSets = [{
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "metric.type=\"run.googleapis.com/request_count\" AND resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${var.calc_engine_service_name}\""
                    aggregation = {
                      alignmentPeriod  = "60s"
                      perSeriesAligner = "ALIGN_RATE"
                    }
                  }
                }
              }]
            }
          }
        },
        {
          xPos   = 6
          yPos   = 4
          width  = 6
          height = 4
          widget = {
            title = "Cloud SQL CPU Utilisation"
            xyChart = {
              dataSets = [{
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "metric.type=\"cloudsql.googleapis.com/database/cpu/utilization\" AND resource.type=\"cloudsql_database\""
                    aggregation = {
                      alignmentPeriod  = "60s"
                      perSeriesAligner = "ALIGN_MEAN"
                    }
                  }
                }
              }]
            }
          }
        },
        {
          yPos   = 8
          width  = 6
          height = 4
          widget = {
            title = "Cloud SQL Active Connections"
            xyChart = {
              dataSets = [{
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "metric.type=\"cloudsql.googleapis.com/database/postgresql/num_backends\" AND resource.type=\"cloudsql_database\""
                    aggregation = {
                      alignmentPeriod  = "60s"
                      perSeriesAligner = "ALIGN_MEAN"
                    }
                  }
                }
              }]
            }
          }
        },
        {
          xPos   = 6
          yPos   = 8
          width  = 6
          height = 4
          widget = {
            title = "Task Queue Depth"
            xyChart = {
              dataSets = [{
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "metric.type=\"cloudtasks.googleapis.com/queue/depth\" AND resource.type=\"cloud_tasks_queue\""
                    aggregation = {
                      alignmentPeriod  = "60s"
                      perSeriesAligner = "ALIGN_MEAN"
                    }
                  }
                }
              }]
            }
          }
        },
      ]
    }
  })

  project = var.project_id
}
