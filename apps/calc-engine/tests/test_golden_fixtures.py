"""Golden fixture tests — hand-verified pile group examples."""

import json
import math
from pathlib import Path

import pytest

from app.engine.load_combinations import CombinedActions
from app.engine.pile_group import compute_reactions, parse_pile_positions, run
from app.models.calculation import (
    CalculationRequest,
    InputValue,
    LoadCombination,
    LoadCombinationFactor,
    RuleEntry,
    RulePack,
    StandardRef,
)

FIXTURES_DIR = Path(__file__).parent / "fixtures"


def _load_golden():
    with open(FIXTURES_DIR / "pile_group_golden.json") as f:
        return json.load(f)


def _iv(value: float, unit: str = "N", label: str = "") -> InputValue:
    return InputValue(value=value, unit=unit, label=label or str(value))


def _build_inputs(raw: dict) -> dict[str, InputValue]:
    unit_map = {
        "grid_nx": "count",
        "grid_ny": "count",
        "pile_count": "count",
        "grid_spacing_x": "m",
        "grid_spacing_y": "m",
    }
    result: dict[str, InputValue] = {}
    for key, val in raw.items():
        unit = unit_map.get(key, "N" if "_N" in key or "_Vx" in key or "_Vy" in key else "m")
        if "_Mx" in key or "_My" in key or "_T" in key:
            unit = "N·m"
        result[key] = _iv(val, unit)
    return result


def _build_combo(raw: dict) -> LoadCombination:
    return LoadCombination(
        id=raw["id"],
        name=raw["name"],
        limitState=raw["limitState"],
        factors=[
            LoadCombinationFactor(
                loadCaseId=f["loadCaseId"], factor=f["factor"], source=f["source"]
            )
            for f in raw["factors"]
        ],
        clauseRef=raw["clauseRef"],
    )


class TestGolden2x2PureAxial:
    """Fixture: 2x2_grid_pure_axial"""

    def test_reactions(self):
        data = _load_golden()
        fix = data["fixtures"][0]
        assert fix["name"] == "2x2_grid_pure_axial"

        inputs = _build_inputs(fix["inputs"])
        piles, errors, _ = parse_pile_positions(inputs)
        assert not errors
        assert len(piles) == 4

        combo = _build_combo(fix["combination"])
        ca = CombinedActions(
            combination_id=combo.id,
            combination_name=combo.name,
            limit_state=combo.limit_state.value,
            clause_ref=combo.clause_ref,
            actions={"N": 4000.0, "Vx": 0, "Vy": 0, "Mx": 0, "My": 0, "T": 0},
        )
        reactions = compute_reactions(piles, ca)

        expected = fix["expected_pile_reactions"]
        for r in reactions:
            exp = expected[str(r.pile_index)]
            assert r.N == pytest.approx(exp["N"], abs=0.1)
            assert r.Vx == pytest.approx(exp["Vx"], abs=0.1)
            assert r.Vy == pytest.approx(exp["Vy"], abs=0.1)


class TestGolden2x2AxialPlusMoment:
    """Fixture: 2x2_grid_axial_plus_moment"""

    def test_reactions(self):
        data = _load_golden()
        fix = data["fixtures"][1]
        assert fix["name"] == "2x2_grid_axial_plus_moment"

        inputs = _build_inputs(fix["inputs"])
        piles, errors, _ = parse_pile_positions(inputs)
        assert not errors

        ca = CombinedActions(
            combination_id="c1",
            combination_name="1.0G",
            limit_state="strength",
            clause_ref="Cl 1",
            actions={"N": 4000.0, "Vx": 0, "Vy": 0, "Mx": 900.0, "My": 0, "T": 0},
        )
        reactions = compute_reactions(piles, ca)

        expected = fix["expected_pile_reactions"]
        for r in reactions:
            exp = expected[str(r.pile_index)]
            assert r.N == pytest.approx(exp["N"], abs=0.1)


class TestGolden2x2Biaxial:
    """Fixture: 2x2_grid_biaxial"""

    def test_reactions(self):
        data = _load_golden()
        fix = data["fixtures"][2]
        assert fix["name"] == "2x2_grid_biaxial"

        inputs = _build_inputs(fix["inputs"])
        piles, errors, _ = parse_pile_positions(inputs)
        assert not errors

        ca = CombinedActions(
            combination_id="c1",
            combination_name="1.0G",
            limit_state="strength",
            clause_ref="Cl 1",
            actions={"N": 4000.0, "Vx": 0, "Vy": 0, "Mx": 900.0, "My": 450.0, "T": 0},
        )
        reactions = compute_reactions(piles, ca)

        expected = fix["expected_pile_reactions"]
        for r in reactions:
            exp = expected[str(r.pile_index)]
            assert r.N == pytest.approx(exp["N"], abs=0.5)


class TestGoldenTriangularTorsion:
    """Fixture: 3_pile_triangular_torsion — equilateral triangle, pure torsion."""

    def test_all_axial_zero(self):
        data = _load_golden()
        fix = data["fixtures"][3]
        assert fix["name"] == "3_pile_triangular_torsion"

        inputs = _build_inputs(fix["inputs"])
        piles, errors, _ = parse_pile_positions(inputs)
        assert not errors
        assert len(piles) == 3

        ca = CombinedActions(
            combination_id="c1",
            combination_name="1.0T",
            limit_state="strength",
            clause_ref="Cl 1",
            actions={"N": 0, "Vx": 0, "Vy": 0, "Mx": 0, "My": 0, "T": 180.0},
        )
        reactions = compute_reactions(piles, ca)

        for r in reactions:
            assert r.N == pytest.approx(0.0, abs=0.01)

    def test_shear_magnitudes_equal(self):
        data = _load_golden()
        fix = data["fixtures"][3]
        inputs = _build_inputs(fix["inputs"])
        piles, _, _ = parse_pile_positions(inputs)

        ca = CombinedActions(
            combination_id="c1",
            combination_name="1.0T",
            limit_state="strength",
            clause_ref="Cl 1",
            actions={"N": 0, "Vx": 0, "Vy": 0, "Mx": 0, "My": 0, "T": 180.0},
        )
        reactions = compute_reactions(piles, ca)

        shears = [math.sqrt(r.Vx**2 + r.Vy**2) for r in reactions]
        assert shears[0] == pytest.approx(shears[1], rel=0.01)
        assert shears[1] == pytest.approx(shears[2], rel=0.01)


class TestGoldenFullRun:
    """Run the full pile_group calculation through the dispatcher for a golden case."""

    def test_2x2_full_run_matches_golden(self):
        data = _load_golden()
        fix = data["fixtures"][2]

        inputs = _build_inputs(fix["inputs"])
        inputs["pile_diameter"] = _iv(0.6, "m")
        inputs["pile_length"] = _iv(15.0, "m")

        combo = _build_combo(fix["combination"])

        req = CalculationRequest(
            calcType="pile_group",
            inputs=inputs,
            loadCombinations=[combo],
            rulePack=RulePack(
                id="rp",
                standardCode="AS/NZS 1170.0",
                version="2002",
                rules={
                    "dummy": RuleEntry(clauseRef="Cl 1", description="test", value=1.0),
                },
            ),
            standardsRefs=[StandardRef(code="AS/NZS 1170.0", edition="2002")],
        )
        result = run(req)
        assert not result.errors

        expected = fix["expected_pile_reactions"]
        for pile_idx_str, exp_vals in expected.items():
            key = f"pile_{pile_idx_str}_max_compression"
            assert key in result.outputs
            assert result.outputs[key].value == pytest.approx(exp_vals["N"], abs=1.0)
