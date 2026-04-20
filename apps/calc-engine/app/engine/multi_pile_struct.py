from __future__ import annotations

import math
import time

STRUCT_UI_STATE_KEY = "multiPileStructDesigner"
DEFAULT_PROJECT_STRUCTURAL_CONCRETE_CLASS_ID = "conc_32"
DEFAULT_PROJECT_STRUCTURAL_REINFORCEMENT_GRADE_ID = "reo_d500n"
DEFAULT_PROJECT_STRUCTURAL_COVER_CLASS_ID = "cover_mild_100y"

FC_EC_MAP = {
    20: 24000,
    25: 26700,
    32: 30100,
    40: 32800,
    50: 34800,
    65: 37400,
    80: 39600,
    100: 42200,
    120: 44400,
}

REO_DEFAULTS_BY_DIAMETER = {
    450: {
        "barDia": 20,
        "nBars": 6,
        "tieDia": 12,
        "tieS": 200,
        "tieLegs": 2,
        "transverseSystem": "ties",
        "spiralDia": 12,
        "spiralPitch": 200,
    },
    500: {
        "barDia": 20,
        "nBars": 6,
        "tieDia": 12,
        "tieS": 200,
        "tieLegs": 2,
        "transverseSystem": "ties",
        "spiralDia": 12,
        "spiralPitch": 200,
    },
    600: {
        "barDia": 20,
        "nBars": 8,
        "tieDia": 12,
        "tieS": 200,
        "tieLegs": 2,
        "transverseSystem": "ties",
        "spiralDia": 12,
        "spiralPitch": 200,
    },
    750: {
        "barDia": 20,
        "nBars": 10,
        "tieDia": 12,
        "tieS": 200,
        "tieLegs": 2,
        "transverseSystem": "ties",
        "spiralDia": 12,
        "spiralPitch": 200,
    },
    900: {
        "barDia": 20,
        "nBars": 12,
        "tieDia": 12,
        "tieS": 200,
        "tieLegs": 2,
        "transverseSystem": "ties",
        "spiralDia": 12,
        "spiralPitch": 200,
    },
    1050: {
        "barDia": 20,
        "nBars": 14,
        "tieDia": 12,
        "tieS": 200,
        "tieLegs": 2,
        "transverseSystem": "ties",
        "spiralDia": 12,
        "spiralPitch": 200,
    },
    1200: {
        "barDia": 20,
        "nBars": 16,
        "tieDia": 12,
        "tieS": 200,
        "tieLegs": 2,
        "transverseSystem": "ties",
        "spiralDia": 12,
        "spiralPitch": 200,
    },
    1500: {
        "barDia": 24,
        "nBars": 20,
        "tieDia": 16,
        "tieS": 200,
        "tieLegs": 2,
        "transverseSystem": "ties",
        "spiralDia": 16,
        "spiralPitch": 200,
    },
    1800: {
        "barDia": 24,
        "nBars": 24,
        "tieDia": 16,
        "tieS": 200,
        "tieLegs": 2,
        "transverseSystem": "ties",
        "spiralDia": 16,
        "spiralPitch": 200,
    },
}

BAR_AREAS = {
    16: 201,
    20: 314,
    24: 452,
    28: 616,
    32: 804,
    36: 1018,
    40: 1257,
}

BAR_DIA_OPTIONS = (16, 20, 24, 28, 32, 36, 40)
TIE_DIA_OPTIONS = (10, 12, 16)


