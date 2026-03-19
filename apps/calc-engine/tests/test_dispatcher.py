from app.engine.dispatcher import dispatch_calculation
from app.models.calculation import (
    CalculationRequest,
    InputValue,
    RulePack,
    RuleEntry,
    StandardRef,
)


def _make_request() -> CalculationRequest:
    return CalculationRequest(
        calcType="pile_capacity",
        inputs={
            "pile_diameter": InputValue(value=0.6, unit="m", label="Pile diameter"),
            "pile_length": InputValue(value=15.0, unit="m", label="Pile length"),
        },
        loadCombinations=[],
        rulePack=RulePack(
            id="test-pack",
            standardCode="AS 2159",
            version="1.0.0",
            rules={
                "phi_g": RuleEntry(
                    clauseRef="Cl 4.3.1",
                    description="Geotechnical strength reduction factor",
                    value=0.4,
                ),
            },
        ),
        standardsRefs=[StandardRef(code="AS 2159", edition="2009")],
    )


def test_unimplemented_calc_returns_error():
    request = _make_request()
    result = dispatch_calculation(request)
    assert len(result.errors) == 1
    assert result.errors[0].code == "CALC_TYPE_NOT_IMPLEMENTED"
    assert result.request_hash  # hash should be generated


def test_request_hash_is_deterministic():
    request = _make_request()
    r1 = dispatch_calculation(request)
    r2 = dispatch_calculation(request)
    assert r1.request_hash == r2.request_hash
