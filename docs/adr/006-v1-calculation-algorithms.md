# ADR-006: v1 Calculation Algorithms

**Status:** Accepted  
**Date:** 2026-03-20

## Context

The platform needs real engineering calculation algorithms wired into the
`calc-engine` service. ADR-004 established the stateless, deterministic
calc-engine boundary; this ADR covers the first set of concrete algorithms
registered against that boundary.

## Decision

### Supported v1 Calculators

| CalcType     | Calculator         | Status      |
|--------------|--------------------|-------------|
| `pile_group` | Pile Group v1      | Implemented |

Other CalcType values (`pile_capacity`, `pile_settlement`, etc.) remain in
the dispatcher as `CALC_TYPE_NOT_IMPLEMENTED` until future prompts add them.

### Load Combination Engine

Lives in `app/engine/load_combinations.py`. Responsibilities:

- Parse load case actions from the flat `inputs` dict using the key
  convention `lc_{loadCaseId}_{direction}` (directions: N, Vx, Vy, Mx, My, T).
- Validate that every `loadCaseId` referenced by combination factors has
  corresponding action data in the inputs.
- Apply combination factors: `F_combined = Σ(factor_i × F_loadcase_i)`.
- Support both strength and serviceability limit states.
- Return validation errors for missing references — never assume values.

### Pile Group Reaction Distribution

Lives in `app/engine/pile_group.py`. v1 assumptions (explicitly documented
in code and in every result payload):

1. **Rigid pile cap** — cap deformation neglected.
2. **Equal axial stiffness** — all piles have the same EA/L.
3. **Vertical piles only** — no raked piles.
4. **Pinned pile heads** — no moment transfer from cap to pile.
5. **Equal lateral stiffness** — shear distributed equally.
6. **Torsion proportional to distance** — Vi_T = T·ri / Σri².

Governing equations:

```
Ni  = N/n + Mx·yi/Σyi² + My·xi/Σxi²
Vxi = Vx/n − T·yi/Σri²
Vyi = Vy/n + T·xi/Σri²
```

Layout modes:
- **Grid:** `grid_nx`, `grid_ny`, `grid_spacing_x`, `grid_spacing_y`
- **Explicit:** `pile_count`, `pile_{i}_x`, `pile_{i}_y`

### Pile Design Checks

Lives in `app/engine/pile_design_check.py`. Checks run against envelope
reactions. All reduction factors come from the rule pack.

| Check Type                 | Demand          | Capacity              | Rule Pack Key       |
|----------------------------|-----------------|-----------------------|---------------------|
| `geotechnical_compression` | Max compression | φ_g,c · R_ug,c        | `phi_g_compression` |
| `geotechnical_tension`     | Max tension     | φ_g,t · R_ug,t        | `phi_g_tension`     |
| `geotechnical_lateral`     | Max shear       | φ_g,l · R_ug,l        | `phi_g_lateral`     |
| `structural_rc`            | Max compression | φ_s,rc · N_u          | `phi_s_rc`          |
| `structural_steel`         | Max compression | φ_s,steel · N_u       | `phi_s_steel`       |

Output per check:
- `utilisationRatio` = demand / capacity
- `reserveCapacity` = capacity − demand
- `status`: `pass` (≤0.9), `warning` (0.9–1.0), `fail` (>1.0)
- `governingCombination`
- `clauseRef` from rule pack entry

If a reduction factor is missing from the rule pack, the check is skipped
with a warning — never assumed.

### Design Check Persistence

The API `OrchestrationService` reads `designChecks[]` from the calc-engine
result and persists `PileDesignCheck` records in the database.

### Calculator Registry Seed

`CalculatorsService.seedV1Calculators()` creates the `pile-group-v1`
calculator definition and version if they don't already exist. Endpoint:
`POST /api/v1/calculators/seed/v1`.

## Consequences

- Only `pile_group` is implemented; other calc types return
  `CALC_TYPE_NOT_IMPLEMENTED`.
- Structural checks are axial-only in v1; combined N-M interaction diagrams
  are a v2 item.
- Raked piles, variable pile stiffness, and flexible cap analysis are
  explicitly out of scope.
- No proprietary standards text or guessed coefficients are embedded — all
  factors come from the rule pack.
