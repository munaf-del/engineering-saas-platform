resource "google_sql_database_instance" "main" {
  name             = "${var.name_prefix}-db-${var.environment}"
  database_version = "POSTGRES_16"
  region           = var.region
  project          = var.project_id

  settings {
    tier              = var.tier
    edition           = var.db_edition
    availability_type = var.ha ? "REGIONAL" : "ZONAL"
    disk_autoresize   = true
    disk_size         = 10

    ip_configuration {
      ipv4_enabled    = false
      private_network = var.network_id
    }

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
      start_time                     = "03:00"
      transaction_log_retention_days = var.ha ? 7 : 3
      backup_retention_settings {
        retained_backups = var.ha ? 30 : 7
      }
    }

    maintenance_window {
      day          = 7
      hour         = 4
      update_track = "stable"
    }

    database_flags {
      name  = "max_connections"
      value = tostring(var.max_connections)
    }

    database_flags {
      name  = "log_min_duration_statement"
      value = "1000"
    }

    insights_config {
      query_insights_enabled  = true
      record_application_tags = true
      record_client_address   = false
    }

    user_labels = var.labels
  }

  deletion_protection = var.ha
}

resource "google_sql_database" "main" {
  name     = "engplatform"
  instance = google_sql_database_instance.main.name
  project  = var.project_id
}

resource "google_sql_user" "app" {
  name     = "engplatform-app"
  instance = google_sql_database_instance.main.name
  project  = var.project_id

  # Password sourced from Secret Manager; Terraform sets the initial value.
  # Rotate via: gcloud sql users set-password ...
  password = "initial-set-via-secret-manager"

  lifecycle {
    ignore_changes = [password]
  }
}
