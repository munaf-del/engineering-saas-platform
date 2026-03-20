"""
Load combination engine.

Applies combination factors to load case action values to produce factored
combined actions for each load combination. Supports both strength (ultimate)
and serviceability limit states.

Convention for load case actions in the inputs dict:
    Key pattern: "lc_{loadCaseId}_{direction}"
    Directions:  N, Vx, Vy, Mx, My, T
    Example:     "lc_DL_N" → axial force from Dead Load case

All values are expected in SI units (N, N·m) after API-side normalization.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from app.models.calculation import (
    ACTIONS,
    CalcError,
    CalcWarning,
    CalculationStep,
    InputValue,
    LoadCombination,
    RulePack,
)


@dataclass
class CombinedActions:
    """Factored action set for one load combination."""

    combination_id: str
    combination_name: str
    limit_state: str
    clause_ref: str
    actions: dict[str, float] = field(default_factory=dict)


@dataclass
class LoadCombinationResult:
    combined: list[CombinedActions]
    steps: list[CalculationStep]
    warnings: list[CalcWarning]
    errors: list[CalcError]


LC_PREFIX = "lc_"


def parse_load_case_actions(
    inputs: dict[str, InputValue],
) -> dict[str, dict[str, float]]:
    """
    Extract load case action values from the flat inputs dict.

    Returns {loadCaseId: {direction: value}} for all recognised entries.
    """
    load_cases: dict[str, dict[str, float]] = {}
    for key, iv in inputs.items():
        if not key.startswith(LC_PREFIX):
            continue
        remainder = key[len(LC_PREFIX) :]
        last_underscore = remainder.rfind("_")
        if last_underscore == -1:
            continue
        lc_id = remainder[:last_underscore]
        direction = remainder[last_underscore + 1 :]
        if direction not in ACTIONS:
            continue
        load_cases.setdefault(lc_id, {})
        load_cases[lc_id][direction] = iv.value
    return load_cases


def validate_load_case_references(
    load_combinations: list[LoadCombination],
    available_cases: dict[str, dict[str, float]],
) -> list[CalcError]:
    """Check every loadCaseId referenced by combination factors exists."""
    errors: list[CalcError] = []
    for combo in load_combinations:
        for f in combo.factors:
            if f.load_case_id not in available_cases:
                errors.append(
                    CalcError(
                        code="MISSING_LOAD_CASE",
                        message=(
                            f"Load combination '{combo.name}' references load case "
                            f"'{f.load_case_id}' but no matching actions found in "
                            f"inputs (expected keys like lc_{f.load_case_id}_N)."
                        ),
                    )
                )
    return errors


def generate_combined_actions(
    load_combinations: list[LoadCombination],
    load_case_actions: dict[str, dict[str, float]],
    rule_pack: RulePack,
) -> LoadCombinationResult:
    """
    Apply combination factors to load case actions.

    For each LoadCombination, multiply each referenced load case's actions
    by the factor and sum across all load cases. Factors come from the
    combination definition (which in turn references the rule pack source).
    """
    errors: list[CalcError] = []
    warnings: list[CalcWarning] = []
    steps: list[CalculationStep] = []
    combined: list[CombinedActions] = []

    if not load_combinations:
        errors.append(
            CalcError(
                code="NO_LOAD_COMBINATIONS",
                message="At least one load combination is required.",
            )
        )
        return LoadCombinationResult(combined=[], steps=steps, warnings=warnings, errors=errors)

    ref_errors = validate_load_case_references(load_combinations, load_case_actions)
    if ref_errors:
        return LoadCombinationResult(combined=[], steps=steps, warnings=warnings, errors=ref_errors)

    for combo in load_combinations:
        if not combo.factors:
            warnings.append(
                CalcWarning(
                    code="EMPTY_COMBINATION",
                    message=f"Load combination '{combo.name}' has no factors; all actions will be zero.",
                )
            )

        result_actions: dict[str, float] = {d: 0.0 for d in ACTIONS}

        step_inputs: dict[str, dict[str, float | str]] = {}
        for f in combo.factors:
            lc_actions = load_case_actions.get(f.load_case_id, {})
            for direction in ACTIONS:
                raw_val = lc_actions.get(direction, 0.0)
                result_actions[direction] += f.factor * raw_val
            step_inputs[f.load_case_id] = {
                "factor": f.factor,
                "source": f.source,
                **{d: lc_actions.get(d, 0.0) for d in ACTIONS},
            }

        steps.append(
            CalculationStep(
                name=f"Combine: {combo.name}",
                description=(
                    f"Apply factors to {len(combo.factors)} load case(s) "
                    f"for {combo.limit_state.value} limit state."
                ),
                formula="F_combined = Σ(factor_i × F_loadcase_i)",
                inputs=step_inputs,
                result={d: round(result_actions[d], 6) for d in ACTIONS},
                clauseRef=combo.clause_ref,
            )
        )

        combined.append(
            CombinedActions(
                combination_id=combo.id,
                combination_name=combo.name,
                limit_state=combo.limit_state.value,
                clause_ref=combo.clause_ref,
                actions=result_actions,
            )
        )

    return LoadCombinationResult(
        combined=combined, steps=steps, warnings=warnings, errors=errors
    )
