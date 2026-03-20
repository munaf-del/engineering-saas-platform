"""
Pile design check engine.

Evaluates geotechnical and structural adequacy of each pile against envelope
reactions. All capacity values and reduction factors MUST come from the
inputs dict or rule pack — this module never assumes default factors.

Geotechnical checks:
  - Compression: demand = max axial compression, capacity = φ_g,c · R_ug,c
  - Tension:     demand = max axial tension,     capacity = φ_g,t · R_ug,t
  - Lateral:     demand = max resultant shear,   capacity = φ_g,l · R_ug,l

Structural checks:
  - Reinforced concrete pile: simplified axial check   N* ≤ φ_s · N_u
  - Steel pile:              simplified axial check    N* ≤ φ_s · N_u

All reduction factors (φ) come from the rule pack to avoid embedding
proprietary coefficients. If a required factor is missing, the check is
skipped and a warning is emitted.

Output:
  - utilisationRatio = demand / capacity
  - reserveCapacity  = capacity − demand
  - status: "pass" (≤ 1.0), "warning" (≤ 1.0 but > 0.9), "fail" (> 1.0)
"""

from __future__ import annotations

import math
from typing import TYPE_CHECKING

from app.models.calculation import (
    CalcWarning,
    ClauseReference,
    DesignCheckResult,
    InputValue,
    RulePack,
)
from app.standards.loader import MissingRuleError, require_rule

if TYPE_CHECKING:
    from app.engine.pile_group import EnvelopeEntry, PilePosition


def _get(inputs: dict[str, InputValue], key: str) -> float | None:
    iv = inputs.get(key)
    return iv.value if iv is not None else None


def _status(ratio: float) -> str:
    if ratio > 1.0:
        return "fail"
    if ratio > 0.9:
        return "warning"
    return "pass"


def _try_rule(rule_pack: RulePack, key: str) -> float | None:
    """Return rule value or None (no exception)."""
    try:
        return require_rule(rule_pack, key)
    except MissingRuleError:
        return None


def run_design_checks(
    piles: list[PilePosition],
    envelopes: list[EnvelopeEntry],
    inputs: dict[str, InputValue],
    rule_pack: RulePack,
) -> tuple[list[DesignCheckResult], list[CalcWarning], list[ClauseReference]]:
    results: list[DesignCheckResult] = []
    warnings: list[CalcWarning] = []
    clause_refs: list[ClauseReference] = []

    compression_capacity = _get(inputs, "compression_capacity")
    tension_capacity = _get(inputs, "tension_capacity")
    lateral_capacity = _get(inputs, "lateral_capacity")

    has_any_capacity = any(
        v is not None for v in [compression_capacity, tension_capacity, lateral_capacity]
    )

    structural_axial_capacity = _get(inputs, "structural_axial_capacity")
    structural_moment_capacity = _get(inputs, "structural_moment_capacity")
    pile_material = _get(inputs, "pile_material_type")

    if not has_any_capacity and structural_axial_capacity is None:
        warnings.append(
            CalcWarning(
                code="NO_CAPACITY_INPUTS",
                message=(
                    "No pile capacity inputs provided (compression_capacity, tension_capacity, "
                    "lateral_capacity, structural_axial_capacity). Design checks skipped."
                ),
            )
        )
        return results, warnings, clause_refs

    for env in envelopes:
        # ── Geotechnical compression ──────────────────────────
        if compression_capacity is not None:
            dc, w, cr = _geotech_compression(
                env, compression_capacity, rule_pack
            )
            if dc:
                results.append(dc)
            warnings.extend(w)
            clause_refs.extend(cr)

        # ── Geotechnical tension ──────────────────────────────
        if tension_capacity is not None and env.max_tension > 0:
            dc, w, cr = _geotech_tension(env, tension_capacity, rule_pack)
            if dc:
                results.append(dc)
            warnings.extend(w)
            clause_refs.extend(cr)

        # ── Geotechnical lateral ──────────────────────────────
        if lateral_capacity is not None and env.max_shear > 0:
            dc, w, cr = _geotech_lateral(env, lateral_capacity, rule_pack)
            if dc:
                results.append(dc)
            warnings.extend(w)
            clause_refs.extend(cr)

        # ── Structural: RC pile ───────────────────────────────
        if pile_material is not None and pile_material == 1.0 and structural_axial_capacity is not None:
            dc, w, cr = _structural_rc(env, structural_axial_capacity, rule_pack)
            if dc:
                results.append(dc)
            warnings.extend(w)
            clause_refs.extend(cr)

        # ── Structural: Steel pile ────────────────────────────
        if pile_material is not None and pile_material == 2.0 and structural_axial_capacity is not None:
            dc, w, cr = _structural_steel(env, structural_axial_capacity, rule_pack)
            if dc:
                results.append(dc)
            warnings.extend(w)
            clause_refs.extend(cr)

    return results, warnings, clause_refs


