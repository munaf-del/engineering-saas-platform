# Remote state in GCS. Each environment uses a separate prefix.
# Initialise with:
#   terraform init -backend-config="prefix=terraform/state/${ENV}"
# or override the bucket per-project:
#   terraform init -backend-config="bucket=my-project-tf-state"
terraform {
  backend "gcs" {
    bucket = "engplatform-terraform-state"
    prefix = "terraform/state"
  }
}
