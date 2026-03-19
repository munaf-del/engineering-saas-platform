variable "project_id" { type = string }
variable "region" { type = string }
variable "db_connection_name" { type = string }
variable "vpc_connector_id" { type = string }

locals {
  registry = "${var.region}-docker.pkg.dev/${var.project_id}/engplatform"
}

resource "google_cloud_run_v2_service" "web" {
  name     = "engplatform-web"
  location = var.region
  project  = var.project_id

  template {
    containers {
      image = "${local.registry}/web:latest"
      ports {
        container_port = 3000
      }
      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }
    }
    scaling {
      min_instance_count = 0
      max_instance_count = 10
    }
    vpc_access {
      connector = var.vpc_connector_id
      egress    = "PRIVATE_RANGES_ONLY"
    }
  }
}

resource "google_cloud_run_v2_service" "api" {
  name     = "engplatform-api"
  location = var.region
  project  = var.project_id

  template {
    containers {
      image = "${local.registry}/api:latest"
      ports {
        container_port = 4000
      }
      resources {
        limits = {
          cpu    = "2"
          memory = "1Gi"
        }
      }
      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }
    }
    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [var.db_connection_name]
      }
    }
    scaling {
      min_instance_count = 1
      max_instance_count = 20
    }
    vpc_access {
      connector = var.vpc_connector_id
      egress    = "PRIVATE_RANGES_ONLY"
    }
  }
}

resource "google_cloud_run_v2_service" "calc_engine" {
  name     = "engplatform-calc-engine"
  location = var.region
  project  = var.project_id

  template {
    containers {
      image = "${local.registry}/calc-engine:latest"
      ports {
        container_port = 8000
      }
      resources {
        limits = {
          cpu    = "4"
          memory = "2Gi"
        }
      }
    }
    scaling {
      min_instance_count = 1
      max_instance_count = 50
    }
    vpc_access {
      connector = var.vpc_connector_id
      egress    = "PRIVATE_RANGES_ONLY"
    }
  }
}

output "web_url" {
  value = google_cloud_run_v2_service.web.uri
}

output "api_url" {
  value = google_cloud_run_v2_service.api.uri
}

output "calc_engine_url" {
  value = google_cloud_run_v2_service.calc_engine.uri
}
