// ─── Project ────────────────────────────────────────────────────────────────

variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "Primary GCP region"
  type        = string
  default     = "australia-southeast1"
}

variable "secondary_region" {
  description = "Secondary / staging region"
  type        = string
  default     = "australia-southeast2"
}

variable "environment" {
  description = "Environment name: dev | staging | prod"
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be dev, staging, or prod"
  }
}

// ─── Networking ─────────────────────────────────────────────────────────────

variable "vpc_cidr" {
  description = "Primary subnet CIDR"
  type        = string
  default     = "10.0.0.0/20"
}

variable "vpc_connector_cidr" {
  description = "VPC connector CIDR (/28)"
  type        = string
  default     = "10.8.0.0/28"
}

// ─── Cloud SQL ──────────────────────────────────────────────────────────────

variable "db_tier" {
  description = "Cloud SQL machine tier"
  type        = string
  default     = "db-custom-1-3840"
}

variable "db_edition" {
  type        = string
  description = "Cloud SQL edition"
  default     = "ENTERPRISE"

  validation {
    condition     = contains(["ENTERPRISE", "ENTERPRISE_PLUS"], var.db_edition)
    error_message = "db_edition must be ENTERPRISE or ENTERPRISE_PLUS."
  }
}

variable "db_ha" {
  description = "Enable high availability (REGIONAL) for Cloud SQL"
  type        = bool
  default     = false
}

variable "db_max_connections" {
  description = "PostgreSQL max_connections"
  type        = number
  default     = 100
}

// ─── Cloud Run ──────────────────────────────────────────────────────────────

variable "web_image_tag" {
  description = "Docker tag for the web service"
  type        = string
  default     = "latest"
}

variable "api_image_tag" {
  description = "Docker tag for the API service"
  type        = string
  default     = "latest"
}

variable "calc_engine_image_tag" {
  description = "Docker tag for the calc-engine service"
  type        = string
  default     = "latest"
}

variable "web_min_instances" {
  description = "Minimum instances for web"
  type        = number
  default     = 0
}

variable "web_max_instances" {
  description = "Maximum instances for web"
  type        = number
  default     = 5
}

variable "api_min_instances" {
  description = "Minimum instances for API"
  type        = number
  default     = 0
}

variable "api_max_instances" {
  description = "Maximum instances for API"
  type        = number
  default     = 10
}

variable "calc_engine_min_instances" {
  description = "Minimum instances for calc-engine"
  type        = number
  default     = 0
}

variable "calc_engine_max_instances" {
  description = "Maximum instances for calc-engine"
  type        = number
  default     = 20
}

// ─── Domain / HTTPS ─────────────────────────────────────────────────────────

variable "enable_load_balancer" {
  description = "Provision HTTPS Load Balancer and Cloud Armor (set true when custom domain is ready)"
  type        = bool
  default     = false
}

variable "domain_name" {
  description = "Custom domain (e.g. app.engplatform.com.au). Required when enable_load_balancer = true."
  type        = string
  default     = ""
}

// ─── Feature flags ──────────────────────────────────────────────────────────

variable "enable_pubsub" {
  description = "Provision Pub/Sub topics for domain events"
  type        = bool
  default     = true
}

// ─── Monitoring ─────────────────────────────────────────────────────────────

variable "alert_notification_channels" {
  description = "List of notification channel IDs for alerting (create via console, then reference here)"
  type        = list(string)
  default     = []
}
