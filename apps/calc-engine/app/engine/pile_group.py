"""
Pile group reaction distribution calculator — rigid cap v1.

Assumptions (explicitly stated and returned in result metadata):
  1. Rigid pile cap — the cap does not deform; pile head displacements
     are governed entirely by rigid-body translation and rotation.
  2. All piles are identical in axial stiffness. If piles have different
     stiffness, a weighted formulation is required (not in v1).
  3. Piles are vertical (rake angle = 0). Raked piles are not supported in v1.
  4. Pile head fixity is pin (no moment transfer from cap to pile head).
  5. Lateral load distributed equally among all piles (rigid cap, equal stiffness).
  6. Torsion distributed proportional to distance from group centroid.

Coordinate system:
  - X, Y in the horizontal plane (plan view).
  - Z vertical (positive upward — tension positive, compression negative
    by structural convention). In the output, compression is reported as
    positive magnitude for compatibility with geotechnical convention.
  - Moments: Mx about X-axis, My about Y-axis, T about Z-axis.

Sign convention for applied actions (at pile-cap centroid):
  - N  positive = compression (downward load on cap)
  - Vx positive = horizontal force in +X
  - Vy positive = horizontal force in +Y
  - Mx positive = moment causing compression at +Y piles
  - My positive = moment causing compression at +X piles
  - T  positive = clockwise torsion viewed from above

Layout modes:
  - Grid:     provide grid_nx, grid_ny, grid_spacing_x, grid_spacing_y
  - Explicit: provide pile_count, pile_{i}_x, pile_{i}_y (1-indexed)
"""

from __future__ import annotations

import math
import time
from dataclasses import dataclass, field
from typing import TYPE_CHECKING

import numpy as np

from app.engine.load_combinations import (
    CombinedActions,
    generate_combined_actions,
    parse_load_case_actions,
)
from app.engine.pile_design_check import run_design_checks
from app.models.calculation import (
    ACTIONS,
    CalcError,
    CalcWarning,
    CalculationRequest,
    CalculationResult,
    CalculationStep,
    ClauseReference,
    DesignCheckResult,
    InputValue,
    OutputValue,
)

if TYPE_CHECKING:
    pass

V1_ASSUMPTIONS = [
    "Rigid pile cap (cap deformation neglected).",
    "All piles assumed to have equal axial stiffness.",
    "All piles vertical (rake angle = 0).",
    "Pile heads are pinned (no moment transfer from cap to individual pile heads).",
    "Lateral load distributed equally among piles (equal lateral stiffness assumed).",
    "Torsion distributed proportional to pile distance from group centroid.",
]


@dataclass
class PilePosition:
    index: int
    x: float
    y: float
    label: str


@dataclass
class PileReactions:
    """Per-pile reaction for a single load combination."""

    pile_index: int
    N: float = 0.0
    Vx: float = 0.0
    Vy: float = 0.0


@dataclass
class CombinationReactions:
    combination_id: str
    combination_name: str
    limit_state: str
    pile_reactions: list[PileReactions] = field(default_factory=list)


@dataclass
class EnvelopeEntry:
    pile_index: int
    max_compression: float = 0.0
    max_tension: float = 0.0
    max_shear: float = 0.0
    governing_compression_combo: str = ""
    governing_tension_combo: str = ""
    governing_shear_combo: str = ""


def _get_input(inputs: dict[str, InputValue], key: str) -> float | None:
    iv = inputs.get(key)
    return iv.value if iv is not None else None


def _require_input(
    inputs: dict[str, InputValue], key: str, errors: list[CalcError]
) -> float | None:
    val = _get_input(inputs, key)
    if val is None:
        errors.append(
            CalcError(
                code="MISSING_INPUT",
                message=f"Required input '{key}' is missing.",
            )
        )
    return val


