from fastapi import APIRouter, HTTPException
from app.models.calculation import CalculationRequest, CalculationResult
from app.engine.dispatcher import dispatch_calculation

router = APIRouter()


@router.post("/run", response_model=CalculationResult)
async def run_calculation(request: CalculationRequest) -> CalculationResult:
    try:
        result = dispatch_calculation(request)
        return result
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except KeyError as e:
        raise HTTPException(
            status_code=422,
            detail=f"Missing required rule or input: {e}",
        )
