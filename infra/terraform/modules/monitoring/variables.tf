variable "project_id" {
  type = string
}

variable "name_prefix" {
  type = string
}

variable "environment" {
  type = string
}

variable "notification_channels" {
  description = "Monitoring notification channel IDs"
  type        = list(string)
  default     = []
}

variable "web_service_name" {
  type = string
}

variable "api_service_name" {
  type = string
}

variable "calc_engine_service_name" {
  type = string
}

variable "db_instance_name" {
  type = string
}

variable "calculation_queue_name" {
  type = string
}

variable "report_queue_name" {
  type = string
}
