"""Tests for the pile group reaction distribution calculator."""

import math

import pytest

from app.engine.pile_group import (
    PilePosition,
    PileReactions,
    CombinationReactions,
    EnvelopeEntry,
    compute_envelopes,
    compute_reactions,
    parse_pile_positions,
    run,
)
from app.engine.load_combinations import CombinedActions
from app.models.calculation import (
    CalculationRequest,
    InputValue,
    LimitState,
    LoadCombination,
    LoadCombinationFactor,
    RuleEntry,
    RulePack,
    StandardRef,
)


def _iv(value: float, unit: str = "m", label: str = "") -> InputValue:
    return InputValue(value=value, unit=unit, label=label or str(value))


# ── Layout Parsing ─────────────────────────────────────────────────


class TestParseGridLayout:
    def test_2x2_grid(self):
        inputs = {
            "grid_nx": _iv(2, "count"),
            "grid_ny": _iv(2, "count"),
            "grid_spacing_x": _iv(3.0),
            "grid_spacing_y": _iv(3.0),
        }
        piles, errors, warnings = parse_pile_positions(inputs)
        assert not errors
        assert len(piles) == 4
        xs = sorted(p.x for p in piles)
        ys = sorted(p.y for p in piles)
        assert xs[0] == pytest.approx(-1.5)
        assert xs[-1] == pytest.approx(1.5)
        assert ys[0] == pytest.approx(-1.5)
        assert ys[-1] == pytest.approx(1.5)

    def test_3x2_grid(self):
        inputs = {
            "grid_nx": _iv(3, "count"),
            "grid_ny": _iv(2, "count"),
            "grid_spacing_x": _iv(2.0),
            "grid_spacing_y": _iv(4.0),
        }
        piles, errors, _ = parse_pile_positions(inputs)
        assert not errors
        assert len(piles) == 6

    def test_1x1_grid(self):
        inputs = {
            "grid_nx": _iv(1, "count"),
            "grid_ny": _iv(1, "count"),
            "grid_spacing_x": _iv(3.0),
            "grid_spacing_y": _iv(3.0),
        }
        piles, errors, _ = parse_pile_positions(inputs)
        assert not errors
        assert len(piles) == 1
        assert piles[0].x == pytest.approx(0.0)
        assert piles[0].y == pytest.approx(0.0)

    def test_missing_spacing_error(self):
        inputs = {
            "grid_nx": _iv(2, "count"),
            "grid_ny": _iv(2, "count"),
        }
        _, errors, _ = parse_pile_positions(inputs)
        assert len(errors) == 1
        assert "grid_spacing" in errors[0].message


class TestParseExplicitLayout:
    def test_explicit_positions(self):
        inputs = {
            "pile_count": _iv(3, "count"),
            "pile_1_x": _iv(0.0),
            "pile_1_y": _iv(0.0),
            "pile_2_x": _iv(3.0),
            "pile_2_y": _iv(0.0),
            "pile_3_x": _iv(1.5),
            "pile_3_y": _iv(2.6),
        }
        piles, errors, _ = parse_pile_positions(inputs)
        assert not errors
        assert len(piles) == 3
        assert piles[0].x == pytest.approx(0.0)
        assert piles[2].y == pytest.approx(2.6)

    def test_missing_coordinate_error(self):
        inputs = {
            "pile_count": _iv(2, "count"),
            "pile_1_x": _iv(0.0),
            "pile_1_y": _iv(0.0),
        }
        _, errors, _ = parse_pile_positions(inputs)
        assert len(errors) == 1
        assert "pile_2" in errors[0].message


class TestNoLayout:
    def test_no_layout_error(self):
        _, errors, _ = parse_pile_positions({})
        assert any(e.code == "NO_LAYOUT" for e in errors)


# ── Reaction Distribution ─────────────────────────────────────────


