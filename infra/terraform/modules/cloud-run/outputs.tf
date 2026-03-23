output "web_url" {
  value = google_cloud_run_v2_service.web.uri
}

output "api_url" {
  value = google_cloud_run_v2_service.api.urls[0]
}

output "calc_engine_url" {
  value = google_cloud_run_v2_service.calc_engine.uri
}

output "web_service_name" {
  value = google_cloud_run_v2_service.web.name
}

output "api_service_name" {
  value = google_cloud_run_v2_service.api.name
}

output "calc_engine_service_name" {
  value = google_cloud_run_v2_service.calc_engine.name
}
