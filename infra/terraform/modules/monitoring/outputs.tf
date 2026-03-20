output "dashboard_id" {
  value = google_monitoring_dashboard.main.id
}

output "api_5xx_alert_id" {
  value = google_monitoring_alert_policy.api_5xx_rate.name
}
