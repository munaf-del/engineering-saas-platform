# Drafting Command Authoring Status Reference

## Current Status

The latest Codex slice is a good result. `anchor_tieback` manual/sketch authoring was migrated and pushed at `8f9fea9 Migrate Drafting anchor tieback command authoring`. It reused the two-point engineering placement boundary, preserved `snapRef`/optional `z`/optional `rl`, kept derived values factory/source-owned, did not change schedules/export schema/source adapters, and passed command-session, focused Drafting, Playwright, typecheck, web build, and `git diff --check`.

The older working-plan and carry-over files are now stale as baselines because they stop around `35b605e`, but they are still useful for guardrails: canonical worktree/branch, no side worktrees, no fake engineering/geotechnical values, no unsupported AS claims, preserve optional `z`/`rl`, and treat Z/RL geotechnical sections as future architecture only. The original product plan still frames the Drafting module correctly: project-native semantic engineering objects, not a generic CAD clone, with typed objects as the product value.

## Recommended Prompt Sequence From Here

I would move in this order:

| Order | Codex slice                                                               | Purpose                                                                                                                           | Risk        |
| ----- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 1     | Phase 2R - path-family engineering placement boundary                     | Add a small helper/boundary for manual/sketch path tools before `excavation_line`, `capping_beam`, `waler`, or `service_run`.     | Low         |
| 2     | Phase 2S - migrate `excavation_line` manual/sketch authoring              | First path-family migration. Preserve existing metadata and schedule/export shape.                                                | Medium      |
| 3     | Phase 2T - migrate `capping_beam` manual/sketch authoring                 | Reuse path boundary; keep beam width/level/material factory-owned.                                                                | Medium      |
| 4     | Phase 2U - migrate `waler` manual/sketch authoring                        | Similar to capping beam; keep derived/schedule fields out of command/session.                                                     | Medium      |
| 5     | Phase 2V - service-run source/vertex boundary                             | Add explicit guard for service path provenance before migrating `service_run`.                                                    | Medium-high |
| 6     | Phase 2W - migrate `service_run` manual/sketch path authoring             | Source-sensitive path tool; linked service/source path remains unchanged.                                                         | High        |
| 7     | Phase 2X - generated-wall boundary                                        | Guard generated arrays before touching `secant_pile_wall` / `soldier_pile_wall`.                                                  | High        |
| 8     | Phase 2Y - migrate `secant_pile_wall` authoring only if boundary is safe  | Preserve generated pile semantics; no design calculations.                                                                        | High        |
| 9     | Phase 2Z - migrate `soldier_pile_wall` authoring only if boundary is safe | Same generated-wall discipline.                                                                                                   | High        |
| 10    | Production hardening sweep                                                | Regression, source/schedule/export consistency, QA cleanup, PR readiness.                                                         | Medium      |
| 11    | PDF underlay / revision/export hardening if needed                        | Only after command authoring is stable. The original roadmap treats PDF underlays and revisions/exports as separate later phases. | Medium-high |

## ETA / Prompt Estimate

For an acceptable production-ready drafting beta on the integration branch, not full Z/RL geotechnical cross-sections, I would estimate:

- Minimum: 8-10 more Codex prompts if most slices are clean.
- Realistic: 12-16 prompts, allowing for one or two blocked/flaky/reconciliation prompts.
- Conservative: 18-22 prompts if generated walls, service-run provenance, or export/schedule coupling exposes hidden issues.

In time, assuming current Codex cadence and validation depth:

- Focused command-authoring completion: about 2-4 focused working days.
- Acceptable production beta with regression/hardening: about 5-10 focused working days.
- Full production with Z/RL geotechnical sections, strata/surfaces, and report-grade geotech workflows: a separate larger phase, likely several additional weeks, because that needs data contracts for vertical datum, surface/contact models, borehole strata intervals, section projection, and provenance. The AS2159 reference supports future pile/geotech skill and schema work, but current drafting slices should not implement AS2159 calculations or compliance claims.
