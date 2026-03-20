// ─── Optional HTTPS Load Balancer + Cloud Armor ─────────────────────────────
// Enable via: enable_load_balancer = true + domain_name = "app.example.com"
// This module creates a global HTTPS LB with managed SSL and a WAF policy.

// ── Serverless NEGs ─────────────────────────────────────────────────────────

resource "google_compute_region_network_endpoint_group" "web" {
  name                  = "${var.name_prefix}-web-neg"
  project               = var.project_id
  region                = var.region
  network_endpoint_type = "SERVERLESS"

  cloud_run {
    service = var.web_service_name
  }
}

resource "google_compute_region_network_endpoint_group" "api" {
  name                  = "${var.name_prefix}-api-neg"
  project               = var.project_id
  region                = var.region
  network_endpoint_type = "SERVERLESS"

  cloud_run {
    service = var.api_service_name
  }
}

// ── Backend services ────────────────────────────────────────────────────────

resource "google_compute_backend_service" "web" {
  name        = "${var.name_prefix}-web-backend"
  project     = var.project_id
  protocol    = "HTTPS"
  timeout_sec = 30

  backend {
    group = google_compute_region_network_endpoint_group.web.id
  }

  security_policy = google_compute_security_policy.waf.id
}

resource "google_compute_backend_service" "api" {
  name        = "${var.name_prefix}-api-backend"
  project     = var.project_id
  protocol    = "HTTPS"
  timeout_sec = 300

  backend {
    group = google_compute_region_network_endpoint_group.api.id
  }

  security_policy = google_compute_security_policy.waf.id
}

// ── URL map: route /api/* → API, everything else → Web ──────────────────────

resource "google_compute_url_map" "main" {
  name            = "${var.name_prefix}-lb"
  project         = var.project_id
  default_service = google_compute_backend_service.web.id

  host_rule {
    hosts        = [var.domain_name]
    path_matcher = "routes"
  }

  path_matcher {
    name            = "routes"
    default_service = google_compute_backend_service.web.id

    path_rule {
      paths   = ["/api/*", "/api/v1/*"]
      service = google_compute_backend_service.api.id
    }
  }
}

// ── Managed SSL cert ────────────────────────────────────────────────────────

resource "google_compute_managed_ssl_certificate" "main" {
  name    = "${var.name_prefix}-cert"
  project = var.project_id

  managed {
    domains = [var.domain_name]
  }
}

// ── HTTPS proxy + forwarding rule ───────────────────────────────────────────

resource "google_compute_target_https_proxy" "main" {
  name             = "${var.name_prefix}-https-proxy"
  project          = var.project_id
  url_map          = google_compute_url_map.main.id
  ssl_certificates = [google_compute_managed_ssl_certificate.main.id]
}

resource "google_compute_global_address" "lb" {
  name    = "${var.name_prefix}-lb-ip"
  project = var.project_id
}

resource "google_compute_global_forwarding_rule" "https" {
  name        = "${var.name_prefix}-https-fwd"
  project     = var.project_id
  target      = google_compute_target_https_proxy.main.id
  port_range  = "443"
  ip_address  = google_compute_global_address.lb.address
  ip_protocol = "TCP"
}

// ── HTTP → HTTPS redirect ───────────────────────────────────────────────────

resource "google_compute_url_map" "redirect" {
  name    = "${var.name_prefix}-http-redirect"
  project = var.project_id

  default_url_redirect {
    https_redirect = true
    strip_query    = false
  }
}

resource "google_compute_target_http_proxy" "redirect" {
  name    = "${var.name_prefix}-http-proxy"
  project = var.project_id
  url_map = google_compute_url_map.redirect.id
}

resource "google_compute_global_forwarding_rule" "http" {
  name        = "${var.name_prefix}-http-fwd"
  project     = var.project_id
  target      = google_compute_target_http_proxy.redirect.id
  port_range  = "80"
  ip_address  = google_compute_global_address.lb.address
  ip_protocol = "TCP"
}

// ── Cloud Armor WAF ─────────────────────────────────────────────────────────

resource "google_compute_security_policy" "waf" {
  name    = "${var.name_prefix}-waf"
  project = var.project_id

  // Default allow
  rule {
    action   = "allow"
    priority = 2147483647
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    description = "Default allow"
  }

  // Block known bad bots via preconfigured expression
  rule {
    action   = "deny(403)"
    priority = 1000
    match {
      expr {
        expression = "evaluatePreconfiguredExpr('xss-v33-stable')"
      }
    }
    description = "XSS protection"
  }

  rule {
    action   = "deny(403)"
    priority = 1001
    match {
      expr {
        expression = "evaluatePreconfiguredExpr('sqli-v33-stable')"
      }
    }
    description = "SQL injection protection"
  }

  // Rate limit (per IP, 300 req/min)
  rule {
    action   = "throttle"
    priority = 2000
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    rate_limit_options {
      conform_action = "allow"
      exceed_action  = "deny(429)"
      rate_limit_threshold {
        count        = 300
        interval_sec = 60
      }
    }
    description = "Rate limit 300 req/min per IP"
  }
}
