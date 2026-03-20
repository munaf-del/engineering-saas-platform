output "project_events_topic" {
  value = google_pubsub_topic.project_events.id
}

output "calculation_events_topic" {
  value = google_pubsub_topic.calculation_events.id
}

output "dead_letter_topic" {
  value = google_pubsub_topic.dead_letter.id
}
