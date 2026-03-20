output "web_service_account_email" {
  value = google_service_account.web.email
}

output "api_service_account_email" {
  value = google_service_account.api.email
}

output "calc_engine_service_account_email" {
  value = google_service_account.calc_engine.email
}

output "cloud_build_service_account_email" {
  value = google_service_account.cloud_build.email
}

output "migrate_service_account_email" {
  value = google_service_account.migrate.email
}
