from __future__ import annotations

from dataclasses import dataclass

PATTERN_TYPES = (
    "Permanent",
    "Imposed",
    "Wind",
    "Earthquake",
    "Groundwater",
    "Other",
)


@dataclass
class ActionVector:
    N: float = 0.0
    Vx: float = 0.0
    Vy: float = 0.0
    Mx: float = 0.0
    My: float = 0.0
    Mz: float = 0.0

    def add_scaled(self, other: ActionVector, factor: float) -> None:
        self.N += other.N * factor
        self.Vx += other.Vx * factor
        self.Vy += other.Vy * factor
        self.Mx += other.Mx * factor
        self.My += other.My * factor
        self.Mz += other.Mz * factor

    def scaled(self, factor: float) -> ActionVector:
        result = ActionVector()
        result.add_scaled(self, factor)
        return result


@dataclass
class CandidateCombination:
    combination_id: str
    combination_name: str
    source: str
    include_in_envelope: bool
    expression_summary: str
    actions: ActionVector
    reference: str | None = None
    family: str | None = None
    Mx_design: float = 0.0
    My_design: float = 0.0


@dataclass
class BuiltInSpecTerm:
    mode: str
    pattern_type: str
    factor: float
    allow_reverse: bool = False


@dataclass
class BuiltInSpec:
    key: str
    display_name: str
    reference: str
    family: str
    terms: list[BuiltInSpecTerm]


def zero_vector() -> ActionVector:
    return ActionVector()


def pattern_vector_for_joint(
    joint: dict,
    pattern_id: str,
    joint_load_map: dict[tuple[str, str], ActionVector],
) -> ActionVector:
    base = joint_load_map.get((joint["id"], pattern_id), zero_vector())
    share = 1.0 / max(1, int(joint.get("supportCount", 1)))
    return ActionVector(
        N=base.N * share,
        Vx=base.Vx * share,
        Vy=base.Vy * share,
        Mx=base.Mx * share,
        My=base.My * share,
        Mz=base.Mz * share,
    )


def pattern_magnitude(vector: ActionVector) -> float:
    return (
        abs(vector.N)
        + abs(vector.Vx)
        + abs(vector.Vy)
        + abs(vector.Mx)
        + abs(vector.My)
        + abs(vector.Mz)
    )


