# ADR-001: Overall Architecture

**Status:** Accepted
**Date:** 2026-03-20

## Context

We are building a multi-tenant SaaS platform for Australian structural and geotechnical engineering. The platform must handle complex engineering calculations with full traceability, support multiple Australian Standards, and scale across organisations and projects.

## Decision

### Monorepo with Service-Oriented Architecture

The platform is structured as a **pnpm + Turborepo monorepo** with three deployable services and one shared library:

| Component | Tech | Role |
|-----------|------|------|
| `apps/web` | Next.js 15 + Tailwind + shadcn/ui | Tenant-facing UI, SSR/SSG |
| `apps/api` | NestJS + Prisma + PostgreSQL | Auth, RBAC, CRUD, orchestration |
| `apps/calc-engine` | Python 3.12 + FastAPI + Pydantic + NumPy | Deterministic engineering calculations |
| `packages/shared` | TypeScript | Shared types, units, schemas, API client |

### Why Three Services?

1. **Separation of concerns**: The calculation engine is a pure-function boundary — given inputs and a standards rule pack, it returns deterministic outputs. It has no direct database access.
2. **Language fit**: Engineering calculations benefit from Python's numeric ecosystem (NumPy, SciPy). Business logic and auth are better in TypeScript/NestJS.
3. **Independent scaling**: Calc-engine workloads are CPU-bound and burst-heavy; they scale independently on Cloud Run.

### Communication Patterns

- **Web → API**: REST over HTTPS (OpenAPI-first).
- **API → Calc-engine**: Internal REST calls within the Cloud Run VPC. The API service is the sole orchestrator.
- **Async work**: Cloud Tasks queues for long-running calculations and report generation. Optional Pub/Sub for domain events.

### Google Cloud Deployment

| GCP Service | Purpose |
|-------------|---------|
| Cloud Run | Host all three services |
| Cloud SQL (PostgreSQL 16) | Primary database |
| Cloud Storage | Reports, imports, documents |
| Secret Manager | Credentials and API keys |
| Artifact Registry | Docker images |
| Cloud Build + Cloud Deploy | CI/CD pipeline |
| Cloud Tasks | Async calculation queues |
| Pub/Sub | Domain event bus (optional) |

Primary region: `australia-southeast1` (Sydney).
Staging: `australia-southeast2` (Melbourne).

### Key Architectural Principles

1. **Clean architecture**: Domain logic is framework-agnostic. Services communicate through well-defined contracts.
2. **OpenAPI-first**: API contracts are defined before implementation. Shared types are generated from schemas.
3. **SI units in persistence**: All engineering values stored in SI. Display-layer conversion only.
4. **Immutable calculation snapshots**: Every calculation run is versioned and frozen.
5. **Standards version pinning**: Each project and calculation locks to specific standard editions.

## Consequences

- Three Docker images to build and deploy.
- Cross-service type safety requires disciplined schema management in `packages/shared`.
- Python service adds a second language runtime to the CI pipeline.
- Cloud Run cold starts need mitigation for calc-engine (min instances in prod).
