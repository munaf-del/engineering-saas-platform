# ADR-004: Calculation Engine Boundary and Traceability

**Status:** Accepted
**Date:** 2026-03-20

## Context

Engineering calculations must be deterministic, traceable, and auditable. Regulators and peer reviewers need to verify exactly what inputs, standards, and rules produced a given result.

## Decision

### Calculation Engine as Pure-Function Boundary

The calc-engine (`apps/calc-engine`) is a **stateless, pure-function service**:

- It receives a fully-specified calculation request (inputs + rule pack reference).
- It returns a fully-specified calculation result (outputs + intermediate steps + references).
- It has **no database access**. All data is passed in via the API request.
- It has **no side effects**. The same inputs always produce the same outputs.

### Request/Response Contract

```
CalculationRequest {
  calc_type: enum          // e.g. PILE_CAPACITY, BEAM_CHECK
  inputs: Record<string, InputValue>
  load_combinations: LoadCombination[]
  rule_pack: RulePack      // Full rule data, not a reference
  standards_refs: StandardRef[]
  options: CalcOptions
}

CalculationResult {
  request_hash: string     // SHA-256 of the full request
  outputs: Record<string, OutputValue>
  steps: CalculationStep[] // Ordered intermediate steps
  warnings: Warning[]
  errors: Error[]
  standard_refs_used: ClauseRef[]
  duration_ms: number
}

CalculationStep {
  name: string
  description: string
  formula: string          // LaTeX representation
  inputs: Record<string, Value>
  result: Value
  clause_ref: string       // e.g. "AS 2159 Cl 4.3.1"
  unit: string
}
```

### Immutable Calculation Snapshots

When a calculation is executed:

1. The API assembles the full `CalculationRequest` (resolving materials, loads, rule packs from DB).
2. The API sends the request to calc-engine and receives `CalculationResult`.
3. The API stores both request and result as an **immutable `CalculationRun`** record:
   - `request_snapshot`: JSON blob of the full request
   - `result_snapshot`: JSON blob of the full result
   - `request_hash`: SHA-256 for deduplication and verification
   - `standards_version_ids`: Pinned standard editions used
   - `created_by`, `created_at`: Audit fields
4. The `CalculationRun` record is **never updated or deleted** (soft-delete only for admin).

### Traceability Chain

Every output value can be traced back through:

```
Output Value
  → CalculationStep (formula + clause reference)
    → Input Values (with units and sources)
      → Rule Pack (versioned, with provenance)
        → Standard Edition (metadata in registry)
```

### Load Combination Engine

The calc-engine includes a load combination engine that:

1. Accepts a set of load cases with categories (permanent, imposed, wind, earthquake).
2. Generates combinations per AS/NZS 1170.0 (strength and serviceability).
3. Each combination references the specific clause and factors used.
4. Combinations are included in the `CalculationRequest` — the engine does not query load standards itself.

### Determinism Guarantees

- All floating-point operations use consistent precision (Python `decimal` or NumPy with fixed dtype where exact results matter).
- The request hash allows re-verification: re-running the same request must produce the same hash.
- No random number generation, no external API calls, no clock-dependent logic.

## Consequences

- The API layer does more work assembling requests (resolving references, loading rule packs).
- The calc-engine is simple to test: pure input → output with no mocking needed.
- Calculation snapshots consume storage, but this is required for compliance.
- The LaTeX formula representation in steps enables rich reporting.
- All calc-engine dependencies must be pinned for reproducibility.