class TestComputeReactions:
    def _square_group(self) -> list[PilePosition]:
        """2×2 group at (±1.5, ±1.5)."""
        return [
            PilePosition(index=1, x=-1.5, y=-1.5, label="P1"),
            PilePosition(index=2, x=1.5, y=-1.5, label="P2"),
            PilePosition(index=3, x=-1.5, y=1.5, label="P3"),
            PilePosition(index=4, x=1.5, y=1.5, label="P4"),
        ]

    def test_pure_axial(self):
        """Pure axial N=4000 on 4 piles → 1000 each."""
        piles = self._square_group()
        ca = CombinedActions(
            combination_id="c1",
            combination_name="Test",
            limit_state="strength",
            clause_ref="Cl 1",
            actions={"N": 4000.0, "Vx": 0, "Vy": 0, "Mx": 0, "My": 0, "T": 0},
        )
        reactions = compute_reactions(piles, ca)
        for r in reactions:
            assert r.N == pytest.approx(1000.0)
            assert r.Vx == pytest.approx(0.0)
            assert r.Vy == pytest.approx(0.0)

    def test_moment_mx(self):
        """Mx produces differential axial in Y-direction."""
        piles = self._square_group()
        ca = CombinedActions(
            combination_id="c1",
            combination_name="Test",
            limit_state="strength",
            clause_ref="Cl 1",
            actions={"N": 0, "Vx": 0, "Vy": 0, "Mx": 900.0, "My": 0, "T": 0},
        )
        reactions = compute_reactions(piles, ca)
        # Σyi² = 4 × 1.5² = 9.0
        # Ni = Mx·yi/Σyi² = 900·(±1.5)/9 = ±150
        bottom = [r for r in reactions if r.pile_index in (1, 2)]  # y = -1.5
        top = [r for r in reactions if r.pile_index in (3, 4)]  # y = +1.5
        for r in bottom:
            assert r.N == pytest.approx(-150.0)
        for r in top:
            assert r.N == pytest.approx(150.0)

    def test_moment_my(self):
        """My produces differential axial in X-direction."""
        piles = self._square_group()
        ca = CombinedActions(
            combination_id="c1",
            combination_name="Test",
            limit_state="strength",
            clause_ref="Cl 1",
            actions={"N": 0, "Vx": 0, "Vy": 0, "Mx": 0, "My": 450.0, "T": 0},
        )
        reactions = compute_reactions(piles, ca)
        # Σxi² = 4 × 1.5² = 9.0
        # Ni = My·xi/Σxi² = 450·(±1.5)/9 = ±75
        left = [r for r in reactions if r.pile_index in (1, 3)]
        right = [r for r in reactions if r.pile_index in (2, 4)]
        for r in left:
            assert r.N == pytest.approx(-75.0)
        for r in right:
            assert r.N == pytest.approx(75.0)

    def test_pure_shear(self):
        """Shear distributed equally."""
        piles = self._square_group()
        ca = CombinedActions(
            combination_id="c1",
            combination_name="Test",
            limit_state="strength",
            clause_ref="Cl 1",
            actions={"N": 0, "Vx": 100.0, "Vy": 200.0, "Mx": 0, "My": 0, "T": 0},
        )
        reactions = compute_reactions(piles, ca)
        for r in reactions:
            assert r.Vx == pytest.approx(25.0)
            assert r.Vy == pytest.approx(50.0)

    def test_torsion(self):
        """Torsion creates tangential shear proportional to distance."""
        piles = self._square_group()
        # ri² = 1.5² + 1.5² = 4.5 for each pile; Σri² = 18
        ca = CombinedActions(
            combination_id="c1",
            combination_name="Test",
            limit_state="strength",
            clause_ref="Cl 1",
            actions={"N": 0, "Vx": 0, "Vy": 0, "Mx": 0, "My": 0, "T": 180.0},
        )
        reactions = compute_reactions(piles, ca)
        # P1 at (-1.5, -1.5): Vx = -T·y/Σri² = -180·(-1.5)/18 = 15
        #                      Vy = T·x/Σri² = 180·(-1.5)/18 = -15
        p1 = [r for r in reactions if r.pile_index == 1][0]
        assert p1.Vx == pytest.approx(15.0)
        assert p1.Vy == pytest.approx(-15.0)

    def test_combined_n_plus_mx(self):
        """N=4000 + Mx=900 on 2×2 group."""
        piles = self._square_group()
        ca = CombinedActions(
            combination_id="c1",
            combination_name="Test",
            limit_state="strength",
            clause_ref="Cl 1",
            actions={"N": 4000.0, "Vx": 0, "Vy": 0, "Mx": 900.0, "My": 0, "T": 0},
        )
        reactions = compute_reactions(piles, ca)
        top = [r for r in reactions if r.pile_index in (3, 4)]
        bottom = [r for r in reactions if r.pile_index in (1, 2)]
        for r in top:
            assert r.N == pytest.approx(1150.0)  # 1000 + 150
        for r in bottom:
            assert r.N == pytest.approx(850.0)  # 1000 - 150

    def test_single_pile_gets_all(self):
        """Single pile takes full load."""
        piles = [PilePosition(index=1, x=0.0, y=0.0, label="P1")]
        ca = CombinedActions(
            combination_id="c1",
            combination_name="Test",
            limit_state="strength",
            clause_ref="Cl 1",
            actions={"N": 500.0, "Vx": 100.0, "Vy": 50.0, "Mx": 0, "My": 0, "T": 0},
        )
        reactions = compute_reactions(piles, ca)
        assert reactions[0].N == pytest.approx(500.0)
        assert reactions[0].Vx == pytest.approx(100.0)
        assert reactions[0].Vy == pytest.approx(50.0)

    def test_equilibrium(self):
        """Sum of pile reactions must equal applied loads."""
        piles = self._square_group()
        ca = CombinedActions(
            combination_id="c1",
            combination_name="Test",
            limit_state="strength",
            clause_ref="Cl 1",
            actions={"N": 3000.0, "Vx": 120.0, "Vy": 80.0, "Mx": 500.0, "My": 300.0, "T": 0},
        )
        reactions = compute_reactions(piles, ca)
        total_N = sum(r.N for r in reactions)
        total_Vx = sum(r.Vx for r in reactions)
        total_Vy = sum(r.Vy for r in reactions)
        assert total_N == pytest.approx(3000.0, rel=1e-10)
        assert total_Vx == pytest.approx(120.0, rel=1e-10)
        assert total_Vy == pytest.approx(80.0, rel=1e-10)


