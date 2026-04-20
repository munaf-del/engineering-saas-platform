from __future__ import annotations

import math
import time

ARR_ITEMS = (
    {"weighting": 2.0},
    {"weighting": 2.0},
    {"weighting": 2.0},
    {"weighting": 1.0},
    {"weighting": 2.0},
    {"weighting": 1.0},
    {"weighting": 2.0},
    {"weighting": 2.0},
    {"weighting": 0.5},
)


def _record(value) -> dict:
    return value if isinstance(value, dict) else {}


def _string(value, fallback: str = "") -> str:
    candidate = str(value or "").strip()
    return candidate or fallback


def _float(
    value, fallback: float = 0.0, minimum: float | None = None, maximum: float | None = None
) -> float:
    try:
        candidate = float(value)
    except (TypeError, ValueError):
        return fallback
    if not math.isfinite(candidate):
        return fallback
    if minimum is not None and candidate < minimum:
        return minimum
    if maximum is not None and candidate > maximum:
        return maximum
    return candidate


def _nullable_float(
    value, minimum: float | None = None, maximum: float | None = None
) -> float | None:
    if value in (None, ""):
        return None
    try:
        candidate = float(value)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(candidate):
        return None
    if minimum is not None and candidate < minimum:
        return minimum
    if maximum is not None and candidate > maximum:
        return maximum
    return candidate


def _round_up_to(value: float, step: float) -> float:
    if step <= 0:
        return value
    return math.ceil(max(0.0, value) / step) * step


def _project_geo_material_label(material: dict | None) -> str:
    if not material:
        return "—"
    code = _string(material.get("unitCode"))
    name = _string(material.get("displayName"))
    if code and name:
        return f"{code} — {name}"
    return code or name or _string(material.get("id"), "—")


def _project_geo_reference_label(reference_id: str, project_specifics: dict) -> str:
    if not reference_id:
        return "—"
    for reference in project_specifics.get("references", []):
        if not isinstance(reference, dict):
            continue
        if _string(reference.get("id")) != reference_id:
            continue
        parts = [
            _string(reference.get("referenceId")),
            _string(reference.get("title")),
            f"Rev {_string(reference.get('revision'))}"
            if _string(reference.get("revision"))
            else "",
        ]
        label = " — ".join(part for part in parts if part)
        return label or reference_id
    return reference_id


def _project_geo_source_summary(material: dict | None, fallback_label: str) -> str:
    parts = [
        fallback_label,
        _string(material.get("sourceDocument")) if material else "",
        _string(material.get("sourceSection")) if material else "",
        _string(material.get("sourceTable")) if material else "",
    ]
    filtered = [part for part in parts if part]
    return " | ".join(filtered) if filtered else (fallback_label or "—")


def _basis_defaults(project_specifics: dict) -> dict:
    basis = _record(project_specifics.get("geotechnicalBasis"))
    return {
        "cfaUpliftMode": "ratio-to-compression"
        if _string(basis.get("cfaUpliftMode")) == "ratio-to-compression"
        else "manual-entry",
        "cfaUpliftFactor": _float(basis.get("cfaUpliftFactor"), 0.7, minimum=0.0),
    }


def _material_tension_value(material: dict | None, basis: dict) -> float:
    if not material:
        return 0.0
    tension = _nullable_float(material.get("pile_fms_tension_kPa"), minimum=0.0)
    if tension is not None:
        return tension
    compression = _nullable_float(material.get("pile_fms_comp_kPa"), minimum=0.0)
    if compression is None:
        return 0.0
    uplift_factor = _nullable_float(material.get("cfaUpliftTensionFactor"), minimum=0.0)
    if uplift_factor is None and basis.get("cfaUpliftMode") == "ratio-to-compression":
        uplift_factor = _float(basis.get("cfaUpliftFactor"), 0.7, minimum=0.0)
    if uplift_factor is None:
        uplift_factor = 1.0
    return round(compression * uplift_factor, 3)


def _phi_from_arr(arr: float) -> dict:
    rows = (
        {"max": 1.5, "low": 0.67, "high": 0.76},
        {"max": 2.0, "low": 0.61, "high": 0.70},
        {"max": 2.5, "low": 0.56, "high": 0.64},
        {"max": 3.0, "low": 0.52, "high": 0.60},
        {"max": 3.5, "low": 0.48, "high": 0.56},
        {"max": 4.0, "low": 0.45, "high": 0.52},
        {"max": 4.5, "low": 0.42, "high": 0.49},
        {"max": float("inf"), "low": 0.40, "high": 0.47},
    )
    for row in rows:
        if arr <= row["max"]:
            return row
    return rows[-1]


