# ─── Production environment ──────────────────────────────────────────────────
# Usage: terraform plan -var-file=environments/prod.tfvars

project_id  = "engplatform-prod"
region      = "australia-southeast1"
environment = "prod"

db_tier            = "db-custom-2-4096"
db_ha              = true
db_max_connections = 200

web_min_instances         = 1
web_max_instances         = 10
api_min_instances         = 1
api_max_instances         = 20
calc_engine_min_instances = 1
calc_engine_max_instances = 50

enable_load_balancer = true
domain_name          = "app.engplatform.com.au"
enable_pubsub        = true

# Create notification channels in the console, then paste IDs here.
# Example: "projects/engplatform-prod/notificationChannels/123456"
alert_notification_channels = []