def parse_pile_positions(
    inputs: dict[str, InputValue],
) -> tuple[list[PilePosition], list[CalcError], list[CalcWarning]]:
    """Parse pile layout from inputs. Supports grid and explicit modes."""
    errors: list[CalcError] = []
    warnings: list[CalcWarning] = []
    positions: list[PilePosition] = []

    grid_nx = _get_input(inputs, "grid_nx")
    grid_ny = _get_input(inputs, "grid_ny")
    pile_count = _get_input(inputs, "pile_count")

    if grid_nx is not None and grid_ny is not None:
        nx = int(grid_nx)
        ny = int(grid_ny)
        if nx < 1 or ny < 1:
            errors.append(
                CalcError(code="INVALID_GRID", message="grid_nx and grid_ny must be >= 1.")
            )
            return positions, errors, warnings

        sx = _get_input(inputs, "grid_spacing_x")
        sy = _get_input(inputs, "grid_spacing_y")
        if sx is None or sy is None:
            errors.append(
                CalcError(
                    code="MISSING_INPUT",
                    message="grid_spacing_x and grid_spacing_y are required for grid layout.",
                )
            )
            return positions, errors, warnings

        idx = 0
        for iy in range(ny):
            for ix in range(nx):
                x = ix * sx - (nx - 1) * sx / 2.0
                y = iy * sy - (ny - 1) * sy / 2.0
                idx += 1
                positions.append(PilePosition(index=idx, x=x, y=y, label=f"P{idx}"))

    elif pile_count is not None:
        n = int(pile_count)
        if n < 1:
            errors.append(
                CalcError(code="INVALID_PILE_COUNT", message="pile_count must be >= 1.")
            )
            return positions, errors, warnings

        for i in range(1, n + 1):
            x_val = _get_input(inputs, f"pile_{i}_x")
            y_val = _get_input(inputs, f"pile_{i}_y")
            if x_val is None or y_val is None:
                errors.append(
                    CalcError(
                        code="MISSING_INPUT",
                        message=f"pile_{i}_x and pile_{i}_y required for pile {i}.",
                    )
                )
            else:
                label_iv = inputs.get(f"pile_{i}_label")
                label = f"P{i}" if label_iv is None else f"P{i}"
                positions.append(PilePosition(index=i, x=x_val, y=y_val, label=label))
    else:
        errors.append(
            CalcError(
                code="NO_LAYOUT",
                message=(
                    "Pile layout not specified. Provide grid_nx/grid_ny for grid layout "
                    "or pile_count with pile_{i}_x/pile_{i}_y for explicit layout."
                ),
            )
        )

    if not errors and len(positions) < 1:
        errors.append(CalcError(code="NO_PILES", message="No pile positions resolved."))

    return positions, errors, warnings


def compute_reactions(
    piles: list[PilePosition],
    combined_actions: CombinedActions,
) -> list[PileReactions]:
    """
    Rigid cap reaction distribution.

    Axial:  Ni = N/n + Mx·yi/Σyi² + My·xi/Σxi²
    Shear:  Vxi = Vx/n − T·yi/Σri²
            Vyi = Vy/n + T·xi/Σri²
    """
    n = len(piles)
    a = combined_actions.actions

    N_total = a.get("N", 0.0)
    Vx_total = a.get("Vx", 0.0)
    Vy_total = a.get("Vy", 0.0)
    Mx_total = a.get("Mx", 0.0)
    My_total = a.get("My", 0.0)
    T_total = a.get("T", 0.0)

    xs = np.array([p.x for p in piles])
    ys = np.array([p.y for p in piles])

    sum_xi2 = float(np.sum(xs**2))
    sum_yi2 = float(np.sum(ys**2))
    sum_ri2 = float(np.sum(xs**2 + ys**2))

    reactions: list[PileReactions] = []
    for p in piles:
        axial = N_total / n
        if sum_yi2 > 0:
            axial += Mx_total * p.y / sum_yi2
        if sum_xi2 > 0:
            axial += My_total * p.x / sum_xi2

        vx = Vx_total / n
        vy = Vy_total / n

        if sum_ri2 > 0:
            vx -= T_total * p.y / sum_ri2
            vy += T_total * p.x / sum_ri2

        reactions.append(PileReactions(pile_index=p.index, N=axial, Vx=vx, Vy=vy))

    return reactions


def compute_envelopes(
    all_reactions: list[CombinationReactions],
    n_piles: int,
) -> list[EnvelopeEntry]:
    envelopes: list[EnvelopeEntry] = []
    for pi in range(1, n_piles + 1):
        env = EnvelopeEntry(pile_index=pi)
        for cr in all_reactions:
            for pr in cr.pile_reactions:
                if pr.pile_index != pi:
                    continue
                shear = math.sqrt(pr.Vx**2 + pr.Vy**2)

                if pr.N > env.max_compression:
                    env.max_compression = pr.N
                    env.governing_compression_combo = cr.combination_name
                if pr.N < 0 and abs(pr.N) > env.max_tension:
                    env.max_tension = abs(pr.N)
                    env.governing_tension_combo = cr.combination_name
                if shear > env.max_shear:
                    env.max_shear = shear
                    env.governing_shear_combo = cr.combination_name
        envelopes.append(env)
    return envelopes