def compute_struct_results(
    state: dict,
    project_specifics: dict,
    envelope_joint_results: list[dict],
) -> dict[str, dict]:
    pile_types = {
        _string(row.get("id")): row
        for row in state.get("pileTypes", [])
        if isinstance(row, dict) and row.get("id")
    }
    if not pile_types:
        return {}

    grouped_joint_rows: dict[str, list[dict]] = {}
    for row in envelope_joint_results:
        if not isinstance(row, dict):
            continue
        type_id = _string(row.get("pileTypeId"))
        if not type_id or type_id not in pile_types:
            continue
        grouped_joint_rows.setdefault(type_id, []).append(row)

    if not grouped_joint_rows:
        return {}

    results: dict[str, dict] = {}
    for type_id, joint_rows in grouped_joint_rows.items():
        pile_type = _object(pile_types.get(type_id))
        settings = _normalize_struct_type_settings(
            pile_type,
            _struct_settings_for_type(state, type_id),
        )
        resolved_inputs = _resolve_structural_inputs(project_specifics, settings)
        cases = [
            _compute_struct_design(pile_type, settings, resolved_inputs, row) for row in joint_rows
        ]
        if not cases:
            continue

        worst_case = max(cases, key=lambda row: row["designScore"])
        demand_points = [point for row in cases for point in row["pmDemands"]]
        shear_demand_cases = [
            {
                "jointId": row["jointId"],
                "pileId": row["pileId"],
                "label": _shear_point_label(row),
                "Vstar": _round(row["Vstar"], 4),
                "pass": bool(row["shearOk"]),
            }
            for row in cases
        ]
        overall_ok = all(bool(row["structOk"]) for row in cases)
        input_warnings = list(dict.fromkeys(resolved_inputs["inputWarnings"]))
        status = "pass" if overall_ok else "fail"
        if status == "pass" and input_warnings:
            status = "warning"

        demand_point = (
            worst_case["pmDemands"][0]
            if worst_case["pmDemands"]
            else {
                "N": _round(worst_case["Nmax"], 4),
                "M": _round(worst_case["Mplot"], 4),
                "jointId": worst_case["jointId"],
                "pileId": worst_case["pileId"],
                "label": _pm_point_label(worst_case, "Nmax"),
                "cls": "pmDot",
            }
        )

        results[type_id] = {
            "pileTypeId": type_id,
            "linkedJointIds": [
                _string(row.get("jointId")) for row in joint_rows if row.get("jointId")
            ],
            "representativePileId": worst_case["pileId"],
            "worstJointId": worst_case["jointId"],
            "updatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "status": status,
            "overallOk": overall_ok,
            "inputWarnings": input_warnings,
            "sectionValues": {
                "phiPn": _round(worst_case["phiNuComp"], 4),
                "phiMn": _round(max(worst_case["phiMux"], worst_case["phiMuy"]), 4),
                "phiVu": _round(worst_case["phiVu"], 4),
                "utilisation": _round(worst_case["designScore"], 6),
                "pass": bool(worst_case["structOk"]),
            },
            "axial": {
                "N_capacity": _round(worst_case["phiNuComp"], 4),
                "N_tension_capacity": _round(worst_case["phiNuTen"], 4),
                "N_demand": _round(worst_case["Nmax"], 4),
                "N_tension_demand": _round(worst_case["upliftAbs"], 4),
                "compressionUtilisation": _round(worst_case["utilCompRatio"], 6),
                "tensionUtilisation": _round(worst_case["utilTenRatio"], 6),
                "utilisation": _round(
                    max(worst_case["utilCompRatio"], worst_case["utilTenRatio"]), 6
                ),
                "pass": bool(worst_case["axialOk"]),
            },
            "moment": {
                "Mx_capacity": _round(worst_case["phiMux"], 4),
                "My_capacity": _round(worst_case["phiMuy"], 4),
                "M_capacity": _round(max(worst_case["phiMux"], worst_case["phiMuy"]), 4),
                "M_demand": _round(worst_case["Mplot"], 4),
                "Mx_demand": _round(worst_case["MxDes"], 4),
                "My_demand": _round(worst_case["MyDes"], 4),
                "phiMu0": _round(worst_case["phiMu0"], 4),
                "phiNuo": _round(worst_case["phiNuo"], 4),
                "phiN03Agfc": _round(worst_case["phiN03Agfc"], 4),
                "alphaN": _round(worst_case["alphaN"], 6),
                "utilisation": _round(worst_case["utilPMRatio"], 6),
                "pass": bool(worst_case["pmOk"]),
                "biaxial": settings["useBiax"] == "YES",
            },
            "shear": {
                "Vu_capacity": _round(worst_case["phiVu"], 4),
                "Vu_max_capacity": _round(worst_case["phiVumax"], 4),
                "Vu_demand": _round(worst_case["Vstar"], 4),
                "Vx_demand": _round(worst_case["VxDes"], 4),
                "Vy_demand": _round(worst_case["VyDes"], 4),
                "Vuc": _round(worst_case["Vuc"], 4),
                "Vus": _round(worst_case["Vus"], 4),
                "Vu": _round(worst_case["Vu"], 4),
                "Vumax": _round(worst_case["Vumax"], 4),
                "okMinAsv": bool(worst_case["okMinAsv"]),
                "shearReoRequired": bool(worst_case["shearReoReq"]),
                "utilisation": _round(worst_case["utilShearRatio"], 6),
                "webUtilisation": _round(worst_case["utilWebRatio"], 6),
                "pass": bool(worst_case["shearOk"]),
                "demandCases": shear_demand_cases,
            },
            "interaction": {
                "curve": worst_case["pmCurve"],
                "demandPoint": demand_point,
                "demandPoints": demand_points,
            },
            "utilisation": {
                "axial": _round(max(worst_case["utilCompRatio"], worst_case["utilTenRatio"]), 6),
                "moment": _round(worst_case["utilPMRatio"], 6),
                "shear": _round(worst_case["utilShearRatio"], 6),
                "web": _round(worst_case["utilWebRatio"], 6),
                "governing": _round(worst_case["designScore"], 6),
            },
            "checks": {
                "axial": bool(worst_case["axialOk"]),
                "moment": bool(worst_case["pmOk"]),
                "shear": bool(worst_case["shearOk"]),
                "web": bool(worst_case["okWeb"]),
                "minShearReinforcement": bool(worst_case["okMinAsv"]),
                "struct": bool(worst_case["structOk"]),
            },
            "reinforcementCompliance": _build_reinforcement_compliance_result(
                worst_case,
                settings,
                resolved_inputs,
            ),
        }

    return results


