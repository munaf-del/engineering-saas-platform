// ─── VPC + Subnet + VPC Connector for Cloud Run ────────────────────────────

resource "google_compute_network" "main" {
  name                    = "${var.name_prefix}-vpc"
  auto_create_subnetworks = false
  project                 = var.project_id
}

resource "google_compute_subnetwork" "main" {
  name          = "${var.name_prefix}-subnet"
  ip_cidr_range = var.vpc_cidr
  region        = var.region
  network       = google_compute_network.main.id
  project       = var.project_id

  private_ip_google_access = true
}

resource "google_vpc_access_connector" "main" {
  name          = "${var.name_prefix}-conn"
  region        = var.region
  project       = var.project_id
  ip_cidr_range = var.vpc_connector_cidr
  network       = google_compute_network.main.name

  min_instances = 2
  max_instances = 3
}

// Private Services Access for Cloud SQL
resource "google_compute_global_address" "private_ip" {
  name          = "${var.name_prefix}-private-ip"
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
