variable "project_id" {
  type = string
}

variable "name_prefix" {
  type = string
}

variable "api_service_account" {
  description = "API service account email"
  type        = string
}

variable "labels" {
  type    = map(string)
  default = {}
}
