variable "project_id" {
  type = string
}

variable "region" {
  type = string
}

variable "name_prefix" {
  type = string
}

variable "environment" {
  type = string
}

variable "registry" {
  description = "Artifact Registry URL (region-docker.pkg.dev/project/repo)"
  type        = string
}

variable "vpc_connector_id" {
  type = string
}

variable "db_connection_name" {
  type = string
}

// ─── Service accounts ───────────────────────────────────────────────────────

variable "web_service_account" {
  type = string
}

variable "api_service_account" {
  type = string
}

variable "calc_engine_service_account" {
  type = string
}

// ─── Image tags ─────────────────────────────────────────────────────────────

variable "web_image_tag" {
  type    = string
  default = "latest"
}

variable "api_image_tag" {
  type    = string
  default = "latest"
}

variable "calc_engine_image_tag" {
  type    = string
  default = "latest"
}

// ─── Scaling ────────────────────────────────────────────────────────────────

variable "web_min_instances" {
  type    = number
  default = 0
}

variable "web_max_instances" {
  type    = number
  default = 5
}

variable "api_min_instances" {
  type    = number
  default = 0
}

variable "api_max_instances" {
  type    = number
  default = 10
}

variable "calc_engine_min_instances" {
  type    = number
  default = 0
}

variable "calc_engine_max_instances" {
  type    = number
  default = 20
}

// ─── Secret references ──────────────────────────────────────────────────────

variable "database_url_secret" {
  type = string
}

variable "jwt_secret_secret" {
  type = string
}

variable "db_password_secret" {
  type = string
}

// ─── URLs (resolved after first apply, empty on bootstrap) ──────────────────

variable "api_public_url" {
  description = "Public URL for the API (set after first deployment or via LB domain)"
  type        = string
  default     = ""
}

variable "calc_engine_hash" {
  description = "Cloud Run auto-generated URL hash (set empty for first apply)"
  type        = string
  default     = ""
}

variable "labels" {
  type    = map(string)
  default = {}
}
