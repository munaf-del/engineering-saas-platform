# ADR-005: Catalogue Snapshots and Import Subsystem

**Status:** Accepted  
**Date:** 2026-03-20

## Context

The platform needs to manage engineering catalogues (steel sections, rebar sizes, material grades, geotechnical parameters) that:

1. Are derived from Australian Standards (AS/NZS 3679.1, AS/NZS 4671, AS 3600, etc.)
2. Must not embed proprietary content — only metadata and user-supplied data
3. Must be versioned so projects can pin to a specific snapshot
4. Must support import from CSV, XLSX, and JSON formats
5. Must not silently change data in active projects when new imports occur

## Decision

### Versioned Snapshots

All catalogue data (steel sections, rebar sizes) is organized into **versioned catalog containers**:

- `SteelSectionCatalog` → contains `SteelSection` records
- `RebarCatalog` → contains `RebarSize` records

Each catalog has:
- A `name` + `version` (unique together)
- A `status` lifecycle: `draft` → `active` → `superseded` → `archived`
- A `snapshotHash` computed on activation for integrity verification
- Required `sourceStandard`, `sourceEdition`, and optional `sourceAmendment` for traceability

### Import Subsystem

The import pipeline follows a strict workflow:

1. **Upload & Parse** — Accept CSV/XLSX/JSON; parse into rows
2. **Validate** — Check required fields, types, and traceability metadata (source standard, edition)
3. **Diff Preview** — Compare against existing data; show added/modified/unchanged/removed
4. **Dry Run** — Optional: validate without applying
5. **Apply** — Create a new versioned catalog snapshot; never mutate existing catalogs
6. **Rollback** — Delete the snapshot created by the import

Key guarantees:
- Imports create **new** catalog versions, never modifying existing ones
- Projects pinned to a specific catalog version are unaffected by new imports
- All imports are tracked in `ImportJob` with full audit trail
- Validation errors are stored per-row in `ImportItemError`

### Standards Registry

Standards are modeled as:
- `Standard` — parent entity (e.g., "AS 3600")
- `StandardEdition` — specific edition (e.g., "2018, Amdt 2 (2021)")
- `StandardsProfile` — org-level collection of pinned editions
- `ProjectStandardAssignment` — project-level direct edition pinning

All demo data is marked `is_demo = true` to distinguish from user data.

### Traceability Requirements

All material properties, catalogue entries, and parameter sets require:
- `sourceStandard` — which Australian Standard the data references
- `sourceEdition` — which edition of that standard
- `unit` — measurement unit for every property value

The system fails loudly (400 Bad Request) when these are missing.

## Consequences

- Projects are isolated from catalogue changes via versioned snapshots
- Full audit trail for all import operations
- Rollback capability for any applied import
- No proprietary content stored — only metadata and user-supplied engineering data
- Demo data clearly separated from production data via `is_demo` flag
