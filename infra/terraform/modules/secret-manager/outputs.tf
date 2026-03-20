output "db_password_secret_id" {
  value = google_secret_manager_secret.db_password.id
}

output "db_password_secret_version" {
  value = google_secret_manager_secret_version.db_password.name
}

output "database_url_secret_id" {
  value = google_secret_manager_secret.database_url.id
}

output "database_url_secret_version" {
  value = google_secret_manager_secret_version.database_url.name
}

output "jwt_secret_secret_id" {
  value = google_secret_manager_secret.jwt_secret.id
}

output "jwt_secret_secret_version" {
  value = google_secret_manager_secret_version.jwt_secret.name
}
