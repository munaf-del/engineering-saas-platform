# ADR-002: Multi-Tenancy Model

**Status:** Accepted
**Date:** 2026-03-20

## Context

The platform serves multiple engineering organisations, each with their own projects, users, materials, and calculations. We need strict data isolation without excessive infrastructure overhead.

## Decision

### Shared Database, Application-Layer Isolation

We use a **single PostgreSQL database** with tenant-owned rows carrying `organisation_id` foreign keys and application-layer scoping checks.

#### Why not schema-per-tenant or database-per-tenant?

- Schema-per-tenant adds migration complexity that is not justified at early scale.
- Database-per-tenant multiplies Cloud SQL costs.
- Application-layer isolation with enforced foreign keys and scoped queries is the standard approach for B2B SaaS at our expected scale (tens to low hundreds of organisations).

### Isolation Enforcement Layers

Verified current behavior in repo code:

1. **Tenant request context**: `TenantInterceptor` writes `organisationId` and `userId` into tenant context for authenticated requests that include an `organisationId`.
2. **Limited Prisma query extension**: the current Prisma extension auto-scopes only `Project`, `StandardsProfile`, `AuditLog`, `ImportJob`, `Document`, and `AiDocument`.
3. **Explicit service-layer scoping**: service methods and access helpers still need explicit `organisationId`, `projectId`, membership, and role checks for other tenant-owned models.
4. **Audit logging**: `AuditInterceptor` records write activity with request and user context.

Future hardening may broaden Prisma coverage and/or add database-level RLS, but this ADR should not be read as proof that repo-wide automatic enforcement or `SET LOCAL app.current_org_id` is active today.

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

| Level        | Roles                                    | Scope                      |
| ------------ | ---------------------------------------- | -------------------------- |
| Organisation | `owner`, `admin`, `engineer`, `viewer`   | All org resources          |
| Project      | `lead`, `engineer`, `reviewer`, `viewer` | Project-specific resources |

Permissions are checked via NestJS guards that compose org-level and project-level roles.

## Consequences

- Tenant-owned tables are expected to carry `organisation_id`, though some shared/global and scoped template records vary by design.
- Queries on models outside the limited Prisma extension must be explicitly scoped at the service layer.
- Cross-tenant operations (e.g., platform admin) use a separate admin API with distinct auth.
- Broader Prisma auto-scoping and PostgreSQL RLS remain future hardening work until implemented.
