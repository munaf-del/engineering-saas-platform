# EngPlatform Agent Guide

This repository is a multi-tenant SaaS platform for Australian structural and geotechnical engineering. It combines a Next.js web app, a NestJS API, a Python calc engine, and shared TypeScript contracts. Agent work here is only safe when tenancy, deterministic calculations, and reporting traceability stay intact.

Use this file with [docs/architecture/repo-map.md](docs/architecture/repo-map.md), [docs/agent-lanes.md](docs/agent-lanes.md), and the repo-local skill specs under `.agents/skills/`.

## Repo Purpose

- `apps/web`: tenant-facing UI, print/export routes, report authoring workspaces
- `apps/api`: auth, tenancy, persistence, orchestration, reporting, imports, AI/document flows
- `apps/calc-engine`: deterministic calculation engine with no database access
- `packages/shared`: shared schemas, types, standards helpers, unit helpers
- `docs/adr`: architecture decisions and domain constraints

## Architecture Boundaries

| Area               | Role                           | Boundary                                                                               |
| ------------------ | ------------------------------ | -------------------------------------------------------------------------------------- |
| `apps/web`         | Presentation and authoring UX  | Must not become the source of truth for tenancy, rule-pack approval, or calc semantics |
| `apps/api`         | Sole DB-backed orchestrator    | Owns auth, RBAC, persistence, snapshots, report evidence, and calc-engine calls        |
| `apps/calc-engine` | Deterministic compute boundary | No DB access, no external API calls, no clock/random dependent logic                   |
| `packages/shared`  | Cross-layer contracts          | Contract edits must stay aligned with API DTOs/orchestration and Python models/tests   |
| `apps/api/prisma`  | Persistence model              | High-risk area; do not mix schema or migration work into unrelated PRs                 |

## Verified Commands

### Workspace Root

- Install: `pnpm install`
- Dev: `pnpm dev`
- Build: `pnpm build`
- Test: `pnpm test`
- Lint: `pnpm lint`
- Typecheck: `pnpm typecheck`
- Format: `pnpm format`
- Format check: `pnpm format:check`
- Docker: `pnpm docker:up`, `pnpm docker:down`, `pnpm docker:build`

### API

- Dev: `pnpm --filter @eng/api dev`
- Build: `pnpm --filter @eng/api build`
- Test: `pnpm --filter @eng/api test`
- E2E test: `pnpm --filter @eng/api test:e2e`
- Lint: `pnpm --filter @eng/api lint`
- Typecheck: `pnpm --filter @eng/api typecheck`
- Prisma: `pnpm --filter @eng/api prisma:generate`, `pnpm --filter @eng/api prisma:migrate:dev`, `pnpm --filter @eng/api prisma:migrate:deploy`, `pnpm --filter @eng/api prisma:studio`, `pnpm --filter @eng/api prisma:seed`

### Web

- Dev: `pnpm --filter @eng/web dev`
- Build: `pnpm --filter @eng/web build`
- Start: `pnpm --filter @eng/web start`
- Test: `pnpm --filter @eng/web test`
- E2E test: `pnpm --filter @eng/web test:e2e`
- E2E UI: `pnpm --filter @eng/web test:e2e:ui`
- Lint: `pnpm --filter @eng/web lint`
- Typecheck: `pnpm --filter @eng/web typecheck`

### Shared

- Dev: `pnpm --filter @eng/shared dev`
- Build: `pnpm --filter @eng/shared build`
- Test: `pnpm --filter @eng/shared test`
- Lint: `pnpm --filter @eng/shared lint`
- Typecheck: `pnpm --filter @eng/shared typecheck`

### Calc Engine

- Install dev deps: `cd apps/calc-engine && pip install -e ".[dev]"`
- Dev server: `cd apps/calc-engine && uvicorn app.main:app --reload --port 8000`
- Test: `cd apps/calc-engine && pytest -v`
- Lint: `cd apps/calc-engine && ruff check .`
- Format: `cd apps/calc-engine && ruff format .`
- Typecheck: `cd apps/calc-engine && mypy app/`

### CI Facts Verified From `.github/workflows/ci.yml`

- Node CI runs `pnpm format:check`, `pnpm typecheck`, `pnpm lint`
- Shared CI runs `pnpm --filter @eng/shared test`
- API CI runs `cd apps/api && npx prisma generate` then `pnpm --filter @eng/api test`
- Calc-engine CI runs `ruff check .`, `ruff format --check .`, `mypy app/`, `pytest -v`
- Docker build CI covers `apps/web/Dockerfile`, `apps/api/Dockerfile`, and `apps/calc-engine/Dockerfile`

## Test Expectations

- Doc-only or agent-instruction PRs: run `pnpm format:check`
- If you edit command guidance, verify it against `package.json`, app manifests, `pyproject.toml`, and `.github/workflows/ci.yml`
- If you touch one lane of product code in a future PR, run the nearest lane checks before asking for review
- If a change crosses calc contracts, run at least `pnpm --filter @eng/shared build`, `pnpm --filter @eng/shared test`, `pnpm --filter @eng/api test`, `cd apps/calc-engine && mypy app/ && pytest -v`
- If a change affects reports, print/export, or template binding, run at least `pnpm --filter @eng/api test` and `pnpm --filter @eng/web test`; add `pnpm --filter @eng/web test:e2e` when the environment is ready

