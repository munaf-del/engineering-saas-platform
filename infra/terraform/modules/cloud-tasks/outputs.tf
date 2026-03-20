output "calculation_queue_name" {
  value = google_cloud_tasks_queue.calculations.name
}

output "calculation_queue_id" {
  value = google_cloud_tasks_queue.calculations.id
}

output "report_queue_name" {
  value = google_cloud_tasks_queue.reports.name
}

output "report_queue_id" {
  value = google_cloud_tasks_queue.reports.id
}
