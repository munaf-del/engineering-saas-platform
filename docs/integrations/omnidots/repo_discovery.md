# Omnidots Honeycomb Repo Discovery

## Scope

This note converts the generic Omnidots Honeycomb connector plan into repo-specific guidance for the Engineering SaaS Platform.

Discovery inputs:

- `/Users/munaf/omnidots/omnidots_saas_connector_plan.md`
- `/Users/munaf/omnidots/codex_prompts_omnidots_connector.md`

This document is intentionally implementation-oriented. It identifies where Omnidots should fit in the current stack, which files are likely to change, and where the generic plan does not match the repo as it exists today.

## Stack Summary

| Area             | Repo shape today                                                                                                              | Omnidots implication                                                                                                                        |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Web              | `apps/web` is Next.js 16 + React 19 + TypeScript, using TanStack Query and a small typed `api()` wrapper                      | Any connector UI should follow the existing hook + feature-workspace pattern rather than adding a separate frontend client stack            |
| API              | `apps/api` is NestJS 10 + TypeScript, with module-local services/controllers and direct server-side `fetch` for outbound HTTP | Omnidots API access should live in a Nest module with DTOs/services, not in the web app                                                     |
| DB               | PostgreSQL via Prisma schema + timestamped Prisma migrations in `apps/api/prisma/migrations`                                  | Omnidots persistence belongs in Prisma models + a dedicated migration PR                                                                    |
| Shared contracts | `packages/shared` exports shared schemas/types/standards helpers, but not every web/API DTO is centralized there              | Keep raw Omnidots provider types in the API module first; only promote normalized cross-layer contracts if both web and API truly need them |
| Calc engine      | `apps/calc-engine` is FastAPI/Python 3.12 and is a deterministic compute boundary                                             | Omnidots work should not involve the calc engine for MVP                                                                                    |

## Verified Repo Patterns

### 1. Framework, language, runtime

- Workspace root uses `pnpm` + `turbo`.
- API global prefix is `/api/v1` in `apps/api/src/main.ts`.
- Environment config uses Nest `ConfigModule.forRoot()` in `apps/api/src/app.module.ts`.
- The web app talks to the API through `apps/web/src/lib/api-client.ts`.

### 2. Database and migration tool

- Prisma schema lives in `apps/api/prisma/schema.prisma`.
- Migrations use timestamped directory names such as `20260411050419_add_environmental_monitoring_reports`.
- Existing migration history shows recent report-authoring tables were added incrementally rather than through one large generic subsystem.

### 3. Existing integration/provider patterns

There is no repo-wide "integrations" framework today.

Observed outbound-provider patterns:

- `apps/api/src/modules/calculations/calc-engine.client.ts`
  - dedicated client service
  - `ConfigService` base URL
  - direct `fetch`
  - explicit timeout/error handling
- `apps/api/src/modules/waste-classification/nsw-ass-autofill.service.ts`
  - module-local external HTTP integration
  - `Logger`
  - response-shape handling inline
- `apps/api/src/modules/ai/providers/*`
  - the only current provider registry abstraction
  - provider-specific adapters + registry
  - organisation-scoped credentials

Important conclusion:

- The AI provider registry is specific to AI runtime selection and is not a generic external-provider platform.
- Omnidots should not try to force a generic provider framework into the repo as a first slice.
- A focused Omnidots module is a better fit than a broad "all integrations" abstraction.

### 4. Existing report-generation patterns

There are two relevant patterns already in the repo:

1. Calculation reports
   - `apps/api/src/modules/reports/reports.service.ts`
   - `apps/api/prisma/schema.prisma` `CalculationReport` + `CalculationSnapshot`
   - immutable evidence bundle and snapshot hashes already exist here

2. Environmental authored reports
   - `apps/api/src/modules/environmental-monitoring/*`
   - `ProjectEnvironmentalMonitoringReport` plus nested reference/location/result rows
   - project-scoped authored content, not imported time-series datasets