def _compute_struct_design(
    pile_type: dict,
    settings: dict,
    resolved_inputs: dict,
    envelope_row: dict,
) -> dict:
    actions = {
        "jointId": _string(envelope_row.get("jointId")),
        "jointDisplayName": _string(envelope_row.get("jointDisplayName")),
        "pileId": _string(
            envelope_row.get("representativePileId") or f"{_string(envelope_row.get('jointId'))}-P1"
        ),
        "typeId": _string(envelope_row.get("pileTypeId") or pile_type.get("id")),
        "Nmax": _value_from_envelope(envelope_row.get("nMax")),
        "Nmin": _value_from_envelope(envelope_row.get("nMin")),
        "VxDes": _value_from_envelope(envelope_row.get("vx")),
        "VyDes": _value_from_envelope(envelope_row.get("vy")),
        "MxDes": _value_from_envelope(envelope_row.get("mx")),
        "MyDes": _value_from_envelope(envelope_row.get("my")),
        "activePatternIds": [
            _string(pattern_id)
            for pattern_id in envelope_row.get("activePatternIds", [])
            if _string(pattern_id)
        ],
    }

    fc = max(10.0, _number(resolved_inputs.get("fc"), 32.0))
    fsy = max(250.0, _number(resolved_inputs.get("fsy"), 500.0))
    phi_c = _number(settings.get("phiC"), 0.65) if settings["phiOverride"] else 0.65
    phi_t = _number(settings.get("phiT"), 0.85) if settings["phiOverride"] else 0.85
    phi_b = 0.65

    nmax = _number(actions["Nmax"])
    nmin = _number(actions["Nmin"])
    uplift_abs = max(0.0, -nmin)
    vx_des = abs(_number(actions["VxDes"]))
    vy_des = abs(_number(actions["VyDes"]))
    vstar = max(vx_des, vy_des)
    mx_des = abs(_number(actions["MxDes"]))
    my_des = abs(_number(actions["MyDes"]))

    diameter_mm = max(
        50.0, _number(pile_type.get("Dmm") or pile_type.get("nominalDiameterMm"), 600.0)
    )
    diameter_m = diameter_mm / 1000.0
    ag_mm2 = math.pi * diameter_mm * diameter_mm / 4.0

    rho_min = 0.005
    if settings["minReoRule"] == "precast":
        rho_min = 0.014
    elif settings["minReoRule"] == "other_above":
        rho_min = 0.005 if settings["reoLoc"] == "below3d" else 0.014
    as_min = rho_min * ag_mm2
    as_max = 0.04 * ag_mm2

    dbar = _number(settings.get("barDia"), 20.0)
    as_bar = _bar_area_from_dia(dbar)
    n_bars_user = max(0, round(_number(settings.get("nBars"), 0.0)))
    as_req_ten = (uplift_abs * 1000.0) / max(phi_t * fsy, 1e-9) if uplift_abs > 0 else 0.0
    as_req = max(as_min, as_req_ten)
    n_bars = n_bars_user if n_bars_user > 0 else max(4, math.ceil(as_req / max(as_bar, 1e-9)))
    as_perim = n_bars * as_bar
    as_central = _central_bar_area(settings)
    as_total = as_perim + as_central
    ok_as_max = True if settings["allowAsOver"] else (as_total <= as_max + 1e-9)

    alpha1 = _alpha1_from_fc(fc)
    ac_mm2 = max(ag_mm2 - as_total, 0.0)
    k_place = min(1.0, max(0.75, _number(settings.get("kPlace"), 1.0)))
    ax_model = settings["axModel"]

    conc_term_n = 0.0
    steel_term_n = 0.0
    if ax_model == "reinforced":
        conc_term_n = alpha1 * fc * ac_mm2 * k_place
        steel_term_n = fsy * as_total
    elif ax_model == "partial":
        conc_term_n = 0.5 * fc * ag_mm2 * k_place
    else:
        conc_term_n = 0.45 * fc * ag_mm2 * k_place

    nu0_kn = (conc_term_n + steel_term_n) / 1000.0
    phi_nu_comp = phi_c * nu0_kn
    nlim_partial_kn = 0.5 * k_place * fc * (ag_mm2 / 1000.0)
    nlim_plain_kn = 0.45 * k_place * fc * (ag_mm2 / 1000.0)
    ok_unreinforced_limit = True
    if ax_model == "partial":
        ok_unreinforced_limit = nmax <= nlim_partial_kn + 1e-9
    elif ax_model == "plain":
        ok_unreinforced_limit = nmax <= nlim_plain_kn + 1e-9

    has_central = bool(settings["useCentralBar"] and as_central > 0)
    developed_at_head = has_central and bool(settings["centralBarDevelopedAtHead"])
    effective_areas = _compute_effective_areas(
        as_perim, as_central, ax_model, has_central, developed_at_head
    )
    phi_nu_ten = phi_t * (fsy * effective_areas["As_tension_effective"] / 1000.0)
    util_comp_ratio = (nmax / max(phi_nu_comp, 1e-9)) if nmax > 0 else 0.0
    util_ten_ratio = (uplift_abs / max(phi_nu_ten, 1e-9)) if uplift_abs > 0 else 0.0
    ok_comp = nmax <= phi_nu_comp + 1e-9
    ok_tension = uplift_abs <= phi_nu_ten + 1e-9

    es = max(100000.0, _number(resolved_inputs.get("Es"), settings.get("Es") or 200000.0))
    alpha2 = max(0.67, 0.85 - 0.0015 * fc)
    gam = max(0.67, 0.97 - 0.0025 * fc)
    eps_cu = 0.003
    cover = max(0.0, _number(settings.get("cover"), 75.0))
    layout = _struct_bar_layout(diameter_mm, cover, dbar, n_bars)
    r = layout["R"]
    bars = layout["bars"]

    def seg_area_centroid(h: float) -> dict[str, float]:
        if h <= 0:
            return {"A": 0.0, "ybar": 0.0}
        if h >= 2 * r:
            return {"A": math.pi * r * r, "ybar": r}
        a = r - h
        theta = 2.0 * math.acos(a / r)
        area = r * r * (theta - math.sin(theta)) / 2.0
        yseg = (4.0 * r * math.sin(theta / 2.0) ** 3) / (3.0 * (theta - math.sin(theta)))
        return {"A": area, "ybar": r - yseg}

    points: list[dict[str, float]] = []
    for step in range(1, 121):
        c = (2.0 * r) * step / 120.0
        h = min(2.0 * r, gam * c)
        seg = seg_area_centroid(h)
        n_value = alpha2 * fc * seg["A"]
        m_value = n_value * (seg["ybar"] - r)
        for bar in bars:
            eps = eps_cu * (c - bar["yTop"]) / c
            sig = es * eps
            if sig > fsy:
                sig = fsy
            if sig < -fsy:
                sig = -fsy
            fs = sig * as_bar
            n_value += fs
            m_value += fs * (bar["yTop"] - r)
        points.append({"N": _round(n_value / 1000.0, 6), "M": _round(abs(m_value) / 1e6, 6)})
    points.sort(key=lambda point: point["N"], reverse=True)

    def interp_mu(nd: float) -> float:
        if not points:
            return 0.0
        if nd >= points[0]["N"]:
            return points[0]["M"]
        if nd <= points[-1]["N"]:
            return points[-1]["M"]
        for index in range(len(points) - 1):
            n1 = points[index]["N"]
            m1 = points[index]["M"]
            n2 = points[index + 1]["N"]
            m2 = points[index + 1]["M"]
            if nd <= n1 and nd >= n2:
                t = (nd - n2) / max(n1 - n2, 1e-9)
                return m2 + t * (m1 - m2)
        return points[-1]["M"]

    mu_x = interp_mu(nmax)
    mu_y = mu_x
    phi_mux = phi_b * mu_x
    phi_muy = phi_b * mu_y
    nuo = alpha1 * fc * ag_mm2 / 1000.0
    phi_nuo = phi_b * nuo
    alpha_n = 0.7 + 1.7 * (nmax / phi_nuo) if phi_nuo > 0 else 2.0
    alpha_n = min(2.0, max(1.0, alpha_n))
    if settings["useBiax"] == "YES":
        util_pm_ratio = math.pow(mx_des / max(phi_mux, 1e-9), alpha_n) + math.pow(
            my_des / max(phi_muy, 1e-9), alpha_n
        )
        mplot = math.hypot(mx_des, my_des)
    else:
        util_pm_ratio = max(mx_des / max(phi_mux, 1e-9), my_des / max(phi_muy, 1e-9))
        mplot = max(mx_des, my_des)
    ok_pm = util_pm_ratio <= 1.0 + 1e-9
    phi_mu0 = phi_b * interp_mu(0.0)

    le_value = settings["Le"]
    slender = None
    is_slender = False
    if le_value is not None:
        slender = le_value / max(0.25 * diameter_m, 1e-9)
        is_slender = slender > (22.0 if settings["brace"] == "UNBRACED" else 25.0) + 1e-9

    is_spiral = settings["transverseSystem"] == "spiral"
    tie_dia = _number(settings.get("spiralDia" if is_spiral else "tieDia"), 12.0)
    tie_s = max(
        25.0 if is_spiral else 50.0,
        _number(settings.get("spiralPitch" if is_spiral else "tieS"), 200.0),
    )
    tie_legs = 2 if is_spiral else max(2, round(_number(settings.get("tieLegs"), 2.0)))
    dg = max(10.0, _number(settings.get("dg"), 20.0))
    bv = diameter_mm
    d_eff = max(50.0, diameter_mm - cover - tie_dia - 0.5 * dbar)
    dv = max(0.72 * diameter_mm, 0.9 * d_eff)
    theta_v_deg = 36.0
    theta_v = math.radians(theta_v_deg)
    asv_bar = _bar_area_from_dia(tie_dia)
    asv = 2.0 * asv_bar if is_spiral else tie_legs * asv_bar
    asv_over_s = asv / tie_s
    fsyf = min(fsy, 800.0)
    asvmin_over_s = (0.08 * math.sqrt(fc) * bv) / max(fsyf, 1e-9)
    if diameter_mm <= 300:
        ks = 1.0
    elif diameter_mm < 650:
        ks = (1000.0 - diameter_mm) / 700.0
    else:
        ks = 0.5
    kv = 0.15
    kv_lim = min(0.15, 200.0 / (1000.0 + 1.3 * dg))
    if asv_over_s < asvmin_over_s - 1e-12:
        kv = kv_lim
    cot_theta = 1.0 / math.tan(theta_v)
    vuc = kv * bv * dv * math.sqrt(fc) / 1000.0
    vus = (asv * fsyf * dv / tie_s) * cot_theta / 1000.0
    vu = vuc + vus
    phi_v = 0.75
    vumax = 0.55 * 0.9 * fc * bv * dv * (cot_theta / (1.0 + cot_theta**2)) / 1000.0
    shear_reo_req = vstar > ks * phi_v * vuc + 1e-9
    ok_min_asv = asv_over_s + 1e-12 >= asvmin_over_s
    ok_shear = phi_v * vu + 1e-9 >= vstar
    ok_web = phi_v * vumax + 1e-9 >= vstar
    shear_ok = bool(ok_shear and ok_web and (not shear_reo_req or ok_min_asv))
    axial_ok = bool(ok_comp and ok_tension and ok_as_max and ok_unreinforced_limit)
    struct_ok = bool(axial_ok and shear_ok and ok_pm)
    util_shear_ratio = (vstar / max(phi_v * vu, 1e-9)) if vstar > 0 else 0.0
    util_web_ratio = (vstar / max(phi_v * vumax, 1e-9)) if vstar > 0 else 0.0

    demand_row = {
        "jointId": actions["jointId"],
        "jointDisplayName": actions["jointDisplayName"],
        "pileId": actions["pileId"],
        "Nmin": nmin,
    }
    pm_demands = [
        {
            "N": _round(nmax, 4),
            "M": _round(mplot, 4),
            "jointId": actions["jointId"],
            "pileId": actions["pileId"],
            "label": _pm_point_label(demand_row, "Nmax"),
            "cls": "pmDot",
        }
    ]
    if nmin < -1e-9:
        pm_demands.append(
            {
                "N": _round(nmin, 4),
                "M": _round(mplot, 4),
                "jointId": actions["jointId"],
                "pileId": actions["pileId"],
                "label": _pm_point_label(demand_row, "Nmin"),
                "cls": "pmDotTen",
            }
        )
    elif abs(nmin - nmax) > 1e-9:
        pm_demands.append(
            {
                "N": _round(nmin, 4),
                "M": _round(mplot, 4),
                "jointId": actions["jointId"],
                "pileId": actions["pileId"],
                "label": _pm_point_label(demand_row, "Nmin"),
                "cls": "pmDot",
            }
        )

    return {
        "jointId": actions["jointId"],
        "jointDisplayName": actions["jointDisplayName"],
        "pileId": actions["pileId"],
        "Nmax": nmax,
        "Nmin": nmin,
        "upliftAbs": uplift_abs,
        "VxDes": vx_des,
        "VyDes": vy_des,
        "Vstar": vstar,
        "MxDes": mx_des,
        "MyDes": my_des,
        "Mplot": mplot,
        "phiNuComp": phi_nu_comp,
        "phiNuTen": phi_nu_ten,
        "phiMux": phi_mux,
        "phiMuy": phi_muy,
        "phiVu": phi_v * vu,
        "phiVumax": phi_v * vumax,
        "phiNuo": phi_nuo,
        "phiN03Agfc": phi_b * 0.3 * (ag_mm2 / 1000.0) * fc,
        "phiMu0": phi_mu0,
        "rho_min": rho_min,
        "rho_max": 0.04,
        "As_bar": as_bar,
        "As_req_ten": as_req_ten,
        "As_min": as_min,
        "As_max": as_max,
        "As": as_perim,
        "As_central": as_central,
        "As_total": as_total,
        "useCentralBar": bool(settings["useCentralBar"]),
        "centralBarDia": _number(settings.get("centralBarDia"), 0.0),
        "centralBarCount": _number(settings.get("centralBarCount"), 0.0),
        "centralBarDevelopedAtHead": developed_at_head,
        "As_bending_effective": effective_areas["As_bending_effective"],
        "As_tension_effective": effective_areas["As_tension_effective"],
        "As_head_tension_effective": effective_areas["As_head_tension_effective"],
        "As_deep_tension_effective": effective_areas["As_deep_tension_effective"],
        "tensionNote": effective_areas["tensionNote"],
        "allowAsOver": bool(settings["allowAsOver"]),
        "nBars": n_bars,
        "dbar": dbar,
        "utilCompRatio": util_comp_ratio,
        "utilTenRatio": util_ten_ratio,
        "utilPMRatio": util_pm_ratio,
        "utilShearRatio": util_shear_ratio,
        "utilWebRatio": util_web_ratio,
        "alphaN": alpha_n,
        "pmOk": ok_pm,
        "okC": ok_comp,
        "okT": ok_tension,
        "okAsMax": ok_as_max,
        "okUnreinforcedLimit": ok_unreinforced_limit,
        "Nlim_partial_kN": nlim_partial_kn,
        "Nlim_plain_kN": nlim_plain_kn,
        "okWeb": ok_web,
        "okMinAsv": ok_min_asv,
        "shearReoReq": shear_reo_req,
        "shearOk": shear_ok,
        "axialOk": axial_ok,
        "structOk": struct_ok,
        "Vuc": vuc,
        "Vus": vus,
        "Vu": vu,
        "Vumax": vumax,
        "pmCurve": points,
        "pmDemands": pm_demands,
        "slender": _round(slender, 6) if slender is not None else None,
        "isSlender": is_slender,
        "designScore": max(
            util_comp_ratio, util_ten_ratio, util_pm_ratio, util_shear_ratio, util_web_ratio
        ),
    }


