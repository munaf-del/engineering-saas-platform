variable "project_id" {
  type = string
}

variable "region" {
  type = string
}

variable "name_prefix" {
  type = string
}

variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/20"
}

variable "vpc_connector_cidr" {
  type    = string
  default = "10.8.0.0/28"
}