def build_built_in_specs(settings: dict) -> list[BuiltInSpec]:
    psi_c = float(settings.get("psiC", 0.4))
    psi_e = float(settings.get("psiE", 0.3))
    psi_l = float(settings.get("psiL", 0.4))
    gamma_gw = float(settings.get("groundwaterFactor", 1.5))
    g_min = float(settings.get("minPermanentFactor", 0.7))
    g_min09 = bool(settings.get("reduceMinimumPermanentWithPointNine", False))
    g_stage = g_min * (0.9 if g_min09 else 1.0)

    return [
        BuiltInSpec(
            key="STR-4.2.2(a)",
            display_name="AS/NZS 1170.0 Cl 4.2.2(a)",
            reference="AS/NZS 1170.0 Cl 4.2.2(a)",
            family="strength",
            terms=[BuiltInSpecTerm(mode="typeSum", pattern_type="Permanent", factor=1.35)],
        ),
        BuiltInSpec(
            key="STR-4.2.2(b)",
            display_name="AS/NZS 1170.0 Cl 4.2.2(b)",
            reference="AS/NZS 1170.0 Cl 4.2.2(b)",
            family="strength",
            terms=[
                BuiltInSpecTerm(mode="typeSum", pattern_type="Permanent", factor=1.2),
                BuiltInSpecTerm(mode="typeSum", pattern_type="Imposed", factor=1.5),
            ],
        ),
        BuiltInSpec(
            key="STR-4.2.2(c)",
            display_name="AS/NZS 1170.0 Cl 4.2.2(c)",
            reference="AS/NZS 1170.0 Cl 4.2.2(c)",
            family="strength",
            terms=[
                BuiltInSpecTerm(mode="typeSum", pattern_type="Permanent", factor=1.2),
                BuiltInSpecTerm(mode="typeSum", pattern_type="Imposed", factor=1.5 * psi_l),
            ],
        ),
        BuiltInSpec(
            key="STR-4.2.2(d)",
            display_name="AS/NZS 1170.0 Cl 4.2.2(d)",
            reference="AS/NZS 1170.0 Cl 4.2.2(d)",
            family="strength",
            terms=[
                BuiltInSpecTerm(mode="typeSum", pattern_type="Permanent", factor=1.2),
                BuiltInSpecTerm(
                    mode="typeEach", pattern_type="Wind", factor=1.0, allow_reverse=True
                ),
                BuiltInSpecTerm(mode="typeSum", pattern_type="Imposed", factor=psi_c),
            ],
        ),
        BuiltInSpec(
            key="STR-4.2.2(e)",
            display_name="AS/NZS 1170.0 Cl 4.2.2(e)",
            reference="AS/NZS 1170.0 Cl 4.2.2(e)",
            family="strength",
            terms=[
                BuiltInSpecTerm(mode="typeSum", pattern_type="Permanent", factor=0.9),
                BuiltInSpecTerm(
                    mode="typeEach", pattern_type="Wind", factor=1.0, allow_reverse=True
                ),
            ],
        ),
        BuiltInSpec(
            key="STR-4.2.2(f)",
            display_name="AS/NZS 1170.0 Cl 4.2.2(f)",
            reference="AS/NZS 1170.0 Cl 4.2.2(f)",
            family="strength",
            terms=[
                BuiltInSpecTerm(mode="typeSum", pattern_type="Permanent", factor=1.0),
                BuiltInSpecTerm(
                    mode="typeEach", pattern_type="Earthquake", factor=1.0, allow_reverse=True
                ),
                BuiltInSpecTerm(mode="typeSum", pattern_type="Imposed", factor=psi_e),
            ],
        ),
        BuiltInSpec(
            key="STR-4.2.2(g)+4.2.3(e)",
            display_name="AS/NZS 1170.0 Cl 4.2.2(g) + 4.2.3(e)",
            reference="AS/NZS 1170.0 Cl 4.2.2(g) + 4.2.3(e)",
            family="strength",
            terms=[
                BuiltInSpecTerm(mode="typeSum", pattern_type="Permanent", factor=1.2),
                BuiltInSpecTerm(mode="typeSum", pattern_type="Groundwater", factor=gamma_gw),
                BuiltInSpecTerm(mode="typeSum", pattern_type="Imposed", factor=psi_c),
            ],
        ),
        BuiltInSpec(
            key="DERIVED-STB-4.2.1(a)+4.2.3(e)",
            display_name="Derived from AS/NZS 1170.0 Cl 4.2.1(a) + 4.2.3(e)",
            reference="Derived from AS/NZS 1170.0 Cl 4.2.1(a) + 4.2.3(e)",
            family="derived",
            terms=[
                BuiltInSpecTerm(mode="typeSum", pattern_type="Permanent", factor=0.9),
                BuiltInSpecTerm(mode="typeSum", pattern_type="Groundwater", factor=gamma_gw),
            ],
        ),
        BuiltInSpec(
            key="CUSTOM-DWSTOP",
            display_name="Custom dewatering stop case",
            reference="Custom construction stage / dewatering stop case",
            family="custom",
            terms=[
                BuiltInSpecTerm(mode="typeSum", pattern_type="Permanent", factor=g_stage),
                BuiltInSpecTerm(mode="typeSum", pattern_type="Groundwater", factor=gamma_gw),
            ],
        ),
    ]


def sum_pattern_type_for_joint(
    joint: dict,
    pattern_type: str,
    patterns_by_type: dict[str, list[dict]],
    joint_load_map: dict[tuple[str, str], ActionVector],
) -> tuple[ActionVector, list[str]]:
    result = zero_vector()
    refs: list[str] = []
    for pattern in patterns_by_type.get(pattern_type, []):
        vector = pattern_vector_for_joint(joint, pattern["id"], joint_load_map)
        result.add_scaled(vector, 1.0)
        if pattern_magnitude(vector) > 1e-9:
            refs.append(pattern["id"])
    return result, refs


