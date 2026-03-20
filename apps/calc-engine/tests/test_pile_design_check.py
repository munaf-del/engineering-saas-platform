"""Tests for the pile design check engine."""

import pytest

from app.engine.pile_design_check import run_design_checks, _status
from app.engine.pile_group import EnvelopeEntry, PilePosition
from app.models.calculation import InputValue, RuleEntry, RulePack


def _iv(value: float, unit: str = "N", label: str = "") -> InputValue:
    return InputValue(value=value, unit=unit, label=label or str(value))


def _make_rule_pack(**extra_rules: RuleEntry) -> RulePack:
    rules = {
        "phi_g_compression": RuleEntry(
            clauseRef="Cl 4.3.1",
            description="Geotechnical compression reduction factor",
            value=0.5,
        ),
        "phi_g_tension": RuleEntry(
            clauseRef="Cl 4.3.2",
            description="Geotechnical tension reduction factor",
            value=0.5,
        ),
        "phi_g_lateral": RuleEntry(
            clauseRef="Cl 4.3.3",
            description="Geotechnical lateral reduction factor",
            value=0.5,
        ),
    }
    rules.update(extra_rules)
    return RulePack(id="rp-test", standardCode="AS 2159", version="2009", rules=rules)


def _make_piles(n: int = 1) -> list[PilePosition]:
    return [PilePosition(index=i + 1, x=0.0, y=0.0, label=f"P{i + 1}") for i in range(n)]


def _make_envelope(
    pile_index: int = 1,
    max_compression: float = 1000.0,
    max_tension: float = 200.0,
    max_shear: float = 100.0,
) -> EnvelopeEntry:
    return EnvelopeEntry(
        pile_index=pile_index,
        max_compression=max_compression,
        max_tension=max_tension,
        max_shear=max_shear,
        governing_compression_combo="LC1",
        governing_tension_combo="LC2",
        governing_shear_combo="LC1",
    )


class TestStatusFunction:
    def test_pass(self):
        assert _status(0.5) == "pass"
        assert _status(0.0) == "pass"
        assert _status(0.9) == "pass"

    def test_warning(self):
        assert _status(0.91) == "warning"
        assert _status(0.99) == "warning"
        assert _status(1.0) == "warning"

    def test_fail(self):
        assert _status(1.01) == "fail"
        assert _status(2.0) == "fail"


class TestGeotechnicalCompression:
    def test_basic_compression_check(self):
        inputs = {"compression_capacity": _iv(5000.0)}
        piles = _make_piles(1)
        envs = [_make_envelope(max_compression=1000.0)]
        checks, warnings, refs = run_design_checks(piles, envs, inputs, _make_rule_pack())
        comp_checks = [c for c in checks if c.check_type == "geotechnical_compression"]
        assert len(comp_checks) == 1
        dc = comp_checks[0]
        assert dc.demand_value == pytest.approx(1000.0)
        assert dc.capacity_value == pytest.approx(2500.0)  # 0.5 × 5000
        assert dc.utilisation_ratio == pytest.approx(0.4)
        assert dc.reserve_capacity == pytest.approx(1500.0)
        assert dc.status == "pass"
        assert dc.governing_combination == "LC1"

    def test_compression_fail(self):
        inputs = {"compression_capacity": _iv(1500.0)}
        envs = [_make_envelope(max_compression=1000.0)]
        checks, _, _ = run_design_checks(_make_piles(), envs, inputs, _make_rule_pack())
        comp = [c for c in checks if c.check_type == "geotechnical_compression"][0]
        assert comp.utilisation_ratio == pytest.approx(1000.0 / 750.0, rel=1e-3)
        assert comp.status == "fail"

    def test_missing_phi_skips_check(self):
        rp = RulePack(id="rp", standardCode="test", version="1", rules={})
        inputs = {"compression_capacity": _iv(5000.0)}
        envs = [_make_envelope()]
        checks, warnings, _ = run_design_checks(_make_piles(), envs, inputs, rp)
        assert not any(c.check_type == "geotechnical_compression" for c in checks)
        assert any(w.code == "MISSING_RULE" for w in warnings)


