// ─── Service URLs ───────────────────────────────────────────────────────────

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

// ─── Infrastructure ─────────────────────────────────────────────────────────

output "artifact_registry" {
  description = "Artifact Registry repository URL"
  value       = module.artifact_registry.repository_url
}

output "db_connection_name" {
  description = "Cloud SQL connection name"
  value       = module.cloud_sql.connection_name
}

output "db_instance_name" {
  description = "Cloud SQL instance name"
  value       = module.cloud_sql.instance_name
}

// ─── Buckets ────────────────────────────────────────────────────────────────

output "imports_bucket" {
  description = "GCS bucket for file imports"
  value       = module.cloud_storage.imports_bucket
}

output "reports_bucket" {
  description = "GCS bucket for generated reports"
  value       = module.cloud_storage.reports_bucket
}

output "documents_bucket" {
  description = "GCS bucket for project documents"
  value       = module.cloud_storage.documents_bucket
}

// ─── Service Accounts ───────────────────────────────────────────────────────

output "api_service_account" {
  description = "API service account email"
  value       = module.iam.api_service_account_email
}

output "web_service_account" {
  description = "Web service account email"
  value       = module.iam.web_service_account_email
}

output "calc_engine_service_account" {
  description = "Calc engine service account email"
  value       = module.iam.calc_engine_service_account_email
}

output "cloud_build_service_account" {
  description = "Cloud Build service account email"
  value       = module.iam.cloud_build_service_account_email
}

// ─── Queues ─────────────────────────────────────────────────────────────────

output "calculation_queue" {
  description = "Cloud Tasks calculation queue name"
  value       = module.cloud_tasks.calculation_queue_name
}

output "report_queue" {
  description = "Cloud Tasks report queue name"
  value       = module.cloud_tasks.report_queue_name
}

// ─── Load Balancer (when enabled) ───────────────────────────────────────────

output "lb_ip_address" {
  description = "Load balancer IP (empty if LB disabled)"
  value       = var.enable_load_balancer ? module.load_balancer[0].lb_ip_address : ""
}