def _band_from_arr(arr: float) -> str:
    bands = (1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5)
    lower = 0.0
    for upper in bands:
        if arr <= upper:
            return f"<= {upper}" if lower == 0 else f"> {lower} to {upper}"
        lower = upper
    return "> 4.5"


def _testing_benefit(test_type: str, test_pile_percentage: float) -> dict:
    p = _float(test_pile_percentage, 0.0, minimum=0.0, maximum=100.0)
    phi_tf = None
    if test_type == "STATIC":
        phi_tf = 0.90
    elif test_type == "RAPID":
        phi_tf = 0.75
    elif test_type == "DYN_PREF":
        phi_tf = 0.80
    elif test_type == "DYN_OTHER":
        phi_tf = 0.75
    elif test_type == "BIDIR":
        phi_tf = 0.85

    if test_type in {"STATIC", "RAPID", "BIDIR"}:
        k = (1.33 * p / (p + 3.3)) if p > 0 else 0.0
    elif test_type in {"DYN_PREF", "DYN_OTHER"}:
        k = (1.13 * p / (p + 3.3)) if p > 0 else 0.0
    else:
        k = 0.0

    return {
        "phiTf": phi_tf,
        "testBenefitK": min(1.0, max(0.0, k)),
        "testPilePercentage": p,
        "testType": test_type,
    }


def _phi_with_testing(phi_gb: float, phi_tf: float | None, k: float) -> float:
    phi_tf_effective = phi_gb if phi_tf is None else phi_tf
    phi = phi_gb + (phi_tf_effective - phi_gb) * k
    return max(phi_gb, phi)


def normalize_geo_arr_settings(raw: dict | None) -> dict:
    settings = _record(raw)
    irr_source = settings.get("irrValues") if isinstance(settings.get("irrValues"), list) else []
    irr_values = [
        _float(irr_source[index] if index < len(irr_source) else 3, 3.0, minimum=1.0, maximum=5.0)
        for index in range(len(ARR_ITEMS))
    ]
    test_type = _string(settings.get("testType"), "NONE")
    if test_type not in {"NONE", "STATIC", "RAPID", "DYN_PREF", "DYN_OTHER", "BIDIR"}:
        test_type = "NONE"
    weight_total = round(sum(item["weighting"] for item in ARR_ITEMS), 3)
    weighted_score = round(
        sum(item["weighting"] * irr_values[index] for index, item in enumerate(ARR_ITEMS)),
        3,
    )
    arr_value = round((weighted_score / weight_total) if weight_total > 0 else 0.0, 3)
    band = _band_from_arr(arr_value)
    phi_gb = _phi_from_arr(arr_value)
    testing = _testing_benefit(test_type, settings.get("testPilePercentage"))
    phi_g_low = round(
        _phi_with_testing(phi_gb["low"], testing["phiTf"], testing["testBenefitK"]), 3
    )
    phi_g_high = round(
        _phi_with_testing(phi_gb["high"], testing["phiTf"], testing["testBenefitK"]), 3
    )
    return {
        "irrValues": irr_values,
        "testType": test_type,
        "testPilePercentage": round(testing["testPilePercentage"], 3),
        "weightTotal": weight_total,
        "weightedScore": weighted_score,
        "arrValue": arr_value,
        "arrBand": band,
        "phiTf": round(testing["phiTf"], 3) if testing["phiTf"] is not None else None,
        "testBenefitK": round(testing["testBenefitK"], 3),
        "phiGbLow": round(phi_gb["low"], 3),
        "phiGbHigh": round(phi_gb["high"], 3),
        "phiGLow": phi_g_low,
        "phiGHigh": phi_g_high,
    }


def adopted_phi_for_redundancy(arr_settings: dict, redundancy: str) -> float:
    if _string(redundancy).upper() == "HIGH":
        return _float(
            arr_settings.get("phiGHigh"), _float(arr_settings.get("phiGbHigh"), 0.47), minimum=0.0
        )
    return _float(
        arr_settings.get("phiGLow"), _float(arr_settings.get("phiGbLow"), 0.40), minimum=0.0
    )


def _project_arr_settings(project_specifics: dict | None, state: dict) -> dict:
    project = _record(project_specifics)
    basis = _record(project.get("geotechnicalBasis"))
    arr_assessment = _record(basis.get("arrAssessment"))
    if arr_assessment:
        return normalize_geo_arr_settings(arr_assessment)
    return normalize_geo_arr_settings(_record(state.get("geoArrSettings")))


