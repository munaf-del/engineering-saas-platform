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

variable "network_id" {
  type = string
}

variable "tier" {
  type    = string
  default = "db-custom-1-3840"
}

variable "ha" {
  description = "REGIONAL availability for production"
  type        = bool
  default     = false
}

variable "max_connections" {
  type    = number
  default = 100
}

variable "db_password_secret" {
  description = "Secret Manager secret ID for the DB password"
  type        = string
}

variable "labels" {
  type    = map(string)
  default = {}
}
