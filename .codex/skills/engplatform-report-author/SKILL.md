# engplatform-report-author

Repo-local skill spec for reports, templates, print/export flows, and source-traceable authoring.

## Use When

- editing calculation reports or evidence bundles
- changing root sheet templates, project spatial sheets, or annexure behavior
- updating environmental monitoring or waste-classification authoring flows
- changing print/export routes or report preview components

## Read First

- [AGENTS.md](../../../AGENTS.md)
- [docs/architecture/repo-map.md](../../../docs/architecture/repo-map.md)
- [apps/api/src/modules/reports/reports.service.ts](../../../apps/api/src/modules/reports/reports.service.ts)
- [apps/api/src/modules/project-spatial/project-spatial.service.ts](../../../apps/api/src/modules/project-spatial/project-spatial.service.ts)
- [apps/api/src/modules/environmental-monitoring/environmental-monitoring.service.ts](../../../apps/api/src/modules/environmental-monitoring/environmental-monitoring.service.ts)

## Workflow

1. Preserve version binding and snapshot fields before changing any serializer or authoring flow.
2. Preserve source labels, source references, source URLs, AI-document links, and clause references.
3. Treat report package issues, annexures, and template snapshots as frozen evidence unless the task explicitly changes versioning behavior.
4. Keep UI polish changes separate from report data model changes whenever possible.

## Allowed Edits

- `apps/api/src/modules/reports/**`
- `apps/api/src/modules/root-sheet-templates/**`
- `apps/api/src/modules/project-spatial/**`
- `apps/api/src/modules/environmental-monitoring/**`
- `apps/api/src/modules/waste-classification/**`
- `apps/web/src/app/(print)/**`
- `apps/web/src/features/environmental/**`
- `apps/web/src/features/templates/**`
- `apps/web/src/features/spatial/**`

## Must Not

- drop evidence bundle fields, template version ids, or source provenance to simplify a UI flow
- silently recompute frozen report snapshots in place
- mix report-authoring work with calc hashing or tenancy refactors

## Required Checks

- `pnpm --filter @eng/api test`
- `pnpm --filter @eng/web test`
- `pnpm --filter @eng/web test:e2e` when print/export flows changed and the environment is available