def run(request: CalculationRequest) -> CalculationResult:
    """Entry point for CalcType.PILE_GROUP."""
    start = time.perf_counter()
    errors: list[CalcError] = []
    warnings: list[CalcWarning] = []
    steps: list[CalculationStep] = []
    outputs: dict[str, OutputValue] = {}
    design_checks: list[DesignCheckResult] = []
    clause_refs: list[ClauseReference] = []

    # 1. Parse pile positions
    piles, pos_errors, pos_warnings = parse_pile_positions(request.inputs)
    errors.extend(pos_errors)
    warnings.extend(pos_warnings)
    if errors:
        elapsed = (time.perf_counter() - start) * 1000
        return _build_result(
            "", outputs, steps, None, warnings, errors, clause_refs, design_checks, elapsed
        )

    # 2. Parse load case actions and run load combination engine
    load_case_actions = parse_load_case_actions(request.inputs)

    combo_result = generate_combined_actions(
        request.load_combinations, load_case_actions, request.rule_pack
    )
    errors.extend(combo_result.errors)
    warnings.extend(combo_result.warnings)
    steps.extend(combo_result.steps)

    if combo_result.errors:
        elapsed = (time.perf_counter() - start) * 1000
        return _build_result(
            "", outputs, steps, None, warnings, errors, clause_refs, design_checks, elapsed
        )

    # 3. Compute reactions for each combination
    all_reactions: list[CombinationReactions] = []

    for ca in combo_result.combined:
        reactions = compute_reactions(piles, ca)
        cr = CombinationReactions(
            combination_id=ca.combination_id,
            combination_name=ca.combination_name,
            limit_state=ca.limit_state,
            pile_reactions=reactions,
        )
        all_reactions.append(cr)

        step_result: dict[str, float | str] = {}
        for r in reactions:
            step_result[f"P{r.pile_index}_N"] = round(r.N, 4)
            step_result[f"P{r.pile_index}_Vx"] = round(r.Vx, 4)
            step_result[f"P{r.pile_index}_Vy"] = round(r.Vy, 4)

        steps.append(
            CalculationStep(
                name=f"Reactions: {ca.combination_name}",
                description=(
                    f"Rigid cap reaction distribution for {len(piles)} piles "
                    f"under {ca.combination_name} ({ca.limit_state})."
                ),
                formula="Ni=N/n+Mx·yi/Σyi²+My·xi/Σxi²; Vxi=Vx/n−T·yi/Σri²; Vyi=Vy/n+T·xi/Σri²",
                inputs={
                    "combined_actions": {d: ca.actions.get(d, 0.0) for d in ACTIONS},  # type: ignore[dict-item]
                },
                result=step_result,
                clauseRef=ca.clause_ref,
            )
        )

    # 4. Compute envelopes
    envelopes = compute_envelopes(all_reactions, len(piles))

    overall_governing_combo = ""
    overall_max_compression = 0.0
    for env in envelopes:
        outputs[f"pile_{env.pile_index}_max_compression"] = OutputValue(
            value=round(env.max_compression, 4),
            unit="N",
            label=f"Pile {env.pile_index} max compression",
        )
        outputs[f"pile_{env.pile_index}_max_tension"] = OutputValue(
            value=round(env.max_tension, 4),
            unit="N",
            label=f"Pile {env.pile_index} max tension",
        )
        outputs[f"pile_{env.pile_index}_max_shear"] = OutputValue(
            value=round(env.max_shear, 4),
            unit="N",
            label=f"Pile {env.pile_index} max shear",
        )
        if env.max_compression > overall_max_compression:
            overall_max_compression = env.max_compression
            overall_governing_combo = env.governing_compression_combo

    outputs["num_piles"] = OutputValue(
        value=float(len(piles)), unit="count", label="Number of piles"
    )
    outputs["num_combinations"] = OutputValue(
        value=float(len(combo_result.combined)),
        unit="count",
        label="Number of load combinations",
    )

    # 5. Design checks (optional — only if capacity inputs provided)
    dc_results, dc_warnings, dc_refs = run_design_checks(
        piles=piles,
        envelopes=envelopes,
        inputs=request.inputs,
        rule_pack=request.rule_pack,
    )
    design_checks.extend(dc_results)
    warnings.extend(dc_warnings)
    clause_refs.extend(dc_refs)

    for dc in design_checks:
        key = f"pile_{dc.pile_index}_{dc.check_type}_utilisation"
        outputs[key] = OutputValue(
            value=round(dc.utilisation_ratio, 4),
            unit="ratio",
            label=f"Pile {dc.pile_index} {dc.check_type} utilisation",
            clauseRef=dc.clause_ref,
        )

    elapsed = (time.perf_counter() - start) * 1000
    return _build_result(
        "",
        outputs,
        steps,
        overall_governing_combo or None,
        warnings,
        errors,
        clause_refs,
        design_checks,
        elapsed,
    )


def _build_result(
    request_hash: str,
    outputs: dict[str, OutputValue],
    steps: list[CalculationStep],
    governing_case: str | None,
    warnings: list[CalcWarning],
    errors: list[CalcError],
    standard_refs: list[ClauseReference],
    design_checks: list[DesignCheckResult],
    duration_ms: float,
) -> CalculationResult:
    return CalculationResult(
        requestHash=request_hash,
        outputs=outputs,
        steps=steps,
        governingCase=governing_case,
        warnings=warnings,
        errors=errors,
        standardRefsUsed=standard_refs,
        designChecks=design_checks,
        assumptions=V1_ASSUMPTIONS,
        durationMs=duration_ms,
    )
