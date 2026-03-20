variable "project_id" {
  type = string
}

variable "name_prefix" {
  type = string
}

variable "environment" {
  type = string
}

variable "api_service_account" {
  description = "API service account email"
  type        = string
}

variable "web_service_account" {
  description = "Web service account email"
  type        = string
}
