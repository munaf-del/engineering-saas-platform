# Repo Map

This map is intentionally concise. It is meant to tell an agent where to work, who owns the lane, and which areas are safe to change in a small PR.

Primary operating rules live in [../../AGENTS.md](../../AGENTS.md). Parallel lane rules live in [../agent-lanes.md](../agent-lanes.md).

## Apps, Packages, And Modules

| Area                                                                                                                                                                                                                             | Purpose                                                                          | Owner lane       | Safer edit zones                                                      | Riskier edit zones                                                                         |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ---------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `apps/web/src/app/(app)`, `apps/web/src/components`, `apps/web/src/hooks`                                                                                                                                                        | Main tenant UI and shared presentation                                           | `web-ui`         | page composition, presentational components, local UI state, tests    | flows that change auth, API transport, or report semantics                                 |
| `apps/web/src/app/(print)`, `apps/web/src/features/templates`, `apps/web/src/features/environmental`, `apps/web/src/features/spatial`                                                                                            | Print/export, template authoring, spatial/report UX                              | `report-author`  | copy/layout fixes, preview polish, print-only tests                   | anything that changes snapshot binding, template provenance, or report evidence            |
| `apps/web/src/lib/auth.tsx`, `apps/web/src/lib/api-client.ts`                                                                                                                                                                    | Web auth and API transport                                                       | `api-tenancy`    | env docs, low-risk client wiring notes                                | token/session rules, auth redirects, API base URL semantics                                |
| `apps/api/src/common/**`, `apps/api/src/modules/auth/**`, `apps/api/src/modules/organisations/**`, `apps/api/src/modules/projects/**`, `apps/api/src/modules/documents/**`, `apps/api/src/modules/ai/**`                         | Auth, tenant context, membership, shared API infrastructure                      | `api-tenancy`    | DTO docs, narrow controller/service fixes with explicit access checks | tenant scoping, auth guards, prisma extension behavior, project membership enforcement     |
| `apps/api/src/modules/calculations/**`, `apps/api/src/modules/pile-groups/**`, `apps/api/src/modules/pile-capacity/**`                                                                                                           | Calc orchestration, snapshots, pile-domain persistence                           | `calc-guard`     | DTO validation, explicit unsupported-type docs, focused tests         | request hashing, SI normalization, rule-pack resolution, persisted calc outputs            |
| `apps/api/src/modules/reports/**`, `apps/api/src/modules/root-sheet-templates/**`, `apps/api/src/modules/project-spatial/**`, `apps/api/src/modules/environmental-monitoring/**`, `apps/api/src/modules/waste-classification/**` | Evidence bundles, report authoring, template versioning, frozen report snapshots | `report-author`  | copy, serializer tests, documented snapshot handling                  | template version binding, package issue snapshots, source-reference fields                 |
| `apps/api/src/modules/standards/**`, `apps/api/src/modules/imports/**`, `apps/api/src/modules/materials/**`, `apps/api/src/modules/geotech/**`, `apps/api/src/modules/steel-sections/**`, `apps/api/src/modules/rebar/**`        | Standards metadata, approved imports, catalogue data models                      | `domain-sources` | metadata docs, validation tests, non-proprietary schema cleanup       | rule-pack activation, source metadata, any change that could imply licensed content in git |
| `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/**`                                                                                                                                                                 | Database schema and migration history                                            | `api-tenancy`    | schema comments only                                                  | all schema and migration edits                                                             |
| `packages/shared/src/schemas`, `packages/shared/src/types`, `packages/shared/src/units`                                                                                                                                          | Cross-layer contracts and unit helpers                                           | `calc-guard`     | additive docs/tests                                                   | calc types, contract fields, SI/unit behavior                                              |
| `packages/shared/src/standards`                                                                                                                                                                                                  | Shared standards typing/helpers                                                  | `domain-sources` | metadata-only cleanup                                                 | edits that drift from imports or rule-pack usage                                           |
| `apps/calc-engine/app/**`, `apps/calc-engine/tests/**`                                                                                                                                                                           | Deterministic Python engine and golden fixtures                                  | `calc-guard`     | isolated tests, explicit unsupported-type behavior                    | dispatcher map, engine formulas, request/result contracts, golden outputs                  |
| `.github/workflows/**`, `deployment/**`, `scripts/**`, `docs/**`, `README.md`                                                                                                                                                    | CI/CD, docs, repo operations                                                     | `core-platform`  | docs, workflow descriptions, helper scripts                           | deploy logic, migration/deploy sequencing, import templates                                |
| `data/local-imports/README.md`                                                                                                                                                                                                   | Local-only licensed data workflow notes                                          | `domain-sources` | README updates                                                        | any raw licensed file under `data/local-imports/`                                          |
| `infra/terraform/**`                                                                                                                                                                                                             | Cloud infrastructure                                                             | `core-platform`  | docs only in a small PR                                               | infra changes, stateful resources, deploy topology                                         |

## Safe Vs Risky Edit Zones

### Safer zones for a small first PR

- `AGENTS.md`
- `docs/**`
- `.github/workflows/**` documentation updates only
- repo-local skill specs under `.codex/skills/**`
- tests that clarify existing behavior without changing product logic

### Risky zones that deserve a dedicated PR and human review

- `apps/api/prisma/**`
- `apps/api/src/common/tenant/**`
- `apps/api/src/common/prisma/**`
- `apps/api/src/modules/auth/**`
- `apps/api/src/modules/calculations/**`
- `packages/shared/src/types/calculations.ts`
- `packages/shared/src/schemas/calculation-request.ts`
- `apps/calc-engine/app/**`
- `apps/web/src/app/(print)/**`
- `apps/web/src/features/templates/**`
- `apps/api/src/modules/reports/**`
- `apps/api/src/modules/root-sheet-templates/**`
- `apps/api/src/modules/project-spatial/**`
- `apps/api/src/modules/environmental-monitoring/**`

## Known Unknowns

- `infra/terraform/**` exists in the repo architecture and README, but it was not deeply inspected for this doc-only PR
- `scripts/templates/**` is referenced by ADR-007 as part of the licensed-data workflow; this map assigns the lane but does not yet document each template file
- Calc support is intentionally marked as drift-prone because ADR-006 and the live Python dispatcher do not fully match