Important conclusion:

- The repo already has a project environmental monitoring report workspace, but it does not yet have a frozen monitoring dataset snapshot model.
- Omnidots should feed this report-authoring lane through a new dataset/persistence layer, not by stuffing provider payloads into existing free-text report fields.

### 5. Background job / queue system

No dedicated queue/scheduler infrastructure was found.

What exists today:

- `ImportJob` is a persisted status table for catalogue imports in `apps/api/prisma/schema.prisma`.
- `apps/api/src/modules/imports/imports.service.ts` runs validation/apply flow inside the API service layer.
- No `Bull`, `BullMQ`, `@nestjs/schedule`, cron workers, or processor classes were found in `apps/api`.

Important conclusion:

- The generic plan assumes queued background jobs; this repo currently does not have that substrate.
- MVP should prefer user-triggered sync/fetch operations with persisted job rows and deterministic re-runs.
- Real asynchronous workers can be added later if sync times become a problem.

### 6. Existing encryption / secrets utilities

The clearest reusable pattern is the organisation AI credential store:

- `apps/api/src/modules/organisations/organisation-ai-assistant-credential-store.service.ts`
- `apps/api/src/modules/organisations/organisation-ai-settings.ts`
- Prisma table `organisation_ai_assistant_provider_credentials`

Verified behavior:

- credentials are encrypted with AES-256-GCM
- encryption key derives from `AI_ORG_CREDENTIALS_SECRET` or falls back to `JWT_SECRET`
- encrypted payload is stored as JSON
- callers never receive the decrypted secret back in API responses

Important conclusion:

- Omnidots token storage should reuse this pattern rather than inventing a new crypto scheme.
- Because Omnidots auth is passed as a query parameter, URL redaction needs to be stricter than current outbound clients.

### 7. Existing chart / data API conventions

Observed conventions:

- web data fetching uses TanStack Query hooks such as `apps/web/src/hooks/use-environmental-monitoring.ts`
- API responses are plain JSON from REST endpoints
- front-end feature types are often local to the feature, for example `apps/web/src/features/environmental/environmental-monitoring-types.ts`
- decimal-like database values are often returned as strings in web-facing types

Also notable:

- `recharts` is installed in `apps/web/package.json`
- no current Recharts chart component usage was found in `apps/web/src`

Important conclusion:

- We can add chart DTOs and chart components without fighting an existing charting abstraction.
- Omnidots time-series payloads should be normalized into repo-owned chart/data shapes before they reach the UI.

### 8. Test framework and fixture patterns

| Area        | Current pattern                                   | Omnidots test fit                                                                           |
| ----------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| API         | Jest unit specs with mocked Prisma/services/fetch | Best place for client redaction tests, response-shape parsing tests, and sync service tests |
| Web         | Vitest component/helper tests with module mocks   | Good fit for connector form state and report dataset preview tests                          |
| Shared      | Vitest for pure TS helpers                        | Only needed if normalized DTO helpers move into `packages/shared`                           |
| Calc engine | Pytest + mypy + ruff                              | Not relevant for Omnidots MVP                                                               |

Examples inspected:

- `apps/api/src/modules/waste-classification/waste-classification.service.spec.ts`
- `apps/api/src/modules/ai/providers/assistant-providers.spec.ts`
- `apps/web/src/features/environmental/waste-classification-preview.test.tsx`

## Recommended Omnidots Shape In This Repo

### Module placement

Recommended first implementation path:

- create a dedicated Nest module under `apps/api/src/modules/omnidots/`
- keep provider-specific client/types/validators inside that module
- keep environmental report binding in the existing `apps/api/src/modules/environmental-monitoring/` module
- keep organisation credential lifecycle organisation-scoped, not project-scoped

Why this fits the repo better than a generic `src/integrations/*` tree:

- current API code is organized by Nest modules under `apps/api/src/modules/*`
- there is no existing cross-domain integrations package to extend
- Omnidots touches both organisation credentials and project report datasets, so a dedicated module keeps the provider code contained while allowing report-authoring integration later

### Route placement

Recommended API split:

- organisation-scoped connection routes under an Omnidots controller
  - example shape: `/api/v1/organisations/:id/omnidots-connections`
- project/report-scoped dataset routes added to environmental monitoring
  - example shape: `/api/v1/projects/:projectId/environmental/monitoring/:reportId/datasets`

This matches the current repo split:

- organisation settings already exist under `organisations/:id/*`
- environmental monitoring report authoring already lives under `projects/:projectId/environmental/monitoring/*`

### Raw vs normalized types

Recommended contract split:

- raw Omnidots API response types stay API-local inside `apps/api/src/modules/omnidots/`
- normalized monitoring dataset DTOs can stay API-local at first and be mirrored in `apps/web/src/features/environmental/environmental-monitoring-types.ts`
- only promote types into `packages/shared` if we later need shared parsing/validation across multiple lanes

## Exact Files And Directories To Modify

These are the concrete repo locations the Omnidots work should touch.

### Discovery slice

- `docs/integrations/omnidots/repo_discovery.md`

### API foundation slice