def _struct_settings_for_type(state: dict, type_id: str) -> dict:
    ui_state = _object(state.get("uiState"))
    struct_ui = _object(ui_state.get(STRUCT_UI_STATE_KEY))
    type_settings = _object(_object(struct_ui.get("typeSettingsByTypeId")).get(type_id))
    return type_settings


def _default_struct_type_settings(pile_type: dict) -> dict:
    linked_dmm = max(
        50.0, _number(pile_type.get("Dmm") or pile_type.get("nominalDiameterMm"), 600.0)
    )
    reo = _default_reo_by_diameter(linked_dmm)
    return {
        "typeId": _string(pile_type.get("id")),
        "linkedDmm": linked_dmm,
        "concreteClassId": DEFAULT_PROJECT_STRUCTURAL_CONCRETE_CLASS_ID,
        "reinforcementGradeId": DEFAULT_PROJECT_STRUCTURAL_REINFORCEMENT_GRADE_ID,
        "tendonGradeId": "",
        "coverDurabilityClassId": DEFAULT_PROJECT_STRUCTURAL_COVER_CLASS_ID,
        "fcGrade": "32",
        "fcCustom": 32.0,
        "fc": 32.0,
        "Ec": _ec_from_fc(32.0),
        "fsy": 500.0,
        "kPlace": "1.0",
        "kMethod": "all",
        "axModel": "reinforced",
        "reoCutDepth": 0.0,
        "reoLd": 0.0,
        "minReoRule": "other_embedded",
        "reoLoc": "below3d",
        "reoLocDetail": "below3d",
        "allowAsOver": False,
        "phiOverride": False,
        "phiC": 0.65,
        "phiT": 0.85,
        "barDia": reo["barDia"],
        "nBars": reo["nBars"],
        "cover": 75.0,
        "Es": 200000.0,
        "useBiax": "YES",
        "brace": "BRACED",
        "Le": None,
        "transverseSystem": reo["transverseSystem"],
        "tieDia": reo["tieDia"],
        "tieS": reo["tieS"],
        "tieLegs": reo["tieLegs"],
        "spiralDia": reo["spiralDia"],
        "spiralPitch": reo["spiralPitch"],
        "dg": 20.0,
        "useCentralBar": False,
        "centralBarDia": 24.0,
        "centralBarCount": 0,
        "centralBarDevelopedAtHead": False,
    }


