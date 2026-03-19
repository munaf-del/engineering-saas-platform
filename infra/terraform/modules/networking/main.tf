variable "project_id" { type = string }
variable "region" { type = string }

resource "google_compute_network" "main" {
  name                    = "engplatform-vpc"
  auto_create_subnetworks = false
  project                 = var.project_id
}

resource "google_compute_subnetwork" "main" {
  name          = "engplatform-subnet"
  ip_cidr_range = "10.0.0.0/20"
  region        = var.region
  network       = google_compute_network.main.id
  project       = var.project_id
}

resource "google_vpc_access_connector" "main" {
  name          = "engplatform-connector"
  region        = var.region
  project       = var.project_id
  ip_cidr_range = "10.8.0.0/28"
  network       = google_compute_network.main.name
}

resource "google_compute_global_address" "private_ip" {
  name          = "engplatform-private-ip"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.main.id
  project       = var.project_id
}

resource "google_service_networking_connection" "private" {
  network                 = google_compute_network.main.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip.name]
}

output "network_id" {
  value = google_compute_network.main.id
}

output "vpc_connector_id" {
  value = google_vpc_access_connector.main.id
}
