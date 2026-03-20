output "imports_bucket" {
  value = google_storage_bucket.imports.name
}

output "reports_bucket" {
  value = google_storage_bucket.reports.name
}

output "documents_bucket" {
  value = google_storage_bucket.documents.name
}