- `apps/api/src/app.module.ts`
- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/<timestamp>_add_omnidots_connector/`
- `apps/api/src/modules/omnidots/omnidots.module.ts`
- `apps/api/src/modules/omnidots/omnidots.controller.ts`
- `apps/api/src/modules/omnidots/omnidots.service.ts`
- `apps/api/src/modules/omnidots/dto/*.ts`
- `apps/api/src/modules/omnidots/client/omnidots.client.ts`
- `apps/api/src/modules/omnidots/client/omnidots.types.ts`
- `apps/api/src/modules/omnidots/client/omnidots.validators.ts`
- `apps/api/src/modules/omnidots/client/omnidots.redaction.ts`
- `apps/api/src/modules/omnidots/client/omnidots.errors.ts`
- `apps/api/src/modules/omnidots/*.spec.ts`

### Credential and tenancy-sensitive slice

- `apps/api/src/modules/organisations/organisation-ai-settings.ts` or a new sibling helper reused for encrypted connector secrets
- `apps/api/src/modules/organisations/organisation-ai-assistant-credential-store.service.ts` only if shared credential-store helpers are extracted
- explicit project/org access checks inside new Omnidots services

### Report-author integration slice

- `apps/api/src/modules/environmental-monitoring/environmental-monitoring.module.ts`
- `apps/api/src/modules/environmental-monitoring/environmental-monitoring.controller.ts`
- `apps/api/src/modules/environmental-monitoring/environmental-monitoring.service.ts`
- `apps/api/src/modules/environmental-monitoring/dto/environmental-monitoring.dto.ts`

### Web slice

- `apps/web/src/lib/api-client.ts` only if new endpoint/query helper behavior is needed
- `apps/web/src/hooks/use-environmental-monitoring.ts`
- `apps/web/src/features/environmental/environmental-monitoring-types.ts`
- `apps/web/src/features/environmental/environmental-monitoring-workspace.tsx`
- `apps/web/src/features/environmental/monitoring-reports-panel.tsx`
- `apps/web/src/app/(app)/projects/[id]/environmental/monitoring/[reportId]/page.tsx`
- new organisation integration settings page if we decide to expose token management in the web app

### Optional later slices

- `apps/api/src/modules/imports/*` only for CSV/XLSX fallback, not MVP
- `packages/shared/src/types/*` only if normalized monitoring chart/dataset contracts become cross-lane shared

## Recommended Implementation Sequence

Recommended sequence for this repo:

1. Doc-only discovery
   - complete this file first
   - keep the first PR in the safe `core-platform` lane

2. Thin API-only provider slice
   - add `apps/api/src/modules/omnidots/` with constants, raw response types, validators, fixtures, and redaction helpers
   - add unit tests with mocked payloads
   - no database work yet

3. Dedicated Prisma migration PR
   - add organisation-scoped Omnidots connection storage
   - add measuring point / series / sample / dataset snapshot tables
   - do not mix unrelated report-author or web UI work into this schema PR

4. Secure credential + token validation slice
   - implement encrypted token storage
   - add `token_details` validation
   - add explicit log redaction for any URL or error containing `token`

5. Manual sync / fetch slice
   - sync measuring points and sensors
   - fetch peak / VDV / Veff records on user action
   - persist normalized samples and import job records
   - stay synchronous/manual unless real performance data forces queue infrastructure

6. Report dataset builder slice
   - add frozen monitoring dataset snapshots tied to environmental monitoring reports
   - keep source provider, connection, measuring point ids, period, timezone, criteria version, and dataset hash
   - avoid mutating authored report text when rebuilding datasets

7. Web integration slice
   - add token-management UI
   - add measuring-point selection and fetch flow
   - add report dataset preview and chart/table rendering inside the environmental monitoring workspace

8. Optional follow-up slices
   - traces appendix
   - CSV/XLSX fallback
   - scheduled sync / worker infrastructure

## Storage Decisions Made In This Slice

The storage slice implemented on 2026-04-21 made these concrete choices:

- Omnidots connections are stored in a dedicated `omnidots_provider_connections` table rather than reusing the AI credential table or inventing a repo-wide provider platform.
- Connection secrets are stored in an `encrypted_credentials` JSON field so later service code can reuse the existing AES-GCM organisation-secret approach without storing plaintext tokens.
- Synced inventory lives in `omnidots_measuring_points`, keyed by `connection_id + external_measuring_point_id`.
- Normalized monitoring data uses generic `monitoring_series` and `monitoring_samples` tables so later report code can query provider-owned time-series data without coupling directly to raw Omnidots payload shapes.
- Peak-record dominant frequency values are stored alongside normalized samples as `fdom_x/y/z` fields, which keeps the first import slice simple while still supporting later chart/table derivation.
- Import/audit status uses a dedicated `monitoring_import_jobs` table instead of reusing `import_jobs`, because the existing import subsystem is catalogue/file-approval oriented rather than provider-sync oriented.
- Frozen report attachments land in `project_environmental_monitoring_datasets`, attached to the existing environmental monitoring report model and retaining `dataset_hash` plus `snapshot_json`.
- Report datasets keep nullable links to the source connection and measuring point with `SET NULL` semantics so frozen report snapshots can survive later connection or sync-inventory cleanup.

## API Client And Import Decisions Made In This Slice

The secure client/import slice implemented on 2026-04-21 made these concrete choices:

- Live Omnidots HTTP access now lives in `apps/api/src/modules/omnidots/omnidots.client.ts`, with service orchestration in `apps/api/src/modules/omnidots/omnidots.service.ts`, DTOs in `apps/api/src/modules/omnidots/dto/omnidots-connection.dto.ts`, and org-scoped connection endpoints in `apps/api/src/modules/omnidots/omnidots.controller.ts`.
- The Omnidots credential helper in `apps/api/src/modules/omnidots/omnidots.credentials.ts` mirrors the existing organisation AI credential pattern exactly where it matters: AES-256-GCM encryption, SHA-256 key derivation, and `AI_ORG_CREDENTIALS_SECRET` falling back to `JWT_SECRET`. It is implemented locally rather than imported from the AI settings module so the Omnidots lane stays decoupled from unrelated AI-runtime/test dependencies.
- Raw Omnidots tokens are never logged, serialized into import jobs, stored in plaintext, or returned from controller responses. URL and error sanitization is centralized in `apps/api/src/modules/omnidots/omnidots.redaction.ts`.
- The client treats Omnidots `ok: false` payloads as typed application errors with redacted metadata and applies request timeouts before surfacing network/service failures.
- Manual connection validation writes `monitoring_import_jobs` rows with `validate_token`, updates connection status to `active`, `invalid`, or `error`, and stores only redacted `last_error`.
- Measuring-point sync is organisation-scoped through the connection row, decrypts the token only in memory, upserts `omnidots_measuring_points`, preserves `raw_payload_json`, and records created/updated counts in `monitoring_import_jobs`.
- Peak, VDV, and Veff imports normalize into one `monitoring_series` row per metric/source endpoint and one `monitoring_samples` row per series/timestamp, using upserts to keep the imports idempotent.
- Peak records store `Vtop` in `x/y/z` and `Fdom` in `fdom_x/y/z`. VDV and Veff preserve full raw provider payloads in `raw_payload_json` instead of adding dedicated weighting-period columns in this slice.
- Frozen report dataset snapshots are built from already imported samples and hashed with the same canonical JSON hashing approach already used by `SnapshotService`.

### Out Of Scope In This Slice

- frontend UI for token management, measuring-point selection, sample import, or dataset preview
- scheduled/background sync infrastructure
- detailed trace ingestion or object-storage handling for 1 kHz trace arrays
- automatic report-row population from imported datasets

## Risks And Mismatches Against The Generic Plan

### 1. No generic queue system exists

The generic plan assumes queued jobs and scheduled syncs. The repo currently has no queue worker framework, so "job" should initially mean persisted status rows plus explicit user-triggered service execution.

### 2. No generic integration/provider platform exists

The repo has AI provider abstractions, but nothing reusable enough to justify a generic Omnidots-plus-future-providers framework in the first PR. Over-abstraction would slow delivery.

### 3. Environmental monitoring is authored-report oriented today

`ProjectEnvironmentalMonitoringReport` currently stores manually authored report content and row tables. There is no existing normalized imported-sample model or frozen monitoring dataset snapshot table.

### 4. Existing `ImportJob` is not a clean fit for Omnidots fetches

`ImportJob` is tightly coupled to catalogue ingestion, approvals, and file formats. Reusing it directly for provider sync/fetch work would blur concepts. A dedicated monitoring import/fetch job table is safer.

### 5. Tenancy is not auto-enforced for new models

Per `AGENTS.md`, Prisma tenant auto-scoping currently covers only a small subset of models. Any new Omnidots tables will need explicit `organisationId` and `projectId` filtering or carefully reviewed Prisma-extension changes.

### 6. Query-string token auth is a logging hazard

Existing outbound clients sometimes log URLs or raw error text. Omnidots requires `token` in the query string, so we need a dedicated redaction helper before any live API call code lands.

### 7. No centralized feature-flag framework exists

The repo uses ad hoc env checks such as `AI_FEATURE_ENABLED`. If Omnidots needs a feature switch, it should start as a simple config flag, not a new flagging subsystem.

### 8. Chart conventions exist only loosely

The web app already has TanStack Query and typed feature models, but no existing monitoring chart library or payload standard. We will need to define and own that normalized shape.

## Recommended PR Boundaries

To stay within repo operating rules, split the work like this:

- PR 1: `core-platform`
  - this discovery doc only
- PR 2: schema-focused Omnidots storage
  - Prisma + new API module skeleton
- PR 3: secure token validation + manual sync APIs
  - `api-tenancy` plus dedicated review for credential handling
- PR 4: environmental report dataset binding + web UI
  - `report-author`
- PR 5: optional traces / CSV fallback / scheduling

## First Production Slice After This Doc

The safest next coding slice is:

1. add `apps/api/src/modules/omnidots/` with constants, raw response types, zod-style validators, redaction helper, and mocked fixtures
2. keep it API-only and test-only
3. defer Prisma, web UI, and live credentials until those types and fixtures are stable

That sequencing matches the prompt pack and keeps risk low while we pin down response shapes before touching tenancy-sensitive storage.
