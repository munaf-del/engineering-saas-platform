# EngPlatform

Multi-tenant SaaS platform for Australian structural and geotechnical engineering.

## Architecture

| Service | Stack | Port | Purpose |
|---------|-------|------|---------|
| `apps/web` | Next.js 15, Tailwind, shadcn/ui | 3000 | Tenant-facing UI |
| `apps/api` | NestJS, Prisma, PostgreSQL | 4000 | REST API, auth, orchestration |
| `apps/calc-engine` | Python 3.12, FastAPI, Pydantic, NumPy | 8000 | Deterministic calculation engine |
| `packages/shared` | TypeScript | — | Shared types, units, schemas |

See `docs/adr/` for architecture decision records.

## Prerequisites

- **Node.js** >= 20 with **pnpm** >= 9
- **Python** 3.12+
- **Docker** and **Docker Compose**
- **Terraform** >= 1.7 (for infrastructure)

## Quick Start

### 1. Clone and install

```bash
git clone <repo-url> && cd engineering-saas-platform
pnpm install
```

### 2. Start local services (Postgres)

```bash
docker compose up -d postgres
```

### 3. Set up the database

```bash
cp apps/api/.env.example apps/api/.env.local
cd apps/api
npx prisma generate
npx prisma migrate dev --name init
cd ../..
```

### 4. Run all services in dev mode

```bash
pnpm dev
```

Or run individually:

```bash
# Terminal 1 — API
cd apps/api && pnpm dev

# Terminal 2 — Web
cd apps/web && pnpm dev

# Terminal 3 — Calc Engine
cd apps/calc-engine
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000
```

### 5. Access

- **Web UI**: http://localhost:3000
- **API**: http://localhost:4000/api/v1
- **API Docs (Swagger)**: http://localhost:4000/api/docs
- **Calc Engine**: http://localhost:8000
- **Calc Engine Docs**: http://localhost:8000/docs

## Docker (Full Stack)

```bash
docker compose build
docker compose up
```

## Build

```bash
pnpm build           # Build all packages and apps
pnpm typecheck       # Type-check all TypeScript
```

## Test

```bash
pnpm test                                    # Run all tests
pnpm --filter @eng/shared test               # Shared package tests
pnpm --filter @eng/api test                  # API unit tests
cd apps/calc-engine && pytest -v             # Calc engine tests
```

## Lint and Format

```bash
pnpm lint             # Lint all TypeScript
pnpm format           # Format all files
pnpm format:check     # Check formatting

# Python (in apps/calc-engine)
ruff check .
ruff format .
mypy app/
```

## Project Structure

```
engineering-saas-platform/
├── apps/
│   ├── web/                  # Next.js frontend
│   ├── api/                  # NestJS backend
│   │   └── prisma/           # Database schema & migrations
│   └── calc-engine/          # Python calculation engine
├── packages/
│   └── shared/               # Shared TypeScript types & utils
├── infra/
│   └── terraform/            # GCP infrastructure as code
├── docs/
│   └── adr/                  # Architecture decision records
├── .github/
│   └── workflows/            # CI/CD pipelines
├── docker-compose.yml        # Local development services
├── turbo.json                # Turborepo configuration
└── pnpm-workspace.yaml       # Workspace configuration
```

## Deploy to GCP

### Prerequisites

1. Create a GCP project
2. Enable billing
3. Create a Terraform state bucket: `gsutil mb gs://engplatform-terraform-state`
4. Authenticate: `gcloud auth application-default login`

### Deploy infrastructure

```bash
cd infra/terraform
terraform init
terraform plan -var="project_id=YOUR_PROJECT_ID"
terraform apply -var="project_id=YOUR_PROJECT_ID"
```

### CI/CD

The GitHub Actions workflow in `.github/workflows/deploy.yml` automatically builds and deploys on push to `main`. Required secrets:

- `GCP_PROJECT_ID`
- `GCP_WORKLOAD_IDENTITY_PROVIDER`
- `GCP_SERVICE_ACCOUNT`

## Standards Compliance

This platform references Australian Standards for structural and geotechnical engineering. **No copyrighted standards content is included in this repository.** The standards registry contains metadata only (code, title, edition, status). Engineering factors and rules are loaded via a separate import pipeline from licensed sources. See [ADR-003](docs/adr/003-standards-registry-and-licensed-data.md).

## License

Proprietary. All rights reserved.