def _geotech_compression(
    env: EnvelopeEntry,
    ultimate_capacity: float,
    rule_pack: RulePack,
) -> tuple[DesignCheckResult | None, list[CalcWarning], list[ClauseReference]]:
    warnings: list[CalcWarning] = []
    clause_refs: list[ClauseReference] = []

    phi = _try_rule(rule_pack, "phi_g_compression")
    if phi is None:
        warnings.append(
            CalcWarning(
                code="MISSING_RULE",
                message=(
                    f"Rule 'phi_g_compression' not in rule pack; "
                    f"geotechnical compression check skipped for pile {env.pile_index}."
                ),
            )
        )
        return None, warnings, clause_refs

    entry = rule_pack.rules["phi_g_compression"]
    clause_refs.append(
        ClauseReference(
            standardCode=rule_pack.standard_code,
            clause=entry.clause_ref,
            description=entry.description,
        )
    )

    design_capacity = phi * ultimate_capacity
    demand = env.max_compression

    if design_capacity <= 0:
        warnings.append(
            CalcWarning(
                code="ZERO_CAPACITY",
                message=f"Design compression capacity is zero or negative for pile {env.pile_index}.",
            )
        )
        return None, warnings, clause_refs

    ratio = demand / design_capacity
    reserve = design_capacity - demand

    return (
        DesignCheckResult(
            pileIndex=env.pile_index,
            checkType="geotechnical_compression",
            limitState="strength",
            demandValue=round(demand, 4),
            capacityValue=round(design_capacity, 4),
            utilisationRatio=round(ratio, 4),
            reserveCapacity=round(reserve, 4),
            status=_status(ratio),
            governingCombination=env.governing_compression_combo,
            clauseRef=entry.clause_ref,
        ),
        warnings,
        clause_refs,
    )


def _geotech_tension(
    env: EnvelopeEntry,
    ultimate_capacity: float,
    rule_pack: RulePack,
) -> tuple[DesignCheckResult | None, list[CalcWarning], list[ClauseReference]]:
    warnings: list[CalcWarning] = []
    clause_refs: list[ClauseReference] = []

    phi = _try_rule(rule_pack, "phi_g_tension")
    if phi is None:
        warnings.append(
            CalcWarning(
                code="MISSING_RULE",
                message=(
                    f"Rule 'phi_g_tension' not in rule pack; "
                    f"geotechnical tension check skipped for pile {env.pile_index}."
                ),
            )
        )
        return None, warnings, clause_refs

    entry = rule_pack.rules["phi_g_tension"]
    clause_refs.append(
        ClauseReference(
            standardCode=rule_pack.standard_code,
            clause=entry.clause_ref,
            description=entry.description,
        )
    )

    design_capacity = phi * ultimate_capacity
    demand = env.max_tension

    if design_capacity <= 0:
        warnings.append(
            CalcWarning(
                code="ZERO_CAPACITY",
                message=f"Design tension capacity is zero or negative for pile {env.pile_index}.",
            )
        )
        return None, warnings, clause_refs

    ratio = demand / design_capacity
    reserve = design_capacity - demand

    return (
        DesignCheckResult(
            pileIndex=env.pile_index,
            checkType="geotechnical_tension",
            limitState="strength",
            demandValue=round(demand, 4),
            capacityValue=round(design_capacity, 4),
            utilisationRatio=round(ratio, 4),
            reserveCapacity=round(reserve, 4),
            status=_status(ratio),
            governingCombination=env.governing_tension_combo,
            clauseRef=entry.clause_ref,
        ),
        warnings,
        clause_refs,
    )


def _geotech_lateral(
    env: EnvelopeEntry,
    ultimate_capacity: float,
    rule_pack: RulePack,
) -> tuple[DesignCheckResult | None, list[CalcWarning], list[ClauseReference]]:
    warnings: list[CalcWarning] = []
    clause_refs: list[ClauseReference] = []

    phi = _try_rule(rule_pack, "phi_g_lateral")
    if phi is None:
        warnings.append(
            CalcWarning(
                code="MISSING_RULE",
                message=(
                    f"Rule 'phi_g_lateral' not in rule pack; "
                    f"geotechnical lateral check skipped for pile {env.pile_index}."
                ),
            )
        )
        return None, warnings, clause_refs

    entry = rule_pack.rules["phi_g_lateral"]
    clause_refs.append(
        ClauseReference(
            standardCode=rule_pack.standard_code,
            clause=entry.clause_ref,
            description=entry.description,
        )
    )

    design_capacity = phi * ultimate_capacity
    demand = env.max_shear

    if design_capacity <= 0:
        warnings.append(
            CalcWarning(
                code="ZERO_CAPACITY",
                message=f"Design lateral capacity is zero or negative for pile {env.pile_index}.",
            )
        )
        return None, warnings, clause_refs

    ratio = demand / design_capacity
    reserve = design_capacity - demand

    return (
        DesignCheckResult(
            pileIndex=env.pile_index,
            checkType="geotechnical_lateral",
            limitState="strength",
            demandValue=round(demand, 4),
            capacityValue=round(design_capacity, 4),
            utilisationRatio=round(ratio, 4),
            reserveCapacity=round(reserve, 4),
            status=_status(ratio),
            governingCombination=env.governing_shear_combo,
            clauseRef=entry.clause_ref,
        ),
        warnings,
        clause_refs,
    )


