# engplatform-core

Repo-local skill spec for Codex/OpenClaw work in EngPlatform.

## Use When

- scoping a task in this monorepo
- deciding which lane owns a change
- updating docs, CI guidance, automation notes, or repo operating rules
- verifying commands before they are documented or recommended

## Read First

- [AGENTS.md](../../../AGENTS.md)
- [docs/architecture/repo-map.md](../../../docs/architecture/repo-map.md)
- [docs/agent-lanes.md](../../../docs/agent-lanes.md)
- [README.md](../../../README.md)

## Workflow

1. Classify the task into one lane before editing.
2. Verify every command against `package.json`, app manifests, `pyproject.toml`, or `.github/workflows/ci.yml`.
3. Keep the PR single-lane unless the task explicitly requires more.
4. Mark unknowns and ADR drift explicitly instead of normalizing them away.
5. Run the smallest verified check that fits the touched files.

## Allowed Edits

- `AGENTS.md`
- `docs/**`
- `.codex/skills/**`
- `README.md`
- `deployment/**`
- `.github/workflows/**`
- `scripts/**`

## Must Not

- change product behavior in `apps/web`, `apps/api`, `apps/calc-engine`, or `packages/shared` unless the task explicitly asks for it
- invent repo commands, branch rules, or calc support claims
- mix docs/process work with schema, tenancy, calc, or reporting logic changes in the same PR

## Required Checks

- `pnpm format:check`
- re-verify command references against manifests and CI when editing operational docs
