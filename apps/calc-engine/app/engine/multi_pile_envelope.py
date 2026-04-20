from __future__ import annotations

import time

from app.engine import multi_pile_geo, multi_pile_struct
from app.engine.multi_pile_combinations import (
    ActionVector,
    CandidateCombination,
    evaluate_built_in_for_joint,
    evaluate_custom_linear_for_joint,
    pattern_vector_for_joint,
    sum_pattern_type_for_joint,
)
from app.models.calculation import (
    CalculationRequest,
    CalculationResult,
    CalculationStep,
    OutputValue,
)

ASSUMPTIONS = [
    "Joint-level loads are shared equally across the support count for that joint.",
    (
        "Built-in combinations follow the legacy Multi-Pile load engine sequence "
        "for the first migration slice."
    ),
    "Vx and Vy envelopes include the legacy robustness minimum shear rule when alpha governs.",
    "Mx and My envelopes use e_oop and the 0.05D minimum moment rule per pile type.",
    (
        "GEO uses project-owned geotechnical materials and basis data when present, "
        "with legacy pile-type fallback values only when project-owned values are unavailable."
    ),
    (
        "Socket length is auto-solved during the GEO run unless a manual adopted "
        "length override is enabled for the pile type."
    ),
]


def run(request: CalculationRequest) -> CalculationResult:
    start = time.perf_counter()
    warnings: list[dict] = []
    errors: list[dict] = []
    outputs: dict[str, OutputValue] = {}
    steps: list[CalculationStep] = []

    payload = request.payload or {}
    state = payload.get("multiPile")
    if not isinstance(state, dict):
        return _result(
            outputs=outputs,
            steps=steps,
            warnings=warnings,
            errors=[{"code": "INVALID_PAYLOAD", "message": "multiPile payload is required."}],
            artifacts={},
            duration_ms=(time.perf_counter() - start) * 1000,
        )

    pile_group_id = str(payload.get("pileGroupId") or "")
    project_specifics = (
        payload.get("projectSpecifics") if isinstance(payload.get("projectSpecifics"), dict) else {}
    )
    settings = dict(state.get("combinationSettings") or {})
    pile_types = {
        str(row["id"]): row
        for row in state.get("pileTypes", [])
        if isinstance(row, dict) and row.get("id")
    }
    joints = [
        row
        for row in state.get("joints", [])
        if isinstance(row, dict) and row.get("id") and row.get("active", True)
    ]
    generated_piles = [
        row
        for row in state.get("generatedPiles", [])
        if isinstance(row, dict) and row.get("id") and row.get("parentJointId")
    ]
    load_patterns = [
        row for row in state.get("loadPatterns", []) if isinstance(row, dict) and row.get("id")
    ]
    combination_library = [
        row
        for row in state.get("combinationLibrary", [])
        if isinstance(row, dict) and row.get("id")
    ]

    joint_load_map: dict[tuple[str, str], ActionVector] = {}
    for row in state.get("jointLoads", []):
        if not isinstance(row, dict):
            continue
        joint_id = str(row.get("jointId") or "")
        pattern_id = str(row.get("patternId") or "")
        if not joint_id or not pattern_id:
            continue
        joint_load_map[(joint_id, pattern_id)] = ActionVector(
            N=float(row.get("p") or 0.0),
            Vx=float(row.get("vx") or 0.0),
            Vy=float(row.get("vy") or 0.0),
            Mx=float(row.get("mx") or 0.0),
            My=float(row.get("my") or 0.0),
            Mz=float(row.get("mz") or 0.0),
        )

    if not joints:
        return _result(
            outputs=outputs,
            steps=steps,
            warnings=warnings,
            errors=[{"code": "NO_JOINTS", "message": "At least one active joint is required."}],
            artifacts={},
            duration_ms=(time.perf_counter() - start) * 1000,
        )

    generated_by_joint: dict[str, list[dict]] = {}
    for pile in generated_piles:
        generated_by_joint.setdefault(str(pile["parentJointId"]), []).append(pile)
    for piles in generated_by_joint.values():
        piles.sort(key=lambda pile: int(pile.get("supportIndex") or 0))

    alpha = float(settings.get("alpha") or 0.015)
    psi_c = float(settings.get("psiC") or 0.4)
    evaluated_count = 0
    governing_ids: set[str] = set()
    active_patterns_all: set[str] = set()
    joint_results = []

    for joint in joints:
        built_ins = evaluate_built_in_for_joint(
            joint, load_patterns, joint_load_map, combination_library, settings
        )
        customs = evaluate_custom_linear_for_joint(
            joint, load_patterns, joint_load_map, combination_library
        )
        candidates = built_ins + customs
        evaluated_count += len(candidates)

        pile_type = pile_types.get(str(joint.get("pileTypeId")), {})
        nominal_diameter_m = float(pile_type.get("nominalDiameterMm") or 750.0) / 1000.0
        eoop = float(pile_type.get("eoopM") or 0.0)

        for candidate in candidates:
            candidate.Mx_design = max(
                abs(candidate.actions.Mx + (candidate.actions.N * eoop)),
                abs(candidate.actions.N) * (0.05 * nominal_diameter_m),
            )
            candidate.My_design = max(
                abs(candidate.actions.My + (candidate.actions.N * eoop)),
                abs(candidate.actions.N) * (0.05 * nominal_diameter_m),
            )

        active_pattern_ids = _active_pattern_ids(joint, load_patterns, joint_load_map)
        active_patterns_all.update(active_pattern_ids)
        governing_candidates = [
            candidate for candidate in candidates if candidate.include_in_envelope
        ]

        if not candidates:
            warnings.append(
                {
                    "code": "NO_COMBINATIONS",
                    "message": f"No active combinations resolved for joint {joint['id']}.",
                }
            )

        row_nmax = _pick_max(candidates=governing_candidates, selector=lambda item: item.actions.N)
        row_nmin = _pick_min(candidates=governing_candidates, selector=lambda item: item.actions.N)
        row_vx = _pick_max(
            candidates=governing_candidates, selector=lambda item: abs(item.actions.Vx)
        )
        row_vy = _pick_max(
            candidates=governing_candidates, selector=lambda item: abs(item.actions.Vy)
        )
        row_mx = _pick_max(candidates=governing_candidates, selector=lambda item: item.Mx_design)
        row_my = _pick_max(candidates=governing_candidates, selector=lambda item: item.My_design)

        permanent_sum, _ = sum_pattern_type_for_joint(
            joint, "Permanent", _patterns_by_type(load_patterns), joint_load_map
        )
        imposed_sum, _ = sum_pattern_type_for_joint(
            joint, "Imposed", _patterns_by_type(load_patterns), joint_load_map
        )
        vrob = alpha * (permanent_sum.N + psi_c * imposed_sum.N)
        abs_vx = abs(row_vx.actions.Vx) if row_vx else 0.0
        abs_vy = abs(row_vy.actions.Vy) if row_vy else 0.0

        representative_pile = generated_by_joint.get(str(joint["id"]), [{}])[0]
        nmin_value = row_nmin.actions.N if row_nmin else 0.0
        joint_snapshot = {
            "jointId": str(joint["id"]),
            "pileTypeId": str(joint.get("pileTypeId") or ""),
            "activePatternIds": active_pattern_ids,
            "nMax": _governing_value(row_nmax, row_nmax.actions.N if row_nmax else 0.0),
            "nMin": _governing_value(row_nmin, nmin_value),
            "vx": _shear_value(row_vx, abs_vx, vrob, axis="Vx"),
            "vy": _shear_value(row_vy, abs_vy, vrob, axis="Vy"),
            "mx": _governing_value(row_mx, row_mx.Mx_design if row_mx else 0.0),
            "my": _governing_value(row_my, row_my.My_design if row_my else 0.0),
        }
        if joint.get("displayName"):
            joint_snapshot["jointDisplayName"] = str(joint["displayName"])
        if representative_pile.get("id"):
            joint_snapshot["representativePileId"] = str(representative_pile["id"])

        for key in ("nMax", "nMin", "vx", "vy", "mx", "my"):
            combination_id = joint_snapshot[key]["combinationId"]
            if combination_id:
                governing_ids.add(combination_id)

        joint_results.append(joint_snapshot)

        outputs[f"joint_{joint['id']}_nmax"] = OutputValue(
            value=round(joint_snapshot["nMax"]["value"], 4),
            unit="kN",
            label=f"Joint {joint['id']} Nmax",
        )
        outputs[f"joint_{joint['id']}_nmin"] = OutputValue(
            value=round(joint_snapshot["nMin"]["value"], 4),
            unit="kN",
            label=f"Joint {joint['id']} Nmin",
        )
        outputs[f"joint_{joint['id']}_vx"] = OutputValue(
            value=round(joint_snapshot["vx"]["value"], 4),
            unit="kN",
            label=f"Joint {joint['id']} Vx",
        )
        outputs[f"joint_{joint['id']}_vy"] = OutputValue(
            value=round(joint_snapshot["vy"]["value"], 4),
            unit="kN",
            label=f"Joint {joint['id']} Vy",
        )
        outputs[f"joint_{joint['id']}_mx"] = OutputValue(
            value=round(joint_snapshot["mx"]["value"], 4),
            unit="kN*m",
            label=f"Joint {joint['id']} Mx",
        )
        outputs[f"joint_{joint['id']}_my"] = OutputValue(
            value=round(joint_snapshot["my"]["value"], 4),
            unit="kN*m",
            label=f"Joint {joint['id']} My",
        )

        steps.append(
            CalculationStep(
                name=f"Envelope: {joint['id']}",
                description=(
                    f"Compute governing multi-pile envelope values for joint {joint['id']}."
                ),
                formula="Envelope = max/min over included built-in and custom linear combinations",
                inputs={
                    "combination_count": {"value": float(len(candidates)), "unit": "count"},
                    "active_pattern_count": {
                        "value": float(len(active_pattern_ids)),
                        "unit": "count",
                    },
                },
                result={
                    "nMax": round(joint_snapshot["nMax"]["value"], 4),
                    "nMin": round(joint_snapshot["nMin"]["value"], 4),
                    "vx": round(joint_snapshot["vx"]["value"], 4),
                    "vy": round(joint_snapshot["vy"]["value"], 4),
                    "mx": round(joint_snapshot["mx"]["value"], 4),
                    "my": round(joint_snapshot["my"]["value"], 4),
                },
                clauseRef="legacy-multi-pile:first-slice",
            )
        )

    struct_results = multi_pile_struct.compute_struct_results(
        state if isinstance(state, dict) else {},
        project_specifics if isinstance(project_specifics, dict) else {},
        joint_results,
    )

    envelope = {
        "version": 1,
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "pileGroupId": pile_group_id,
        "jointResults": joint_results,
        "structResults": struct_results,
        "projectSummary": {
            "jointCount": len(joint_results),
            "evaluatedCombinationCount": evaluated_count,
            "governingCombinationCount": len(governing_ids),
            "activePatternCount": len(active_patterns_all),
        },
    }

    outputs["joint_count"] = OutputValue(
        value=float(len(joint_results)),
        unit="count",
        label="Joint count",
    )
    outputs["evaluated_combination_count"] = OutputValue(
        value=float(evaluated_count),
        unit="count",
        label="Evaluated combination count",
    )

    geo_results, geo_warnings = multi_pile_geo.compute_geo_results(
        state, project_specifics, joint_results
    )
    warnings.extend(geo_warnings)

    for joint_id, row in geo_results.items():
        phi_value = row.get("phi")
        if phi_value is not None:
            outputs[f"joint_{joint_id}_geo_phi"] = OutputValue(
                value=round(float(phi_value), 4),
                unit="ratio",
                label=f"Joint {joint_id} adopted phi_g",
            )

        phi_r_comp = row.get("phiRcomp")
        if phi_r_comp is not None:
            outputs[f"joint_{joint_id}_geo_rd_ug_c"] = OutputValue(
                value=round(float(phi_r_comp), 4),
                unit="kN",
                label=f"Joint {joint_id} Rd,ug,c",
            )

        phi_r_ten = row.get("phiRten")
        if phi_r_ten is not None:
            outputs[f"joint_{joint_id}_geo_rd_ug_t"] = OutputValue(
                value=round(float(phi_r_ten), 4),
                unit="kN",
                label=f"Joint {joint_id} Rd,ug,t",
            )

        ls_adopted = row.get("LsAdopted")
        if ls_adopted is not None:
            outputs[f"joint_{joint_id}_geo_ls_adopted"] = OutputValue(
                value=round(float(ls_adopted), 4),
                unit="m",
                label=f"Joint {joint_id} adopted socket length",
            )

        step_result: dict[str, float | str] = {
            "status": str(row.get("status") or "pending"),
            "phi": round(float(row["phi"]), 4) if row.get("phi") is not None else "pending",
            "LsMode": str(row.get("LsMode") or "pending"),
        }
        if row.get("phiRcomp") is not None:
            step_result["Rd_ug_c"] = round(float(row["phiRcomp"]), 4)
        if row.get("phiRten") is not None:
            step_result["Rd_ug_t"] = round(float(row["phiRten"]), 4)
        if row.get("utilComp") is not None:
            step_result["utilComp"] = round(float(row["utilComp"]), 4)
        if row.get("utilTen") is not None:
            step_result["utilTen"] = round(float(row["utilTen"]), 4)
        if row.get("pendingReason"):
            step_result["pendingReason"] = str(row["pendingReason"])

        steps.append(
            CalculationStep(
                name=f"GEO: {joint_id}",
                description=(
                    f"Compute geotechnical ULS capacity and utilisation for joint {joint_id}."
                ),
                formula="Rd,ug = phi_g x (shaft resistance + optional base resistance)",
                inputs={
                    "Nmax": {"value": float(row.get("Nmax") or 0.0), "unit": "kN"},
                    "upliftAbs": {"value": float(row.get("upliftAbs") or 0.0), "unit": "kN"},
                    "phi_g": {"value": float(row.get("phi") or 0.0), "unit": "ratio"},
                },
                result=step_result,
                clauseRef="AS 2159 Section 4.4",
            )
        )

    return _result(
        outputs=outputs,
        steps=steps,
        warnings=warnings,
        errors=errors,
        artifacts={
            "multiPileEnvelope": envelope,
            "multiPileGeo": {
                "version": 1,
                "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "rows": geo_results,
            },
        },
        duration_ms=(time.perf_counter() - start) * 1000,
    )


