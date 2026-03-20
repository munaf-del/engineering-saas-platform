output "lb_ip_address" {
  value = google_compute_global_address.lb.address
}

output "ssl_certificate_id" {
  value = google_compute_managed_ssl_certificate.main.id
}

output "security_policy_id" {
  value = google_compute_security_policy.waf.id
}
