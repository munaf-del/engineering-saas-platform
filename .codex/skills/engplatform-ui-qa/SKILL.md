# engplatform-ui-qa

Repo-local skill spec for web verification, preview QA, and print/export checks.

## Use When

- validating UI-only work
- checking report previews or print/export routes
- adding or tightening frontend automated coverage
- acting as the support lane for a `web-ui` or `report-author` PR

## Read First

- [AGENTS.md](../../../AGENTS.md)
- [docs/agent-lanes.md](../../../docs/agent-lanes.md)
- [apps/web/package.json](../../../apps/web/package.json)
- [apps/web/playwright.config.ts](../../../apps/web/playwright.config.ts)

## Workflow

1. Identify whether the change is app UI, print/export, or auth/transport related.
2. Prefer tests and reproducible QA notes over subjective descriptions.
3. Flag missing environment prerequisites instead of pretending E2E coverage ran.
4. If a bug points to backend, calc, or provenance logic, hand it back to the owning lane.

## Allowed Edits

- `apps/web/**/*.test.*`
- `apps/web/**/*.spec.*`
- `apps/web/playwright.config.ts`
- small UI-only fixes inside the owning lane's approved scope
- QA docs and checklists

## Must Not

- change API contracts, schema, calc engine code, or source metadata
- hide a backend or calc defect by loosening assertions without explanation

## Required Checks

- `pnpm --filter @eng/web test`
- `pnpm --filter @eng/web test:e2e` when the environment is available
