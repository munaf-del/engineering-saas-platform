# engplatform-domain-sources

Repo-local skill spec for standards, imports, catalogue metadata, and source-backed domain content.

## Use When

- editing standards metadata or import workflows
- touching materials, geotech, rebar, or steel catalogue models
- updating source-backed environmental or waste-classification reference content
- reviewing provenance rules for licensed or regulated content

## Read First

- [AGENTS.md](../../../AGENTS.md)
- [docs/adr/003-standards-registry-and-licensed-data.md](../../../docs/adr/003-standards-registry-and-licensed-data.md)
- [docs/adr/007-licensed-data-ingestion-workflow.md](../../../docs/adr/007-licensed-data-ingestion-workflow.md)
- [docs/architecture/repo-map.md](../../../docs/architecture/repo-map.md)

## Workflow

1. Confirm whether the repo should contain metadata only or a workflow description, not licensed raw content.
2. Preserve source metadata such as standard code, edition, source dataset identifier, effective date, and explicit URLs or notes.
3. Verify provenance behavior against current repo code and tests where available; if a source cannot be verified, mark it as unknown instead of synthesizing a replacement.
4. Route numeric rule or formula changes through `engplatform-calc-guard` when they affect calculations.

## Allowed Edits

- `apps/api/src/modules/standards/**`
- `apps/api/src/modules/imports/**`
- `apps/api/src/modules/materials/**`
- `apps/api/src/modules/geotech/**`
- `apps/api/src/modules/steel-sections/**`
- `apps/api/src/modules/rebar/**`
- `packages/shared/src/standards/**`
- `docs/references/**`
- metadata-only docs and tests

## Must Not

- commit raw licensed files from `data/local-imports/**`
- paste copyrighted standards text or proprietary catalogue data into git
- invent rule values, editions, or provenance
- bypass approval and activation language for rule packs

## Required Checks

- `pnpm format:check` for docs-only changes
- `pnpm --filter @eng/api test` when API modules or provenance logic changes