## Branch And PR Rules

- Base branch is `main`
- Agent-authored branches should use `codex/<lane>-<topic>`
- Keep one implementation lane per PR by default
- Keep docs/process PRs separate from product-behavior PRs
- PR descriptions should include:
  - touched lane or lanes
  - risky zones touched
  - verified commands run
  - unknowns or drift discovered
  - follow-up work that was intentionally left out
- Require human review for changes under:
  - `apps/api/prisma/**`
  - `apps/api/src/common/tenant/**`
  - `apps/api/src/common/prisma/**`
  - `apps/api/src/modules/auth/**`
  - `apps/api/src/modules/calculations/**`
  - `apps/calc-engine/app/**`
  - `apps/web/src/app/(print)/**`
  - `apps/web/src/features/templates/**`
  - `apps/api/src/modules/reports/**`
  - `apps/api/src/modules/root-sheet-templates/**`
  - `apps/api/src/modules/project-spatial/**`
  - `apps/api/src/modules/environmental-monitoring/**`

## Tenancy Rules

- Do not assume tenant scoping is automatic across the entire API
- Verified code today shows:
  - `TenantInterceptor` writes `organisationId` and `userId` into tenant context for authenticated requests that have an `organisationId`
  - the Prisma query extension only auto-scopes these models: `Project`, `StandardsProfile`, `AuditLog`, `ImportJob`, `Document`, `AiDocument`
- For other tenant-owned models, preserve explicit `organisationId` and `projectId` filters or the existing access-check pattern before querying
- Never weaken `TenantInterceptor`, tenant context wiring, membership checks, or project read/write assertions
- Prefer scoped `findFirst` or parent-scoped lookups over unscoped tenant reads
- Treat auth, organisations, projects, documents, AI documents, reporting, and environmental modules as tenancy-sensitive even when the Prisma extension does not enforce them centrally
- Do not describe tenancy as being protected by repo-wide automatic Prisma coverage, PostgreSQL RLS, or `SET LOCAL app.current_org_id` unless that behavior is verified in code first
- Mark any uncertainty about tenant scoping in the PR instead of guessing

## Deterministic Calculation Rules

- The API assembles requests; the calc-engine computes; reports depend on stored snapshots and evidence
- Keep these layers aligned when calc contracts change:
  - `packages/shared/src/schemas/**`
  - `packages/shared/src/types/calculations.ts`
  - `apps/api/src/modules/calculations/**`
  - `apps/calc-engine/app/models/**`
  - `apps/calc-engine/app/engine/**`
  - `apps/calc-engine/tests/**`
- Preserve canonical hashing behavior in both:
  - `apps/api/src/modules/calculations/snapshot.service.ts`
  - `apps/calc-engine/app/engine/dispatcher.py`
- Do not introduce randomness, wall-clock behavior, external network calls, or DB access into `apps/calc-engine`
- Do not invent engineering factors, rule values, or fallback defaults; missing approved rule data must fail loudly
- Keep engineering values in SI through persistence and calc execution; display-only conversion belongs at the edge
- Support-matrix guard:
  - shared TS types and API DTOs list many calc types
  - the verified Python dispatcher currently maps `pile_group` and `multi_pile_envelope`
  - `docs/adr/006-v1-calculation-algorithms.md` still documents only `pile_group`
  - treat that drift as an explicit unknown and update docs/tests together when touching support claims

## Reporting And Source Traceability Rules

- Preserve calculation `requestSnapshot`, `resultSnapshot`, `requestHash`, and calculation snapshot hashes
- Preserve report evidence bundle fields, design-check references, standards references, and clause references
- Preserve report/template provenance fields such as:
  - `rootSheetTemplateId`
  - `rootSheetTemplateVersionId`
  - `templateSnapshotJson`
  - `templateSourceKind`
  - `templateReferenceId`
  - `sourceLabel`
  - `sourceReference`
  - `sourceUrl`
  - source spatial feature and view ids/labels
- Environmental monitoring report package issues and annexures are frozen snapshots; do not silently recompute or overwrite provenance fields
- Waste classification and related domain outputs must retain source URLs and authored source notes
- Never commit licensed raw standards or catalogue files; keep repository content to metadata, schemas, and traceable references

## Prohibited Agent Behaviors

- Inventing commands, supported calc implementations, standards factors, or source provenance
- Mixing docs/process work with product logic changes unless the task explicitly asks for both
- Relaxing org/project scoping because a query "looks safe"
- Editing snapshot hashes, version ids, or evidence bundles by hand to make outputs line up
- Committing `.env`, local secrets, licensed data, temp worktrees, or generated local staging files
- Removing failing tests or golden fixtures instead of understanding the regression
- Rewriting report text or recommendations without preserving linked evidence or source attribution

## Known Unknowns

- ADR-002 previously described broader tenancy enforcement than the currently verified code proves; this PR softens that ADR to current verified behavior and treats broader Prisma/RLS enforcement as future hardening
- ADR-006 now notes that the live calc-engine dispatcher maps `pile_group` and `multi_pile_envelope`, but only the `pile_group` algorithm is documented in detail
- No dedicated markdown lint command was found beyond `pnpm format:check`