def _structural_rc(
    env: EnvelopeEntry,
    ultimate_axial_capacity: float,
    rule_pack: RulePack,
) -> tuple[DesignCheckResult | None, list[CalcWarning], list[ClauseReference]]:
    """Reinforced concrete pile — simplified axial-only check."""
    warnings: list[CalcWarning] = []
    clause_refs: list[ClauseReference] = []

    phi = _try_rule(rule_pack, "phi_s_rc")
    if phi is None:
        warnings.append(
            CalcWarning(
                code="MISSING_RULE",
                message=(
                    f"Rule 'phi_s_rc' not in rule pack; "
                    f"structural RC check skipped for pile {env.pile_index}."
                ),
            )
        )
        return None, warnings, clause_refs

    entry = rule_pack.rules["phi_s_rc"]
    clause_refs.append(
        ClauseReference(
            standardCode=rule_pack.standard_code,
            clause=entry.clause_ref,
            description=entry.description,
        )
    )

    design_capacity = phi * ultimate_axial_capacity
    demand = env.max_compression

    if design_capacity <= 0:
        warnings.append(
            CalcWarning(
                code="ZERO_CAPACITY",
                message=f"Structural RC design capacity is zero or negative for pile {env.pile_index}.",
            )
        )
        return None, warnings, clause_refs

    ratio = demand / design_capacity
    reserve = design_capacity - demand

    return (
        DesignCheckResult(
            pileIndex=env.pile_index,
            checkType="structural_rc",
            limitState="strength",
            demandValue=round(demand, 4),
            capacityValue=round(design_capacity, 4),
            utilisationRatio=round(ratio, 4),
            reserveCapacity=round(reserve, 4),
            status=_status(ratio),
            governingCombination=env.governing_compression_combo,
            clauseRef=entry.clause_ref,
            notes="Simplified axial-only check. Combined axial + bending interaction not in v1.",
        ),
        warnings,
        clause_refs,
    )


def _structural_steel(
    env: EnvelopeEntry,
    ultimate_axial_capacity: float,
    rule_pack: RulePack,
) -> tuple[DesignCheckResult | None, list[CalcWarning], list[ClauseReference]]:
    """Steel pile — simplified axial-only check."""
    warnings: list[CalcWarning] = []
    clause_refs: list[ClauseReference] = []

    phi = _try_rule(rule_pack, "phi_s_steel")
    if phi is None:
        warnings.append(
            CalcWarning(
                code="MISSING_RULE",
                message=(
                    f"Rule 'phi_s_steel' not in rule pack; "
                    f"structural steel check skipped for pile {env.pile_index}."
                ),
            )
        )
        return None, warnings, clause_refs

    entry = rule_pack.rules["phi_s_steel"]
    clause_refs.append(
        ClauseReference(
            standardCode=rule_pack.standard_code,
            clause=entry.clause_ref,
            description=entry.description,
        )
    )

    design_capacity = phi * ultimate_axial_capacity
    demand = env.max_compression

    if design_capacity <= 0:
        warnings.append(
            CalcWarning(
                code="ZERO_CAPACITY",
                message=(
                    f"Structural steel design capacity is zero or negative "
                    f"for pile {env.pile_index}."
                ),
            )
        )
        return None, warnings, clause_refs

    ratio = demand / design_capacity
    reserve = design_capacity - demand

    return (
        DesignCheckResult(
            pileIndex=env.pile_index,
            checkType="structural_steel",
            limitState="strength",
            demandValue=round(demand, 4),
            capacityValue=round(design_capacity, 4),
            utilisationRatio=round(ratio, 4),
            reserveCapacity=round(reserve, 4),
            status=_status(ratio),
            governingCombination=env.governing_compression_combo,
            clauseRef=entry.clause_ref,
            notes="Simplified axial-only check. Combined axial + bending interaction not in v1.",
        ),
        warnings,
        clause_refs,
    )