def _geo_minimum_socket_length(pile_type: dict, settings: dict) -> float:
    auto = 1.5 * (_float(pile_type.get("nominalDiameterMm"), 750.0, minimum=0.0) / 1000.0)
    if settings.get("useLsMinOverride"):
        override_value = _float(settings.get("LsMinOverride"), 0.0, minimum=0.0)
        if override_value > 0:
            return override_value
    return auto


def _geo_socket_mode_label(mode: str) -> str:
    if mode == "manual":
        return "Manual override"
    if mode == "auto":
        return "Auto"
    return "Pending"


def _resolve_type_geo_inputs(
    type_id: str, pile_type: dict, geo_settings: dict, project_specifics: dict
) -> dict:
    materials = [
        _record(material)
        for material in project_specifics.get("geotechnicalMaterials", {}).get("materials", [])
        if isinstance(material, dict)
    ]
    references = [
        _record(reference)
        for reference in project_specifics.get("references", [])
        if isinstance(reference, dict)
    ]
    geotechnical_materials = _record(project_specifics.get("geotechnicalMaterials"))
    active_reference_id = _string(geotechnical_materials.get("activeReferenceId"))
    active_reference_label = _project_geo_reference_label(
        active_reference_id, {"references": references}
    )
    materials_by_id = {
        _string(material.get("id")): material
        for material in materials
        if _string(material.get("id"))
    }
    has_project_geo_library = len(materials) > 0
    basis = _basis_defaults(project_specifics)

    def resolve_source_label(material: dict | None) -> str:
        reference_id = (
            _string(material.get("sourceReferenceId")) if material else active_reference_id
        )
        return _project_geo_source_summary(
            material,
            _project_geo_reference_label(reference_id, {"references": references}),
        )

    layer_rows = []
    for slot in (1, 2, 3):
        height = _float(geo_settings.get(f"s{slot}H"), 0.0, minimum=0.0)
        legacy_qs = _float(geo_settings.get(f"s{slot}qs"), 0.0, minimum=0.0)
        material_id = _string(geo_settings.get(f"s{slot}MaterialId"))
        material = materials_by_id.get(material_id)
        use_legacy_fallback = (not has_project_geo_library) and material is None and legacy_qs > 0
        fms_comp = (
            _nullable_float(material.get("pile_fms_comp_kPa"), minimum=0.0) if material else None
        )
        fms_comp_value = (
            fms_comp if fms_comp is not None else (legacy_qs if use_legacy_fallback else 0.0)
        )
        fms_ten_value = (
            _material_tension_value(material, basis)
            if material
            else (legacy_qs if use_legacy_fallback else 0.0)
        )
        missing_selection = height > 0 and not material_id
        missing_capacity = height > 0 and material is None and not use_legacy_fallback
        layer_rows.append(
            {
                "slot": slot,
                "H": height,
                "materialId": material_id,
                "material": material,
                "unitCode": _string(material.get("unitCode")) if material else "",
                "displayName": _string(material.get("displayName")) if material else "",
                "label": (
                    _project_geo_material_label(material)
                    if material
                    else (
                        f"Migration fallback f_m,s={legacy_qs:.0f} kPa"
                        if use_legacy_fallback
                        else (
                            "No project geo material selected"
                            if missing_selection
                            else "No project geo material resolved"
                        )
                    )
                ),
                "sourceReferenceId": _string(material.get("sourceReferenceId"))
                if material
                else active_reference_id,
                "sourceReferenceLabel": (
                    resolve_source_label(material)
                    if material
                    else (
                        "Migration fallback from legacy pile-type settings"
                        if use_legacy_fallback
                        else (active_reference_label or "Project geo material library")
                    )
                ),
                "fmsComp": max(0.0, fms_comp_value),
                "fmsTen": max(0.0, fms_ten_value),
                "fmsAllow": _nullable_float(material.get("pile_fms_allow_kPa"), minimum=0.0)
                if material
                else None,
                "usedLegacyFallback": use_legacy_fallback,
                "missingSelection": missing_selection,
                "missingCapacity": missing_capacity,
                "resolutionMode": (
                    "project-library"
                    if material
                    else ("migration-fallback" if use_legacy_fallback else "missing")
                ),
            }
        )

    founding_material_id = _string(geo_settings.get("foundingMaterialId"))
    founding_material = materials_by_id.get(founding_material_id)
    founding_use_legacy_fallback = (
        (not has_project_geo_library)
        and founding_material is None
        and (
            _float(geo_settings.get("qsRock"), 0.0, minimum=0.0) > 0
            or _float(geo_settings.get("qbRock"), 0.0, minimum=0.0) > 0
        )
    )
    founding_fms_comp = (
        _nullable_float(founding_material.get("pile_fms_comp_kPa"), minimum=0.0)
        if founding_material
        else None
    )
    founding_fms_comp_value = (
        founding_fms_comp
        if founding_fms_comp is not None
        else (
            _float(geo_settings.get("qsRock"), 0.0, minimum=0.0)
            if founding_use_legacy_fallback
            else 0.0
        )
    )
    founding_fms_ten_value = (
        _material_tension_value(founding_material, basis)
        if founding_material
        else (
            _float(geo_settings.get("qsRock"), 0.0, minimum=0.0)
            if founding_use_legacy_fallback
            else 0.0
        )
    )
    founding_fb_ult_value = (
        _nullable_float(founding_material.get("pile_fb_ult_kPa"), minimum=0.0)
        if founding_material
        else (
            _float(geo_settings.get("qbRock"), 0.0, minimum=0.0)
            if founding_use_legacy_fallback
            else 0.0
        )
    )
    founding_missing_selection = not founding_material_id
    founding_missing_capacity = founding_material is None and not founding_use_legacy_fallback

    missing_layer_mappings = [layer for layer in layer_rows if layer["missingSelection"]]
    missing_layer_capacities = [layer for layer in layer_rows if layer["missingCapacity"]]
    input_warnings = []
    for layer in missing_layer_mappings:
        input_warnings.append(
            f"Layer {layer['slot']} has thickness assigned but no project geo material selected."
        )
    for layer in missing_layer_capacities:
        input_warnings.append(
            f"Layer {layer['slot']} has no project geo material resolved "
            "and no migration fallback value is available."
        )
    if founding_missing_capacity:
        input_warnings.append(
            "Founding / socket material is not selected and no migration "
            "fallback founding capacity is available."
        )
    elif founding_missing_selection and founding_use_legacy_fallback:
        input_warnings.append(
            "Founding resistance is still using a migration fallback value "
            "because this imported project has not yet been mapped to a "
            "project founding material row."
        )

    return {
        "typeId": type_id,
        "layerRows": layer_rows,
        "foundingMaterialId": founding_material_id,
        "foundingMaterial": founding_material,
        "foundingLabel": (
            _project_geo_material_label(founding_material)
            if founding_material
            else (
                "Migration fallback socket/base values"
                if founding_use_legacy_fallback
                else (
                    "Selected founding material could not be resolved"
                    if founding_material_id
                    else "No founding material selected"
                )
            )
        ),
        "foundingSourceReferenceLabel": (
            resolve_source_label(founding_material)
            if founding_material
            else (
                "Migration fallback from legacy pile-type settings"
                if founding_use_legacy_fallback
                else (active_reference_label or "Project geo material library")
            )
        ),
        "foundingFmsComp": max(0.0, founding_fms_comp_value),
        "foundingFmsTen": max(0.0, founding_fms_ten_value),
        "foundingFbUlt": max(0.0, founding_fb_ult_value or 0.0),
        "foundingFmsAllow": _nullable_float(
            founding_material.get("pile_fms_allow_kPa"), minimum=0.0
        )
        if founding_material
        else None,
        "foundingFbAllow": _nullable_float(founding_material.get("pile_fb_allow_kPa"), minimum=0.0)
        if founding_material
        else None,
        "foundingUsesLegacyFallback": founding_use_legacy_fallback,
        "foundingMissingSelection": founding_missing_selection,
        "foundingMissingCapacity": founding_missing_capacity,
        "useBase": _string(geo_settings.get("useBase"), "YES") != "NO",
        "activeReferenceId": active_reference_id,
        "activeReferenceLabel": active_reference_label,
        "missingLayerMappings": missing_layer_mappings,
        "missingLayerCapacities": missing_layer_capacities,
        "inputWarnings": input_warnings,
    }


