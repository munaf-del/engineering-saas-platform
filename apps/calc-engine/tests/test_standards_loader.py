import pytest
from app.standards.loader import require_rule, require_table, MissingRuleError
from app.models.calculation import RulePack, RuleEntry


@pytest.fixture
def sample_rule_pack() -> RulePack:
    return RulePack(
        id="test-pack",
        standardCode="AS 2159",
        version="1.0.0",
        rules={
            "phi_g": RuleEntry(
                clauseRef="Cl 4.3.1",
                description="Geotechnical strength reduction factor",
                value=0.4,
            ),
            "bearing_factors": RuleEntry(
                clauseRef="Cl 4.4.2",
                description="Bearing capacity factors",
                table={"Nc": 9.0, "Nq": 1.0},
            ),
        },
    )


def test_require_rule_returns_value(sample_rule_pack: RulePack):
    assert require_rule(sample_rule_pack, "phi_g") == 0.4


def test_require_rule_raises_on_missing(sample_rule_pack: RulePack):
    with pytest.raises(MissingRuleError) as exc_info:
        require_rule(sample_rule_pack, "nonexistent_factor")
    assert "nonexistent_factor" in str(exc_info.value)


def test_require_table_returns_table(sample_rule_pack: RulePack):
    table = require_table(sample_rule_pack, "bearing_factors")
    assert table["Nc"] == 9.0


def test_require_table_raises_on_missing(sample_rule_pack: RulePack):
    with pytest.raises(MissingRuleError):
        require_table(sample_rule_pack, "nonexistent_table")
