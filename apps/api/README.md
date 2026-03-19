# @eng/api — Backend API

NestJS REST API for the Engineering SaaS Platform.

## Quick Start

```bash
# From repo root
docker compose up -d postgres          # start PostgreSQL
cd apps/api

pnpm install                            # install deps
cp .env.example .env.local              # configure env

pnpm prisma:generate                    # generate Prisma client
pnpm prisma:migrate:dev                 # run migrations
pnpm prisma:seed                        # seed demo data
pnpm dev                                # start in watch mode → http://localhost:4000
```

Swagger UI is available at **http://localhost:4000/api/docs**.

## Auth Flow

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/v1/auth/register` | POST | — | Register user; returns access + refresh tokens |
| `/api/v1/auth/login` | POST | — | Login; optional `organisationId` to scope session |
| `/api/v1/auth/refresh` | POST | — | Rotate refresh token; returns new access + refresh tokens |
| `/api/v1/auth/logout` | POST | — | Revoke a refresh token |
| `/api/v1/auth/switch-org` | POST | Bearer | Switch org context; verifies membership server-side |
| `/api/v1/auth/me` | GET | Bearer | Current user profile + org memberships |

- **Access tokens** expire in 15 minutes (JWT).
- **Refresh tokens** expire in 7 days (opaque, SHA-256 hashed in DB, rotated on use).
- Org-scoped tokens are only issued after server-side membership verification.

## RBAC

### Organisation Roles (enum `OrgRole`)

| Role | Permissions |
|---|---|
| `owner` | Full control; delete org; manage members |
| `admin` | Update org; manage members; bypass project role checks |
| `engineer` | Create projects; standard CRUD within assigned projects |
| `viewer` | Read-only access |

### Project Roles (enum `ProjectRole`)

| Role | Permissions |
|---|---|
| `lead` | Full project control; manage members; delete project |
| `engineer` | Update project |
| `reviewer` | Read-only (future: approve calculations) |
| `viewer` | Read-only |

Org `owner`/`admin` roles bypass project-level role checks.

## API Endpoints

### Organisations

All require Bearer auth.

| Endpoint | Method | Roles | Description |
|---|---|---|---|
| `/api/v1/organisations` | GET | any | List user's orgs (paginated) |
| `/api/v1/organisations/:id` | GET | member | Get org detail |
| `/api/v1/organisations` | POST | any | Create org (caller = owner) |
| `/api/v1/organisations/:id` | PATCH | owner, admin | Update org |
| `/api/v1/organisations/:id` | DELETE | owner | Delete org |

### Projects

All require Bearer auth + org context.

| Endpoint | Method | Org Roles | Project Roles | Description |
|---|---|---|---|---|
| `/api/v1/projects` | GET | any | — | List projects (paginated) |
| `/api/v1/projects/:id` | GET | any | — | Get project detail |
| `/api/v1/projects` | POST | owner, admin, engineer | — | Create project |
| `/api/v1/projects/:id` | PATCH | owner, admin | lead, engineer | Update project |
| `/api/v1/projects/:id` | DELETE | owner, admin | lead | Delete project |
| `/api/v1/projects/:id/members` | GET | any | — | List members |
| `/api/v1/projects/:id/members` | POST | owner, admin | lead | Add member |
| `/api/v1/projects/:id/members/:userId` | DELETE | owner, admin | lead | Remove member |

### Standards

All require Bearer auth.

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/standards` | GET | List all editions (paginated) |
| `/api/v1/standards/current` | GET | List current editions (paginated) |
| `/api/v1/standards/:code` | GET | Get editions by code |

### Health

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/health` | GET | Health check (no auth) |

## Pagination

List endpoints accept `?page=1&limit=20` query parameters and return:

```json
{
  "data": [...],
  "meta": { "page": 1, "limit": 20, "total": 42, "totalPages": 3 }
}
```

## Cross-Cutting Concerns

- **Request ID**: Every request gets an `X-Request-Id` header (generated or forwarded).
- **Audit Logging**: All POST/PATCH/PUT/DELETE operations write to `audit_logs` with user, org, action, entity info, and request ID.
- **Tenant Scoping**: Prisma middleware auto-filters queries by `organisationId` from the JWT context.
- **OpenAPI**: Auto-generated at `/api/docs` from decorators.

## Testing

```bash
# Unit tests
pnpm test

# E2E tests (requires running PostgreSQL)
pnpm test:e2e
```

## Seed Data

Run `pnpm prisma:seed` to create:

| Entity | Value |
|---|---|
| User | `admin@demo.eng` / `DemoPassword1!` |
| Organisation | Demo Engineering Pty Ltd (`demo-engineering`) |
| Project | Demo Bridge Assessment (`DEMO-001`) |
| Standards Profile | Default Profile (empty) |