class TestGeotechnicalTension:
    def test_basic_tension_check(self):
        inputs = {
            "compression_capacity": _iv(5000.0),
            "tension_capacity": _iv(3000.0),
        }
        envs = [_make_envelope(max_tension=500.0)]
        checks, _, _ = run_design_checks(_make_piles(), envs, inputs, _make_rule_pack())
        ten = [c for c in checks if c.check_type == "geotechnical_tension"][0]
        assert ten.demand_value == pytest.approx(500.0)
        assert ten.capacity_value == pytest.approx(1500.0)  # 0.5 × 3000
        assert ten.status == "pass"

    def test_no_tension_if_zero(self):
        inputs = {
            "compression_capacity": _iv(5000.0),
            "tension_capacity": _iv(3000.0),
        }
        envs = [_make_envelope(max_tension=0.0)]
        checks, _, _ = run_design_checks(_make_piles(), envs, inputs, _make_rule_pack())
        assert not any(c.check_type == "geotechnical_tension" for c in checks)


class TestGeotechnicalLateral:
    def test_basic_lateral_check(self):
        inputs = {
            "compression_capacity": _iv(5000.0),
            "lateral_capacity": _iv(2000.0),
        }
        envs = [_make_envelope(max_shear=300.0)]
        checks, _, _ = run_design_checks(_make_piles(), envs, inputs, _make_rule_pack())
        lat = [c for c in checks if c.check_type == "geotechnical_lateral"][0]
        assert lat.demand_value == pytest.approx(300.0)
        assert lat.capacity_value == pytest.approx(1000.0)  # 0.5 × 2000
        assert lat.status == "pass"


class TestStructuralRC:
    def test_rc_check(self):
        rp = _make_rule_pack(
            phi_s_rc=RuleEntry(
                clauseRef="Cl 10.6",
                description="RC capacity reduction factor",
                value=0.65,
            ),
        )
        inputs = {
            "compression_capacity": _iv(5000.0),
            "structural_axial_capacity": _iv(8000.0, "N"),
            "pile_material_type": _iv(1.0, "enum"),
        }
        envs = [_make_envelope(max_compression=3000.0)]
        checks, _, _ = run_design_checks(_make_piles(), envs, inputs, rp)
        rc = [c for c in checks if c.check_type == "structural_rc"][0]
        assert rc.capacity_value == pytest.approx(5200.0)  # 0.65 × 8000
        assert rc.demand_value == pytest.approx(3000.0)
        assert rc.status == "pass"

    def test_rc_not_run_for_steel(self):
        rp = _make_rule_pack(
            phi_s_rc=RuleEntry(clauseRef="Cl 10.6", description="RC factor", value=0.65),
        )
        inputs = {
            "compression_capacity": _iv(5000.0),
            "structural_axial_capacity": _iv(8000.0, "N"),
            "pile_material_type": _iv(2.0, "enum"),
        }
        envs = [_make_envelope()]
        checks, _, _ = run_design_checks(_make_piles(), envs, inputs, rp)
        assert not any(c.check_type == "structural_rc" for c in checks)


class TestStructuralSteel:
    def test_steel_check(self):
        rp = _make_rule_pack(
            phi_s_steel=RuleEntry(
                clauseRef="Cl 6.2",
                description="Steel capacity reduction factor",
                value=0.9,
            ),
        )
        inputs = {
            "compression_capacity": _iv(5000.0),
            "structural_axial_capacity": _iv(6000.0, "N"),
            "pile_material_type": _iv(2.0, "enum"),
        }
        envs = [_make_envelope(max_compression=5000.0)]
        checks, _, _ = run_design_checks(_make_piles(), envs, inputs, rp)
        steel = [c for c in checks if c.check_type == "structural_steel"][0]
        assert steel.capacity_value == pytest.approx(5400.0)  # 0.9 × 6000
        assert steel.demand_value == pytest.approx(5000.0)
        assert steel.status == "warning"  # 5000/5400 ≈ 0.926


class TestNoCapacityInputs:
    def test_skips_all_checks(self):
        envs = [_make_envelope()]
        checks, warnings, _ = run_design_checks(_make_piles(), envs, {}, _make_rule_pack())
        assert len(checks) == 0
        assert any(w.code == "NO_CAPACITY_INPUTS" for w in warnings)


class TestMultiplePiles:
    def test_checks_all_piles(self):
        inputs = {"compression_capacity": _iv(5000.0)}
        envs = [_make_envelope(pile_index=i + 1) for i in range(4)]
        checks, _, _ = run_design_checks(_make_piles(4), envs, inputs, _make_rule_pack())
        pile_indices = {c.pile_index for c in checks if c.check_type == "geotechnical_compression"}
        assert pile_indices == {1, 2, 3, 4}
