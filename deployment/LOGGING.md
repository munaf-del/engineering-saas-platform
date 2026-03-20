# Structured Logging & Observability

## Logging Format

All services emit structured JSON logs in deployed environments. Cloud Run captures stdout/stderr and forwards to Cloud Logging automatically.

### Log entry schema

```json
{
  "severity": "INFO",
  "message": "Request processed",
  "timestamp": "2026-03-20T10:30:00.000Z",
  "service": "api",
  "environment": "prod",
  "requestId": "req-abc123",
  "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
  "userId": "usr-456",
  "organisationId": "org-789",
  "duration_ms": 142,
  "httpMethod": "POST",
  "httpPath": "/api/v1/calculations",
  "httpStatus": 200
}
```

### API (NestJS)

Set `LOG_FORMAT=json` in production. The logger should:

1. Extract `X-Request-Id` from incoming headers (or generate a UUID)
2. Extract `X-Cloud-Trace-Context` and include as `traceId` for Cloud Logging correlation
3. Attach `requestId` to all log entries in the request lifecycle
4. Log at `INFO` for normal requests, `WARN` for 4xx, `ERROR` for 5xx and unhandled exceptions

**Request-ID propagation:**

```
Client → [X-Request-Id: abc123] → API → [X-Request-Id: abc123] → Calc Engine
```

When calling the calc-engine, the API should forward `X-Request-Id` and `X-Cloud-Trace-Context`.

### Calc Engine (FastAPI)

Set `CALC_ENGINE_LOG_FORMAT=json` in production. Use Python's `structlog` or `python-json-logger`:

1. Accept `X-Request-Id` from headers, include in all log entries
2. Accept `X-Cloud-Trace-Context` for distributed tracing
3. Log calculation inputs and outputs at `DEBUG` level
4. Log calculation completion with duration at `INFO` level
5. Log errors with full context at `ERROR` level

### Web (Next.js)

Server-side logs go to Cloud Logging via stdout. Client-side logs stay in the browser.

## Cloud Logging Queries

### Find all logs for a request:
```
resource.type="cloud_run_revision"
jsonPayload.requestId="req-abc123"
```

### Find errors across all services:
```
resource.type="cloud_run_revision"
resource.labels.service_name=~"engplatform-"
severity>=ERROR
```

### Find slow API requests (>2s):
```
resource.type="cloud_run_revision"
resource.labels.service_name="engplatform-api"
jsonPayload.duration_ms>2000
```

### Find failed calculations:
```
resource.type="cloud_run_revision"
resource.labels.service_name="engplatform-calc-engine"
severity>=ERROR
jsonPayload.message=~"calculation"
```

## Health Checks

| Service | Endpoint | Port | Checks |
|---------|----------|------|--------|
| API | `GET /api/v1/health` | 4000 | Database connectivity |
| Calc Engine | `GET /health` | 8000 | Service liveness |
| Web | `GET /` | 3000 | Next.js render |

Cloud Run uses these for startup probes (allow slow starts) and liveness probes (detect stuck processes).

## Request-ID Propagation

```
┌──────────┐     ┌──────────┐     ┌──────────────┐
│  Client   │────▶│   API    │────▶│ Calc Engine  │
│           │     │ (NestJS) │     │  (FastAPI)   │
└──────────┘     └──────────┘     └──────────────┘
     │                │                  │
     │  X-Request-Id  │  X-Request-Id    │
     │  generated or  │  forwarded       │
     │  forwarded     │                  │
     ▼                ▼                  ▼
   ┌─────────────────────────────────────────┐
   │          Cloud Logging                   │
   │  (correlated via requestId field)        │
   └─────────────────────────────────────────┘
```

The API generates `X-Request-Id` if not present, includes it in all downstream calls, and returns it in response headers. This allows tracing a single user action across all services.

## Monitoring Dashboard

Terraform provisions a Cloud Monitoring dashboard (`modules/monitoring`) with:

- API request rate
- API latency percentiles (p50, p95, p99)
- Calc engine request rate
- Cloud SQL CPU utilisation
- Cloud SQL active connections
- Cloud Tasks queue depth

## Alert Policies

| Alert | Condition | Duration |
|-------|-----------|----------|
| API 5xx rate | > 5 errors/min | 5 min |
| API latency p95 | > 2000ms | 5 min |
| Calc engine errors | > 3 errors/min | 5 min |
| Cloud SQL CPU | > 80% | 10 min |
| Cloud SQL disk | > 85% | 5 min |
| Queue backlog | > 100 tasks | 10 min |
| API uptime | Fails 2 consecutive checks | 2 min |