def _geo_socket_breakdown_rows(
    layers: list[dict],
    diameter: float,
    ls_used: float,
    founding_label: str,
    qs_rock_comp: float,
    qs_rock_ten: float,
    qb_rock: float,
) -> list[dict]:
    rows = []
    for index, layer in enumerate(layers):
        if not (layer["H"] > 0 and layer["qsComp"] > 0):
            continue
        rows.append(
            {
                "label": layer.get("label") or f"Layer {index + 1}",
                "H": layer["H"],
                "fms": layer["qsComp"],
                "fmsTension": layer["qsTen"],
                "fbUlt": None,
                "Rs": math.pi * diameter * layer["H"] * layer["qsComp"],
            }
        )
    if ls_used > 0 and qs_rock_comp > 0:
        rows.append(
            {
                "label": founding_label or "Rock socket",
                "H": ls_used,
                "fms": qs_rock_comp,
                "fmsTension": qs_rock_ten,
                "fbUlt": qb_rock,
                "Rs": math.pi * diameter * ls_used * qs_rock_comp,
            }
        )
    return rows


def compute_geo_results(
    state: dict,
    project_specifics: dict | None,
    envelope_joint_results: list[dict],
) -> tuple[dict[str, dict], list[dict]]:
    project = _record(project_specifics)
    pile_types = {
        _string(row.get("id")): row
        for row in state.get("pileTypes", [])
        if isinstance(row, dict) and _string(row.get("id"))
    }
    joints = {
        _string(row.get("id")): row
        for row in state.get("joints", [])
        if isinstance(row, dict) and _string(row.get("id")) and row.get("active", True)
    }
    generated_piles_by_joint: dict[str, list[dict]] = {}
    for pile in state.get("generatedPiles", []):
        if not isinstance(pile, dict):
            continue
        joint_id = _string(pile.get("parentJointId"))
        if not joint_id:
            continue
        generated_piles_by_joint.setdefault(joint_id, []).append(pile)
    for piles in generated_piles_by_joint.values():
        piles.sort(key=lambda pile: int(_float(pile.get("supportIndex"), 0.0, minimum=0.0)))

    geo_type_settings = _record(state.get("geoTypeSettings"))
    geo_arr_settings = _project_arr_settings(project_specifics, state)
    geo_results: dict[str, dict] = {}
    warnings: list[dict] = []

    for envelope_row in envelope_joint_results:
        joint_id = _string(envelope_row.get("jointId"))
        joint = joints.get(joint_id)
        if not joint:
            continue
        type_id = _string(envelope_row.get("pileTypeId") or joint.get("pileTypeId"))
        pile_type = pile_types.get(type_id)
        if not pile_type:
            continue
        piles = generated_piles_by_joint.get(joint_id, [])
        representative_pile = piles[0] if piles else {}
        geo_settings = _record(geo_type_settings.get(type_id))
        resolved_geo = _resolve_type_geo_inputs(type_id, pile_type, geo_settings, project)
        input_warnings = list(resolved_geo.get("inputWarnings", []))
        phi = adopted_phi_for_redundancy(
            geo_arr_settings, _string(geo_settings.get("redundancy"), "LOW")
        )
        diameter = _float(pile_type.get("nominalDiameterMm"), 750.0, minimum=0.0) / 1000.0
        eta_c = _float(geo_settings.get("shaftRedComp"), 1.0, minimum=0.0)
        eta_t = _float(geo_settings.get("shaftRedTen"), 0.5, minimum=0.0)
        layer_rows = []
        rs_soil_comp = 0.0
        rs_soil_ten = 0.0
        for layer in resolved_geo["layerRows"]:
            qs_comp = _float(layer.get("fmsComp"), 0.0, minimum=0.0)
            qs_ten = _float(layer.get("fmsTen"), 0.0, minimum=0.0)
            height = _float(layer.get("H"), 0.0, minimum=0.0)
            if height > 0 and qs_comp > 0:
                rs_soil_comp += math.pi * diameter * height * qs_comp
            if height > 0 and qs_ten > 0:
                rs_soil_ten += math.pi * diameter * height * qs_ten
            layer_rows.append(
                {
                    "slot": int(_float(layer.get("slot"), 0.0, minimum=0.0)),
                    "H": height,
                    "fmsComp": qs_comp,
                    "fmsTen": qs_ten,
                    "label": _string(layer.get("label")),
                    "unitCode": _string(layer.get("unitCode")),
                    "displayName": _string(layer.get("displayName")),
                    "materialId": _string(layer.get("materialId")),
                    "sourceReferenceId": _string(layer.get("sourceReferenceId")),
                    "sourceReferenceLabel": _string(layer.get("sourceReferenceLabel"), "—"),
                    "usedLegacyFallback": bool(layer.get("usedLegacyFallback")),
                    "resolutionMode": _string(layer.get("resolutionMode"), "missing"),
                    "missingSelection": bool(layer.get("missingSelection")),
                    "missingCapacity": bool(layer.get("missingCapacity")),
                }
            )

        n_max = _float(_record(envelope_row.get("nMax")).get("value"), 0.0)
        n_min = _float(_record(envelope_row.get("nMin")).get("value"), 0.0)
        uplift_abs = max(0.0, -n_min)
        nnf = (
            _float(geo_settings.get("Nnf"), 0.0, minimum=0.0) if geo_settings.get("useNnf") else 0.0
        )
        n_comp_eff = max(0.0, n_max) + nnf
        n_ten = max(0.0, uplift_abs)
        qs_rock_comp = _float(resolved_geo.get("foundingFmsComp"), 0.0, minimum=0.0)
        qs_rock_ten = _float(resolved_geo.get("foundingFmsTen"), 0.0, minimum=0.0)
        qb_rock = _float(resolved_geo.get("foundingFbUlt"), 0.0, minimum=0.0)
        base_area = math.pi * diameter * diameter / 4.0
        use_base = bool(resolved_geo.get("useBase"))
        base_ult = base_area * qb_rock if use_base else 0.0
        ls_min = _geo_minimum_socket_length(pile_type, geo_settings)
        manual_override_enabled = bool(geo_settings.get("socketOverrideEnabled"))
        manual_length = _float(geo_settings.get("LsManual"), 0.0, minimum=0.0)

        pending_reason = ""
        if resolved_geo.get("missingLayerMappings") or resolved_geo.get("missingLayerCapacities"):
            pending_reason = (
                "Resolve all layer material selections and capacities before running GEO."
            )
        elif resolved_geo.get("foundingMissingCapacity"):
            pending_reason = "Resolve the founding / socket material before running GEO."
        elif (
            qs_rock_comp <= 0
            and qs_rock_ten <= 0
            and not (manual_override_enabled and manual_length > 0)
        ):
            pending_reason = (
                "Resolved founding shaft resistance must be > 0 to auto-solve socket length."
            )

        if pending_reason:
            ls_solved = 0.0
            if manual_override_enabled and manual_length > 0:
                ls_mode = "manual"
                ls_adopted = manual_length
            else:
                ls_mode = "pending"
                ls_adopted = 0.0
        else:
            perim = math.pi * diameter
            denom_comp = perim * qs_rock_comp
            denom_ten = perim * qs_rock_ten
            ls_req_ten = 0.0
            if n_ten > 0:
                need_ten = (n_ten / max(phi, 1e-6) / max(eta_t, 1e-6)) - rs_soil_ten
                ls_req_ten = max(0.0, need_ten / denom_ten) if denom_ten > 0 else 0.0
            ls_req_comp = 0.0
            if n_comp_eff > 0:
                need_total = (n_comp_eff / max(phi, 1e-6)) - base_ult
                need_comp = (need_total / max(eta_c, 1e-6)) - rs_soil_comp
                ls_req_comp = max(0.0, need_comp / denom_comp) if denom_comp > 0 else 0.0
            ls_solved = _round_up_to(max(ls_req_ten, ls_req_comp, ls_min), 0.2)
            if manual_override_enabled and manual_length > 0:
                ls_mode = "manual"
                ls_adopted = manual_length
            elif ls_solved > 0:
                ls_mode = "auto"
                ls_adopted = ls_solved
            else:
                ls_mode = "pending"
                ls_adopted = 0.0

        if ls_mode == "manual":
            socket_adoption_note = (
                "Manual override active. "
                f"Auto-solved Ls = {ls_solved:.2f} m; "
                f"adopted Ls = {ls_adopted:.2f} m."
            )
        elif ls_mode == "auto":
            ls_note = (
                f" Note: Ls increased to minimum embedment {ls_min:.2f} m (1.5D default/override)."
                if ls_solved > 0 and ls_solved <= ls_min + 1e-9
                else ""
            )
            socket_adoption_note = (
                "Auto adoption active. "
                f"Auto-solved Ls = {ls_solved:.2f} m; "
                f"adopted Ls = {ls_adopted:.2f} m.{ls_note}"
            )
        else:
            socket_adoption_note = (
                "Socket adoption is pending. No solved or manual adopted "
                "socket length is currently stored for this type."
            )

        founding_resolution_mode = (
            "project-library"
            if resolved_geo.get("foundingMaterial")
            else (
                "migration-fallback"
                if resolved_geo.get("foundingUsesLegacyFallback")
                else "missing"
            )
        )
        socket_breakdown = _geo_socket_breakdown_rows(
            [
                {
                    "H": row["H"],
                    "qsComp": row["fmsComp"],
                    "qsTen": row["fmsTen"],
                    "label": row["label"],
                }
                for row in layer_rows
            ],
            diameter,
            ls_adopted,
            _string(resolved_geo.get("foundingLabel")),
            qs_rock_comp,
            qs_rock_ten,
            qb_rock,
        )

        if pending_reason:
            row = {
                "jointId": joint_id,
                "jointDisplayName": _string(
                    envelope_row.get("jointDisplayName") or joint.get("displayName")
                ),
                "pileId": _string(representative_pile.get("id"), f"{joint_id}-P1"),
                "typeId": type_id,
                "activePatternIds": [
                    _string(pattern_id)
                    for pattern_id in envelope_row.get("activePatternIds", [])
                    if _string(pattern_id)
                ],
                "redundancy": "HIGH"
                if _string(geo_settings.get("redundancy")).upper() == "HIGH"
                else "LOW",
                "status": "pending",
                "pendingReason": pending_reason,
                "Nmax": round(n_max, 4),
                "Nmin": round(n_min, 4),
                "upliftAbs": round(uplift_abs, 4),
                "Nnf": round(nnf, 4),
                "phi": round(phi, 4),
                "phiRcomp": None,
                "phiRten": None,
                "utilComp": None,
                "utilTen": None,
                "ok": None,
                "diameter": round(diameter, 6),
                "Ls": round(ls_adopted, 4) if ls_adopted > 0 else None,
                "LsSolved": round(ls_solved, 4) if ls_solved > 0 else None,
                "LsAdopted": round(ls_adopted, 4) if ls_adopted > 0 else None,
                "LsMode": ls_mode,
                "socketMode": ls_mode,
                "socketOverrideEnabled": manual_override_enabled,
                "qsRock": round(qs_rock_comp, 4),
                "qbRock": round(qb_rock, 4),
                "useBase": use_base,
                "shaftRedComp": round(eta_c, 4),
                "shaftRedTen": round(eta_t, 4),
                "LsMin": round(ls_min, 4),
                "activeReferenceId": _string(resolved_geo.get("activeReferenceId")),
                "activeReferenceLabel": _string(resolved_geo.get("activeReferenceLabel"), "—"),
                "foundingMaterialId": _string(resolved_geo.get("foundingMaterialId")),
                "foundingMaterialLabel": _string(resolved_geo.get("foundingLabel")),
                "foundingLabel": _string(resolved_geo.get("foundingLabel")),
                "foundingSourceReferenceLabel": _string(
                    resolved_geo.get("foundingSourceReferenceLabel"), "—"
                ),
                "foundingResolutionMode": founding_resolution_mode,
                "foundingUsesLegacyFallback": bool(resolved_geo.get("foundingUsesLegacyFallback")),
                "foundingMissingSelection": bool(resolved_geo.get("foundingMissingSelection")),
                "foundingMissingCapacity": bool(resolved_geo.get("foundingMissingCapacity")),
                "foundingFmsComp": round(qs_rock_comp, 4),
                "foundingFmsTen": round(qs_rock_ten, 4),
                "foundingFbUlt": round(qb_rock, 4),
                "foundingFmsAllow": _nullable_float(
                    resolved_geo.get("foundingFmsAllow"), minimum=0.0
                ),
                "foundingFbAllow": _nullable_float(
                    resolved_geo.get("foundingFbAllow"), minimum=0.0
                ),
                "resolvedFmSComp": round(qs_rock_comp, 4),
                "resolvedFmSTen": round(qs_rock_ten, 4),
                "resolvedFbUlt": round(qb_rock, 4),
                "resolvedFbAllow": _nullable_float(
                    resolved_geo.get("foundingFbAllow"), minimum=0.0
                ),
                "inputWarnings": input_warnings,
                "socketAdoptionNote": socket_adoption_note,
                "layerRows": layer_rows,
                "socketContributionBreakdown": socket_breakdown,
                "updatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            }
        else:
            rs_rock_comp = math.pi * diameter * ls_adopted * qs_rock_comp
            rs_rock_ten = math.pi * diameter * ls_adopted * qs_rock_ten
            shaft_ult_comp = eta_c * (rs_soil_comp + rs_rock_comp)
            shaft_ult_ten = eta_t * (rs_soil_ten + rs_rock_ten)
            rug_comp = shaft_ult_comp + base_ult
            rug_ten = shaft_ult_ten
            phi_r_comp = phi * rug_comp
            phi_r_ten = phi * rug_ten
            util_comp = (
                (100.0 * n_comp_eff / phi_r_comp)
                if n_comp_eff > 0 and phi_r_comp > 0
                else (0.0 if n_comp_eff <= 0 else float("inf"))
            )
            util_ten = (
                (100.0 * n_ten / phi_r_ten)
                if n_ten > 0 and phi_r_ten > 0
                else (0.0 if n_ten <= 0 else float("inf"))
            )
            ok_comp = phi_r_comp >= n_comp_eff
            ok_ten = phi_r_ten >= n_ten
            row = {
                "jointId": joint_id,
                "jointDisplayName": _string(
                    envelope_row.get("jointDisplayName") or joint.get("displayName")
                ),
                "pileId": _string(representative_pile.get("id"), f"{joint_id}-P1"),
                "typeId": type_id,
                "activePatternIds": [
                    _string(pattern_id)
                    for pattern_id in envelope_row.get("activePatternIds", [])
                    if _string(pattern_id)
                ],
                "redundancy": "HIGH"
                if _string(geo_settings.get("redundancy")).upper() == "HIGH"
                else "LOW",
                "status": "resolved",
                "pendingReason": "",
                "Nmax": round(n_max, 4),
                "Nmin": round(n_min, 4),
                "upliftAbs": round(uplift_abs, 4),
                "Nnf": round(nnf, 4),
                "phi": round(phi, 4),
                "phiRcomp": round(phi_r_comp, 4),
                "phiRten": round(phi_r_ten, 4),
                "utilComp": round(util_comp, 4) if math.isfinite(util_comp) else util_comp,
                "utilTen": round(util_ten, 4) if math.isfinite(util_ten) else util_ten,
                "ok": bool(ok_comp and ok_ten),
                "diameter": round(diameter, 6),
                "Ls": round(ls_adopted, 4),
                "LsSolved": round(ls_solved, 4),
                "LsAdopted": round(ls_adopted, 4),
                "LsMode": ls_mode,
                "socketMode": ls_mode,
                "socketOverrideEnabled": manual_override_enabled,
                "qsRock": round(qs_rock_comp, 4),
                "qbRock": round(qb_rock, 4),
                "useBase": use_base,
                "shaftRedComp": round(eta_c, 4),
                "shaftRedTen": round(eta_t, 4),
                "LsMin": round(ls_min, 4),
                "activeReferenceId": _string(resolved_geo.get("activeReferenceId")),
                "activeReferenceLabel": _string(resolved_geo.get("activeReferenceLabel"), "—"),
                "foundingMaterialId": _string(resolved_geo.get("foundingMaterialId")),
                "foundingMaterialLabel": _string(resolved_geo.get("foundingLabel")),
                "foundingLabel": _string(resolved_geo.get("foundingLabel")),
                "foundingSourceReferenceLabel": _string(
                    resolved_geo.get("foundingSourceReferenceLabel"), "—"
                ),
                "foundingResolutionMode": founding_resolution_mode,
                "foundingUsesLegacyFallback": bool(resolved_geo.get("foundingUsesLegacyFallback")),
                "foundingMissingSelection": bool(resolved_geo.get("foundingMissingSelection")),
                "foundingMissingCapacity": bool(resolved_geo.get("foundingMissingCapacity")),
                "foundingFmsComp": round(qs_rock_comp, 4),
                "foundingFmsTen": round(qs_rock_ten, 4),
                "foundingFbUlt": round(qb_rock, 4),
                "foundingFmsAllow": _nullable_float(
                    resolved_geo.get("foundingFmsAllow"), minimum=0.0
                ),
                "foundingFbAllow": _nullable_float(
                    resolved_geo.get("foundingFbAllow"), minimum=0.0
                ),
                "resolvedFmSComp": round(qs_rock_comp, 4),
                "resolvedFmSTen": round(qs_rock_ten, 4),
                "resolvedFbUlt": round(qb_rock, 4),
                "resolvedFbAllow": _nullable_float(
                    resolved_geo.get("foundingFbAllow"), minimum=0.0
                ),
                "inputWarnings": input_warnings,
                "socketAdoptionNote": socket_adoption_note,
                "layerRows": layer_rows,
                "socketContributionBreakdown": socket_breakdown,
                "updatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            }

        if row["status"] == "pending":
            warnings.append(
                {
                    "code": "MULTI_PILE_GEO_PENDING",
                    "message": f"GEO pending for joint {joint_id}: {row['pendingReason']}",
                    "clauseRef": "AS 2159 Section 4.4",
                }
            )

        geo_results[joint_id] = row

    return geo_results, warnings
