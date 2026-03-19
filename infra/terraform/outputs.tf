output "web_url" {
  description = "URL of the web service"
  value       = module.cloud_run.web_url
}

output "api_url" {
  description = "URL of the API service"
  value       = module.cloud_run.api_url
}

output "calc_engine_url" {
  description = "URL of the calc-engine service"
  value       = module.cloud_run.calc_engine_url
}

output "db_connection_name" {
  description = "Cloud SQL connection name"
  value       = module.cloud_sql.connection_name
}

output "artifact_registry" {
  description = "Artifact Registry repository URL"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.images.repository_id}"
}
