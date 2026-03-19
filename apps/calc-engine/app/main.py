from fastapi import FastAPI
from app.routers import health, calculations
from app.config import settings

app = FastAPI(
    title="EngPlatform Calc Engine",
    description="Deterministic engineering calculation engine",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.include_router(health.router, tags=["health"])
app.include_router(calculations.router, prefix="/api/v1/calculations", tags=["calculations"])


@app.get("/")
async def root() -> dict[str, str]:
    return {
        "service": "calc-engine",
        "version": "0.1.0",
        "status": "running",
        "environment": settings.environment,
    }
