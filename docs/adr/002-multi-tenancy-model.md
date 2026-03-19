# ADR-002: Multi-Tenancy Model

**Status:** Accepted
**Date:** 2026-03-20

## Context

The platform serves multiple engineering organisations, each with their own projects, users, materials, and calculations. We need strict data isolation without excessive infrastructure overhead.

## Decision

### Shared Database, Row-Level Isolation

We use a **single PostgreSQL database** with **row-level tenant isolation** via `organisation_id` foreign keys.

#### Why not schema-per-tenant or database-per-tenant?

- Schema-per-tenant adds migration complexity that is not justified at early scale.
- Database-per-tenant multiplies Cloud SQL costs.
- Row-level isolation with enforced foreign keys and application-layer guards is the standard approach for B2B SaaS at our expected scale (tens to low hundreds of organisations).

### Isolation Enforcement Layers

1. **Application layer**: Every database query is scoped by `organisation_id` extracted from the authenticated user's JWT claims. NestJS guards enforce this before any service method runs.
2. **Prisma middleware**: A global middleware automatically injects `organisation_id` filters on all `findMany`, `findFirst`, `update`, and `delete` operations.
3. **Row-Level Security (RLS)**: PostgreSQL RLS policies provide a database-level safety net. The application sets `app.current_org_id` on each connection via `SET LOCAL`.
4. **Audit logging**: All write operations log `organisation_id`, `user_id`, `action`, and `timestamp` to an append-only audit table.

### Data Model Hierarchy

```
Organisation
  ├── User (with OrgRole: owner, admin, engineer, viewer)
  ├── Project
  │     ├── ProjectMember (with ProjectRole)
  │     ├── Element
  │     ├── CalculationRun (immutable snapshot)
  │     └── Document
  ├── MaterialOverride (org-specific material properties)
  └── StandardsProfile (pinned standard versions)
```

### RBAC Model

Two-level role-based access control:

| Level | Roles | Scope |
|-------|-------|-------|
| Organisation | `owner`, `admin`, `engineer`, `viewer` | All org resources |
| Project | `lead`, `engineer`, `reviewer`, `viewer` | Project-specific resources |

Permissions are checked via NestJS guards that compose org-level and project-level roles.

## Consequences

- Every table with tenant data includes a non-nullable `organisation_id` column.
- All queries pass through tenant-scoping middleware — no raw queries allowed without explicit justification.
- Cross-tenant operations (e.g., platform admin) use a separate admin API with distinct auth.
- RLS policies must be maintained alongside Prisma schema migrations.
