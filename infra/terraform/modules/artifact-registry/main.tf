resource "google_artifact_registry_repository" "images" {
  location      = var.region
  repository_id = var.name_prefix
  format        = "DOCKER"
  description   = "Docker images for ${var.name_prefix} services"
  labels        = var.labels

  cleanup_policies {
    id     = "keep-recent"
    action = "KEEP"
    most_recent_versions {
      keep_count = 10
    }
  }

  cleanup_policies {
    id     = "gc-untagged"
    action = "DELETE"
    condition {
      tag_state  = "UNTAGGED"
      older_than = "604800s" # 7 days
    }
  }
}