def _normalize_struct_type_settings(pile_type: dict, raw: dict) -> dict:
    defaults = _default_struct_type_settings(pile_type)
    candidate = {**defaults, **raw}
    has_explicit_concrete_class_id = "concreteClassId" in raw
    has_explicit_reinforcement_grade_id = "reinforcementGradeId" in raw
    has_explicit_tendon_grade_id = "tendonGradeId" in raw
    has_explicit_cover_class_id = "coverDurabilityClassId" in raw
    fc_grade = _string(candidate.get("fcGrade") or defaults["fcGrade"]) or "32"
    fc_custom = max(10.0, _number(candidate.get("fcCustom"), defaults["fcCustom"]))
    if candidate.get("fc") not in (None, ""):
        fc = max(10.0, _number(candidate.get("fc"), defaults["fc"]))
    elif fc_grade == "custom":
        fc = fc_custom
    else:
        fc = max(10.0, _number(fc_grade, defaults["fc"]))

    le_text = str(candidate.get("Le") or "").strip()
    le_value = _number(le_text, None) if le_text else None
    if le_value is not None and le_value < 0:
        le_value = None

    return {
        "typeId": _string(candidate.get("typeId") or pile_type.get("id")),
        "linkedDmm": max(50.0, _number(candidate.get("linkedDmm"), defaults["linkedDmm"])),
        "concreteClassId": (
            _string(candidate.get("concreteClassId"))
            if has_explicit_concrete_class_id
            else _string(candidate.get("concreteClassId") or defaults["concreteClassId"])
        ),
        "reinforcementGradeId": (
            _string(candidate.get("reinforcementGradeId"))
            if has_explicit_reinforcement_grade_id
            else _string(candidate.get("reinforcementGradeId") or defaults["reinforcementGradeId"])
        ),
        "tendonGradeId": (
            _string(candidate.get("tendonGradeId"))
            if has_explicit_tendon_grade_id
            else _string(candidate.get("tendonGradeId"))
        ),
        "coverDurabilityClassId": (
            _string(candidate.get("coverDurabilityClassId"))
            if has_explicit_cover_class_id
            else _string(
                candidate.get("coverDurabilityClassId") or defaults["coverDurabilityClassId"]
            )
        ),
        "fc": fc,
        "Ec": max(1000.0, _number(candidate.get("Ec"), _ec_from_fc(fc))),
        "fsy": max(250.0, _number(candidate.get("fsy"), defaults["fsy"])),
        "Es": max(100000.0, _number(candidate.get("Es"), defaults["Es"])),
        "kPlace": "0.75" if str(candidate.get("kPlace")) == "0.75" else "1.0",
        "kMethod": _string(candidate.get("kMethod") or defaults["kMethod"]) or "all",
        "axModel": _one_of(
            candidate.get("axModel"), ("reinforced", "partial", "plain"), defaults["axModel"]
        ),
        "reoCutDepth": max(0.0, _number(candidate.get("reoCutDepth"), defaults["reoCutDepth"])),
        "reoLd": max(0.0, _number(candidate.get("reoLd"), defaults["reoLd"])),
        "minReoRule": _one_of(
            candidate.get("minReoRule"),
            ("other_embedded", "other_above", "precast"),
            defaults["minReoRule"],
        ),
        "reoLoc": _one_of(candidate.get("reoLoc"), ("below3d", "within3d"), defaults["reoLoc"]),
        "reoLocDetail": _one_of(
            candidate.get("reoLocDetail"),
            ("above", "within3d", "below3d"),
            defaults["reoLocDetail"],
        ),
        "allowAsOver": _bool(candidate.get("allowAsOver")),
        "phiOverride": _bool(candidate.get("phiOverride")),
        "phiC": min(1.0, max(0.4, _number(candidate.get("phiC"), defaults["phiC"]))),
        "phiT": min(1.0, max(0.4, _number(candidate.get("phiT"), defaults["phiT"]))),
        "barDia": _one_of_number(candidate.get("barDia"), BAR_DIA_OPTIONS, defaults["barDia"]),
        "nBars": max(0, round(_number(candidate.get("nBars"), defaults["nBars"]))),
        "cover": max(0.0, _number(candidate.get("cover"), defaults["cover"])),
        "useBiax": "NO" if str(candidate.get("useBiax")) == "NO" else "YES",
        "brace": "UNBRACED" if str(candidate.get("brace")) == "UNBRACED" else "BRACED",
        "Le": le_value,
        "transverseSystem": "spiral"
        if str(candidate.get("transverseSystem")).lower() == "spiral"
        else "ties",
        "tieDia": _one_of_number(candidate.get("tieDia"), TIE_DIA_OPTIONS, defaults["tieDia"]),
        "tieS": max(50.0, _number(candidate.get("tieS"), defaults["tieS"])),
        "tieLegs": max(2, round(_number(candidate.get("tieLegs"), defaults["tieLegs"]))),
        "spiralDia": _one_of_number(
            candidate.get("spiralDia"), TIE_DIA_OPTIONS, defaults["spiralDia"]
        ),
        "spiralPitch": max(25.0, _number(candidate.get("spiralPitch"), defaults["spiralPitch"])),
        "dg": max(10.0, _number(candidate.get("dg"), defaults["dg"])),
        "useCentralBar": _bool(candidate.get("useCentralBar")),
        "centralBarDia": _one_of_number(
            candidate.get("centralBarDia"), BAR_DIA_OPTIONS, defaults["centralBarDia"]
        ),
        "centralBarCount": max(
            0, round(_number(candidate.get("centralBarCount"), defaults["centralBarCount"]))
        ),
        "centralBarDevelopedAtHead": _bool(candidate.get("centralBarDevelopedAtHead")),
    }


