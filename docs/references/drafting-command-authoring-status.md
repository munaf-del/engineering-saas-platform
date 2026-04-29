# Drafting Command Authoring Status Reference

## Current Status

Manual/sketch command-session authoring has been migrated for the current Drafting tool surface on `integration/templates-spatial-annexures-drafting-base` through `32c540a Migrate Drafting soldier pile wall command authoring`.

The migrated tools are:

| Tool                | Command/session boundary                     | Commit convention       | Notes                                                                  |
| ------------------- | -------------------------------------------- | ----------------------- | ---------------------------------------------------------------------- |
| `draft_line`        | primitive two-point command                  | second point            | View-only preview and cancel-safe lifecycle.                           |
| `draft_rectangle`   | primitive two-point command                  | second point            | View-only preview and cancel-safe lifecycle.                           |
| `draft_circle`      | primitive two-point command                  | radius point            | View-only preview and cancel-safe lifecycle.                           |
| `dimension_chain`   | dimension command                            | witness/offset sequence | Existing dimension factory owns derived dimension values.              |
| `draft_polyline`    | generic path command                         | Finish / Enter          | Ordered drafting points only.                                          |
| `draft_polygon`     | generic path command                         | Finish / Enter          | Ordered drafting points only.                                          |
| `section_marker`    | two-point command                            | second point            | Existing section marker factory owns labels and linked drawing fields. |
| `leader_note`       | one-point command                            | placement point         | Existing note factory owns text and label fields.                      |
| `callout`           | one-point command                            | placement point         | Existing callout factory owns label fields.                            |
| `monitoring_point`  | `createManualDraftingPointPlacement`         | placement point         | Manual/sketch point placement only.                                    |
| `structural_joint`  | `createManualDraftingPointPlacement`         | placement point         | Manual/sketch point placement only.                                    |
| `service_crossing`  | `createManualDraftingPointPlacement`         | placement point         | Manual/sketch point placement only.                                    |
| `borehole`          | `createManualDraftingPointPlacement`         | placement point         | Manual/sketch point placement only.                                    |
| `pile`              | `createManualDraftingPointPlacement`         | placement point         | Manual/sketch point placement only.                                    |
| `anchor_tieback`    | `createManualTwoPointEngineeringPlacement`   | second point            | Manual/sketch two-point placement only.                                |
| `excavation_line`   | `createManualPathEngineeringPlacement`       | Finish / Enter          | Ordered path vertices only.                                            |
| `capping_beam`      | `createManualPathEngineeringPlacement`       | Finish / Enter          | Ordered path vertices only.                                            |
| `waler`             | `createManualPathEngineeringPlacement`       | Finish / Enter          | Ordered path vertices only.                                            |
| `service_run`       | `createManualServiceRunPlacement`            | Finish / Enter          | Ordered service vertices only.                                         |
| `secant_pile_wall`  | `createManualGeneratedWallBaselinePlacement` | second point            | Ordered baseline vertices only.                                        |
| `soldier_pile_wall` | `createManualGeneratedWallBaselinePlacement` | second point            | Ordered baseline vertices only.                                        |

## Hardening Coverage

- Command-session tests cover start, preview, commit, insufficient input, duplicate/no-op input, Esc cancel, tool-switch cancel, and preview clearing for the migrated command families.
- Focused tests cover `snapRef`, optional `z`, and optional `rl` pass-through for point, two-point, path, service-run, and generated-wall placement boundaries.
- Focused browser coverage uses isolated temporary QA drawings and confirms save/reload/export behaviour for the migrated authoring paths.
- Migrated semantic renderers used by the browser guards expose stable non-visual object hooks via `data-drafting-object-id` and `data-testid="drafting-object-${id}"`.
- Schedule/export generation remains model-object based; command previews are not persisted model objects.

## Ownership Boundaries

Command/session authoring owns only pointer lifecycle, view-only previews, cancel semantics, and ordered placement payload capture.

The following remain factory-owned or source-owned:

- default IDs, names, labels, notes, and metadata
- service type, service status, authority, depth, level, risk, and source fields
- generated wall pile arrays, pile counts, pile centres/positions, spacing, overlap, pile diameter, section labels, and lagging fields
- schedule rows and export schema
- source-linked/imported placement semantics

## Deferred Work

- Source-linked/imported drafting workflows remain legacy.
- Source adapter normalization remains deferred.
- Generated wall source normalization remains deferred.
- Snap/anchor consolidation remains deferred.
- Renderer contract normalization remains deferred.
- Pile design, generated wall design, and service/source design logic remain deferred.
- Z/RL geotechnical surfaces, strata, cross sections, inferred elevations, and related workflows remain deferred.

## Recommended Next Slice

Run PR/main readiness preparation for the integration branch, including review packaging, final focused regression checks, and any small review-driven fixes. Keep source adapter normalization, renderer contract normalization, snap/anchor consolidation, pile design logic, and Z/RL geotechnical implementation as later slices.