def _patterns_by_type(load_patterns: list[dict]) -> dict[str, list[dict]]:
    grouped: dict[str, list[dict]] = {}
    for pattern in load_patterns:
        if not pattern.get("enabled", True):
            continue
        grouped.setdefault(str(pattern.get("patternType") or "Other"), []).append(pattern)
    return grouped


def _active_pattern_ids(
    joint: dict,
    load_patterns: list[dict],
    joint_load_map: dict[tuple[str, str], ActionVector],
) -> list[str]:
    ids: list[str] = []
    for pattern in load_patterns:
        if not pattern.get("enabled", True):
            continue
        vector = pattern_vector_for_joint(joint, str(pattern["id"]), joint_load_map)
        if (
            abs(vector.N) > 1e-9
            or abs(vector.Vx) > 1e-9
            or abs(vector.Vy) > 1e-9
            or abs(vector.Mx) > 1e-9
            or abs(vector.My) > 1e-9
            or abs(vector.Mz) > 1e-9
        ):
            ids.append(str(pattern["id"]))
    return ids


def _pick_max(candidates: list[CandidateCombination], selector):
    return max(candidates, key=selector) if candidates else None


def _pick_min(candidates: list[CandidateCombination], selector):
    return min(candidates, key=selector) if candidates else None


def _governing_value(
    candidate: CandidateCombination | None,
    value: float,
) -> dict:
    if not candidate:
        return {
            "value": 0.0,
            "combinationId": "",
            "combinationName": "",
            "source": "built-in",
            "expressionSummary": "",
        }
    return {
        "value": value,
        "combinationId": candidate.combination_id,
        "combinationName": candidate.combination_name,
        "source": candidate.source,
        "expressionSummary": candidate.expression_summary,
    }


def _shear_value(
    candidate: CandidateCombination | None,
    row_value: float,
    vrob: float,
    axis: str,
) -> dict:
    if vrob >= row_value:
        return {
            "value": vrob,
            "combinationId": "ROBUSTNESS_MIN_SHEAR",
            "combinationName": "Robustness Min Shear",
            "source": "built-in",
            "expressionSummary": f"alpha × (G + psiC × Q) governing {axis}",
        }
    return _governing_value(candidate, row_value)


def _result(
    outputs: dict,
    steps: list,
    warnings: list[dict],
    errors: list[dict],
    artifacts: dict,
    duration_ms: float,
) -> CalculationResult:
    return CalculationResult(
        requestHash="",
        outputs=outputs,
        steps=steps,
        governingCase=None,
        warnings=warnings,
        errors=errors,
        standardRefsUsed=[],
        assumptions=ASSUMPTIONS,
        artifacts=artifacts,
        durationMs=duration_ms,
    )
