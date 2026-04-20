# Automation Candidates

These are intentionally small, read-mostly automation ideas for the agent operating layer. They are candidates only in this PR, not configured automations. Each one should stay lane-aware, surface unknowns, and avoid making product changes automatically.

## 1. Daily Engineering Brief

- Goal: produce a weekday repo brief for current branch health, open risks, and likely owner lanes
- Suggested cadence: each weekday morning in `Australia/Sydney`
- Read scope:
  - `git status --short`
  - recent local commits
  - `.github/workflows/ci.yml`
  - `AGENTS.md`
  - `docs/agent-lanes.md`
- Output:
  - changed lanes
  - risky files touched
  - commands that should be run next
  - unresolved unknowns
- Guardrails:
  - read-only
  - no automatic branching, commits, or PR creation

## 2. CI And PR Triage

- Goal: classify failing PRs or CI runs by lane and propose the smallest next verification step
- Suggested trigger if configured:
  - PR opened or synchronized
  - CI failure on `main`
- Read scope:
  - `.github/workflows/ci.yml`
  - changed files
  - relevant test logs
  - `docs/architecture/repo-map.md`
- Verified commands it may recommend or run:
  - `pnpm format:check`
  - `pnpm --filter @eng/shared test`
  - `pnpm --filter @eng/api test`
  - `pnpm --filter @eng/web test`
  - `cd apps/calc-engine && ruff check .`
  - `cd apps/calc-engine && mypy app/`
  - `cd apps/calc-engine && pytest -v`
- Guardrails:
  - do not auto-fix code
  - call out tenancy, calc, reporting, or source gates explicitly

## 3. Stale PR Sweep

- Goal: find PRs that have gone quiet and summarize what is blocking them
- Suggested cadence: daily or every weekday afternoon
- Current unknown:
  - stale threshold is not defined in repo policy yet; choose a threshold when the automation is created
- Read scope:
  - PR age
  - last review activity
  - failing checks
  - touched lanes from changed paths
- Output:
  - PRs grouped by owner lane
  - blockers
  - recommended close, refresh, or merge follow-up
- Guardrails:
  - no automatic close or merge

## 4. Domain-Source Freshness Check

- Goal: detect drift in standards/import metadata and source-backed regulatory references
- Suggested cadence: weekly
- Read scope:
  - `apps/api/src/modules/standards/**`
  - `apps/api/src/modules/imports/**`
  - `apps/api/src/modules/materials/**`
  - `apps/api/src/modules/geotech/**`
  - `apps/api/src/modules/rebar/**`
  - `apps/api/src/modules/steel-sections/**`
  - `apps/api/src/modules/waste-classification/**`
  - `docs/references/**`
- Expected outputs:
  - dead or stale source URLs
  - edition drift or missing source metadata
  - areas that need a human engineering/source review
- Guardrails:
  - never auto-insert numeric rule values
  - never commit raw licensed files
  - open a review item instead of rewriting provenance silently

## 5. Golden Calculation Regression Check

- Goal: watch for changes that can break deterministic calc behavior or calc support claims
- Suggested trigger if configured:
  - changes under `packages/shared/src/schemas/**`
  - changes under `packages/shared/src/types/calculations.ts`
  - changes under `apps/api/src/modules/calculations/**`
  - changes under `apps/calc-engine/**`
- Verified commands:
  - `pnpm --filter @eng/shared build`
  - `pnpm --filter @eng/shared test`
  - `pnpm --filter @eng/api test`
  - `cd apps/calc-engine && ruff check .`
  - `cd apps/calc-engine && mypy app/`
  - `cd apps/calc-engine && pytest -v`
- Special checks:
  - compare calc type lists across shared TS, API DTOs, Python models, and Python dispatcher
  - flag hash or golden fixture changes for human review
  - flag support-matrix drift against `docs/adr/006-v1-calculation-algorithms.md`
- Guardrails:
  - no automatic fixture regeneration without review

## 6. Report Export QA

- Goal: catch report/export regressions before users see broken evidence bundles or print layouts
- Suggested trigger if configured:
  - changes under `apps/web/src/app/(print)/**`
  - changes under `apps/web/src/features/environmental/**`
  - changes under `apps/web/src/features/templates/**`
  - changes under `apps/api/src/modules/reports/**`
  - changes under `apps/api/src/modules/root-sheet-templates/**`
  - changes under `apps/api/src/modules/project-spatial/**`
  - changes under `apps/api/src/modules/environmental-monitoring/**`
- Verified commands:
  - `pnpm --filter @eng/web test`
  - `pnpm --filter @eng/api test`
  - `pnpm --filter @eng/web test:e2e`
- Expected outputs:
  - print/export routes touched
  - snapshot/version/source fields touched
  - missing automated coverage or manual QA follow-up
- Current unknown:
  - no repo-local visual PDF/export regression command was found in this PR

## Operating Rules For All Candidates

- Stay lane-aware and keep outputs grouped by lane
- Report unknowns instead of inferring behavior
- Default to read-only summaries unless the user explicitly promotes the automation into a patch workflow
- Treat tenancy, calc determinism, source provenance, and reporting traceability as stop-and-review domains
