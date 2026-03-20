import hashlib
import json
import time
from collections.abc import Callable

from app.engine import pile_group
from app.models.calculation import (
    CalcType,
    CalculationRequest,
    CalculationResult,
)
from app.standards.loader import MissingRuleError

EngineFunction = Callable[[CalculationRequest], CalculationResult]

ENGINE_MAP: dict[CalcType, EngineFunction] = {
    CalcType.PILE_GROUP: pile_group.run,
}


def _hash_request(request: CalculationRequest) -> str:
    """Produce a deterministic SHA-256 hash of the calculation request."""
    payload = request.model_dump(mode="json", by_alias=True)
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode()).hexdigest()


def dispatch_calculation(request: CalculationRequest) -> CalculationResult:
    """
    Route a calculation request to the appropriate engine function.

    Each calc_type maps to a dedicated pure function that receives the full
    request and returns a CalculationResult. If the calc_type is not yet
    implemented, a clear error is returned — never a guess.
    """
    start = time.perf_counter()
    request_hash = _hash_request(request)

    engine_fn = ENGINE_MAP.get(request.calc_type)
    if engine_fn is None:
        elapsed = (time.perf_counter() - start) * 1000
        return CalculationResult(
            requestHash=request_hash,
            outputs={},
            steps=[],
            governingCase=None,
            warnings=[],
            errors=[
                {
                    "code": "CALC_TYPE_NOT_IMPLEMENTED",
                    "message": f"Calculation type '{request.calc_type.value}' is not yet implemented.",
                }
            ],
            standardRefsUsed=[],
            durationMs=elapsed,
        )

    try:
        result = engine_fn(request)
        elapsed = (time.perf_counter() - start) * 1000
        result.request_hash = request_hash
        result.duration_ms = elapsed
        return result
    except MissingRuleError as e:
        elapsed = (time.perf_counter() - start) * 1000
        return CalculationResult(
            requestHash=request_hash,
            outputs={},
            steps=[],
            governingCase=None,
            warnings=[],
            errors=[{"code": "MISSING_RULE", "message": str(e)}],
            standardRefsUsed=[],
            durationMs=elapsed,
        )
    except Exception as e:
        elapsed = (time.perf_counter() - start) * 1000
        return CalculationResult(
            requestHash=request_hash,
            outputs={},
            steps=[],
            governingCase=None,
            warnings=[],
            errors=[{"code": "ENGINE_ERROR", "message": str(e)}],
            standardRefsUsed=[],
            durationMs=elapsed,
        )
