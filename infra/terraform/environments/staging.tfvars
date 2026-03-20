# ─── Staging environment ─────────────────────────────────────────────────────
# Usage: terraform plan -var-file=environments/staging.tfvars

project_id  = "engplatform-staging"
region      = "australia-southeast2"
environment = "staging"

# Slightly larger than dev to catch scaling issues
db_tier            = "db-custom-1-3840"
db_ha              = false
db_max_connections = 100

web_min_instances         = 0
web_max_instances         = 3
api_min_instances         = 1
api_max_instances         = 5
calc_engine_min_instances = 0
calc_engine_max_instances = 10

enable_load_balancer = false
enable_pubsub        = true

alert_notification_channels = []
