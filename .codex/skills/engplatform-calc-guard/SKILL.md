# engplatform-calc-guard

Repo-local skill spec for deterministic calculation and contract safety in EngPlatform.

## Use When

- changing calc request or result contracts
- editing supported calc types
- touching unit normalization, snapshot hashing, or rule-pack resolution
- editing Python engine code, dispatcher behavior, or golden fixtures

## Read First

- [AGENTS.md](../../../AGENTS.md)
- [docs/adr/004-calculation-engine-boundary-and-traceability.md](../../../docs/adr/004-calculation-engine-boundary-and-traceability.md)
- [docs/adr/006-v1-calculation-algorithms.md](../../../docs/adr/006-v1-calculation-algorithms.md)
- [packages/shared/src/types/calculations.ts](../../../packages/shared/src/types/calculations.ts)
- [apps/api/src/modules/calculations/orchestration.service.ts](../../../apps/api/src/modules/calculations/orchestration.service.ts)
- [apps/api/src/modules/calculations/snapshot.service.ts](../../../apps/api/src/modules/calculations/snapshot.service.ts)
- [apps/calc-engine/app/models/calculation.py](../../../apps/calc-engine/app/models/calculation.py)
- [apps/calc-engine/app/engine/dispatcher.py](../../../apps/calc-engine/app/engine/dispatcher.py)

## Workflow

1. Confirm whether the change is contract-only, engine-only, or cross-layer.
2. Align shared TS, Nest DTO/orchestration, and Python models/dispatcher together when contract fields move.
3. Preserve canonical hashing behavior and SI normalization rules unless the task explicitly changes them.
4. Treat unsupported calc types as explicit failures, never silent partial implementations.
5. Call out support-matrix drift between ADR-006 and the live dispatcher when it matters.

## Allowed Edits

- `packages/shared/src/schemas/**`
- `packages/shared/src/types/calculations.ts`
- `packages/shared/src/units/**`
- `apps/api/src/modules/calculations/**`
- `apps/api/src/modules/pile-groups/**`
- `apps/api/src/modules/pile-capacity/**`
- `apps/calc-engine/app/**`
- `apps/calc-engine/tests/**`

## Must Not

- move business rules into the web app
- add DB access, external API calls, randomness, or clock-dependent logic to `apps/calc-engine`
- invent engineering factors or fallback rule values
- change calc contracts without updating tests

## Required Checks

- `pnpm --filter @eng/shared build`
- `pnpm --filter @eng/shared test`
- `pnpm --filter @eng/api test`
- `cd apps/calc-engine && ruff check .`
- `cd apps/calc-engine && mypy app/`
- `cd apps/calc-engine && pytest -v`