def _resolve_structural_inputs(project_specifics: dict, settings: dict) -> dict:
    structural_defaults = _object(project_specifics.get("structuralDefaults"))
    concrete_rows = [
        row for row in structural_defaults.get("concreteClasses", []) if isinstance(row, dict)
    ]
    reinforcement_rows = [
        row for row in structural_defaults.get("reinforcementGrades", []) if isinstance(row, dict)
    ]
    tendon_rows = [
        row for row in structural_defaults.get("tendonGrades", []) if isinstance(row, dict)
    ]
    cover_rows = [
        row
        for row in structural_defaults.get("coverDurabilityClasses", [])
        if isinstance(row, dict)
    ]

    has_project_rows = bool(concrete_rows and reinforcement_rows and cover_rows)
    selected_concrete = _find_row(concrete_rows, settings["concreteClassId"])
    selected_reinforcement = _find_row(reinforcement_rows, settings["reinforcementGradeId"])
    selected_tendon = _find_row(tendon_rows, settings["tendonGradeId"])
    selected_cover = _find_row(cover_rows, settings["coverDurabilityClassId"])

    concrete_row = selected_concrete
    reinforcement_row = selected_reinforcement
    cover_row = selected_cover
    fallback_categories = []
    if not concrete_row:
        fallback_categories.append("Concrete class")
    if not reinforcement_row:
        fallback_categories.append("Reinforcement grade")
    if not cover_row:
        fallback_categories.append("Cover / durability class")

    fc = _number(_object(concrete_row).get("fc_MPa"), settings["fc"])
    ec = _number(
        _object(concrete_row).get("Ec_MPa"), settings["Ec"] if not concrete_row else _ec_from_fc(fc)
    )
    fsy = _number(_object(reinforcement_row).get("fsy_MPa"), settings["fsy"])
    es = _number(_object(reinforcement_row).get("Es_MPa"), settings["Es"])
    nominal_cover = _cover_value(cover_row)
    if nominal_cover is None and settings["cover"] > 0:
        nominal_cover = settings["cover"]

    missing_selections = []
    if not settings["concreteClassId"]:
        missing_selections.append("Concrete class")
    if not settings["reinforcementGradeId"]:
        missing_selections.append("Reinforcement grade")
    if not settings["coverDurabilityClassId"]:
        missing_selections.append("Cover / durability class")

    missing_selected_rows = []
    if settings["concreteClassId"] and not selected_concrete:
        missing_selected_rows.append("Concrete class")
    if settings["reinforcementGradeId"] and not selected_reinforcement:
        missing_selected_rows.append("Reinforcement grade")
    if settings["coverDurabilityClassId"] and not selected_cover:
        missing_selected_rows.append("Cover / durability class")
    if settings["tendonGradeId"] and not selected_tendon:
        missing_selected_rows.append("Tendon grade")

    used_legacy_fallback = bool(fallback_categories)
    input_warnings: list[str] = []
    if missing_selections:
        input_warnings.append(
            f"Missing project defaults selection: {', '.join(missing_selections)}."
        )
    if missing_selected_rows:
        input_warnings.append(
            f"Selected project defaults could not be resolved: {', '.join(missing_selected_rows)}."
        )
    if used_legacy_fallback:
        fallback_message = (
            "Migration fallback structural values are being used for: "
            f"{', '.join(fallback_categories)} because "
        )
        input_warnings.append(
            (
                fallback_message
                + "this pile type is not yet mapped to matching project structural "
                "library rows."
            )
            if has_project_rows
            else (
                fallback_message + "this project does not yet expose all project structural "
                "library rows required by the v102c designer."
            )
        )

    return {
        "fc": max(10.0, fc),
        "Ec": max(1000.0, ec),
        "fsy": max(250.0, fsy),
        "Es": max(100000.0, es),
        "nominalCoverMm": nominal_cover,
        "reinforcementGradeId": _string(_object(reinforcement_row).get("id")),
        "reinforcementGradeLabel": _string(_object(reinforcement_row).get("displayName")),
        "usedLegacyFallback": used_legacy_fallback,
        "inputWarnings": input_warnings,
    }