def evaluate_built_in_for_joint(
    joint: dict,
    load_patterns: list[dict],
    joint_load_map: dict[tuple[str, str], ActionVector],
    combination_library: list[dict],
    settings: dict,
) -> list[CandidateCombination]:
    library_by_key = {
        str(row.get("builtinKey")): row
        for row in combination_library
        if row.get("source") == "built-in" and row.get("builtinKey")
    }
    active_patterns = [pattern for pattern in load_patterns if pattern.get("enabled", True)]
    patterns_by_type = {pattern_type: [] for pattern_type in PATTERN_TYPES}
    for pattern in active_patterns:
        patterns_by_type.setdefault(str(pattern["patternType"]), []).append(pattern)

    combinations: list[CandidateCombination] = []

    for spec in build_built_in_specs(settings):
        library_entry = library_by_key.get(spec.key, {})
        if library_entry.get("enabled", True) is False:
            continue

        variants = [
            {
                "actions": zero_vector(),
                "parts": [],
                "tags": [],
            }
        ]

        skip_spec = False
        for term in spec.terms:
            factor = term.factor
            if abs(factor) <= 1e-12:
                continue

            if term.mode == "typeSum":
                summed, refs = sum_pattern_type_for_joint(
                    joint, term.pattern_type, patterns_by_type, joint_load_map
                )
                if refs:
                    label = refs[0] if len(refs) == 1 else "(" + " + ".join(refs) + ")"
                else:
                    label = term.pattern_type
                part = f"{_format_factor(factor)}{label}"
                next_variants = []
                for variant in variants:
                    next_actions = zero_vector()
                    next_actions.add_scaled(variant["actions"], 1.0)
                    next_actions.add_scaled(summed, factor)
                    next_variants.append(
                        {
                            "actions": next_actions,
                            "parts": [*variant["parts"], part],
                            "tags": list(variant["tags"]),
                        }
                    )
                variants = next_variants
                continue

            pattern_candidates = patterns_by_type.get(term.pattern_type, [])
            if not pattern_candidates:
                skip_spec = True
                break

            expanded = []
            for variant in variants:
                for pattern in pattern_candidates:
                    base = pattern_vector_for_joint(joint, pattern["id"], joint_load_map)
                    if term.allow_reverse and pattern.get("reversible", False):
                        for sign, tag in ((1.0, "+"), (-1.0, "-")):
                            next_actions = zero_vector()
                            next_actions.add_scaled(variant["actions"], 1.0)
                            next_actions.add_scaled(base, factor * sign)
                            expanded.append(
                                {
                                    "actions": next_actions,
                                    "parts": [
                                        *variant["parts"],
                                        f"{_format_factor(factor * sign)}{pattern['id']}",
                                    ],
                                    "tags": [*variant["tags"], f"{pattern['id']}{tag}"],
                                }
                            )
                    else:
                        next_actions = zero_vector()
                        next_actions.add_scaled(variant["actions"], 1.0)
                        next_actions.add_scaled(base, factor)
                        expanded.append(
                            {
                                "actions": next_actions,
                                "parts": [
                                    *variant["parts"],
                                    f"{_format_factor(factor)}{pattern['id']}",
                                ],
                                "tags": [*variant["tags"], str(pattern["id"])],
                            }
                        )
            variants = expanded

        if skip_spec:
            continue

        include_in_envelope = library_entry.get("includeInEnvelope", True) is not False
        base_display_name = str(library_entry.get("displayName") or spec.display_name)
        reference = str(library_entry.get("reference") or spec.reference)
        family = str(library_entry.get("family") or spec.family)

        for index, variant in enumerate(variants):
            if variant["tags"]:
                tag_label = "[" + ", ".join(variant["tags"]) + "]"
            elif len(variants) > 1:
                tag_label = f"[v{index + 1}]"
            else:
                tag_label = ""
            name = f"{base_display_name} {tag_label}".strip()
            combination_id = f"builtin::{spec.key}"
            if variant["tags"]:
                combination_id += "::" + "::".join(variant["tags"])

            combinations.append(
                CandidateCombination(
                    combination_id=combination_id,
                    combination_name=name,
                    source="built-in",
                    include_in_envelope=include_in_envelope,
                    expression_summary=" + ".join(variant["parts"])
                    if variant["parts"]
                    else spec.reference,
                    actions=variant["actions"],
                    reference=reference,
                    family=family,
                )
            )

    return combinations


def evaluate_custom_linear_for_joint(
    joint: dict,
    load_patterns: list[dict],
    joint_load_map: dict[tuple[str, str], ActionVector],
    combination_library: list[dict],
) -> list[CandidateCombination]:
    active_patterns = {
        str(pattern["id"]): pattern for pattern in load_patterns if pattern.get("enabled", True)
    }

    combinations: list[CandidateCombination] = []
    for row in combination_library:
        if row.get("source") != "custom":
            continue
        if row.get("kind") != "linear":
            continue
        if row.get("enabled", True) is False:
            continue

        actions = zero_vector()
        parts: list[str] = []
        for term in row.get("terms", []) or []:
            pattern_id = str(term.get("patternId") or "")
            if pattern_id not in active_patterns:
                continue
            factor = float(term.get("factor") or 0.0)
            if abs(factor) <= 1e-12:
                continue
            vector = pattern_vector_for_joint(joint, pattern_id, joint_load_map)
            actions.add_scaled(vector, factor)
            parts.append(f"{_format_factor(factor)}{pattern_id}")

        combinations.append(
            CandidateCombination(
                combination_id=str(row.get("id") or ""),
                combination_name=str(row.get("displayName") or row.get("id") or "Custom"),
                source="custom",
                include_in_envelope=row.get("includeInEnvelope", True) is not False,
                expression_summary=str(
                    row.get("expressionSummary")
                    or " + ".join(parts)
                    or row.get("displayName")
                    or "Custom"
                ),
                actions=actions,
                reference=str(row.get("reference") or "") or None,
                family=str(row.get("family") or "custom"),
            )
        )
    return combinations


def _format_factor(value: float) -> str:
    if abs(value - round(value)) < 1e-9:
        return f"{int(round(value))}×"
    return f"{value:.3f}".rstrip("0").rstrip(".") + "×"
