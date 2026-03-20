// ─── Provider ───────────────────────────────────────────────────────────────

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

// ─── API enablement ─────────────────────────────────────────────────────────

resource "google_project_service" "apis" {
  for_each           = toset(local.required_apis)
  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}

// ─── Networking ─────────────────────────────────────────────────────────────

module "networking" {
  source = "./modules/networking"

  project_id         = var.project_id
  region             = var.region
  name_prefix        = local.name_prefix
  vpc_cidr           = var.vpc_cidr
  vpc_connector_cidr = var.vpc_connector_cidr

  depends_on = [google_project_service.apis]
}

// ─── IAM / Service Accounts ─────────────────────────────────────────────────

module "iam" {
  source = "./modules/iam"

  project_id  = var.project_id
  name_prefix = local.name_prefix

  depends_on = [google_project_service.apis]
}

// ─── Artifact Registry ──────────────────────────────────────────────────────

module "artifact_registry" {
  source = "./modules/artifact-registry"

  project_id  = var.project_id
  region      = var.region
  name_prefix = local.name_prefix
  labels      = local.common_labels

  depends_on = [google_project_service.apis]
}

// ─── Secret Manager ─────────────────────────────────────────────────────────

module "secret_manager" {
  source = "./modules/secret-manager"

  project_id          = var.project_id
  name_prefix         = local.name_prefix
  environment         = var.environment
  api_service_account = module.iam.api_service_account_email
  web_service_account = module.iam.web_service_account_email

  depends_on = [google_project_service.apis]
}

// ─── Cloud SQL ──────────────────────────────────────────────────────────────

module "cloud_sql" {
  source = "./modules/cloud-sql"

  project_id         = var.project_id
  region             = var.region
  name_prefix        = local.name_prefix
  environment        = var.environment
  network_id         = module.networking.network_id
  tier               = var.db_tier
  ha                 = var.db_ha
  max_connections    = var.db_max_connections
  db_password_secret = module.secret_manager.db_password_secret_id
  labels             = local.common_labels

  depends_on = [
    google_project_service.apis,
    module.networking,
  ]
}

// ─── Cloud Storage ──────────────────────────────────────────────────────────

module "cloud_storage" {
  source = "./modules/cloud-storage"

  project_id          = var.project_id
  region              = var.region
  name_prefix         = local.name_prefix
  environment         = var.environment
  api_service_account = module.iam.api_service_account_email
  labels              = local.common_labels

  depends_on = [google_project_service.apis]
}

// ─── Cloud Tasks ────────────────────────────────────────────────────────────

module "cloud_tasks" {
  source = "./modules/cloud-tasks"

  project_id  = var.project_id
  region      = var.region
  name_prefix = local.name_prefix
  environment = var.environment

  depends_on = [google_project_service.apis]
}

// ─── Pub/Sub (optional) ─────────────────────────────────────────────────────

module "pubsub" {
  source = "./modules/pubsub"
  count  = var.enable_pubsub ? 1 : 0

  project_id          = var.project_id
  name_prefix         = local.name_prefix
  api_service_account = module.iam.api_service_account_email
  labels              = local.common_labels

  depends_on = [google_project_service.apis]
}

// ─── Cloud Run Services ─────────────────────────────────────────────────────

module "cloud_run" {
  source = "./modules/cloud-run"

  project_id         = var.project_id
  region             = var.region
  name_prefix        = local.name_prefix
  environment        = var.environment
  registry           = module.artifact_registry.repository_url
  vpc_connector_id   = module.networking.vpc_connector_id
  db_connection_name = module.cloud_sql.connection_name

  web_service_account         = module.iam.web_service_account_email
  api_service_account         = module.iam.api_service_account_email
  calc_engine_service_account = module.iam.calc_engine_service_account_email

  web_image_tag         = var.web_image_tag
  api_image_tag         = var.api_image_tag
  calc_engine_image_tag = var.calc_engine_image_tag

  web_min_instances         = var.web_min_instances
  web_max_instances         = var.web_max_instances
  api_min_instances         = var.api_min_instances
  api_max_instances         = var.api_max_instances
  calc_engine_min_instances = var.calc_engine_min_instances
  calc_engine_max_instances = var.calc_engine_max_instances

  # Secret references (versioned latest)
  database_url_secret = module.secret_manager.database_url_secret_version
  jwt_secret_secret   = module.secret_manager.jwt_secret_secret_version
  db_password_secret  = module.secret_manager.db_password_secret_version

  labels = local.common_labels

  depends_on = [
    google_project_service.apis,
    module.networking,
    module.cloud_sql,
    module.secret_manager,
  ]
}

// ─── Monitoring & Alerting ──────────────────────────────────────────────────

module "monitoring" {
  source = "./modules/monitoring"

  project_id            = var.project_id
  name_prefix           = local.name_prefix
  environment           = var.environment
  notification_channels = var.alert_notification_channels

  web_service_name         = module.cloud_run.web_service_name
  api_service_name         = module.cloud_run.api_service_name
  calc_engine_service_name = module.cloud_run.calc_engine_service_name
  db_instance_name         = module.cloud_sql.instance_name
  calculation_queue_name   = module.cloud_tasks.calculation_queue_name
  report_queue_name        = module.cloud_tasks.report_queue_name

  depends_on = [google_project_service.apis]
}

// ─── HTTPS Load Balancer + Cloud Armor (optional) ───────────────────────────

module "load_balancer" {
  source = "./modules/load-balancer"
  count  = var.enable_load_balancer ? 1 : 0

  project_id  = var.project_id
  region      = var.region
  name_prefix = local.name_prefix
  domain_name = var.domain_name
  environment = var.environment

  web_service_name = module.cloud_run.web_service_name
  api_service_name = module.cloud_run.api_service_name

  depends_on = [google_project_service.apis]
}
