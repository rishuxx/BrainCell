"""Lyftr AI Chat - Health endpoint."""

from fastapi import APIRouter, Response

from ..config import settings
from ..database import is_db_reachable
from ..schemas import HealthResponse
from ..services.llm import llm_service

router = APIRouter()


@router.get("/health", response_model=HealthResponse, response_model_exclude_none=True)
async def health_check(response: Response):
    """Health check: app running, database reachable, key pool loaded."""
    ready = (
        is_db_reachable()
        and bool(settings.llm_model)
        and llm_service.key_count >= 2
        and llm_service.cache_enabled
    )
    if not ready:
        response.status_code = 503

    return HealthResponse(
        status="ok" if ready else "degraded",
        keys_configured=llm_service.key_count,
        cache_enabled=llm_service.cache_enabled,
        key_options=llm_service.key_options(),
        detail=None if ready else "service not ready",
    )
