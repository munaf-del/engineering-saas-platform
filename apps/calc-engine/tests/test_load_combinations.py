"""Tests for the load combination engine."""

import pytest

from app.engine.load_combinations import (
    generate_combined_actions,
    parse_load_case_actions,
    validate_load_case_references,
)
from app.models.calculation import (
    InputValue,
    LimitState,
    LoadCombination,
    LoadCombinationFactor,
    RuleEntry,
    RulePack,
)


def _make_rule_pack() -> RulePack:
    return RulePack(
        id="rp-test",
        standardCode="AS/NZS 1170.0",
        version="2002",
        rules={
            "dummy": RuleEntry(
                clauseRef="Cl 4.2.1",
                description="Placeholder",
                value=1.0,
            ),
        },
    )


def _make_inputs() -> dict[str, InputValue]:
    return {
        "lc_DL_N": InputValue(value=1000.0, unit="N", label="DL axial"),
        "lc_DL_Mx": InputValue(value=50.0, unit="N·m", label="DL Mx"),
        "lc_DL_Vx": InputValue(value=20.0, unit="N", label="DL Vx"),
        "lc_LL_N": InputValue(value=500.0, unit="N", label="LL axial"),
        "lc_LL_Vx": InputValue(value=10.0, unit="N", label="LL Vx"),
        "lc_WL_Vx": InputValue(value=200.0, unit="N", label="WL shear"),
        "lc_WL_My": InputValue(value=80.0, unit="N·m", label="WL My"),
        "pile_diameter": InputValue(value=0.6, unit="m", label="Diameter"),
    }


class TestParseLoadCaseActions:
    def test_extracts_correct_cases(self):
        actions = parse_load_case_actions(_make_inputs())
        assert set(actions.keys()) == {"DL", "LL", "WL"}

    def test_extracts_correct_directions(self):
        actions = parse_load_case_actions(_make_inputs())
        assert actions["DL"]["N"] == 1000.0
        assert actions["DL"]["Mx"] == 50.0
        assert actions["DL"]["Vx"] == 20.0
        assert "Vy" not in actions["DL"]

    def test_ignores_non_lc_inputs(self):
        actions = parse_load_case_actions(_make_inputs())
        assert "pile_diameter" not in str(actions)

    def test_empty_inputs(self):
        actions = parse_load_case_actions({})
        assert actions == {}


class TestValidateLoadCaseReferences:
    def test_valid_references(self):
        combos = [
            LoadCombination(
                id="c1",
                name="1.35G",
                limitState="strength",
                factors=[
                    LoadCombinationFactor(loadCaseId="DL", factor=1.35, source="Table 4.1"),
                ],
                clauseRef="Cl 4.2.1",
            ),
        ]
        available = {"DL": {"N": 1000.0}}
        errors = validate_load_case_references(combos, available)
        assert errors == []

    def test_missing_reference(self):
        combos = [
            LoadCombination(
                id="c1",
                name="1.35G + 1.5Q",
                limitState="strength",
                factors=[
                    LoadCombinationFactor(loadCaseId="DL", factor=1.35, source="Table 4.1"),
                    LoadCombinationFactor(loadCaseId="MISSING", factor=1.5, source="Table 4.1"),
                ],
                clauseRef="Cl 4.2.1",
            ),
        ]
        available = {"DL": {"N": 1000.0}}
        errors = validate_load_case_references(combos, available)
        assert len(errors) == 1
        assert "MISSING" in errors[0].message


class TestGenerateCombinedActions:
    def test_single_combination(self):
        inputs = _make_inputs()
        combos = [
            LoadCombination(
                id="c1",
                name="1.35G",
                limitState="strength",
                factors=[
                    LoadCombinationFactor(loadCaseId="DL", factor=1.35, source="Table 4.1"),
                ],
                clauseRef="Cl 4.2.1",
            ),
        ]
        lc_actions = parse_load_case_actions(inputs)
        result = generate_combined_actions(combos, lc_actions, _make_rule_pack())
        assert not result.errors
        assert len(result.combined) == 1
        ca = result.combined[0]
        assert ca.actions["N"] == pytest.approx(1350.0)
        assert ca.actions["Mx"] == pytest.approx(67.5)
        assert ca.actions["Vx"] == pytest.approx(27.0)

    def test_multiple_load_cases(self):
        inputs = _make_inputs()
        combos = [
            LoadCombination(
                id="c1",
                name="1.2G + 1.5Q",
                limitState="strength",
                factors=[
                    LoadCombinationFactor(loadCaseId="DL", factor=1.2, source="Table 4.1"),
                    LoadCombinationFactor(loadCaseId="LL", factor=1.5, source="Table 4.1"),
                ],
                clauseRef="Cl 4.2.2",
            ),
        ]
        lc_actions = parse_load_case_actions(inputs)
        result = generate_combined_actions(combos, lc_actions, _make_rule_pack())
        assert not result.errors
        ca = result.combined[0]
        assert ca.actions["N"] == pytest.approx(1200.0 + 750.0)
        assert ca.actions["Vx"] == pytest.approx(24.0 + 15.0)

    def test_serviceability_combination(self):
        inputs = _make_inputs()
        combos = [
            LoadCombination(
                id="s1",
                name="G + 0.7Q",
                limitState="serviceability",
                factors=[
                    LoadCombinationFactor(loadCaseId="DL", factor=1.0, source="Table 4.1"),
                    LoadCombinationFactor(loadCaseId="LL", factor=0.7, source="Table 4.1"),
                ],
                clauseRef="Cl 4.3",
            ),
        ]
        lc_actions = parse_load_case_actions(inputs)
        result = generate_combined_actions(combos, lc_actions, _make_rule_pack())
        assert result.combined[0].limit_state == "serviceability"
        assert result.combined[0].actions["N"] == pytest.approx(1350.0)

    def test_no_combinations_error(self):
        result = generate_combined_actions([], {}, _make_rule_pack())
        assert len(result.errors) == 1
        assert result.errors[0].code == "NO_LOAD_COMBINATIONS"

    def test_missing_load_case_reference_error(self):
        combos = [
            LoadCombination(
                id="c1",
                name="Bad",
                limitState="strength",
                factors=[
                    LoadCombinationFactor(loadCaseId="NONEXIST", factor=1.0, source="test"),
                ],
                clauseRef="Cl 1",
            ),
        ]
        result = generate_combined_actions(combos, {}, _make_rule_pack())
        assert len(result.errors) == 1
        assert result.errors[0].code == "MISSING_LOAD_CASE"

    def test_empty_factors_warning(self):
        combos = [
            LoadCombination(
                id="c1",
                name="Empty",
                limitState="strength",
                factors=[],
                clauseRef="Cl 1",
            ),
        ]
        result = generate_combined_actions(combos, {}, _make_rule_pack())
        assert not result.errors
        assert any(w.code == "EMPTY_COMBINATION" for w in result.warnings)
        assert all(v == 0.0 for v in result.combined[0].actions.values())

    def test_steps_generated(self):
        inputs = _make_inputs()
        combos = [
            LoadCombination(
                id="c1",
                name="1.35G",
                limitState="strength",
                factors=[
                    LoadCombinationFactor(loadCaseId="DL", factor=1.35, source="Table 4.1"),
                ],
                clauseRef="Cl 4.2.1",
            ),
        ]
        lc_actions = parse_load_case_actions(inputs)
        result = generate_combined_actions(combos, lc_actions, _make_rule_pack())
        assert len(result.steps) == 1
        assert "1.35G" in result.steps[0].name
