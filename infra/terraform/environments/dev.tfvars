# ─── Dev environment ─────────────────────────────────────────────────────────
# Usage: terraform plan -var-file=environments/dev.tfvars

project_id  = "engine-dev-487802"
region      = "australia-southeast1"
environment = "dev"

# Cost-conscious defaults
db_tier            = "db-custom-1-3840"
db_edition         = "ENTERPRISE"
db_ha              = false
db_max_connections = 50

web_min_instances         = 0
web_max_instances         = 2
api_min_instances         = 0
api_max_instances         = 3
calc_engine_min_instances = 0
calc_engine_max_instances = 5

enable_load_balancer = false
enable_pubsub        = true

alert_notification_channels = []