def _build_reinforcement_compliance_result(
    design: dict, settings: dict, resolved_inputs: dict
) -> dict:
    as_perim = _number(design.get("As"), 0.0)
    as_min = _number(design.get("As_min"), 0.0)
    as_max = _number(design.get("As_max"), 0.0)
    override_on = bool(design.get("allowAsOver"))
    ok_as_min = as_perim + 1e-9 >= as_min
    as_max_exceeded = as_perim > as_max + 1e-9
    ok_as_max = not as_max_exceeded
    reo_limits_ok = ok_as_min and ok_as_max

    detail_bits: list[str] = []
    if not ok_as_min:
        detail_bits.append(
            "Provided As is below minimum longitudinal reinforcement "
            "required by AS 2159 Clause 5.3.3."
        )
    if as_max_exceeded:
        detail_bits.append(
            "As,max exceeded - override enabled; engineering justification required."
            if override_on
            else (
                "Provided As exceeds the AS 2159 Clause 5.3.3 maximum "
                "longitudinal reinforcement limit."
            )
        )
    if not detail_bits:
        detail_bits.append(
            "Provided As is within the AS 2159 Clause 5.3.3 longitudinal reinforcement limits."
        )

    summary_text = "OK" if reo_limits_ok else "WARNING"
    minimum_status_text = "As,min OK" if ok_as_min else "As,min NOT MET"
    maximum_status_text = (
        "As,max OK" if ok_as_max else ("As,max OVERRIDE" if override_on else "As,max NOT OK")
    )
    title_text = (
        f"As,prov={_format_reo_area(as_perim)} mm2; "
        f"As,min={_format_reo_area(as_min)} mm2 ({'MET' if ok_as_min else 'NOT MET'}); "
        f"As,max={_format_reo_area(as_max)} mm2 "
        f"{'(EXCEEDED - OVERRIDE)' if as_max_exceeded and override_on else ''}"
        f"{'(EXCEEDED)' if as_max_exceeded and not override_on else ''}"
        f"{'(MET)' if not as_max_exceeded else ''}"
    )

    return {
        "status": "pass" if reo_limits_ok else "warning",
        "summaryText": summary_text,
        "detailText": " ".join(detail_bits),
        "titleText": title_text,
        "minimumStatusText": minimum_status_text,
        "maximumStatusText": maximum_status_text,
        "provided": {
            "As_perim": _round(as_perim, 4),
            "As_central": _round(_number(design.get("As_central"), 0.0), 4),
            "As_total": _round(_number(design.get("As_total"), 0.0), 4),
            "As_bending_effective": _round(_number(design.get("As_bending_effective"), 0.0), 4),
            "As_tension_effective": _round(_number(design.get("As_tension_effective"), 0.0), 4),
            "As_head_tension_effective": _round(
                _number(design.get("As_head_tension_effective"), 0.0), 4
            ),
            "As_deep_tension_effective": _round(
                _number(design.get("As_deep_tension_effective"), 0.0), 4
            ),
        },
        "required": {
            "As_min": _round(as_min, 4),
            "As_max": _round(as_max, 4),
            "As_req_tension": _round(_number(design.get("As_req_ten"), 0.0), 4),
            "rho_min": _round(_number(design.get("rho_min"), 0.0), 6),
            "rho_max": _round(_number(design.get("rho_max"), 0.0), 6),
        },
        "checks": {
            "okAsMin": ok_as_min,
            "okAsMax": ok_as_max,
            "asMaxExceeded": as_max_exceeded,
            "overrideOn": override_on,
            "reoLimitsOk": reo_limits_ok,
        },
        "context": {
            "clauseRef": "AS 2159 Clause 5.3.3",
            "minReoRule": _string(settings.get("minReoRule")),
            "minReoRuleLabel": _min_reo_rule_label(_string(settings.get("minReoRule"))),
            "reoLoc": _string(settings.get("reoLoc")),
            "reoLocLabel": _reo_loc_label(_string(settings.get("reoLoc"))),
            "reoLocDetail": _string(settings.get("reoLocDetail")),
            "reoLocDetailLabel": _reo_loc_detail_label(_string(settings.get("reoLocDetail"))),
            "reinforcementGradeId": _string(resolved_inputs.get("reinforcementGradeId")),
            "reinforcementGradeLabel": _string(resolved_inputs.get("reinforcementGradeLabel")),
            "barDia": _round(_number(design.get("dbar"), 0.0), 4),
            "nBars": round(_number(design.get("nBars"), 0.0)),
            "useCentralBar": bool(design.get("useCentralBar")),
            "centralBarDia": _round(_number(design.get("centralBarDia"), 0.0), 4),
            "centralBarCount": round(_number(design.get("centralBarCount"), 0.0)),
            "providedAreaBasis": "perimeter",
            "providedAreaBasisLabel": "A_s,perim",
        },
    }