# ── Envelopes ──────────────────────────────────────────────────────


class TestEnvelopes:
    def test_envelope_picks_max(self):
        cr1 = CombinationReactions(
            combination_id="c1",
            combination_name="LC1",
            limit_state="strength",
            pile_reactions=[
                PileReactions(pile_index=1, N=800, Vx=10, Vy=20),
            ],
        )
        cr2 = CombinationReactions(
            combination_id="c2",
            combination_name="LC2",
            limit_state="strength",
            pile_reactions=[
                PileReactions(pile_index=1, N=1200, Vx=30, Vy=40),
            ],
        )
        envs = compute_envelopes([cr1, cr2], 1)
        assert len(envs) == 1
        assert envs[0].max_compression == pytest.approx(1200)
        assert envs[0].governing_compression_combo == "LC2"
        assert envs[0].max_shear == pytest.approx(50.0)

    def test_envelope_tension(self):
        cr1 = CombinationReactions(
            combination_id="c1",
            combination_name="LC1",
            limit_state="strength",
            pile_reactions=[
                PileReactions(pile_index=1, N=-300, Vx=0, Vy=0),
            ],
        )
        envs = compute_envelopes([cr1], 1)
        assert envs[0].max_tension == pytest.approx(300)
        assert envs[0].max_compression == 0


# ── Full Run Integration ──────────────────────────────────────────


