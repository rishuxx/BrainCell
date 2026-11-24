"""Lyftr AI Chat - Health endpoint."""

from fastapi import APIRouter

from ..config import settings
from ..database import is_db_reachable
from ..schemas import HealthResponse
from ..services.llm import llm_service

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check: app running, database reachable, key pool loaded."""
    db_ok = is_db_reachable()

    if not db_ok:
        return HealthResponse(
            status="degraded",
            keys_configured=llm_service.key_count,
            cache_enabled=llm_service.cache_enabled,
        )

    if llm_service.key_count < 2:
        return HealthResponse(
            status="degraded",
            keys_configured=llm_service.key_count,
            cache_enabled=llm_service.cache_enabled,
        )

    return HealthResponse(
        status="ok",
        keys_configured=llm_service.key_count,
        cache_enabled=llm_service.cache_enabled,
    )