def _compute_effective_areas(
    as_perim: float,
    as_central: float,
    ax_model: str,
    has_central: bool,
    developed_at_head: bool,
) -> dict[str, float | str]:
    result = {
        "As_bending_effective": 0.0 if ax_model == "plain" else as_perim,
        "As_tension_effective": 0.0,
        "As_head_tension_effective": 0.0,
        "As_deep_tension_effective": 0.0,
        "tensionNote": "",
    }

    if not has_central or as_central <= 0:
        result["As_tension_effective"] = 0.0 if ax_model == "plain" else as_perim
        result["As_head_tension_effective"] = result["As_tension_effective"]
        result["As_deep_tension_effective"] = result["As_tension_effective"]
        result["tensionNote"] = (
            "Unreinforced: no steel tension capacity."
            if ax_model == "plain"
            else "Tension governed by perimeter cage (no central bar)."
        )
        return result

    if developed_at_head:
        if ax_model == "reinforced":
            result["As_tension_effective"] = as_perim + as_central
            result["As_head_tension_effective"] = as_perim + as_central
            result["As_deep_tension_effective"] = as_perim + as_central
        else:
            result["As_tension_effective"] = as_central
            result["As_head_tension_effective"] = as_central
            result["As_deep_tension_effective"] = as_central
        return result

    if ax_model == "reinforced":
        result["As_head_tension_effective"] = as_perim
        result["As_deep_tension_effective"] = as_perim + as_central
        result["As_tension_effective"] = as_perim
    elif ax_model == "partial":
        result["As_head_tension_effective"] = as_perim
        result["As_deep_tension_effective"] = as_central
        result["As_tension_effective"] = as_perim
    else:
        result["As_head_tension_effective"] = 0.0
        result["As_deep_tension_effective"] = as_central
        result["As_tension_effective"] = as_central
    return result


def _struct_bar_layout(diameter_mm: float, cover: float, dbar: float, n_bars: int) -> dict:
    radius = diameter_mm / 2.0
    r_bar = max(0.0, radius - cover - dbar / 2.0)
    bars = []
    count = max(0, round(n_bars))
    for index in range(count):
        angle = 2.0 * math.pi * index / max(count, 1)
        bars.append(
            {
                "x": r_bar * math.cos(angle),
                "y": r_bar * math.sin(angle),
                "yTop": radius - r_bar * math.sin(angle),
            }
        )
    return {"R": radius, "rBar": r_bar, "bars": bars}


def _pm_point_label(row: dict, mode: str) -> str:
    base = _joint_pile_label(row)
    if mode == "Nmax":
        return f"{base} ULS-C"
    if mode == "Nmin":
        return f"{base} ULS-U" if _number(row.get("Nmin"), 0.0) < 0 else f"{base} ULS-Nmin"
    return f"{base} ULS"


def _shear_point_label(row: dict) -> str:
    return f"{_joint_pile_label(row)} ULS-V"


def _joint_pile_label(row: dict) -> str:
    joint_label = _string(row.get("jointDisplayName") or row.get("jointId"))
    pile_label = _string(row.get("pileId"))
    return f"{joint_label}/{pile_label}" if pile_label else joint_label


def _default_reo_by_diameter(diameter_mm: float) -> dict:
    sizes = sorted(REO_DEFAULTS_BY_DIAMETER)
    nearest = sizes[0]
    for size in sizes:
        if abs(size - diameter_mm) < abs(nearest - diameter_mm):
            nearest = size
    return dict(REO_DEFAULTS_BY_DIAMETER[nearest])


def _central_bar_area(settings: dict) -> float:
    if not settings["useCentralBar"] or not (_number(settings.get("centralBarCount"), 0.0) > 0):
        return 0.0
    return _number(settings.get("centralBarCount"), 0.0) * _bar_area_from_dia(
        _number(settings.get("centralBarDia"), 24.0)
    )


def _alpha1_from_fc(fc: float) -> float:
    return min(0.85, max(0.67, 0.85 - 0.0015 * (fc - 28.0)))


def _bar_area_from_dia(diameter: float) -> float:
    rounded = int(round(diameter))
    return float(BAR_AREAS.get(rounded, math.pi * diameter * diameter / 4.0))


def _ec_from_fc(fc_value: float) -> float:
    fc = int(round(fc_value or 32.0))
    if fc in FC_EC_MAP:
        return float(FC_EC_MAP[fc])
    nearest = sorted(FC_EC_MAP, key=lambda grade: abs(grade - fc))[0]
    return float(FC_EC_MAP[nearest])


def _cover_value(row: dict | None) -> float | None:
    if not row:
        return None
    if row.get("minCoverCastInPlace_mm") is not None:
        return _number(row.get("minCoverCastInPlace_mm"), None)
    if row.get("nominalCover_mm") is not None:
        return _number(row.get("nominalCover_mm"), None)
    return None


def _pick_default_row(rows: list[dict], preferred_id: str) -> dict | None:
    if not rows:
        return None
    for row in rows:
        if _string(row.get("id")) == preferred_id:
            return row
    for row in rows:
        if row.get("active", True) is not False:
            return row
    return rows[0]


def _find_row(rows: list[dict], row_id: str) -> dict | None:
    if not row_id:
        return None
    for row in rows:
        if _string(row.get("id")) == row_id:
            return row
    return None


def _value_from_envelope(value: dict | None) -> float:
    return _number(_object(value).get("value"), 0.0)


def _min_reo_rule_label(value: str) -> str:
    if value == "precast":
        return "PRECAST RC PILES"
    if value == "other_above":
        return "OTHER PILES - PORTION ABOVE GROUND"
    return "OTHER PILES - FULLY EMBEDDED"


def _reo_loc_label(value: str) -> str:
    if value == "within3d":
        return "Within 3D"
    return "Below 3D"


def _reo_loc_detail_label(value: str) -> str:
    if value == "above":
        return "AT / ABOVE GROUND"
    if value == "within3d":
        return "WITHIN 3D"
    return "BELOW 3D"


def _format_reo_area(value: float | None) -> str:
    if value is None or not math.isfinite(value):
        return "-"
    rounded = round(float(value))
    return str(int(rounded))


def _round(value: float | None, digits: int) -> float | None:
    if value is None:
        return None
    return round(float(value), digits)


def _one_of(value: object, allowed: tuple[str, ...], fallback: str) -> str:
    text = _string(value)
    return text if text in allowed else fallback


def _one_of_number(value: object, allowed: tuple[int, ...], fallback: float) -> float:
    numeric = _number(value, fallback)
    return float(int(numeric)) if int(round(numeric)) in allowed else fallback


def _object(value: object) -> dict:
    return value if isinstance(value, dict) else {}


def _string(value: object) -> str:
    return str(value or "").strip()


def _bool(value: object) -> bool:
    return bool(value)


def _number(value: object, fallback: float | None = 0.0) -> float | None:
    if value is None and fallback is None:
        return None
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return fallback
    return numeric if math.isfinite(numeric) else fallback