class TestPileGroupRun:
    def _make_request(self, **overrides) -> CalculationRequest:
        inputs: dict[str, InputValue] = {
            "grid_nx": _iv(2, "count"),
            "grid_ny": _iv(2, "count"),
            "grid_spacing_x": _iv(3.0),
            "grid_spacing_y": _iv(3.0),
            "pile_diameter": _iv(0.6),
            "pile_length": _iv(15.0),
            "lc_DL_N": _iv(2000.0, "N"),
            "lc_DL_Mx": _iv(100.0, "N·m"),
            "lc_LL_N": _iv(800.0, "N"),
        }
        inputs.update(overrides.get("extra_inputs", {}))

        combos = overrides.get(
            "load_combinations",
            [
                LoadCombination(
                    id="c1",
                    name="1.35G",
                    limitState="strength",
                    factors=[
                        LoadCombinationFactor(loadCaseId="DL", factor=1.35, source="Table 4.1"),
                    ],
                    clauseRef="Cl 4.2.1",
                ),
                LoadCombination(
                    id="c2",
                    name="1.2G + 1.5Q",
                    limitState="strength",
                    factors=[
                        LoadCombinationFactor(loadCaseId="DL", factor=1.2, source="Table 4.1"),
                        LoadCombinationFactor(loadCaseId="LL", factor=1.5, source="Table 4.1"),
                    ],
                    clauseRef="Cl 4.2.2",
                ),
            ],
        )

        rule_pack = overrides.get(
            "rule_pack",
            RulePack(
                id="rp-1",
                standardCode="AS/NZS 1170.0",
                version="2002",
                rules={
                    "dummy": RuleEntry(
                        clauseRef="Cl 4.2.1",
                        description="Placeholder",
                        value=1.0,
                    ),
                },
            ),
        )

        return CalculationRequest(
            calcType="pile_group",
            inputs=inputs,
            loadCombinations=combos,
            rulePack=rule_pack,
            standardsRefs=[StandardRef(code="AS/NZS 1170.0", edition="2002")],
        )

    def test_basic_run_succeeds(self):
        result = run(self._make_request())
        assert not result.errors
        assert len(result.outputs) > 0
        assert result.assumptions == [
            "Rigid pile cap (cap deformation neglected).",
            "All piles assumed to have equal axial stiffness.",
            "All piles vertical (rake angle = 0).",
            "Pile heads are pinned (no moment transfer from cap to individual pile heads).",
            "Lateral load distributed equally among piles (equal lateral stiffness assumed).",
            "Torsion distributed proportional to pile distance from group centroid.",
        ]

    def test_outputs_contain_envelopes(self):
        result = run(self._make_request())
        assert "pile_1_max_compression" in result.outputs
        assert "pile_1_max_tension" in result.outputs
        assert "pile_1_max_shear" in result.outputs
        assert "num_piles" in result.outputs
        assert result.outputs["num_piles"].value == 4

    def test_governing_case_identified(self):
        result = run(self._make_request())
        assert result.governing_case is not None

    def test_steps_recorded(self):
        result = run(self._make_request())
        assert len(result.steps) > 0

    def test_no_layout_error(self):
        req = CalculationRequest(
            calcType="pile_group",
            inputs={"lc_DL_N": _iv(1000, "N")},
            loadCombinations=[
                LoadCombination(
                    id="c1",
                    name="test",
                    limitState="strength",
                    factors=[LoadCombinationFactor(loadCaseId="DL", factor=1.0, source="test")],
                    clauseRef="Cl 1",
                ),
            ],
            rulePack=RulePack(
                id="rp",
                standardCode="test",
                version="1",
                rules={"r": RuleEntry(clauseRef="Cl 1", description="test", value=1.0)},
            ),
            standardsRefs=[StandardRef(code="test", edition="1")],
        )
        result = run(req)
        assert any(e.code == "NO_LAYOUT" for e in result.errors)

    def test_missing_load_case_error(self):
        req = self._make_request(
            load_combinations=[
                LoadCombination(
                    id="c1",
                    name="Bad",
                    limitState="strength",
                    factors=[
                        LoadCombinationFactor(
                            loadCaseId="NONEXIST", factor=1.0, source="test"
                        ),
                    ],
                    clauseRef="Cl 1",
                ),
            ],
        )
        result = run(req)
        assert any(e.code == "MISSING_LOAD_CASE" for e in result.errors)

    def test_with_design_checks(self):
        extra_inputs = {
            "compression_capacity": _iv(5000.0, "N"),
            "tension_capacity": _iv(2000.0, "N"),
            "lateral_capacity": _iv(1000.0, "N"),
        }
        rule_pack = RulePack(
            id="rp-1",
            standardCode="AS 2159",
            version="2009",
            rules={
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
            },
        )
        req = self._make_request(extra_inputs=extra_inputs, rule_pack=rule_pack)
        result = run(req)
        assert not result.errors
        assert len(result.design_checks) > 0
        for dc in result.design_checks:
            assert dc.utilisation_ratio >= 0
            assert dc.status in ("pass", "warning", "fail")
            assert dc.reserve_capacity is not None

    def test_without_capacities_skips_design_checks(self):
        result = run(self._make_request())
        assert not result.errors
        assert len(result.design_checks) == 0
        assert any(w.code == "NO_CAPACITY_INPUTS" for w in result.warnings)
