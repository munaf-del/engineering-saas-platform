locals {
  name_prefix = "engplatform"
  registry    = "${var.region}-docker.pkg.dev/${var.project_id}/${local.name_prefix}"

  common_labels = {
    project     = local.name_prefix
    environment = var.environment
    managed_by  = "terraform"
  }

  # APIs to enable before any resource creation
  required_apis = [
    "run.googleapis.com",
    "sqladmin.googleapis.com",
    "secretmanager.googleapis.com",
    "artifactregistry.googleapis.com",
    "cloudbuild.googleapis.com",
    "cloudtasks.googleapis.com",
    "pubsub.googleapis.com",
    "vpcaccess.googleapis.com",
    "servicenetworking.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "monitoring.googleapis.com",
    "logging.googleapis.com",
    "compute.googleapis.com",
    "clouddeploy.googleapis.com",
  ]

  is_prod = var.environment == "prod"
}
